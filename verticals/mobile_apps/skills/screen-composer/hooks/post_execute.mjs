/* Крючок после исполнения: фиксирует артефакт студии «Студия мобильных приложений». */
export default async function postExecute(ctx) {
  return { ...ctx, done: true };
}
