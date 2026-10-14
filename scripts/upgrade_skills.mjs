#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/upgrade_skills.mjs
   Доводит скиллы студий до исполнимого состояния (К-04, К-11, §11 ТЗ).

   Проблема, которую решает скрипт: у веб-студии приёмы лежали памятками SKILL.md —
   их нельзя ни загрузить (core/loop-engine/skills.mjs ищет skill.yaml), ни проверить
   (нет шаблонов ролей и крючков), ни связать с кодами приёмки. У мини/мобильных студий
   скиллы загружаются, но крючки декоративны: они возвращают ctx, ничего не проверяя.

   Скрипт превращает каждый SKILL.md в полноценный приём:
     skill.yaml            метаданные + коды, которые приём закрывает, + evidence (проверяемые признаки)
     templates/*.j2        роли planner / coder / verifier / fixer — из правил самого приёма
     hooks/pre_execute.mjs объявляет цели приёма
     hooks/post_execute.mjs сканирует артефакт общим evidence-движком (core/vertical-kit)

   Текст шаблонов и метаданных берётся ИЗ SKILL.md: скрипт ничего не выдумывает, а раскладывает
   то, что студия уже написала, по исполнимой форме. Правки приёма вносятся в SKILL.md и
   переносятся сюда повторным запуском (или правятся прямо в skill.yaml — он источник для движка).

   Использование:
     node scripts/upgrade_skills.mjs                # все студии
     node scripts/upgrade_skills.mjs web_studio     # одна студия
     node scripts/upgrade_skills.mjs --check        # только отчёт: у каких приёмов нет исполнимой части
     node scripts/upgrade_skills.mjs --force        # перезаписать сгенерированные файлы

   Выход: 0 — у каждого приёма есть skill.yaml, 4 шаблона и 2 крючка; 1 — есть пробелы.
*/

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSimpleYaml } from "../core/loop-engine/config.mjs";
import { loadEvidence } from "../core/loop-engine/skill-evidence.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const VERTICALS = join(ROOT, "verticals");
const GENERATED = "сгенерировано scripts/upgrade_skills.mjs из SKILL.md — правь SKILL.md или skill.yaml";

/* ————————————————————— прикладные признаки приёмов ————————————————————— */

/**
 * Коды, которые приём закрывает, и проверяемые признаки (evidence).
 * Коды — из CONSTITUTION/rules.json студии; признаки — то, что можно проверить сканом.
 * Пустой forbid/require — нормально: приём остаётся процедурным (проверяет валидатор).
 */
/** Область скана по умолчанию: артефакт студии (deliverable), а не рабочие документы проекта. */
const DEFAULT_SCOPE = Object.freeze({
  web_studio: ["site/**/*.{html,css,js,mjs,json,txt,md}"],
  mini_apps: ["app/**/*.{html,css,js,mjs,json,md}"],
  mobile_apps: ["app/**/*.{json,js,mjs,ts,tsx,jsx,dart,swift,kt,md}"],
});

