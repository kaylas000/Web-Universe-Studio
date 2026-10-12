/* Крючок перед исполнением: студия «Юридическая студия», приём «requisites». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "legal_docs", skill: "requisites" };
}