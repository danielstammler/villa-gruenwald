#!/usr/bin/env bash
# Schneller Weg für die Arbeit an den Grundrissen (ohne 3D, wenige Sekunden): Grundriss-SVGs mit src/style.css als PNG nach
# tools/shots/plan-<fl>.png (längere Seite 1000 px); weicht ein Grundriss von der Referenz ab, vorher | nachher nach
# tools/shots/vergleich/plan-grundriss-<fl>.png (eigener Präfix, ./vg pruefen räumt dort nur seine eigenen Bilder weg).
#   ./vg plan            alle vier Geschosse
#   ./vg plan EG OG      nur diese
cd "$(dirname "$0")/.." && exec node tools/browser.js plan "$@"
