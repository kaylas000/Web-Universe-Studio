#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/ci-gate.mjs
   Самый дешёвый слой К-15: секреты, битые внутренние ссылки и наличие самого CI-гейта.
   Проверка живёт в репозитории и вызывается оттуда же, где принимается проект:

     node scripts/ci-gate.mjs            # отчёт человеку, exit 0/1
     node scripts/ci-gate.mjs --json     # машиночитаемо

   Почему именно эти три проверки. «PR не мержится без зелёного CI, секреты и битые ссылки
   блокируют гейт» (К-15) — три утверждения, каждое машинно проверяемо без сети и ключей:
     • CI-конфиг существует и зовёт реальный гейт (`npm test` / `acceptance_test.sh`);
     • в репозитории нет похожего на секрет;
     • относительные ссылки в README/docs ведут на существующие файлы.

   Публичный API: checkRepoHygiene(repoRoot) — тем же кодом пользуется валидатор студии (V-25),
   чтобы у правила К-15 был один источник истины.
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "..");

// `fixtures` — входные данные линтеров (намеренный слоп и примеры «как не надо»), а не код продукта:
// секреты ищем в том, что попадает в сборку и в руки читателя.
const SKIP_DIRS = new Set(["node_modules", ".git", "workspace", "dist", "build", ".browser", "coverage", "out", "fixtures"]);
const TEXT_EXT = new Set([".md", ".mjs", ".js", ".json", ".yaml", ".yml", ".sh", ".html", ".css", ".txt", ".ts"]);
const MAX_FILES = 4000;
const MAX_BYTES = 2 * 1024 * 1024;

/** Похоже ли значение на настоящий секрет (заглушки и подстановки — нет). */
function looksLikePlaceholder(value) {
  const text = String(value);
  if (text.length < 16) return true;
  if (/^[<${]|[>}]$/.test(text)) return true;
  if (/^(process\.env|env\.|os\.environ|import\.meta)/.test(text)) return true;
  if (/^(your|my|example|sample|test|dummy|fake|placeholder|changeme|xxx|todo)/i.test(text)) return true;
  if (/EXAMPLE$/.test(text)) return true; // документированный пример ключа (AKIA…EXAMPLE) — не секрет
  if (/^[A-Z_]{4,}$/.test(text)) return true; // ИМЯ_ПЕРЕМЕННОЙ
  if (!/[A-Za-z]/.test(text) || !/[0-9]/.test(text)) return true; // без букв или без цифр — не ключ
  return false;
}

const SECRET_PATTERNS = [
  { code: "S-01", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g, what: "похоже на ключ OpenAI" },
  { code: "S-02", re: /\bAKIA[0-9A-Z]{16}\b/g, what: "похоже на ключ AWS" },
  { code: "S-03", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, what: "приватный ключ в репозитории" },
  { code: "S-04", re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,})\b/g, what: "похоже на токен GitHub" },
  {
    code: "S-05",
    re: /(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["']([^"']{16,})["']/gi,
    what: "секрет присвоен литералом",
    valueGroup: 1,
  },
];

/** Обходит репозиторий: только текстовые файлы, без каталогов-состояний. */
export function repoTextFiles(repoRoot) {
  /** @type {string[]} */
  const out = [];
  const stack = [resolve(String(repoRoot))];
  while (stack.length > 0 && out.length < MAX_FILES) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!TEXT_EXT.has(extname(abs).toLowerCase())) continue;
      try {
        if (statSync(abs).size > MAX_BYTES) continue;
      } catch {
        continue;
      }
      out.push(abs);
    }
  }
  return out;
}

