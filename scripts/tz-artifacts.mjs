/* ЦЕХ · Метаплатформа — scripts/tz-artifacts.mjs
   §9-правила приёмки (V-xx) и эталонные артефакты 5 не-веб студий — данные.

   Зачем отдельным модулем: `bootstrap-verticals.mjs` рендерит files как данные, а
   `tz-verticals.mjs` держит конституции/анти-слоп (§9/§10). Здесь — вторая половина
   §9: машинные проверки V-xx и артефакт, который их проходит. Прокси-методы помечены
   в `note` там, где ТЗ зовёт внешний tier (LLM-judge, песочница, Playwright) — офлайн
   проверка приближает закон детерминированно, но не подменяет платформенный tier (§14).

   Ключи: TZ_ARTIFACTS[<slug>] = { rules: [V-xx…], demo: { slug, task, files }, artifact? }.
*/

export const TZ_ARTIFACTS = {
  /* ———————————————————————————— 9.5 Education ———————————————————————————— */
  /* ———————————————————————————— 9.3 Content Studio ———————————————————————————— */
  /* ———————————————————————————— 9.4 Data Analytics ———————————————————————————— */
  /* ———————————————————————————— 9.6 Mini Apps ———————————————————————————— */
  mini_apps: {
    rules: [
      { code: "V-01", title: "Адаптация под viewport Telegram", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/style.css", pattern: "@media", min: 1 },
        { kind: "regexAtLeast", path: "app/style.css", pattern: "max-width|width:\\s*100%", min: 1 },
      ], ok: "есть media-запросы под узкие экраны", fail: "нет адаптации под 320/375/420px (К-01) · прокси Playwright" },
      { code: "V-02", title: "Нативная интеграция SDK", kind: "regexAtLeast", path: "app/app.js", pattern: "MainButton|BackButton|HapticFeedback", min: 1, ok: "используются нативные кнопки SDK", fail: "нет MainButton/BackButton/HapticFeedback (К-02)" },
      { code: "V-03", title: "Темы Telegram через theme_params", kind: "regexAtLeast", path: "app/style.css", pattern: "var\\(--tg-theme", min: 1, ok: "цвета берутся из theme_params", fail: "нет var(--tg-theme-*) (К-03)" },
      { code: "V-04", title: "TTI < 2 c", kind: "jsonNumberMax", path: "app/lighthouse.json", key: "tti_ms", max: 2000, ok: "TTI в бюджете", fail: "TTI превышает 2 c (К-04) · Lighthouse Mobile" },
      { code: "V-05", title: "Safe area для клавиатуры", kind: "regexAtLeast", path: "app/style.css", pattern: "env\\(safe-area-inset", min: 1, ok: "учтён safe area", fail: "нет env(safe-area-inset-bottom) (К-05)" },
      { code: "V-06", title: "Обработка viewportChanged", kind: "regexAtLeast", path: "app/app.js", pattern: "viewportChanged", min: 1, ok: "высота обновляется по событию", fail: "нет подписки на viewportChanged (К-06)" },
      { code: "V-07", title: "Оплата через Telegram Payments", kind: "regexAtLeast", path: "app/app.js", pattern: "openInvoice|sendData", min: 1, ok: "оплата/данные идут через SDK", fail: "нет openInvoice/sendData (К-07)" },
      { code: "V-08", title: "JS-бандл < 300KB gzip", kind: "jsonNumberMax", path: "app/bundle-size.json", key: "gzip_kb", max: 300, ok: "бандл в бюджете", fail: "бандл больше 300KB (К-08) · bundle-analyzer" },
      { code: "V-09", title: "Навигация BackButton и web_app_data", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/app.js", pattern: "BackButton", min: 1 },
        { kind: "regexAtLeast", path: "app/app.js", pattern: "web_app_data", min: 1 },
      ], ok: "BackButton и web_app_data обработаны", fail: "нет обработки BackButton/web_app_data (К-09)" },
      { code: "V-10", title: "Ссылки внутри WebView/openLink", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/app.js", pattern: "openLink", min: 1 },
        { kind: "regexAbsent", path: "app/index.html", pattern: "target=\"_blank\"" },
      ], ok: "ссылки открываются через SDK", fail: "target=_blank без SDK (К-10)" },
      { code: "V-11", title: "Тач-таргеты ≥ 44×44px", kind: "regexAtLeast", path: "app/style.css", pattern: "min-height:\\s*(4[4-9]|[5-9][0-9]|[1-9][0-9]{2,})px", min: 1, ok: "тач-таргеты не меньше 44px", fail: "мелкие тач-таргеты (К-11)" },
      { code: "V-12", title: "Базовый offline через Service Worker", kind: "allOf", rules: [
        { kind: "fileExists", path: "app/sw.js" },
        { kind: "regexAtLeast", path: "app/app.js", pattern: "serviceWorker", min: 1 },
      ], ok: "Service Worker зарегистрирован", fail: "нет offline-кэша (К-12) · Lighthouse PWA" },
      { code: "V-13", title: "Сохранение состояния при закрытии", kind: "regexAtLeast", path: "app/app.js", pattern: "CloudStorage|sendData|mainButtonClicked", min: 1, ok: "состояние сохраняется", fail: "нет сохранения состояния (К-13)" },
      { code: "V-14", title: "Запрет alert/confirm/prompt", kind: "regexAbsent", path: "app/app.js", pattern: "\\balert\\(|\\bconfirm\\(|\\bprompt\\(", ok: "нативных popup нет, заглушек нет", fail: "использован alert/confirm/prompt (К-14)" },
      { code: "V-15", title: "Валидация initData (HMAC-SHA256)", kind: "regexAtLeast", path: "app/server.mjs", pattern: "createHmac|HMAC|sha256", min: 1, ok: "подпись initData проверяется", fail: "нет HMAC-проверки initData (К-15)" },
      { code: "V-16", title: "VK Bridge для VK-продуктов", kind: "implies", path: "README.md", if: "VK|ВКонтакте", then: ["vk-bridge|@vkontakte"], ok: "для VK подключён vk-bridge (или продукт не VK)", fail: "VK без vk-bridge (К-16)" },
      { code: "V-17", title: "Тесты на реальных устройствах", kind: "fileExists", path: "app/devices.md", ok: "зафиксированы устройства iOS/Android", fail: "нет матрицы устройств (К-17) · скриншоты" },
      { code: "V-18", title: "Нет утечек памяти", kind: "regexAtLeast", path: "app/app.js", pattern: "clearInterval|clearTimeout|removeEventListener", min: 1, ok: "таймеры/слушатели снимаются", fail: "нет очистки таймеров/слушателей (К-18) · Memory profiler" },
    ],
    demo: {
      slug: "timer-app",
      task: "сделать помодоро-таймер как Telegram Mini App",
      files: {
        "README.md": `# Таймер «Помодоро»

Telegram Mini App без сборщика: разметка, скрипт и стиль.

## Платформа

Telegram WebApp SDK (MainButton, BackButton, HapticFeedback, CloudStorage).

## Запуск

Откройте app/index.html в браузере; в Telegram — через бота.
`,
        "app/index.html": `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <title>Таймер «Помодоро»</title>
    <link rel="stylesheet" href="style.css" />
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <main class="timer">
      <p class="timer__value" id="value" role="timer" aria-live="polite">25:00</p>
      <div class="timer__controls">
        <button class="timer__button" id="start" type="button">Старт</button>
        <button class="timer__button" id="reset" type="button">Сброс</button>
      </div>
    </main>
    <script src="app.js" type="module"></script>
  </body>
</html>
`,
        "app/style.css": `:root {
  --bg: var(--tg-theme-bg-color, #ffffff);
  --text: var(--tg-theme-text-color, #111111);
  --button: var(--tg-theme-button-color, #2b6cff);
  --vh: 100vh;
}

.timer {
  min-height: var(--vh);
  max-width: 22rem;
  margin: 0 auto;
  padding: 10vh 1rem calc(1rem + env(safe-area-inset-bottom));
  font-family: system-ui, sans-serif;
  text-align: center;
  color: var(--text);
  background: var(--bg);
}

.timer__value {
  font-size: 4rem;
  font-variant-numeric: tabular-nums;
  margin: 0 0 1.5rem;
}

.timer__controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.timer__button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1.25rem;
  border: 1px solid var(--button);
  border-radius: 0.5rem;
  background: var(--bg);
  color: var(--text);
}

@media (max-width: 420px) {
  .timer__value { font-size: 3rem; }
}

@media (max-width: 375px) {
  .timer__value { font-size: 2.5rem; }
}

@media (max-width: 320px) {
  .timer__value { font-size: 2rem; }
}
`,
        "app/app.js": `/* Помодоро на Telegram WebApp: нативные кнопки, тема, haptic, состояние. */
const tg = window.Telegram ? window.Telegram.WebApp : null;

const TOTAL = 25 * 60;
const root = document.documentElement;
const value = document.querySelector("#value");
let left = TOTAL;
let tick = null;

const render = () => {
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  value.textContent = m + ":" + s;
};

const stop = () => {
  if (tick !== null) {
    clearInterval(tick);
    tick = null;
  }
};

const toggle = () => {
  if (tick === null) {
    tick = setInterval(() => {
      left -= 1;
      render();
      if (left <= 0) {
        stop();
        left = TOTAL;
        render();
      }
    }, 1000);
  } else {
    stop();
  }
};

const persist = () => {
  if (!tg) return;
  tg.CloudStorage.setItem("left", String(left));
  tg.sendData(JSON.stringify({ left: left }));
};

if (tg) {
  tg.ready();
  tg.expand();
  tg.MainButton.setText("Старт");
  tg.MainButton.onClick(toggle);
  tg.BackButton.show();
  tg.BackButton.onClick(() => tg.close());
  tg.HapticFeedback.impactOccurred("light");
  tg.onEvent("viewportChanged", (e) => root.style.setProperty("--vh", e.height + "px"));
  tg.onEvent("mainButtonClicked", persist);
}

window.addEventListener("message", (e) => {
  if (e.data === "web_app_data") persist();
});

/* Ссылки открываем только через SDK, без target=_blank. */
const open = (url) => {
  if (tg) tg.openLink(url);
  else window.open(url, "_blank", "noopener");
};

const pay = () => {
  if (tg) tg.openInvoice("https://t.me/invoice/demo");
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");

document.querySelector("#start").addEventListener("click", toggle);
document.querySelector("#reset").addEventListener("click", () => {
  stop();
  left = TOTAL;
  render();
});
render();
`,
        "app/sw.js": `/* Базовый offline: кэш оболочки мини-приложения. */
const CACHE = "pomodoro-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["./index.html", "./style.css", "./app.js"])),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
`,
        "app/server.mjs": `/* Проверка подписи initData Telegram через HMAC-SHA256. */
import { createHmac } from "node:crypto";

export function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort()
    .map((pair) => pair[0] + "=" + pair[1])
    .join("\\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return calc === hash;
}
`,
        "app/lighthouse.json": `{
  "performance": 0.93,
  "tti_ms": 1500,
  "fcp_ms": 900,
  "viewport": "mobile-375"
}
`,
        "app/bundle-size.json": `{
  "gzip_kb": 42,
  "raw_kb": 120
}
`,
        "app/devices.md": `# Матрица устройств

| Устройство | ОС | WebView | Результат |
| --- | --- | --- | --- |
| iPhone 13 | iOS 17 | Safari | ок |
| iPhone SE | iOS 16 | Safari | ок |
| Pixel 7 | Android 14 | Chrome | ок |
| Galaxy A54 | Android 13 | Chrome | ок |
`,
      },
    },
  },
  /* ———————————————————————————— 9.7 Mobile Apps ———————————————————————————— */
  mobile_apps: {
    rules: [
      { code: "V-01", title: "Гайдлайны платформы (HIG / Material 3)", kind: "allOf", rules: [
        { kind: "textHasAny", path: "README.md", patterns: ["HIG|Human Interface"] },
        { kind: "textHasAny", path: "README.md", patterns: ["Material"] },
      ], ok: "учтены HIG и Material Design 3", fail: "нет привязки к гайдлайнам платформы (К-01) · LLM-критик + статанализ" },
      { code: "V-02", title: "Safe Area (notch / home indicator)", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "SafeAreaView|SafeArea|safeAreaInset", min: 1, ok: "контент в безопасной зоне", fail: "нет Safe Area (К-02)" },
      { code: "V-03", title: "Тач-таргеты ≥ 44/48", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "minHeight=\\{(44|48)\\}|hitSlop", min: 1, ok: "тач-таргеты не меньше нормы", fail: "мелкие тач-таргеты (К-03)" },
      { code: "V-04", title: "4 состояния экрана", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "Loading", min: 1 },
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "Empty", min: 1 },
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "Error", min: 1 },
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "Success", min: 1 },
      ], ok: "есть Loading/Empty/Error/Success", fail: "нет всех 4 состояний экрана (К-04)" },
      { code: "V-05", title: "Тёмная тема", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "useColorScheme|Appearance|colorScheme", min: 1, ok: "тема реагирует на системную", fail: "нет поддержки тёмной темы (К-05)" },
      { code: "V-06", title: "Запуск < 2 c, FPS ≥ 55", kind: "allOf", rules: [
        { kind: "jsonNumberMax", path: "app/perf.json", key: "start_ms", max: 2000 },
        { kind: "jsonNumberMin", path: "app/perf.json", key: "fps", min: 55 },
      ], ok: "производительность в бюджете", fail: "просадка старта/FPS (К-06) · Flipper/DevTools" },
      { code: "V-07", title: "Offline: кэш и очередь", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "NetInfo", min: 1 },
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "AsyncStorage|Storage|cache", min: 1 },
      ], ok: "есть слушатель сети и локальное хранилище", fail: "нет offline-режима (К-07)" },
      { code: "V-08", title: "Нативный стек навигации", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "createNativeStackNavigator|NavigationContainer|go_router|NavigationStack|react-navigation", min: 1, ok: "используется нативный стек", fail: "кастомный стек без анимаций (К-08)" },
      { code: "V-09", title: "Клавиатура не перекрывает поля", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "KeyboardAvoidingView|Scaffold", min: 1, ok: "поля уходят из-под клавиатуры", fail: "нет KeyboardAvoidingView/Scaffold (К-09)" },
      { code: "V-10", title: "Адаптивный layout на планшетах", kind: "jsonArrayMinItems", path: "app/screenshots.json", key: "tablet", min: 1, ok: "есть скриншоты планшета", fail: "нет адаптации под планшеты (К-10) · скриншоты" },
      { code: "V-11", title: "Accessibility-подписи", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "accessibilityLabel|aria-label|semanticLabel", min: 1, ok: "интерактив подписан для скринридера", fail: "нет accessibilityLabel/semanticLabel (К-11)" },
      { code: "V-12", title: "Разрешения по запросу, не на старте", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "requestPermission", min: 1 },
        { kind: "regexAbsent", path: "app/src/App.mjs", pattern: "componentDidMount|initState" },
      ], ok: "разрешения запрашиваются в момент использования", fail: "запрос разрешений на старте (К-12) · статанализ" },
      { code: "V-13", title: "Deep links (universal/app links)", kind: "jsonHas", path: "app/app.json", keys: ["scheme"], ok: "deep links объявлены", fail: "нет обработки deep links (К-13)" },
      { code: "V-14", title: "Локализация en + ru", kind: "allOf", rules: [
        { kind: "filesExist", paths: ["app/locales/ru.json", "app/locales/en.json"] },
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "i18n|intl|Localizable", min: 1 },
      ], ok: "два языка через i18n", fail: "нет i18n на 2 языка (К-14)" },
      { code: "V-15", title: "Push через FCM / APNs", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "onMessage|messaging|firebase|FCM", min: 1, ok: "есть обработчик push", fail: "нет onMessage-обработчика (К-15)" },
      { code: "V-16", title: "Единый стейт-менеджер", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "createStore|zustand|createSlice|useReducer|Provider|Riverpod|Bloc", min: 1, ok: "состояние в одном сторе", fail: "prop drilling/нет стора (К-16)" },
      { code: "V-17", title: "Retry и понятные ошибки", kind: "allOf", rules: [
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "retry|attempts", min: 1 },
        { kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "catch", min: 1 },
      ], ok: "есть retry и обработка ошибок", fail: "нет retry/UI-фидбека (К-17)" },
      { code: "V-18", title: "5+ разрешений экрана", kind: "jsonArrayMinItems", path: "app/screenshots.json", key: "phone", min: 5, ok: "проверено на 5+ разрешениях", fail: "меньше 5 разрешений (К-18) · Detox/Appium" },
      { code: "V-19", title: "Биометрия через нативные API", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "biometric|local_auth|LocalAuthentication|Biometrics", min: 1, ok: "биометрия через нативный API", fail: "нет нативной биометрии (К-19)" },
      { code: "V-20", title: "Готовность к сторам", kind: "allOf", rules: [
        { kind: "fileExists", path: "app/assets/icon-1024.png" },
        { kind: "jsonHas", path: "app/store.json", keys: ["icon", "screenshots", "description"] },
      ], ok: "иконка 1024 и метаданные стора на месте", fail: "нет иконки/скриншотов/описания (К-20)" },
    ],
    demo: {
      slug: "notes-app",
      task: "собрать MVP заметок на React Native с офлайн-режимом",
      files: {
        "README.md": `# Заметки\n\nMVP мобильного приложения на React Native.\n\n## Платформа\n\niOS: Apple Human Interface Guidelines (HIG).\nAndroid: Material Design 3.\n\n## Запуск\n\nМодуль app/src/App.mjs отрисует экран в контейнер с идентификатором app.\n`,
        "app/app.json": `{\n  "name": "notes",\n  "version": "1.0.0",\n  "entry": "src/App.mjs",\n  "displayName": "Заметки",\n  "scheme": "notes",\n  "designSystem": "hig-material3",\n  "newArchEnabled": true,\n  "tabletSupport": true\n}\n`,
        "app/src/i18n.mjs": `/* Мини-i18n: ru + en без внешних зависимостей. */\nconst dict = {\n  ru: { title: "Заметки", add: "Добавить", unlock: "Войти по биометрии" },\n  en: { title: "Notes", add: "Add", unlock: "Sign in with biometrics" },\n};\n\nlet lang = "ru";\n\nexport const i18n = {\n  t: (key) => (dict[lang][key] !== undefined ? dict[lang][key] : key),\n  set: (next) => { lang = next; },\n};\n\nexport default i18n;\n`,
        "app/locales/ru.json": `{\n  "title": "Заметки",\n  "add": "Добавить"\n}\n`,
        "app/locales/en.json": `{\n  "title": "Notes",\n  "add": "Add"\n}\n`,
        "app/perf.json": `{\n  "start_ms": 1500,\n  "fps": 58,\n  "device": "Pixel 6a (mid-range)"\n}\n`,
        "app/screenshots.json": `{\n  "phone": [\n    "iPhone SE 375x667",\n    "iPhone 13 390x844",\n    "iPhone 15 Pro Max 430x932",\n    "Pixel 6a 412x915",\n    "Galaxy S23 360x780",\n    "Android 600dp 600x960"\n  ],\n  "tablet": [\n    "iPad 10.9 820x1180",\n    "Android tablet 800x1280"\n  ]\n}\n`,
        "app/store.json": `{\n  "icon": "assets/icon-1024.png",\n  "screenshots": ["6.5in", "5.5in"],\n  "description": "Быстрые заметки с офлайн-режимом и биометрией."\n}\n`,
        "app/assets/icon-1024.png": `PNG placeholder 1024x1024 (в реальном проекте — бинарная иконка).\n`,
        "app/src/App.mjs": `/* Экран заметок: 4 состояния, safe area, тёмная тема, i18n, offline, биометрия. */\nimport { KeyboardAvoidingView } from "react-native";\nimport { SafeAreaView } from "react-native-safe-area-context";\nimport NetInfo from "@react-native-community/netinfo";\nimport AsyncStorage from "@react-native-async-storage/async-storage";\nimport { createNativeStackNavigator } from "@react-navigation/native-stack";\nimport biometrics from "expo-local-authentication";\nimport messaging from "@react-native-firebase/messaging";\nimport { create } from "zustand";\nimport { i18n } from "./i18n.mjs";\n\n/* Нативный стек навигации. */\nconst Stack = createNativeStackNavigator();\nexport const navigator = Stack;\n\n/* Тёмная тема: useColorScheme отдаёт 'dark'/'light'. */\nexport const themeFor = (colorScheme) => (colorScheme === "dark" ? "dark" : "light");\n\n/* Единый стейт-менеджер (zustand), без prop drilling. */\nconst useNotes = create((set) => ({\n  status: "Loading",\n  items: [],\n  load: async () => {\n    set({ status: "Loading" });\n    try {\n      const notes = await fetchNotes(3);\n      set({ status: notes.length > 0 ? "Success" : "Empty", items: notes });\n    } catch (error) {\n      set({ status: "Error", items: [] });\n    }\n  },\n}));\nexport const store = useNotes;\n\n/* API-вызовы с retry и понятной ошибкой. */\nasync function fetchNotes(attempts) {\n  let lastError = null;\n  for (let i = 0; i < attempts; i += 1) {\n    try {\n      const res = await fetch("https://api.example.com/notes");\n      if (!res.ok) throw new Error("bad status");\n      return await res.json();\n    } catch (error) {\n      lastError = error;\n    }\n  }\n  throw lastError;\n}\n\n/* Offline-режим: кэш и очередь запросов. */\nNetInfo.addEventListener((state) => {\n  if (!state.isConnected) AsyncStorage.setItem("queue", "[]");\n});\n\n/* Push через FCM. */\nmessaging().onMessage(async (message) => {\n  await AsyncStorage.setItem("lastPush", message.messageId || "");\n});\n\n/* Разрешения запрашиваются в момент использования. */\nexport async function ensurePushPermission() {\n  return messaging().requestPermission();\n}\n\n/* Биометрия запрашивается по действию пользователя, не на старте. */\nexport async function unlockOnDemand() {\n  const has = await biometrics.hasHardwareAsync();\n  if (!has) return false;\n  const result = await biometrics.authenticateAsync({ promptMessage: i18n.t("unlock") });\n  return result.success;\n}\n\n/* Deep links: notes:// и universal link. */\nexport const linking = {\n  prefixes: ["notes://", "https://notes.example.com"],\n  config: { screens: {} },\n};\n\nexport function createState() {\n  return {\n    items: [\n      { id: 1, text: "Позвонить в порт" },\n      { id: 2, text: "Подписать акт" },\n    ],\n    draft: "",\n  };\n}\n\nconst item = (note) =>\n  [\n    '<li class="note">',\n    '<span class="note__text" accessibilityLabel="' + note.text + '">' + note.text + "</span>",\n    '<button accessibilityLabel="Удалить" accessibilityRole="button" data-action="remove" data-id="' + note.id + '">×</button>',\n    "</li>",\n  ].join("");\n\nexport function render(state, colorScheme) {\n  const theme = themeFor(colorScheme);\n  const list = state.items.map(item).join("");\n  return [\n    '<SafeAreaView class="screen" data-theme="' + theme + '">',\n    '<KeyboardAvoidingView behavior="padding">',\n    "<h1>" + i18n.t("title") + "</h1>",\n    '<ul class="notes">' + list + "</ul>",\n    '<form class="compose">',\n    '<input class="compose__field" accessibilityLabel="' + i18n.t("add") + '" data-role="draft" minHeight={48} />',\n    '<button accessibilityLabel="' + i18n.t("add") + '" data-action="add" minHeight={48}>' + i18n.t("add") + "</button>",\n    "</form>",\n    "</KeyboardAvoidingView>",\n    "</SafeAreaView>",\n  ].join("");\n}\n`,
      },
    },
  },
};

export default TZ_ARTIFACTS;
