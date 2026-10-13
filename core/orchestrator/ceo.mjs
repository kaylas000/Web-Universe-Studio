/* ЦЕХ · Метаплатформа — core/orchestrator/ceo.mjs
   CEO-агент (§13.2 ТЗ) — верхнеуровневый оркестратор платформы. Он НЕ пишет контент:
   декомпозирует цель, маршрутизирует к домену(ам), запускает композицию (DAG) через loop-engine
   и агрегирует вердикты. HITL не подменяется: задача с hitl:true не закрывается без человека (К-09).

   Цикл решения (тот же движок К-21, другой валидатор):
     Plan → Route → Run → Verify → Aggregate → Escalate(hitl)

   Ноль зависимостей. Раннер задач инъектируется (по умолчанию — реальный прогон проекта
   вертикали из core/gate.mjs), поэтому агент тестируется офлайн с фейковым раннером.
*/

import { basename } from "node:path";

import { listVerticals, readVerticalMeta, listProjects, runProject } from "../gate.mjs";
import { normalizeComposition, topologicalOrder, validateComposition } from "./composition.mjs";

/** Ключевые слова маршрутизации: домен → леммы цели (§13.2, шаг Route). */
export const DOMAIN_KEYWORDS = Object.freeze({
  web: ["сайт", "лендинг", "страниц", "вёрстк", "верстк", "дизайн", "витрин", "промо"],
  content: ["пост", "стать", "контент", "текст", "блог", "лонгрид", "рассылк", "копирайт"],
  data: ["данн", "метрик", "аналит", "отчёт", "отчет", "sql", "дашборд", "продаж", "график"],
  education: ["курс", "урок", "обучен", "тест", "программ", "лекц", "модул", "школ"],
  mini_apps: ["приложен", "таймер", "сервис", "виджет", "widget", "мини"],
  mobile: ["мобильн", "экран", "ios", "android", "смартфон", "приложени"],
});

/** Из имени вертикали — короткий алиас для композиций: web_studio → web, content_studio → content. */
export function shortAlias(name) {
  const base = String(name).replace(/_studio$/, "").replace(/_docs$/, "").replace(/_apps$/, "_apps");
  const first = base.split("_")[0];
  return first === "education" ? "education" : first;
}

/** @typedef {{ name: string, title: string, dir: string, deliverable: string, aliases: string[] }} VerticalRef */

/** Реестр вертикалей с алиасами (§7.2, шаг Route). @returns {Map<string, VerticalRef>} */
export function buildVerticalRegistry(verticalsDir) {
  const registry = new Map();
  for (const dir of listVerticals(verticalsDir)) {
    const meta = readVerticalMeta(dir);
    const aliases = [...new Set([meta.name, shortAlias(meta.name)])];
    const ref = { name: meta.name, title: meta.title, dir, deliverable: meta.deliverable, aliases };
    for (const alias of aliases) if (!registry.has(alias)) registry.set(alias, ref);
  }
  return registry;
}

export class CeoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CeoError";
    this.code = code;
  }
}

export class CeoAgent {
  /**
   * @param {{ verticalsDir?: string, logger?: any, runTask?: Function, budget?: any }} [opts]
   */
  constructor(opts = {}) {
    this.logger = opts.logger ?? { info: () => {}, warn: () => {} };
    this.registry = buildVerticalRegistry(opts.verticalsDir);
    this.metrics = opts.metrics ?? null;
    this.budget = opts.budget ?? null;
    this.runTask = opts.runTask ?? defaultTaskRunner;
  }

  /** Все известные имена/алиасы вертикалей (для валидации композиций). */
  knownNames() {
    return [...this.registry.keys()];
  }

