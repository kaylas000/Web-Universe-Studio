/* Крючок перед исполнением: приём «motion-pass». Готовит цели аудита движения
   (К-24): стили и скрипт приложения. */
export default async function preExecute(ctx = {}) {
  return { ...ctx, vertical: "mini_apps", skill: "motion-pass", targets: ["app/style.css", "app/app.js"] };
}