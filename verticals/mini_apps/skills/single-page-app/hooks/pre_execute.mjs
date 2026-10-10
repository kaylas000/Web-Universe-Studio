/* Крючок перед исполнением: студия «Студия мини-приложений», приём «single-page-app». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mini_apps", skill: "single-page-app" };
}
