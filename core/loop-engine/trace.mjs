/* ЦЕХ · Universal Loop Engine — trace.mjs
   Трейсинг прохождения цикла по «узлам» (§4.8 ТЗ): каждая итерация даёт строку
   {ts, runId, node, iteration, durationMs, ok} в workspace/trace.jsonl.

   Пишется через хук onIteration раннера, поэтому движок остаётся ноль-зависимым,
   а трейсинг — опциональным (OTel-экспорт по умолчанию выключен).

   Публичный API:
     class TraceWriter { constructor(file, { runId }); record(entry); }
     makeTraceHook(workspaceDir, { runId, file }) → (payload) => Promise<void>
     writeTraceLine(file, record)                → void
*/

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/** Одна строка трейса: {ts, runId, node, iteration, durationMs, ok}. */
export function traceRecord(payload = {}, { runId = "run" } = {}) {
  const fb = payload.feedback ?? {};
  return {
    ts: payload.ts ?? Date.now(),
    runId,
    node: payload.node ?? "iteration",
    iteration: Number(payload.iteration ?? payload.iteration_index ?? 0),
    durationMs: Number(payload.elapsedMs ?? payload.durationMs ?? 0),
    ok: Boolean(payload.ok ?? fb.ok ?? false),
  };
}

/** Дописывает одну запись в trace.jsonl (создавая каталог). */
export function writeTraceLine(file, record) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
}

export class TraceWriter {
  /** @param {string} file путь к trace.jsonl */
  constructor(file, { runId = "run" } = {}) {
    this.file = file;
    this.runId = runId;
  }
  /** @param {object} payload итерация раннера (iteration/feedback/elapsedMs) */
  record(payload) {
    const rec = traceRecord(payload, { runId: this.runId });
    writeTraceLine(this.file, rec);
    return rec;
  }
}

/** Хук onIteration: складывает трейс в workspaceDir/trace.jsonl. */
export function makeTraceHook(workspaceDir, { runId = "run", file = null } = {}) {
  const target = file ?? join(workspaceDir, "trace.jsonl");
  const writer = new TraceWriter(target, { runId });
  return async (payload) => writer.record(payload);
}
