/* Крючок перед исполнением: студия «Контент-студия», приём «link-audit». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "content_studio", skill: "link-audit" };
}
