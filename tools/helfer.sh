#!/usr/bin/env bash
# Für Hilfsagenten in einer eigenen Arbeitskopie (.claude/worktrees/…), siehe CLAUDE.md:
#   ./vg helfer start   holt den aktuellen Stand von main in den eigenen Zweig, baut einmal und nimmt docs/index.html aus den Commits
#                       (die Seite wird erst nach dem Zusammenführen auf main neu gebaut, sonst gibt es Konflikte in der 570-KB-Datei)
#   ./vg helfer stand   zeigt Zweig, Abstand zu main und die eigenen Änderungen
set -euo pipefail
cd "$(dirname "$0")/.."
zweig=$(git rev-parse --abbrev-ref HEAD)
case "${1:-stand}" in
  start)
    [ "$zweig" = main ] && { echo "Das ist main, keine Arbeitskopie – hier nichts zu tun."; exit 0; }
    git update-index --no-skip-worktree docs/index.html
    git checkout -q -- docs/index.html
    if git merge --ff-only -q main 2>/dev/null; then echo "Zweig $zweig auf dem Stand von main ($(git rev-parse --short main))"
    else echo "Vorspulen ging nicht (eigene Commits?): git rebase main"; exit 1; fi
    node tools/bauen.js > /dev/null
    git update-index --skip-worktree docs/index.html
    echo "Gebaut; docs/index.html bleibt außerhalb der Commits." ;;
  stand)
    echo "Zweig $zweig · $(git rev-list --count main..HEAD) eigene Commits · $(git rev-list --count HEAD..main) hinter main"
    git status --short ;;
  *) echo "Aufruf: ./vg helfer start | stand"; exit 2 ;;
esac
