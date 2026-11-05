#!/usr/bin/env bash
# Nur nach gewollten Änderungen: der aktuelle Stand wird die Referenz für ./vg pruefen, ./vg bild und ./vg plan (tools/shots/referenz/, nicht im
# Repo, je Arbeitskopie eigene). Baut, schreibt die Zeichnungen und übernimmt die Bilder des letzten ./vg pruefen; sind die nicht vom
# aktuellen Stand, rendert es sie vorher neu (rund 1 min).
#   ./vg abnehmen
cd "$(dirname "$0")/.." && exec node tools/browser.js abnehmen "$@"
