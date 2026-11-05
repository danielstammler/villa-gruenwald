#!/usr/bin/env bash
# Prüfung in einem Befehl mit kurzer Ausgabe (je Bereich eine Zeile, Einzelheiten nur bei Problemen):
#   ./vg pruefen schnell   Bau, Zeichnungen, Regeln, Räume, Wege und die Anker der 3D-Ansichten, etwa 1 s – beim Iterieren nach jeder Änderung
#   ./vg pruefen           erst das Billige (Bau, Zeichnungen samt Vergleich mit der Referenz, Regeln, Räume), dann 3D (tools/browser.js):
#                          Rundgänge wie beim Gehen, Prüfsumme der Szene und die Ansichten aus tools/ansichten.json im Bildvergleich – vor jedem
#                          Commit, rund 1½ min. Geänderte Bilder: tools/shots/vergleich/ (vorher | nachher), alle klein: tools/shots/uebersicht.png
#   ./vg abnehmen          nach gewollten Änderungen: der aktuelle Stand wird Referenz (tools/shots/referenz/, beim ersten Lauf von selbst)
# Regeln und Räume vergleichen in beiden Läufen mit der Referenz (regeln.json, raumbuch.json): geänderte Regelwerte und Raumflächen stehen
# in ihrer Zeile mit vorher → nachher.
# Rückgabe 1, wenn etwas fehlschlägt (Bau, NaN, Regeln, unerwartete Kontakte, Bildfehler); Änderungen allein sind kein Fehler.
set -uo pipefail
cd "$(dirname "$0")/.."
t0=$(date +%s)
fehler=0
voll=1; [ "${1:-}" = schnell ] && voll=0
# Spalte nach Zeichen auffüllen (printf zählt Bytes, „Räume“ stünde sonst eine Stelle zu weit links)
zeile() { local n=$(( 12 - ${#1} )); printf '%s%*s %s\n' "$1" $(( n > 0 ? n : 0 )) '' "$2"; }

if out=$(node tools/bauen.js 2>&1); then zeile Bauen "ok    $(echo "$out" | awk '{ printf "%s%s %d KB", s, $1, $2 / 1024; s = " · " }')"
else zeile Bauen FEHLER; echo "$out"; exit 1; fi

# Die Prüfungen ohne Browser lesen nur src/ und laufen gleichzeitig (je ein Node-Prozess, zusammen so lange wie der längste); ihre
# Zeilen kommen danach in fester Reihenfolge. fertig <name>: Ausgabe nach $out, wahr bei Rückgabe 0
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
hinten() { local n=$1; shift; { "$@"; echo $? > "$tmp/$n.rc"; } > "$tmp/$n.out" 2>&1 & }
fertig() { out=$(cat "$tmp/$1.out"); [ "$(cat "$tmp/$1.rc" 2>/dev/null)" = 0 ]; }
svg=(); [ $voll = 1 ] && svg=(--svg tools/shots/aktuell/svg)
hinten check node tools/check.js "${svg[@]}"
[ -f tools/regeln.js ] && hinten regeln node tools/regeln.js
hinten raeume node tools/raumbuch.js --vergleich
hinten wege node tools/wege.js
[ $voll = 0 ] && hinten anker node tools/lib/anker.js
wait

# Zeichnungen: NaN/undefined, im vollen Lauf dazu die SVGs gegen die Referenz (Bilder nur von geänderten)
if fertig check; then
  n="$(echo "$out" | grep -c '^ok') ohne NaN"; wf=$(echo "$out" | tail -1)
  if [ $voll = 1 ]; then
    if vgl=$(node tools/browser.js zeichnungen 2>&1); then
      erste=$(echo "$vgl" | head -1)
      case "$erste" in "0 geändert" | "Referenz neu") zeile Zeichnungen "ok    $n · $erste · $wf" ;; *) zeile Zeichnungen "$n · $erste · $wf" ;; esac
      echo "$vgl" | tail -n +2
    else zeile Zeichnungen "FEHLER $n · Vergleich: $(echo "$vgl" | tail -1)"; fehler=1; fi
  else zeile Zeichnungen "ok    $n · $wf"; fi
else zeile Zeichnungen FEHLER; echo "$out" | grep -v '^ok'; fehler=1; fi

# Regeln mit den gegen die Referenz geänderten Werten in der letzten Zeile
if [ -f tools/regeln.js ]; then
  if fertig regeln; then zeile Regeln "ok    $(echo "$out" | tail -1)"
  else zeile Regeln FEHLER; echo "$out"; fehler=1; fi
fi

# Räume gegen die Referenz (tools/raumbuch.js): geänderte Flächen und Lagen mit vorher → nachher, neue und entfernte Räume; kein Fehler
if fertig raeume; then zeile Räume "ok    $(echo "$out" | tail -1)"
else zeile Räume FEHLER; echo "$out"; fehler=1; fi

# Wege der Rundgänge im Haus aus dem Grundriss (ohne Browser, unter 1 s): fehlende Räume, versperrte Wege, Halte in Möbeln
if fertig wege; then zeile Wege "ok    $(echo "$out" | tail -1)"
else zeile Wege FEHLER; echo "$out" | grep -v ' · ok$'; fehler=1; fi

if [ $voll = 0 ]; then
  # Anker der 3D-Ansichten (Räume, Treppe, Haustür …) noch da? Kostet nichts und fällt nach Umbauten im Grundriss sofort auf
  fertig anker; erste=$(echo "$out" | head -1)
  case "$erste" in
    "ok "*) zeile Ansichten "ok    ${erste#ok } Anker da (Räume, Treppe, Haustür … in tools/ansichten.json)" ;;
    *) zeile Ansichten "$erste – tools/ansichten.json anpassen"; echo "$out" | tail -n +2 | sed 's/^/  /' ;;
  esac
  exit $fehler
fi

# 3D: Rundgänge, Szene, Ansichten (zwei Chrome gleichzeitig, siehe tools/browser.js)
node tools/browser.js 3d || fehler=1
zeile Zeit "$(( $(date +%s) - t0 )) s"
exit $fehler
