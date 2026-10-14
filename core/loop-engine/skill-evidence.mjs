/* ЦЕХ · Universal Loop Engine — skill-evidence.mjs
   Приём, который умеет проверять себя: evidence-сканы для скиллов студий.

   Скилл перестаёт быть памяткой, когда он несёт проверяемые признаки: что обязано
   появиться в артефакте (`evidence.require`) и чего быть не должно (`evidence.forbid`).
   Крючок `post_execute` каждой студии делегирует сюда — поэтому все приёмы проверяются
   одинаково, а правила остаются данными (skill.yaml).

   Публичный API:
     loadEvidence(skillDir)        → {require: [], forbid: [], files: [], codes: {}}
     checkEvidence(opts)           → {ok, scanned, findings: [{code, file, line, message, quote, severity}]}
     postExecute(ctx)              → крючок: скан evidence и отчёт (не бросает исключений)
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSimpleYaml } from "./config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");

/** Расширения, которые сканирует evidence (по умолчанию). */
export const SCAN_EXTENSIONS = Object.freeze([".html", ".css", ".js", ".mjs", ".json", ".md", ".txt"]);

/** Каталоги, которые не сканируем никогда. */
const SKIP_DIRS = new Set(["node_modules", ".git", "workspace", "dist", "build", ".browser"]);

/**
 * Читает evidence из skill.yaml.
 * @param {string} skillDir
 * @returns {{require: string[], forbid: string[], files: string[], codes: string[], notes: string[], title: string, id: string}}
 */
export function loadEvidence(skillDir) {
  // Каталог приёма может быть не определён (хук вызван напрямую, вне движка): тогда признаков нет,
  // и это надо сказать прямо — иначе скан по cwd выдаст «приём применён» по чужим файлам.
  const dir = skillDir ? resolve(String(skillDir)) : null;
  const text = dir ? readIfExists(join(dir, "skill.yaml")) : null;
  const meta = text ? parseSimpleYaml(text) ?? {} : {};
  const list = (value) => {
    const raw = Array.isArray(value) ? value.map(String) : value === undefined || value === null || value === "" ? [] : [String(value)];
    return raw
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item !== "—" && item !== "-");
  };
  return {
    declared: Boolean(text),
    id: String(meta.name ?? (dir ? dir.split("/").pop() : "")),
    title: String(meta.title ?? meta.name ?? ""),
    require: list(meta.evidence?.require ?? meta.require),
    forbid: list(meta.evidence?.forbid ?? meta.forbid),
    files: list(meta.evidence?.files ?? meta.files),
    codes: list(meta.codes),
    severity: String(meta.evidence?.severity ?? "warn").toLowerCase() === "error" ? "error" : "warn",
    notes: list(meta.evidence?.notes ?? meta.notes),
  };
}

