/* Крючок перед исполнением: студия «Студия мобильных приложений», приём «a11y-pass». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mobile_apps", skill: "a11y-pass" };
}
