/* Тесты контура принуждения: расширения фидбека, отчёт приёмов на артефакте и плато.
   Эти три вещи превращают «цикл как перезапуск» в обучение: модель видит не только код
   отказа, но и приём студии, которым код закрывается; при повторе одних и тех же кодов
   цикл меняет стратегию и температуру, а не переписывает то же место. */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFeedback } from "../base.mjs";
import { renderSkillReport } from "../context-builder.mjs";
import { loadContract } from "../contract.mjs";
import { MockGenerator } from "../generators/mock.mjs";
import { silentLogger } from "../logger.mjs";
import { withSkillEvidence } from "../registry.mjs";
import { UniversalLoopRunner } from "../runner.mjs";
import { ENGINE_ROOT as ROOT } from "./roots.mjs";

const MINI = join(ROOT, "verticals", "mini_apps");

test("createFeedback сохраняет расширения валидатора (repair/skills), а не только коды", () => {
  const feedback = createFeedback({
    ok: false,
    codes: ["V-23"],
    errors: ["конверсия вне норм"],
    repair: { codes: ["V-23"], steps: [{ code: "V-23" }], text: "план" },
    skills: { applied: ["conversion"], hints: [{ code: "V-23", skill: "conversion", hint: "шаг" }] },
    metrics: { len: 3 },
  });
  assert.equal(feedback.ok, false);
  assert.deepEqual(feedback.codes, ["V-23"]);
  assert.equal(feedback.repair.text, "план");
  assert.deepEqual(feedback.skills.applied, ["conversion"]);
  assert.equal(feedback.metrics.len, 3, "метрики не потерялись");
});

test("withSkillEvidence проверяет приёмы студии и привязывает их к кодам отказа", async () => {
  const project = mkdtempSync(join(tmpdir(), "ceh-evidence-"));
  const violated = mkdtempSync(join(tmpdir(), "ceh-evidence-bad-"));
  // артефакт-эталон: приёмы mini_apps выполняются на реальном проекте студии
  const healthy = join(MINI, "projects", "timer-app");
  assert.ok(existsSync(healthy));

  const base = {
    describe: () => ({ type: "stub" }),
    validate: async () => createFeedback({ ok: false, codes: ["V-23", "V-11"], errors: ["конверсия вне норм (К-23)", "мелкие тач-таргеты (К-11)"] }),
  };
  const wrapped = withSkillEvidence(base, { studioRoot: MINI, projectDir: healthy, logger: silentLogger });
  const feedback = await wrapped.validate({}, { projectDir: healthy });

  assert.equal(feedback.ok, false, "вердикт остаётся за студией");
  assert.ok(feedback.metrics.skills.checked >= 8, `проверено приёмов: ${feedback.metrics.skills.checked}`);
  assert.ok(feedback.skills, "отчёт приёмов добавлен");
  const hinted = new Set(feedback.skills.hints.map((h) => h.code));
  assert.ok(hinted.has("V-23"), "нарушенный код получил приём");
  const hint = feedback.skills.hints.find((h) => h.code === "V-23");
  assert.ok(hint.hint.length > 5, "подсказка — это шаг приёма, а не пустая строка");
  assert.ok(existsSync(project));
  assert.ok(existsSync(violated));

  // тот же приём на пустом каталоге ничего не выдумывает
  const empty = withSkillEvidence(base, { studioRoot: MINI, projectDir: project, logger: silentLogger });
  const emptyFeedback = await empty.validate({}, { projectDir: project });
  assert.equal(emptyFeedback.skills, undefined, "нет артефакта — нет отчёта");
});

