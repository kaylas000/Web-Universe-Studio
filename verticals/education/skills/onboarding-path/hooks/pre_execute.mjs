/* Крючок перед исполнением: студия «Образовательная студия», приём «onboarding-path». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "education", skill: "onboarding-path" };
}
