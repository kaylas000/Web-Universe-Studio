/* ЦЕХ · Universal Loop Engine — contract.mjs
   КОНТРАКТ СТУДИИ ДЛЯ МОДЕЛИ: закон + правило → машинная проверка → шаг починки.

   Зачем модуль. В студии закон (CONSTITUTION.md), запреты (BANNED/QUOTAS) и правила
   (scripts/rules.json, slop.json, quotas.json) живут порознь, а валидаторы печатают коды
   (V-xx, B-xx, Q-xx). Модель, получив отказ, видела только код и текст ошибки — и «угадывала»
   починку. Здесь закон превращается в контракт: у каждого кода есть статья, машинная проверка
   (её можно прогнать до валидатора), приём студии, который код закрывает, и точный шаг правки.

   Публичный API:
     loadContract(studioRoot)                  → Contract (статьи, коды, приёмы, шаги)
     renderContract(contract, opts)            → блок промпта «ЗАКОН СТУДИИ»
     buildRepairPlan(feedback, contract)       → план точечных правок по кодам (К-10)
     auditContractDrift(studioRoot, contract)  → коды, которые печатают линтеры, но нет в законе
     evaluateCode(code, projectDir, contract)  → {status: "pass"|"fail"|"skip", detail}

   Импортов из вертикалей нет: контракт читается как данные (как и требует §8 ТЗ).
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { parseSimpleYaml } from "./config.mjs";
import { collectArtifacts } from "./skill-evidence.mjs";

export const CONTRACT_ERROR = "E-CONTRACT";

/** Файлы-источники правил внутри студии, в порядке приоритета. */
const RULE_SOURCES = Object.freeze({
  validate: ["scripts/rules.json"],
  banned: ["scripts/slop.json", "anti-slop/BANNED.json"],
  quota: ["scripts/quotas.json", "anti-slop/QUOTAS.json"],
  copy: ["scripts/copy.json"],
});

/** Документы студии, объявляющие статьи закона. */
const LAW_SOURCES = Object.freeze(["CONSTITUTION.md", "anti-slop/BANNED.md", "anti-slop/QUOTAS.md"]);

/** Коды, которые печатает общий движок текста (core/vertical-kit/copywriting.mjs). */
const TEXT_CODES = Object.freeze({
  A: { kind: "copy", title: "артефакт машинной генерации", severity: "error", fix: "убрать служебный артефакт из текста" },
  C: { kind: "copy", title: "канцелярит/штамп-связка", severity: "warn", fix: "переписать фразу глаголом и фактом" },
  N: { kind: "copy", title: "ритмический приём ИИ", severity: "warn", fix: "снять навязчивый ритм, оставить одну мысль" },
  R: { kind: "copy", title: "ритм предложений", severity: "warn", fix: "разбить длинную фразу или слить рубленые" },
});

/* ————————————————————————— чтение ————————————————————————— */

