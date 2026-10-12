# tools студии «Образовательная студия»

Утилиты студии, которые можно звать из CLI/кода (приёмка живёт в `scripts/`; общие
инварианты гоняет `core/gate.mjs` по `scripts/validate.mjs`, `scripts/lint-slop.mjs`
и `scripts/lint-quotas.mjs`). Все три утилиты — читатели артефактов `course/`, без
сети и ключей; у каждой есть ESM-API для переиспользования в хуках скиллов.

## load-estimator.mjs

Калькулятор нагрузки курса (К-11, Q-05):

```bash
node tools/load-estimator.mjs 30 3
node tools/load-estimator.mjs --course projects/osnovy-analitiki
```

- считает суммарное время «≈ N мин по M урокам (по X мин на урок)»;
- сверяет расчёт с оценкой «≈ N мин» в `course/README.md` (V-11);
- инвариант Q-05: урок в окне 10–60 минут, сумма сходится с числом уроков;
- exit 0 — оценка реалистична; 1 — расхождение; 2 — нет аргументов.

ESM-API: `estimateLoad({minutes, lessons})` → `{ totalMinutes, lessons, perLesson, ok, findings }`,
`readCourseLoad(readmeText)` → `{ total, lessons, perLesson }`, `auditCourse(readmeText)` → `{ ok, findings, … }`.

Используют скиллы `course-syllabus`, `lesson-plan`, `onboarding-path` (checks `tools/load-estimator.mjs → «≈ N мин по M урокам» сходится`).

## glossary-check.mjs

Проверка раздела «Термины» урока (К-10):

```bash
node tools/glossary-check.mjs projects/osnovy-analitiki/course/lesson-01.md
```

- каждый термин, встреченный в теле урока, определён в разделе «Термины»;
- определение стоит раньше первого употребления и не короче 8 символов;
- раздел содержит ≥ 2 определений (V-10);
- вывод — `ok: термины определены (…)` или список `FAIL «термин» …`;
- exit 0 — термины в порядке; 1 — есть неопределённые; 2 — нет аргумента.

ESM-API: `parseLesson(text)` → `{ termIdx, end, definitions, bodyTerms }`,
`auditGlossary(text)` → `{ ok, problems, terms }`.

Использует скилл `glossary-builder` (checks `tools/glossary-check.mjs → ok: термины определены, определения не короче 8 символов`).

## quiz-audit.mjs

Аудит теста курса (К-07, Q-03):

```bash
node tools/quiz-audit.mjs projects/osnovy-analitiki/course/quiz.json
```

- у каждого вопроса ровно один правильный ответ, и он входит в варианты ровно один раз;
- варианты уникальны, их ≥ 3, пустых вариантов нет;
- объяснение ≥ 20 символов (B-01 — тест без объяснения);
- вопросов 3–12 на урок (Q-03);
- вывод — `ok: тест валиден, вопросов N` или список `FAIL вопрос N …`;
- exit 0 — тест валиден; 1 — нарушения; 2 — нет аргумента.

ESM-API: `auditQuiz(data)` → `{ ok, problems, total }`.

Использует скилл `quiz-builder` (checks `tools/quiz-audit.mjs → ответ ∈ варианты ровно 1 раз, варианты уникальны, объяснение ≥ 20 символов`).

## Прогон по всем проектам

Те же инварианты работают и декларативно: `scripts/quotas.mjs` (Q-01…Q-05) читает
`course/README.md`, `course/lesson-01.md` и `course/quiz.json` через `core/vertical-kit`
(`jsonArrayMinItems`) и локальные предикаты — те же эвристики, что у утилит выше.