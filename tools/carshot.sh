#!/usr/bin/env bash
# Rendert tools/carstudio.html ohne Browser-Fenster (Chrome headless in WSL) als PNG – mehrere Agenten können gleichzeitig rendern.
# Aufruf in WSL im Repo:  tools/carshot.sh <auto> [ansicht] [weitere Parameter]
#   tools/carshot.sh ferrari              → tools/shots/ferrari-all.png (sechs Ansichten)
#   tools/carshot.sh ferrari side         → tools/shots/ferrari-side.png
#   tools/carshot.sh ferrari wheel "wx=1.04"
#   tools/carshot.sh ferrari detail "x=0.3&y=0.6&z=0.6&cx=-1&cy=0.9&cz=1.6&fov=25"
# Braucht den Server „villa-dev“ (Port 8766, Repo-Wurzel). Bilder liegen in tools/shots/ (nicht im Git).
set -euo pipefail
car="${1:?Aufruf: tools/carshot.sh <auto> [ansicht] [parameter]}"; view="${2:-all}"; extra="${3:-}"
cd "$(dirname "$0")/.."
mkdir -p tools/shots
tag="$view"; [ -n "$extra" ] && tag="$view-$(printf '%s' "$extra" | tr -c 'A-Za-z0-9.' '_' | cut -c1-40)"
out="tools/shots/$car-$tag.png"
w=1500; h=1000; [ "$view" != all ] && { w=1200; h=900; }
url="http://127.0.0.1:8766/tools/carstudio.html?car=$car&view=$view&w=$w&h=$h&v=$(date +%s%N)${extra:+&$extra}"
up() { curl -fs -o /dev/null http://127.0.0.1:8766/tools/carstudio.html; }
if ! up; then
  # Server fehlt: selbst starten (bleibt im Hintergrund laufen, nur lokal erreichbar)
  nohup python3 -m http.server 8766 --bind 127.0.0.1 --directory "$(pwd -P)" >/dev/null 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do sleep 0.3; up && break; done
  up || { echo "FEHLER: Server auf Port 8766 lässt sich nicht starten"; exit 1; }
fi
# eigenes Profil je Aufruf, damit parallele Aufrufe sich nicht sperren
prof="$(mktemp -d)"; trap 'rm -rf "$prof"' EXIT
google-chrome --headless=new --no-sandbox --disable-dev-shm-usage --user-data-dir="$prof" --no-first-run --disable-gcm \
  --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --window-size=$w,$h \
  --virtual-time-budget=20000 --screenshot="$out" "$url" >/dev/null 2>&1 || true
[ -s "$out" ] || { echo "FEHLER: kein Bild entstanden"; exit 1; }
echo "$(pwd -P)/$out" | sed 's#^/mnt/c/#C:/#'
