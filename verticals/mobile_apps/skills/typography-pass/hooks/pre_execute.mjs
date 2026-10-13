/* Крючок перед исполнением: приём «typography-pass». Готовит цель аудита —
   рендер-разметку экрана (К-24). */
export default async function preExecute(ctx = {}) {
  return { ...ctx, vertical: "mobile_apps", skill: "typography-pass", targets: ["app/src/App.mjs"] };
}