/* ЦЕХ · Метаплатформа — core/vertical-kit/index.mjs
   Общий инструментарий вертикалей: единый формат отчёта приёмки и декларативный набор
   правил. Нужен, чтобы у всех студий был ОДИН контракт вывода (§6, §15 ТЗ: ядро разбирает
   строки «OK/FAIL V-xx …» и «файл:строка B-xx …»), а сами правила оставались данными
   студии (§8: декларативные конфигурации).

   Публичный API:
     projectDirFromArgv()          — каталог проекта из argv (якорь приёмки)
     runVerticalChecks(name, list) — печать отчёта + exit code
     runSpec(name, rulesUrl)       — исполнить декларативные правила из rules.json
     runSlopSpec(name, slopUrl)    — исполнить запреты из slop.json
     runCopyLint(name, copyUrl)    — проверить текст на следы ИИ (copy.json)
*/

import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { analyzeText, SOFT_CODES } from "./copywriting.mjs";

/** Каталог проекта: первым аргументом приходит «projects/<имя>» (относительно cwd студии). */
export function projectDirFromArgv(argv = process.argv.slice(2)) {
  return resolve(process.cwd(), String(argv[0] ?? "."));
}

/** Печатает строки приёмки и выставляет exit code. Возвращает true, если всё зелёное. */
export function runVerticalChecks(vertical, checks) {
  const rows = [];
  for (const check of checks) {
    let res;
    try {
      res = check.run();
    } catch (error) {
      res = { ok: false, detail: String(error?.message ?? error) };
    }
    const obj = res !== null && typeof res === "object";
    const ok = obj ? Boolean(res.ok) : Boolean(res);
    const detail = (obj ? String(res.detail ?? "") : "").trim() || (ok ? "выполнено" : "не выполнено");
    rows.push({ code: String(check.code), title: String(check.title), ok, detail });
  }
  const passed = rows.filter((r) => r.ok).length;
  const lines = rows.map((r) => `${r.ok ? "OK " : "FAIL"} ${r.code} ${r.title} · ${r.detail}`);
  lines.push("─".repeat(48));
  lines.push(`ИТОГ: ${passed}/${rows.length} · exit ${passed === rows.length ? 0 : 1}`);
  process.stdout.write(`${vertical ? `${vertical} · приёмка\n` : ""}${lines.join("\n")}\n`);
  process.exitCode = passed === rows.length ? 0 : 1;
  return passed === rows.length;
}

/** Исполняет декларативные правила из rules.json и печатает отчёт. */
export function runSpec(vertical, rulesUrl) {
  const spec = JSON.parse(readFileSync(rulesUrl, "utf8"));
  const dir = projectDirFromArgv();
  const checks = spec.rules.map((rule) => ({
    code: rule.code,
    title: rule.title,
    run: () => {
      const ok = evalRule(dir, rule);
      return { ok, detail: ok ? String(rule.ok ?? "выполнено") : String(rule.fail ?? "не выполнено") };
    },
  }));
  return runVerticalChecks(vertical, checks);
}

/** Исполняет запреты из slop.json (анти-слоп студии). Строки формата «файл:строка B-xx …». */
export function runSlopSpec(vertical, slopUrl) {
  const spec = JSON.parse(readFileSync(slopUrl, "utf8"));
  const root = projectDirFromArgv();
  if (!existsSync(root)) {
    process.stdout.write("чисто: каталог проекта недоступен\n");
    process.exitCode = 0;
    return true;
  }
  const files = collectFiles(root, spec.scan ?? ["."], spec.extensions ?? [".md", ".html", ".js", ".mjs", ".css", ".json", ".sql"]);
  const hits = [];
  for (const file of files) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const rule of spec.rules) {
        if (new RegExp(rule.pattern).test(line)) hits.push(`${relative(root, file)}:${i + 1} ${rule.code} «${rule.message}»`);
      }
    });
  }
  if (hits.length === 0) {
    process.stdout.write(`${vertical ? `${vertical} · ` : ""}чисто: ${files.length} файлов\n`);
    process.exitCode = 0;
    return true;
  }
  process.stdout.write(`${[...new Set(hits)].join("\n")}\n`);
  process.exitCode = 1;
  return false;
}

/** Проверяет прозу проекта на следы ИИ (движок copywriting.mjs). Спецификация — copy.json.
 *  Ошибки (артефакты копипаста) печатаются как «файл:строка A-xx …» и блокируют приёмку;
 *  стилевые замечания идут только в сводку «[lint-copy] …» (ядро такие строки игнорирует). */
