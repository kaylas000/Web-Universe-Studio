#!/usr/bin/env node
/* scripts/validate.mjs — приёмка студии «Юридическая студия».
   Правила декларативны (scripts/rules.json); формат отчёта — контракт ядра (§15 ТЗ). */

import { runSpec } from "../../../core/vertical-kit/index.mjs";

runSpec("legal_docs", new URL("./rules.json", import.meta.url));
