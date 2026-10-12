/* Крючок перед исполнением: студия «Студия данных», приём «schema-validate». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "data_analytics", skill: "schema-validate" };
}
