/* Крючок перед исполнением: студия «Студия данных», приём «quality-profile». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "data_analytics", skill: "quality-profile" };
}
