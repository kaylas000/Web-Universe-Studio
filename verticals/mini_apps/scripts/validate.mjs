#!/usr/bin/env node
/* scripts/validate.mjs — приёмка студии «Студия мини-приложений».
   Правила декларативны (scripts/rules.json); формат отчёта — контракт ядра (§15 ТЗ). */

import { runSpec } from "../../../core/vertical-kit/index.mjs";

runSpec("mini_apps", new URL("./rules.json", import.meta.url));
