/* ЦЕХ · Universal Loop Engine — validators/vertical.mjs
   VerticalProjectValidator: тот же детерминированный цикл проверок, что и у цеха
   (CehProjectValidator), но с реестром скриптов ВЕРТИКАЛИ метаплатформы (§7 ТЗ).

   Отличие только в реестре и наборе проверок по умолчанию:
     • ceh_project / cehProject — исторический цех (V-01…V-17, линтеры веб-студии);
     • vertical_project — любая студия verticals/<name>: свой scripts/validate.mjs,
       свой scripts/lint-slop.mjs и свои коды правил (юридические, контентные, данных…).

   Контракт скриптов не меняется (§6 ТЗ): validate.mjs печатает строки
     OK  V-01 заголовок · деталь
     FAIL V-04 заголовок · деталь
     ИТОГ: 8/8 · exit 0
   и завершается 0 только при полном зелёном наборе; lint-slop.mjs печатает строки
     output/post.md:12 B-02 «сообщение»
   и завершается ненулевым кодом при находках. Ядро разбирает оба формата теми же
   парсерами, что и цех (parseValidateReport / parseCodeLines).
*/

import { CehProjectValidator } from "./ceh-project.mjs";

/** Реестр проверок вертикали: имена скриптов внутри verticals/<name>/. */
export const VERTICAL_CHECKS = Object.freeze({
  validate: { script: "scripts/validate.mjs", title: "validate.mjs · детерминированные правила студии", mode: "validate" },
  "lint-slop": { script: "scripts/lint-slop.mjs", title: "анти-слоп и квоты студии", mode: "codes" },
  "lint-copy": { script: "scripts/lint-copy.mjs", title: "редполитика студии (копирайт)", mode: "codes" },
  "lint-marketing": { script: "scripts/lint-marketing.mjs", title: "маркетинг-архитектура студии", mode: "codes" },
});

export class VerticalProjectValidator extends CehProjectValidator {
  static TYPE = "vertical_project";
  static CHECKS = VERTICAL_CHECKS;
  static DEFAULT_CHECKS = Object.freeze(["validate", "lint-slop"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    super({ ...opts, registry: opts.registry ?? VERTICAL_CHECKS });
  }
}

export default VerticalProjectValidator;
