# Forever Home Grünwald

Maßstäbliche Konzeptstudie für den Neubau an der Ebertstraße 14 in Grünwald: 3D-Modell mit Sonnenstand, Ansichten und Schnitte, Grundrisse sowie ein vollständiger Lageplan.

**Ansehen:** https://danielstammler.github.io/villa-gruenwald/ (oder `docs/index.html` im Browser öffnen; braucht Internet für three.js und die Schriften).

## Ansichten

| Bereich | Inhalt |
| --- | --- |
| 3D-Modell | Haus mit eingerichteten Innenräumen, Grundstück, Nachbarhäuser mit Fenstern und Ziegeldächern, Laubbäume, Hecken und Beete, Spielturm mit Rutsche und Schaukel im Vorgarten, Lichthof vor dem Gym, offene Rampe zur Tiefgarage. Fotorealistisches Licht mit weichen Schatten, Umgebungsverdeckung und Wolken. Blick Garten, Eingang, Ost, West, Überblick, Draufsicht und orthogonale Frontansicht mit Maßstab. Sonnenstand für jedes Datum und jede Uhrzeit mit Schatten, Tagesverlauf als Animation, Nachtansicht. Ebenen für Tiefgarage und Keller, Schnitt durchs Haus. Jedes Geschoss einzeln von oben (UG mit Tiefgarage, den drei Autos und Fahrrädern), Innenblick und Hineinzoomen durch Fenster und Türen. Rundgänge in Augenhöhe (Ankommen bis in den Pool, vom Garteneingang über die Rampe und die Tiefgarage bis zum DG-Balkon, Erdgeschoss, Garten und Poolhaus), Türen und Tore öffnen sich dabei; Doppeltippen zum Heranfliegen, WASD und Pfeiltasten zum Gehen. Durchgehende Terrasse, Poolterrasse, Poolhaus mit Walmdach, offener Glasfront und Veranda, Zaun mit Toren an der Straße. Zoomen auch mit + und − (Knöpfe im Bild und Tasten). |
| Ansichten & Schnitt | Süd, Nord, Ost, West mit Untergeschoss und Tiefgarage unter dem Gelände, Schnitt A–A durchs Haus und Längsschnitt der Rampe im Maßstab, mit Maßketten und Höhenkoten. |
| Grundrisse | Vorschlag für UG mit Tiefgarage (2,70 m lichte Höhe) und Rampe, Eingang von der Tiefgarage mittig ins Foyer, Gym mit Sportboden und Lichthof, Sauna, Technik und Abstellraum; EG mit zweigeschossiger Halle, quer liegender gerader Treppe, Gäste-WC, Backkitchen und Küchentisch; Aufzug am Treppenpodest; OG mit vier großen Kinderzimmern, zwei Bädern mit Wanne und Balkon; DG mit Büro vorn in der Mitte, Elternsuite (Schlafzimmer, Ankleide, Bad en suite), Gästezimmer und Balkon auf Pfeilern; Raumflächen und Wohnfläche. |
| Lageplan | Konzept mit offener Rampe, Tiefgarage, Bäume mit Wurzelschutzbereichen, Grenzlängen, Grenzabstände, 5-m-Linie, Nachbarschaft aus der Flurkarte. Flächenbilanz. |
| Kennzahlen & Hinweise | Auffälligkeiten, Kennzahlen, was übernommen und was angenommen ist, Quellen. |

## Grundlagen

- Konzept EG mit TG, Chaline Deutsch, 28.10.2026, M 1:100: Haus 16,00 × 11,65 m und seine Lage, Fensterachsen Süd, Freisitz, Terrasse, Podest, Zuwegung, Zufahrt, Pool, Poolhaus, Tiefgarage, 5-m-Linie. Haus und Zufahrt kommen nur von hier.
- Skizze Vogel+Partner Architekten, 30.10.2026, M 1:500: nur Grundstück, Bäume und Nachbarbebauung.
- Flurkarte BayernAtlas, © Bayerische Vermessungsverwaltung 2026: Nachbarhäuser, Grenzen, Straße.
- 3D-Gebäudemodell LoD2, Kachel 688_5324, © Bayerische Vermessungsverwaltung 2026, CC BY 4.0: Dachformen und Höhen der Nachbarhäuser (`src/lod2.js`, auf die Flurkarte eingepasst, mittlere Abweichung 0,55 m).
- Rendering als Gestaltungsvorlage für Fassade und Dach; Wandhöhe 7,25 m und First 11,12 m nach seinen Proportionen. Ein Referenzbild für Putz, Rahmen und Details.
- Luftbilder der Umgebung: Dachfarben und Bäume der Nachbarn, Ziegelmauer an der Straßenecke.

Die Pläne selbst liegen nicht im Repo, nur die daraus gemessenen Koordinaten (`src/data.js`). Geschosshöhen, Dachneigungen, Nord-, Ost- und Westfassade sowie das Längsprofil der Rampe (3,00 m Vorplatz mit 4 %, 15 %, unten 2,77 m mit 7,5 % und 0,40 m eben vor dem Sektionaltor; unter dem Poolhaus 2,05 m lichte Höhe) sind Annahmen. Überschlägige Rekonstruktion ohne Gewähr; baurechtliche Fragen klärt der Architekt.

## Aufbau

- `src/` – Quelltext: `data.js` (Geometrie in Metern), `house.js` (parametrisches Haus und Rampe), `view3d/` (three.js), `elevation.js` (Ansichten und Schnitte), `floorplan.js` (Grundrisse), `siteplan.js` (Lageplan), `sun.js` (Sonnenstand nach NOAA), `main.js`, `style.css`, `page.html`.
- `src/view3d/` – das 3D-Modell in Bereichsdateien, damit mehrere daran gleichzeitig arbeiten können: `00-kern.js` (Zustand, Hilfsfunktionen, Materialien), `10-huelle.js`, `20-innenausbau.js`, `30-laub.js`, `35-lichthof.js`, `40-tiefgarage.js`, `50-garten.js`, `55-spielplatz.js`, `60-gelaende.js`, `70-licht.js`, `80-steuerung.js` (Kamera, Rundgänge, Tasten), `90-bild.js`. Die Dateien sind Ausschnitte eines gemeinsamen Blocks; `build.py` setzt sie nach Namen sortiert zusammen. Änderungen am Kern besser nacheinander.
- `build.py` – baut daraus `docs/index.html` (eine Datei, alles eingebettet).
- `tools/check.js` – rendert alle Ansichten, Grundrisse und den Lageplan ohne Browser und meldet fehlerhafte Werte (`node tools/check.js`).
- `src/cars.js` – Baukasten für die Autos (Karosserie aus Querschnitten, Räder, Leuchten), je Modell eine Datei `src/car-*.js`; `tools/carcheck.js` prüft ein Modell ohne Browser, `tools/carstudio.html` zeigt es aus sechs Richtungen.
- Bilder ohne Browser-Fenster (Chrome headless, auch mehrere gleichzeitig; braucht den lokalen Server auf Port 8766 im Repo, den die Skripte notfalls selbst starten): `tools/carshot.sh <auto> [ansicht]` für ein Auto, `tools/houseshot.sh <name> "pos=x,y,z&tgt=x,y,z[&level=UG]"` für das fertige Modell und `tools/houseshot.sh probe <rundgang>` für die Kollisionsprüfung eines Rundgangs. Die Bilder landen in `tools/shots/` (nicht im Git).

```bash
python3 build.py
OHNE_AUTOS=1 python3 build.py   # mit den einfachen Ersatzformen statt der Modelle aus src/car-*.js
```
