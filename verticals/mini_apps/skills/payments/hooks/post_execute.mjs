/* Крючок после исполнения: фиксирует артефакт приёма «payments». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}