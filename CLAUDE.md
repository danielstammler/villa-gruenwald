# Villa Grünwald – Konzeptstudie

Interaktive Konzeptstudie „Forever Home Grünwald“ (Ebertstraße 14): 3D-Modell (three.js r170), Ansichten und Schnitte, Grundrisse,
Lageplan und Datenblatt in einer einzigen HTML-Seite, gebaut aus `src/`, live auf GitHub Pages (öffentliches Repo, nichts Privates
hineinschreiben). Bauherr ist Daniel. Antworten, Code-Kommentare und Commit-Nachrichten auf Deutsch; Code im Stil der Umgebung
(kompakt, dichte Einzeiler-Kommentare mit dem Warum).

## Zusammenarbeit

- Der Bauherr bedient selbst kein Terminal und kein WSL: alle Befehle führt der Assistent aus, Schritte für ihn nur über die
  Windows-Oberfläche oder den Browser.
- Änderungen ohne Rückfrage bis live bringen (prüfen, committen, pushen, `./vg live`, Claude-Ansicht neu veröffentlichen). Gestaltung
  entscheidet er: Funde und Vorschläge melden, nicht ungefragt umbauen.
- Viele Wünsche auf einmal: unabhängige Teile parallel an Hilfsagenten geben (siehe unten), Fortschritt kurz melden.
- Sitzungsbeginn: `git status` und `./vg pruefen schnell`; die private Notiz lesen (Pfad unter „Veröffentlichen“).

## Befehle

Alles über `./vg` im Repo (aus Git Bash startet es sich selbst in WSL neu; Node, Python und Chrome gibt es nur in WSL; `./vg` allein
zeigt die Übersicht):

- `./vg bauen` – baut `docs/index.html` (Pages) und `dist/artifact.html` (Claude-Ansicht). `OHNE_AUTOS=1 ./vg bauen` ohne Automodelle.
- `./vg pruefen schnell` – Bau, Zeichnungen, Regeln, Wege der Rundgänge und Anker der 3D-Ansichten in etwa 1 s: nach jeder Änderung.
- `./vg pruefen` – zuerst das Billige (dazu Zeichnungen gegen die Referenz), dann 3D, zusammen 1–1½ min: Rundgänge wie beim Gehen (bekannte
  Kontakte in `tools/erwartet.json`), Prüfsumme der Szene, 25 Ansichten (`tools/ansichten.json`) im Bildvergleich. Geänderte Bilder als
  vorher | nachher in `tools/shots/vergleich/`, alle klein in `tools/shots/uebersicht.png`. Vor jedem Commit; Änderungen allein sind kein
  Fehler, nur Bau, NaN, Regeln, Wege, unerwartete Kontakte und Bildfehler.
- `./vg abnehmen` – nach gewollten Änderungen wird der Stand Referenz (`tools/shots/referenz/`, je Arbeitskopie; der erste `./vg pruefen`
  legt sie an).
- Für Grundrissarbeit: `./vg raumbuch [UG|EG|OG|DG]` (Räume mit Maßen, Türen, Fenstern als Text), `./vg plan [EG …]` (Grundrisse in 2 s als
  PNG `tools/shots/plan-EG.png`, bei Abweichung vorher | nachher), `./vg wege` (Rundgänge in 0,3 s; `./vg wege bild OG` zeichnet die Wege
  in den Grundriss), `./vg regeln -v` (alle Regeln mit Werten).
- `./vg bild halle buero` – einzelne Ansichten mit Vergleich; `./vg bild test "pos=x,y,z&tgt=x,y,z[&level=EG]"`, `"cam=ost"`, `"level=OG"`;
  `./vg bild` listet die Ansichten. Neue Ansicht: Eintrag in `tools/ansichten.json`, innen immer verankert (`raum`/`blick` oder `anker`,
  Formate in `tools/lib/anker.js`), dann `./vg bild <name>` und `./vg abnehmen`.
- `./vg rundgang [garage] [5]` – Rundgänge im 3D prüfen (`VG_ROH=1` zeigt alle Treffer); `./vg houseshot …` – alte Aufrufe (Bild, `probe`,
  `fingerprint`), laufen über `tools/browser.js` (eigener Server und Chrome je Lauf, kein Port nötig).
- `./vg helfer start` – für Hilfsagenten in einer Arbeitskopie (siehe unten). `./vg live` – wartet im Hintergrund, bis Pages HEAD ausliefert.

## Arbeitsweise: schnell und trotzdem gründlich

