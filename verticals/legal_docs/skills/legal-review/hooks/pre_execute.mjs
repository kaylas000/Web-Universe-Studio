/* Крючок перед исполнением: студия «Юридическая студия», приём «legal-review». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "legal_docs", skill: "legal-review" };
}
