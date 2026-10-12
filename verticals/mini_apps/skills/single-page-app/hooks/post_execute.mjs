/* Крючок после исполнения: фиксирует результат приёма — что собрано в app/ и
   какие отчёты приёмки (V-04/V-08/V-17) обязаны лежать рядом с кодом. */

import { existsSync } from "node:fs";
import { join } from "node:path";

const REPORTS = ["bundle-size.json", "lighthouse.json", "devices-report.json"];

export default async function postExecute(ctx = {}) {
  const dir = ctx.deliverable_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const reports = {};
  for (const name of REPORTS) reports[name] = Boolean(dir && existsSync(join(dir, name)));
  return {
    ...ctx,
    done: true,
    deliverable_reports: reports,
    all_reports: REPORTS.every((name) => reports[name]),
  };
}