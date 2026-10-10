/* ЦЕХ · Метаплатформа — core/vertical-kit/index.mjs
   Общий инструментарий вертикалей: единый формат отчёта приёмки и декларативный набор
   правил. Нужен, чтобы у 7 студий был ОДИН контракт вывода (§6, §15 ТЗ: ядро разбирает
   строки «OK/FAIL V-xx …» и «файл:строка B-xx …»), а сами правила оставались данными
   студии (§8: декларативные конфигурации).

   Публичный API:
     projectDirFromArgv()          — каталог проекта из argv (якорь приёмки)
     runVerticalChecks(name, list) — печать отчёта + exit code
     runSpec(name, rulesUrl)       — исполнить декларативные правила из rules.json
     runSlopSpec(name, slopUrl)    — исполнить запреты из slop.json
*/

import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

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
    default:
      return false;
  }
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
