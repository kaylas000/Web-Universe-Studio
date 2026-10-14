/* ЦЕХ · Universal Loop Engine — gates.mjs
   Стадии цикла как исполняемые ворота: `gates/G1-direction.md … G4-final.md` перестают быть
   памяткой и становятся проверками.

   Зачем модуль. Закон студии требует проходить стадии (G1 направление → G2 структура →
   G3 движение → G4 финал), но чек-листы стадий читал только человек: валидатор проверял
   артефакт «постфактум», а половина требований стадии видна только на её входе (сколько
   референсов процитировано, откуда взята палитра, есть ли раздел «ЧЕМ ЭТО НЕ»).

   Как это работает:
     • в чек-листе рядом с пунктом стоит машинная реализация — инлайновая спека `` `@check kind …` ``;
     • пункт без спеки считается человеческим и честно показывается как «судит арт-директор»;
     • код правила берётся из самого пункта («(Q-03)», «V-01…V-10») — поэтому покрытие стадий
       видно и в аудите контракта: код, закрытый стадией, больше не «висит без приёма».

   Публичный API:
     loadGates(studioRoot)                     → { gates: [...], codeMap: Map<код, стадия> }
     runGate(gate, {studioRoot, projectDir})   → { id, passed, checks: [...], codes: [...] }
     runGates(studioRoot, projectDir, opts)    → прогон всех стадий проекта
     describeGate(gate)                        → строка для отчёта/промпта

   Трёхзначный результат на каждый пункт: true — выполнено, false — нарушено, null — «человек»
   (нет спеки). Ворота проходят, когда нет ни одного false: непроверенное не выдаётся за приёмку.
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseSimpleYaml } from "./config.mjs";

/** Каталог с документами стадий и маска файла. */
const GATES_DIR = "gates";

/** Сколько пунктов максимум сканируем в проекте (защита от гигантских деревьев). */
const SCAN_LIMIT = 400;

function readText(path) {
  try {
    return statSync(path).isFile() ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

/** Собирает файлы проекта (без служебных каталогов) — для проверок вида «есть ли признак». */
function projectFiles(projectDir, extensions = [".css", ".html", ".js", ".mjs", ".json", ".md", ".txt"]) {
  const out = [];
  const stack = [projectDir];
  while (stack.length > 0 && out.length < SCAN_LIMIT) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "workspace") continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (extensions.includes(abs.slice(abs.lastIndexOf(".")).toLowerCase())) out.push(abs);
    }
  }
  return out;
}

function joinTexts(projectDir, files) {
  return files.map((file) => readText(file) ?? "").join("\n");
}

/* ————————————————————— разбор документов стадий ————————————————————— */

/**
 * Коды правил в тексте пункта чек-листа: «(Q-03)», «(B-03, B-04…)», «V-01…V-10», «(К-05)».
 * Диапазон разворачивается: V-01…V-10 → V-01, V-02, … V-10.
 */
export function parseCodes(text) {
  const codes = new Set();
  const range = /([A-ZА-Я]{1,2})-(\d{2})\s*(?:…|\.\.\.|-)\s*(?:[A-ZА-Я]{1,2}-)?(\d{2})/g;
  let cleaned = String(text);
  for (const match of cleaned.matchAll(range)) {
    const from = Number(match[2]);
    const to = Number(match[3]);
    for (let n = from; n <= to; n += 1) codes.add(`${match[1]}-${String(n).padStart(2, "0")}`);
  }
  cleaned = cleaned.replace(range, " ");
  // Границы выражаем lookaround'ами: \b не знает кириллицы, а коды студии — «К-05», «B-17».
  for (const match of cleaned.matchAll(/(?<![0-9A-Za-zА-Яа-я])([A-ZА-Я]{1,2})-(\d{2})(?![0-9A-Za-zА-Яа-я])/g)) {
    codes.add(`${match[1]}-${match[2]}`);
  }
  return [...codes];
}

