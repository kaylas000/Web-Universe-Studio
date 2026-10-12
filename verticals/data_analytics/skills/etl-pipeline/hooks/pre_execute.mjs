/* Крючок перед исполнением: студия «Студия данных», приём «etl-pipeline». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "data_analytics", skill: "etl-pipeline" };
}