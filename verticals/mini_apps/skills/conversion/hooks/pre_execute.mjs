/* Крючок перед исполнением: приём «conversion». Готовит цели аудита конверсии
   (К-23): главная кнопка Telegram и разметка экрана. */
export default async function preExecute(ctx = {}) {
  return { ...ctx, vertical: "mini_apps", skill: "conversion", targets: ["app/app.js", "app/index.html"] };
}