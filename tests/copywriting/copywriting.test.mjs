/* tests/copywriting/copywriting.test.mjs — движок редактуры (REF humanizer-ru).
   Проверяет: артефакты копипаста (жёсткие, A-xx), стилевые маркеры (C-xx/N-xx/R-xx),
   смягчение по жанру, устойчивость к коду, и что обёртки-линтеры всех трёх студий
   стоят на демо-проектах зелёными (exit 0). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { analyzeText, ARTIFACT_RULES, STYLE_RULES } from "../../core/vertical-kit/copywriting.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const codes = (r) => r.findings.map((f) => f.code);

test("движок ловит артефакты копипаста как жёсткие ошибки (A-xx)", () => {
  const r = analyzeText("Текст. См. :contentReference[oaicite:3]{index=3} и utm_source=chatgpt.com", { genre: "marketing" });
  assert.ok(r.errors >= 2, `ожидалось ≥2 ошибок, получено ${r.errors}`);
  assert.ok(codes(r).includes("A-01"), "нет A-01 (oaicite)");
  assert.ok(codes(r).includes("A-03"), "нет A-03 (utm_source=chatgpt.com)");
  assert.equal(r.verdict, "переписать");
});

test("движок ловит плейсхолдеры (A-09)", () => {
  const r = analyzeText("Вставь сюда INSERT_SOURCE_URL и дату 20XX-XX-XX", { genre: "business" });
  assert.ok(codes(r).includes("A-09"), "нет A-09 (плейсхолдер)");
});

test("стилевые маркеры — предупреждения, не ошибки (C-01/N-01)", () => {
  const r = analyzeText("Важно отметить, что сервис — это не просто доставка, а экосистема.", { genre: "marketing" });
  assert.equal(r.errors, 0, "стиль не должен давать жёстких ошибок");
  assert.ok(r.warnings > 0, "ожидались стилевые замечания");
  assert.ok(codes(r).includes("C-01"), "нет C-01 (канцелярит)");
  assert.ok(codes(r).includes("N-01"), "нет N-01 (негативный параллелизм)");
});

test("жанр смягчает стилевые правила (legal/academic)", () => {
  const text = "В настоящее время товар не только поставляется, но и хранится — по регламенту.";
  const marketing = analyzeText(text, { genre: "marketing" });
  const legal = analyzeText(text, { genre: "legal" });
  assert.ok(marketing.warnings > legal.warnings, "в legal стилевых замечаний должно быть меньше");
  assert.equal(legal.errors, 0);
});

test("блоки кода исключаются из проверки", () => {
  const text = "Обычный текст.\n```\nutm_source=chatgpt.com\nturn0search3\n```\nЕщё текст.";
  const r = analyzeText(text, { genre: "business" });
  assert.equal(r.errors, 0, "служебные строки в блоке кода не должны считаться артефактами");
});

test("чистый экспертный текст — балл 100, вердикт «чисто»", () => {
  const r = analyzeText("Кран поднимает 8 тонн. Стрела вылетает на 24 метра. Заявку принимаем до 18:00.", { genre: "business" });
  assert.equal(r.errors, 0);
  assert.equal(r.warnings, 0);
  assert.equal(r.score, 100);
  assert.equal(r.verdict, "чисто");
});

test("длинное предложение уходит в ритм (R-01), а не в ошибки", () => {
  const long = `Мы делаем ${Array.from({ length: 50 }, (_, i) => `слово${i}`).join(" ")}.`;
  const r = analyzeText(long, { genre: "business" });
  assert.equal(r.errors, 0);
  assert.ok(codes(r).includes("R-01"), "нет R-01 (длинное предложение)");
});

test("мягкие маркеры (C-13/R-01/R-02) не понижают балл", () => {
  const r = analyzeText("Это текст — с длинным тире. И ещё одно — тоже с тире.", { genre: "business" });
  assert.equal(r.errors, 0);
  assert.ok(r.warnings > 0, "ожидались замечания");
  assert.ok(codes(r).includes("C-13"), "нет C-13 (длинное тире)");
  assert.equal(r.score, 100, "мягкие маркеры не должны понижать балл");
  assert.equal(r.verdict, "чисто");
});

test("ритм не считается по коду (rhythm=false)", () => {
  const code = [
    "const a = 1;",
    "const b = 2;",
    "const c = 3;",
    "const d = 4;",
    "const e = 5;",
    "const f = 6;",
    "const g = 7;",
  ].join("\n");
  const r = analyzeText(code, { genre: "business", rhythm: false });
  assert.equal(r.errors, 0);
  assert.ok(!codes(r).includes("R-01"), "R-01 не должен срабатывать на коде");
  assert.ok(!codes(r).includes("R-02"), "R-02 не должен срабатывать на коде");
});

test("реестры правил непусты и коды корректны ([A-Z]{1,2}-\\d{2})", () => {
  assert.ok(ARTIFACT_RULES.length >= 5, "мало жёстких правил");
  assert.ok(STYLE_RULES.length >= 8, "мало стилевых правил");
  for (const rule of [...ARTIFACT_RULES, ...STYLE_RULES]) {
    assert.match(rule.code, /^[A-Z]{1,2}-\d{2}$/, `${rule.code}: неверный формат кода`);
  }
});

test("линтеры трёх студий зелёные на демо-проектах", () => {
  const cases = [
    ["mini_apps", "projects/timer-app"],
    ["mini_apps", "projects/survey-app"],
    ["mobile_apps", "projects/fitness-tracker"],
    ["mobile_apps", "projects/notes-app"],
    ["web_studio", "projects/dezobrabotka"],
  ];
  for (const [vertical, project] of cases) {
    const res = spawnSync(process.execPath, ["scripts/lint-copy.mjs", project], { cwd: resolve(ROOT, "verticals", vertical), encoding: "utf8" });
    assert.equal(res.status, 0, `${vertical}/${project}: exit ${res.status}\n${res.stdout}${res.stderr}`);
    assert.match(res.stdout, /\[lint-copy\]/, `${vertical}/${project}: нет сводки lint-copy`);
  }
});
