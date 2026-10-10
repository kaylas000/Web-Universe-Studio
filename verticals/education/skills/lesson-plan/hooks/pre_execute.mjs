/* Крючок перед исполнением: студия «Образовательная студия», приём «lesson-plan». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "education", skill: "lesson-plan" };
}
