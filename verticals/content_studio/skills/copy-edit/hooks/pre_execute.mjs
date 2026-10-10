/* Крючок перед исполнением: студия «Контент-студия», приём «copy-edit». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "content_studio", skill: "copy-edit" };
}