- Erst prüfen lassen, dann gezielt hinschauen. Die Prüfungen geben je Bereich eine Zeile aus, Einzelheiten nur bei Fehlern.
- Bilder sparsam: nur Ansichten ansehen, die sich geändert haben, und als Ausschnitt statt als Vollbild.
- Große Dateien nie ganz lesen: `docs/index.html` und `dist/artifact.html` (erzeugt, über 600 KB), `src/lod2.js` und `src/data.js`
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
  75 Wege der Rundgänge aus dem Grundriss (`weg`) · 78 Ziele der Rundgänge `TOURS` (`{ raum, label, bei, wait, look }`,
  `{ treppe: 'hoch' }`, `{ rein: 'N' }`, `{ raus: 'S' }`, draußen feste Punkte) · 80 Kamera und Abfahren der Rundgänge ·
  90 Bildaufbau, Schleife, Türen, Schnittstelle (`_view`, `_frame`, `_probe`, `_fingerprint`).
- `tools/regeln.js` – Maßregeln (GaStellV, BayBO, DIN 18065, Ortsgestaltungssatzung, Grundriss, Möbel); gefundene Verstöße, über die der
  Bauherr noch entscheidet, stehen in `GEMELDET` (halten die Prüfung grün, eine neue Fundstelle nicht). `tools/lib/grundriss.js` wertet
  Räume, Türen, Fenster, Treppe und Aufzug aus (für Regeln und Raumbuch).
- `src/cars.js` und `src/car-*.js` – Autos aus einem Baukasten; `tools/carcheck.js`, `tools/carstudio.html`, `tools/carshot.sh`.
- `src/main.js` – Seite und Reiter; `src/seite/` – Seitentext je Reiter; `src/style.css`.
- Koordinaten: Plan x = Ost, y = Nord (Straße im Süden, y negativ; Hauseingang im Norden bei y ≈ 0). 3D: X = Plan-x, Y = Höhe,
  Z = −Plan-y. Höhen in `HOUSE.Z`: FFB UG −3,40, EG 0,20, OG 3,55, DG 6,65.

## Grundrisse, Treppe und Eingang ändern (kommt sehr oft vor)

- Wo: Räume, Türen, Öffnungen und Möbel je Geschoss in `src/plan/10-ug.js` … `40-dg.js`. Räume sind lichte Rechtecke `r: [x0, x1, y0, y1]`
  (plus `ext`-Rechtecke, die sich berühren oder über `open` verbunden sein müssen, sonst ist ein Teil abgemauert), Wände sind der Spalt
  dazwischen (innen meist 0,24 m), Durchgänge ohne Tür stehen in `open`. Türen `{ x, y, w, o, s, h }`: `o: 'h'` in einer Ost-West-Wand
  mit x = Westende der Öffnung und y = Wandmitte, `o: 'v'` in einer Nord-Süd-Wand mit x = Wandmitte und y = Südende; `w` Breite,
  `s: 1` schlägt nach Norden bzw. Osten auf (`-1` nach Süden bzw. Westen), `h: 1` Band am Ost- bzw. Nordende, `t` Wanddicke der Zeichnung.
  Treppe, Aufzug und Luftraum: `src/plan/00-kern.js` (`LINE`, `FLIGHTS`, `HOLES`, `LIFT`, `VOID`). Haustür und alle Fassadenöffnungen:
  `src/haus/10-fassaden.js`; Podest, Terrasse, Balkone: `src/haus/20-anbauten.js`.
- Was automatisch folgt: 3D-Innenausbau (Wände, Böden, Türen, Treppe, Möbel über `Plans.items`), Schnitt A–A, Wohnfläche und
  Raumtabelle, die Rundgänge (Wege durch Türen und über die Treppe werden aus dem Grundriss berechnet), die Innenansichten der
  Prüfung (am Raum verankert) und alle Zahlen im Seitentext (`{{ … }}`). Nur Prosa über Räume bleibt Handarbeit.
- Ablauf: ändern → `./vg pruefen schnell` (Regeln finden Überlappungen, unerreichbare Räume, Türschwenks, Möbel in Wänden, fehlende
  Fenster, Treppe und Kopfhöhe; `Wege` prüft die Rundgänge; der Bau bricht ab, wenn der Seitentext einen fehlenden Raum nennt) →
  `./vg raumbuch <Geschoss>` (Raumtabelle als Text) → `./vg plan <Geschoss>` (Bild, bei Änderung vorher | nachher; die Wege zeichnet
  `./vg wege bild <Geschoss>` ein, ohne Vergleich) → `./vg pruefen` (3D) → nur die geänderten Ansichten ansehen → `./vg abnehmen` →
  committen.
