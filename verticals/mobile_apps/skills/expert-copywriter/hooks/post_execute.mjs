/* Крючок после исполнения: приём «expert-copywriter». Прогоняет движок следов ИИ
   (core/vertical-kit/copywriting.mjs) по текстам артефакта. Ошибки A-xx — жёсткие,
   стиль и ритм — в балл. Без сети и рендера. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { analyzeText } from "../../../../../core/vertical-kit/copywriting.mjs";

function collect(dir, exts) {
  const out = [];
  const walk = (d) => {
    let names;
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === "workspace" || name === "node_modules" || name.startsWith(".")) continue;
      const full = join(d, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (exts.some((e) => name.endsWith(e))) out.push(full);
    }
  };
  walk(dir);
  return out;
}

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  let errors = 0;
  let warnings = 0;
  let score = 100;

  if (existsSync(appDir)) {
    for (const file of collect(appDir, [".html", ".js", ".mjs", ".css", ".md", ".json"])) {
      const res = analyzeText(readFileSync(file, "utf8"), { genre: "product" });
      score = Math.min(score, res.score);
      for (const f of res.findings) {
        if (f.severity === "error") {
          errors += 1;
          violations.push(`${f.code} ${file}:${f.line} — ${f.message}`);
        } else {
          warnings += 1;
        }
      }
    }
  }

  return { ...ctx, done: true, copy_violations: violations, copy_errors: errors, copy_warnings: warnings, copy_score: score, copy_ok: errors === 0 };
}
