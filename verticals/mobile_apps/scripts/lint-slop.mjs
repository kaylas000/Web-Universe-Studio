#!/usr/bin/env node
/* scripts/lint-slop.mjs — анти-слоп студии «Студия мобильных приложений».
   Запреты декларативны (scripts/slop.json); формат — «файл:строка B-xx …» (§15 ТЗ). */

import { runSlopSpec } from "../../../core/vertical-kit/index.mjs";

runSlopSpec("mobile_apps", new URL("./slop.json", import.meta.url));
