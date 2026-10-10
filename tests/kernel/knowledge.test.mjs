/* tests/kernel/knowledge.test.mjs — RAG (§4.7, §12.2): BM25, стемминг, дедуп архива, фильтры, К-04. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { buildIndex, KnowledgeRetriever, documentsFromDirectory, parseReferencesIndex, tokenize, stemTerm } from "../../core/knowledge/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const DOCS = [
  { id: "REF-01", source: "a", tags: ["typography"], takeaway: "Заголовок задаёт вертикальный ритм страницы." },
  { id: "REF-02", source: "b", tags: ["layout"], takeaway: "Плотный индекс важнее украшений обложки." },
];

test("tokenize стеммит кириллицу и оставляет латиницу", () => {
  assert.equal(stemTerm("заголовка"), stemTerm("заголовок"));
  assert.equal(stemTerm("scroll-story"), "scroll-story");
  assert.ok(tokenize("Заголовка ритм").includes(stemTerm("заголовок")));
});

test("BM25 находит документ по словоформе", () => {
  const retriever = new KnowledgeRetriever({ documents: DOCS });
  const hits = retriever.search("заголовок", { topK: 1 });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "REF-01");
  assert.ok(hits[0].score > 0);
});

test("фильтр по тегу ограничивает выдачу", () => {
  const retriever = new KnowledgeRetriever({ documents: DOCS });
  const hits = retriever.search("индекс обложка", { filters: { tag: "layout" } });
  assert.ok(hits.every((h) => h.tags.includes("layout")));
});

test("провайдер без клиента делает честный fallback на local", () => {
  const events = [];
  const retriever = new KnowledgeRetriever({ documents: DOCS, provider: "qdrant", onFallback: (e) => events.push(e) });
  assert.equal(retriever.provider, "local");
  assert.equal(events[0].to, "local");
  assert.equal(retriever.search("заголовок").length, 1);
});

test("parseReferencesIndex берёт только строки с REF/SK-идентификатором", () => {
  const md = "| Id | Приём | Откуда | Что берём |\n| --- | --- | --- | --- |\n| REF-01 | typography | src | тезис |\n| мусор | x | y | z |";
  const docs = parseReferencesIndex(md);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, "REF-01");
});

test("documentsFromDirectory дедуплицирует INDEX.md и metadata по id", () => {
  const docs = documentsFromDirectory(resolve(ROOT, "verticals/legal_docs/references"));
  const ids = docs.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, "id должны быть уникальны");
  assert.ok(docs.every((d) => d.takeaway.length > 0), "без takeaway записи нет (К-04)");
  const index = buildIndex(docs);
  assert.ok(index.terms.length > 0);
});