- Prosa über Räume in `src/seite/*.html` bekommt daneben die unsichtbare Prüfung `{{ W.da('OG', 'Bad West', …) }}`; Anzahlen und
  Flächen kommen aus `W.raeume`/`W.spanne` (src/werte.js).

## Gestaltungsregeln des Bauherrn (gelten, bis er sie ändert; Neueres geht vor)

- Quellen: Haus und Zufahrt nur nach Chalines Konzept (M 1:100). Vogel+Partner nur für Grundstück und Nachbarbebauung, keine
  Abstandsflächen und keine Baurecht-Linien. Pläne, PDFs und Fotos nicht ins Repo, nur daraus gemessene Koordinaten.
- Fassade nach seinem Referenzbild: weißer Glattputz, schwarze Rahmen, steiles Mansarddach (~70°/9°); Süden Zwerchhaus in der Flucht mit
  DG-Balkon nach vorn, daneben nur Dachfenster; Norden ebenfalls Zwerchhaus; vorne zwei quadratische Pfeiler außen.
- Alle Fenster mit senkrechter Mittelsprosse; Türen bis 1,10 m einflügelig mit aufgesetzter Sprosse, breitere zweiflügelig; eine
  einflügelige Haustür mit Seitenteilen, Vordach und Laterne.
- Halle zweigeschossig; Treppe gerade quer an der Rückwand (drei Läufe nach Westen, Geländer offen mit schwarzen Stäben), man schaut beim
  Hereinkommen darauf; Personenaufzug versteckt am Westpodest mit wandbündigen Türen.
- UG: Gym im Westen mit Sportboden und Lichthof, Foyer mittig mit offenem Zugang zur Tiefgarage (ohne Glaswände), Technik, Abstellraum.
  EG: kein Arbeitszimmer; Küche L-förmig mit kleinem Esstisch, Backkitchen, Gäste-WC, keine Barhocker an der Insel. OG: kein Wohnzimmer,
  vier Kinderzimmer, zwei Bäder mit Wanne (je zwei Kinder teilen eins). DG: Büro vorn mittig, Schlafzimmer mit Ankleide und großem Bad
  en suite (Flur → Schlafzimmer → Ankleide → Bad), im Osten Gäste und Abstellraum (vom Assistenten gesetzt, anpassbar).
- Materialien: Kalkstein in der Halle, Fliesen in den Bädern; Dach- und Gaubenfenster durchsichtig. Terrasse durchgehend vorne mit Lounge
  in der Mitte (nicht um die Säule), Freisitz mit Esstisch, Balkon über der Terrasse; Tiefgarage reicht unter die Terrasse.
- Tiefgarage 2,70 m lichte Höhe auf Höhe UG, drei Stellplätze, Fahrräder halb hochgestellt, Sektionaltor, schön (Eichenlamellen,
  Lichtlinien, Wallboxen); offene Rampe in der Zufahrt nach GaStellV (Profil in `src/haus/30-rampe-tg.js`), das letzte Stück unter dem
  Poolhaus. Kein Garagenhaus, kein Autoaufzug.
- Autos: Ferrari F8 rot, Cayenne Coupé anthrazit, V-Klasse schwarz – eigene Modelle, **ohne Logos, Schriftzüge oder Marken**.
- Garten: Zaun zur Straße durchgehend, höchstens 1,60 m samt Pfeilern, Hecke dahinter; hohe Seitenhecken; Hecken an der Rampe; Spielturm
  im Vorgarten; Poolhaus mit Walmdach, Veranda und Glas-Schiebewand; Außenmöbel schwarzes Metall ohne Holz; Liegen nur am Pool.
- Umgebung nach seinen Luftbildern: dichte Nachbarbäume, Nachbarhäuser alle EG + Dachgeschoss (LoD2), Haus 8 mit rotem Dach, Ziegelmauer
  an der Straßenecke im Südosten. Ansichten zeigen UG und Tiefgarage unter dem Gelände.
- Rundgänge (`TOURS`) in Augenhöhe wie ein Mensch: ankommen (Straße bis in den Pool), garage (Gartentür an der Straße, Rampe, Tor,
  Tiefgarage, Foyer, Treppe bis zum DG-Balkon), eg, garten; Türen und Tore öffnen sich unterwegs.
- Optik fotorealistisch, kein Comic (Laub als Blattkarten, GTAO, MSAA, AgX); Rendern nur bei Änderungen; Overlays wie Grenze und
  Schutzkreise im 3D standardmäßig aus.
