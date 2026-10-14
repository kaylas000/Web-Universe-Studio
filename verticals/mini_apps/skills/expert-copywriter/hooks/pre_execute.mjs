/* Крючок перед исполнением: приём «expert-copywriter». Готовит цели редактуры текста
   мини-приложения (REF-16): видимые тексты экрана и скрипта. */
export default async function preExecute(ctx = {}) {
  return { ...ctx, vertical: "mini_apps", skill: "expert-copywriter", targets: ["app/index.html", "app/app.js"] };
}
