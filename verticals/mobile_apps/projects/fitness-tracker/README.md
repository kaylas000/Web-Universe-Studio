# Трекер тренировок

MVP мобильного приложения для учёта тренировок на React Native.

## Платформа

iOS: Apple Human Interface Guidelines (HIG).
Android: Material Design 3.

## Разделы

- `app/src/App.mjs` — экран списка тренировок: 4 состояния, safe area, тёмная тема,
  offline-кэш с очередью, нативный стек, биометрия, deep links.
- `app/locales/` — i18n на русском и английском.
- `app/perf.json` / `app/bundle.json` / `app/devices-report.json` — отчёты производительности
  и прогона по 5+ разрешениям.
- `app/assets/` + `app/screenshots/` — ассеты стора (иконка 1024×1024, скриншоты 6.5"/5.5").

## Запуск

Модуль `app/src/App.mjs` отрисует экран в контейнер с идентификатором `app`.
Приёмка: `node scripts/validate.mjs projects/fitness-tracker` → `ИТОГ: 22/22 · exit 0`.