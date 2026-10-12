/* Крючок перед исполнением: студия «Студия мобильных приложений», приём «nav-deeplinks». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mobile_apps", skill: "nav-deeplinks" };
}