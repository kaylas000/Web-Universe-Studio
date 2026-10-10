/* Крючок перед исполнением: студия «Студия мобильных приложений», приём «screen-composer». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mobile_apps", skill: "screen-composer" };
}
