/* Крючок перед исполнением: приём «single-page-app» студии мини-приложений.
   Добавляет в контекст закон студии (К-01…К-21) и инфраструктуру выполнения,
   чтобы генератор не начинал «с чистого листа». */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export default async function preExecute(ctx = {}) {
  const studioRoot = ctx.studioRoot ?? process.cwd();
  let law = null;
  try {
    law = readFileSync(join(studioRoot, "CONSTITUTION.md"), "utf8").slice(0, 4000);
  } catch {
    law = null;
  }
  return {
    ...ctx,
    vertical: "mini_apps",
    skill: "single-page-app",
    deliverable: "app",
    viewports: ["320", "375", "420"],
    law,
  };
}