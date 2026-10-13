/* Крючок перед исполнением: приём «usability-heuristics». Готовит список
   проверяемых эвристик, чтобы прогон был направленным (К-23). */

export default async function preExecute(ctx = {}) {
  const heuristics = Array.isArray(ctx.heuristics) && ctx.heuristics.length > 0
    ? ctx.heuristics
    : ["H1-status", "H3-back", "H5-retry", "H6-labels", "H10-help"];
  return { ...ctx, vertical: "mobile_apps", skill: "usability-heuristics", heuristics };
}