export function runCopyLint(vertical, copyUrl, { strict = false } = {}) {
  const spec = JSON.parse(readFileSync(copyUrl, "utf8"));
  const root = projectDirFromArgv();
  if (!existsSync(root)) {
    process.stdout.write("[lint-copy] каталог проекта недоступен\n");
    process.exitCode = 0;
    return { ok: true, errors: [], warnings: [], files: 0, score: 100 };
  }
  const files = collectFiles(root, spec.scan ?? ["."], spec.extensions ?? [".md", ".html", ".js", ".mjs", ".css", ".json"]);
  const errors = [];
  const warnings = [];
  const PROSE = /\.(?:html?|xhtml|md|markdown|txt)$/i;
  for (const file of files) {
    // ритм (R-01/R-02) меряем только на прозе: в .js/.css/.json прозы нет — будут ложные срабатывания
    const res = analyzeText(readFileSync(file, "utf8"), { genre: spec.genre, rhythm: PROSE.test(file) });
    const rel = relative(root, file);
    for (const f of res.findings) (f.severity === "error" ? errors : warnings).push({ file: rel, ...f });
  }

  const maxWarnings = strict ? 0 : (spec.maxWarnings ?? Infinity);
  const ok = errors.length === 0 && warnings.length <= maxWarnings;

  // печатаем ТОЛЬКО ошибки код-строками: любая код-строка для ядра = провал проверки
  for (const e of errors) {
    const tail = e.quote ? ` — ${e.quote}` : "";
    process.stdout.write(`${e.file}:${e.line} ${e.code} «${e.message}${tail}»\n`);
  }
  // мягкие маркеры (C-13/R-01/R-02) показываются, но не понижают балл
  const hardWarnings = warnings.filter((w) => !SOFT_CODES.includes(w.code)).length;
  const score = Math.max(0, Math.min(100, 100 - 12 * errors.length - 3 * hardWarnings));
  const tags = [...new Set(warnings.map((w) => w.code))].sort();
  process.stdout.write(
    `[lint-copy] ${ok ? "чисто" : "нарушения"}: файлов ${files.length}, ` +
      `ошибок ${errors.length}, замечаний стиля ${warnings.length}${tags.length ? ` (${tags.join(", ")})` : ""}, балл ${score}\n`,
  );
  process.exitCode = ok ? 0 : 1;
  return { ok, errors, warnings, files: files.length, score };
}

/* ————————————————————————— декларативные правила ————————————————————————— */

