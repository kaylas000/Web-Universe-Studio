/* Крючок перед исполнением: студия «Контент-студия», приём «cta-analytics». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "content_studio", skill: "cta-analytics" };
}
