/* ЦЕХ · Метаплатформа — core/orchestrator/composition.mjs
   Композиция = DAG задач для нескольких студий (§13.1 ТЗ). Композиция описывает «что собрать»,
   вертикаль — «по каким правилам». Ноль зависимостей: YAML читает парсер ядра.

   Инварианты:
     • needs образуют DAG; цикл → E-CONFIG-GRAPH;
     • неизвестная вертикаль/гейт/битая схема → E-SCHEMA;
     • каждая вершина наследует конституцию своей вертикали (на этапе Run).

   Публичный API:
     loadComposition(path) → Composition
     validateComposition(comp) → { ok, errors: [{code, description, location}], tasks }
     topologicalOrder(tasks) → string[]  (или throw E-CONFIG-GRAPH)
     readyTasks(tasks, doneSet) → Task[]
*/

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { parseSimpleYaml } from "../loop-engine/config.mjs";

export const GATES = Object.freeze(["G1", "G2", "G3", "G4"]);
export const AGGREGATE_MODES = Object.freeze(["all", "best_effort", "quorum"]);

export class CompositionError extends Error {
  constructor(code, message, location = null) {
    super(message);
    this.name = "CompositionError";
    this.code = code;
    this.location = location;
  }
}

/** @typedef {{ id: string, vertical: string, gate: string, needs: string[], hitl: boolean, project?: string, skill?: string, output?: string }} CompTask */
/** @typedef {{ apiVersion?: string, kind: string, metadata: { name: string, goal?: string }, tasks: CompTask[], aggregate: { mode: string, threshold?: number, deliverable?: string }, dir?: string }} Composition */

/** @param {string} path @returns {Composition} */
export function loadComposition(path) {
  const abs = isAbsolute(path) ? path : resolve(path);
  if (!existsSync(abs)) throw new CompositionError("E-SCHEMA", `композиция не найдена: ${path}`, path);
  let raw;
  try {
    raw = parseSimpleYaml(readFileSync(abs, "utf8"));
  } catch (error) {
    throw new CompositionError("E-SCHEMA", `не разобрать composition.yaml: ${error?.message ?? error}`, path);
  }
  return normalizeComposition(raw, dirname(abs));
}

/** Приводит разобранный YAML к канонической форме. @returns {Composition} */
export function normalizeComposition(raw, dir = null) {
  const metadata = raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : {};
  const aggregate = raw?.aggregate && typeof raw.aggregate === "object" ? raw.aggregate : {};
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks.map((t) => normalizeTask(t)) : [];
  return {
    apiVersion: String(raw?.apiVersion ?? "autogen/v1"),
    kind: String(raw?.kind ?? "Composition"),
    metadata: { name: String(metadata.name ?? "unnamed"), goal: metadata.goal ? String(metadata.goal) : "" },
    tasks,
    aggregate: {
      mode: String(aggregate.mode ?? "all"),
      threshold: Number.isFinite(Number(aggregate.threshold)) ? Number(aggregate.threshold) : undefined,
      deliverable: aggregate.deliverable ? String(aggregate.deliverable) : undefined,
    },
    dir,
  };
}

/** @returns {CompTask} */
function normalizeTask(raw = {}) {
  const needs = Array.isArray(raw.needs) ? raw.needs.map(String) : raw.needs ? [String(raw.needs)] : [];
  return {
    id: String(raw.id ?? "").trim(),
    vertical: String(raw.vertical ?? "").trim(),
    gate: String(raw.gate ?? "G4").trim(),
    needs: needs.filter(Boolean),
    hitl: Boolean(raw.hitl),
    project: raw.project ? String(raw.project) : undefined,
    skill: raw.skill ? String(raw.skill) : undefined,
    output: raw.output ? String(raw.output) : undefined,
  };
}

