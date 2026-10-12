/* Крючок после исполнения: фиксирует артефакт приёма «viewport-adaptive». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}