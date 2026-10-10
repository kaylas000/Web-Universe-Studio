/* ЦЕХ · Universal Loop Engine — protocols.mjs
   Протоколы взаимодействия (§5 ТЗ) и стандарт кодов/severity (§6 ТЗ).

   Ядро не знает о внутренней кухне студии: связь — через строгие контракты со
   СТРУКТУРНОЙ типизацией (наследование не требуется). Здесь — typedef-документация,
   лёгкие фабрики и проверки форм.

   Публичный API:
     ERR                      — префиксы кодов (§6.1)
     SEVERITY                 — уровни серьёзности
     defineVertical(spec)     — валидирует и возвращает IVertical-совместимый объект
     defineGate(spec)         — валидирует и возвращает IVerificationGate-совместимый объект
     defineTool(spec)         — валидирует и возвращает ITool-совместимый объект
     isVertical / isVerificationGate / isTool — структурные проверки
     validationError(input)   — нормализует объект ошибки (§6.3)
     verificationResult(input)— нормализует VerificationResult
     toAgentFeedback(result, meta) — VerificationResult → фидбек агенту (§6.3)
*/

/** Префиксы кодов ошибок и их области (§6.1 ТЗ). */
export const ERR = Object.freeze({
  V: { prefix: "V", scope: "vertical", meaning: "конституция" },
  B: { prefix: "B", scope: "vertical", meaning: "anti-slop: запрещённый паттерн" },
  Q: { prefix: "Q", scope: "vertical", meaning: "anti-slop: квота" },
  C: { prefix: "C", scope: "vertical", meaning: "чек-лист гейта" },
  A: { prefix: "A", scope: "vertical", meaning: "артефакт" },
  R: { prefix: "R", scope: "vertical", meaning: "отклонение арт-директором" },
  M: { prefix: "M", scope: "platform", meaning: "маркетинг/редполитика" },
  E: { prefix: "E", scope: "platform", meaning: "движок/рантайм" },
  S: { prefix: "S", scope: "platform", meaning: "sandbox/код" },
  L: { prefix: "L", scope: "platform", meaning: "цикл" },
  J: { prefix: "J", scope: "platform", meaning: "LLM-judge" },
});

/** Уровни серьёзности нарушения (§5.2, §6.3). */
export const SEVERITY = Object.freeze({ CRITICAL: "critical", MAJOR: "major", MINOR: "minor" });

/** Область кода по его префиксу: 'vertical' | 'platform' | null. */
export function codeScope(code) {
  const prefix = String(code ?? "").trim().charAt(0).toUpperCase();
  const entry = ERR[prefix];
  return entry ? entry.scope : null;
}

/**
 * @typedef {Object} ValidationError
 * @property {string} code
 * @property {'critical'|'major'|'minor'} severity
 * @property {string} description
 * @property {?string} location
 * @property {string} suggestion
 * @property {?string} fixExample
 */

/** Нормализует объект нарушения (§6.3). Принимает краткую форму ('V-01', 'текст'). */
export function validationError(input) {
  if (typeof input === "string") {
    const m = input.match(/^\s*([A-Z]{1,2}-\d{2,})\s+(.*)$/);
    if (m) return { code: m[1], severity: SEVERITY.MAJOR, description: m[2].trim(), location: null, suggestion: "", fixExample: null };
    return { code: "E-VAL", severity: SEVERITY.MAJOR, description: input.trim(), location: null, suggestion: "", fixExample: null };
  }
  const e = input ?? {};
  const severity = [SEVERITY.CRITICAL, SEVERITY.MAJOR, SEVERITY.MINOR].includes(e.severity) ? e.severity : SEVERITY.MAJOR;
  return {
    code: String(e.code ?? "E-VAL"),
    severity,
    description: String(e.description ?? e.message ?? ""),
    location: e.location ?? null,
    suggestion: String(e.suggestion ?? ""),
    fixExample: e.fixExample ?? e.fix_example ?? null,
  };
}

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} passed
 * @property {ValidationError[]} errors
 * @property {ValidationError[]} warnings
 * @property {Object} metrics
 */

