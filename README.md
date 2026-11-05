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

- `src/` – Quelltext. Ordner sind Teildateien einer Datei, nach Namen sortiert zusammengesetzt: `haus/` (parametrisches Haus, Rampe, Tiefgarage, Garten), `plan/` (Grundrisse), `ansicht/` (Ansichten und Schnitte), `seite/` (Seitentext je Reiter; Maße darin als `{{ … }}` aus den Daten, Hilfen in `werte.js`), `view3d/` (3D-Modell in Bereichsdateien; Wege der Rundgänge aus dem Grundriss in `75-wege.js` und `78-rundgaenge.js`). Dazu `data.js` (Geometrie in Metern), `lod2.js` (Nachbarhäuser), `siteplan.js` (Lageplan), `sun.js` (Sonnenstand nach NOAA), `cars.js` und `car-*.js` (Autos aus einem Baukasten, ohne Marken), `main.js`, `style.css`.
- `tools/bauen.js` – baut daraus `docs/index.html` (eine Datei, alles eingebettet) und `dist/artifact.html`.
- Prüfungen ohne Browser-Fenster: `tools/check.js` (alle Zeichnungen), `tools/regeln.js` (Maßregeln nach GaStellV, BayBO, DIN 18065, Ortsgestaltungssatzung Grünwald, dazu Grundriss und Möbel), `tools/raumbuch.js` (Räume als Text), `tools/wege.js` (Rundgänge); im 3D über `tools/browser.js` (Chrome headless): Rundgänge wie beim Gehen, Prüfsumme der Szene und 25 Ansichten im Bildvergleich mit einer lokalen Referenz.
- `./vg` ist der Einstieg für alles, aus Git Bash wie aus WSL; Befehle und Arbeitsweise stehen in `CLAUDE.md`.

```bash
./vg bauen
OHNE_AUTOS=1 ./vg bauen   # mit einfachen Ersatzformen statt der Modelle aus src/car-*.js
./vg pruefen schnell      # Bau, Zeichnungen, Regeln, Wege – etwa 1 s
./vg pruefen              # dazu 3D mit Bildvergleich – 1 bis 1½ min
```
