#!/usr/bin/env node
/* scripts/lint-quotas.mjs — квоты студии «Контент-студия» (Q-01…Q-06).
   Квоты декларативны (scripts/quotas.json); исполнитель — scripts/quotas.mjs.
   Формат отчёта — контракт ядра (§15 ТЗ). */

import { runQuotaSpec } from "./quotas.mjs";

runQuotaSpec("content_studio", new URL("./quotas.json", import.meta.url));