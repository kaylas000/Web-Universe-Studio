/* Крючок перед исполнением: студия «Контент-студия», приём «seo-meta». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "content_studio", skill: "seo-meta" };
}
