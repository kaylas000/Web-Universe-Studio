/* ЦЕХ · Метаплатформа — scripts/tz-artifacts.mjs
   §9-правила приёмки (V-xx) и эталонные артефакты 6 не-веб студий — данные.

   Зачем отдельным модулем: `bootstrap-verticals.mjs` рендерит files как данные, а
   `tz-verticals.mjs` держит конституции/анти-слоп (§9/§10). Здесь — вторая половина
   §9: машинные проверки V-xx и артефакт, который их проходит. Прокси-методы помечены
   в `note` там, где ТЗ зовёт внешний tier (LLM-judge, песочница, Playwright) — офлайн
   проверка приближает закон детерминированно, но не подменяет платформенный tier (§14).

   Ключи: TZ_ARTIFACTS[<slug>] = { rules: [V-xx…], demo: { slug, task, files }, artifact? }.
*/

export const TZ_ARTIFACTS = {
  /* ———————————————————————————— 9.5 Education ———————————————————————————— */
  education: {
    rules: [
      {
        code: "V-01",
        title: "Цели по таксономии Блума",
        kind: "linesMatchAtLeast",
        path: "course/README.md",
        pattern: "Знать|Понимать|Применять|Анализировать|Оценивать|Создавать",
        min: 3,
        ok: "цели выражены глаголами Блума (≥3 уровня)",
        fail: "цели не по таксономии Блума (К-01) · прокси taxonomy-валидатора",
      },
      {
        code: "V-02",
        title: "Прогрессия от простого к сложному",
        kind: "linesMatchAtLeast",
        path: "course/README.md",
        pattern: "^-\\s+Урок\\s+\\d",
        min: 3,
        ok: "программа упорядочена по возрастанию сложности",
        fail: "нет упорядоченной программы уроков (К-02)",
      },
      {
        code: "V-03",
        title: "Возрастная адекватность лексики",
        kind: "sentencesMaxWords",
        path: "course/lesson-01.md",
        max: 30,
        ok: "предложения ≤ 30 слов (читаемость)",
        fail: "слишком длинные предложения (К-03) · прокси readability + LLM-judge",
      },
      {
        code: "V-04",
        title: "Структура урока: цель/теория/практика/итог",
        kind: "textHasAll",
        path: "course/lesson-01.md",
        patterns: ["^##\\s+Цель", "^##\\s+Теория", "^##\\s+Практика", "^##\\s+Итог"],
        ok: "все четыре блока урока на месте",
        fail: "пропущен обязательный блок урока (К-04)",
      },
      {
        code: "V-05",
        title: "Интерактив в уроке",
        kind: "regexAtLeast",
        path: "course/lesson-01.md",
        pattern: "Интерактив",
        min: 1,
        ok: "интерактив присутствует (≥1 на 10 мин)",
        fail: "нет интерактива (К-05)",
      },
      {
        code: "V-06",
        title: "Формативная оценка после блоков",
        kind: "regexAtLeast",
        path: "course/lesson-01.md",
        pattern: "Проверка понимания",
        min: 2,
        ok: "проверка понимания идёт после блоков",
        fail: "мало проверок понимания (К-06)",
      },
      {
        code: "V-07",
        title: "Валидный тест (дистракторы, ответ, объяснение)",
        kind: "allOf",
        rules: [
          { kind: "jsonArrayMinItems", path: "course/quiz.json", key: "questions", min: 3 },
          { kind: "jsonArrayEveryHas", path: "course/quiz.json", key: "questions", fields: ["question", "options", "answer", "explanation"] },
          { kind: "jsonArrayEveryMinItems", path: "course/quiz.json", key: "questions", field: "options", min: 3 },
        ],
        ok: "≥3 вопросов, у каждого ≥3 варианта, ответ и объяснение",
        fail: "тест неполный: нужны варианты, один ответ и объяснение (К-07)",
      },
      {
        code: "V-08",
        title: "Соответствие учебному плану",
        kind: "textHasAll",
        path: "course/README.md",
        patterns: ["^##\\s+Соответствие плану"],
        ok: "цели смаппированы на план",
        fail: "нет маппинга целей на план (К-08)",
      },
      {
        code: "V-09",
        title: "Доступность (alt, контраст, субтитры)",
        kind: "textHasAll",
        path: "course/README.md",
        patterns: ["^##\\s+Доступность", "alt"],
        ok: "оговорена доступность материалов",
        fail: "нет блока доступности (К-09) · прокси a11y-линтера",
      },
      {
        code: "V-10",
        title: "Термины определены",
        kind: "textHasAll",
        path: "course/lesson-01.md",
        patterns: ["^##\\s+Термины"],
        ok: "глоссарий терминов на месте",
        fail: "нет раздела «Термины» (К-10)",
      },
      {
        code: "V-11",
        title: "Реалистичная оценка времени",
        kind: "regexAtLeast",
        path: "course/README.md",
        pattern: "≈\\s*\\d+\\s*мин",
        min: 1,
        ok: "указано время прохождения",
        fail: "нет оценки времени (К-11)",
      },
      {
        code: "V-12",
        title: "Источники и ссылки",
        kind: "regexAtLeast",
        path: "course/SOURCES.md",
        pattern: "https?://",
        min: 2,
        ok: "источники со ссылками",
        fail: "менее двух ссылок на источники (К-12)",
      },
      {
        code: "V-13",
        title: "Обратная связь и разбор ошибок",
        kind: "textHasAll",
        path: "course/lesson-01.md",
        patterns: ["^##\\s+Разбор ошибок", "Обратная связь"],
        ok: "есть разбор ошибок и обратная связь",
        fail: "нет блока разбора ошибок (К-13)",
      },
      {
        code: "V-14",
        title: "Мультимодальность (текст + визуал + практика)",
        kind: "textHasAll",
        path: "course/lesson-01.md",
        patterns: ["Визуал", "^##\\s+Практика"],
        ok: "текст, визуал и практика вместе",
        fail: "не хватает модальности (К-14)",
      },
      {
        code: "V-15",
        title: "Аттестация измеряет заявленные цели",
        kind: "textHasAll",
        path: "course/README.md",
        patterns: ["^##\\s+Аттестация", "К-01"],
        ok: "аттестация покрывает цели К-01",
        fail: "аттестация не привязана к целям (К-15)",
      },
    ],
    demo: {
      slug: "kurs-proverka-dannyh",
      task: "собрать первый урок курса о проверке данных на входе",
      files: {
        "course/README.md": `# Курс: Проверка данных на входе

## Цели обучения

Цели сформулированы по таксономии Блума:

1. **Знать** — перечислить места входа данных в систему.
2. **Понимать** — объяснить, почему проверка на границе надёжнее проверки в середине.
3. **Применять** — написать проверку для формы входа.
4. **Анализировать** — разобрать инцидент с испорченными данными.

## Программа

- Урок 1. Где данные входят в систему.
- Урок 2. Проверка типов и границ.
- Урок 3. Сообщения об ошибках.

## Прогрессия

Уроки идут от простого к сложному: узнавание границы → правило проверки → сообщение об ошибке.

## Соответствие плану

| Цель (К-01) | Модуль | Аттестация |
| --- | --- | --- |
| Знать | Урок 1 | Вопрос 1 |
| Понимать | Урок 1 | Вопрос 3 |
| Применять | Урок 2 | Вопрос 2 |
| Анализировать | Урок 3 | Разбор инцидента |

## Доступность

Контраст текста не ниже 4,5:1; у схем заполнен alt; к видео приложены субтитры.

## Оценка времени

Время прохождения курса ≈ 90 мин (3 урока по 30 мин).

## Аттестация

Итоговый тест (quiz.json) измеряет цели К-01: вопросы покрывают узнавание границы, правило
проверки и разбор ошибки.
`,
        "course/lesson-01.md": `# Урок 1. Где данные входят в систему

## Цель

Научиться находить границу входа данных и ставить проверку именно там.

## Термины

- **Граница** — место, где данные входят в систему (форма, файл, запрос).
- **Валидация** — проверка данных на соответствие правилам.

## Теория

Данные попадают в программу через границу: форму, файл или ответ чужого сервиса. Граница —
единственное место, где данные ещё чужие. Внутри системы мы уже отвечаем за их форму.

Проверять нужно на границе, а не в середине. Поздняя проверка пропускает ошибку вглубь кода.
Значение попадает в расчёт, расчёт — в отчёт, отчёт — к человеку. Найти источник такой ошибки
трудно.

## Проверка понимания

Вопрос: где ставить проверку — на границе или после сохранения? Почему?

## Практика

Отметьте поля формы и для каждого — тип и допустимый диапазон. Перенесите проверку на границу.

## Интерактив

Упражнение: подчеркните в форме входа место, где стоит проверка сейчас.

## Проверка понимания

Вопрос: что произойдёт с пустым полем без проверки на границе?

## Разбор ошибок

Обратная связь: если проверка стоит после сохранения, покажите, как ошибка дойдёт до отчёта.
Разберите три случая — пустое поле, неверный тип, неверный формат.

## Визуал

Схема границы: стрелка «форма → проверка → система» (у схемы заполнен alt).

## Итог

Проверка живёт на границе; всё, что прошло границу, считается доверенным.
`,
        "course/quiz.json": `{
  "questions": [
    {
      "question": "Где проверять данные?",
      "options": ["На границе", "После сохранения", "В базе"],
      "answer": "На границе",
      "explanation": "Граница — единственное место, где данные ещё чужие; проверка там останавливает ошибку до расчётов."
    },
    {
      "question": "Что описывает граница?",
      "options": ["Что пришло и в каком виде", "Кто автор", "Сколько памяти"],
      "answer": "Что пришло и в каком виде",
      "explanation": "Граница отвечает на вопросы происхождения, формы и поведения данных."
    },
    {
      "question": "Чем дорога поздняя проверка?",
      "options": ["Ошибка распространяется по коду", "Медленная вёрстка", "Нужен дизайнер"],
      "answer": "Ошибка распространяется по коду",
      "explanation": "Поздняя ошибка проходит через расчёты и теряет связь с источником."
    }
  ]
}
`,
        "course/SOURCES.md": `# Источники

- Принцип «parse, don’t validate» — https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
- Практики граничной валидации веб-форм — https://owasp.org/www-community/vulnerabilities/
- Разбор инцидентов с данными на границе — внутренний отчёт студии.
`,
      },
    },
  },
  /* ———————————————————————————— 9.2 Legal Docs ———————————————————————————— */
  legal_docs: {
    rules: [
      { code: "V-01", title: "Тип документа и стороны с реквизитами", kind: "allOf", rules: [
        { kind: "fileExists", path: "docs/dogovor.md" },
        { kind: "textHasAll", path: "docs/dogovor.md", patterns: ["^##\\s+Стороны", "^#\\s+Договор"] },
      ], ok: "договор с разделом «Стороны»", fail: "нет договора или раздела «Стороны» (К-01)" },
      { code: "V-02", title: "Существенные условия предмета", kind: "textHasAll", path: "docs/dogovor.md", patterns: ["^##\\s+Предмет", "1\\.1\\."], ok: "предмет описан", fail: "нет предмета договора (К-02)" },
      { code: "V-03", title: "Ссылки на нормы ГК РФ", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "docs/dogovor.md", pattern: "ГК РФ|Гражданск", min: 1 },
        { kind: "regexAtLeast", path: "docs/SOURCES.md", pattern: "ГК РФ", min: 1 },
      ], ok: "нормы ГК РФ указаны и в источнике", fail: "нет опоры на ГК РФ (К-03) · прокси LLM-judge + RAG" },
      { code: "V-04", title: "Нет противоречий нумерации", kind: "uniqueNumbering", path: "docs/dogovor.md", min: 8, ok: "нумерация пунктов уникальна", fail: "дубли нумерации пунктов (К-04)" },
      { code: "V-05", title: "Реквизиты по контрольным суммам", kind: "allOf", rules: [
        { kind: "innChecksum", path: "docs/dogovor.md", min: 2 },
        { kind: "ogrnChecksum", path: "docs/dogovor.md", min: 2 },
      ], ok: "ИНН и ОГРН обеих сторон валидны", fail: "невалидные ИНН/ОГРН (К-05)" },
      { code: "V-06", title: "Ясность формулировок", kind: "sentencesMaxWords", path: "docs/dogovor.md", max: 40, ok: "предложения ≤ 40 слов", fail: "слишком длинные формулировки (К-06)" },
      { code: "V-07", title: "Обработка ПДн (152-ФЗ)", kind: "implies", path: "docs/dogovor.md", if: "персональн", then: ["152-ФЗ", "цел", "срок", "соглас"], ok: "если ПДн обрабатываются — есть цели/срок/согласие", fail: "ПДн без 152-ФЗ-обвязки (К-07)" },
      { code: "V-08", title: "Ответственность и порядок споров", kind: "textHasAll", path: "docs/dogovor.md", patterns: ["^##\\s+Ответственность", "Претензионн", "суд"], ok: "ответственность и споры описаны", fail: "нет ответственности/порядка споров (К-08)" },
      { code: "V-09", title: "Изменение и расторжение", kind: "textHasAll", path: "docs/dogovor.md", patterns: ["Изменени", "расторж"], ok: "порядок изменения/расторжения задан", fail: "не описан порядок изменения/расторжения (К-09)" },
      { code: "V-10", title: "Версионирование документа", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "docs/dogovor.md", pattern: "\\d{2}\\.\\d{2}\\.\\d{4}", min: 1 },
        { kind: "textHasAll", path: "docs/dogovor.md", patterns: ["г\\. Москва", "Редакц"] },
      ], ok: "есть дата, место и номер редакции", fail: "нет версии документа (К-10)" },
      { code: "V-11", title: "Нет неюридических оборотов", kind: "regexAbsent", path: "docs/dogovor.md", pattern: "в соответствии с действующим|надлежащим образом|настоящий Договор", ok: "без оборотов-заглушек", fail: "найден канцелярит (К-11) · см. lint-slop" },
      { code: "V-12", title: "Сноски на НПА с редакцией/датой", kind: "textHasAll", path: "docs/SOURCES.md", patterns: ["ГК РФ", "ред"], ok: "сноски с редакцией", fail: "сноски без редакции/даты (К-12)" },
      { code: "V-13", title: "Дисклеймер о не-консультации", kind: "textHasAll", path: "docs/dogovor.md", patterns: ["не является юридической консультацией"], ok: "дисклеймер есть", fail: "нет дисклеймера (К-13)" },
      { code: "V-14", title: "Формальные атрибуты", kind: "allOf", rules: [
        { kind: "textHasAll", path: "docs/dogovor.md", patterns: ["Приложени", "Подписи сторон"] },
        { kind: "uniqueNumbering", path: "docs/dogovor.md", min: 8 },
      ], ok: "нумерация, приложения, места подписей", fail: "не хватает формальных атрибутов (К-14)" },
      { code: "V-15", title: "Флаг HITL для критического документа", kind: "fileExists", path: "docs/HITL.md", ok: "документ помечен HITL", fail: "нет флага ручной проверки (К-15)" },
    ],
    demo: {
      slug: "dogovor-postavki",
      task: "составить договор поставки оборудования для ООО «Речной порт»",
      files: {
        "docs/dogovor.md": `# Договор поставки № П-2026/014

г. Москва · 01.02.2026 · Редакция № 1

## Термины

1.1. «Оборудование» — товар по Спецификации (Приложение № 1).
1.2. «Стороны» — Поставщик и Покупатель, указанные в разделе «Стороны».

## Предмет

2.1. Поставщик передаёт Покупателю Оборудование по Спецификации (Приложение № 1).
2.2. Наименование, количество и сроки поставки определяются Спецификацией.
2.3. К отношениям Сторон применяется ГК РФ.

## Стороны

3.1. Поставщик: ООО «Северный контур», ИНН 7707083893, ОГРН 1157746000004.
3.2. Покупатель: ООО «Речной порт», ИНН 7736050003, ОГРН 1157746000015.

## Права и обязанности

4.1. Поставщик поставляет Оборудование в срок из Спецификации.
4.2. Покупатель принимает Оборудование и подписывает акт приёмки.
4.3. Покупатель вправе проверить комплектность до подписания акта.

## Ответственность и споры

5.1. За просрочку поставки Поставщик уплачивает пеню 0,1 % от стоимости за каждый день.
5.2. Претензионный порядок обязателен: срок ответа на претензию — 10 рабочих дней.
5.3. Споры, не урегулированные претензией, рассматривает Арбитражный суд города Москвы.

## Изменение и расторжение

6.1. Изменение договора возможно письменным соглашением Сторон.
6.2. Расторжение — по соглашению Сторон либо в судебном порядке.

## Срок действия

7.1. Договор действует до полного исполнения обязательств Сторонами.

## Приложения

8.1. Приложение № 1 — Спецификация Оборудования.

## Реквизиты

9.1. Поставщик: ООО «Северный контур», 127015, Москва, ул. Лесная, д. 5, ИНН 7707083893.
9.2. Покупатель: ООО «Речной порт», 115184, Москва, ул. Большая, д. 12, ИНН 7736050003.

## Подписи сторон

Поставщик: ____________________ / Покупатель: ____________________

Документ не является юридической консультацией; перед подписанием проверьте условия с юристом.
`,
        "docs/SOURCES.md": `# Источники норм

| Норма | Реквизиты акта | Что берём |
| --- | --- | --- |
| Ст. 506 ГК РФ | ГК РФ, часть вторая, ред. от 2024 | договор поставки |
| Ст. 330 ГК РФ | ГК РФ, часть первая, ред. от 2024 | неустойка (пеня) |
| Ст. 309 ГК РФ | ГК РФ, часть первая, ред. от 2024 | исполнение обязательств |
`,
        "docs/README.md": `# Резюме договора поставки

Клиент получает Оборудование по Спецификации и платит за него. Срок поставки — в Приложении № 1.

## Что важно знать

- Просрочка Поставщика: пеня 0,1 % в день.
- Убытки сверх пени возмещаются в непокрытой части.
- Споры разбирает Арбитражный суд города Москвы (после претензии).
`,
        "docs/HITL.md": `# HITL — ручная проверка обязательна

Документ критический: не публикуется и не отправляется контрагенту автоматически.
Перед выдачей — юридическое ревью человеком (К-15).
`,
      },
    },
  },
  /* ———————————————————————————— 9.3 Content Studio ———————————————————————————— */
  content_studio: {
    rules: [
      { code: "V-01", title: "Уникальность текста", kind: "uniqueShingles", path: "content/post.md", size: 5, min: 0.9, ok: "доля уникальных шинглов ≥ 0,9", fail: "текст содержит повторы (К-01) · прокси lint-unique" },
      { code: "V-02", title: "Плотность ключевого слова 1–3 %", kind: "keywordDensity", path: "content/post.md", keyword: "данн", min: 1, max: 3, ok: "плотность ключа в норме", fail: "переспам или недобор ключа (К-02)" },
      { code: "V-03", title: "Читаемость ≥ 60", kind: "readabilityMin", path: "content/post.md", min: 60, ok: "адаптированный Flesch ≥ 60", fail: "текст труднее порога (К-03) · прокси lint-readability" },
      { code: "V-04", title: "Структура: один H1 и иерархия H2", kind: "allOf", rules: [
        { kind: "headingCount", path: "content/post.md", level: 1, min: 1, max: 1 },
        { kind: "regexAtLeast", path: "content/post.md", pattern: "^##\\s+", min: 2 },
      ], ok: "ровно один H1 и ≥2 H2", fail: "сломана иерархия заголовков (К-04)" },
      { code: "V-05", title: "Мета: title 50–60, description 120–158", kind: "jsonStringLength", path: "content/meta.json", fields: [
        { key: "title", min: 50, max: 60 },
        { key: "description", min: 120, max: 158 },
      ], ok: "мета в пределах лимитов", fail: "title/description вне лимитов (К-05) · прокси seo-gate" },
      { code: "V-06", title: "Внутренние и внешние ссылки", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "content/post.md", pattern: "\\]\\(/", min: 2 },
        { kind: "regexAtLeast", path: "content/post.md", pattern: "\\]\\(https?://", min: 1 },
      ], ok: "≥2 внутренних и ≥1 внешняя ссылка", fail: "не хватает ссылок (К-06)" },
      { code: "V-07", title: "Нет штампов и воды", kind: "regexAbsent", path: "content/post.md", pattern: "эффективн|уникальн(ый|ое) решени|команда профессионалов", ok: "штампов нет", fail: "найден штамп (К-07) · см. lint-copy" },
      { code: "V-08", title: "Факты со сноской на источник", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "content/post.md", pattern: "\\[\\^?\\d+\\]", min: 2 },
        { kind: "fileExists", path: "content/SOURCES.md" },
      ], ok: "цифры и факты со сносками", fail: "нет сносок/источников (К-08) · прокси lint-facts" },
      { code: "V-09", title: "Tone of voice из брифа", kind: "textHasAll", path: "content/README.md", patterns: ["Tone of voice"], ok: "tone of voice зафиксирован", fail: "tone of voice не задан (К-09) · прокси LLM-judge" },
      { code: "V-10", title: "Атрибуция (E-E-A-T)", kind: "textHasAll", path: "content/README.md", patterns: ["Автор"], ok: "автор указан", fail: "нет атрибуции (К-10)" },
      { code: "V-11", title: "Изображения с alt", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "content/post.md", pattern: "!\\[[^\\]]+\\]\\(", min: 1 },
      ], ok: "изображение с alt-текстом", fail: "нет изображения с alt (К-11)" },
      { code: "V-12", title: "JSON-LD по типу контента", kind: "allOf", rules: [
        { kind: "jsonHas", path: "content/structured-data.json", keys: ["@type"] },
        { kind: "jsonHas", path: "content/structured-data.json", keys: ["headline"] },
      ], ok: "JSON-LD Article на месте", fail: "нет JSON-LD (К-12)" },
      { code: "V-13", title: "Редполитика и типографика", kind: "regexAbsent", path: "content/post.md", pattern: " - ", ok: "дефис-минус не используется как тире", fail: "дефис вместо тире (К-13) · см. typographer" },
      { code: "V-14", title: "CTA с data-analytics-event", kind: "regexAtLeast", path: "content/post.md", pattern: "data-analytics-event", min: 1, ok: "у CTA есть событие аналитики", fail: "CTA без data-analytics-event (К-14)" },
      { code: "V-15", title: "Нет AI-паттернов", kind: "regexAbsent", path: "content/post.md", pattern: "важно отметить|в современном мире|стоит отметить", ok: "AI-штампов нет", fail: "найден AI-паттерн (К-15)" },
    ],
    demo: {
      slug: "post-bez-shablonov",
      task: "написать SEO-статью о проверке данных на входе для блога продукта",
      files: {
        "content/post.md": `# Как проверять данные на входе

Проверка ловит брак на входе. Так ошибка не уйдёт в код.

Форма, файл, запрос — это граница. Тут данные ещё чужие. Мы задаём им тип и границы.

## Почему проверка важна

Поздняя проверка дорога. Ошибка идёт в расчёт. Потом в отчёт. Потом к человеку. Искать корень трудно.

Правило на входе делает код предсказуемым.

## Как поставить проверку

Сначала выпишите поля. Для каждого задайте тип и границы.

Потом проверьте крайние случаи. Пустое поле — брак. Чужой тип — брак.

Ошибку показывайте рядом с полем. Так человек поймёт, что править.[^1]

## Частые ошибки

Проверку ставят после сохранения. Тогда след ошибки теряется.

Правило копируют в трёх местах. Копии расходятся. Это тоже баг.

## Итог

Правило на входе экономит время. Доверяйте лишь тому, что прошло границу.[^2]

![Схема границы входа](/assets/border.png)

Смотрите, [как устроены формы](/blog/forms) и [разбор инцидентов](/blog/incidents). Внешнее [исследование](https://example.org/study) подтверждает подход.

<button data-analytics-event="cta-signup">Записаться на разбор</button>

[^1]: Внутренний разбор UX-студии.
[^2]: Отчёт об инцидентах на границе, 2025.
`,
        "content/meta.json": `{
  "title": "Как проверять данные на входе: гид по валидации форм",
  "description": "Разбираем, почему проверка данных на границе надёжнее поздней и как настроить её для формы: типы, границы значений, сообщения об ошибках и разбор сбоев."
}
`,
        "content/structured-data.json": `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Как проверять данные на входе",
  "author": { "@type": "Person", "name": "Иван Петров" },
  "datePublished": "2026-02-01"
}
`,
        "content/SOURCES.md": `# Источники

- Внутренний разбор UX-студии по формам.
- Отчёт об инцидентах с данными, 2025.
`,
        "content/README.md": `# Пост: Как проверять данные на входе

Автор: Иван Петров, технический редактор студии.
Tone of voice: спокойный и конкретный, без штампов.
`,
      },
    },
  },
  /* ———————————————————————————— 9.4 Data Analytics ———————————————————————————— */
  data_analytics: {
    rules: [
      { code: "V-01", title: "SQL синтаксически валиден", kind: "allOf", rules: [
        { kind: "balancedDelimiters", path: "analysis/queries.sql", pairs: [["(", ")"]] },
        { kind: "regexAtLeast", path: "analysis/queries.sql", pattern: "SELECT", min: 1 },
        { kind: "regexAtLeast", path: "analysis/queries.sql", pattern: "FROM", min: 1 },
      ], ok: "скобки сбалансированы, SELECT/FROM на месте", fail: "SQL не проходит базовый разбор (К-01) · прокси парсера + песочницы" },
      { code: "V-02", title: "Нет SELECT *", kind: "regexAbsent", path: "analysis/queries.sql", pattern: "SELECT\\s+\\*", ok: "колонки перечислены явно", fail: "найден SELECT * (К-02) · regex-линтер" },
      { code: "V-03", title: "JOIN вместо коррелированных подзапросов", kind: "regexAbsent", path: "analysis/queries.sql", pattern: "\\(\\s*SELECT", ok: "нет вложенных SELECT (коррелированных подзапросов)", fail: "коррелированный подзапрос вместо JOIN (К-03) · эвристика" },
      { code: "V-04", title: "EXPLAIN ANALYZE без Seq Scan по большим таблицам", kind: "allOf", rules: [
        { kind: "fileExists", path: "analysis/plan.txt" },
        { kind: "regexAbsent", path: "analysis/plan.txt", pattern: "Seq Scan on (payments|refunds)" },
      ], ok: "план без Seq Scan по крупным таблицам", fail: "Seq Scan по большой таблице или нет плана (К-04) · песочница" },
      { code: "V-05", title: "Обработаны ошибки и пустой результат", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "analysis/etl.py", pattern: "try:", min: 1 },
        { kind: "regexAtLeast", path: "analysis/etl.py", pattern: "except", min: 1 },
        { kind: "regexAtLeast", path: "analysis/etl.py", pattern: "if not |if len\\(", min: 1 },
      ], ok: "try/except и проверка пустого результата на месте", fail: "нет обработки ошибок/пустого результата (К-05)" },
      { code: "V-06", title: "Документация скриптов", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "analysis/etl.py", pattern: "\"\"\"", min: 1 },
        { kind: "regexAtLeast", path: "analysis/queries.sql", pattern: "^--", min: 1 },
      ], ok: "есть docstring и комментарии к запросам", fail: "нет документации назначения (К-06) · AST-линтер" },
      { code: "V-07", title: "Воспроизводимость", kind: "allOf", rules: [
        { kind: "fileExists", path: "analysis/requirements.txt" },
        { kind: "regexAtLeast", path: "analysis/requirements.txt", pattern: "==", min: 2 },
        { kind: "regexAtLeast", path: "analysis/etl.py", pattern: "[Ss]eed", min: 1 },
      ], ok: "pinned-версии и фиксированный seed", fail: "нет pinned-версий/seed (К-07) · чек-лист" },
      { code: "V-08", title: "Параметризация против инъекций", kind: "allOf", rules: [
        { kind: "regexAbsent", path: "analysis/etl.py", pattern: "f[\"']?\\s*(SELECT|INSERT|UPDATE|DELETE)" },
        { kind: "regexAtLeast", path: "analysis/etl.py", pattern: "%\\(\\w+\\)s|:\\w+", min: 1 },
      ], ok: "запросы параметризованы, без f-string SQL", fail: "SQL собирается строкой (К-08) · regex-линтер" },
      { code: "V-09", title: "Идемпотентность ETL", kind: "regexAtLeast", path: "analysis/etl.py", pattern: "ON CONFLICT|INSERT OR REPLACE|MERGE", min: 1, ok: "повторный запуск не дублирует данные", fail: "нет upsert/идемпотентного ключа (К-09)" },
      { code: "V-10", title: "Входные данные валидируются по схеме", kind: "fileExists", path: "analysis/schema.json", ok: "схема входных данных объявлена", fail: "нет schema-валидации входа (К-10) · schema-валидатор" },
      { code: "V-11", title: "Метрики качества данных", kind: "jsonHas", path: "analysis/profile.json", keys: ["nulls", "duplicates", "types"], ok: "профиль покрывает nulls/дубликаты/типы", fail: "нет профиля качества данных (К-11) · профилировщик" },
      { code: "V-12", title: "Контроль стоимости сканирования", kind: "regexAtLeast", path: "analysis/queries.sql", pattern: "WHERE|LIMIT|PARTITION", min: 1, ok: "есть фильтры/лимит/партиции", fail: "запрос без ограничения сканирования (К-12)" },
      { code: "V-13", title: "Время выполнения в бюджете", kind: "planExecutionTimeUnder", path: "analysis/plan.txt", maxMs: 5000, ok: "Execution Time ≤ 5 с", fail: "запрос выходит за бюджет песочницы (К-13) · замер" },
      { code: "V-14", title: "PII маскируется/хешируется", kind: "implies", path: "analysis/etl.py", if: "PII|email|phone", then: ["sha256|hashlib|mask|хеш"], ok: "PII не хранится в открытом виде", fail: "PII без маскирования (К-14) · regex по чувствительным полям" },
      { code: "V-15", title: "Результаты воспроизводимы", kind: "allOf", rules: [
        { kind: "jsonArrayMinItems", path: "analysis/metrics.json", key: "metrics", min: 1 },
        { kind: "jsonArrayEveryHas", path: "analysis/metrics.json", key: "metrics", fields: ["name", "formula", "value"] },
      ], ok: "каждая метрика с формулой и значением", fail: "метрики неполны (К-15) · прогон в песочнице" },
    ],
    demo: {
      slug: "sales-dashboard",
      task: "посчитать метрики продаж за IV квартал 2025 и оформить разбор",
      files: {
        "analysis/queries.sql": `-- Выручка по месяцам
SELECT date_trunc('month', paid_at) AS month, SUM(amount) AS revenue
FROM payments WHERE status = 'paid' GROUP BY 1 ORDER BY 1;

-- Средний чек (только оплаченные заказы)
SELECT date_trunc('month', paid_at) AS month, AVG(amount) AS avg_check
FROM payments WHERE status = 'paid' GROUP BY 1 ORDER BY 1;

-- Возвраты по месяцам, не больше 1000 строк для превью
SELECT date_trunc('month', refunded_at) AS month, SUM(amount) AS refunds
FROM refunds WHERE refunded_at >= '2025-10-01' GROUP BY 1 ORDER BY 1 LIMIT 1000;
`,
        "analysis/etl.py": `"""ETL: загрузка платежей в витрину sales. Идемпотентно через ON CONFLICT.

PII не хранится: пользователь представлен хешем (sha256).
"""
import hashlib

import psycopg

SEED = 42  # фиксированный seed для воспроизводимых сэмплов

UPSERT = """
INSERT INTO sales_payments (id, paid_at, amount, status)
VALUES (%(id)s, %(paid_at)s, %(amount)s, %(status)s)
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;
"""


def mask_user(user):
    """Псевдонимизация пользователя: PII заменяем хешем, исходник не сохраняем."""
    return hashlib.sha256(str(user).encode()).hexdigest()


def load(rows):
    if not rows:
        return 0
    loaded = 0
    with psycopg.connect("dbname=sales") as conn:
        try:
            with conn.cursor() as cur:
                for row in rows:
                    cur.execute(UPSERT, row)
                    loaded += 1
            conn.commit()
        except psycopg.Error:
            conn.rollback()
            return 0
    return loaded
`,
        "analysis/requirements.txt": `psycopg==3.2.3
pandas==2.2.3
`,
        "analysis/plan.txt": `EXPLAIN ANALYZE
Index Scan using payments_paid_at_idx on payments  (cost=0.42..8123.10 rows=250000 width=48) (actual time=0.03..42.10 rows=250000 loops=1)
Planning Time: 0.29 ms
Execution Time: 42.10 ms
`,
        "analysis/schema.json": `{
  "table": "payments",
  "columns": [
    { "name": "id", "type": "uuid", "nullable": false },
    { "name": "paid_at", "type": "timestamp", "nullable": false },
    { "name": "amount", "type": "numeric", "nullable": false },
    { "name": "status", "type": "text", "nullable": false }
  ]
}
`,
        "analysis/profile.json": `{
  "nulls": { "id": 0, "amount": 2, "paid_at": 0 },
  "duplicates": { "id": 0 },
  "types": { "amount": "numeric", "paid_at": "timestamp", "status": "text" }
}
`,
        "analysis/metrics.json": `{
  "period": { "from": "2025-10-01", "to": "2025-12-31" },
  "metrics": [
    { "name": "Выручка", "formula": "SUM(amount) WHERE status='paid'", "value": 12840000 },
    { "name": "Средний чек", "formula": "SUM(amount)/COUNT(order_id) WHERE status='paid'", "value": 6420 },
    { "name": "Доля возвратов", "formula": "SUM(refunds)/SUM(amount)", "value": 0.031 }
  ]
}
`,
        "analysis/report.md": `# Продажи за IV квартал 2025

Источник данных: таблицы payments и refunds, срез на 31.12.2025.

## Что видно

Выручка выросла на 12 % к прошлому кварталу, но средний чек почти не менялся. Рост дал объём заказов, а не цена. Доля возвратов — 3,1 %.

## Вывод

Расти за счёт объёма дороже, чем поднять чек: возвраты растут вместе с числом мелких заказов. Решение: собрать набор из трёх позиций в один заказ и протестировать на двух категориях в январе.
`,
      },
    },
  },
};

export default TZ_ARTIFACTS;
