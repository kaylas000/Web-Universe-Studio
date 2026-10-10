#!/usr/bin/env node
/* scripts/lint-slop.mjs — анти-слоп студии «Контент-студия».
   Запреты декларативны (scripts/slop.json); формат — «файл:строка B-xx …» (§15 ТЗ). */

import { runSlopSpec } from "../../../core/vertical-kit/index.mjs";

runSlopSpec("content_studio", new URL("./slop.json", import.meta.url));
