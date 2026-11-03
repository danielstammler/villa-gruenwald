# Forever Home Grünwald

Maßstäbliche Konzeptstudie für den Neubau an der Ebertstraße 14 in Grünwald: 3D-Modell mit Sonnenstand, Ansichten und Schnitt sowie ein vollständiger Lageplan.

**Ansehen:** https://danielstammler.github.io/villa-gruenwald/ (oder `docs/index.html` im Browser öffnen; braucht Internet für three.js und die Schriften).

## Ansichten

| Bereich | Inhalt |
| --- | --- |
| 3D-Modell | Haus, Grundstück, Nachbarhäuser, Bäume. Blick Garten, Eingang, Ost, West, Vogel, Draufsicht und orthogonale Frontansicht mit Maßstab. Sonnenstand für jedes Datum und jede Uhrzeit mit Schatten, Tagesverlauf als Animation, Nachtansicht. Ebenen für Baurecht-Höhen, Tiefgarage und Keller, Schnitt durchs Haus. |
| Ansichten & Schnitt | Süd, Nord, Ost, West und Schnitt A–A im Maßstab, mit Maßketten, Höhenkoten und den Baurecht-Grenzen. |
| Grundrisse | Vorschlag für UG mit Tiefgarage und Rampe, EG mit Backkitchen, OG mit Elternsuite und Balkon, DG mit Dachschrägen; Personenaufzug vom UG bis ins DG, Raumflächen und Wohnfläche. |
| Lageplan | Konzept, Tiefgarage, Bäume mit Wurzelschutzbereichen, Grenzlängen, Grenzabstände, 5-m-Linie, Nachbarschaft aus der Flurkarte, Abstandsflächen (überschlägig), Vergleich mit der Vogel-Skizze, Bestand. Flächenbilanz. |
| Kennzahlen & Hinweise | Auffälligkeiten, Kennzahlen, was übernommen und was angenommen ist, Quellen. |

## Grundlagen

- Konzept EG mit TG, Chaline Deutsch, 28.10.2026, M 1:100: Grundstück, Haus 16,00 × 11,65 m, Fensterachsen Süd, Freisitz, Terrasse, Podest, Zuwegung, Zufahrt, Pool, Poolhaus, Tiefgarage.
- Skizze Baurecht, Vogel+Partner Architekten, 30.10.2026, M 1:500: Wandhöhe 7,25 m, Firsthöhe 11,12 m, Bäume, Abstandsflächen-Ansatz.
- Flurkarte BayernAtlas, © Bayerische Vermessungsverwaltung 2026: Nachbarhäuser, Grenzen, Straße.
- 3D-Gebäudemodell LoD2, Kachel 688_5324, © Bayerische Vermessungsverwaltung 2026, CC BY 4.0: Dachformen und Höhen der Nachbarhäuser (`src/lod2.js`, auf die Flurkarte eingepasst, mittlere Abweichung 0,55 m).
- Rendering als Gestaltungsvorlage für Fassade und Dach.

Die Pläne selbst liegen nicht im Repo, nur die daraus gemessenen Koordinaten (`src/data.js`). Geschosshöhen, Dachneigungen sowie Nord-, Ost- und Westfassade sind Annahmen. Überschlägige Rekonstruktion ohne Gewähr; baurechtliche Fragen klärt der Architekt.

## Aufbau

- `src/` – Quelltext: `data.js` (Geometrie in Metern), `house.js` (parametrisches Haus), `view3d.js` (three.js), `elevation.js` (Ansichten), `siteplan.js` (Lageplan), `sun.js` (Sonnenstand nach NOAA), `main.js`, `style.css`, `page.html`.
- `build.py` – baut daraus `docs/index.html` (eine Datei, alles eingebettet).

```bash
python3 build.py
```
