/* Тесты gates.mjs: стадии цикла веб-студии как данные.

   Стадия — это чек-лист (`gates/G*.md`), в котором рядом с пунктом объявлена машинная
   реализация: `` `@check kind параметры` ``. Тест проверяет ровно этот контракт:
   документы читаются, коды пунктов попадают в карту покрытия, а прогон стадии по
   живому артефакту (сборка демо-проекта) даёт `passed` без машинных провалов.

   Вакуумные и человеческие пункты — не провал: три исхода (true / false / null)
   существуют затем, чтобы «не проверено» не выдавалось за приёмку. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import test from "node:test";

import { spawnSync } from "node:child_process";

import { describeGate, loadGates, runGate, runGates } from "../gates.mjs";

import { ENGINE_ROOT, STUDIO_ROOT } from "./roots.mjs";

const DEMO = join(STUDIO_ROOT, "projects", "dezobrabotka");

test("loadGates читает чек-листы стадий и карту кодов", () => {
  const loaded = loadGates(STUDIO_ROOT);
  assert.deepEqual(loaded.gates.map((gate) => gate.id), ["G1", "G2", "G3", "G4"]);
  assert.deepEqual(loaded.missing, []);
  for (const gate of loaded.gates) {
    assert.ok(gate.checks.length >= 5, `${gate.id}: пунктов ${gate.checks.length}`);
    assert.ok(gate.title.length > 0, `${gate.id}: нет заголовка`);
    // у каждого пункта есть либо машинная спека, либо явная пометка «человек»
    for (const check of gate.checks) {
      assert.ok(check.spec || check.human, `${gate.id}[${check.n}]: ни спеки, ни пометки «человек»`);
    }
  }
  // коды пунктов попадают в карту: тач-зоны закрыты G4, палитра — G1
  assert.equal(loaded.codeMap.get("V-11"), "G4");
  assert.equal(loaded.codeMap.get("Q-07"), "G1");
  assert.equal(loaded.codeMap.get("V-25"), "G4");
});

test("describeGate показывает долю машинных пунктов стадии", () => {
  const gate = loadGates(STUDIO_ROOT).gates.find((item) => item.id === "G4");
  const machine = gate.checks.filter((check) => !check.human).length;
  const text = describeGate(gate);
  assert.match(text, /^G4 /);
  assert.match(text, new RegExp(`машиной ${machine}/${gate.checks.length}`));
  assert.match(text, /G4|Финал/);
});

test("палитра вне каталога архива — провал стадии G1", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-gates-"));
  try {
    writeFileSync(
      join(dir, "DIRECTION.md"),
      ["# Направление", "Палитра: #7C5CFF", "#0B0B0F", "#F5F3EF"].join("\n"),
      "utf-8",
    );
    const gate = loadGates(STUDIO_ROOT).gates.find((item) => item.id === "G1");
    const result = await runGate(gate, { studioRoot: STUDIO_ROOT, projectDir: dir });
    const palette = result.checks.find((check) => check.spec?.kind === "palette");
    assert.equal(palette.ok, false);
    assert.equal(result.passed, false);
    // провал пункта обязан называть код, по которому модель получит правку
    assert.ok(palette.codes.length > 0, "провал палитры без кода правила");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("стадии проходят на живом демо-проекте, вакуумный цикл не считается провалом", async () => {
  const result = await runGates(STUDIO_ROOT, DEMO);
  assert.equal(result.passed, true, JSON.stringify(result.codes));
  assert.deepEqual(result.codes, []);
  const G4 = result.gates.find((gate) => gate.id === "G4");
  // К-21: evidence цикла появляется только после прогона ворот — до него правило вакантно
  const loop = G4.checks.find((check) => check.spec?.kind === "loop-evidence");
  assert.ok(loop.ok === null || loop.ok === true, `loop-evidence: ${loop.ok}`);
  // репозиторная гигиена — настоящий прогон scripts/ci-gate.mjs
  const hygiene = G4.checks.find((check) => check.spec?.kind === "repo-hygiene");
  assert.equal(hygiene.ok, true);
  // пункт без машинной спеки судит человек: null, а не «выполнено»
  assert.ok(G4.checks.some((check) => check.human && check.ok === null));
});

test("выбор стадии через opts.only ограничивает прогон", async () => {
  const result = await runGates(STUDIO_ROOT, DEMO, { only: ["G1"] });
  assert.deepEqual(result.gates.map((gate) => gate.id), ["G1"]);
});

test("неизвестный вид проверки не выдаётся за приёмку", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-gates-kind-"));
  try {
    writeFileSync(join(dir, "DIRECTION.md"), "# Направление\nПалитра: #0B0B0F\n", "utf-8");
    const studio = join(dir, "studio");
    mkdirSync(join(studio, "gates"), { recursive: true });
    writeFileSync(
      join(studio, "gates", "G1.md"),
      ["# G1 — Проба", "", "## Чек-лист", "1. Пункт с выдуманным видом проверки", "   `@check неведомая-проверка x=1`", ""].join("\n"),
      "utf-8",
    );
    const gate = loadGates(studio).gates[0];
    const result = await runGate(gate, { studioRoot: studio, projectDir: dir });
    assert.equal(result.checks[0].ok, null);
    assert.match(result.checks[0].detail, /неизвестен/);
    assert.equal(result.passed, true); // null — не провал, но и не «выполнено»
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("пункты стадий зовут скрипты, которые существуют", () => {
  // Пункт стадии — не лозунг: спека называет скрипт студии, и файл обязан лежать на месте.
  const result = loadGates(STUDIO_ROOT);
  const scripts = result.gates.flatMap((gate) => gate.checks.map((check) => check.spec?.params?.script)).filter(Boolean);
  assert.ok(scripts.length >= 3, `стадии зовут ${scripts.length} скриптов`);
  for (const script of scripts) {
    // имя без пути резолвится в scripts/ студии — так же, как это делает runCheck
    const abs = script.includes("/") ? join(STUDIO_ROOT, script) : join(STUDIO_ROOT, "scripts", script);
    assert.ok(existsSync(abs), `нет скрипта ${script}`);
  }
  // G4 делегирует гигиену мета-платформе — файл обязан резолвиться от корня репозитория
  assert.ok(existsSync(join(ENGINE_ROOT, "scripts", "ci-gate.mjs")));
});

test("CLI стадий: живой проект — exit 0, пустой каталог — exit 1 с кодами", () => {
  // Документы G*.md обещают `node cli/main.mjs gates G1 --studio … --project <имя>` —
  // команда обязана существовать и возвращать код, а не «помощь по опциям».
  const cli = join(ENGINE_ROOT, "cli", "main.mjs");
  const ok = spawnSync(process.execPath, [cli, "gates", "G1", "--studio", "web_studio", "--project", "dezobrabotka", "--quiet"], {
    cwd: ENGINE_ROOT,
    encoding: "utf-8",
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /G1 Направление/);
  assert.match(ok.stdout, /exit 0/);

  const dir = mkdtempSync(join(tmpdir(), "ceh-gates-cli-"));
  try {
    const bad = spawnSync(process.execPath, [cli, "gates", "G1", "--studio", "web_studio", "--project", dir], {
      cwd: ENGINE_ROOT,
      encoding: "utf-8",
    });
    assert.equal(bad.status, 1, bad.stdout);
    assert.match(bad.stdout, /FAIL G1/);
    assert.match(bad.stdout, /exit 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