- Nicht Teil dieser Studie und nicht erneut vorschlagen: die Anforderungen an Mittelgaragen (Schleuse, zweiter Ausgang).
- Offen, klärt der Bauherr mit Architektin und Gemeinde: Dach und Zwerchhäuser gegen Ortsgestaltungssatzung § 5, Wandhöhe des Poolhauses
  (§ 6), Stahl als Zaunmaterial (§ 9 Abs. 3), wo die Rampe beginnen darf.
- Von den Regeln gefunden, Entscheidung des Bauherrn offen (`GEMELDET` in `tools/regeln.js`, gemeldet 5.11.2026): Kopfhöhe über der
  Treppe 1,86–1,88 m, Balkonschwellen OG ohne Rinne, Fensterfläche DG Schlafzimmer und Gäste unter ⅛, OG-Nordfenster vor einer
  Innenwand, drei Regale im Türschwenk. Nach seiner Entscheidung beheben und dort austragen.

## Technische Stolpersteine

- Kamerapositionen gegen Nachbarhäuser (LoD2), Baumkronen und Hecken prüfen: Ost, West und Schnitt waren schon verdeckt; die Westhecke
  steht nur 3 m vor dem Haus, der Flügel der Haustür schwingt direkt in die Halle.
- Geschossblick in UG/TG: globale Schnittebenen gelten nicht für Schatten, Bauteile über dem Schnitt brauchen eigene Schnittebenen mit
  `clipShadows`.
- Das Modell rendert nur bei Änderungen: Bilder im Browser-Panel brauchen oft einen zweiten Versuch; headless treibt `_frame(n)` die
  Schleife von Hand, `_step(sek)` lässt einen Rundgang ohne Bildschirm weiterlaufen.
- Räume im Grundriss können zusätzliche `ext`-Rechtecke haben; Autos: Front bei x = 0, Lenkrad links = +z im Auto-Koordinatensystem.
- Zufall im 3D nur über eigene Folgen je Bereich: `const rnd = zufall('hecke west')` (00-kern.js, Startwerte in `ZUFALL`). So ändert ein
  zusätzlicher Busch nur seinen Bereich. Einen Schlüssel umbenennen heißt neues Aussehen dieses Bereichs; neue Bäume in `SITE.trees` und
  neue Buchskugeln einer Gruppe hinten anfügen (Form hängt von der Reihenfolge ab). Kein `Math.random` im Modell.
- three.js würfelt das Rauschen der Umgebungsverdeckung (GTAO) bei jedem Laden mit `Math.random` neu: gleiche Bilder nur mit festem
  Zufall in Chrome (`--js-flags=--random-seed=4711`, so in den Prüfwerkzeugen).

## Hilfsagenten und Arbeitskopien

- Unabhängige Teilaufgaben parallel, je Agent eigene Dateien; an derselben Datei nacheinander.
- In einer Arbeitskopie (`.claude/worktrees/…`) zuerst `./vg helfer start` (aus Git Bash; Git in WSL kann Arbeitskopien nicht lesen):
  holt den aktuellen Stand von main (`git merge --ff-only main`, scheitert bei eigenen Commits, dann von Hand zusammenführen) und nimmt
  `docs/index.html` aus den Commits (die Seite wird erst nach dem Zusammenführen auf main gebaut). Dann einmal `./vg pruefen`, bevor etwas geändert wird: das legt die eigene Referenz an.
- Am Ende auf dem eigenen Zweig committen, nicht pushen und nicht zusammenführen. Große Dateien in mehreren kleinen Schritten schreiben.
- Zusammenführen auf main: `git merge --no-edit <zweig>` je Helfer (für `docs/index.html` gilt automatisch die Fassung von main),
  dann `./vg pruefen`, die geänderten Ansichten ansehen, nach gewollten Änderungen `./vg abnehmen` und die neu gebaute Seite committen.

## Veröffentlichen

- Auf main committen, wenn `./vg pruefen` grün ist, dann pushen (Anmeldung über den Windows-Anmeldespeicher). `./vg live` im Hintergrund
  starten, nicht aktiv warten.
- Die private Claude-Ansicht („Forever Home Grünwald“, mit `Artifact list` zu finden) aus `dist/artifact.html` neu veröffentlichen.
  Private Notizen des Assistenten (Links, Lage, offene Fragen an den Bauherrn) liegen außerhalb des Repos in
  `C:\Users\Daniel\.claude\projects\C--Users-Daniel\memory\villa-gruenwald-repo.md`; im selben Ordner allgemeine Notizen (Parallelarbeit,
  Chrome headless, GitHub-Anmeldung), Übersicht in `MEMORY.md`.
- Keine Zugangsdaten in Dateien. Downloads (z. B. fertige 3D-Modelle) nur nach ausdrücklichem OK mit Dateiname, Quelle und Größe.
