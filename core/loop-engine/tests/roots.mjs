/* Общие корни для тестов движка в мета-платформе (не тест-файл: не собирается node --test).

   ENGINE_ROOT — корень репозитория: здесь живут core/loop-engine и бутстрап-фикстура
                 projects/_LOOP_TEMPLATE, которые нужны самопроверке движка.
   STUDIO_ROOT — корень эталонной студии (verticals/web_studio): архив (CONSTITUTION.md,
                 anti-slop/, skills/, motion/, gates/, references/), scripts/ и projects/.
                 Переопределяется переменной окружения LOOP_STUDIO_ROOT.

   Разделение отражает раскладку метаплатформы §7.3 ТЗ: ядро в core/, веб-вертикаль — в
   verticals/web_studio. Раньше оба корня совпадали (монолитный ЦЕХ); теперь их два. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const ENGINE_ROOT = resolve(HERE, "..", "..", "..");
export const TEMPLATE_DIR = resolve(ENGINE_ROOT, "projects", "_LOOP_TEMPLATE");
export const STUDIO_ROOT = resolve(
  process.env.LOOP_STUDIO_ROOT ?? resolve(ENGINE_ROOT, "verticals", "web_studio"),
);
