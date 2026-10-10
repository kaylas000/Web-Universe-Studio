/* ЦЕХ · Метаплатформа — core/observability/metrics.mjs
   Нулевые зависимости: реестр счётчиков, гистограмм и датчиков + экспорт в формате Prometheus
   (GET /metrics, §4.8 ТЗ). Состояние — в памяти процесса; для одного прогона этого достаточно.

   Публичный API:
     metrics.counter(name, labels).inc([v])
     metrics.histogram(name, labels).observe(v)
     metrics.gauge(name, labels).set(v)
     metrics.renderPrometheus() → string
     METRIC_NAMES — канонические имена из §4.8 ТЗ
*/

/** Канонические имена метрик (роли подписей — в скобках). */
export const METRIC_NAMES = Object.freeze({
  RUN_DURATION: "run_duration", // histogram: ['vertical','skill','status']
  RUN_ITERATIONS: "run_iterations", // histogram: ['vertical','skill']
  VALIDATION_ERRORS: "validation_errors", // counter:   ['vertical','error_code']
  BUDGET_USED: "budget_used_usd", // gauge:     ['vertical','run_id']
  TOKENS_USED: "tokens_used", // counter:   ['model','role']
  LLM_LATENCY: "llm_latency", // histogram: ['model','role']
  SANDBOX_TIME: "sandbox_time", // histogram: ['provider','language']
  BUNDLE_SIZE: "bundle_size", // gauge:     ['vertical','skill']
  VIEWPORT_FAILURES: "viewport_failures", // counter:   ['viewport']
  PLATFORM_VIOLATIONS: "platform_violations", // counter:   ['platform','rule']
});

const labelKey = (labels = {}) =>
  Object.keys(labels)
    .sort()
    .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`)
    .join(",");

const familyKey = (name, labels) => `${name}{${labelKey(labels)}}`;

/** @param {number[]} values */
function summarize(values) {
  if (values.length === 0) return { count: 0, sum: 0, min: 0, max: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return { count: values.length, sum, min: Math.min(...values), max: Math.max(...values) };
}

export function createMetrics() {
  /** @type {Map<string, { name: string, labels: Record<string,any>, value: number }>} */
  const counters = new Map();
  /** @type {Map<string, { name: string, labels: Record<string,any>, value: number }>} */
  const gauges = new Map();
  /** @type {Map<string, { name: string, labels: Record<string,any>, values: number[] }>} */
  const histograms = new Map();

  const bump = (bag, name, labels, value) => {
    const key = familyKey(name, labels);
    const entry = bag.get(key) ?? { name, labels, value: 0 };
    entry.value += value;
    bag.set(key, entry);
    return entry.value;
  };

  return {
    counter(name, labels) {
      return { inc: (v = 1) => bump(counters, name, labels, Number(v)) };
    },
    gauge(name, labels) {
      return {
        set: (v) => {
          const key = familyKey(name, labels);
          gauges.set(key, { name, labels, value: Number(v) });
          return Number(v);
        },
      };
    },
    histogram(name, labels) {
      return {
        observe: (v) => {
          const key = familyKey(name, labels);
          const entry = histograms.get(key) ?? { name, labels, values: [] };
          entry.values.push(Number(v));
          histograms.set(key, entry);
          return Number(v);
        },
      };
    },
    snapshot() {
      return {
        counters: [...counters.values()].map((c) => ({ ...c })),
        gauges: [...gauges.values()].map((g) => ({ ...g })),
        histograms: [...histograms.values()].map((h) => ({ name: h.name, labels: h.labels, ...summarize(h.values) })),
      };
    },
    renderPrometheus() {
      const lines = [];
      for (const c of counters.values()) lines.push(`${c.name}{${labelKey(c.labels)}} ${c.value}`);
      for (const g of gauges.values()) lines.push(`${g.name}{${labelKey(g.labels)}} ${g.value}`);
      for (const h of histograms.values()) {
        const s = summarize(h.values);
        const l = labelKey(h.labels);
        lines.push(`${h.name}_count{${l}} ${s.count}`);
        lines.push(`${h.name}_sum{${l}} ${s.sum}`);
        lines.push(`${h.name}_min{${l}} ${s.min}`);
        lines.push(`${h.name}_max{${l}} ${s.max}`);
      }
      return lines.length > 0 ? `${lines.join("\n")}\n` : "";
    },
  };
}

/** Общий реестр процесса: API и оркестратор пишут в него. */
export const metrics = createMetrics();

export default metrics;
