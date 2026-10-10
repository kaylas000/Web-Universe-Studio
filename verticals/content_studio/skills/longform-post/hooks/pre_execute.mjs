/* Крючок перед исполнением: студия «Контент-студия», приём «longform-post». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "content_studio", skill: "longform-post" };
}
