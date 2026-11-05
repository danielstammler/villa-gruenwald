# Villa Grünwald – Konzeptstudie

Interaktive Konzeptstudie „Forever Home Grünwald“ (Ebertstraße 14): 3D-Modell (three.js r170), Ansichten und Schnitte, Grundrisse,
Lageplan und Datenblatt in einer einzigen HTML-Seite, gebaut aus `src/`, live auf GitHub Pages (öffentliches Repo, nichts Privates
hineinschreiben). Bauherr ist Daniel. Antworten, Code-Kommentare und Commit-Nachrichten auf Deutsch; Code im Stil der Umgebung
(kompakt, dichte Einzeiler-Kommentare mit dem Warum).

## Befehle

Alles über `./vg` im Repo (aus Git Bash startet es sich selbst in WSL neu; Node, Python und Chrome gibt es nur in WSL):

- `./vg bauen` – baut `docs/index.html` (Pages) und `dist/artifact.html` (Claude-Ansicht). `OHNE_AUTOS=1 ./vg bauen` ohne Automodelle.
- `./vg pruefen schnell` – Bau, Zeichnungen, Regeln in etwa 1 s: nach jeder Änderung.
- `./vg pruefen` – zusätzlich die 3D-Prüfungen: vor jedem Commit.
- `./vg houseshot <name> "pos=x,y,z&tgt=x,y,z"` – ein 3D-Bild nach `tools/shots/house-<name>.png`; `./vg houseshot probe <rundgang> 5`
  prüft einen Rundgang; `./vg houseshot fingerprint` gibt die Prüfsumme der Szene je Material (vorher/nachher vergleichen).
- `./vg helfer start` – für Hilfsagenten in einer Arbeitskopie (siehe unten). `./vg live` – wartet im Hintergrund, bis Pages HEAD ausliefert.

## Arbeitsweise: schnell und trotzdem gründlich

- Erst prüfen lassen, dann gezielt hinschauen. Die Prüfungen geben je Bereich eine Zeile aus, Einzelheiten nur bei Fehlern.
- Bilder sparsam: nur Ansichten ansehen, die sich geändert haben, und als Ausschnitt statt als Vollbild.
- Große Dateien nie ganz lesen: `docs/index.html` und `dist/artifact.html` (erzeugt, 570 KB), `src/lod2.js` und `src/data.js`
  (je eine sehr lange Zeile). Stattdessen `grep -n` und Zeilenbereiche; die Dateikarte unten sagt, wo was steht.
- Maße im Seitentext nicht von Hand schreiben, sondern als `{{ m(HOUSE.tg.bucht) }}` (Formate in `tools/bauen.js`), dann veralten sie nicht.
- Nach Geometrie-Änderungen immer prüfen: ein alter Verweis hat den Lageplan einmal still leer gelassen.
- Jede größere Runde in einer neuen Sitzung beginnen; diese Datei und `README.md` tragen den Stand.

## Aufbau

Ordner mit Teildateien (`src/haus/`, `src/ansicht/`, `src/plan/`, `src/seite/`, `src/view3d/`) sind jeweils **eine** Datei:
`tools/bauen.js` hängt die Teile nach Namen sortiert ohne Trenner aneinander. Ein Teil ist deshalb kein eigenständiges JS (er kann
mitten in einer Funktion oder einem Objekt beginnen). Neue Teile mit passender Nummer einsortieren. `tools/lib/laden.js` lädt dieselbe
Grundlage für die Prüfungen ohne Browser in eine vm.

- `src/data.js` – Grundstück und gemessene Konzeptmaße (`SITE`); `src/lod2.js` – Nachbarhäuser (amtliches LoD2); `src/sun.js` – Sonnenstand.
- `src/haus/` – parametrisches Haus `HOUSE`: 00 Grundmaße, Höhen `HOUSE.Z`, Dach, Helfer `op()`/`fluegel()` · 10 Fassaden `fas` mit allen
  Öffnungen · 20 Freisitz, Terrasse, Podest, Balkone, Kamine · 30 Rampe `rampe` (Längsprofil `z(y)`) und Tiefgarage `tg` · 40 Pool,
  Poolhaus, Zaun, Lichthof · 50 Garten `HOUSE.garten` (Hecken, Spielplatz).
- `src/plan/` – Grundrisse `Plans`: 00 Treppe und Aufzug (`Plans.CORE` = LINE, FLIGHTS, HOLES, LIFT, VOID), Möbel `fu` · 10–40 UG, EG,
  OG, DG (Räume, Öffnungen, Türen, Möbel) · 50 Flächen und Zeichnen · 60 Tiefgarage · 90 Ausgabe. Das 3D holt Möbel aus `Plans.items(fl)`.
- `src/ansicht/` – Ansichten und Schnitte `Elev` (A–A durchs Haus, B–B durch die Rampe); `src/siteplan.js` – Lageplan `Site`.
- `src/view3d/` – 3D `View3D`: 00 Zustand, Zufall · 01 Materialien `M` · 02 Geometrie-Hilfen (`addGeo`, `boxPlan` …) · 10 Hülle ·
  20 Innenausbau · 30 Laub · 35 Lichthof · 40 Rampe, Tiefgarage, Autos · 50 Garten · 55 Spielplatz · 60 Gelände · 70 Licht ·
  80 Kamera und Rundgänge `TOURS` · 90 Bildaufbau, Schleife, Türen, Schnittstelle (`_view`, `_frame`, `_probe`, `_fingerprint`).