/**
 * Проверка схемы и инвариантов композиции.
 * @param {Composition} comp
 * @param {{ knownVerticals?: string[] }} [opts] — допустимые имена вертикалей (для проверки ссылок).
 * @returns {{ ok: boolean, errors: Array<{ code: string, description: string, location: string|null }>, tasks: CompTask[] }}
 */
export function validateComposition(comp, opts = {}) {
  const errors = [];
  const add = (code, description, location = null) => errors.push({ code, description, location });

  if (comp.kind !== "Composition") add("E-SCHEMA", `kind должен быть Composition, а не «${comp.kind}»`, "kind");
  if (!comp.metadata.name || comp.metadata.name === "unnamed") add("E-SCHEMA", "metadata.name обязателен", "metadata.name");
  if (comp.tasks.length === 0) add("E-SCHEMA", "tasks не может быть пустым", "tasks");
  if (!AGGREGATE_MODES.includes(comp.aggregate.mode)) add("E-SCHEMA", `aggregate.mode «${comp.aggregate.mode}» не из ${AGGREGATE_MODES.join("|")}`, "aggregate.mode");

  const ids = new Set();
  for (const task of comp.tasks) {
    if (!task.id) add("E-SCHEMA", "у задачи пустой id", "tasks[].id");
    else if (ids.has(task.id)) add("E-SCHEMA", `id «${task.id}» повторяется`, `tasks.${task.id}`);
    ids.add(task.id);
    if (!task.vertical) add("E-SCHEMA", `у задачи «${task.id}» не указана вертикаль`, `tasks.${task.id}.vertical`);
    if (!GATES.includes(task.gate)) add("E-SCHEMA", `гейт «${task.gate}» у «${task.id}» не из ${GATES.join("|")}`, `tasks.${task.id}.gate`);
  }
  for (const task of comp.tasks) {
    for (const need of task.needs) {
      if (!ids.has(need)) add("E-SCHEMA", `задача «${task.id}» зависит от неизвестной «${need}»`, `tasks.${task.id}.needs`);
    }
    if (task.needs.includes(task.id)) add("E-CONFIG-GRAPH", `задача «${task.id}» зависит от себя`, `tasks.${task.id}.needs`);
  }
  if (opts.knownVerticals && opts.knownVerticals.length > 0) {
    for (const task of comp.tasks) {
      if (task.vertical && !opts.knownVerticals.includes(task.vertical)) {
        add("E-SCHEMA", `неизвестная вертикаль «${task.vertical}» (есть: ${opts.knownVerticals.join(", ")})`, `tasks.${task.id}.vertical`);
      }
    }
  }
  // Инвариант DAG (цикл → E-CONFIG-GRAPH).
  try {
    topologicalOrder(comp.tasks);
  } catch (error) {
    add("E-CONFIG-GRAPH", error.message, "tasks");
  }
  return { ok: errors.length === 0, errors, tasks: comp.tasks };
}

/** Топологический порядок по needs. @param {CompTask[]} tasks @returns {string[]} */
export function topologicalOrder(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map(); // 0 = в процессе, 1 = готово
  const order = [];
  const visit = (task, stack) => {
    if (state.get(task.id) === 1) return;
    if (state.get(task.id) === 0) throw new CompositionError("E-CONFIG-GRAPH", `цикл зависимостей: ${[...stack, task.id].join(" → ")}`);
    state.set(task.id, 0);
    for (const need of task.needs) {
      const dep = byId.get(need);
      if (dep) visit(dep, [...stack, task.id]);
    }
    state.set(task.id, 1);
    order.push(task.id);
  };
  for (const task of tasks) visit(task, []);
  return order;
}

/** Задачи, чьи зависимости закрыты и которые ещё не выполнены. @param {CompTask[]} tasks @param {Set<string>} done */
export function readyTasks(tasks, done) {
  return tasks.filter((t) => !done.has(t.id) && t.needs.every((n) => done.has(n)));
}

export default { loadComposition, validateComposition, topologicalOrder, readyTasks, CompositionError };
