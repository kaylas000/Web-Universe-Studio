# CONSTITUTION.md — закон студии «Студия мобильных приложений»

Полные статьи вертикали `mobile_apps` (§9 ТЗ). Проверка статьи — метод из ТЗ (графа «Проверка»):
детерминированный офлайн-набор `scripts/validate.mjs` (коды `V-xx`) реализует подмножество статей; остальное — приёмка человеком на G4 (REVIEW.md).

## Статьи

- **К-01. Гайдлайны платформы.** Соответствие гайдлайнам платформы: iOS — Apple HIG, Android — Material Design 3. *Проверка:* V-01 (scripts/rules.json) · статический анализ + чек-лист гайдлайнов.
- **К-02. Safe Area.** Safe Area (notch / home indicator): SafeAreaView (RN) / SafeArea (Flutter) / .safeAreaInset (SwiftUI). *Проверка:* V-02 (scripts/rules.json) · статический анализ.
- **К-03. Тач-таргеты.** Тач-таргеты: iOS ≥ 44×44 pt, Android ≥ 48×48 dp. *Проверка:* V-03 (scripts/rules.json) · анализ стилей.
- **К-04. 4 состояния экрана.** Каждый экран имеет 4 состояния: Loading, Empty, Error, Success. *Проверка:* V-04 (scripts/rules.json) · наличие компонентов.
- **К-05. Тёмная тема.** Поддержка тёмной темы (Appearance API / useColorScheme). *Проверка:* V-05 (scripts/rules.json) · статический анализ.
- **К-06. FPS и запуск.** FPS ≥ 55 на mid-range, запуск < 2 c. *Проверка:* V-06 (scripts/rules.json) · Flipper / Flutter DevTools.
- **К-07. Offline.** Offline-режим: кэш и очередь запросов. *Проверка:* V-07 (scripts/rules.json) · NetInfo listener + локальное хранилище.
- **К-08. Нативные стеки.** Нативные стеки навигации (React Navigation / go_router / NavigationStack). *Проверка:* V-08 (scripts/rules.json) · отсутствие кастомных стеков без анимаций.
- **К-09. Клавиатура.** Клавиатура не перекрывает поля ввода (KeyboardAvoidingView / Scaffold). *Проверка:* V-09 (scripts/rules.json) · статический анализ.
- **К-10. Планшеты.** Адаптивный layout на планшетах (iPad / Android tablet). *Проверка:* V-10 (scripts/rules.json) · скриншоты.
- **К-11. Accessibility.** Accessibility: accessibilityLabel / semanticLabel. *Проверка:* V-11 (scripts/rules.json) · статический анализ + Accessibility Inspector.
- **К-12. Разрешения.** Разрешения запрашиваются в момент использования, а не на старте. *Проверка:* V-12 (scripts/rules.json) · отсутствие запросов в componentDidMount/initState.
- **К-13. Deep links.** Обработка deep links (universal/app links). *Проверка:* V-13 (scripts/rules.json) · Info.plist / AndroidManifest.xml.
- **К-14. Локализация.** Локализация минимум на 2 языка (en + ru) через i18n. *Проверка:* V-14, V-27 (scripts/rules.json) · наличие i18next/intl/Localizable.strings.
- **К-15. Push.** Push-уведомления через FCM / APNs. *Проверка:* V-15 (scripts/rules.json) · наличие onMessage-обработчика.
- **К-16. Стейт-менеджер.** Единый стейт-менеджер (Redux / Zustand / Riverpod / Bloc). *Проверка:* V-16 (scripts/rules.json) · отсутствие prop drilling > 3 уровней.
- **К-17. Retry и ошибки.** Все API-вызовы имеют retry-логику и user-friendly сообщения об ошибках. *Проверка:* V-17 (scripts/rules.json) · try-catch с UI-фидбеком.
- **К-18. 5+ разрешений.** Тестирование на 5+ разрешениях (iPhone SE…Android 600dp). *Проверка:* V-18 (scripts/rules.json) · скриншоты Detox/Appium.
- **К-19. Биометрия.** Биометрия через нативные API (react-native-biometrics / local_auth). *Проверка:* V-19, V-26 (scripts/rules.json) · статический анализ.
- **К-20. Готовность к сторам.** Готовность к сторам: иконка 1024×1024, скриншоты 6.5" + 5.5", описание. *Проверка:* V-20, V-28 (scripts/rules.json) · наличие файлов в assets/.
- **К-21. Микрокопи.** Тексты без маркетинговых штампов; ошибка рядом со следующим шагом; кнопки называют действие, а не «нажмите сюда». *Проверка:* V-21 (скан locales/ru.json) + B-07…B-10 в lint-slop.
- **К-22. Контраст текста.** Контраст текста к фону — не ниже 4.5:1 (WCAG 2.1 AA) в светлой и тёмной темах. Таблица токенов — `app/theme.json` (пары `contrast`). *Проверка:* V-22 (kind `themeContrast`: каждая пара темы проходит порог; расчёт по WCAG 2.1).
- **К-23. Эвристики NN/g.** Экран исполняет проверяемое ядро эвристик Нильсена: видимый системный статус (`NetInfo`/`status`), свобода выхода (нативный стек навигации), предотвращение ошибок (retry у API), распознавание (accessibilityLabel), вход в справку (i18n `help`). Полная карта 10 эвристик и их прокси — `HEURISTICS.md`. *Проверка:* V-23 (kind `allOf`: пять детерминированных прокси; качественные эвристики — чек-лист `HEURISTICS.md` и артдиректор на G4).
- **К-24. Типографика.** Базовый кегль ≥ 16, контентный ≥ 14, интерлиньяж ≥ 20: ни мелких кеглей, ни удушающего межстрочного. *Проверка:* V-24 (kind `allOf`: `fontSize={≥16}` базовый, `{≥14}` контент минимум на двух элементах; `regexAbsent` рубит `{<14}` и `lineHeight<20`; реальные pt/dp — Flipper/Flutter DevTools на тире).
- **К-25. Анимации 60fps.** Анимации декларируются нативным драйвером (`Animated.timing` + `useNativeDriver: true`), кадровая модель — `requestAnimationFrame`/`Easing`; запрещены блокирующие задержки главного потока (`setTimeout` ≥ 500 мс). *Проверка:* V-25 (kind `allOf`: три `regexAtLeast` + `regexAbsent` на длинные `setTimeout`; 60fps — Profiler на тире).

**Гейты:** G1 Бриф/категория → G2 Архитектура/экраны → G3 Сборка/TS → G4 Устройства/сторы.

## Приёмка

1. Проект не сдаётся, пока `node scripts/validate.mjs projects/<имя>` не вернул `exit 0`.
2. `node scripts/lint-slop.mjs projects/<имя>` печатает `чисто:`.
3. Цикл принуждения: `node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/mobile_apps`.
- **К-26. Флаги платформы и планшеты.** Манифест приложения объявляет дизайн-систему (HIG/Material 3), поддержку планшетов и запрос разрешений по действию пользователя. *Проверка:* V-29 (scripts/rules.json) · валидатор.
