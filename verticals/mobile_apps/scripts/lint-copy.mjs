#!/usr/bin/env node
/* scripts/lint-copy.mjs — редактура студии «Студия мобильных приложений».
   Ищет в текстах приложения следы машинной генерации (копипаст из чат-ботов) и манеру ИИ.
   Движок общий: core/vertical-kit/copywriting.mjs; спецификация — scripts/copy.json.
   Формат вывода: ошибки «файл:строка A-xx …» (гейт), стиль — сводка «[lint-copy] …». */

import { runCopyLint } from "../../../core/vertical-kit/index.mjs";

runCopyLint("mobile_apps", new URL("./copy.json", import.meta.url));
