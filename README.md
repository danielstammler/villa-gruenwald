# Forever Home Grünwald

Maßstäbliche Konzeptstudie für den Neubau an der Ebertstraße 14 in Grünwald: 3D-Modell mit Sonnenstand, Ansichten und Schnitte, Grundrisse sowie ein vollständiger Lageplan.

**Ansehen:** https://danielstammler.github.io/villa-gruenwald/ (oder `docs/index.html` im Browser öffnen; braucht Internet für three.js und die Schriften).

## Ansichten

| Bereich | Inhalt |
| --- | --- |
| 3D-Modell | Haus mit eingerichteten Innenräumen, Grundstück, Nachbarhäuser mit Fenstern und Ziegeldächern, Laubbäume, Hecken und Beete, offene Rampe zur Tiefgarage. Fotorealistisches Licht mit weichen Schatten, Umgebungsverdeckung und Wolken. Blick Garten, Eingang, Ost, West, Überblick, Draufsicht und orthogonale Frontansicht mit Maßstab. Sonnenstand für jedes Datum und jede Uhrzeit mit Schatten, Tagesverlauf als Animation, Nachtansicht. Ebenen für Tiefgarage und Keller, Schnitt durchs Haus. Jedes Geschoss einzeln von oben (UG mit Tiefgarage, Autos und Fahrrädern), Innenblick und Hineinzoomen durch Fenster und Türen. |
| Ansichten & Schnitt | Süd, Nord, Ost, West, Schnitt A–A durchs Haus und Längsschnitt der Rampe im Maßstab, mit Maßketten und Höhenkoten. |
| Grundrisse | Vorschlag für UG mit Tiefgarage und Rampe, EG mit Backkitchen, OG mit vier Kinderzimmern und Balkon, DG mit Büro, Elternbereich und Balkon; Personenaufzug vom UG bis ins DG, Raumflächen und Wohnfläche. |
| Lageplan | Konzept mit offener Rampe, Tiefgarage, Bäume mit Wurzelschutzbereichen, Grenzlängen, Grenzabstände, 5-m-Linie, Nachbarschaft aus der Flurkarte. Flächenbilanz. |
| Kennzahlen & Hinweise | Auffälligkeiten, Kennzahlen, was übernommen und was angenommen ist, Quellen. |

## Grundlagen

- Konzept EG mit TG, Chaline Deutsch, 28.10.2026, M 1:100: Haus 16,00 × 11,65 m und seine Lage, Fensterachsen Süd, Freisitz, Terrasse, Podest, Zuwegung, Zufahrt, Pool, Poolhaus, Tiefgarage, 5-m-Linie. Haus und Zufahrt kommen nur von hier.
- Skizze Vogel+Partner Architekten, 30.10.2026, M 1:500: nur Grundstück, Bäume und Nachbarbebauung.
- Flurkarte BayernAtlas, © Bayerische Vermessungsverwaltung 2026: Nachbarhäuser, Grenzen, Straße.
- 3D-Gebäudemodell LoD2, Kachel 688_5324, © Bayerische Vermessungsverwaltung 2026, CC BY 4.0: Dachformen und Höhen der Nachbarhäuser (`src/lod2.js`, auf die Flurkarte eingepasst, mittlere Abweichung 0,55 m).
- Rendering als Gestaltungsvorlage für Fassade und Dach; Wandhöhe 7,25 m und First 11,12 m nach seinen Proportionen. Ein Referenzbild für Putz, Rahmen und Details.
- Luftbilder der Umgebung: Dachfarben und Bäume der Nachbarn, Ziegelmauer an der Straßenecke.

Die Pläne selbst liegen nicht im Repo, nur die daraus gemessenen Koordinaten (`src/data.js`). Geschosshöhen, Dachneigungen, Nord-, Ost- und Westfassade sowie das Längsprofil der Rampe (oben und unten 8 %, dazwischen 16 %, unter dem Poolhaus gut 2 m lichte Höhe) sind Annahmen. Überschlägige Rekonstruktion ohne Gewähr; baurechtliche Fragen klärt der Architekt.

## Aufbau

- `src/` – Quelltext: `data.js` (Geometrie in Metern), `house.js` (parametrisches Haus und Rampe), `view3d.js` (three.js), `elevation.js` (Ansichten und Schnitte), `floorplan.js` (Grundrisse), `siteplan.js` (Lageplan), `sun.js` (Sonnenstand nach NOAA), `main.js`, `style.css`, `page.html`.
- `build.py` – baut daraus `docs/index.html` (eine Datei, alles eingebettet).

```bash
python3 build.py
```
