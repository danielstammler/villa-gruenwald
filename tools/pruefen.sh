#!/usr/bin/env bash
# Prüfung in einem Befehl mit kurzer Ausgabe (je Bereich eine Zeile, Einzelheiten nur bei Fehlern):
#   ./vg pruefen schnell   Bau, Zeichnungen und Regeln, etwa 1 s – beim Iterieren nach jeder Änderung
#   ./vg pruefen           dazu die 3D-Prüfungen – vor jedem Commit
# Rückgabe 1, wenn etwas fehlschlägt.
set -uo pipefail
cd "$(dirname "$0")/.."
fehler=0
zeile() { printf '%-12s %s\n' "$1" "$2"; }

if out=$(node tools/bauen.js 2>&1); then zeile Bauen "ok    $(echo "$out" | awk '{ printf "%s%s %d KB", s, $1, $2 / 1024; s = " · " }')"
else zeile Bauen FEHLER; echo "$out"; exit 1; fi

if out=$(node tools/check.js 2>&1); then zeile Zeichnungen "ok    $(echo "$out" | grep -c '^ok') ohne NaN/undefined · $(echo "$out" | tail -1)"
else zeile Zeichnungen FEHLER; echo "$out" | grep -v '^ok'; fehler=1; fi

if [ -f tools/regeln.js ]; then
  if out=$(node tools/regeln.js 2>&1); then zeile Regeln "ok    $(echo "$out" | tail -1)"
  else zeile Regeln FEHLER; echo "$out"; fehler=1; fi
fi

[ "${1:-}" = schnell ] && exit $fehler
exit $fehler
