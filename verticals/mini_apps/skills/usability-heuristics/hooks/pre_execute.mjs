/* Крючок перед исполнением: приём «usability-heuristics». Готовит список
   проверяемых эвристик, чтобы прогон был направленным, а не «по всему» (К-22). */

export default async function preExecute(ctx = {}) {
  const heuristics = Array.isArray(ctx.heuristics) && ctx.heuristics.length > 0
    ? ctx.heuristics
    : ["H1-status", "H3-back", "H6-labels", "H7-haptic", "H10-help"];
  return { ...ctx, vertical: "mini_apps", skill: "usability-heuristics", heuristics };
}
