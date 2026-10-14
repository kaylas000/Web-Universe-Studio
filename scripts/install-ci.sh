#!/usr/bin/env bash
# ЦЕХ · установка CI на GitHub из репозитория.
#
# Зачем скрипт: GitHub читает workflow только из `.github/workflows/`, и этот путь —
# единственный, куда пускают не все: интеграция, заливающая ветку, может не иметь права
# `workflows` (тогда push отклоняется на сервере, а не в git). Поэтому конфигурация
# хранится в репозитории как данные (`ci/workflows/*.yml`), а установка — одна команда:
# любой, у кого есть право писать в репозиторий, ставит CI и коммитит.
#
# Использование:
#   bash scripts/install-ci.sh            # установить и показать, что дальше
#   bash scripts/install-ci.sh --check    # ничего не писать, только сверить (exit 0/1)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SRC="$ROOT/ci/workflows"
DST="$ROOT/.github/workflows"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

if [ ! -d "$SRC" ]; then
  echo "install-ci: нет каталога $SRC — конфигурация CI не найдена" >&2
  exit 1
fi

status=0
for file in "$SRC"/*.yml; do
  name="$(basename "$file")"
  target="$DST/$name"
  if [ -f "$target" ] && cmp -s "$file" "$target"; then
    echo "OK   $name уже установлен и совпадает с ci/workflows/$name"
    continue
  fi
  status=1
  if [ "$CHECK" = "1" ]; then
    if [ -f "$target" ]; then
      echo "FAIL $name установлен, но разошёлся с ci/workflows/$name — запустите bash scripts/install-ci.sh"
    else
      echo "FAIL $name не установлен — запустите bash scripts/install-ci.sh"
    fi
    continue
  fi
  mkdir -p "$DST"
  cp "$file" "$target"
  echo "УСТАНОВЛЕН $name → .github/workflows/$name"
done

if [ "$CHECK" = "1" ]; then
  exit "$status"
fi

echo "────────────────────────────────────────────────"
echo "Следующий шаг: закоммитьте .github/workflows/ и запушьте ветку —"
echo "GitHub запустит те же шаги, что и локально: гигиена, npm test, приёмка DoD."
echo "Если сервер отклонит push («without \`workflows\` permission»), ставьте файл"
echo "через веб-интерфейс GitHub или выровняйте права интеграции."