function readIfExists(path) {
  try {
    return existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

/**
 * Простой glob → RegExp: поддерживает `*`, `**`, `?`, `{a,b}`.
 * Нужен, потому что приём объявляет свою область данными (`evidence.files`), а не кодом.
 */
export function globToRegExp(pattern) {
  const src = String(pattern).split("\\").join("/");
  let out = "";
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "*") {
      if (src[i + 1] === "*") {
        out += ".*";
        i += 1;
        if (src[i + 1] === "/") i += 1;
      } else out += "[^/]*";
    } else if (ch === "?") out += "[^/]";
    else if (ch === "{") out += "(?:";
    else if (ch === "}") out += ")";
    else if (ch === "," && src.lastIndexOf("{", i) > src.lastIndexOf("}", i)) out += "|";
    else out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^(?:${out}|.*/${out})$`, "i");
}

/** Собирает файлы проекта для скана: сначала точные пути/glob'ы приёма, иначе — обход дерева. */
export function collectArtifacts(projectDir, { files = [], dirs = ["./"], extensions = SCAN_EXTENSIONS, limit = 400 } = {}) {
  const root = resolve(String(projectDir));
  /** @type {string[]} */
  const out = [];
  const patterns = (files ?? []).filter((f) => typeof f === "string" && f.length > 0);
  const seen = new Set();

  const walk = (base, onFile) => {
    if (!existsSync(base)) return;
    const stack = [base];
    while (stack.length > 0 && out.length < limit) {
      const current = stack.pop();
      /** @type {import("node:fs").Dirent[]} */
      let entries = [];
      try {
        entries = readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
        const abs = join(current, entry.name);
        if (entry.isDirectory()) stack.push(abs);
        else if (onFile(abs)) out.push(abs);
      }
    }
  };

  if (patterns.length > 0) {
    const matchers = patterns.map(globToRegExp);
    walk(root, (abs) => {
      const rel = abs.slice(root.length + 1).split("\\").join("/");
      return matchers.some((re) => re.test(rel)) && extensions.includes(extname(abs).toLowerCase());
    });
    // приём может назвать файл напрямую (без расширения в списке сканируемых)
    for (const pattern of patterns) {
      if (!/[*?{]/.test(pattern)) {
        const abs = resolve(root, pattern);
        if (existsSync(abs) && statSync(abs).isFile() && !seen.has(abs)) {
          seen.add(abs);
          out.push(abs);
        }
      }
    }
  } else {
    for (const rel of dirs) {
      const base = resolve(root, String(rel));
      if (existsSync(base) && statSync(base).isFile()) {
        out.push(base);
        continue;
      }
      walk(base, (abs) => extensions.includes(extname(abs).toLowerCase()));
    }
  }
  return [...new Set(out)].slice(0, limit);
}

/**
 * Проверяет признаки приёма в артефактах проекта.
 *
 * Семантика (одна на все три студии):
 *   `require` — признак обязан быть в артефакте ХОТЯ БЫ ОДИН РАЗ (иначе одна находка
 *               «приём не применён» на весь проект, а не по строке на каждый файл);
 *   `forbid`  — признак не должен встречаться НИГДЕ (находка на каждое вхождение).
 *
 * @param {{skillDir?: string, projectDir: string, evidence?: any, files?: string[], dirs?: string[], extensions?: string[], limit?: number}} opts
 * @returns {{ok: boolean, scanned: number, findings: any[], skill: string, covered: string[], missing: string[]}}
 */
export function checkEvidence(opts) {
  const projectDir = resolve(String(opts.projectDir));
  const evidence = opts.evidence ?? loadEvidence(opts.skillDir ?? null);
  const files = collectArtifacts(projectDir, {
    files: opts.files ?? evidence.files ?? [],
    dirs: opts.dirs ?? ["./"],
    extensions: opts.extensions ?? SCAN_EXTENSIONS,
    limit: opts.limit ?? 400,
  });
  const id = evidence.id || "skill";
  if (evidence.declared === false) {
    // Приём без skill.yaml не судит: у него нет объявленных признаков.
    return { ok: true, declared: false, scanned: 0, findings: [], skill: "", covered: [], missing: [], note: "evidence не объявлен" };
  }
  /** @type {any[]} */
  const findings = [];
  /** @type {string[]} */
  const covered = [];
  /** @type {string[]} */
  const missing = [];
  const scope = (evidence.files ?? []).length > 0 ? ` (${evidence.files.join(", ")})` : "";
  // приём объявляет, судит он или советует: по умолчанию находки — предупреждения для правок,
  // приговор остаётся за валидатором студии (К-02: единая точка истины)
  const severity = evidence.severity === "error" ? "error" : "warn";

  const compile = (pattern) => {
    try {
      return new RegExp(pattern, "gim");
    } catch {
      return null;
    }
  };

  // forbid: ищем вхождения по файлам
  for (const pattern of evidence.forbid ?? []) {
    const re = compile(pattern);
    if (!re) continue;
    for (const file of files) {
      const text = readIfExists(file);
      if (text === null) continue;
      const rel = file.slice(projectDir.length + 1).split("\\").join("/");
      let match;
      let guard = 0;
      while ((match = re.exec(text)) !== null && guard < 50) {
        guard += 1;
        if (match[0] === "") re.lastIndex += 1;
        findings.push({
          code: `${id}:forbid`,
          file: rel,
          line: text.slice(0, match.index).split("\n").length,
          message: `приём «${evidence.title || id}»: запрещённый признак /${pattern}/`,
          quote: String(match[0]).slice(0, 80),
          severity,
        });
      }
    }
  }

  // require: признак обязан присутствовать в проекте хотя бы один раз
  for (const pattern of evidence.require ?? []) {
    const re = compile(pattern);
    if (!re) continue;
    let hits = 0;
    let where = "";
    for (const file of files) {
      const text = readIfExists(file);
      if (text === null) continue;
      re.lastIndex = 0;
      const match = re.exec(text);
      if (match) {
        hits += 1;
        where = where || `${file.slice(projectDir.length + 1).split("\\").join("/")}:${text.slice(0, match.index).split("\n").length}`;
      }
    }
    if (hits === 0) {
      missing.push(pattern);
      findings.push({
        code: `${id}:require`,
        file: "",
        line: 0,
        message: `приём «${evidence.title || id}»: признак /${pattern}/ не найден ни в одном файле${scope}`,
        quote: "",
        severity,
      });
    } else {
      covered.push(pattern);
    }
  }

  const ok = !findings.some((f) => f.severity === "error");
  return { ok, scanned: files.length, findings, skill: id, covered, missing };
}

/** Печатает находки evidence в консоль (формат студий: «файл:строка код сообщение»). */
export function reportEvidence(result, { stream = process.stdout, prefix = "[skill]", verbose = false } = {}) {
  if (result.declared === false) return result;
  if (result.findings.length === 0) {
    // молчание — норма: линтер студии печатает построчно, а приём отчитывается только о находках.
    if (verbose) stream.write(`${prefix} ${result.skill}: чисто — ${result.scanned} файл(ов)\n`);
    return result;
  }
  for (const finding of result.findings) {
    stream.write(`${finding.file}:${finding.line} ${finding.code} «${finding.message}»\n`);
  }
  stream.write(`${prefix} ${result.skill}: находок ${result.findings.length} из ${result.scanned} файл(ов)\n`);
  return result;
}

/**
 * Крючок `post_execute` приёма: сканирует артефакт и возвращает ctx с результатом.
 * Исключений не бросает — приём не должен ломать цикл (К-10).
 */
export async function postExecute(ctx = {}) {
  try {
    const skillDir = skillDirFromHook(ctx);
    const projectDir = ctx.projectDir ?? ctx.deliverableDir ?? ctx.project_dir ?? null;
    if (!projectDir) return { ...ctx, evidence: { ok: true, declared: false, scanned: 0, findings: [], skill: null, note: "projectDir не передан — скан пропущен" } };
    if (!skillDir) return { ...ctx, evidence: { ok: true, declared: false, scanned: 0, findings: [], skill: null, note: "каталог приёма не определён — скан пропущен" } };
    const evidence = loadEvidence(skillDir);
    const result = checkEvidence({ skillDir, projectDir, evidence, dirs: ctx.dirs ?? ["./"], files: ctx.files ?? evidence.files });
    reportEvidence({ ...result, skill: evidence.id }, { verbose: Boolean(ctx.verbose) });
    return { ...ctx, evidence: result };
  } catch (error) {
    return { ...ctx, evidence: { ok: true, scanned: 0, findings: [], error: String(error?.message ?? error) } };
  }
}

/** Крючок `pre_execute`: объявляет цели приёма (какие файлы и коды его касаются). */
export async function preExecute(ctx = {}) {
  try {
    const skillDir = skillDirFromHook(ctx);
    const evidence = loadEvidence(skillDir);
    return { ...ctx, skill: evidence.id, skillDir, codes: evidence.codes, targets: evidence.files };
  } catch {
    return ctx;
  }
}

/**
 * Каталог приёма: сначала явный `ctx.skillDir` от движка (runSkillHook кладёт его в ctx),
 * затем путь крючка из стека — на случай прямого вызова хука без движка.
 */
function skillDirFromHook(ctx = {}) {
  if (ctx.skillDir) return resolve(String(ctx.skillDir));
  const stack = new Error().stack ?? "";
  const match = /file:\/\/(\/[^\s)]+)\/hooks\/[^/]+\.mjs/.exec(stack);
  if (match) return match[1];
  // Каталог неизвестен: сканировать cwd нельзя — это выдало бы «приём применён» по чужим файлам.
  return null;
}

export default { loadEvidence, checkEvidence, reportEvidence, collectArtifacts, postExecute, preExecute, REPO_ROOT };