/** @param {string} projectDir @param {Record<string, any>} rule */
export function evalRule(projectDir, rule) {
  const at = (rel) => join(projectDir, String(rel));
  const read = (rel) => {
    try {
      return readFileSync(at(rel), "utf8");
    } catch {
      return null;
    }
  };
  const count = (text, pattern) => (String(text).match(new RegExp(pattern, "gm")) ?? []).length;

  switch (rule.kind) {
    case "fileExists":
      return existsSync(at(rule.path));
    case "filesExist":
      return (rule.paths ?? []).every((p) => existsSync(at(p)));
    case "minWords": {
      const text = read(rule.path);
      return text !== null && text.split(/\s+/).filter(Boolean).length >= Number(rule.min ?? 1);
    }
    case "regexAtLeast": {
      const text = read(rule.path);
      return text !== null && count(text, rule.pattern) >= Number(rule.min ?? 1);
    }
    case "regexAbsent": {
      const text = read(rule.path);
      return text !== null && !new RegExp(rule.pattern, "m").test(text);
    }
    case "textHasAll": {
      const text = read(rule.path);
      return text !== null && (rule.patterns ?? []).every((p) => new RegExp(p, "m").test(text));
    }
    case "jsonHas": {
      const text = read(rule.path);
      if (text === null) return false;
      try {
        const data = JSON.parse(text);
        return (rule.keys ?? []).every((key) => hasPath(data, key));
      } catch {
        return false;
      }
    }
    case "sentencesMaxWords": {
      const text = read(rule.path);
      if (text === null) return false;
      const sentences = String(text)
        .replace(/\n+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.split(/\s+/).filter(Boolean).length)
        .filter((n) => n > 0);
      return sentences.length > 0 && sentences.every((n) => n <= Number(rule.max ?? 40));
    }
    case "regexCount": {
      const text = read(rule.path);
      if (text === null) return false;
      const n = count(text, rule.pattern);
      const min = rule.min === undefined ? 0 : Number(rule.min);
      const max = rule.max === undefined ? Infinity : Number(rule.max);
      return n >= min && n <= max;
    }
    case "regexAtMost": {
      const text = read(rule.path);
      return text !== null && count(text, rule.pattern) <= Number(rule.max ?? 0);
    }
    case "jsonStringLength": {
      const text = read(rule.path);
      if (text === null) return false;
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return false;
      }
      return (rule.fields ?? []).every((field) => {
        let cur = data;
        for (const part of String(field.key).split(".")) {
          if (cur === null || typeof cur !== "object" || !(part in cur)) return false;
          cur = cur[part];
        }
        if (typeof cur !== "string") return false;
        return cur.length >= Number(field.min ?? 0) && cur.length <= Number(field.max ?? Infinity);
      });
    }
    case "keywordDensity": {
      const text = read(rule.path);
      if (text === null) return false;
      const lower = String(text).toLowerCase();
      const keyword = String(rule.keyword ?? "").toLowerCase().trim();
      if (!keyword) return false;
      const words = lower.split(/\s+/).filter(Boolean).length;
      if (words === 0) return false;
      const hits = lower.split(keyword).length - 1;
      const pct = (hits / words) * 100;
      return pct >= Number(rule.min ?? 0) && pct <= Number(rule.max ?? 100);
    }
    case "linesMatchAtLeast": {
      const text = read(rule.path);
      if (text === null) return false;
      const n = String(text)
        .split("\n")
        .filter((line) => new RegExp(rule.pattern).test(line)).length;
      return n >= Number(rule.min ?? 1);
    }
    case "anyOf": {
      return (rule.rules ?? []).some((sub) => evalRule(projectDir, sub));
    }
    case "allOf": {
      return (rule.rules ?? []).every((sub) => evalRule(projectDir, sub));
    }
    case "textHasAny": {
      const text = read(rule.path);
      return text !== null && (rule.patterns ?? []).some((p) => new RegExp(p, "m").test(text));
    }
    case "headingCount": {
      const text = read(rule.path);
      if (text === null) return false;
      const level = Number(rule.level ?? 1);
      const n = String(text)
        .split("\n")
        .filter((line) => new RegExp(`^#{${level}}\\s+\\S`).test(line)).length;
      return n >= Number(rule.min ?? 0) && n <= Number(rule.max ?? Infinity);
    }
    case "jsonKeysParity": {
      // Локали описывают один и тот же набор строк: наборы ключей обязаны совпадать.
      // Разошедшиеся ключи — это непереведённый экран, который видно только в одном языке.
      const sets = (rule.paths ?? []).map((rel) => {
        const data = readJson(read(rel));
        return data && typeof data === "object" && !Array.isArray(data) ? new Set(Object.keys(data)) : null;
      });
      if (sets.some((set) => set === null)) return false;
      const [base, ...rest] = sets;
      return rest.every((set) => set.size === base.size && [...set].every((key) => base.has(key)));
    }
    case "jsonArrayMinItems": {
      const data = readJson(read(rule.path));
      const arr = data === null ? null : getPath(data, rule.key);
      return Array.isArray(arr) && arr.length >= Number(rule.min ?? 1);
    }
    case "jsonArrayEveryHas": {
      const data = readJson(read(rule.path));
      const arr = data === null ? null : getPath(data, rule.key);
      if (!Array.isArray(arr) || arr.length === 0) return false;
      return arr.every((item) => (rule.fields ?? []).every((f) => hasPath(item, f)));
    }
    case "jsonArrayEveryMinItems": {
      const data = readJson(read(rule.path));
      const arr = data === null ? null : getPath(data, rule.key);
      if (!Array.isArray(arr) || arr.length === 0) return false;
      return arr.every((item) => {
        const value = item && typeof item === "object" ? item[rule.field] : undefined;
        return Array.isArray(value) && value.length >= Number(rule.min ?? 1);
      });
    }
    case "jsonArrayFieldPatterns": {
      // каждый элемент массива rule.key обязан содержать rule.name с текстом, покрывающим все patterns
      const data = readJson(read(rule.path));
      const arr = data === null ? null : getPath(data, rule.key);
      if (!Array.isArray(arr) || arr.length === 0) return false;
      return arr.every((item) => {
        const text = item && typeof item === "object" ? String(item[rule.name] ?? "") : "";
        return (rule.patterns ?? []).every((p) => new RegExp(p, "m").test(text));
      });
    }
    case "uniqueShingles": {
      // доля уникальных шинглов (окно size слов) — прокси уникальности текста (V-01 контент-студии)
      const text = read(rule.path);
      if (text === null) return false;
      const words = String(text).toLowerCase().split(/\s+/).filter(Boolean);
      const size = Number(rule.size ?? 5);
      if (words.length < size) return false;
      const seen = new Set();
      let total = 0;
      for (let i = 0; i + size <= words.length; i += 1) {
        seen.add(words.slice(i, i + size).join(" "));
        total += 1;
      }
      return total > 0 && seen.size / total >= Number(rule.min ?? 0.9);
    }
    case "readabilityMin": {
      // адаптированный Flesch Reading Ease (рус.): 206.835 − 1.3·ASL − 60.1·ASW.
      // Читаемость считается по ПРОЗЕ: заголовки, ссылки, картинки, HTML и сноски
      // (разметка) отбрасываются — иначе длина URL/тегов занижает балл.
      const text = read(rule.path);
      if (text === null) return false;
      const prose = String(text)
        .split("\n")
        .filter((line) => !/^\s*#/.test(line))
        .filter((line) => !/https?:\/\/|!\[|\]\(|<[a-z/]|\[\^/.test(line))
        .join(" ");
      const sentences = prose
        .split(/[.!?…]+/)
        .map((s) => s.trim())
        .filter((s) => s.split(/\s+/).filter(Boolean).length > 1);
      const words = prose.split(/[^\p{L}\p{N}]+/u).filter((w) => /[а-яё]/i.test(w));
      if (sentences.length === 0 || words.length === 0) return false;
      const asl = words.length / sentences.length;
      const syllables = words.reduce((sum, w) => sum + countRuSyllables(w), 0);
      const asw = syllables / words.length;
      const score = 206.835 - 1.3 * asl - 60.1 * asw;
      return score >= Number(rule.min ?? 60);
    }
    case "innChecksum": {
      const text = read(rule.path);
      if (text === null) return false;
      const candidates = [...String(text).matchAll(/(?<!\d)(\d{10}|\d{12})(?!\d)/g)].map((m) => m[1]);
      const valid = candidates.filter(isValidInn);
      return valid.length >= Number(rule.min ?? 1);
    }
    case "ogrnChecksum": {
      const text = read(rule.path);
      if (text === null) return false;
      const candidates = [...String(text).matchAll(/(?<!\d)(\d{13}|\d{15})(?!\d)/g)].map((m) => m[1]);
      const valid = candidates.filter(isValidOgrn);
      return valid.length >= Number(rule.min ?? 1);
    }
    case "implies": {
      // условное правило: если в тексте есть if-pattern, обязаны присутствовать все then-patterns
      const text = read(rule.path);
      if (text === null) return false;
      if (!new RegExp(rule.if, "m").test(text)) return true;
      return (rule.then ?? []).every((p) => new RegExp(p, "m").test(text));
    }
    case "balancedDelimiters": {
      // баланс скобок (после снятия строк и комментариев) — прокси SQL-парсера (V-01 data)
      const text = read(rule.path);
      if (text === null) return false;
      const stripped = String(text)
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/--[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      return (rule.pairs ?? [["(", ")"]]).every(([open, close]) => {
        let depth = 0;
        for (const ch of stripped) {
          if (ch === open) depth += 1;
          else if (ch === close) {
            depth -= 1;
            if (depth < 0) return false;
          }
        }
        return depth === 0;
      });
    }
    case "planExecutionTimeUnder": {
      // максимум времени из EXPLAIN ANALYZE («Execution Time: N ms») ≤ бюджета (V-13 data)
      const text = read(rule.path);
      if (text === null) return false;
      const m = String(text).match(/Execution Time:\s*([\d.]+)\s*ms/);
      return m !== null && Number(m[1]) <= Number(rule.maxMs ?? Infinity);
    }
    case "jsonNumberMax": {
      const data = readJson(read(rule.path));
      const value = data === null ? undefined : getPath(data, rule.key);
      return typeof value === "number" && value <= Number(rule.max ?? Infinity);
    }
    case "jsonNumberMin": {
      const data = readJson(read(rule.path));
      const value = data === null ? undefined : getPath(data, rule.key);
      return typeof value === "number" && value >= Number(rule.min ?? -Infinity);
    }
    case "uniqueNumbering": {
      // нет дублей нумерации пунктов «N.M» и их не меньше min (К-04 legal: cross-reference)
      const text = read(rule.path);
      if (text === null) return false;
      const pattern = rule.linePattern ?? String.raw`^\s*(\d+\.\d+)`;
      const nums = String(text)
        .split("\n")
        .map((line) => line.match(new RegExp(pattern)))
        .filter(Boolean)
        .map((m) => m[1]);
      if (nums.length < Number(rule.min ?? 1)) return false;
      return new Set(nums).size === nums.length;
    }
    case "themeContrast": {
      // WCAG AA (C-COMMON-03): все пары текст/фон в каждой теме обязаны проходить порог
      // контраста. Таблица токенов — app/theme.json: { themes: { light: {...}, dark: {...} },
      // contrast: [ { fg, bg, min? } ] }. Цвета — #rgb/#rrggbb в полях темы.
      const data = readJson(read(rule.path));
      if (data === null || typeof data !== "object") return false;
      const themes = data.themes && typeof data.themes === "object" ? Object.values(data.themes) : [];
      const pairs = Array.isArray(data.contrast) ? data.contrast : Array.isArray(data.pairs) ? data.pairs : [];
      if (themes.length === 0 || pairs.length === 0) return false;
      const fallbackMin = Number(rule.min ?? 4.5);
      for (const theme of themes) {
        if (theme === null || typeof theme !== "object") return false;
        for (const pair of pairs) {
          const fg = hexToRgb(theme[String(pair.fg)]);
          const bg = hexToRgb(theme[String(pair.bg)]);
          if (fg === null || bg === null) return false;
          if (contrastRatio(fg, bg) < Number(pair.min ?? fallbackMin)) return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

/** Парсит JSON, возвращает null при ошибке. */
function readJson(text) {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Значение по пути «a.b», где массивы индексируются как есть (rule.key — имя поля). */
function getPath(obj, path) {
  let cur = obj;
  for (const part of String(path).split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Проверка контрольной суммы ИНН (10 или 12 цифр). */
export function isValidInn(value) {
  const s = String(value);
  const digits = s.split("").map((c) => c.charCodeAt(0) - 48);
  if (digits.some((d) => d < 0 || d > 9)) return false;
  const check = (weights) => weights.reduce((sum, w, i) => sum + w * digits[i], 0) % 11 % 10;
  if (s.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[9];
  if (s.length === 12) {
    const n11 = check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
    const n12 = check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
    return n11 === digits[10] && n12 === digits[11];
  }
  return false;
}

/** Проверка контрольной суммы ОГРН (13 цифр) / ОГРНИП (15 цифр). */
export function isValidOgrn(value) {
  const s = String(value);
  if (!/^\d+$/.test(s)) return false;
  if (s.length === 13) return Number(s.slice(0, 12)) % 11 % 10 === Number(s[12]);
  if (s.length === 15) return Number(s.slice(0, 14)) % 13 % 10 === Number(s[14]);
  return false;
}

/** Количество слогов в русском слове (эвристика по числу гласных). */
function countRuSyllables(word) {
  const vowels = String(word)
    .toLowerCase()
    .match(/[аеёиоуыэюя]/g);
  return Math.max(1, vowels ? vowels.length : Math.ceil(String(word).length / 3));
}

/** #rgb/#rrggbb → [r,g,b]; null — если значение не hex-цвет. */
function hexToRgb(value) {
  if (typeof value !== "string") return null;
  let c = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(c)) c = c.split("").map((x) => x + x).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Относительная яркость sRGB (WCAG 2.1, 1.4.3). */
export function relativeLuminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Коэффициент контраста двух цветов по WCAG 2.1: (Lmax+0.05)/(Lmin+0.05). */
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

/** Проверка вложенного ключа «a.b.c» (массивы считаются присутствующими, если непусты). */
function hasPath(obj, path) {
  let cur = obj;
  for (const part of String(path).split(".")) {
    if (cur === null || typeof cur !== "object") return false;
    if (!(part in cur)) return false;
    cur = cur[part];
  }
  if (Array.isArray(cur)) return cur.length > 0;
  return cur !== undefined && cur !== null && cur !== "";
}

/** @param {string} root @param {string[]} scan @param {string[]} extensions */
function collectFiles(root, scan, extensions) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
    for (const name of readdirSync(dir)) {
      if (name === "workspace" || name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (extensions.some((ext) => name.endsWith(ext))) out.push(full);
    }
  };
  for (const entry of scan) {
    const full = join(root, entry);
    if (existsSync(full) && statSync(full).isFile()) out.push(full);
    else walk(full);
  }
  return out;
}
