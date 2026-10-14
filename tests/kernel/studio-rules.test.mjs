/* ЦЕХ · ядро — tests/kernel/studio-rules.test.mjs
   Машинные правила студий приложений обязаны быть проверяемыми, а не «декларацией в законе».
   Здесь закреплено: у каждой статьи закона есть машинный код; правила V-26…V-29 / Q-06…Q-08
   считаются контрактом; на живом демо-проекте они зелёные, на сломанном — красные
   (three-valued проверка: не «ничего не понял», а честное false). */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateCode, loadContract } from "../../core/loop-engine/contract.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_STUDIOS = [
  { vertical: "mobile_apps", project: "notes-app", codes: ["V-26", "V-27", "V-28", "V-29", "Q-07"] },
  { vertical: "mini_apps", project: "timer-app", codes: ["Q-06", "Q-07", "Q-08"] },
];

const projectDirOf = (vertical, project) => join(ROOT, "verticals", vertical, "projects", project);

test("каждая статья законов мини- и мобильной студии закрыта машинным кодом", () => {
  for (const { vertical } of APP_STUDIOS) {
    const contract = loadContract(join(ROOT, "verticals", vertical));
    const human = contract.laws.filter((law) => (law.codes ?? []).length === 0);
    assert.deepEqual(human.map((law) => law.id), [], `${vertical}: статьи без машинного кода`);
    assert.ok(contract.laws.length >= 24, `${vertical}: закон слишком короткий (${contract.laws.length})`);
  }
});

test("новые правила студий вычисляются контрактом и зелены на демо-проектах", () => {
  for (const { vertical, project, codes } of APP_STUDIOS) {
    const contract = loadContract(join(ROOT, "verticals", vertical));
    const byCode = new Map(contract.codes.map((entry) => [entry.code, entry]));
    for (const code of codes) {
      const entry = byCode.get(code);
      assert.ok(entry, `${vertical}: код ${code} не объявлен в контракте`);
      assert.ok(entry.rule, `${vertical}: у ${code} нет машинного правила`);
      // evaluateCode трёхзначен: pass / fail / skip. «skip» здесь означал бы, что правило не описано.
      assert.equal(evaluateCode(entry, projectDirOf(vertical, project), contract).status, "pass", `${vertical}/${project}: ${code} должен быть зелёным`);
    }
  }
});

test("правила приложений краснеют на сломанном артефакте, а не молчат", () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-rules-"));
  try {
    cpSync(projectDirOf("mobile_apps", "notes-app"), dir, { recursive: true });
    const mutate = (rel, fn) => {
      const path = join(dir, rel);
      const text = readFileSync(path, "utf8");
      writeFileSync(path, fn(text), "utf8");
    };
    // локали разошлись, описание стора стало заглушкой, манифест потерял планшеты, биометрия без проверки железа
    mutate("app/locales/en.json", (t) => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(t)).slice(1))));
    mutate("app/store.json", (t) => JSON.stringify({ ...JSON.parse(t), description: "Коротко" }));
    mutate("app/app.json", (t) => {
      const data = JSON.parse(t);
      delete data.tabletSupport;
      return JSON.stringify(data);
    });
    mutate("app/src/App.mjs", (t) => t.split("hasHardwareAsync").join("noCheck"));
    const contract = loadContract(join(ROOT, "verticals", "mobile_apps"));
    const byCode = new Map(contract.codes.map((entry) => [entry.code, entry]));
    for (const code of ["V-26", "V-27", "V-28", "V-29"]) {
      assert.equal(evaluateCode(byCode.get(code), dir, contract).status, "fail", `${code} обязан поймать поломку`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("закон стадий веб-студии (G1…G4) читается кодом: документы на месте и не пусты", () => {
  const dir = join(ROOT, "verticals", "web_studio");
  const declared = /gates:\s*\[([^\]]+)\]/.exec(readFileSync(join(dir, "vertical.yaml"), "utf8"))?.[1]
    .split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean) ?? [];
  assert.deepEqual(declared, ["G1", "G2", "G3", "G4"], "vertical.yaml должен объявлять стадии цикла");
  for (const id of declared) {
    const file = readFileSync(join(dir, "gates", `${id}-${id === "G1" ? "direction" : id === "G2" ? "structure" : id === "G3" ? "motion" : "final"}.md`), "utf8");
    assert.ok(file.split("\n").length >= 15, `${id}: документ стадии слишком короткий`);
    assert.match(file, /Чек-лист/, `${id}: у стадии нет чек-листа`);
    const items = (file.match(/^\d+\.\s/gm) ?? []).length;
    assert.ok(items >= 3, `${id}: в чек-листе стадии меньше трёх пунктов`);
  }
});
