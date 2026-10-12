/* Крючок перед исполнением: студия «Юридическая студия», приём «pdn-compliance». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "legal_docs", skill: "pdn-compliance" };
}