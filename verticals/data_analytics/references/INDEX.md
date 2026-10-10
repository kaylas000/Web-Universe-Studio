# INDEX.md — референсы студии «Студия данных»

Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.

| Id | Приём | Откуда | Что берём |
| --- | --- | --- | --- |
| ref-01 | single-question | references/sources.yaml#metric-report | Отчёт отвечает на один вопрос; каждая метрика связывается с решением, а не с любопытством. |
| ref-02 | denominator | references/sources.yaml#metric-report | Рядом с абсолютным числом всегда стоит знаменатель и период — иначе рост не интерпретируем. |
| ref-03 | sql-nullable | references/sources.yaml#sql-audit | Аудит SQL проверяет JOIN на размножение строк и обработку NULL в агрегатах. |
