/* Крючок после исполнения: фиксирует артефакт студии «Юридическая студия». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}
