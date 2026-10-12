/* Крючок после исполнения: фиксирует артефакт приёма «offline-worker». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}