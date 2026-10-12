/* Крючок перед исполнением: студия «Образовательная студия», приём «course-syllabus». */
export default async function preExecute(ctx) {
  return { ...ctx, vertical: "education", skill: "course-syllabus" };
}
