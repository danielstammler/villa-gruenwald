#!/usr/bin/env bash
# Rendert das fertige Modell (docs/index.html, vorher python3 build.py) ohne Browser-Fenster als PNG oder prüft einen Rundgang – auch mehrfach gleichzeitig.
# Aufruf in WSL im Repo:
#   tools/houseshot.sh garage "pos=21.2,-2.0,23.4&tgt=14.0,-2.7,18.6"   → tools/shots/house-garage.png
#   tools/houseshot.sh eg "cam=sued&level=EG"                            → Kamera wie die Buttons, Geschossblick EG
#   tools/houseshot.sh probe ankommen                                    → Kollisionen und fehlender Boden entlang des Rundgangs (JSON)
# Weltkoordinaten wie View3D._view: X = Plan-Ost, Y = Höhe, Z = -Plan-Nord.
set -euo pipefail
name="${1:?Aufruf: tools/houseshot.sh <name> \"pos=..&tgt=..\" | tools/houseshot.sh probe <rundgang>}"; par="${2:-}"
cd "$(dirname "$0")/.."
mkdir -p tools/shots
up() { curl -fs -o /dev/null http://127.0.0.1:8766/tools/houseshot.html; }
if ! up; then
  nohup python3 -m http.server 8766 --bind 127.0.0.1 --directory "$(pwd -P)" >/dev/null 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do sleep 0.3; up && break; done
  up || { echo "FEHLER: Server auf Port 8766 lässt sich nicht starten"; exit 1; }
fi
prof="$(mktemp -d)"; trap 'rm -rf "$prof"' EXIT
chrome=(google-chrome --headless=new --no-sandbox --disable-dev-shm-usage --user-data-dir="$prof" --no-first-run --disable-gcm
  --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --window-size=1400,900 --virtual-time-budget=90000)
if [ "$name" = probe ]; then
  url="http://127.0.0.1:8766/tools/houseshot.html?probe=${par:?Rundgang fehlt}&step=${3:-10}"
  dom=$("${chrome[@]}" --dump-dom "$url" 2>/dev/null || true)
  res=$(printf '%s' "$dom" | sed -n 's/.*<pre id="out">\(PROBE \|FEHLER \)\(.*\)<\/pre>.*/\1\2/p')
  [ -n "$res" ] || { echo "FEHLER: keine Antwort von der Seite"; exit 1; }
  echo "$res" | sed 's/&quot;/"/g; s/&amp;/\&/g'
  case "$res" in FEHLER*) exit 1;; esac
  exit 0
fi
out="tools/shots/house-$name.png"
url="http://127.0.0.1:8766/tools/houseshot.html?$par"
"${chrome[@]}" --screenshot="$out" "$url" >/dev/null 2>&1 || true
[ -s "$out" ] || { echo "FEHLER: kein Bild entstanden"; exit 1; }
echo "$(pwd -P)/$out" | sed 's#^/mnt/c/#C:/#'
