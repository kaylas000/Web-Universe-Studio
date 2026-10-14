# QUOTAS.md — квоты студии «Студия мини-приложений»

Сколько «украшений» допустимо, чтобы результат не превращался в шум.

- **Q-01.** ≤300KB (gzip) — размер JS-бандла
- **Q-02.** ≤2 внешних шрифта (заголовки + body)
- **Q-03.** ≤100KB — размер изображения
- **Q-04.** ≤3 параллельных API-запросов при старте
- **Q-05.** ≤2MB — размер localStorage
- **Q-06.** ≥0.9 — Lighthouse performance (app/lighthouse.json, jsonNumberMin)
- **Q-07.** ≤2000ms — TTI (app/lighthouse.json, jsonNumberMax)
- **Q-08.** ≤1200ms — FCP (app/lighthouse.json, jsonNumberMax)