const EVIDENCE = Object.freeze({
  web_studio: {
    "poster-type": { codes: ["Q-04", "B-23"], require: ["font-size:\\s*clamp\\(|font-size:\\s*(8|9|1[0-2])vw", "overflow:\\s*(hidden|clip|auto)"], forbid: [] },
    "broken-grid": { codes: ["Q-03"], require: ["grid-template-columns|grid-template-areas"], forbid: ["transition:\\s*all"] },
    "scroll-story": { codes: ["V-05", "V-06", "Q-01"], require: ["position:\\s*sticky", "prefers-reduced-motion"], forbid: [] },
    "cinema-intro": { codes: ["V-06", "Q-01"], require: ["@keyframes"], forbid: ["transition:\\s*all"] },
    crop: { codes: ["Q-05"], require: ["object-fit:\\s*cover|object-position"], forbid: [] },
    "industrial-passport": { codes: ["V-05", "B-03", "B-05"], require: ["font-variant-numeric|monospace|tabular-nums"], forbid: ["backdrop-filter", "#6366f1", "#8b5cf6"] },
    "industrial-copy": { codes: ["C-02", "B-17", "B-21"], require: [], forbid: ["представляет собой", "индивидуальный подход", "высокое качество", "гарантируем 100"] },
    "case-storytelling": { codes: ["V-02", "C-08"], require: ["\\b\\d+\\s*(%|мес|мин|ч|шт|руб)"], forbid: ["в заключение", "подводя итог", "резюмируя"] },
    "comparison-matrix": { codes: ["V-19", "B-04"], require: ["<table|<thead|role=\"table\""], forbid: ["grid-cols-3"] },
    "proof-engine": { codes: ["B-15", "V-02"], require: ["alt=\"[^\"]+\""], forbid: ["нам доверяют", "trusted by", "\\d{3,}\\+\\s*клиент"] },
    "value-calculator": { codes: ["V-22", "B-25"], require: ["<input", "data-analytics-event"], forbid: [] },
    "interactive-data": { codes: ["V-19", "B-24"], require: ["<table", "overflow(-x)?:\\s*(auto|scroll)"], forbid: [] },
    "micro-interactions": { codes: ["B-18", "Q-02"], require: [":focus-visible"], forbid: ["transition:\\s*all"] },
    "ux-states": { codes: ["V-20", "B-20"], require: ["loading|skeleton|aria-busy"], forbid: [] },
    "contrast-states": { codes: ["B-19", "V-17"], require: ["color:\\s*var\\(|--[a-z-]+:"], forbid: [] },
    "content-fit": { codes: ["V-18"], require: ["min-width:\\s*0|overflow-wrap|hyphens", "overflow(-x)?:\\s*(clip|hidden|auto)"], forbid: [] },
    "frames-to-motion": { codes: ["Q-01", "V-06"], require: ["@keyframes"], forbid: [] },
    "usability-heuristics": { codes: ["V-21", "B-23"], require: ["<html\\s+lang=", "<a[^>]+href=\"#"], forbid: [] },
    forms: { codes: ["V-22", "V-25", "B-25"], require: ["<form", "name=\"[a-z-]+\"", "role=\"status\"|aria-live"], forbid: ["<form[^>]*onsubmit="] },
    "expert-copywriter": { codes: ["A-01", "A-02", "A-03", "A-05", "C-01", "C-02", "C-03", "N-01"], require: [], forbid: ["oaicite", "utm_source=chatgpt", "представляет собой", "важно отметить", "не просто .{1,60}, а "] },
    "ux-writing": { codes: ["B-18", "C-04", "B-08"], require: [], forbid: ["нажмите сюда", "узнать больше", "свяжитесь с нами"] },
    "webgpu-codevideo": { codes: ["V-06", "Q-01"], require: ["prefers-reduced-motion"], forbid: [] },
  },
  mini_apps: {
    "single-page-app": { codes: ["V-01", "V-02"], require: ["<html|<body", "addEventListener"], forbid: ["onclick=\"", "<script>alert"] },
    "a11y-pass": { codes: ["V-03", "V-11"], require: [":focus-visible", "<label|<button"], forbid: [] },
    "telegram-sdk": { codes: ["V-02", "V-03", "V-06"], require: ["telegram-web-app\\.js", "MainButton|BackButton"], forbid: ["window\\.location\\.href"] },
    payments: { codes: ["V-07", "V-15"], require: ["openInvoice|sendData", "createHmac|sha256"], forbid: ["https://pay\\."] },
    "viewport-adaptive": { codes: ["V-01", "V-05", "V-06"], require: ["env\\(safe-area-inset", "@media"], forbid: ["height:\\s*100vh(?!.*safe-area-inset)"] },
    "offline-worker": { codes: ["V-12", "V-13"], require: ["serviceWorker", "caches\\.|addAll"], forbid: [] },
    "usability-heuristics": { codes: ["V-22"], require: ["role=\"status\"|aria-live", "BackButton"], forbid: [] },
    conversion: { codes: ["V-20", "V-23"], require: ["MainButton\\.setText\\("], forbid: [] },
    "motion-pass": { codes: ["V-24"], require: ["prefers-reduced-motion"], forbid: ["transition:\\s*all"] },
    "expert-copywriter": { codes: ["A-01", "A-03", "C-01", "C-02"], require: [], forbid: ["oaicite", "utm_source=chatgpt", "представляет собой", "высокое качество"] },
  },
  mobile_apps: {
    "screen-composer": { codes: ["V-01", "V-04"], require: ["SafeArea|safeArea", "loading|empty|error|success"], forbid: [] },
    "a11y-pass": { codes: ["V-03", "V-08"], require: ["accessibilityLabel|semanticLabel|contentDescription"], forbid: [] },
    "nav-deeplinks": { codes: ["V-08", "V-09"], require: ["Navigation|Navigator|go_router|NavigationStack", "Linking|deepLink|universal"], forbid: [] },
    "offline-queue": { codes: ["V-07", "V-17"], require: ["NetInfo|connectivity|online", "queue|cache"], forbid: [] },
    "store-release": { codes: ["V-20"], require: ["1024|icon", "screenshot|6\\.5|5\\.5"], forbid: [] },
    "i18n-pass": { codes: ["V-14"], require: ["\\.json", "t\\(|\"ru\"|\"en\""], forbid: ["[а-яА-Я]{4,}\\s*</Text>"].filter(() => false) },
    "typography-pass": { codes: ["V-24"], require: ["fontSize|font_size"], forbid: ["fontSize:\\s*(9|10|11)\\b"] },
    "animation-pass": { codes: ["V-25"], require: ["Animated|AnimationController|withAnimation"], forbid: ["setTimeout\\([^)]{0,40},\\s*[5-9]\\d{3}"] },
    "usability-heuristics": { codes: ["V-23"], require: ["retry|Повторить|повторите"], forbid: [] },
    "expert-copywriter": { codes: ["A-01", "C-01", "C-02"], require: [], forbid: ["oaicite", "представляет собой", "высокое качество"] },
  },
});

