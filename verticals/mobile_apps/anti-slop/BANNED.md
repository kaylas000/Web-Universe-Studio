# BANNED.md — анти-слоп студии «Студия мобильных приложений»

Клише и приёмы, запрещённые в артефактах. Каждый пункт ловится `scripts/lint-slop.mjs`.

| Код | Что | Почему запрещено |
| --- | --- | --- |
| B-01 | iOS-паттерны в Android | iOS-паттерны в Android без адаптации — статический анализ + `Platform.OS` |
| B-02 | Синхрон в UI-потоке | синхронные операции в UI-потоке (ANR) — ESLint `no-sync-in-ui` |
| B-03 | WebView без sandbox | `WebView` без sandbox/`javaScriptEnabled` — regex |
| B-04 | Хардкод строк | хардкод строк без i18n — ESLint `i18next/no-literal-string` |
| B-05 | alert вместо native UI | `alert()` / `Alert.alert` вместо нативного UI — regex |
| B-06 | FlatList без key | отсутствие `key` в `FlatList`/`ListView` — ESLint `react/no-array-index-key` |