test("renderSkillReport: применено / нарушено / не применено / подсказки", () => {
  const text = renderSkillReport({
    applied: ["a11y-pass", "conversion"],
    violated: [{ skill: "forms", findings: 2 }],
    notApplied: [{ skill: "crop", missing: ["object-fit"] }],
    hints: [{ code: "V-23", skill: "conversion", hint: "одна первая кнопка" }],
  });
  assert.match(text, /ПРИЁМЫ СТУДИИ НА АРТЕФАКТЕ/);
  assert.match(text, /применено \(2\): a11y-pass, conversion/);
  assert.match(text, /нарушено: forms — находок 2/);
  assert.match(text, /не применено: crop — нет признака \/object-fit\//);
  assert.match(text, /V-23 → приём «conversion»: одна первая кнопка/);
  assert.equal(renderSkillReport(null), "");
});

test("цикл замечает плато: те же коды дважды → смена стратегии и надбавка температуры", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-plateau-"));
  const seen = [];
  const validator = {
    describe: () => ({ type: "stub" }),
    validate: async () => createFeedback({ ok: false, codes: ["V-11", "V-23"], errors: ["те же ошибки"] }),
  };
  const contextBuilder = {
    describe: () => ({ type: "spy" }),
    build(task, state) {
      seen.push({ iteration: state.iteration, temperature: state.temperature, plateau: state.lastFeedback?.plateau ?? null });
      return `TASK=${task}`;
    },
  };
  const runner = new UniversalLoopRunner({
    config: { maxIterations: 3, temperatureSchedule: [0.2], contextCharLimit: 2000, persistIterations: false },
    generator: new MockGenerator({}),
    validator,
    contextBuilder,
    logger: silentLogger,
    workspaceDir: dir,
    studioRoot: MINI,
  });

  const result = await runner.run("проверка плато", MINI, "plateau");
  assert.equal(result.ok, false);
  assert.equal(seen.length, 3);
  assert.equal(seen[0].plateau, null, "первый провал — не плато: он ещё не повтор");
  assert.equal(seen[1].plateau, null, "плато видно следующей попытке, а не той, что провалилась");
  assert.ok(seen[2].plateau, "третий заход идёт уже с пометкой плато");
  assert.equal(seen[2].plateau.repeats, 1);
  assert.match(seen[2].plateau.strategy, /смени приём/);
  assert.ok(seen[2].temperature > seen[1].temperature, `температура должна расти: ${seen[1].temperature} → ${seen[2].temperature}`);
  assert.equal(result.feedback.codes.sort().join(","), "V-11,V-23", "цикл вернул те же коды — плато зафиксировано в фидбеке");
});

test("провальный прогон возвращает наименее сломанную попытку, а не последнюю", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-best-"));
  let call = 0;
  const validator = {
    describe: () => ({ type: "stub" }),
    validate: async () => {
      call += 1;
      // 1-я попытка: три кода; 2-я: два; 3-я: три — лучше всех вторая
      const codes = call === 2 ? ["V-11", "V-23"] : ["V-11", "V-20", "V-23"];
      return createFeedback({ ok: false, codes, errors: [`попытка ${call}`] });
    },
  };
  const contextBuilder = { describe: () => ({ type: "spy" }), build: () => "CTX" };
  const runner = new UniversalLoopRunner({
    config: { maxIterations: 3, temperatureSchedule: [0.2], contextCharLimit: 2000, persistIterations: false, plateauEscalation: false },
    generator: new MockGenerator({}),
    validator,
    contextBuilder,
    logger: silentLogger,
    workspaceDir: dir,
    studioRoot: MINI,
  });

  const result = await runner.run("лучшая попытка", MINI, "best");
  assert.equal(result.ok, false);
  assert.equal(result.bestIteration, 2, "вернулась вторая попытка — у неё меньше кодов");
  assert.deepEqual(result.feedback.codes.sort(), ["V-11", "V-23"]);
  assert.ok(result.artifact, "артефакт лучшей попытки отдан наружу");
});

test("контракт студии отдаёт приёмы с шагами и признаками (модель видит «как», а не только «что»)", () => {
  const contract = loadContract(MINI);
  const conversion = contract.skills.find((s) => s.id === "conversion");
  assert.ok(conversion, "приём conversion в контракте");
  assert.equal(conversion.executable, true, "исполнимый: есть skill.yaml, шаблоны и крючки");
  assert.ok(conversion.steps.length >= 3, `шагов: ${conversion.steps.length}`);
  assert.ok(conversion.evidence.require.length >= 1, "объявлены проверяемые признаки");
  assert.ok(contract.stats.codes >= 50);
});
