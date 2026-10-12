# `_LOOP_TEMPLATE` — шаблон проекта для Universal Loop Engine

Заготовка под цикл «контекст → генерация → валидация → фидбек». Скопируй папку,
поправь конфиг и промпты — движок трогать не нужно.

```bash
cp -r projects/_LOOP_TEMPLATE projects/<имя>
cd projects/<имя>
node run.mjs "твоя задача"            # офлайн: generator.type = mock
node run.mjs "твоя задача" --dry-run  # то же, принудительно без сети
```

Полный список опций: `node core/loop-engine/cli.mjs --help`.
Документация движка: `core/loop-engine/README.md`.

## Состав

```text
projects/_LOOP_TEMPLATE/
├── loop.config.yaml         декларативный конфиг цикла (loop/generator/validator/context_builder/output)
├── prompts/
│   ├── system.md            системный промпт: рендерится на каждой итерации ({{ task }}, {{ project_name }}…)
│   └── context-template.md  шаблон пользовательского сообщения: секции архива + блок провальной итерации
├── tests/
│   └── artifact.test.mjs    пример проверок (node:test). ПЕРЕПИШИ под свою задачу
├── run.mjs                  точка входа (~38 строк): конфиг → фабрика → прогон → сохранение
└── workspace/               рабочая зона движка (в git не попадает: workspace/.gitignore)
    ├── main.mjs             артефакт последней итерации
    ├── tests/               копия tests/ проекта (её запускает валидатор)
    ├── iterations/iter-NN/  артефакт + feedback.json каждой итерации (evidence)
    ├── result.txt           итоговый артефакт (для output.file)
    ├── out/                 итоговые файлы (если артефакт — карта файлов)
    └── loop-result.json     итог прогона: вердикт, коды, история, метрики
```

## Сценарии

### 1. Офлайн-проверка связки (по умолчанию)

`generator.type: mock` + `validator.type: node_code`. Сеть и ключи не нужны — проверяется,
что контекст собирается, артефакт пишется, тесты запускаются, фидбек возвращается в промпт.

```bash
node run.mjs "выдай ES-модуль с функцией hello"
```

### 2. Генерация — агентом в сессии

Автономной генерации моделью нет: студия — оболочка, артефакт собирает агент внутри папки
проекта по контракту (BRIEF → G4), а цикл используется как **проверка** собранного.
Генератор всегда `mock` (офлайн, без сети и ключей).

### 3. Проверка проекта воротами цеха

Для проектов с досье (`SEED/DIRECTION/STRUCTURE/SOURCES`) валидатор `ceh_project` прогоняет
**существующие** `scripts/validate.mjs` (V-01…V-17) и линтеры — это и есть ворота G3:

```yaml
validator:
  type: "ceh_project"
  checks: ["validate", "lint-slop", "lint-copy", "lint-marketing"]
  ignore_codes: []            # например ["V-15"], если code-video в проекте не нужен
```

Проверка на уже принятом проекте (ничего не пишем, только прогоняем ворота):

```bash
node core/loop-engine/cli.mjs projects/pcpolimer --validator ceh_project --checks validate,lint-slop --dry-run
```

## Правила, которые шаблон не отменяет

Конституция цеха действует целиком: код не пишется до принятого на G1 `DIRECTION.md` (К-01),
каждое решение — строкой в `SOURCES.md` (К-02), приём без источника — слоп (К-04),
easing только из `motion/easing-curves.json` (К-05). Цикл лишь автоматизирует проверку
и возврат на правки (К-10) — вердикт арт-директора в `REVIEW.md` остаётся за человеком (К-09).
