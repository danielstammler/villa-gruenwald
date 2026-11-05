#!/usr/bin/env bash
# Rundgänge prüfen wie beim Gehen (tools/browser.js): der Rundgang läuft in 1/30 s ab, Türen und Tore öffnen sich wie unterwegs; alle 0,5 m
# Strahlen auf Augenhöhe, zum Boden und entlang des Wegs. Bekannte Kontakte stehen in tools/erwartet.json, gemeldet wird nur Unerwartetes.
#   ./vg rundgang              alle Rundgänge (zwei Chrome gleichzeitig, etwa 25 s)
#   ./vg rundgang garage 5     ein Rundgang, Strahlen alle 5 × 5 cm; VG_ROH=1 zeigt alle Treffer
cd "$(dirname "$0")/.." && exec node tools/browser.js rundgang "$@"
