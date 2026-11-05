#!/usr/bin/env bash
# Nur nach gewollten Änderungen: der aktuelle Stand wird die Referenz für ./vg pruefen, ./vg bild und ./vg plan (tools/shots/referenz/, nicht im
# Repo, je Arbeitskopie eigene). Baut, schreibt die Zeichnungen und übernimmt die Bilder des letzten ./vg pruefen; sind die nicht vom
# aktuellen Stand, rendert es sie vorher neu (rund 1 min). Danach werden auch die Regelwerte (regeln.json) und das Raumbuch (raumbuch.json)
# Referenz, gegen die die Zeilen Regeln und Räume vergleichen; schlägt der Bilderteil fehl, bleiben auch diese unverändert.
#   ./vg abnehmen
cd "$(dirname "$0")/.." || exit 1
node tools/browser.js abnehmen "$@" || exit $?
node tools/regeln.js --abnehmen && node tools/raumbuch.js --abnehmen
