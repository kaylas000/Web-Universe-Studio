/* Крючок перед исполнением: студия «Юридическая студия», приём «versioning». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "legal_docs", skill: "versioning" };
}