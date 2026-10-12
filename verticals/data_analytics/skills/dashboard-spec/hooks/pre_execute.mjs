/* Крючок перед исполнением: студия «Студия данных», приём «dashboard-spec». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "data_analytics", skill: "dashboard-spec" };
}