/* Крючок перед исполнением: приём «viewport-adaptive» из студии «Студия мини-приложений». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "mini_apps", skill: "viewport-adaptive" };
}