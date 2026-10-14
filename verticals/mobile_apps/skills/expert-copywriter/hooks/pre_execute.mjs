/* Крючок перед исполнением: приём «expert-copywriter». Готовит цели редактуры текста
   мобильного экрана (REF-17): модуль экрана и манифест приложения. */
export default async function preExecute(ctx = {}) {
  return { ...ctx, vertical: "mobile_apps", skill: "expert-copywriter", targets: ["app/App.mjs", "app/app.json"] };
}
