#!/usr/bin/env bash
# Einzelne 3D-Bilder ohne Fenster (tools/browser.js, etwa 12 s für das erste Bild, je weiteres rund 3 s):
#   ./vg bild                                  listet die Ansichten aus tools/ansichten.json
#   ./vg bild halle buero                      → tools/shots/bild-halle.png, bild-buero.png; mit Referenz auch der Vergleich (geändert → tools/shots/vergleich/)
#   ./vg bild test "pos=8,1.8,-3&tgt=8,1.6,4" → freie Kamera (Weltkoordinaten X = Plan-x, Y = Höhe, Z = −Plan-y), dazu &level=EG für den Geschossschnitt
#   ./vg bild test "cam=ost" | "level=OG"      → Kamera der Buttons bzw. Geschossblick
cd "$(dirname "$0")/.." && exec node tools/browser.js bild "$@"
