/* Крючок перед исполнением: студия «Юридическая студия», приём «contract-draft». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "legal_docs", skill: "contract-draft" };
}
