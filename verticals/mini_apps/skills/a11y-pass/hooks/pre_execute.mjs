/* Крючок перед исполнением: приём «a11y-pass». Готовит список целей аудита
   (интерактивные элементы артефакта), чтобы скан был направленным, а не «по всему». */

export default async function preExecute(ctx = {}) {
  const targets = Array.isArray(ctx.audit_targets) && ctx.audit_targets.length > 0
    ? ctx.audit_targets
    : ["header", "main", "button", "input", "select", "a[href]"];
  return { ...ctx, vertical: "mini_apps", skill: "a11y-pass", audit_targets: targets };
}