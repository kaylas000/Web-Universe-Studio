/* Крючок перед исполнением: приём «animation-pass». Готовит цель аудита —
   декларации движения экрана (К-25). */
export default async function preExecute(ctx = {}) {
  return { ...ctx, vertical: "mobile_apps", skill: "animation-pass", targets: ["app/src/App.mjs"] };
}