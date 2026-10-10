#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — core/api/server.mjs
   API Gateway на node:http без фреймворка (§4.9 ТЗ).

   Маршруты:
     GET  /health                 → liveness/readiness
     GET  /metrics                → метрики в формате Prometheus
     GET  /v1/verticals           → вертикали и их скиллы/гейты
     POST /v1/generate            → { vertical, skill?, input?, idempotency_key? } → 202 {run_id}
     GET  /v1/runs/{id}           → статус run + loop-result.json
     POST /v1/compositions/{name} → запуск композиции (CEO-агент)

   Требования: роли viewer/developer/admin; rate limiting (RPM/RPD/concurrent);
   идемпотентность по idempotency_key; запуск run в фоне (очередь в памяти процесса).
*/

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { listVerticals, readVerticalMeta, listProjects, runProject } from "../gate.mjs";
import { parseSimpleYaml } from "../loop-engine/config.mjs";
import { metrics as globalMetrics } from "../observability/metrics.mjs";
import { CeoAgent } from "../orchestrator/ceo.mjs";
import { loadComposition } from "../orchestrator/composition.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLATFORM_ROOT = resolve(HERE, "..", "..");
export const COMPOSITIONS_DIR = join(PLATFORM_ROOT, "compositions");

/** Уровни доступа (§4.9): RPM — в минуту, RPD — в день, concurrent — одновременно. */
export const ROLE_LIMITS = Object.freeze({
  viewer: { rpm: 60, rpd: 2000, concurrent: 2 },
  developer: { rpm: 300, rpd: 20000, concurrent: 8 },
  admin: { rpm: 1000, rpd: 100000, concurrent: 32 },
});

const ROUTES = Object.freeze([
  ["GET", "/health"],
  ["GET", "/metrics"],
  ["GET", "/v1/verticals"],
  ["POST", "/v1/generate"],
  ["GET", /^\/v1\/runs\/[^/]+$/],
  ["POST", /^\/v1\/compositions\/[^/]+$/],
]);

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function nowMs() {
  return Date.now();
}

/** Разбор токенов ролей: env API_TOKENS (JSON) → { token: role }; иначе dev-токены. */
export function parseTokens(env = process.env) {
  const tokens = new Map();
  if (env.API_TOKENS) {
    try {
      const parsed = JSON.parse(env.API_TOKENS);
      for (const [token, role] of Object.entries(parsed)) if (ROLE_LIMITS[role]) tokens.set(token, role);
    } catch {
      /* некорректный API_TOKENS игнорируем — падаем на dev-токены */
    }
  }
  if (tokens.size === 0) {
    tokens.set("viewer-token", "viewer");
    tokens.set("dev-token", "developer");
    tokens.set("admin-token", "admin");
  }
  return tokens;
}

/** @param {string} role @param {number} ts */
function bucket(role, ts) {
  return { minute: Math.floor(ts / 60000), day: Math.floor(ts / 86400000), minuteCount: 0, dayCount: 0 };
}

