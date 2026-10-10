#!/usr/bin/env bash
# ЦЕХ · метаплатформа — scripts/deploy.sh
# Публикация веб-витрины эталонной вертикали (§14.2 ТЗ). Без сети по умолчанию: сухой прогон
# печатает, что будет собрано. Реальная сборка — при --build и наличии vite в вертикали.
# Выход: 0 — план/сборка успешны (или нечего собирать); 1 — ошибка сборки.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
VERTICAL="${DEPLOY_VERTICAL:-web_studio}"
VDIR="verticals/$VERTICAL"

echo "ЦЕХ · публикация витрины вертикали «$VERTICAL»"

if [ ! -d "$VDIR" ]; then
  echo "вертикаль не найдена: $VDIR" >&2
  exit 1
fi

if [ ! -f "$VDIR/package.json" ]; then
  echo "у вертикали нет package.json — витрина не собирается (ядро zero-dep, витрина — отдельный слой)"
  echo "ИТОГ: нечего публиковать · exit 0"
  exit 0
fi

if [ "${1:-}" != "--build" ]; then
  echo "сухой прогон: будет выполнен 'npm run build' в $VDIR (реальный деплой — с --build)"
  echo "ИТОГ: план готов · exit 0"
  exit 0
fi

( cd "$VDIR" && npm run build )
code=$?
if [ "$code" -eq 0 ]; then echo "ИТОГ: витрина собрана · exit 0"; else echo "ИТОГ: сборка упала · exit $code" >&2; fi
exit "$code"
