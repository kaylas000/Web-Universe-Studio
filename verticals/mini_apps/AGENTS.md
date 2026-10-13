# AGENTS.md — контракт агента студии «Студия мини-приложений»

Студия — это оболочка цеха: агент (LLM) работает **внутри** неё, ведёт проекты в
`projects/<имя>/`, и вся работа идёт по закону студии (К-01…К-24), её приёмам
(`skills/`), примерам (`references/`) и приёмке (`scripts/`). Это не автономный
конвейер: каждый проект ведётся итерациями «сборка → ворота», как в цеху.

## Порядок чтения (обязателен)

1. `CONSTITUTION.md` — закон студии: статьи К-01…К-24 с проверками.
2. `references/INDEX.md` + `references/sources.yaml` — примеры и источники приёмов.
3. `skills/SKILL-INDEX.md` — приёмы студии; папка `skills/<id>/` = skill.yaml + templates/ + hooks/.
4. `anti-slop/BANNED.md` + `anti-slop/QUOTAS.md` — запреты B-01…B-05 и квоты Q-01…Q-05.
5. `gates/G1-direction.md … G4-final.md` — как принимается проект.
6. `scripts/validate.mjs`, `scripts/lint-slop.mjs`, `scripts/lint-quotas.mjs` — приёмка.

## Как устроена студия

- `vertical.yaml` — манифест студии (§8 ТЗ): приёмы, ворота, модели, бюджет, knowledge.
- `projects/<имя>/` — папки проектов. Артефакт проекта — ровно в
  `projects/<имя>/app/`, валидатор смотрит только туда.
  Демо-проекты (проходят приёмку): timer-app, survey-app.
- `workspace/` внутри проекта — служебное (результаты цикла, gitignore).

## Жёсткие правила

- **Приём без источника — слоп.** Каждый использованный приём обязан опираться
  на источник из `references/` (у записи есть takeaway); источники и
  переиспользование подтверждённых приёмов хранятся в архиве студии.
- **Запреты и квоты машинизированы.** B-xx — из `scripts/slop.json`,
  Q-xx — из `scripts/quotas.json`. `lint-slop` обязан печатать `чисто:`,
  `lint-quotas` — `ИТОГ: 5/5 · exit 0`.
- **Итерации «сборка → ворота» гоняются циклом, а не вручную.** Это цикл
  принуждения платформы (loop-engine, §17 ТЗ): проект не сдаётся, пока цикл
  не вернул `exit 0`.
- **Возврат с ворот = точечные правки** по пунктам REVIEW.md и по кодам
  `V-xx/B-xx/Q-xx` из feedback — не перезапуск всего артефакта.

## Workflow

```
BRIEF → разбор приёмов (skills/) и референсов (references/)
→ DIRECTION.md → G1 → STRUCTURE.md → G2
→ сборка артефакта в projects/<имя>/app/ → G3
→ ЦИКЛ: validate.mjs + lint-slop.mjs + lint-quotas.mjs → loop-engine
→ REVIEW.md (артдиректор) → G4 → приёмка
```

## Команды цикла

Из папки студии (`cd verticals/mini_apps`):

```bash
node scripts/validate.mjs projects/<имя>      # приёмка V-xx → «ИТОГ: N/N · exit 0»
node scripts/lint-slop.mjs projects/<имя>     # запреты B-xx → «чисто:»
node scripts/lint-quotas.mjs projects/<имя>   # квоты Q-xx → «ИТОГ: 5/5 · exit 0»
node --test tests/*.test.mjs                  # самотесты студии
```

Цикл принуждения (из корня платформы):

```bash
node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/mini_apps          # прогон ворот по собранному артефакту
node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/mini_apps --dry-run # офлайн-проверка связки (mock)
```

В сессии с агентом — одна итерация (`--iterations 1`): сборка уже на диске, цикл
нужен как проверка. `exit 0` = закон исполнен; коды `V-xx/B-xx/Q-xx` в feedback —
список точечных правок, а не повод начинать заново.

## Definition of Done

1. Приёмка студии зелёная: `validate` N/N, `lint-slop` чисто, `lint-quotas` 5/5.
2. Цикл сошёлся: `cli.mjs … --studio-root verticals/mini_apps` → `exit 0`.
3. `REVIEW.md` — вердикт артдиректора со ссылками на пункты CONSTITUTION.
4. Удачный приём возвращается в архив студии: источник → `references/`,
   закреплённый приём → `skills/`.
