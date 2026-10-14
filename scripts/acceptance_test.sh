#!/usr/bin/env bash
# ЦЕХ · метаплатформа — scripts/acceptance_test.sh
# Definition of Done платформы (§15, §18.3 ТЗ) одной командой. ОФЛАЙН, без ключей, без npm ci.
# Выход: 0 — все проверки зелёные; иначе — код первой упавшей ступени.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
fail=0

step() {
  printf '\n=== %s ===\n' "$1"
  shift
  "$@"
  local code=$?
  if [ "$code" -ne 0 ]; then
    printf 'СТУПЕНЬ ПРОВАЛЕНА (exit %s)\n' "$code"
    fail=1
  fi
  return 0
}

echo "ЦЕХ · приёмка метаплатформы"
echo "корень: $ROOT"

step "1/5 тесты движка" node --test core/loop-engine/tests/*.test.mjs
step "2/5 офлайн-цикл (selftest)" node core/loop-engine/cli.mjs --selftest
step "3/5 платформенный гейт (все вертикали)" node core/gate.mjs
step "4/5 аудит архива (К-04)" node scripts/scrape_references.mjs
step "5/5 тесты платформы и вертикалей" node scripts/run-tests.mjs tests verticals

printf '\n────────────────────────────────────────────────────────\n'
if [ "$fail" -eq 0 ]; then
  echo "ИТОГ: приёмка пройдена · exit 0"
  exit 0
fi
echo "ИТОГ: приёмка провалена · exit 1"
exit 1
