/* Крючок после исполнения: фиксирует артефакт студии «Образовательная студия». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}
