/* Крючок перед исполнением: приём «payments» из студии «Студия мини-приложений». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mini_apps", skill: "payments" };
}