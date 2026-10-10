/* ЦЕХ · Метаплатформа — core/knowledge/index.mjs
   Knowledge Base / RAG без внешней БД (§4.7, §12.2 ТЗ). Провайдер по умолчанию — local:
   лексический поиск (BM25) по документам архива. Qdrant — опциональный внешний провайдер,
   при отсутствии — честный fallback на local.

   Документ архива:
     { id, source, tags: string[], takeaway: string, text?: string, kind?: 'reference'|'skill'|'motion'|'gate'|'project' }

   Публичный API:
     KnowledgeRetriever({ index, documents, embed, provider })
       .search(query, { topK = 5, filters = {} }) → Array<ReferenceMeta & { score }>
       .index(collection) → { documents, terms }
     buildIndex(documents) → { documents, df, avgLen, terms }
     parseReferencesIndex(md, { source }) → documents
     documentsFromDirectory(dir, { kind }) → documents
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const STOP = new Set(["и", "в", "во", "не", "на", "с", "со", "а", "но", "как", "что", "это", "для", "по", "из", "к", "о", "об", "the", "a", "an", "of", "to", "and", "or", "is"]);

/**
 * Лёгкий стеммер для кириллицы: срезает 1–2 финальных символа у длинных слов,
 * чтобы «заголовка» находил «заголовок». Латиницу не трогает (чтобы не ломать теги
 * вида `scroll-story`). Без внешних зависимостей — принцип «local» (§4.7).
 */
export function stemTerm(token) {
  if (!/\p{Script=Cyrillic}/u.test(token)) return token;
  if (token.length <= 5) return token;
  return token.slice(0, Math.max(4, token.length - 2));
}

/** Приводит текст к массиву термов (unicode-дружелюбно, без внешних зависимостей). */
export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}#_-]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t))
    .map(stemTerm);
}

/** @param {Array<{ id: string, source?: string, tags?: string[], takeaway?: string, text?: string, kind?: string }>} documents */
export function buildIndex(documents) {
  const docs = documents.map((d) => ({
    id: String(d.id),
    source: d.source ?? "",
    kind: d.kind ?? "reference",
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    takeaway: String(d.takeaway ?? ""),
    text: String(d.text ?? ""),
  }));
  const df = new Map();
  const lens = [];
  for (const doc of docs) {
    const terms = new Set([...tokenize(doc.takeaway), ...tokenize(doc.text), ...doc.tags.flatMap(tokenize), ...tokenize(doc.id)]);
    lens.push(terms.size);
    for (const term of terms) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const avgLen = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 1;
  return { documents: docs, df, avgLen: avgLen || 1, terms: [...df.keys()].sort() };
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

/** @returns {Array<Record<string, any>>} документы со score, отсортированные по убыванию. */
export function searchIndex(index, query, { topK = 5, filters = {} } = {}) {
  const N = index.documents.length || 1;
  const q = tokenize(query);
  const scored = [];
  for (const doc of index.documents) {
    if (!matches(doc, filters)) continue;
    const field = [...tokenize(doc.takeaway), ...tokenize(doc.text), ...doc.tags.flatMap(tokenize), ...tokenize(doc.id)];
    const tf = new Map();
    for (const t of field) tf.set(t, (tf.get(t) ?? 0) + 1);
    const len = field.length || 1;
    let score = 0;
    for (const term of q) {
      const f = tf.get(term);
      if (!f) continue;
      const idf = Math.log(1 + (N - (index.df.get(term) ?? 0) + 0.5) / ((index.df.get(term) ?? 0) + 0.5));
      score += idf * ((f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + (BM25_B * len) / index.avgLen)));
    }
    // boost за точное имя REF-*/SK-*
    if (/\b(ref|sk)-\d+\b/i.test(doc.id) && q.includes(doc.id.toLowerCase())) score += 3;
    if (score > 0) scored.push({ ...doc, score: Math.round(score * 1000) / 1000 });
  }
  return scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, topK);
}

function matches(doc, filters) {
  if (!filters || Object.keys(filters).length === 0) return true;
  return Object.entries(filters).every(([key, value]) => {
    if (key === "kind") return doc.kind === value;
    if (key === "tag") return doc.tags.includes(value);
    if (key === "tags") return (Array.isArray(value) ? value : [value]).every((t) => doc.tags.includes(t));
    return true;
  });
}

/** @typedef {{ id: string, source: string, tags: string[], takeaway: string, text: string, kind: string }} ReferenceMeta */

