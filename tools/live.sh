#!/usr/bin/env bash
# Wartet, bis GitHub Pages genau den Stand von HEAD ausliefert (Prüfsumme von docs/index.html); zum Starten im Hintergrund nach dem Push.
# Pages hängt manchmal bis zu 20 Minuten in der Warteschlange – deshalb nicht aktiv warten, sondern weiterarbeiten.
#   ./vg live [Minuten, Standard 30]
set -uo pipefail
cd "$(dirname "$0")/.."
url=https://danielstammler.github.io/villa-gruenwald/
soll=$(git show HEAD:docs/index.html | sha1sum | cut -c1-40)
for ((i = 0; i < ${1:-30} * 4; i++)); do
  ist=$(curl -fsL --compressed "$url?v=$(date +%s)" | sha1sum | cut -c1-40)
  [ "$ist" = "$soll" ] && { echo "LIVE nach $((i * 15)) s ($(git rev-parse --short HEAD))"; exit 0; }
  sleep 15
done
echo "NOCH NICHT LIVE nach ${1:-30} min ($(git rev-parse --short HEAD))"
exit 1
