/* Крючок перед исполнением: студия «Студия данных», приём «sql-audit». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "data_analytics", skill: "sql-audit" };
}
