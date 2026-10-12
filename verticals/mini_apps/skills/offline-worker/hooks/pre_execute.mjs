/* Крючок перед исполнением: приём «offline-worker» из студии «Студия мини-приложений». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mini_apps", skill: "offline-worker" };
}