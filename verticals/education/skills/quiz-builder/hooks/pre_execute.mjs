/* Крючок перед исполнением: студия «Образовательная студия», приём «quiz-builder». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "education", skill: "quiz-builder" };
}
