#!/usr/bin/env node
/* scripts/lint-quotas.mjs — квоты студии «Студия мобильных приложений».
   Квоты декларативны (scripts/quotas.json, Q-01…Q-06, §10.7 ТЗ); формат отчёта —
   тот же контракт ядра (§15): «OK/FAIL Q-xx …» и «ИТОГ: N/N · exit 0». */

import { runSpec } from "../../../core/vertical-kit/index.mjs";

runSpec("mobile_apps", new URL("./quotas.json", import.meta.url));