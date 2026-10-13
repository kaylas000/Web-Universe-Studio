/* ЦЕХ · Метаплатформа — generators/studio.mjs
   StudioGenerator: офлайн-генератор артефактов студии (§4.3, P4 ТЗ).

   Зачем: 5 не-веб доменов (§7) должны УМЕТЬ выдавать свой артефакт из брифа, а не
   только валидировать ранее положенные файлы. Генератор берёт шаблоны скилла
   verticals/<name>/skills/<skill>/templates/ и рендерит их в карту файлов артефакта
   (путь = путь шаблона без «.j2»). Это детерминированно, без сети и ключей —
   поэтому работает в CI/гейте наравне с mock.

   Куда пишет: если write_to_project !== false — материализует артефакт прямо в каталог
   проекта (deliverable-папку), чтобы валидатор вертикали (§15) увидел результат в той же
   итерации. Иначе только возвращает артефакт (ядро сохранит его в workspace/out).

   Контракт §4.3 не нарушается: generate(context, state) → Artifact.
*/

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { GeneratorError, createArtifact, getFirst, taskGoal } from "../base.mjs";
import { parseSimpleYaml, readTextOr } from "../config.mjs";
import { renderTemplate } from "../template.mjs";
import { safeResolveInside } from "../text.mjs";

const TEMPLATE_EXT = ".j2";

/** Рекурсивно собирает файлы каталога (posix-относительные пути). */
function walk(dir) {
  /** @type {string[]} */
  const files = [];
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const name of readdirSync(cur).sort()) {
      if (name.startsWith(".")) continue;
      const abs = join(cur, name);
      if (statSync(abs).isDirectory()) stack.push(abs);
      else files.push(abs);
    }
  }
  return files.sort();
}

