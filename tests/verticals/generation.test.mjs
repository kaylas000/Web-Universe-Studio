/* ЦЕХ · Метаплатформа — tests/verticals/generation.test.mjs
   Проверяет P4 ТЗ: студия умеет СГЕНЕРИРОВАТЬ артефакт из брифа, а не только
   валидировать ранее положенные файлы. Для каждой вертикали с шаблонами
   `skills/<skill>/deliverable/`:
     1) StudioGenerator рендерит артефакт в пустой временный проект;
     2) `scripts/validate.mjs` (V-xx этой студии) принимает сгенерированное.

   Офлайн, детерминированно, без сети и ключей — как и весь гейт (§15 ТЗ).
*/

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createLoopState } from "../../core/loop-engine/base.mjs";
import { StudioGenerator } from "../../core/loop-engine/generators/studio.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERTICALS = join(ROOT, "verticals");

/** Вертикали с шаблонами генератора. */
function verticalsWithDeliverableTemplates() {
  return readdirSync(VERTICALS)
    .filter((name) => !name.startsWith("_"))
    .map((name) => join(VERTICALS, name))
    .filter((dir) => statSync(dir).isDirectory())
    .filter((dir) => {
      const skills = join(dir, "skills");
      if (!existsSync(skills)) return false;
      return readdirSync(skills).some((s) => existsSync(join(skills, s, "deliverable")));
    });
}

const VERTICAL_DIRS = verticalsWithDeliverableTemplates();

test("P4: каждая студия генерирует артефакт, который проходит свой validate", async () => {
  assert.ok(VERTICAL_DIRS.length > 0, "нет ни одной вертикали с шаблонами генератора");
  for (const verticalDir of VERTICAL_DIRS) {
    const slug = verticalDir.split("/").pop();
    const projectDir = mkdtempSync(join(tmpdir(), `gen-${slug}-`));
    try {
      const generator = new StudioGenerator({ projectDir, vertical: slug });
      const state = createLoopState({
        studioRoot: verticalDir,
        projectName: `gen-${slug}`,
        taskInput: `сгенерировать артефакт студии ${slug} по брифу`,
      });
      const artifact = await generator.generate("контекст", state);
      assert.ok(artifact && typeof artifact.content === "object", `${slug}: генератор не вернул карту файлов`);
      assert.ok(Object.keys(artifact.content).length > 0, `${slug}: пустой артефакт`);

      // Приёмка сгенерированного артефакта штатным валидатором студии.
      const out = execFileSync(process.execPath, ["scripts/validate.mjs", projectDir], {
        cwd: verticalDir,
        encoding: "utf8",
      });
      assert.match(out, /ИТОГ: \d+\/\d+ · exit 0/, `${slug}: приёмка сгенерированного артефакта не прошла\n${out}`);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }
});
