/* Крючок перед исполнением: студия «Студия мобильных приложений», приём «store-release». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mobile_apps", skill: "store-release" };
}