/** Разбирает параметры спеки: `min=3 from=references` → {min: "3", from: "references"}. */
function parseParams(text) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const token of String(text).trim().split(/\s+/)) {
    const eq = token.indexOf("=");
    if (eq === -1) out[token] = "true";
    else out[token.slice(0, eq)] = token.slice(eq + 1);
  }
  return out;
}

/**
 * Разбирает один документ стадии. Пункт чек-листа — нумерованная строка; машинная реализация
 * объявляется следующей строкой в обратных кавычках: `` `@check kind param=value` ``.
 * @returns {{id: string, title: string, goal: string, input: string, artifact: string, refusal: string, checks: any[], path: string}|null}
 */
export function parseGateDocument(markdown, { id = "", path = "" } = {}) {
  const text = String(markdown ?? "");
  if (!text.trim()) return null;
  const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? id;
  // Секция документа: от заголовка «## Имя» до следующего «## » или конца файла.
  // Через регулярку с ленивым хвостом нельзя: `\\s*$` с флагом m срабатывает на первом же переводе строки.
  const section = (name) => {
    const parts = text.split(/\n(?=##\s)/);
    const found = parts.find((part) => new RegExp(`^##\\s+${name}\\s*$`, "m").test(part.split("\n")[0]));
    return found ? found.split("\n").slice(1).join("\n").trim() : "";
  };
  const checklist = section("Чек-лист");

  /** @type {any[]} */
  const checks = [];
  const lines = checklist.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const item = /^(\d+)\.\s+(.*)$/.exec(lines[i].trim());
    if (!item) continue;
    const n = Number(item[1]);
    const body = item[2].trim();
    // спека может стоять на следующей строке или в конце пункта
    let specText = /`@check\s+(.+?)`/.exec(body)?.[1] ?? null;
    let specLine = null;
    if (specText === null && lines[i + 1] && /`@check\s+/.test(lines[i + 1])) {
      specLine = lines[i + 1];
      specText = /`@check\s+(.+?)`/.exec(specLine)?.[1] ?? null;
    }
    const [kind, ...rest] = specText ? specText.trim().split(/\s+/) : [];
    checks.push({
      n,
      text: body.replace(/`@check[^`]*`/g, "").trim(),
      codes: parseCodes(body + " " + (specLine ?? "")),
      human: !specText,
      spec: specText ? { kind, params: parseParams(rest.join(" ")) } : null,
    });
  }

  return {
    id: id || basename(path).split("-")[0],
    title,
    goal: section("Цель"),
    input: section("Вход"),
    artifact: section("Выходной артефакт"),
    refusal: section("Критерии отказа"),
    checks,
    path,
  };
}

/**
 * Читает все стадии студии. Порядок стадий берётся из `vertical.yaml` (`gates: [G1, G2, G3, G4]`),
 * поэтому документы и объявление цикла не могут разойтись.
 * @param {string} studioRoot
 */
export function loadGates(studioRoot) {
  const root = resolve(String(studioRoot));
  const verticalYaml = parseSimpleYaml(readText(join(root, "vertical.yaml")) ?? "") ?? {};
  const declaredRaw = verticalYaml.gates ?? verticalYaml.spec?.gates ?? verticalYaml.metadata?.gates ?? [];
  const declared = Array.isArray(declaredRaw) ? declaredRaw.map(String) : [];
  const dir = join(root, GATES_DIR);
  const available = existsSync(dir)
    ? readdirSync(dir).filter((name) => /^G\d+.*\.md$/.test(name)).sort()
    : [];

  /** @type {any[]} */
  const gates = [];
  for (const file of available) {
    const id = file.split("-")[0].replace(/\.md$/, "");
    if (declared.length > 0 && !declared.includes(id)) continue;
    const gate = parseGateDocument(readText(join(dir, file)) ?? "", { id, path: join(dir, file) });
    if (gate) gates.push(gate);
  }
  // стадии, объявленные в vertical.yaml, но без документа — это дрейф, о нём сообщаем отдельно
  const missing = declared.filter((id) => !gates.some((gate) => gate.id === id));

  /** @type {Map<string, string>} */
  const codeMap = new Map();
  for (const gate of gates) {
    for (const check of gate.checks) {
      for (const code of check.codes) if (!codeMap.has(code)) codeMap.set(code, gate.id);
    }
  }
  return { gates, missing, declared, dir, codeMap };
}