export function createApiServer(opts = {}) {
  const platformRoot = opts.platformRoot ?? PLATFORM_ROOT;
  const compositionsDir = opts.compositionsDir ?? COMPOSITIONS_DIR;
  const tokens = opts.tokens ?? parseTokens();
  const allowRoleHeader = opts.allowRoleHeader ?? process.env.API_ALLOW_ROLE_HEADER !== "0";
  const logger = opts.logger ?? { info: () => {}, warn: () => {}, error: () => {} };
  const metrics = opts.metrics ?? globalMetrics;
  const clock = opts.now ?? nowMs;

  /** @type {Map<string, { id: string, kind: string, target: string, skill: string|null, input: any, status: string, result: any, createdAt: number, finishedAt: number|null }>} */
  const runs = new Map();
  /** @type {Map<string, string>} idempotency_key → run id */
  const idempotency = new Map();
  /** @type {Map<string, ReturnType<typeof bucket>>} role → счётчики */
  const limits = new Map();
  /** @type {Array<{ runId: string, run: () => Promise<any> }>} */
  const queue = [];
  const active = new Map(); // role → число активных run
  let draining = false;
  let seq = 0;

  const registry = new Map();
  for (const dir of listVerticals(join(platformRoot, "verticals"))) {
    const meta = readVerticalMeta(dir);
    registry.set(meta.name, meta);
    registry.set(meta.name.replace(/_studio$/, "").replace(/_docs$/, "").split("_")[0], meta);
  }

  const ceo = opts.ceo ?? new CeoAgent({ verticalsDir: join(platformRoot, "verticals"), logger, metrics });

  function authenticate(req) {
    const auth = String(req.headers.authorization ?? "");
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (bearer && tokens.has(bearer)) return { role: tokens.get(bearer), token: bearer };
    if (allowRoleHeader && req.headers["x-role"]) {
      const role = String(req.headers["x-role"]);
      if (ROLE_LIMITS[role]) return { role, token: "role-header" };
    }
    throw new ApiError(401, "E-AUTH", "нужен Bearer-токен роли viewer/developer/admin");
  }

  function checkRate(role) {
    const limitsForRole = ROLE_LIMITS[role];
    const ts = clock();
    const b = limits.get(role) ?? bucket(role, ts);
    if (b.minute !== Math.floor(ts / 60000)) {
      b.minute = Math.floor(ts / 60000);
      b.minuteCount = 0;
    }
    if (b.day !== Math.floor(ts / 86400000)) {
      b.day = Math.floor(ts / 86400000);
      b.dayCount = 0;
    }
    if (b.minuteCount >= limitsForRole.rpm) throw new ApiError(429, "E-RATE-LIMIT", `превышен RPM роли ${role}`);
    if (b.dayCount >= limitsForRole.rpd) throw new ApiError(429, "E-RATE-LIMIT", `превышен RPD роли ${role}`);
    if ((active.get(role) ?? 0) >= limitsForRole.concurrent) throw new ApiError(429, "E-RATE-LIMIT", `превышен лимит одновременных run роли ${role}`);
    b.minuteCount += 1;
    b.dayCount += 1;
    limits.set(role, b);
  }

  function enqueue(runId, job, role) {
    active.set(role, (active.get(role) ?? 0) + 1);
    queue.push({ runId, role, run: job });
    void drain();
  }

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0) {
        const item = queue.shift();
        const run = runs.get(item.runId);
        run.status = "running";
        const started = clock();
        try {
          const result = await item.run();
          run.result = result;
          run.status = result?.ok === false || result?.status === "fail" ? "fail" : "ok";
        } catch (error) {
          run.status = "error";
          run.result = { ok: false, codes: [String(error?.code ?? "E-API-RUN")], errors: [String(error?.message ?? error)] };
        } finally {
          run.finishedAt = clock();
          metrics.histogram("run_duration", { vertical: run.target, skill: run.skill ?? "composition", status: run.status }).observe((run.finishedAt - started) / 1000);
          active.set(item.role, Math.max(0, (active.get(item.role) ?? 1) - 1));
        }
      }
    } finally {
      draining = false;
    }
  }

  function resolveVertical(name) {
    return registry.get(String(name ?? ""));
  }

  async function runVerticalTask(verticalName, skill) {
    const vertical = resolveVertical(verticalName);
    if (!vertical) throw new ApiError(400, "E-API-VERTICAL", `неизвестная вертикаль «${verticalName}»`);
    const projects = listProjects(vertical.dir, vertical.deliverable).map((d) => basename(d));
    if (projects.length === 0) throw new ApiError(409, "E-API-NO-PROJECT", `у вертикали ${vertical.name} нет проектов`);
    const entry = await runProject(vertical, projects[0]);
    return { ok: entry.status === "ok", status: entry.status, project: `${vertical.name}/${projects[0]}`, codes: entry.codes, iterations: entry.iterations, evidence: entry.evidence, skill: skill ?? null };
  }

  async function readBody(req, limit = 1_000_000) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw new ApiError(413, "E-API-BODY", "тело запроса слишком велико");
      chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new ApiError(400, "E-API-JSON", "тело не является JSON");
    }
  }

  function send(res, status, body, headers = {}) {
    const payload = typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`;
    res.writeHead(status, { "content-type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", ...headers });
    res.end(payload);
  }

  /** Основной обработчик. Возвращает true, если запрос обработан. */
  async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const method = String(req.method ?? "GET").toUpperCase();

    if (method === "GET" && path === "/health") {
      return send(res, 200, { status: "ok", ready: true, verticals: new Set([...registry.values()].map((v) => v.name)).size, runs: runs.size, uptime_s: Math.round(process.uptime()) });
    }
    if (method === "GET" && path === "/metrics") {
      return send(res, 200, metrics.renderPrometheus());
    }

    const known = ROUTES.some(([m, p]) => m === method && (typeof p === "string" ? p === path : p.test(path)));
    if (!known) return send(res, 404, { error: "E-API-404", message: `нет маршрута ${method} ${path}` });

    let auth;
    try {
      auth = authenticate(req);
      checkRate(auth.role);
    } catch (error) {
      const status = error.status ?? 401;
      return send(res, status, { error: error.code ?? "E-AUTH", message: error.message });
    }

    try {
      if (method === "GET" && path === "/v1/verticals") {
        const seen = new Map();
        for (const v of registry.values()) if (!seen.has(v.name)) seen.set(v.name, v);
        const list = [...seen.values()].map((v) => {
          const raw = existsSync(join(v.dir, "vertical.yaml")) ? parseSimpleYaml(readText(join(v.dir, "vertical.yaml"))) : {};
          const spec = raw.spec ?? {};
          const asList = (x) => (Array.isArray(x) ? x.map(String) : x == null || x === "" ? [] : [String(x)]);
          return { name: v.name, title: v.title, deliverable: v.deliverable, skills: asList(spec.skills), gates: asList(spec.gates), checks: v.checks, projects: listProjects(v.dir, v.deliverable).map((d) => basename(d)) };
        });
        return send(res, 200, { verticals: list });
      }

      if (method === "POST" && path === "/v1/generate") {
        const body = await readBody(req);
        if (!body.vertical) throw new ApiError(400, "E-API-INPUT", "поле vertical обязательно");
        if (!resolveVertical(body.vertical)) throw new ApiError(400, "E-API-VERTICAL", `неизвестная вертикаль «${body.vertical}»`);
        const idem = body.idempotency_key ? String(body.idempotency_key) : null;
        if (idem && idempotency.has(idem)) {
          const priorId = idempotency.get(idem);
          return send(res, 200, { run_id: priorId, status: runs.get(priorId)?.status ?? "unknown", idempotent: true });
        }
        const runId = `run-${++seq}-${clock().toString(36)}`;
        const run = { id: runId, kind: "generate", target: String(body.vertical), skill: body.skill ? String(body.skill) : null, input: body.input ?? null, status: "queued", result: null, createdAt: clock(), finishedAt: null };
        runs.set(runId, run);
        if (idem) idempotency.set(idem, runId);
        metrics.counter("platform_violations", { platform: "api", rule: "accepted" }).inc();
        enqueue(runId, () => runVerticalTask(String(body.vertical), body.skill ? String(body.skill) : null), auth.role);
        return send(res, 202, { run_id: runId, status: "queued" });
      }

      if (method === "GET" && path.startsWith("/v1/runs/")) {
        const id = path.slice("/v1/runs/".length);
        const run = runs.get(id);
        if (!run) throw new ApiError(404, "E-API-NOT-FOUND", `run «${id}» не найден`);
        return send(res, 200, { run_id: run.id, status: run.status, target: run.target, skill: run.skill, kind: run.kind, result: run.result, created_at: run.createdAt, finished_at: run.finishedAt });
      }

      if (method === "POST" && path.startsWith("/v1/compositions/")) {
        const name = path.slice("/v1/compositions/".length);
        const file = join(compositionsDir, name, "composition.yaml");
        if (!existsSync(file)) throw new ApiError(404, "E-API-NOT-FOUND", `композиция «${name}» не найдена`);
        const composition = loadComposition(file);
        const runId = `comp-${++seq}-${clock().toString(36)}`;
        const run = { id: runId, kind: "composition", target: name, skill: null, input: composition.metadata.goal, status: "queued", result: null, createdAt: clock(), finishedAt: null };
        runs.set(runId, run);
        const acceptHitl = Boolean(req.headers["x-accept-hitl"]);
        enqueue(runId, () => ceo.run(composition, { acceptedHitl: acceptHitl }), auth.role);
        return send(res, 202, { run_id: runId, status: "queued", composition: name });
      }

      return send(res, 404, { error: "E-API-404", message: `нет маршрута ${method} ${path}` });
    } catch (error) {
      const status = error.status ?? 500;
      return send(res, status, { error: error.code ?? "E-API", message: error.message });
    }
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      logger.error?.("api handler упал", { error: String(error?.message ?? error) });
      if (!res.headersSent) send(res, 500, { error: "E-API", message: "внутренняя ошибка" });
      else res.end();
    });
  });

  return {
    server,
    handle,
    runs,
    queue,
    registry,
    async listen(port = Number(process.env.API_PORT ?? 8787), host = process.env.API_HOST ?? "127.0.0.1") {
      await new Promise((ok, fail) => {
        server.once("error", fail);
        server.listen(port, host, ok);
      });
      const addr = server.address();
      logger.info?.("api: слушаю", { address: typeof addr === "object" ? `${addr.address}:${addr.port}` : String(addr) });
      return server.address();
    },
    async close() {
      await new Promise((ok) => server.close(ok));
    },
  };
}

function readText(path) {
  return readFileSync(path, "utf8");
}

/* ———————————————————————————— запуск как CLI ———————————————————————————— */

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) {
  const app = createApiServer();
  app.listen().then(() => {
    process.stdout.write(`ЦЕХ · API Gateway слушает http://127.0.0.1:${process.env.API_PORT ?? 8787}\n`);
    process.stdout.write("роли: Bearer viewer-token | dev-token | admin-token (или заголовок x-role)\n");
  }).catch((error) => {
    process.stderr.write(`не удалось поднять API: ${error.message}\n`);
    process.exit(1);
  });
}

export default createApiServer;
