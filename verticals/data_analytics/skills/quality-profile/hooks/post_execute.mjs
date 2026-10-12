/* Крючок после исполнения: фиксирует артефакт студии «Студия данных». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}