/** Секреты в текстовых файлах репозитория. */
export function scanSecrets(repoRoot, files = repoTextFiles(repoRoot)) {
  const findings = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const pattern of SECRET_PATTERNS) {
      for (const match of text.matchAll(pattern.re)) {
        const value = pattern.valueGroup ? match[pattern.valueGroup] : match[0];
        if (looksLikePlaceholder(value)) continue;
        findings.push({
          code: pattern.code,
          file: relative(resolve(String(repoRoot)), file).split("\\").join("/"),
          line: text.slice(0, match.index ?? 0).split("\n").length,
          what: pattern.what,
        });
      }
    }
  }
  return findings;
}

/** Относительные ссылки README и docs ведут на существующие файлы. */
export function scanLinks(repoRoot, files = null) {
  const root = resolve(String(repoRoot));
  const targets = files ?? ["README.md", "AGENT_PROMPT.md", "TECHNICAL_SPECIFICATION.md", ...docsFiles(root)];
  const broken = [];
  for (const rel of targets) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const dir = dirname(abs);
    const text = readFileSync(abs, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|tel:|#)/.test(target)) continue;
      const path = target.split("#")[0];
      if (!path) continue;
      const resolved = resolve(dir, path);
      if (existsSync(resolved)) continue;
      // ссылка может вести от корня репозитория (типовое «docs/API.md» в тексте)
      if (existsSync(join(root, path))) continue;
      broken.push({ file: rel, target, line: text.slice(0, match.index ?? 0).split("\n").length });
    }
  }
  return broken;
}

function docsFiles(root) {
  const dir = join(root, "docs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".md")).map((name) => `docs/${name}`);
}

/** CI-гейт: конфигурация обязана существовать и звать реальный прогон проверок. */
/**
 * Состояние CI (К-15). Конфигурация живёт в репозитории как данные — `ci/workflows/*.yml`,
 * а GitHub читает только `.github/workflows/`. Поэтому состояний четыре, и путать их нельзя:
 *   1) установлено и совпадает с источником → ok;
 *   2) установлено, но разошлось с `ci/workflows/` → провал: CI судит не то, что в репозитории;
 *   3) `.github/workflows/` есть, но ни один workflow не зовёт гейт → провал (регрессия К-15);
 *   4) не установлено вовсе → предупреждение с командой установки, а не провал: путь
 *      `.github/workflows/` могут закрывать правами (интеграция без права `workflows`).
 * @param {string} repoRoot
 * @returns {{ok: boolean, configured: boolean, files: string[], gated: string[], sources: string[], detail: string}}
 */
export function ciConfigState(repoRoot) {
  const root = resolve(String(repoRoot));
  const dir = join(root, ".github", "workflows");
  const srcDir = join(root, "ci", "workflows");
  const sources = existsSync(srcDir) ? readdirSync(srcDir).filter((name) => /\.ya?ml$/.test(name)).sort() : [];
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => /\.ya?ml$/.test(name)).sort() : [];
  const sourcePath = (name) => `ci/workflows/${name}`;
  const install = "bash scripts/install-ci.sh";

  if (files.length === 0) {
    return {
      ok: false,
      configured: false,
      files: [],
      gated: [],
      sources: sources.map(sourcePath),
      detail: sources.length > 0
        ? `CI не установлен: конфигурация лежит в ${sources.map(sourcePath).join(", ")} — поставьте её командой «${install}»`
        : `нет CI: добавьте конфигурацию в ci/workflows/ci.yml и поставьте командой «${install}» (docs/DEPLOY.md)`,
    };
  }

  const gated = files.filter((name) => {
    const text = readFileSync(join(dir, name), "utf8");
    return /npm (?:run )?test|acceptance_test\.sh|core\/gate\.mjs|ci-gate\.mjs/.test(text);
  });

  // Дрейф: установленный workflow обязан совпадать с источником в репозитории — иначе CI
  // прогоняет не то, что видит человек в diff'е.
  const drifted = sources.filter((name) => {
    const target = join(dir, name);
    return existsSync(target) && readFileSync(target, "utf8") !== readFileSync(join(srcDir, name), "utf8");
  });

  const ok = gated.length > 0 && drifted.length === 0 && files.length > 0 && sources.length > 0;
  const detail = drifted.length > 0
    ? `CI разошёлся с источником: ${drifted.map(sourcePath).join(", ")} — запустите «${install}»`
    : gated.length > 0
      ? sources.length > 0
        ? `CI зовёт гейт: ${gated.join(", ")} · источник: ${sources.map(sourcePath).join(", ")}`
        : `CI зовёт гейт: ${gated.join(", ")}, но источника в ci/workflows/ нет`
      : `workflow есть, но не зовёт ни npm test, ни acceptance_test.sh: ${files.join(", ")}`;

  return { ok, configured: true, files: files.map((name) => `.github/workflows/${name}`), gated, sources: sources.map(sourcePath), detail };
}

