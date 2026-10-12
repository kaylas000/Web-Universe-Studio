/* Крючок перед исполнением: студия «Юридическая студия», приём «dispute-clause». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "legal_docs", skill: "dispute-clause" };
}