  /** Route: сопоставить свободную цель с доменами по ключевым словам. @returns {{ domain: string, vertical: VerticalRef, score: number }[]} */
  route(goal) {
    const text = String(goal ?? "").toLowerCase();
    const scored = [];
    let index = 0;
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
      const vertical = this.registry.get(domain);
      if (score > 0 && vertical) scored.push({ domain, vertical, score, order: index });
      index += 1;
    }
    return scored.sort((a, b) => b.score - a.score || a.order - b.order).map(({ order, ...rest }) => rest);
  }

  /**
   * Plan: разложить цель в композицию (задачи + needs). Без LLM — детерминированная декомпозиция
   * по доменам; при наличии LLM шаг заменяется планировщиком, схема та же (§13.2).
   * @returns {ReturnType<typeof normalizeComposition>}
   */
  plan(goal) {
    const routed = this.route(goal);
    if (routed.length === 0) throw new CeoError("E-COMPOSITION-ROUTE", `не удалось сопоставить цель с доменом: «${goal}»`);
    const tasks = routed.map((r, i) => ({
      id: `${r.domain}-${i + 1}`,
      vertical: r.vertical.aliases[0],
      gate: "G4",
      needs: i === 0 ? [] : [`${routed[0].domain}-1`],
      hitl: false, // HITL (К-09) задаётся декларативно в композиции, а не авто-правилом
      output: undefined,
      project: undefined,
      skill: undefined,
    }));
    return normalizeComposition({ apiVersion: "autogen/v1", kind: "Composition", metadata: { name: `auto-${Date.now()}`, goal }, tasks, aggregate: { mode: "all" } });
  }

  /**
   * Run: выполнить композицию в топологическом порядке.
   * @param {ReturnType<typeof normalizeComposition>} composition
   * @param {{ acceptedHitl?: string[]|true, mode?: string }} [opts]
   * @returns {Promise<{ ok: boolean, mode: string, results: Array<any>, hitl_pending: string[], codes: string[] }>}
   */
  async run(composition, opts = {}) {
    const known = [...this.registry.keys()];
    const check = validateComposition(composition, { knownVerticals: [...new Set([...known, ...composition.tasks.map((t) => t.vertical)])].filter((v) => this.registry.has(v) || known.includes(v)) });
    // Ссылки на вертикали проверяем сами: алиасы могут отличаться от канонических имён.
    for (const task of composition.tasks) {
      if (!this.registry.has(task.vertical)) throw new CeoError("E-COMPOSITION-ROUTE", `задача «${task.id}»: вертикаль «${task.vertical}» не найдена (есть: ${known.join(", ")})`);
    }
    if (!check.ok) throw new CeoError(check.errors[0]?.code ?? "E-SCHEMA", check.errors.map((e) => `${e.code} ${e.description}`).join("; "));

    const order = topologicalOrder(composition.tasks);
    const byId = new Map(composition.tasks.map((t) => [t.id, t]));
    const done = new Set();
    const failed = new Set();
    const results = [];
    const accepted = opts.acceptedHitl === true
      ? new Set(composition.tasks.filter((t) => t.hitl).map((t) => t.id))
      : Array.isArray(opts.acceptedHitl)
        ? new Set(opts.acceptedHitl)
        : new Set();

    for (const id of order) {
      const task = byId.get(id);
      const blocked = task.needs.some((n) => failed.has(n));
      if (blocked) {
        results.push({ id, vertical: task.vertical, gate: task.gate, hitl: task.hitl, status: "blocked", codes: [], iterations: 0, ms: 0 });
        failed.add(id);
        continue;
      }
      const vertical = this.registry.get(task.vertical);
      const startedAt = Date.now();
      let entry;
      try {
        entry = await this.runTask({ task, vertical, composition, done });
      } catch (error) {
        entry = { status: "error", codes: [String(error?.code ?? "E-COMPOSITION-RUN")], errors: [String(error?.message ?? error)], iterations: 0 };
      }
      const status = task.hitl && entry.status === "ok" && !accepted.has(id) ? "hitl_pending" : entry.status;
      results.push({
        id,
        vertical: task.vertical,
        gate: task.gate,
        hitl: task.hitl,
        status,
        codes: entry.codes ?? [],
        errors: entry.errors ?? [],
        iterations: entry.iterations ?? 0,
        ms: entry.ms ?? Date.now() - startedAt,
        evidence: entry.evidence ?? null,
      });
      if (status === "ok") done.add(id);
      else failed.add(id);
      this.metrics?.counter?.("platform_violations", { platform: "ceo", rule: String(status) })?.inc?.();
    }

    const aggregate = this.aggregate(composition, results, opts.mode);
    return aggregate;
  }

  /**
   * Aggregate: свести вердикты в один отчёт (§13.2). Успех невозможен при незакрытом HITL (К-09).
   * @param {any} composition @param {any[]} results @param {string} [modeOverride]
   */
  aggregate(composition, results, modeOverride) {
    const mode = modeOverride ?? composition.aggregate?.mode ?? "all";
    const hitl_pending = results.filter((r) => r.status === "hitl_pending").map((r) => r.id);
    const passed = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => ["fail", "error", "blocked"].includes(r.status));
    const total = results.length;
    const codes = [...new Set(failed.flatMap((r) => r.codes))];

    let ok;
    if (mode === "best_effort") ok = passed >= 1 && hitl_pending.length === 0;
    else if (mode === "quorum") {
      const threshold = Number.isFinite(composition.aggregate?.threshold) ? composition.aggregate.threshold : Math.ceil(total / 2);
      ok = passed >= threshold && hitl_pending.length === 0;
    } else ok = passed === total && total > 0 && hitl_pending.length === 0;

    if (hitl_pending.length > 0) codes.push("E-COMPOSITION-HITL");
    if (!ok && codes.length === 0) codes.push("E-COMPOSITION-AGGREGATE");
    return { ok, mode, total, passed, failed: failed.length, results, hitl_pending, codes };
  }
}

/** Раннер по умолчанию: прогон демо-проекта целевой вертикали через платформенный гейт. */
export async function defaultTaskRunner({ task, vertical }) {
  const projects = listProjects(vertical.dir, vertical.deliverable).map((d) => basename(d));
  const projectName = task.project && projects.includes(task.project) ? task.project : projects[0];
  if (!projectName) return { status: "fail", codes: ["E-COMPOSITION-NO-PROJECT"], errors: [`у вертикали ${vertical.name} нет проектов`] };
  const meta = readVerticalMeta(vertical.dir);
  const entry = await runProject(meta, projectName);
  return { status: entry.status, codes: entry.codes, errors: entry.errors, iterations: entry.iterations, ms: entry.ms, evidence: entry.evidence };
}

export default CeoAgent;
