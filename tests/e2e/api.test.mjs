/* tests/e2e/api.test.mjs — сквозной прогон API Gateway (§4.9): роли, идемпотентность, очередь, композиция. */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createApiServer } from "../../core/api/server.mjs";

const H = { authorization: "Bearer dev-token", "content-type": "application/json" };

async function waitForRun(base, id, headers, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await (await fetch(`${base}/v1/runs/${id}`, { headers })).json();
    if (["ok", "fail", "error"].includes(run.status)) return run;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`run ${id} не завершился за ${timeoutMs}ms`);
}

test("API Gateway: health, роли, generate+идемпотентность, композиция, метрики", async (t) => {
  const app = createApiServer();
  const addr = await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${addr.port}`;
  t.after(() => app.close());

  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, "ok");
  assert.equal(health.verticals, 3);

  assert.equal((await fetch(`${base}/v1/verticals`)).status, 401, "без токена — 401");
  assert.equal((await fetch(`${base}/health`)).status, 200, "health открыт");
  assert.equal((await fetch(`${base}/nope`, { headers: H })).status, 404);

  const verts = await (await fetch(`${base}/v1/verticals`, { headers: H })).json();
  assert.equal(verts.verticals.length, 3);

  const gen = await (await fetch(`${base}/v1/generate`, { method: "POST", headers: H, body: JSON.stringify({ vertical: "mini_apps", idempotency_key: "k1" }) })).json();
  const gen2 = await (await fetch(`${base}/v1/generate`, { method: "POST", headers: H, body: JSON.stringify({ vertical: "mini_apps", idempotency_key: "k1" }) })).json();
  assert.equal(gen2.idempotent, true);
  assert.equal(gen2.run_id, gen.run_id);

  const run = await waitForRun(base, gen.run_id, H);
  assert.equal(run.status, "ok", JSON.stringify(run.result));

  const badVertical = await fetch(`${base}/v1/generate`, { method: "POST", headers: H, body: JSON.stringify({ vertical: "nope" }) });
  assert.equal(badVertical.status, 400);

  const comp = await (await fetch(`${base}/v1/compositions/app-with-landing`, { method: "POST", headers: H })).json();
  const compRun = await waitForRun(base, comp.run_id, H);
  assert.equal(compRun.status, "ok", JSON.stringify(compRun.result));
  assert.equal(compRun.result.passed, compRun.result.total);

  const metrics = await (await fetch(`${base}/metrics`)).text();
  assert.match(metrics, /run_duration_count/);
});
