#!/usr/bin/env node
/* scripts/lint-quotas.mjs — квоты студии «Юридическая студия» (Q-01…Q-05).
   Квоты декларативны (scripts/quotas.json); исполнитель — scripts/quotas.mjs.
   Формат отчёта — контракт ядра (§15 ТЗ). */

import { runQuotaSpec } from "./quotas.mjs";

runQuotaSpec("legal_docs", new URL("./quotas.json", import.meta.url));