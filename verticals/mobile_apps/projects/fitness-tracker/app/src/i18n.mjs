/* Мини-i18n: ru + en без внешних зависимостей (навык i18n-setup, К-14). */
const dict = {
  ru: {
    title: "Тренировки",
    add: "Добавить",
    remove: "Удалить",
    unlock: "Войти по биометрии",
    "w.run": "Пробежка 5 км",
    "w.strength": "Силовая: спина",
  },
  en: {
    title: "Workouts",
    add: "Add",
    remove: "Remove",
    unlock: "Sign in with biometrics",
    "w.run": "Run 5 km",
    "w.strength": "Strength: back",
  },
};

let lang = "ru";

export const i18n = {
  t: (key) => (dict[lang][key] !== undefined ? dict[lang][key] : key),
  set: (next) => { lang = next; },
};

export default i18n;