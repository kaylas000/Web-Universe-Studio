/* Тесты scripts/ci-gate.mjs — самый дешёвый слой контура (К-15).

   Конфигурация CI живёт в репозитории как данные (`ci/workflows/*.yml`), а GitHub читает
   только `.github/workflows/` — и этот путь могут закрывать правами интеграции. Отсюда
   четыре состояния, которые проверка обязана различать, а не сваливать в одну галочку:
   не установлено (предупреждение с командой установки), установлено и совпадает (норма),
   установлено и разошлось (провал: CI судит не то, что в репозитории), установлено без
   вызова гейта (провал: регрессия К-15).

   Секреты и ссылки проверяются на настоящих репозиториях: сканеры не должны ни пропускать
   живой ключ, ни падать на документации, которая такие ключи цитирует как пример. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkRepoHygiene, ciConfigState, repoTextFiles, scanLinks, scanSecrets } from "../../scripts/ci-gate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");

/** Каталог-репозиторий с заданным содержимым и автоматической уборкой. */
function tempRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), "ceh-ci-gate-"));
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text, "utf-8");
  }
  return dir;
}

const WORKFLOW = [
  "name: ci",
  "on: [push, pull_request]",
  "jobs:",
  "  gate:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "      - run: node scripts/ci-gate.mjs",
  "      - run: npm test",
  "",
].join("\n");

test("CI не установлен: предупреждение с командой установки, а не провал", () => {
  const dir = tempRepo({ "ci/workflows/ci.yml": WORKFLOW, "README.md": "# Репозиторий\n" });
  try {
    const state = ciConfigState(dir);
    assert.equal(state.ok, false);
    assert.equal(state.configured, false);
    assert.match(state.detail, /install-ci\.sh/);

    const hygiene = checkRepoHygiene(dir);
    assert.equal(hygiene.ok, true, "отсутствие workflow — предупреждение: права на путь .github/workflows/ могут быть закрыты");
    assert.equal(hygiene.warnings.length, 1, "предупреждение должно быть видно, а не спрятано");
    assert.equal(hygiene.noted.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CI установлен и совпадает с источником: гигиена в норме без замечаний", () => {
  const dir = tempRepo({
    "ci/workflows/ci.yml": WORKFLOW,
    ".github/workflows/ci.yml": WORKFLOW,
    "README.md": "# Репозиторий\n",
  });
  try {
    const state = ciConfigState(dir);
    assert.equal(state.ok, true);
    assert.deepEqual(state.sources, ["ci/workflows/ci.yml"]);
    assert.deepEqual(state.gated, ["ci.yml"]);
    assert.deepEqual(checkRepoHygiene(dir).warnings, []);
    assert.deepEqual(checkRepoHygiene(dir).noted, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CI разошёлся с источником в репозитории — провал, CI судит не то", () => {
  const dir = tempRepo({
    "ci/workflows/ci.yml": WORKFLOW,
    ".github/workflows/ci.yml": WORKFLOW.replace("npm test", "echo ok"),
    "README.md": "# Репозиторий\n",
  });
  try {
    const state = ciConfigState(dir);
    assert.equal(state.ok, false);
    assert.equal(state.configured, true);
    assert.match(state.detail, /разошёлся/);
    const hygiene = checkRepoHygiene(dir);
    assert.equal(hygiene.ok, false);
    assert.equal(hygiene.warnings.length, 0, "дрейф — это провал, а не предупреждение");
    assert.match(hygiene.noted.join(" "), /install-ci\.sh/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("workflow есть, но гейт не зовёт — провал К-15", () => {
  const dir = tempRepo({ ".github/workflows/build.yml": "name: build\non: [push]\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hello\n" });
  try {
    const state = ciConfigState(dir);
    assert.equal(state.ok, false);
    assert.equal(state.configured, true);
    assert.match(state.detail, /не зовёт/);
    assert.equal(checkRepoHygiene(dir).ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("живой секрет находится, а цитата-пример — нет", () => {
  // Ключ собираем из частей: иначе сканер найдёт настоящий секрет в самом тесте.
  const awsKey = "AKIA" + "7QZ2XW4PLMNBVCXY";
  const dir = tempRepo({
    "service.mjs": `const key = "${awsKey}";\n`,
    "docs/example.md": "Пример в документации: AKIAIOSFODNN7EXAMPLE и sk-XXXXXXXXXXXXXXXXXXXXXXXX\n",
    "README.md": "# Репозиторий\n",
  });
  try {
    const files = repoTextFiles(dir);
    const findings = scanSecrets(dir, files);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].code, "S-02");
    assert.match(findings[0].file, /service\.mjs$/);
    assert.equal(checkRepoHygiene(dir).ok, false, "секрет — провал гигиены");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("битая внутренняя ссылка в документе — находка, внешняя — нет", () => {
  const dir = tempRepo({
    "README.md": ["# Репозиторий", "", "См. [схему](docs/scheme.md) и [сайт](https://example.com/x).", ""].join("\n"),
    "ci/workflows/ci.yml": WORKFLOW,
  });
  try {
    const broken = scanLinks(dir);
    assert.equal(broken.length, 1, JSON.stringify(broken));
    assert.equal(broken[0].target, "docs/scheme.md");
    // после появления файла ссылка перестаёт быть битой
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "scheme.md"), "# Схема\n", "utf-8");
    assert.equal(scanLinks(dir).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("сам репозиторий проходит гигиену при любом состоянии CI-файла", () => {
  // Тест не зависит от того, установлен ли workflow в рабочей копии: оба состояния законны,
  // но состояние обязано быть названо — молчаливой зелёной галочки быть не должно.
  const hygiene = checkRepoHygiene(REPO_ROOT);
  assert.equal(hygiene.ok, true, JSON.stringify(hygiene.noted));
  assert.ok(hygiene.ci.detail.length > 0);
  assert.ok(hygiene.checked > 100, `проверено файлов: ${hygiene.checked}`);
  const source = readFileSync(join(REPO_ROOT, "ci", "workflows", "ci.yml"), "utf8");
  assert.match(source, /ci-gate\.mjs/, "конфигурация CI обязана звать гигиену");
  assert.match(source, /npm test/);
  assert.match(source, /acceptance_test\.sh/);
});
