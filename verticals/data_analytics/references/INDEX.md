# INDEX.md — референсы студии «Студия данных»

Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.

| Id | Приём | Откуда | Что берём |
| --- | --- | --- | --- |
| ref-01 | single-question | references/sources.yaml#metric-report | Отчёт отвечает на один вопрос; каждая метрика связывается с решением, а не с любопытством. |
| ref-02 | denominator | references/sources.yaml#metric-report | Рядом с абсолютным числом всегда стоит знаменатель и период — иначе рост не интерпретируем. |
| ref-03 | sql-nullable | references/sources.yaml#sql-audit | Аудит SQL проверяет JOIN на размножение строк и обработку NULL в агрегатах. |
| ref-04 | idempotent-etl | references/sources.yaml#etl-pipeline | ETL идемпотентен: повторный запуск не дублирует строки (ON CONFLICT / MERGE по бизнес-ключу). |
| ref-05 | schema-first | references/sources.yaml#schema-validate | Схема входа объявляется до загрузки; данные валидируются против неё до записи. |
| ref-06 | dashboard-question | references/sources.yaml#dashboard-spec | Спека дашборда начинается с решения: каждая метрика отвечает на вопрос владельца и имеет формулу и фильтры. |
| ref-07 | quality-profile | references/sources.yaml#quality-profile | Профиль качества (nulls, duplicates, types, row_count) — база доверия к метрикам. |