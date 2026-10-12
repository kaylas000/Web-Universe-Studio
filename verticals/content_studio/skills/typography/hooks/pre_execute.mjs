/* Крючок перед исполнением: студия «Контент-студия», приём «typography». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "content_studio", skill: "typography" };
}
