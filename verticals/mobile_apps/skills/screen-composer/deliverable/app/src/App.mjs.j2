/* Экран заметок: состояние хранится явно, разметка несёт подписи доступности. */

export function createState() {
  return {
    items: [
      { id: 1, text: "Позвонить в порт" },
      { id: 2, text: "Подписать акт" },
    ],
    draft: "",
  };
}

const item = (note) => `<li class="note">
  <span class="note__text">${note.text}</span>
  <button type="button" aria-label="Удалить заметку" data-action="remove" data-id="${note.id}">×</button>
</li>`;

export function render(state) {
  const list = state.items.map(item).join("");
  return `<section class="screen" aria-labelledby="notes-title">
  <h1 id="notes-title">Заметки</h1>
  <ul class="notes">${list}</ul>
  <form class="compose">
    <input class="compose__field" aria-label="Новая заметка" data-role="draft" value="${state.draft}" />
    <button type="button" aria-label="Добавить заметку" data-action="add">Добавить</button>
  </form>
</section>`;
}

export function addItem(state, text) {
  if (!text.trim()) return state;
  const id = Math.max(0, ...state.items.map((note) => note.id)) + 1;
  return { ...state, items: [...state.items, { id, text }], draft: "" };
}

export function removeItem(state, id) {
  return { ...state, items: state.items.filter((note) => note.id !== id) };
}

export default { createState, render, addItem, removeItem };