/* ————————————————————— разбор SKILL.md ————————————————————— */

/**
 * Разбирает frontmatter приёма. Строгий YAML-парсер цеха может отказать на
 * многострочных описаниях (свёрнутые строки с отступом) — тогда читаем простым правилом
 * «ключ: значение», чтобы импорт приёма не падал из-за формата памятки.
 */
function parseFrontmatter(text) {
  try {
    const parsed = parseSimpleYaml(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ниже — мягкий разбор */
  }
  /** @type {Record<string,string>} */
  const meta = {};
  let key = null;
  for (const line of String(text).split("\n")) {
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (match) {
      key = match[1];
      meta[key] = match[2].replace(/^["']|["']$/g, "").trim();
    } else if (key && /^\s+\S/.test(line)) {
      meta[key] = `${meta[key]} ${line.trim()}`.trim();
    }
  }
  return meta;
}

/** Читает SKILL.md: frontmatter + секции (Правила / Пример / Частые ошибки / Проверка). */
export function parseSkillDoc(markdown) {
  const text = String(markdown ?? "");
  const front = /^---\n([\s\S]*?)\n---/.exec(text);
  const meta = front ? parseFrontmatter(front[1]) : {};
  const body = front ? text.slice(front[0].length) : text;

  /** @type {Record<string, string[]>} */
  const sections = {};
  let current = "intro";
  for (const rawLine of body.split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(rawLine);
    if (heading) {
      current = heading[1].toLowerCase();
      sections[current] = sections[current] ?? [];
      continue;
    }
    sections[current] = sections[current] ?? [];
    sections[current].push(rawLine);
  }

  const clean = (lines) => lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const rules = clean(sections["правила"] ?? [])
    .filter((l) => /^(\d+\.|[-*])\s+/.test(l))
    .map((l) => l.replace(/^(\d+\.|[-*])\s+/, "").replace(/\*\*/g, "").replace(/`/g, "").trim());
  const mistakes = clean(sections["частые ошибки"] ?? [])
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").trim());
  const example = clean(sections["пример"] ?? []).join(" ").trim();
  const checks = clean(sections["проверка"] ?? []).join(" ").trim();
  const intro = clean(sections.intro ?? []).join(" ").trim();

  // коды, упомянутые в документе (V-xx/B-xx/Q-xx/A-xx/C-xx/N-xx)
  const codes = [...new Set((text.match(/\b[VBNQACR]-\d{2}\b/g) ?? []).map(String))];
  const skillId = /SK-(\d{1,2})/.exec(text)?.[0] ?? null;
  const refs = [...new Set((text.match(/REF-\d{2}/g) ?? []).map(String))];

  return { meta, rules, mistakes, example, checks, intro, codes, skillId, refs, body };
}

/* ————————————————————— генерация файлов ————————————————————— */

/** Экранирует фигурные скобки шаблонизатора: текст приёма — не шаблон. */
function safe(text) {
  return String(text ?? "").replace(/\{\{/g, "{ {").replace(/\{%/g, "{ %").replace(/#\}/g, "# }");
}

function yamlList(items, indent = "  ") {
  return items.map((item) => `${indent}- "${String(item).replace(/"/g, '\\"').slice(0, 220)}"`).join("\n");
}

function buildSkillYaml(skillName, doc, evidence, vertical) {
  const title = doc.meta.name && !/^[a-z-]+$/.test(doc.meta.name) ? doc.meta.name : humanTitle(skillName);
  const description = doc.meta.description ?? doc.intro.split(/(?<=\.)\s/)[0] ?? title;
  const when = doc.meta.when ?? description;
  const codes = [...new Set([...(doc.codes ?? []), ...(evidence.codes ?? [])])].sort();
  const steps = doc.rules.length > 0 ? doc.rules : [`Применить приём «${skillName}» по правилам студии`];
  return `# ${GENERATED}
name: ${skillName}
${doc.skillId ? `id: ${doc.skillId}\n` : ""}title: "${String(title).replace(/"/g, '\\"')}"
description: "${String(description).replace(/"/g, '\\"').slice(0, 400)}"
when: "${String(when).replace(/"/g, '\\"').slice(0, 300)}"
vertical: ${vertical}
${doc.refs && doc.refs.length > 0 ? `source: ${doc.refs[0]}\n` : ""}takeaway: "${String(doc.example || description).replace(/\s+/g, " ").replace(/"/g, '\\"').slice(0, 280)}"
inputs:
  - brief
  - deliverable
outputs:
  - deliverable
steps:
${yamlList(steps)}
codes:
${codes.length > 0 ? yamlList(codes) : '  - "—"'}
evidence:
  require:
${evidence.require && evidence.require.length > 0 ? yamlList(evidence.require, "    ") : '    - "—"'}
  forbid:
${evidence.forbid && evidence.forbid.length > 0 ? yamlList(evidence.forbid, "    ") : '    - "—"'}
  files:
${yamlList(scopeOf(vertical, skillName), "    ")}
checks:
${yamlList(["машинные коды: " + (codes.join(", ") || "нет"), "evidence: post_execute.mjs", "ворота G3: валидатор студии"])}
applies_to:
  - ${vertical}
`;
}

/** Область скана приёма: явная из карты evidence либо общая для студии (deliverable). */
function scopeOf(vertical, skillName) {
  const own = EVIDENCE[vertical]?.[skillName]?.scope;
  if (Array.isArray(own) && own.length > 0) return own;
  return DEFAULT_SCOPE[vertical] ?? ["**/*"];
}

function humanTitle(id) {
  const words = String(id).split("-");
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildPlanner(doc, skillName) {
  return `{# Планировщик · приём «${skillName}» · ${GENERATED} #}
Планируя работу над проектом {{ project_name }} (итерация {{ iteration }}), реши ЧТО именно делает приём «${skillName}».

Задание: {{ task }}

Правила приёма (из SKILL.md студии):
${safe(doc.rules.map((r, i) => `${i + 1}) ${r}`).join("\n")) || "1) Применить приём по его описанию."}

${doc.example ? `Образец применения в студии:\n${safe(doc.example)}` : ""}
${doc.mistakes.length > 0 ? `Не повторяй типовые промахи:\n${safe(doc.mistakes.map((m) => `- ${m}`).join("\n"))}` : ""}

Ответ плана — коротко: какие файлы меняются, какой из пунктов правил закрывает каждый файл,
какими кодами приёмки приём будет проверяться. Без кода в ответе плана.
`;
}

function buildCoder(doc, skillName, evidence) {
  return `{# Кодер · приём «${skillName}» · ${GENERATED} #}
Реализуй приём «${skillName}» в {{ deliverable }} по правилам студии. Ничего лишнего: только то, что требуют правила.

Правила (обязательны к исполнению):
${safe(doc.rules.map((r, i) => `${i + 1}) ${r}`).join("\n")) || "1) Применить приём по его описанию."}

${doc.example ? `Как это выглядит в студии:\n${safe(doc.example)}` : ""}
${evidence?.require?.length ? `Признаки, которые найдут в артефакте проверяющие:\n${evidence.require.map((r) => `- /${r}/`).join("\n")}` : ""}
${evidence?.forbid?.length ? `Запрещено (поймает evidence-скан):\n${evidence.forbid.map((r) => `- /${r}/`).join("\n")}` : ""}

Выдай файл(ы) целиком.
`;
}

function buildVerifier(doc, skillName, evidence) {
  return `{# Проверяющий · приём «${skillName}» · ${GENERATED} #}
Проверь артефакт проекта {{ project_name }} на соответствие приёму «${skillName}» и верни находки списком.

Чек-лист (частые промахи этого приёма):
${safe(doc.mistakes.map((m) => `- ${m}`).join("\n")) || "- нет описанных промахов"}

${doc.rules.length ? `Каждый пункт правил проверяй отдельно:\n${safe(doc.rules.map((r, i) => `${i + 1}) ${r}`).join("\n"))}` : ""}
${evidence?.require?.length ? `Обязательные признаки: ${evidence.require.map((r) => `/${r}/`).join(", ")}` : ""}
${evidence?.forbid?.length ? `Запрещённые признаки: ${evidence.forbid.map((r) => `/${r}/`).join(", ")}` : ""}

Формат ответа: по строке на находку — «файл · что нарушено · как исправить». Если нарушений нет, ответь: чисто.
`;
}

function buildFixer(doc, skillName, evidence) {
  return `{# Фиксер · приём «${skillName}» · ${GENERATED} #}
Правь артефакт точечно: только пункты, названные проверяющим (К-10 — правки по кодам, а не перезапуск).

${"{{"} feedback_text {{"}}"}}

Правила приёма, которым артефакт не соответствовал:
${safe(doc.rules.map((r, i) => `${i + 1}) ${r}`).join("\n")) || "—"}
${doc.mistakes.length ? `\nНе повторяй промахи:\n${safe(doc.mistakes.map((m) => `- ${m}`).join("\n"))}` : ""}
${evidence?.forbid?.length ? `\nУбери запрещённое:\n${evidence.forbid.map((r) => `- /${r}/`).join("\n")}` : ""}

Выдай исправленный артефакт целиком.
`;
}

const HOOK_PRE = `/* Крючок перед исполнением приёма: объявляет цели и коды приёмки.
   ${GENERATED} */
import { preExecute } from "../../../../core/vertical-kit/skill-evidence.mjs";

export default preExecute;
`;

function hookPre(vertical) {
  // hooks/ → <skill>/ → skills/ → <вертикаль>/ → verticals/ → корень
  return `/* Крючок перед исполнением приёма: объявляет цели и коды приёмки.
   ${GENERATED} */
import { preExecute } from "../../../../../core/loop-engine/skill-evidence.mjs";

export default preExecute;
`;
}

const HOOK_POST = `/* Крючок после исполнения приёма: evidence-скан артефакта (require/forbid из skill.yaml).
   ${GENERATED} */
import { postExecute } from "../../../../../core/loop-engine/skill-evidence.mjs";

export default postExecute;
`;

/* ————————————————————— применение ————————————————————— */

function listSkillDirs(studioDir) {
  const dir = join(studioDir, "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith("_") && !name.startsWith(".") && name !== "SKILL-INDEX.md")
    .map((name) => join(dir, name))
    .filter((abs) => statSync(abs).isDirectory())
    .sort();
}

/** Приводит один приём к исполнимой форме. Возвращает список записанных файлов. */
function upgradeSkill(vertical, skillDir, { force = false, dryRun = false } = {}) {
  const name = basename(skillDir);
  const mdPath = join(skillDir, "SKILL.md");
  const markdown = existsSync(mdPath) ? readFileSync(mdPath, "utf8") : "";
  const doc = parseSkillDoc(markdown);
  const evidence = EVIDENCE[vertical]?.[name] ?? { codes: [], require: [], forbid: [] };
  const written = [];

  const write = (rel, content, { keepExisting = true } = {}) => {
    const abs = join(skillDir, rel);
    if (!dryRun) {
      mkdirSync(dirname(abs), { recursive: true });
      const exists = existsSync(abs);
      if (exists && keepExisting && !force) {
        const current = readFileSync(abs, "utf8");
        // свои (не сгенерированные) файлы не трогаем: правки человека важнее генератора
        if (!current.includes("scripts/upgrade_skills.mjs")) return false;
      }
      writeFileSync(abs, content.endsWith("\n") ? content : `${content}\n`, "utf8");
    }
    written.push(rel);
    return true;
  };

  // skill.yaml: у веб-студии его не было; у мини/мобильных — обогащаем кодами и evidence
  const absYaml = join(skillDir, "skill.yaml");
  const hasYaml = existsSync(absYaml);
  if (!hasYaml) {
    write("skill.yaml", buildSkillYaml(name, doc, evidence, vertical));
  } else {
    const current = readFileSync(absYaml, "utf8");
    // Сгенерированный skill.yaml ведётся картой EVIDENCE: иначе исправленный признак
    // остался бы в файле старым и приём продолжал бы «находить» нарушение в корректном артефакте.
    const authoritative = current.includes("scripts/upgrade_skills.mjs");
    const enriched = enrichSkillYaml(current, doc, evidence, scopeOf(vertical, name), { authoritative });
    if (enriched !== current) write("skill.yaml", enriched, { keepExisting: false });
  }

  write("templates/planner.j2", buildPlanner(doc, name));
  write("templates/coder.j2", buildCoder(doc, name, evidence));
  write("templates/verifier.j2", buildVerifier(doc, name, evidence));
  write("templates/fixer.j2", buildFixer(doc, name, evidence));
  write("hooks/pre_execute.mjs", hookPre(vertical));
  write("hooks/post_execute.mjs", HOOK_POST);

  return { name, written, codes: evidence.codes ?? [], rules: doc.rules.length, mistakes: doc.mistakes.length };
}

/** Дополняет существующий skill.yaml: коды, evidence, область скана, промахи (чего нет). */
export function enrichSkillYaml(yamlText, doc, evidence, scope = [], { authoritative = false } = {}) {
  let text = String(yamlText);
  const has = (key) => new RegExp(`^${key}:`, "m").test(text);
  const filesBlock = `  files:\n${yamlList(scope, "    ")}\n`;

  if (!has("codes") && (evidence.codes?.length || (doc.codes ?? []).length)) {
    const codes = [...new Set([...(doc.codes ?? []), ...(evidence.codes ?? [])])].sort();
    text = `${text.replace(/\n*$/, "\n")}codes:\n${yamlList(codes)}\n`;
  }
  if (!has("evidence") || authoritative) {
    const require = evidence.require?.length ? yamlList(evidence.require, "    ") : '    - "—"';
    const forbid = evidence.forbid?.length ? yamlList(evidence.forbid, "    ") : '    - "—"';
    const block = `evidence:\n  require:\n${require}\n  forbid:\n${forbid}\n${filesBlock}`;
    if (has("evidence")) {
      // вырезаем прежний блок целиком: от `evidence:` до следующего ключа верхнего уровня
      const lines = text.split("\n");
      const start = lines.findIndex((line) => /^evidence:\s*$/.test(line));
      let end = start + 1;
      while (end < lines.length && !/^\S/.test(lines[end])) end += 1;
      text = [...lines.slice(0, start), ...block.trimEnd().split("\n"), ...lines.slice(end)].join("\n");
    } else {
      text = `${text.replace(/\n*$/, "\n")}${block}`;
    }
  } else if (scope.length > 0 && /^\s*files:\s*\[\]\s*$/m.test(text)) {
    // область скана — данные: пустой список означает «весь проект», приём называет свою часть
    text = text.replace(/^\s*files:\s*\[\]\s*$/m, filesBlock.trimEnd());
  }
  if (doc.mistakes.length > 0 && !has("mistakes")) {
    text = `${text.replace(/\n*$/, "\n")}mistakes:\n${yamlList(doc.mistakes)}\n`;
  }
  return text;
}

/** Пересобирает SKILL-INDEX.md студии: id, назначение, коды, состав исполнимой части. */
function rebuildSkillIndex(vertical, studioDir, rows) {
  const path = join(studioDir, "skills", "SKILL-INDEX.md");
  const title = existsSync(join(studioDir, "vertical.yaml"))
    ? (parseSimpleYaml(readFileSync(join(studioDir, "vertical.yaml"), "utf8"))?.metadata?.displayName ?? vertical)
    : vertical;
  const lines = [
    `# SKILL-INDEX — реестр приёмов студии «${title}»`,
    "",
    "Один приём = директория `skills/<id>/` с исполнимой частью:",
    "`skill.yaml` (метаданные, коды приёмки, evidence) · `templates/{planner,coder,verifier,fixer}.j2`",
    "(роли цикла) · `hooks/{pre_execute,post_execute}.mjs` (объявление целей и evidence-скан).",
    "",
    "Загрузчик — `core/loop-engine/skills.mjs`; проверка признаков — `core/vertical-kit/skill-evidence.mjs`;",
    "связь «статья закона ↔ код ↔ приём» собирает `core/loop-engine/contract.mjs`.",
    "",
    "| Приём | id | Что делает | Коды приёмки | Ролей | Крючков |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows.sort((a, b) => a.name.localeCompare(b.name, "ru"))) {
    const desc = String(row.description ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 160);
    const codes = (row.codes ?? []).join(", ") || "—";
    const templates = row.templates ?? 0;
    const hooks = row.hooks ?? 0;
    lines.push(`| \`${row.name}\` | ${row.skillId ?? "—"} | ${desc} | ${codes} | ${templates} | ${hooks} |`);
  }
  lines.push("");
  lines.push(`Всего приёмов: ${rows.length}. Обновлено: ${new Date().toISOString().slice(0, 10)} (scripts/upgrade_skills.mjs).`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
  return path;
}

/* ————————————————————— CLI ————————————————————— */

function studioDirs(only) {
  if (only) {
    const dir = join(VERTICALS, only);
    if (!existsSync(dir)) throw new Error(`студия не найдена: ${only}`);
    return [dir];
  }
  return readdirSync(VERTICALS)
    .filter((n) => !n.startsWith("_") && !n.startsWith("."))
    .map((n) => join(VERTICALS, n))
    .filter((d) => statSync(d).isDirectory())
    .sort();
}

function checkStudio(studioDir) {
  /** @type {any[]} */
  const problems = [];
  for (const skillDir of listSkillDirs(studioDir)) {
    const name = basename(skillDir);
    const need = ["skill.yaml", "templates/planner.j2", "templates/coder.j2", "templates/verifier.j2", "templates/fixer.j2", "hooks/pre_execute.mjs", "hooks/post_execute.mjs"];
    const missing = need.filter((rel) => !existsSync(join(skillDir, rel)));
    if (missing.length > 0) problems.push({ name, missing });
  }
  return problems;
}

function main(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const only = args[0] ?? null;
  const check = flags.has("--check");
  const force = flags.has("--force");

  let ok = true;
  for (const studioDir of studioDirs(only)) {
    const vertical = basename(studioDir);
    const skillDirs = listSkillDirs(studioDir);
    if (skillDirs.length === 0) {
      process.stdout.write(`[${vertical}] приёмов нет\n`);
      continue;
    }
    if (check) {
      const problems = checkStudio(studioDir);
      process.stdout.write(`[${vertical}] приёмов ${skillDirs.length} · без исполнимой части: ${problems.length}\n`);
      for (const p of problems) process.stdout.write(`   ${p.name}: нет ${p.missing.join(", ")}\n`);
      if (problems.length > 0) ok = false;
      continue;
    }
    /** @type {any[]} */
    const rows = [];
    let written = 0;
    for (const skillDir of skillDirs) {
      const res = upgradeSkill(vertical, skillDir, { force });
      written += res.written.length;
      const doc = parseSkillDoc(existsSync(join(skillDir, "SKILL.md")) ? readFileSync(join(skillDir, "SKILL.md"), "utf8") : "");
      rows.push({
        name: res.name,
        skillId: doc.skillId,
        description: doc.meta.description ?? doc.intro,
        codes: res.codes,
        templates: 4,
        hooks: 2,
      });
    }
    const indexPath = rebuildSkillIndex(vertical, studioDir, rows);
    process.stdout.write(`[${vertical}] приёмов ${skillDirs.length} · файлов записано ${written} · реестр ${indexPath.slice(ROOT.length + 1)}\n`);
    const problems = checkStudio(studioDir);
    if (problems.length > 0) {
      ok = false;
      for (const p of problems) process.stdout.write(`   ${p.name}: нет ${p.missing.join(", ")}\n`);
    }
  }
  process.stdout.write(ok ? "ИТОГ: каждый приём загружаем, проверяем и связан с кодами · exit 0\n" : "ИТОГ: есть пробелы · exit 1\n");
  return ok ? 0 : 1;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { main, parseSkillDoc, enrichSkillYaml, upgradeSkill };
