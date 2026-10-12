/* Крючок перед исполнением: студия «Студия мобильных приложений», приём «offline-queue». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mobile_apps", skill: "offline-queue" };
}