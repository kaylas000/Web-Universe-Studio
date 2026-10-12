/* Крючок перед исполнением: студия «Студия мобильных приложений», приём «i18n-pass». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mobile_apps", skill: "i18n-pass" };
}