/* Крючок перед исполнением: студия «Студия мини-приложений», приём «a11y-pass». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mini_apps", skill: "a11y-pass" };
}
