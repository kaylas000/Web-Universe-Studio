/* ЦЕХ · Метаплатформа — scripts/tz-verticals.mjs
   Полные конституции (§9 ТЗ) и анти-слоп (§10 ТЗ) двух вертикалей-бутстрапов:
   mini_apps, mobile_apps.

   Слой переопределяет одноимённые поля инлайновых SPECS в scripts/bootstrap-verticals.mjs
   (см. main(): T.writeVertical({ ...s, ...TZ_OVERRIDES[s.slug] })). Демо-проекты и
   правило-движок остаются общими (core/vertical-kit), здесь — только закон студии.

   Решение → файл-источник (К-02): статьи, запреты и квоты — дословно из §9 и §10 ТЗ.
   Проверка у статьи (`method`) — метод из ТЗ; офлайн-набор `scripts/validate.mjs` (V-xx)
   реализует детерминированное подмножество, платформенные проверки (LLM-judge, песочница,
   Playwright/устройства) исполняются на верхнем тире (§14 ТЗ). */

export const TZ_OVERRIDES = {



  mini_apps: {
    gatesText: "G1 Бриф/тип продукта → G2 Экраны/навигация → G3 Сборка/вьюпорты → G4 Устройства",
    constitution: [
      { code: "К-01", title: "Viewport Telegram", text: "Адаптация под viewport Telegram: корректный рендер на 320px, 375px, 420px без горизонтального скролла.", method: "Playwright, 3 viewport'а + скриншоты" },
      { code: "К-02", title: "Нативная интеграция SDK", text: "Нативная интеграция SDK: MainButton, BackButton, HapticFeedback вместо кастомных кнопок внизу.", method: "статический анализ JS" },
      { code: "К-03", title: "Темы Telegram", text: "Поддержка тем Telegram через theme_params / CSS-переменные.", method: "наличие var(--tg-theme-*)" },
      { code: "К-04", title: "TTI", text: "TTI < 2 c на 3G.", method: "Lighthouse Mobile + throttling" },
      { code: "К-05", title: "Safe area клавиатуры", text: "Safe area для клавиатуры: поля не перекрываются.", method: "env(safe-area-inset-bottom)" },
      { code: "К-06", title: "viewportChanged", text: "Обработка viewportChanged (клавиатура/высота).", method: "подписка на событие" },
      { code: "К-07", title: "Оплата", text: "Оплата — через Telegram Payments (openInvoice/sendData), не внешние ссылки.", method: "наличие вызовов" },
      { code: "К-08", title: "Бандл", text: "JS-бандл < 300KB gzipped.", method: "bundle-analyzer" },
      { code: "К-09", title: "Навигация BackButton", text: "Корректная навигация через BackButton и обработка web_app_data.", method: "обработчики BackButton.onClick" },
      { code: "К-10", title: "Ссылки в WebView", text: "Все ссылки открываются внутри WebView или через openLink (нет target=\"_blank\" без SDK).", method: "regex + скан DOM" },
      { code: "К-11", title: "Тач-таргеты", text: "Тач-таргеты ≥ 44×44px.", method: "статический анализ CSS" },
      { code: "К-12", title: "Offline", text: "Базовый offline через Service Worker.", method: "Lighthouse PWA" },
      { code: "К-13", title: "Сохранение состояния", text: "При закрытии состояние сохраняется через sendData/mainButtonClicked.", method: "наличие обработчика" },
      { code: "К-14", title: "Без alert/confirm/prompt", text: "Запрещены alert(), confirm(), prompt() — только нативные popup Telegram.", method: "regex" },
      { code: "К-15", title: "Валидация initData", text: "Бэкенд валидирует initData через HMAC-SHA256.", method: "наличие проверки подписи" },
      { code: "К-16", title: "VK Bridge", text: "Для VK — обязателен vk-bridge для всех API-вызовов.", method: "импорт @vkontakte/vk-bridge" },
      { code: "К-17", title: "Реальные устройства", text: "Тесты на реальных устройствах: iOS (Safari WebView) и Android (Chrome WebView), 4 устройства.", method: "скриншоты" },
      { code: "К-18", title: "Без утечек памяти", text: "Нет утечек памяти при многократном открытии/закрытии (3 итерации).", method: "Chrome DevTools Memory profiler" },
    ],
    banned: [
      { code: "B-01", title: "Только hover", text: "`:hover` как единственный способ взаимодействия (на тач нет hover) — regex `:hover` без `:active`" },
      { code: "B-02", title: "Жёсткий 100vh", text: "жёсткий `height: 100vh` (перекрывается клавиатурой/шапкой) — regex без `env(safe-area-inset)`" },
      { code: "B-03", title: "Навигация href", text: "навигация через `window.location.href` (закроет Mini App) — regex" },
      { code: "B-04", title: "Кастомный скроллбар", text: "кастомные скроллбары (`::-webkit-scrollbar`) — ломают iOS momentum — regex" },
      { code: "B-05", title: "Блокирующие модалки", text: "блокирующие модалки при загрузке (< 500ms) — DOMContentLoaded + modal.show" },
    ],
    quotas: [
      { code: "Q-01", text: "≤300KB (gzip) — размер JS-бандла" },
      { code: "Q-02", text: "≤2 внешних шрифта (заголовки + body)" },
      { code: "Q-03", text: "≤100KB — размер изображения" },
      { code: "Q-04", text: "≤3 параллельных API-запросов при старте" },
      { code: "Q-05", text: "≤2MB — размер localStorage" },
    ],
    slop: [
      { code: "B-03", pattern: "window\\.location\\.href", message: "навигация закроет Mini App (B-03)" },
      { code: "B-04", pattern: "::-webkit-scrollbar", message: "кастомный скроллбар ломает momentum iOS (B-04)" },
    ],
  },

  mobile_apps: {
    gatesText: "G1 Бриф/категория → G2 Архитектура/экраны → G3 Сборка/TS → G4 Устройства/сторы",
    constitution: [
      { code: "К-01", title: "Гайдлайны платформы", text: "Соответствие гайдлайнам платформы: iOS — Apple HIG, Android — Material Design 3.", method: "LLM-критик + статический анализ" },
      { code: "К-02", title: "Safe Area", text: "Safe Area (notch / home indicator): SafeAreaView (RN) / SafeArea (Flutter) / .safeAreaInset (SwiftUI).", method: "статический анализ" },
      { code: "К-03", title: "Тач-таргеты", text: "Тач-таргеты: iOS ≥ 44×44 pt, Android ≥ 48×48 dp.", method: "анализ стилей" },
      { code: "К-04", title: "4 состояния экрана", text: "Каждый экран имеет 4 состояния: Loading, Empty, Error, Success.", method: "наличие компонентов" },
      { code: "К-05", title: "Тёмная тема", text: "Поддержка тёмной темы (Appearance API / useColorScheme).", method: "статический анализ" },
      { code: "К-06", title: "FPS и запуск", text: "FPS ≥ 55 на mid-range, запуск < 2 c.", method: "Flipper / Flutter DevTools" },
      { code: "К-07", title: "Offline", text: "Offline-режим: кэш и очередь запросов.", method: "NetInfo listener + локальное хранилище" },
      { code: "К-08", title: "Нативные стеки", text: "Нативные стеки навигации (React Navigation / go_router / NavigationStack).", method: "отсутствие кастомных стеков без анимаций" },
      { code: "К-09", title: "Клавиатура", text: "Клавиатура не перекрывает поля ввода (KeyboardAvoidingView / Scaffold).", method: "статический анализ" },
      { code: "К-10", title: "Планшеты", text: "Адаптивный layout на планшетах (iPad / Android tablet).", method: "скриншоты" },
      { code: "К-11", title: "Accessibility", text: "Accessibility: accessibilityLabel / semanticLabel.", method: "статический анализ + Accessibility Inspector" },
      { code: "К-12", title: "Разрешения", text: "Разрешения запрашиваются в момент использования, а не на старте.", method: "отсутствие запросов в componentDidMount/initState" },
      { code: "К-13", title: "Deep links", text: "Обработка deep links (universal/app links).", method: "Info.plist / AndroidManifest.xml" },
      { code: "К-14", title: "Локализация", text: "Локализация минимум на 2 языка (en + ru) через i18n.", method: "наличие i18next/intl/Localizable.strings" },
      { code: "К-15", title: "Push", text: "Push-уведомления через FCM / APNs.", method: "наличие onMessage-обработчика" },
      { code: "К-16", title: "Стейт-менеджер", text: "Единый стейт-менеджер (Redux / Zustand / Riverpod / Bloc).", method: "отсутствие prop drilling > 3 уровней" },
      { code: "К-17", title: "Retry и ошибки", text: "Все API-вызовы имеют retry-логику и user-friendly сообщения об ошибках.", method: "try-catch с UI-фидбеком" },
      { code: "К-18", title: "5+ разрешений", text: "Тестирование на 5+ разрешениях (iPhone SE…Android 600dp).", method: "скриншоты Detox/Appium" },
      { code: "К-19", title: "Биометрия", text: "Биометрия через нативные API (react-native-biometrics / local_auth).", method: "статический анализ" },
      { code: "К-20", title: "Готовность к сторам", text: "Готовность к сторам: иконка 1024×1024, скриншоты 6.5\" + 5.5\", описание.", method: "наличие файлов в assets/" },
    ],
    banned: [
      { code: "B-01", title: "iOS-паттерны в Android", text: "iOS-паттерны в Android без адаптации — LLM-критик + `Platform.OS`" },
      { code: "B-02", title: "Синхрон в UI-потоке", text: "синхронные операции в UI-потоке (ANR) — ESLint `no-sync-in-ui`" },
      { code: "B-03", title: "WebView без sandbox", text: "`WebView` без sandbox/`javaScriptEnabled` — regex" },
      { code: "B-04", title: "Хардкод строк", text: "хардкод строк без i18n — ESLint `i18next/no-literal-string`" },
      { code: "B-05", title: "alert вместо native UI", text: "`alert()` / `Alert.alert` вместо нативного UI — regex" },
      { code: "B-06", title: "FlatList без key", text: "отсутствие `key` в `FlatList`/`ListView` — ESLint `react/no-array-index-key`" },
    ],
    quotas: [
      { code: "Q-01", text: "≤50MB — размер APK / IPA (без on-demand)" },
      { code: "Q-02", text: "≤50 прямых npm-зависимостей" },
      { code: "Q-03", text: "≤2 c — время холодного старта (mid-range)" },
      { code: "Q-04", text: "≤150MB — память в активном состоянии" },
      { code: "Q-05", text: "≤5 экранов в одном стеке без навигации" },
      { code: "Q-06", text: "≤100MB — размер кэша на диске" },
    ],
    slop: [
      { code: "B-05", pattern: "Alert\\.alert\\(", message: "alert вместо нативного UI (B-05)" },
      { code: "B-03", pattern: "javaScriptEnabled:\\s*true", message: "WebView без sandbox (B-03)" },
    ],
  },
};
export default TZ_OVERRIDES;
