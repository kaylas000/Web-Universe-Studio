/* Крючок перед исполнением: студия «Студия данных», приём «metric-report». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "data_analytics", skill: "metric-report" };
}