- `src/cars.js` und `src/car-*.js` – Autos aus einem Baukasten; `tools/carcheck.js`, `tools/carstudio.html`, `tools/carshot.sh`.
- `src/main.js` – Seite und Reiter; `src/seite/` – Seitentext je Reiter; `src/style.css`.
- Koordinaten: Plan x = Ost, y = Nord (Straße im Süden, y negativ; Hauseingang im Norden bei y ≈ 0). 3D: X = Plan-x, Y = Höhe,
  Z = −Plan-y. Höhen in `HOUSE.Z`: FFB UG −3,40, EG 0,20, OG 3,55, DG 6,65.

## Gestaltungsregeln des Bauherrn (gelten, bis er sie ändert; Neueres geht vor)

- Quellen: Haus und Zufahrt nur nach Chalines Konzept (M 1:100). Vogel+Partner nur für Grundstück und Nachbarbebauung, keine
  Abstandsflächen und keine Baurecht-Linien. Pläne, PDFs und Fotos nicht ins Repo, nur daraus gemessene Koordinaten.
- Fassade nach seinem Referenzbild: weißer Glattputz, schwarze Rahmen, steiles Mansarddach (~70°/9°); Süden Zwerchhaus in der Flucht mit
  DG-Balkon nach vorn, daneben nur Dachfenster; Norden ebenfalls Zwerchhaus; vorne zwei quadratische Pfeiler außen.
- Alle Fenster mit senkrechter Mittelsprosse; Türen bis 1,10 m einflügelig mit aufgesetzter Sprosse, breitere zweiflügelig; eine
  einflügelige Haustür mit Seitenteilen, Vordach und Laterne.
- Halle zweigeschossig; Treppe gerade quer an der Rückwand (drei Läufe nach Westen, Geländer offen mit schwarzen Stäben), man schaut beim
  Hereinkommen darauf; Personenaufzug versteckt am Westpodest mit wandbündigen Türen.
- UG: Gym im Westen mit Sportboden und Lichthof, Foyer mittig mit offenem Zugang zur Tiefgarage, Technik, Abstellraum. EG: Küche L-förmig
  mit kleinem Esstisch, Backkitchen, Gäste-WC, keine Barhocker an der Insel. OG: kein Wohnzimmer, vier Kinderzimmer, zwei Bäder mit Wanne.
  DG: Büro vorn mittig, Schlafzimmer mit Ankleide und großem Bad en suite, im Osten Gäste und Abstellraum.
- Tiefgarage 2,70 m lichte Höhe auf Höhe UG, drei Stellplätze, Fahrräder halb hochgestellt, Sektionaltor, schön (Eichenlamellen,
  Lichtlinien, Wallboxen); offene Rampe in der Zufahrt nach GaStellV (Profil in `src/haus/30-rampe-tg.js`), das letzte Stück unter dem
  Poolhaus. Kein Garagenhaus, kein Autoaufzug.
- Autos: Ferrari F8 rot, Cayenne Coupé anthrazit, V-Klasse schwarz – eigene Modelle, **ohne Logos, Schriftzüge oder Marken**.
- Garten: Zaun zur Straße durchgehend, höchstens 1,60 m samt Pfeilern, Hecke dahinter; hohe Seitenhecken; Hecken an der Rampe; Spielturm
  im Vorgarten; Poolhaus mit Walmdach, Veranda und Glas-Schiebewand; Außenmöbel schwarzes Metall ohne Holz; Liegen nur am Pool.
- Optik fotorealistisch, kein Comic (Laub als Blattkarten, GTAO, AgX); Rendern nur bei Änderungen.
- Nicht Teil dieser Studie und nicht erneut vorschlagen: die Anforderungen an Mittelgaragen (Schleuse, zweiter Ausgang).
- Offen, klärt der Bauherr mit Architektin und Gemeinde: Dach und Zwerchhäuser gegen Ortsgestaltungssatzung § 5, Wandhöhe des Poolhauses
  (§ 6), Stahl als Zaunmaterial (§ 9 Abs. 3), wo die Rampe beginnen darf.

## Hilfsagenten und Arbeitskopien

- Unabhängige Teilaufgaben parallel, je Agent eigene Dateien; an derselben Datei nacheinander.
- In einer Arbeitskopie (`.claude/worktrees/…`) zuerst `./vg helfer start`: holt den aktuellen Stand von main und nimmt
  `docs/index.html` aus den Commits (die Seite wird erst nach dem Zusammenführen auf main gebaut).
- Am Ende auf dem eigenen Zweig committen, nicht pushen und nicht zusammenführen. Große Dateien in mehreren kleinen Schritten schreiben.
- Zusammenführen auf main: `git merge --no-edit <zweig>` je Helfer (für `docs/index.html` gilt automatisch die Fassung von main),
  dann `./vg pruefen` und die neu gebaute Seite committen.

## Veröffentlichen

- Auf main committen, wenn `./vg pruefen` grün ist, dann pushen (Anmeldung über den Windows-Anmeldespeicher). `./vg live` im Hintergrund
  starten, nicht aktiv warten.
- Die private Claude-Ansicht („Forever Home Grünwald“, mit `Artifact list` zu finden) aus `dist/artifact.html` neu veröffentlichen.
- Keine Zugangsdaten in Dateien. Downloads (z. B. fertige 3D-Modelle) nur nach ausdrücklichem OK mit Dateiname, Quelle und Größe.
