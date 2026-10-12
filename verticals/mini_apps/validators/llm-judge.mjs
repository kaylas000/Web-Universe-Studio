/* validators/llm-judge.mjs — LLM-критик студии «Студия мини-приложений» (§5.2, §14 ТЗ).
   Тонкая обёртка над штатным ядром core/loop-engine/validators/llm-judge.mjs
   (LlmJudgeValidator): та же рубрика, тот же JSON-вердикт {"score", "reasoning", "fixes"}.

   По умолчанию ВЫКЛЮЧЕН (enabled: false) — приёмка остаётся детерминированной;
   включается через opts.enabled или переменную окружения MINI_APPS_LLM_JUDGE=1.
   Для офлайн-теста ядро можно прогонять с judge-заглушкой (makeMockJudge): модуль
   тогда реально исполняет цикл LlmJudgeValidator «судить → разобрать → оценить». */

import { LlmJudgeValidator } from "../../../core/loop-engine/validators/llm-judge.mjs";

export const DEFAULT_ENABLED = false;

export const RUBRIC = [
  "1. Соответствие: мини-приложение решает ровно задачу брифа (таймер/запись/игра/…).",
  "2. Закон студии: К-01…К-18 (viewport, SDK, theme_params, safe area, оплата, бандл, память).",
  "3. Анти-слоп: нет B-01…B-05 (hover-only, 100vh, location.href, скроллбары, модалки).",
  "4. Квоты: Q-01…Q-05 (бандл, шрифты, изображения, запросы, localStorage).",
  "5. Готовность: app/ можно принять без ручной переработки.",
].join("\n");

/** Детерминированный judge-генератор для офлайн-теста обёртки (не для прод-тира). */
export function makeMockJudge({ score = 1, verdict = "pass", reasoning = "mock-судья: артефакт соответствует закону студии" } = {}) {
  return {
    describe: () => ({ type: "mock" }),
    async generate(prompt, state) {
      return { content: JSON.stringify({ score, verdict, reasoning, fixes: [] }), metadata: { model: "mock" } };
    },
  };
}

/**
 * @param {any} artifact — карта файлов артефакта (или null)
 * @param {Record<string, any>} [opts]  — { enabled, judge, rubric, passThreshold, task, projectName, iteration }
 * @returns {Promise<{ ran: boolean, score: number|null, reason: string, feedback?: any }>}
 */
export async function judge(artifact, opts = {}) {
  const enabled = opts?.enabled ?? process.env.MINI_APPS_LLM_JUDGE === "1";
  if (!enabled) {
    return { ran: false, score: null, reason: "llm_judge выключен (enabled:false) — детерминированные гейты первичны (§5.2)" };
  }
  const judgeGen = opts?.judge ?? null;
  if (!judgeGen || typeof judgeGen.generate !== "function") {
    return { ran: false, score: null, reason: "llm_judge включён, но нет judge-генератора (validator.judge_generator в конфиге цикла)" };
  }
  const validator = new LlmJudgeValidator({
    judge: judgeGen,
    rubric: opts?.rubric ?? RUBRIC,
    passThreshold: opts?.passThreshold ?? 0.8,
  });
  const feedback = await validator.validate(artifact ?? {}, {
    iteration: Number(opts?.iteration ?? 0),
    taskInput: { goal: String(opts?.task ?? "приёмка артефакта студии мини-приложений") },
    projectName: String(opts?.projectName ?? "mini_apps"),
    history: Array.isArray(opts?.history) ? opts.history : [],
  });
  return {
    ran: true,
    score: Number(feedback?.metrics?.score ?? null),
    ok: Boolean(feedback?.ok),
    errors: feedback?.errors ?? [],
    reason: (feedback?.errors ?? []).join("; ") || "вердикт судьи: pass",
  };
}

export default { judge, makeMockJudge, RUBRIC, DEFAULT_ENABLED };