/* ————————————————————— проверки ————————————————————— */

const count = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const list = (value) => String(value ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Палитра проекта из DIRECTION.md — «#RRGGBB» в порядке появления. */
function paletteOf(projectDir) {
  const direction = readText(join(projectDir, "DIRECTION.md")) ?? "";
  const found = [];
  for (const match of direction.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const hex = match[0].toUpperCase();
    if (!found.includes(hex)) found.push(hex);
  }
  return found;
}

/** Палитры архива референсов студии: [{id, colors: [...]}]. */
function referencePalettes(studioRoot) {
  const refsDir = join(studioRoot, "references");
  const out = [];
  const stack = [refsDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!entry.name.endsWith(".meta.yaml")) continue;
      const text = readText(abs) ?? "";
      const palette = /palette:\s*\[([^\]]*)\]/.exec(text)?.[1] ?? "";
      out.push({ id: basename(entry.name).replace(".meta.yaml", ""), colors: (palette.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toUpperCase()) });
    }
  }
  return out;
}

/** Относительная яркость и насыщенность цвета в HSL — для «вне AI-диапазона». */
function hueOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation: saturation * 100 };
}

/** Все рецепты движения студии (каталог motion/recipes/<имя>). */
function recipes(studioRoot) {
  const dir = join(studioRoot, "motion", "recipes");
  let names = [];
  try {
    names = readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
  } catch {
    names = [];
  }
  return names.map((name) => {
    const text = readText(join(dir, name, "recipe.yaml")) ?? "";
    const dont = /dont_combine_with:\s*\[([^\]]*)\]/.exec(text)?.[1] ?? "";
    return { name, dontCombineWith: list(dont) };
  });
}

/** Рецепты, названные в документе (по именам каталогов registry). */
function citedRecipes(studioRoot, text) {
  const names = recipes(studioRoot).map((r) => r.name);
  return names.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
}

/** Нумерованные секции документа («## 01 Имя», «## 02 · Имя»): мета-разделы вроде
    «## Источники структуры» — не секции, у них нет ни источника, ни ответа на вопрос брифа. */
