/* Крючок перед исполнением: студия «Образовательная студия», приём «formative-check». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "education", skill: "formative-check" };
}
