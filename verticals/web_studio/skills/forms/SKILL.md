---
id: SK-21
name: Формы с состояниями динамики
category: design-ux
description: Конверсионная форма с пятью состояниями взаимодействия (idle → error → loading → ok), скринридерным статусом, полями с name и аналитикой события. Машинизировано в lint-form.mjs (V-22, К-26).
---

# SK-21: Формы с состояниями динамики (Form States)

Форма — самый конверсионный интерактив лендинга, поэтому её состояние
проектируется чек-листом, а не «как получится»:

1. **Точка JS**: у `<form>` есть `id="…"` (или `data-form`) — обработчик
   навешивается на элемент, а не на класс.
2. **Отправляемость**: у каждого `<input|select|textarea>` — `name="…"`;
   иначе сервер не получит значение.
3. **Конверсия (К-16)**: кнопка `type="submit"` несёт `data-analytics-event` —
   событие уходит в аналитику, а не только письмо.
4. **Статус (H1)**: на странице с формой есть `role="status"` +
   `aria-live` и маркер `data-state` — экран диктует, что происходит
   (Error → Loading → Success). Пример состояний (SK-07, lazer-rezka):
   - `data-state="idle"` — до отправки;
   - `data-state="error"` — «Укажите телефон…» + `focus()` на поле;
   - `data-state="loading"` — «Отправляем заявку…»;
   - `data-state="ok"` — «Заявка принята. Перезвоним…» + `form.reset()`.
5. **Без перезагрузки**: `addEventListener("submit", (ev) => { ev.preventDefault(); … })`
   в `site/app.js`.

## Чек-лист приёмки (V-22, К-26)
- [ ] `node scripts/lint-form.mjs projects/<имя>` → `в норме`;
- [ ] в `validate.mjs` код V-22 = OK;
- [ ] кнопки CTA без `data-analytics-event` — нарушение К-16 (lint-marketing).