function sectionsOf(text) {
  return text
    .split(/\n##\s+/)
    .slice(1)
    .filter((block) => /^\d+[\s.·—-]/.test(block))
    .map((block) => block.trim());
}

/** Запуск скрипта студии: возвращает {ok, output}. */
function runStudioScript(studioRoot, script, projectRel, timeoutMs = 120000) {
  try {
    const output = execFileSync(process.execPath, [join("scripts", script), projectRel], {
      cwd: studioRoot,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });
    return { ok: true, output };
  } catch (error) {
    return { ok: false, output: `${error?.stdout ?? ""}${error?.stderr ?? ""}` };
  }
}

/**
 * Машинная реализация пункта чек-листа.
 * @returns {{ok: boolean|null, detail: string}}
 */
async function runCheck(check, ctx) {
  const { studioRoot, projectDir, projectName } = ctx;
  const params = check.spec?.params ?? {};
  const kind = check.spec?.kind;
  const css = projectFiles(projectDir, [".css", ".html", ".js"]).map((f) => readText(f) ?? "").join("\n");
  const direction = readText(join(projectDir, "DIRECTION.md")) ?? "";
  const sources = readText(join(projectDir, "SOURCES.md")) ?? "";
  const structure = readText(join(projectDir, "STRUCTURE.md")) ?? "";
  const seed = readText(join(projectDir, "SEED.md")) ?? "";

  switch (kind) {
    /* ——— G1: направление ——— */
    case "refs-takeaway": {
      const min = count(params.min, 3);
      const refs = [...new Set((direction.match(/references\/[\w.\-/]+\.meta\.yaml/g) ?? []).map(String))];
      // ссылка может быть и от студии (`references/...`), и от проекта — проверяем оба основания
      const existing = refs.filter((rel) => existsSync(join(studioRoot, rel)) || existsSync(join(projectDir, rel)));
      const quotes = (direction.match(/takeaway/gi) ?? []).length;
      const ok = existing.length >= min && quotes >= min;
      return { ok, detail: `референсов ${existing.length}/${min} (существуют), цитат takeaway ${quotes}/${min}` };
    }
    case "palette": {
      const min = count(params.min, 3);
      const hexes = paletteOf(projectDir);
      const palettes = referencePalettes(studioRoot);
      const archive = new Set(palettes.flatMap((p) => p.colors));
      const fromArchive = hexes.filter((hex) => archive.has(hex));
      // AI-диапазон: холодный сине-фиолетовый при заметной насыщенности — примета «сделано нейросетью»
      const [aiFrom, aiTo] = String(params.ai ?? "220-260").split("-").map(Number);
      const aiLimit = count(params["ai-max"], 0);
      const aiHits = hexes.filter((hex) => {
        const { hue, saturation } = hueOf(hex);
        return hue >= aiFrom && hue <= aiTo && saturation > 25;
      });
      // отпечаток: палитра + шрифты. Два проекта студии не имеют права совпасть (К-14).
      const fingerprint = [...hexes].sort().join(",") + "|" + fontFamilies(css).sort().join(",");
      const twins = [];
      const projectsDir = join(studioRoot, "projects");
      for (const name of (existsSync(projectsDir) ? readdirSync(projectsDir) : [])) {
        if (name.startsWith("_") || name === projectName) continue;
        const other = join(projectsDir, name);
        const otherCss = projectFiles(other, [".css"]).map((f) => readText(f) ?? "").join("\n");
        const otherFingerprint = [...paletteOf(other)].sort().join(",") + "|" + fontFamilies(otherCss).sort().join(",");
        if (otherFingerprint === fingerprint && paletteOf(other).length > 0) twins.push(name);
      }
      // Акценты: если направление их размечает («акцент 1», «акцент 2»), квота Q-07 считает их число.
      // Не размечено — правило вакантно, а не «пройдено по умолчанию».
      const accentLimit = count(params.accents, 2);
      const accents = new Set((direction.match(/акцент\s*([0-9]+)/gi) ?? []).map((m) => m.replace(/\D+/g, "")));
      const accentsOk = accents.size === 0 || accents.size <= accentLimit;
      const ok = hexes.length >= min && fromArchive.length >= min && aiHits.length <= aiLimit && twins.length === 0 && accentsOk;
      return {
        ok,
        detail:
          `цветов ${hexes.length}/${min}, из палитр архива ${fromArchive.length}, в AI-диапазоне ${aiHits.length} (лимит ${aiLimit})` +
          `${accents.size === 0 ? ", акценты не размечены (Q-07 вакантна)" : `, акцентов ${accents.size}/${accentLimit}`}` +
          `${twins.length ? `, отпечаток совпал с ${twins.join(", ")}` : ", отпечаток уникален"}`,
      };
    }
    case "font-pair": {
      const pairsFile = readText(join(studioRoot, params.from ?? "assets/fonts/PAIRS.md")) ?? "";
      const pairs = (pairsFile.match(/^\d+\.\s+([^—\n]+)—/gm) ?? [])
        .map((line) => line.replace(/^\d+\.\s+/, "").replace(/—.*$/, "").split("+").map((s) => s.trim()).filter(Boolean));
      const used = pairs.find((pair) => pair.every((family) => direction.includes(family)));
      const roles = /роли|display|body/i.test(direction);
      // моноширинные метки и системные алиасы — роли вне пар (PAIRS.md), их в проверку не берём
      const outside = fontFamilies(css).filter((family) => !/mono|Consolas|Menlo|Cascadia|Segoe UI|system-ui/i.test(family));
      const stray = used ? outside.filter((family) => !used.includes(family)) : outside;
      const ok = Boolean(used) && roles && stray.length === 0;
      return {
        ok,
        detail: used
          ? `пара «${used.join(" + ")}» из ${params.from ?? "PAIRS.md"}, роли display/body ${roles ? "описаны" : "не описаны"}${stray.length ? `, вне пары в CSS: ${stray.join(", ")}` : ""}`
          : `ни одна пара из ${params.from ?? "PAIRS.md"} не названа в DIRECTION`,
      };
    }
    case "motion-recipes": {
      const min = count(params.min, 1);
      const max = count(params.max, 3);
      const registry = recipes(studioRoot).map((r) => r.name);
      // Выбор рецепта — это ссылка путём (`motion/recipes/<имя>/…`); имя в прозе может быть
      // и отвергнутым кандидатом, поэтому по именам считаем только проверку «всё из реестра».
      const paths = `${direction}\n${sources}\n${structure}`.match(/motion\/recipes\/([\w-]+)\//g) ?? [];
      const selected = [...new Set(paths.map((path) => path.split("/")[2]))];
      const named = citedRecipes(studioRoot, direction);
      const unknown = [...selected, ...named].filter((name) => !registry.includes(name));
      const ok = selected.length >= min && selected.length <= max && unknown.length === 0;
      return {
        ok,
        detail: `выбрано рецептов ${selected.length} (нужно ${min}–${max}: ${selected.join(", ") || "—"})${unknown.length ? `, вне реестра: ${unknown.join(", ")}` : `, упомянуто по имени ${named.length}`}`,
      };
    }
    case "anti-refs": {
      const min = count(params.min, 2);
      const block = /##\s*ЧЕМ ЭТО НЕ[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i.exec(direction)?.[1] ?? "";
      // Три живые формы записи: буллеты, отдельные абзацы и отрицательные перечисления внутри абзаца.
      // Границы слов задаём lookaround'ами: \b в JS не знает кириллицы («не» поймало бы «неделю»).
      const bullets = block.split(/^\s*[-—•]\s+/m).slice(1).map((c) => c.trim()).filter(Boolean);
      const paragraphs = block.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
      const plain = block.replace(/\*\*|__/g, "");
      const negatives = plain.match(/(?:^|[^А-Яа-яЁё])(?:не|чем это не)(?![А-Яа-яЁё])/gi) ?? [];
      const units = Math.max(bullets.length, paragraphs.length, negatives.length);
      const signs = new Set(block.match(/(?<![A-Za-zА-Яа-я])([BQКCMSAN])-(\d{2})(?![0-9A-Za-zА-Яа-я])/g) ?? []);
      return { ok: units >= min && signs.size >= min, detail: `антиреференсов ${units}/${min} (буллетов ${bullets.length}, абзацев ${paragraphs.length}, отрицаний ${negatives.length}), названо запретов ${signs.size}` };
    }
    case "seed-axes": {
      const axes = ["Композиция", "Движение", "Типографика"]
        .map((key) => seed.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim())
        .filter(Boolean);
      const reflected = axes.filter((axis) => direction.includes(axis));
      return { ok: axes.length === 3 && reflected.length === 3, detail: `осей ${axes.length}/3, отражено в DIRECTION ${reflected.length}` };
    }
    case "veto-phrases": {
      const words = list(params.words ?? "современно,стильно,минималистично");
      // Границы слова задаём явно: \b в JS не знает кириллицы и «чисто» поймало бы «чистотой».
      const hits = words.filter((word) => new RegExp(`(^|[^А-Яа-яЁё-])${word}([^А-Яа-яЁё-]|$)`, "i").test(direction));
      return { ok: hits.length === 0, detail: hits.length ? `обтекаемые формулировки: ${hits.join(", ")}` : "обтекаемых формулировок нет" };
    }
    /* ——— G2: структура ——— */
    case "section-sources": {
      const blocks = sectionsOf(structure);
      const missing = [];
      for (const block of blocks) {

        const rel = /Источник(?:и)?:\s*(.+)/.exec(block)?.[1] ?? "";
        if (!rel) {
          missing.push("нет строки «Источник:»");
          continue;
        }
        const paths = (rel.match(/(?:references|skills|motion|assets)\/[\w.\-/]+\.[a-z]{2,4}/g) ?? []);
        if (paths.length === 0) missing.push(`источник без пути: ${rel.slice(0, 40)}`);
        for (const path of paths) if (!existsSync(join(studioRoot, path)) && !existsSync(join(projectDir, path))) missing.push(path);
      }
      return { ok: blocks.length > 0 && missing.length === 0, detail: blocks.length === 0 ? "в STRUCTURE.md нет нумерованных секций" : missing.length ? `проблемы: ${missing.slice(0, 3).join("; ")}` : `секций ${blocks.length}, у каждой источник на месте` };
    }
    case "section-answers": {
      const blocks = sectionsOf(structure);
      const answered = blocks.filter((block) => /Отвечает/i.test(block)).length;
      return { ok: blocks.length > 0 && answered === blocks.length, detail: `секций ${blocks.length}, отвечают на вопрос брифа ${answered}` };
    }
    case "asymmetry": {
      // асимметрия видна в коде: несимметричные fr-треки или grid-template-areas
      const asym = [...css.matchAll(/grid-template-columns:\s*([^;{}]+)/g)]
        .map((m) => m[1].trim())
        .some((value) => {
          const tracks = value.replace(/repeat\([^)]*\)/g, " ").trim().split(/\s+/);
          if (tracks.length < 2) return false;
          return new Set(tracks).size > 1;
        });
      const declared = /асимметр|сдвиг|ломаная/i.test(`${structure}\n${direction}`);
      return { ok: asym && declared, detail: `несимметричная сетка ${asym ? "есть" : "нет"}, заявлена ${declared ? "да" : "нет"}` };
    }
    case "banned-subset": {
      const wanted = check.codes.length > 0 ? check.codes : ["B-03", "B-04"];
      const res = runStudioScript(studioRoot, "lint-slop.mjs", relative(studioRoot, projectDir));
      const hits = wanted.filter((code) => new RegExp(`\\b${code}\\b`).test(res.output));
      return { ok: hits.length === 0, detail: hits.length ? `найденные запреты: ${hits.join(", ")}` : `композиций ${wanted.join("/")} в коде нет` };
    }
    /* ——— G3: движение ——— */
    case "easing-registry": {
      const curves = JSON.parse(readText(join(studioRoot, "motion", "easing-curves.json")) ?? "{}");
      const allowed = new Set(Object.values(curves).map((value) => String(value).replace(/\s+/g, "")));
      const bad = [];
      for (const match of css.matchAll(/cubic-bezier\(([^)]+)\)/g)) {
        const curve = "cubic-bezier(" + match[1].replace(/\s+/g, "") + ")";
        if (!allowed.has(curve)) bad.push(curve);
      }
      // документы студии цитируют запрещённые кривые («дефолты … запрещены (К-05)») — судим артефакт
      const defaultEasing = /(transition|animation)[^;{]*(ease-in-out|ease-in\b|ease-out\b|\bease\b|\blinear\b)/i.test(css);
      return { ok: bad.length === 0 && !defaultEasing, detail: bad.length ? `кривых вне реестра: ${bad.slice(0, 3).join(", ")}` : defaultEasing ? "дефолтный easing в transition/animation" : `все кривые из реестра (${allowed.size} шт.)` };
    }
    case "dont-combine": {
      const registry = recipes(studioRoot);
      const cited = citedRecipes(studioRoot, `${direction}\n${sources}`);
      const conflicts = [];
      for (const a of cited) {
        for (const b of cited) {
          if (a === b) continue;
          const entry = registry.find((r) => r.name === a);
          if ((entry?.dontCombineWith ?? []).some((pattern) => new RegExp(pattern).test(b))) conflicts.push(`${a}×${b}`);
        }
      }
      return { ok: conflicts.length === 0, detail: conflicts.length ? `конфликты: ${conflicts.join(", ")}` : `конфликтов нет (рецептов ${cited.length})` };
    }
    case "motion-map": {
      // обе живые конвенции студии: раздел «Motion-карта» и раздел «Движение»
      const block = /##\s*(?:Motion-карта|Движение)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i.exec(sources)?.[1] ?? "";
      const cited = citedRecipes(studioRoot, block);
      const reduced = /prefers-reduced-motion/i.test(block);
      return { ok: block.length > 0 && cited.length > 0, detail: block.length === 0 ? "в SOURCES.md нет Motion-карты" : `карта есть, рецептов ${cited.length}${reduced ? ", prefers-reduced-motion учтён" : ""}` };
    }
    case "reduced-motion": {
      const media = /@media[^{]*prefers-reduced-motion/i.test(css);
      const declaration = /prefers-reduced-motion/i.test(`${direction}\n${sources}`);
      return { ok: media && declaration, detail: `в CSS ${media ? "есть" : "нет"} блок prefers-reduced-motion, заявлен в документах ${declaration ? "да" : "нет"}` };
    }
    /* ——— G4: финал ——— */
    case "studio-script": {
      const res = runStudioScript(studioRoot, params.script ?? "validate.mjs", relative(studioRoot, projectDir));
      const fails = (res.output.match(/^FAIL\b.*$/gm) ?? []).length;
      const summary = /ИТОГ:[^\n]*/.exec(res.output)?.[0] ?? "нет строки ИТОГ";
      return { ok: res.ok && fails === 0, detail: summary.trim() };
    }
    case "similarity": {
      const res = runStudioScript(studioRoot, params.script ?? "diff-projects.mjs", relative(studioRoot, projectDir));
      const value = Number(res.output.trim().split(/\s+/).pop());
      const max = count(params.max, 10);
      return { ok: Number.isFinite(value) && value <= max, detail: `сходство с архивом проектов ${Number.isFinite(value) ? value : "?"}% (порог ${max}%)` };
    }
    case "review-verdict": {
      const review = readText(join(projectDir, "REVIEW.md")) ?? "";
      const min = count(params.min, 2);
      const verdict = /вердикт[:\s—]*(принято|возврат)/i.test(review);
      const codes = new Set(review.match(/[КBQVCMAN]-?\d{2}/g) ?? []);
      const stages = ["G1", "G2", "G3", "G4"].filter((id) => review.includes(id));
      return { ok: verdict && codes.size >= min, detail: `вердикт ${verdict ? "есть" : "нет"}, ссылок на правила ${codes.size} (нужно ${min}), стадий упомянуто ${stages.length}` };
    }
    case "loop-evidence": {
      const evidence = readText(join(projectDir, "workspace", "loop-result.json"));
      if (evidence === null) return { ok: null, detail: "цикл не прогонялся (нет workspace/loop-result.json) — правило вакантно до первого прогона ворот" };
      let data;
      try {
        data = JSON.parse(evidence);
      } catch {
        return { ok: false, detail: "workspace/loop-result.json не читается" };
      }
      const codes = (data.feedback?.codes ?? []).filter((code) => code && code !== "OK");
      return { ok: data.ok === true && codes.length === 0, detail: `цикл ${data.ok ? "сошёлся" : "не сошёлся"} (итераций ${data.iterations ?? "?"}${codes.length ? `, коды: ${codes.join(", ")}` : ""})` };
    }
    case "repo-hygiene": {
      // К-15 без дублирования логики: тот же модуль, что запускает CI-гейт
      const { checkRepoHygiene } = await import("../../scripts/ci-gate.mjs");
      const res = checkRepoHygiene(resolve(studioRoot, "..", ".."));
      const notes = res.noted.length > 0 ? res.noted.join("; ") : "секретов нет, ссылки целы, CI зовёт гейт";
      return { ok: res.ok, detail: `${notes} (проверено файлов ${res.checked})` };
    }
    case "registry-gates": {
      // Ворота студии из registry.mjs: контракт стадии зовёт тот же код, что и цикл
      const registryPath = join(studioRoot, params.registry ?? "registry.mjs");
      if (!existsSync(registryPath)) return { ok: null, detail: "у студии нет registry.mjs — ворота реестра вакантны" };
      const mod = await import(pathToFileURL(registryPath).href);
      const registry = mod.default ?? mod.vertical ?? null;
      const gates = typeof registry?.getVerificationGates === "function" ? registry.getVerificationGates() : {};
      const names = list(params.names);
      const results = [];
      for (const name of names) {
        const gate = gates[name];
        if (!gate) {
          results.push(`${name}: нет в реестре`);
          continue;
        }
        const out = await gate.verify({}, { projectDir });
        const failed = out?.passed === false;
        results.push(`${name}: ${failed ? `провал (${(out.errors ?? []).slice(0, 2).map((e) => e.code ?? "?").join(", ")})` : "пройдено"}`);
      }
      return { ok: names.length > 0 && !results.some((row) => /провал|нет в реестре/.test(row)), detail: results.join(" · ") || "ворота не названы" };
    }
    default:
      return { ok: null, detail: `вид проверки «${kind}» неизвестен — пункт считаем человеческим` };
  }
}

/** Шрифтовые семьи, реально использованные в CSS (без var() и системных алиасов). */
function fontFamilies(css) {
  const out = new Set();
  for (const match of String(css).matchAll(/font-family:\s*([^;{}]+)/g)) {
    for (const part of match[1].split(",")) {
      const family = part.trim().replace(/^["']|["']$/g, "");
      if (!family || family.startsWith("var(") || /^(serif|sans-serif|monospace|system-ui|inherit|initial|unset)$/.test(family)) continue;
      out.add(family);
    }
  }
  return [...out];
}

/**
 * Прогоняет стадию по проекту.
 * @param {any} gate
 * @param {{studioRoot: string, projectDir: string}} opts
 */
export async function runGate(gate, opts) {
  const studioRoot = resolve(String(opts.studioRoot));
  const projectDir = resolve(String(opts.projectDir));
  const ctx = { studioRoot, projectDir, projectName: basename(projectDir) };
  /** @type {any[]} */
  const checks = [];
  for (const check of gate.checks) {
    if (check.human) {
      checks.push({ ...check, ok: null, detail: "машинной спеки нет — судит арт-директор (критерий отказа стадии)" });
      continue;
    }
    let result;
    try {
      result = await runCheck(check, ctx);
    } catch (error) {
      result = { ok: false, detail: `проверка упала: ${String(error?.message ?? error)}` };
    }
    checks.push({ ...check, ...result });
  }
  const failed = checks.filter((check) => check.ok === false);
  const human = checks.filter((check) => check.ok === null);
  const codes = [...new Set(failed.flatMap((check) => check.codes))];
  return {
    id: gate.id,
    title: gate.title,
    artifact: gate.artifact,
    passed: failed.length === 0,
    failed: failed.length,
    human: human.length,
    codes,
    checks,
  };
}

/**
 * Прогон всех стадий студии по проекту.
 * @returns {{vertical: string, project: string, gates: any[], passed: boolean, codes: string[]}}
 */
export async function runGates(studioRoot, projectDir, opts = {}) {
  const loaded = loadGates(studioRoot);
  const gates = [];
  for (const gate of loaded.gates) {
    if (opts.only && !opts.only.includes(gate.id)) continue;
    gates.push(await runGate(gate, { studioRoot, projectDir }));
  }
  const codes = [...new Set(gates.flatMap((gate) => gate.codes))];
  return {
    vertical: basename(resolve(String(studioRoot))),
    project: basename(resolve(String(projectDir))),
    gates,
    passed: gates.every((gate) => gate.passed),
    codes,
    missing: loaded.missing,
  };
}

/** Строка для отчёта/промпта: «G1 Направление — 5/6 машиной, 1 человеку». */
export function describeGate(gate) {
  const machine = gate.checks.filter((check) => !check.human).length;
  return `${gate.id} ${gate.title.replace(/^.*—\s*/, "")} — машиной ${machine}/${gate.checks.length}`;
}

export default { loadGates, parseGateDocument, parseCodes, runGate, runGates, describeGate };