/** Строит переменные рендера из брифа: строки «Ключ: значение» → vars.key. */
function briefVars(brief) {
  /** @type {Record<string, string>} */
  const vars = {};
  for (const line of String(brief ?? "").split("\n")) {
    const m = line.match(/^\s*([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё-]*)\s*[:：]\s*(.+?)\s*$/u);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

export class StudioGenerator {
  static requires = Object.freeze(["studioRoot", "projectName", "projectDir"]);

  /**
   * @param {Record<string, any>} [opts]
   * @param {string} [opts.skill]           id скилла вертикали (иначе — первый в SKILL-INDEX/каталоге)
   * @param {string} [opts.templatesDir]    переопределить каталог шаблонов
   * @param {string} [opts.output]          подкаталог проекта (иначе — metadata.deliverable из vertical.yaml)
   * @param {boolean} [opts.writeToProject] писать артефакт в проект (по умолчанию true)
   * @param {Record<string, any>} [opts.vars] доп. переменные рендера
   * @param {string|null} [opts.vertical]   слаг вертикали (иначе — basename(studioRoot))
   */
  constructor(opts = {}) {
    this.provider = "studio";
    this.model = String(opts.model ?? "studio-template");
    this.skill = opts.skill ? String(opts.skill) : null;
    this.templatesDir = opts.templatesDir ? String(opts.templatesDir) : null;
    this.output = getFirst(opts, ["output", "output_dir", "outputDir"], null);
    this.writeToProject = getFirst(opts, ["writeToProject", "write_to_project"], true) !== false;
    this.vars = { ...(opts.vars ?? {}) };
    this.vertical = opts.vertical ? String(opts.vertical) : null;
    this.projectDir = opts.projectDir ? resolve(String(opts.projectDir)) : null;
    this.once = getFirst(opts, ["once"], false) === true;
    this._done = false;
  }

  describe() {
    return { provider: "studio", model: this.model, skill: this.skill, writeToProject: this.writeToProject };
  }

  /** Путь к каталогу вертикали (studioRoot — это verticals/<name>). */
  _verticalDir(state) {
    const root = resolve(String(state?.studioRoot ?? this.studioRoot ?? "."));
    return root;
  }

  /** Идентификатор скилла: явный → со своими шаблонами deliverable/ → первый в каталоге. */
  _pickSkill(verticalDir) {
    if (this.skill) return this.skill;
    const skillsDir = join(verticalDir, "skills");
    if (existsSync(skillsDir)) {
      const names = readdirSync(skillsDir)
        .filter((n) => !n.startsWith("_") && n !== "SKILL-INDEX.md" && statSync(join(skillsDir, n)).isDirectory())
        .sort();
      const withDeliverable = names.find((n) => existsSync(join(skillsDir, n, "deliverable")));
      if (withDeliverable) return withDeliverable;
      if (names.length > 0) return names[0];
    }
    throw new GeneratorError(`StudioGenerator: у вертикали нет каталога skills/ (${verticalDir})`, { code: "E-GEN-STUDIO-NO-SKILL" });
  }

  /** Итоговый каталог шаблонов. */
  _resolveTemplates(verticalDir, skill) {
    if (this.templatesDir) return isAbsolute(this.templatesDir) ? this.templatesDir : resolve(verticalDir, this.templatesDir);
    const skillDir = join(verticalDir, "skills", skill);
    const deliverableDir = join(skillDir, "deliverable");
    if (existsSync(deliverableDir)) return deliverableDir;
    return join(skillDir, "templates");
  }

  /** Читает vertical.yaml → { deliverable, title, slug }. */
  _readManifest(verticalDir) {
    const yamlPath = join(verticalDir, "vertical.yaml");
    const text = readTextOr(yamlPath, null);
    if (!text) return {};
    try {
      const parsed = parseSimpleYaml(text) ?? {};
      const meta = parsed.metadata ?? parsed;
      return {
        title: meta.title ?? parsed.name ?? null,
        deliverable: getFirst(meta, ["deliverable"], getFirst(parsed.spec ?? {}, ["deliverable"], "output")),
        slug: getFirst(meta, ["name", "slug"], null),
      };
    } catch {
      return {};
    }
  }

  /**
   * @param {string} context
   * @param {import("../base.mjs").LoopState} state
   */
  async generate(context, state) {
    const verticalDir = this._verticalDir(state);
    if (!existsSync(verticalDir)) throw new GeneratorError(`StudioGenerator: нет каталога вертикали ${verticalDir}`, { code: "E-GEN-STUDIO-NO-VERTICAL" });

    const skill = this._pickSkill(verticalDir);
    const templatesDir = this._resolveTemplates(verticalDir, skill);
    if (!existsSync(templatesDir)) {
      throw new GeneratorError(`StudioGenerator: нет шаблонов скилла «${skill}» (${templatesDir})`, { code: "E-GEN-STUDIO-NO-TEMPLATES" });
    }

    const manifest = this._readManifest(verticalDir);
    const brief = taskGoal(state?.taskInput);
    const vars = {
      brief,
      task: brief,
      goal: brief,
      project: String(state?.projectName ?? "project"),
      vertical: this.vertical ?? manifest.slug ?? verticalDir.split("/").pop(),
      skill,
      iteration: Number(state?.iteration ?? 0) + 1,
      date: new Date().toISOString().slice(0, 10),
      ...briefVars(brief),
      ...this.vars,
    };

    const files = walk(templatesDir);
    /** @type {Record<string, string>} */
    const content = {};
    for (const abs of files) {
      const rel = relative(templatesDir, abs).split("\\").join("/");
      const isTemplate = rel.endsWith(TEMPLATE_EXT);
      const outPath = isTemplate ? rel.slice(0, -TEMPLATE_EXT.length) : rel;
      const raw = readFileSync(abs, "utf8");
      const hasTokens = /\{\{|\{%/.test(raw);
      content[outPath] = isTemplate && hasTokens ? renderTemplate(raw, vars) : raw;
    }
    if (Object.keys(content).length === 0) {
      throw new GeneratorError(`StudioGenerator: шаблоны скилла «${skill}» пусты (${templatesDir})`, { code: "E-GEN-STUDIO-EMPTY" });
    }

    // Материализация в проект (deliverable-папка), если разрешено.
    if (this.writeToProject && this.projectDir) {
      for (const [rel, text] of Object.entries(content)) {
        const dest = safeResolveInside(rel, this.projectDir);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, String(text).endsWith("\n") ? String(text) : `${text}\n`, "utf8");
      }
    }

    const meta = {
      provider: "studio",
      model: this.model,
      skill,
      vertical: vars.vertical,
      iteration: Number(state?.iteration ?? 0),
      temperature: Number(state?.temperature ?? 0),
      files: Object.keys(content).length,
      output: this.output ?? manifest.deliverable ?? null,
      responseFormat: "files",
    };
    if (this.skill && !this.output) delete meta.output;
    return createArtifact(content, meta);
  }
}

export default StudioGenerator;
