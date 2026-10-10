#!/usr/bin/env node
/* scripts/lint-slop.mjs — анти-слоп студии «Студия мини-приложений».
   Запреты декларативны (scripts/slop.json); формат — «файл:строка B-xx …» (§15 ТЗ). */

import { runSlopSpec } from "../../../core/vertical-kit/index.mjs";

runSlopSpec("mini_apps", new URL("./slop.json", import.meta.url));
