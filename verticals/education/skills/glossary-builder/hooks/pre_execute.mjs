/* Крючок перед исполнением: студия «Образовательная студия», приём «glossary-builder». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "education", skill: "glossary-builder" };
}
