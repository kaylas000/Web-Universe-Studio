#!/usr/bin/env node
/* scripts/validate.mjs — приёмка студии «Студия данных».
   Правила декларативны (scripts/rules.json); формат отчёта — контракт ядра (§15 ТЗ). */

import { runSpec } from "../../../core/vertical-kit/index.mjs";

runSpec("data_analytics", new URL("./rules.json", import.meta.url));