/** Нормализует результат гейта: passed выводится из errors, формы приводятся к §5.2. */
export function verificationResult(input = {}) {
  const errors = (input.errors ?? []).map(validationError);
  const warnings = (input.warnings ?? []).map(validationError);
  const passed = typeof input.passed === "boolean" ? input.passed && errors.length === 0 : errors.length === 0;
  return { passed, errors, warnings, metrics: input.metrics ?? {} };
}

/** Структурная проверка IVertical (§5.1). */
export function isVertical(v) {
  if (!v || typeof v !== "object") return false;
  return (
    typeof v.name === "string" &&
    typeof v.getSkills === "function" &&
    typeof v.getTools === "function" &&
    typeof v.getVerificationGates === "function" &&
    typeof v.getDefaultSkill === "function" &&
    typeof v.run === "function"
  );
}

/** Структурная проверка IVerificationGate (§5.2). */
export function isVerificationGate(g) {
  return Boolean(g) && typeof g === "object" && typeof g.name === "string" && typeof g.verify === "function";
}

/** Структурная проверка ITool (§5.3). */
export function isTool(t) {
  return Boolean(t) && typeof t === "object" && typeof t.name === "string" && typeof t.execute === "function";
}

function assert(cond, message, code) {
  if (!cond) {
    const err = new Error(message);
    err.code = code;
    err.name = "ProtocolError";
    throw err;
  }
}

/** Собирает IVertical-совместимый объект из частей; недостающее добивается заглушками. */
export function defineVertical(spec = {}) {
  const skills = spec.skills ?? [];
  const tools = spec.tools ?? [];
  const gates = spec.gates ?? {};
  const vertical = {
    name: String(spec.name ?? ""),
    description: String(spec.description ?? ""),
    getSkills: () => skills.map((s) => (typeof s === "string" ? s : s.id ?? s.name)),
    getTools: () => [...tools],
    getVerificationGates: () => ({ ...gates }),
    loadReferences: spec.loadReferences ?? (() => []),
    getDefaultSkill: () => (typeof spec.defaultSkill === "function" ? spec.defaultSkill() : spec.defaultSkill ?? (skills[0] ? (typeof skills[0] === "string" ? skills[0] : skills[0].id ?? skills[0].name) : null)),
    run: spec.run ?? (async () => { throw new Error("IVertical.run не реализован"); }),
  };
  assert(isVertical(vertical), "объект не совместим с IVertical", "E-PROTOCOL-VERTICAL");
  return vertical;
}

/** Собирает IVerificationGate-совместимый объект; verify приводится к VerificationResult. */
export function defineGate(spec = {}) {
  const gate = {
    name: String(spec.name ?? ""),
    verify: async (artifact, context) => verificationResult(await spec.verify(artifact, context)),
  };
  assert(isVerificationGate(gate), "объект не совместим с IVerificationGate", "E-PROTOCOL-GATE");
  assert(typeof spec.verify === "function", `гейт «${gate.name}» без verify`, "E-PROTOCOL-GATE");
  return gate;
}

/** Собирает ITool-совместимый объект. */
export function defineTool(spec = {}) {
  const tool = { name: String(spec.name ?? ""), description: String(spec.description ?? ""), execute: spec.execute ?? (async () => undefined) };
  assert(isTool(tool), "объект не совместим с ITool", "E-PROTOCOL-TOOL");
  return tool;
}

/** VerificationResult → фидбек агенту (§6.3): errors + метаданные прогона. */
export function toAgentFeedback(result, meta = {}) {
  const r = verificationResult(result);
  return {
    passed: r.passed,
    errors: r.errors,
    iterations_used: meta.iterationsUsed ?? 0,
    budget_used_usd: meta.budgetUsedUsd ?? 0,
  };
}