function readTextIfExists(path) {
  try {
    return existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

function readJsonIfExists(path) {
  const text = readTextIfExists(path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Список файлов студии (для аудита дрейфа). */
function listSourceFiles(dir, depth = 2) {
  /** @type {string[]} */
  const out = [];
  const walk = (current, level) => {
    if (level > depth) return;
    /** @type {import("node:fs").Dirent[]} */
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const abs = join(current, entry.name);
      if (entry.isDirectory()) walk(abs, level + 1);
      else if (/\.(mjs|js|json)$/.test(entry.name)) out.push(abs);
    }
  };
  walk(dir, 1);
  return out;
}

/* ————————————————————————— статьи закона ————————————————————————— */

/**
 * Разбирает CONSTITUTION.md. Поддержаны оба формата студий:
 *   «## К-01\n<текст>\n\nПроверка: V-01, V-07 · метод: валидатор»  (веб-студия)
 *   «- **К-01.** <текст> *Проверка:* V-01 (прокси: …)»            (мини/мобильные)
 * @returns {Array<{id: string, text: string, codes: string[], method: string}>}
 */
export function parseConstitution(markdown) {
  if (!markdown) return [];
  const laws = [];

  // формат 1: заголовок «## К-xx»
  const blocks = String(markdown).split(/\n(?=##\s+К-\d+)/);
  for (const block of blocks) {
    const head = /^##\s+(К-\d+)\.?\s*(.*)$/m.exec(block);
    if (!head) continue;
    const id = head[1];
    const verifyLine = /Проверка:\s*([^\n]+)/i.exec(block)?.[1] ?? "";
    const codes = [...new Set((verifyLine.match(/[A-ZА-Я]{1,2}-\d{2}/g) ?? []).map(String))].filter((c) => !c.startsWith("К-"));
    const method = /метод:\s*([^\n·]+)/i.exec(verifyLine)?.[1]?.trim() ?? "";
    const humanOnly = /арт-директор|куратор|человек|регламент|приёмка/i.test(verifyLine);
    const body = block
      .replace(head[0], "")
      .replace(/Проверка:[^\n]*/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\s+/g, " ")
      .trim();
    laws.push({ id, text: body.slice(0, 600), codes, method, humanOnly });
  }
  if (laws.length > 0) return laws;

  // формат 2: пункты «- **К-xx.** текст …» и «- **К-xx. Заголовок.** текст»
  const re = /^[-*]\s+\*\*(К-\d+)\.\s*([^*]*)\*\*\s*([\s\S]*?)(?=\n[-*]\s+\*\*К-\d+[.\s]|\n##|\s*$)/gm;
  for (const match of String(markdown).matchAll(re)) {
    const id = match[1];
    const raw = `${match[2] ?? ""} ${match[3] ?? ""}`.replace(/\s+/g, " ").trim();
    const verify = /\*Проверка:\*\s*([^*(]+)/i.exec(raw)?.[1] ?? "";
    const codes = [...new Set((verify.match(/[A-ZА-Я]{1,2}-\d{2}/g) ?? []).map(String))].filter((c) => !c.startsWith("К-"));
    const humanOnly = codes.length === 0 || /скриншот|инспектор|человек|приёмка|devtools|profiler/i.test(verify);
    laws.push({ id, text: raw.replace(/\*Проверка:\*[^*(]*/i, "").trim().slice(0, 600), codes, method: "валидатор", humanOnly });
  }
  return laws;
}

/**
 * Разбирает строки-таблицы анти-слопа: `| B-01 | Что | Почему |` (3 или 4 колонки).
 * @returns {Array<{code: string, title: string, detail: string, pattern: string}>}
 */
export function parseCodeTable(markdown) {
  if (!markdown) return [];
  const rows = [];
  for (const line of String(markdown).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    // «\|» внутри ячейки — экранированный разделитель markdown: режем только по «настоящим» пайпам
    const cells = trimmed.slice(1).replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
    if (cells.length < 3) continue;
    if (!/^[A-ZА-Я]{1,2}-\d{2}$/.test(cells[0])) continue;
    const criterion = cells.slice(3).join(" · ");
    rows.push({
      code: cells[0],
      title: cells[1].replace(/\s*—.*$/, "").slice(0, 160),
      method: cells[2] ?? "",
      detail: cells.slice(2).join(" · ").slice(0, 260),
      pattern: /`([^`]+)`/.exec(criterion)?.[1] ?? /`([^`]+)`/.exec(cells.slice(2).join(" · "))?.[1] ?? "",
    });
  }
  return rows;
}

/** Разбирает список квот: «- **Q-01.** текст». */
export function parseQuotaList(markdown) {
  if (!markdown) return [];
  const rows = [];
  for (const match of String(markdown).matchAll(/^[-*]\s+\*\*(Q-\d+)\.\*\*\s*(.+)$/gm)) {
    rows.push({ code: match[1], title: match[2].replace(/\s+/g, " ").slice(0, 200) });
  }
  return rows;
}

/* ————————————————————————— коды правил ————————————————————————— */

/**
 * Приводит декларативное правило (rules.json/slop.json/quotas.json) к записи контракта.
 * @returns {{code: string, kind: string, title: string, machine: boolean, rule: any, source: string, method: string, fix: string, path?: string}}
 */
function ruleToCode(rule, kind, source) {
  const code = String(rule.code ?? "");
  const title = String(rule.title ?? rule.message ?? "").slice(0, 240);
  const fail = String(rule.fail ?? rule.message ?? "");
  return {
    code,
    kind,
    title,
    // правило с регуляркой проверяемо и без поля kind: запрет = «паттерна нет ни в одном файле»
    machine: typeof rule.kind === "string" || typeof rule.pattern === "string",
    method: kind === "banned" ? "линтер анти-слопа" : kind === "quota" ? "линтер квот" : "валидатор студии",
    rule,
    source,
    path: rule.path ?? (Array.isArray(rule.rules) ? rule.rules.find((r) => r?.path)?.path : undefined),
    fix: fail.replace(/\([^)]*\)\s*·.*$/, "").trim() || title,
  };
}

/** Собирает коды из rules.json (V-xx), slop.json (B-xx), quotas.json (Q-xx). */
export function loadRuleCodes(studioRoot) {
  /** @type {any[]} */
  const codes = [];
  for (const [kind, candidates] of Object.entries(RULE_SOURCES)) {
    for (const rel of candidates) {
      const abs = join(studioRoot, rel);
      const data = readJsonIfExists(abs);
      if (!data) continue;
      const scope = { dirs: Array.isArray(data.scan) ? data.scan : [], extensions: Array.isArray(data.extensions) ? data.extensions : [] };
      for (const rule of data.rules ?? []) {
        if (!rule?.code) continue;
        const code = ruleToCode(rule, kind === "validate" ? "validate" : kind, rel);
        code.scope = scope;
        codes.push(code);
      }
      break; // первый существующий источник выигрывает
    }
  }
  return codes;
}

/** Коды движка текста (A/C/N/R из core/vertical-kit/copywriting.mjs). */
function textCodes() {
  /** @type {any[]} */
  const out = [];
  const file = resolve(join(import.meta.dirname ?? ".", "..", "vertical-kit", "copywriting.mjs"));
  const text = readTextIfExists(file);
  if (text) {
    for (const match of text.matchAll(/code:\s*"([ACNR]-\d{2})",\s*pattern:[^,]+,\s*message:\s*"([^"]+)"/g)) {
      out.push({
        code: match[1],
        kind: "copy",
        title: match[2].slice(0, 200),
        machine: true,
        rule: null,
        source: "core/vertical-kit/copywriting.mjs",
        method: "линтер текста (lint-copy)",
        fix: TEXT_CODES[match[1][0]]?.fix ?? "переписать фразу",
      });
    }
  }
  if (out.length === 0) {
    for (const [letter, meta] of Object.entries(TEXT_CODES)) {
      out.push({ code: `${letter}-01`, kind: meta.kind, title: meta.title, machine: true, rule: null, source: "core/vertical-kit/copywriting.mjs", method: "линтер текста (lint-copy)", fix: meta.fix });
    }
  }
  return out;
}

/** Коды, которые печатают сами скрипты-валидаторы (веб-студия — процедурный validate.mjs). */
function codesFromScripts(studioRoot) {
  /** @type {Map<string, {code: string, kind: string, title: string, source: string, machine: boolean, method: string, fix: string}>} */
  const found = new Map();
  const scriptsDir = join(studioRoot, "scripts");
  if (!existsSync(scriptsDir)) return [];
  for (const file of readdirSync(scriptsDir)) {
    if (!/\.mjs$/.test(file)) continue;
    const text = readTextIfExists(join(scriptsDir, file));
    if (!text) continue;
    const kind = /lint-slop|slop/.test(file) ? "banned" : /quota/.test(file) ? "quota" : /lint-copy/.test(file) ? "copy" : "validate";
    // «add("V-01", "заголовок", …» и «["B-01", /regex/]» и «{ code: "Q-01" …»
    const patterns = [
      /add\(\s*"([A-ZА-Я]{1,2}-\d{2})"\s*,\s*"([^"]*)"/g,
      /\[\s*"([A-ZА-Я]{1,2}-\d{2})"\s*,\s*\//g,
      /code:\s*"([A-ZА-Я]{1,2}-\d{2})"[\s\S]{0,160}?(?:title|message|msg):\s*"([^"]*)"/g,
    ];
    for (const re of patterns) {
      for (const match of text.matchAll(re)) {
        const code = match[1];
        if (found.has(code)) continue;
        found.set(code, {
          code,
          kind,
          title: (match[2] ?? "").slice(0, 200),
          source: `scripts/${file}`,
          machine: true,
          method: kind === "banned" ? "линтер анти-слопа" : kind === "quota" ? "линтер квот" : kind === "copy" ? "линтер текста" : "валидатор студии",
          fix: "",
        });
      }
    }
  }
  return [...found.values()];
}

/* ————————————————————————— приёмы студии ————————————————————————— */

/**
 * Читает скиллы студии: метаданные, коды и — главное — исполнимую часть.
 *
 * Приём считается исполняемым, когда у него есть `skill.yaml` (движок загружает приёмы
 * только по нему), шаблоны ролей `templates/*.j2` и, по желанию, крючки `hooks/*.mjs`.
 * Приём без skill.yaml остаётся памяткой: он попадает в контракт, но помечается
 * `executable: false`, и цикл не делает вид, что может его исполнить.
 */
export function loadSkills(studioRoot) {
  const dir = join(studioRoot, "skills");
  if (!existsSync(dir)) return [];
  /** @type {any[]} */
  const skills = [];
  for (const name of readdirSync(dir).sort()) {
    const skillDir = join(dir, name);
    if (name.startsWith("_") || name.startsWith(".") || !statSync(skillDir).isDirectory()) continue;
    const meta = readTextIfExists(join(skillDir, "skill.yaml"));
    const index = readTextIfExists(join(skillDir, "SKILL.md"));
    const yaml = meta ? parseSimpleYaml(meta) ?? {} : {};
    const text = [yaml.title, yaml.description, yaml.takeaway, index ?? ""].filter(Boolean).join(" \n ");
    const templatesDir = join(skillDir, "templates");
    const templates = existsSync(templatesDir)
      ? readdirSync(templatesDir).filter((f) => f.endsWith(".j2")).map((f) => basename(f, ".j2")).sort()
      : [];
    const hooks = ["pre_execute", "post_execute"].filter((h) => existsSync(join(skillDir, "hooks", `${h}.mjs`)));
    const list = (value) => (Array.isArray(value) ? value.map(String) : value === undefined || value === null || value === "" ? [] : [String(value)])
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item !== "—" && item !== "-");
    skills.push({
      id: String(yaml.name ?? name),
      dir: skillDir,
      title: String(yaml.title ?? name),
      description: String(yaml.description ?? ""),
      takeaway: String(yaml.takeaway ?? ""),
      when: String(yaml.when ?? ""),
      steps: list(yaml.steps),
      codes: list(yaml.codes),
      evidence: { require: list(yaml.evidence?.require), forbid: list(yaml.evidence?.forbid), files: list(yaml.evidence?.files) },
      templates,
      hooks,
      executable: Boolean(meta) && templates.length > 0,
      covers: [...new Set([...list(yaml.codes), ...(text.match(/[A-ZА-Я]{1,2}-\d{2}/g) ?? []).map(String)])],
      families: [...new Set((text.match(/[A-ZА-Я]{1,2}-xx/g) ?? []).map((m) => m.slice(0, m.indexOf("-"))))],
      text,
    });
  }
  return skills;
}

/**
 * Переводит паттерн из таблицы запретов в регулярку JS.
 * Таблицы пишут «grep»-стилем (`\|` вместо `|`) и иногда кладут в колонку критерий
 * («text-center + h1 + 2×btn») — критерий регуляркой не является, и врать о машинной
 * проверке нельзя: такой запрет остаётся за арт-директором.
 * @param {string} pattern
 * @returns {string|null}
 */
export function normalizeBanPattern(pattern) {
  const raw = String(pattern ?? "").trim();
  if (raw.length === 0) return null;
  if (/×|≥|≤|повторяется|вне\s|\s[+/]\s/.test(raw)) return null; // критерий, а не паттерн
  const js = raw.split("\\|").join("|");
  if (!compiles(js)) return null;
  return js;
}

/** Регулярка запрета: сначала с флагом u (диапазоны эмодзи), иначе без него. */
function compiles(pattern, flags = "im") {
  try {
    new RegExp(pattern, flags);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} pattern */
export function banRegExp(pattern) {
  for (const flags of ["imu", "im"]) {
    try {
      return new RegExp(pattern, flags);
    } catch {
      /* пробуем следующий набор флагов */
    }
  }
  return null;
}

/* ————————————————————————— контракт ————————————————————————— */

/**
 * Собирает контракт студии: статьи закона ↔ машинные коды ↔ приёмы.
 * @param {string} studioRoot
 * @param {{vertical?: string}} [opts]
 */
export function loadContract(studioRoot, opts = {}) {
  const root = resolve(String(studioRoot));
  if (!existsSync(root)) throw new Error(`контракт: каталог студии не найден (${root})`);

  // Область машинных проверок — артефакт студии (deliverable из vertical.yaml), а не весь проект:
  // запреты анти-слопа проверяются там же, где их проверяет линтер студии.
  const verticalYaml = parseSimpleYaml(readTextIfExists(join(root, "vertical.yaml")) ?? "") ?? {};
  const deliverable = String(verticalYaml.metadata?.deliverable ?? verticalYaml.spec?.deliverable ?? "").trim();
  const banScope = deliverable ? { dirs: [deliverable], extensions: [".html", ".css", ".js", ".mjs", ".json", ".txt", ".md"] } : { dirs: [], extensions: [] };

  const constitution = LAW_SOURCES.map((rel) => readTextIfExists(join(root, rel)));
  const laws = parseConstitution(constitution[0]);
  const banned = parseCodeTable(constitution[1]);
  const quotas = parseQuotaList(constitution[2]);

  /** @type {Map<string, any>} */
  const codes = new Map();
  for (const entry of [...loadRuleCodes(root), ...textCodes(), ...codesFromScripts(root)]) {
    const prev = codes.get(entry.code);
    if (prev) {
      // скрипт-запись уточняет декларативную: сохраняем и правило, и заголовок
      codes.set(entry.code, { ...prev, ...entry, rule: entry.rule ?? prev.rule, fix: entry.fix || prev.fix, title: entry.title || prev.title });
    } else {
      codes.set(entry.code, { ...entry });
    }
  }
  // запреты/квоты из документов — источник «почему», если правило не декларировано
  for (const row of banned) {
    const cur = codes.get(row.code) ?? { code: row.code, kind: "banned", machine: true, rule: null, method: "линтер анти-слопа" };
    const pattern = /grep/i.test(row.method ?? "") ? normalizeBanPattern(row.pattern) : null;
    const rule = cur.rule ?? (pattern ? { code: row.code, pattern, message: row.title } : null);
    codes.set(row.code, {
      ...cur,
      title: cur.title || row.title,
      rationale: row.detail,
      fix: cur.fix || row.title,
      rule,
      // «machine» — код проверяется исполняемым линтером студии; rule/inProcess — умеем проверить здесь
      machine: Boolean(cur.machine || cur.rule || rule),
      scope: cur.scope ?? banScope,
      declaredIn: row.pattern ? "anti-slop/BANNED.md" : cur.declaredIn,
    });
  }
  for (const row of quotas) {
    const cur = codes.get(row.code) ?? { code: row.code, kind: "quota", machine: true, rule: null, method: "линтер квот" };
    codes.set(row.code, { ...cur, title: cur.title || row.title, rationale: row.title, fix: cur.fix || row.title });
  }

  // коды, объявленные только в статье закона («Проверка: lint-marketing.mjs (M-01, M-02)») —
  // тоже часть контракта: модель должна видеть их так же, как декларативные
  for (const law of laws) {
    for (const code of law.codes) {
      if (codes.has(code)) continue;
      codes.set(code, {
        code,
        kind: /^Q-/.test(code) ? "quota" : /^[BN]/.test(code) ? "banned" : /^[ACNR]/.test(code) ? "copy" : "validate",
        title: law.text.slice(0, 160),
        machine: true,
        rule: null,
        source: "CONSTITUTION.md",
        declaredIn: "CONSTITUTION.md",
        method: law.method || "валидатор студии",
        fix: law.text.slice(0, 140),
        law: law.id,
      });
    }
  }

  const skills = loadSkills(root);
  // приём, который закрывает код: сначала явная ссылка в тексте приёма, затем статья закона
  const lawByCode = new Map();
  for (const law of laws) for (const code of law.codes) if (!lawByCode.has(code)) lawByCode.set(code, law);
  for (const code of codes.values()) {
    if (code.skill) continue;
    code.law = lawByCode.get(code.code)?.id ?? null;
    const law = lawByCode.get(code.code) ?? null;
    const family = code.code.slice(0, code.code.indexOf("-"));
    code.skill =
      skills.find((skill) => skill.covers.includes(code.code))?.id ??
      skills.find((skill) => (skill.families ?? []).includes(family))?.id ??
      (law ? bestSkillFor(`${law.text} ${code.title}`, skills) : bestSkillFor(String(code.title), skills));
  }

  return {
    vertical: String(opts.vertical ?? basename(root)),
    root,
    laws,
    banned,
    quotas,
    skills,
    codes: [...codes.values()].sort((a, b) => a.code.localeCompare(b.code, "ru")),
    stats: {
      laws: laws.length,
      codes: codes.size,
      machine: [...codes.values()].filter((c) => c.machine).length,
      skills: skills.length,
      uncovered: laws.filter((law) => law.codes.length === 0 && law.humanOnly !== true).length,
      humanLaws: laws.filter((law) => law.codes.length === 0 && law.humanOnly === true).length,
    },
    /** Коды без приёма: их починку модель выводит из текста ошибки. */
    orphans: [...codes.values()].filter((c) => !c.skill).map((c) => c.code),
  };
}

/** Значимые слова фразы (без служебных, длиннее 4 символов, с усечением окончаний). */
function keywordsOf(text) {
  const stop = new Set(["правило", "проверка", "проверять", "должен", "должна", "нужно", "чтобы", "который", "также", "таким", "образом", "каждый", "каждая", "более", "менее", "только", "через", "вместо", "если", "иначе", "линия", "проект", "экране", "текста"]);
  return new Set(
    String(text ?? "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !stop.has(w))
      .map((w) => w.replace(/(ого|его|ому|ему|ыми|ими|ая|ое|ые|ий|ый|ой|ся|ть|ет|ют|ит|ат|ях|ам|ах)$/u, ""))
      .filter((w) => w.length > 3),
  );
}

/**
 * Приём, который ближе всего к тексту статьи или кода (пересечение значимых слов).
 * Нужен там, где студия не проставила коды в skill.yaml: модель всё равно должна знать,
 * каким приёмом правило закрывается.
 */
export function bestSkillFor(text, skills, { minOverlap = 2 } = {}) {
  const words = keywordsOf(text);
  if (words.size === 0) return null;
  /** @type {{id: string, score: number}|null} */
  let best = null;
  for (const skill of skills) {
    const skillWords = keywordsOf(`${skill.title} ${skill.description} ${skill.takeaway}`);
    let score = 0;
    for (const w of words) if (skillWords.has(w)) score += 1;
    if (score >= minOverlap && (best === null || score > best.score)) best = { id: skill.id, score };
  }
  return best?.id ?? null;
}

/* ————————————————————————— машинная проверка правила ————————————————————————— */

/** Читает JSON артефакта проекта; null — если файла нет или он не разобран. */
function readJson(projectDir, rel) {
  const text = readProject(projectDir, rel);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readProject(projectDir, rel) {
  try {
    return readFileSync(join(projectDir, String(rel)), "utf8");
  } catch {
    return null;
  }
}

function countMatches(text, pattern) {
  try {
    return (String(text).match(new RegExp(pattern, "gm")) ?? []).length;
  } catch {
    return 0;
  }
}

function getPath(data, key) {
  let cur = data;
  for (const part of String(key).split(".")) {
    if (cur === null || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Прогоняет машинную проверку кода до валидатора: модель видит, что именно падает.
 * Поддержаны виды правил обеих студий (rules.json/slop.json/quotas.json).
 * @returns {{status: "pass"|"fail"|"skip", detail: string}}
 */
export function evaluateCode(code, projectDir, contract) {
  const rule = code?.rule;
  const dir = resolve(String(projectDir));
  // Запрет/квота, описанные паттерном без kind: «паттерна нет нигде в области скана».
  // Так B-коды из slop.json тоже проверяются машинно, а не только линтером студии.
  if (rule && typeof rule.kind !== "string" && typeof rule.pattern === "string") {
    const result = evalKind({ kind: "regexAbsentInTree", pattern: rule.pattern, dirs: code.scope?.dirs ?? [], extensions: code.scope?.extensions ?? [] }, dir, 0);
    return result === null
      ? { status: "skip", detail: "область скана не описана — проверяет линтер студии" }
      : { status: result ? "pass" : "fail", detail: result ? "запрещённый признак не найден" : "найден запрещённый признак" };
  }
  if (!rule || typeof rule.kind !== "string") return { status: "skip", detail: "правило декларативно не описано — проверяет валидатор студии" };
  const result = evalKind(rule, dir, 0);
  return result === null
    ? { status: "skip", detail: `вид правила «${rule.kind}» не поддержан машинной проверкой` }
    : { status: result ? "pass" : "fail", detail: result ? "правило выполнено" : "правило нарушено" };
}

function evalKind(rule, dir, depth) {
  if (!rule || depth > 6) return null;
  switch (rule.kind) {
    case "regexAbsentInTree": {
      const dirs = Array.isArray(rule.dirs) && rule.dirs.length > 0 ? rule.dirs : ["./"];
      const extensions = Array.isArray(rule.extensions) && rule.extensions.length > 0 ? rule.extensions : [".html", ".css", ".js", ".mjs", ".json", ".md", ".txt"];
      const files = collectArtifacts(dir, { dirs: dirs.map((d) => String(d)), extensions: extensions.map((e) => String(e).toLowerCase()), limit: 400 });
      const re = banRegExp(String(rule.pattern));
      if (!re) return null;
      return !files.some((file) => {
        const text = readTextIfExists(file);
        return text !== null && re.test(text);
      });
    }
    case "fileExists":
      return existsSync(join(dir, String(rule.path)));
    case "filesExist":
      return (rule.paths ?? []).every((p) => existsSync(join(dir, String(p))));
    case "minWords": {
      const text = readProject(dir, rule.path);
      return text !== null && text.split(/\s+/).filter(Boolean).length >= Number(rule.min ?? 1);
    }
    case "regexAtLeast": {
      const text = readProject(dir, rule.path);
      return text !== null && countMatches(text, rule.pattern) >= Number(rule.min ?? 1);
    }
    case "regexAbsent": {
      const text = readProject(dir, rule.path);
      return text !== null && !new RegExp(rule.pattern, "m").test(text);
    }
    case "regexCount": {
      const text = readProject(dir, rule.path);
      if (text === null) return false;
      const n = countMatches(text, rule.pattern);
      return n >= Number(rule.min ?? 0) && n <= Number(rule.max ?? Infinity);
    }
    case "regexAtMost": {
      const text = readProject(dir, rule.path);
      return text !== null && countMatches(text, rule.pattern) <= Number(rule.max ?? 0);
    }
    case "textHasAny": {
      const text = readProject(dir, rule.path);
      return text !== null && (rule.patterns ?? []).some((p) => new RegExp(p, "m").test(text));
    }
    case "textHasAll": {
      const text = readProject(dir, rule.path);
      return text !== null && (rule.patterns ?? []).every((p) => new RegExp(p, "m").test(text));
    }
    case "jsonNumberMax":
    case "jsonNumberMin": {
      const data = readProject(dir, rule.path);
      if (data === null) return false;
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        return false;
      }
      const value = getPath(parsed, rule.key);
      if (typeof value !== "number") return false;
      return rule.kind === "jsonNumberMax" ? value <= Number(rule.max ?? Infinity) : value >= Number(rule.min ?? -Infinity);
    }
    case "jsonArrayMinItems": {
      const data = readProject(dir, rule.path);
      if (data === null) return false;
      try {
        const arr = getPath(JSON.parse(data), rule.key);
        return Array.isArray(arr) && arr.length >= Number(rule.min ?? 1);
      } catch {
        return false;
      }
    }
    case "implies": {
      const text = readProject(dir, rule.path);
      if (text === null) return false;
      const when = new RegExp(rule.if, "m").test(text);
      if (!when) return true;
      return (rule.then ?? []).some((p) => new RegExp(p, "m").test(text));
    }
    case "allOf": {
      // Трёхзначная логика: неизвестный вид правила — это «не знаю» (null), а не «нарушено».
      // Иначе неполная машинная проверка объявляет зелёный проект виновным.
      let unknown = false;
      for (const sub of rule.rules ?? []) {
        const value = evalKind(sub, dir, depth + 1);
        if (value === false) return false;
        if (value === null) unknown = true;
      }
      return unknown ? null : true;
    }
    case "jsonStringLength": {
      const data = readJson(dir, rule.path);
      if (data === null || typeof data !== "object") return false;
      return (rule.fields ?? []).every((field) => {
        let cur = data;
        for (const part of String(field.key ?? "").split(".")) {
          if (cur === null || typeof cur !== "object" || !(part in cur)) return false;
          cur = cur[part];
        }
        return typeof cur === "string" && cur.length >= Number(field.min ?? 0) && cur.length <= Number(field.max ?? Infinity);
      });
    }
    case "jsonKeysParity": {
      const sets = (rule.paths ?? []).map((rel) => {
        const data = readJson(dir, rel);
        return data && typeof data === "object" && !Array.isArray(data) ? new Set(Object.keys(data)) : null;
      });
      if (sets.some((set) => set === null)) return false;
      const [base, ...rest] = sets;
      return rest.every((set) => set.size === base.size && [...set].every((key) => base.has(key)));
    }
    case "jsonHas": {
      const data = readJson(dir, rule.path);
      if (data === null || typeof data !== "object") return false;
      return (rule.keys ?? []).every((key) => data[key] !== undefined && data[key] !== null && data[key] !== "");
    }
    case "jsonArrayEveryHas": {
      const data = readJson(dir, rule.path);
      const arr = data && typeof data === "object" ? data[rule.key] : null;
      if (!Array.isArray(arr) || arr.length === 0) return false;
      return arr.every((item) => (rule.fields ?? []).every((field) => item && typeof item === "object" && item[field] !== undefined && item[field] !== null));
    }
    case "anyOf":
      return (rule.rules ?? []).some((sub) => evalKind(sub, dir, depth + 1) === true);
    default:
      return null; // themeContrast, assetSizeMaxKb… — считает валидатор студии
  }
}

/* ————————————————————————— блок промпта ————————————————————————— */

/**
 * Рендерит контракт в текст для системного промпта.
 * @param {ReturnType<typeof loadContract>} contract
 * @param {{maxCodes?: number, includeLaws?: boolean, taskLine?: string}} [opts]
 */
export function renderContract(contract, opts = {}) {
  const maxCodes = Number(opts.maxCodes ?? 60);
  const includeLaws = opts.includeLaws !== false;
  const codes = contract.codes.slice(0, maxCodes);
  const lines = [
    `## ЗАКОН СТУДИИ «${contract.vertical}» (исполняется валидаторами, не памятью)`,
    "",
    "Правила ниже — не рекомендации. Каждое проверяется детерминированно: код в скобках — то, что напечатает студия.",
    "Артефакт без зелёных кодов не принимается: цикл вернёт список кодов, и правки делаются точечно (К-10).",
    "",
  ];

  if (includeLaws && contract.laws.length > 0) {
    lines.push("### Статьи", "");
    for (const law of contract.laws) {
      const codesText = law.codes.length > 0 ? ` [${law.codes.join(", ")}]` : " [вердикт человека]";
      lines.push(`- ${law.id}. ${law.text.slice(0, 220)}${codesText}`);
    }
    lines.push("");
  }

  lines.push("### Коды приёмки: что проверяет студия", "");
  for (const code of codes) {
    const bits = [`**${code.code}** ${code.title || code.kind}`];
    if (code.method) bits.push(`(${code.method})`);
    if (code.fix && code.fix !== code.title) bits.push(`→ правка: ${code.fix.slice(0, 140)}`);
    if (code.skill) bits.push(`· приём: ${code.skill}`);
    lines.push(`- ${bits.join(" ")}`);
  }
  if (contract.codes.length > codes.length) {
    lines.push(`- … ещё ${contract.codes.length - codes.length} кодов в contract.json студии`);
  }
  lines.push("");

  lines.push("### Приёмы студии (обязательны к применению)", "");
  const maxSkills = Number(opts.maxSkills ?? 40);
  const skillSteps = Number(opts.skillSteps ?? 0);
  for (const skill of contract.skills.slice(0, maxSkills)) {
    const covers = skill.covers.length > 0 ? ` → ${skill.covers.slice(0, 8).join(", ")}` : "";
    const exec = skill.executable ? "" : " (памятка: нет skill.yaml — сверься с SKILL.md)";
    lines.push(`- ${skill.id}: ${(skill.takeaway || skill.title).slice(0, 180)}${covers}${exec}`);
    if (skill.when) lines.push(`  когда: ${skill.when.slice(0, 160)}`);
    if (skillSteps > 0 && skill.steps.length > 0) {
      skill.steps.slice(0, skillSteps).forEach((step, i) => lines.push(`  ${i + 1}) ${step.slice(0, 170)}`));
    }
    const req = skill.evidence?.require?.length ? `обязательно: ${skill.evidence.require.map((r) => `/${r}/`).join(", ")}` : "";
    const forb = skill.evidence?.forbid?.length ? `запрещено: ${skill.evidence.forbid.map((r) => `/${r}/`).join(", ")}` : "";
    if (req || forb) lines.push(`  признаки приёмки: ${[req, forb].filter(Boolean).join(" · ")}`);
  }
  lines.push("");

  if (opts.taskLine) lines.push(`### Что делать с контрактом на этой итерации`, `- ${opts.taskLine}`, "");
  return lines.join("\n");
}

/* ————————————————————————— план правок ————————————————————————— */

/**
 * Строит план точечных правок по кодам фидбека (К-10: возврат = правки по пунктам).
 * Для каждого кода: что это, где искать (путь), как проверить (машинно, если возможно), какой приём закрывает.
 * @param {import("./base.mjs").Feedback} feedback
 * @param {ReturnType<typeof loadContract>} contract
 * @param {{projectDir?: string}} [opts]
 */
export function buildRepairPlan(feedback, contract, opts = {}) {
  const codes = [...new Set([...(feedback?.codes ?? []), ...extractCodes(feedback?.errors ?? [])].map(String))];
  const projectDir = opts.projectDir ?? null;
  /** @type {Array<{code: string, kind: string, title: string, target: string, instruction: string, skill: string|null, check: string}>} */
  const steps = [];

  for (const code of codes) {
    if (/^E-|^L-/.test(code)) continue; // инфраструктурные коды движка — не пункт дизайна
    const entry = contract.codes.find((c) => c.code === code);
    const check = entry && projectDir ? evaluateCode(entry, projectDir, contract) : null;
    // приём: сначала объявленный в коде, иначе подбор по смыслу (код + текст ошибки)
    const named = entry?.skill ? contract.skills.find((sk) => sk.id === entry.skill) ?? null : null;
    const skill = named ?? contract.skills.find((sk) => sk.id === bestSkillFor(`${code} ${feedback?.errors?.join?.(" ") ?? ""}`, contract.skills, { minOverlap: 2 })) ?? null;
    steps.push({
      code,
      kind: entry?.kind ?? "unknown",
      title: entry?.title ?? "(код не описан в законе — опирайся на текст ошибки)",
      target: entry?.path ?? entry?.declaredIn ?? (entry?.rule?.pattern ? `скан артефакта по /${String(entry.rule.pattern).slice(0, 90)}/` : "—"),
      instruction: entry?.fix || entry?.title || "исправь по тексту ошибки",
      skill: skill?.id ?? null,
      skillTitle: skill?.title ?? null,
      skillSteps: (skill?.steps ?? []).slice(0, 3),
      skillEvidence: skill?.evidence ?? null,
      check: check ? `${check.status}: ${check.detail}` : "проверяет валидатор студии",
    });
  }

  steps.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

  if (steps.length === 0) {
    const text = ["План правок пуст: машинных кодов нет.", "Опирайся на текст ошибок валидатора и перечитай контракт студии."].join("\n");
    return { codes, steps, text };
  }

  const lines = [
    "### ПЛАН ТОЧЕЧНЫХ ПРАВОК (К-10: исправляй пункты, а не переписывай всё)",
    "",
    "Для каждого кода ниже: что нарушено, где искать, чем закрыть и как проверить. Меняй только то, что закрывает код.",
    "",
  ];
  steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step.code} · ${step.title}`);
    lines.push(`   - где: ${step.target}`);
    lines.push(`   - что сделать: ${step.instruction}`);
    if (step.skill) lines.push(`   - приём студии: ${step.skill}${step.skillTitle ? ` (${step.skillTitle.slice(0, 90)})` : ""}`);
    for (const [i, skillStep] of (step.skillSteps ?? []).entries()) lines.push(`     ${i + 1}) ${skillStep.slice(0, 170)}`);
    const ev = step.skillEvidence;
    if (ev && (ev.require?.length || ev.forbid?.length)) {
      const parts = [];
      if (ev.require?.length) parts.push(`обязательно: ${ev.require.map((r) => `/${r}/`).join(", ")}`);
      if (ev.forbid?.length) parts.push(`запрещено: ${ev.forbid.map((r) => `/${r}/`).join(", ")}`);
      lines.push(`     признаки: ${parts.join(" · ")}`);
    }
    lines.push(`   - проверка: ${step.check}`);
  });
  lines.push("");
  lines.push("После правок снова прогони те же проверки: цикл примет артефакт только при нуле кодов.");
  return { codes, steps, text: lines.join("\n") };
}

/** Достаёт коды из текста ошибок (валидатор может печатать «V-04 …» без codes[]). */
export function extractCodes(errors) {
  /** @type {string[]} */
  const out = [];
  for (const error of errors ?? []) {
    for (const match of String(error).matchAll(/\b([A-ZА-Я]{1,2}-\d{2})\b/g)) {
      if (match[1].startsWith("К-")) continue;
      out.push(match[1]);
    }
  }
  return out;
}

/* ————————————————————————— аудит дрейфа ————————————————————————— */

/**
 * Ищет коды, которые печатают линтеры/валидаторы студии, но которых нет в законе,
 * и статьи закона без машинного кода. Это «правила-призраки»: модель их не видит.
 * @returns {{ok: boolean, phantom: Array<{code: string, source: string}>, unmapped: Array<{id: string, text: string}>}}
 */
export function auditContractDrift(studioRoot, contract = null) {
  const root = resolve(String(studioRoot));
  const known = new Set((contract ?? loadContract(root)).codes.map((c) => c.code));
  const phantom = [];
  for (const file of listSourceFiles(root, 2)) {
    const rel = file.slice(root.length + 1).split("\\").join("/");
    if (!/^scripts\//.test(rel) || /rules\.json|slop\.json|quotas\.json|copy\.json/.test(rel)) continue;
    const text = readTextIfExists(file);
    if (!text) continue;
    for (const match of text.matchAll(/["'`]([A-ZА-Я]{1,2}-\d{2})["'`]/g)) {
      const code = match[1];
      if (code.startsWith("К-") || known.has(code)) continue;
      phantom.push({ code, source: rel });
    }
  }
  const seen = new Set();
  const uniquePhantom = phantom.filter((p) => (seen.has(p.code + p.source) ? false : (seen.add(p.code + p.source), true)));
  const contractValue = contract ?? loadContract(root);
  const unmapped = contractValue.laws.filter((law) => law.codes.length === 0 && law.humanOnly !== true).map((law) => ({ id: law.id, text: law.text.slice(0, 120) }));
  const humanLaws = contractValue.laws.filter((law) => law.codes.length === 0 && law.humanOnly === true).map((law) => law.id);
  return { ok: uniquePhantom.length === 0, phantom: uniquePhantom, unmapped, humanLaws };
}

export default { loadContract, renderContract, buildRepairPlan, auditContractDrift, evaluateCode, parseConstitution, parseCodeTable };