/**
 * Полная проверка репозиторной гигиены (К-15).
 * @param {string} repoRoot
 * @returns {{ok: boolean, ci: any, secrets: any[], brokenLinks: any[], checked: number, noted: string[]}}
 */
export function checkRepoHygiene(repoRoot) {
  const root = resolve(String(repoRoot));
  const files = repoTextFiles(root);
  const ci = ciConfigState(root);
  const secrets = scanSecrets(root, files);
  const brokenLinks = scanLinks(root);
  const noted = [];
  const warnings = [];
  if (secrets.length > 0) noted.push(`секреты в репозитории: ${secrets.length}`);
  if (brokenLinks.length > 0) noted.push(`битых внутренних ссылок: ${brokenLinks.length}`);
  if (!ci.ok && ci.configured) noted.push(ci.detail);
  if (!ci.ok && !ci.configured) warnings.push(ci.detail);
  const ok = (ci.ok || !ci.configured) && secrets.length === 0 && brokenLinks.length === 0;
  return { ok, ci, secrets, brokenLinks, checked: files.length, noted, warnings };
}

/* ————————————————————— CLI ————————————————————— */

function main(argv) {
  const json = argv.includes("--json");
  const quiet = argv.includes("--quiet");
  const result = checkRepoHygiene(REPO_ROOT);
  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: result.ok,
          checked: result.checked,
          ci: { ok: result.ci.ok, configured: result.ci.configured, files: result.ci.files, sources: result.ci.sources, detail: result.ci.detail },
          warnings: result.warnings,
          secrets: result.secrets.map((s) => `${s.file}:${s.line} ${s.code} ${s.what}`),
          links: result.brokenLinks.map((b) => `${b.file}:${b.line} → ${b.target}`),
        },
        null,
        2,
      ) + "\n",
    );
    return result.ok ? 0 : 1;
  }
  if (!quiet) {
    process.stdout.write("ЦЕХ · репозиторная гигиена (К-15)\n");
    process.stdout.write(`файлов проверено: ${result.checked}\n`);
    const ciMark = result.ci.ok ? "OK  " : result.ci.configured ? "FAIL" : "WARN";
    process.stdout.write(`${ciMark} CI-гейт: ${result.ci.detail}\n`);
    for (const secret of result.secrets) process.stdout.write(`FAIL ${secret.file}:${secret.line} ${secret.code} ${secret.what}\n`);
    if (result.secrets.length === 0) process.stdout.write("OK   секретов в репозитории нет\n");
    for (const link of result.brokenLinks) process.stdout.write(`FAIL ${link.file}:${link.line} битая ссылка → ${link.target}\n`);
    if (result.brokenLinks.length === 0) process.stdout.write("OK   внутренние ссылки ведут на существующие файлы\n");
    process.stdout.write(`${"─".repeat(48)}\nИТОГ: ${result.ok ? "гигиена в норме" : "есть замечания"} · exit ${result.ok ? 0 : 1}\n`);
  }
  return result.ok ? 0 : 1;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { checkRepoHygiene, scanSecrets, scanLinks, ciConfigState, repoTextFiles };
