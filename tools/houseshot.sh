#!/usr/bin/env bash
# Alte Aufrufe, jetzt über tools/browser.js (eigener Server auf freiem Port, PORT wird nicht mehr gebraucht). Vorher node tools/bauen.js.
#   tools/houseshot.sh garage "pos=21.2,-2.0,23.4&tgt=14.0,-2.7,18.6"   → tools/shots/house-garage.png (gibt den Pfad aus)
#   tools/houseshot.sh eg "cam=ost&level=EG"                             → Kamera wie die Buttons, Geschossschnitt EG
#   tools/houseshot.sh probe ankommen [5]                                → Rundgang wie beim Gehen prüfen, PROBE [[art, x, y, Höhe, Abstand, Teil], …]
#   tools/houseshot.sh fingerprint                                       → Prüfsumme der Szene je Material, FP {…}
# Weltkoordinaten wie View3D._view: X = Plan-Ost, Y = Höhe, Z = -Plan-Nord. Für mehrere Bilder und Vergleiche besser ./vg bild bzw. ./vg pruefen.
cd "$(dirname "$0")/.." && exec node tools/browser.js houseshot "$@"
