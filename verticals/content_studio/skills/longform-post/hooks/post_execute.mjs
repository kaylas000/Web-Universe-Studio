/* Крючок после исполнения: фиксирует артефакт студии «Контент-студия». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}
