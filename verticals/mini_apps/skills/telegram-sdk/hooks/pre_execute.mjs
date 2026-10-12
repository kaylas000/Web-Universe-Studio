/* Крючок перед исполнением: студия «Студия мини-приложений», приём «telegram-sdk». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mini_apps", skill: "telegram-sdk" };
}
