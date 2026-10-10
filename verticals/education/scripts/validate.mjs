#!/usr/bin/env node
/* scripts/validate.mjs — приёмка студии «Образовательная студия».
   Правила декларативны (scripts/rules.json); формат отчёта — контракт ядра (§15 ТЗ). */

import { runSpec } from "../../../core/vertical-kit/index.mjs";

runSpec("education", new URL("./rules.json", import.meta.url));