export class KnowledgeRetriever {
  /** @param {{ index?: any, documents?: any[], embed?: Function, provider?: string, onFallback?: Function }} opts */
  constructor(opts = {}) {
    this.index = opts.index ?? buildIndex(opts.documents ?? []);
    this.provider = opts.provider ?? "local";
    this.embed = opts.embed ?? null;
    this.onFallback = opts.onFallback ?? (() => {});
    if (this.provider !== "local" && !this.embed) {
      this.onFallback({ from: this.provider, to: "local", reason: "нет клиента провайдера" });
      this.provider = "local";
    }
  }

  /** @returns {ReferenceMeta[]} */
  search(query, { topK = 5, filters = {} } = {}) {
    if (this.provider === "local" || !this.embed) return searchIndex(this.index, query, { topK, filters });
    // векторный провайдер: embed запроса → косинус по предпосчитанным векторам (если переданы)
    try {
      const qv = this.embed(query);
      if (!Array.isArray(qv)) throw new Error("embed вернул не вектор");
      const scored = this.index.documents
        .filter((d) => matches(d, filters) && Array.isArray(d.vector))
        .map((d) => ({ ...d, score: cosine(qv, d.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      if (scored.length > 0) return scored;
    } catch (error) {
      this.onFallback({ from: this.provider, to: "local", reason: String(error?.message ?? error) });
    }
    return searchIndex(this.index, query, { topK, filters });
  }

  /** Переиндексация коллекции (idempotent). @returns {{ documents: number, terms: number }} */
  index(collection) {
    const docs = Array.isArray(collection) ? collection : this.index.documents;
    this.index = buildIndex(docs);
    return { documents: this.index.documents.length, terms: this.index.terms.length };
  }
}

function cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Разбор references/INDEX.md: строки таблицы «| id | стиль | источник | takeaway |». */
export function parseReferencesIndex(markdown, { source = "references/INDEX.md" } = {}) {
  const docs = [];
  for (const line of String(markdown ?? "").split("\n")) {
    const cells = line.trim().split("|").map((c) => c.trim());
    if (cells.length < 6) continue;
    const [, id, style, src, takeaway] = cells;
    if (!/^(REF|SK|MOTION|REC)-?\d+/i.test(id)) continue;
    docs.push({ id, source: src || source, tags: tokenize(style), takeaway, text: style, kind: "reference" });
  }
  return docs;
}

/** Собирает документы из каталога архива: INDEX.md + metadata/*.yaml (takeaway обязателен, К-04). */
export function documentsFromDirectory(dir, { kind = "reference" } = {}) {
  const docs = [];
  const indexFile = join(dir, "INDEX.md");
  if (existsSync(indexFile)) docs.push(...parseReferencesIndex(readFileSync(indexFile, "utf8"), { source: indexFile }).map((d) => ({ ...d, kind })));
  const metaDir = join(dir, "metadata");
  if (existsSync(metaDir) && statSync(metaDir).isDirectory()) {
    for (const name of readdirSync(metaDir)) {
      if (!name.endsWith(".yaml") && !name.endsWith(".yml")) continue;
      const text = readFileSync(join(metaDir, name), "utf8");
      const takeaway = (text.match(/^takeaway:\s*(.+)$/m) ?? [])[1];
      if (!takeaway) continue; // без takeaway запись не принимается (К-04)
      const id = (text.match(/^id:\s*(.+)$/m) ?? [])[1] ?? basename(name, ".yaml");
      const style = (text.match(/^style:\s*(.+)$/m) ?? [])[1] ?? "";
      const source = (text.match(/^source:\s*(.+)$/m) ?? [])[1] ?? join(metaDir, name);
      docs.push({ id: String(id).trim(), source: String(source).trim(), tags: style ? tokenize(style) : [], takeaway: takeaway.trim(), text: style.trim(), kind });
    }
  }
  // Один приём может встречаться и в INDEX.md, и в metadata/*.yaml — объединяем по id.
  const byId = new Map();
  for (const doc of docs) {
    const prev = byId.get(doc.id);
    if (!prev) {
      byId.set(doc.id, doc);
      continue;
    }
    byId.set(doc.id, {
      ...prev,
      tags: [...new Set([...prev.tags, ...doc.tags])],
      takeaway: doc.takeaway.length > prev.takeaway.length ? doc.takeaway : prev.takeaway,
      text: [prev.text, doc.text].filter(Boolean).join(" · "),
      source: doc.source || prev.source,
    });
  }
  return [...byId.values()];
}

export default KnowledgeRetriever;
