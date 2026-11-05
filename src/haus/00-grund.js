// Parametrisches Hausmodell in Metern.
// Grundriss, Fensterachsen Süd, Freisitz, Terrasse und Podest: Konzeptplan Chaline Deutsch (M 1:100).
// Wandhöhe 7,25 m und Firsthöhe 11,12 m: Proportionen des Renderings (Hausbreite 16,00 m als Maßstab). Gliederung der Fassade: Rendering
// und Daniels Referenzbild (weißer Glattputz, schwarze Rahmen, Zwerchhaus mit Balkon, eckige Pfeiler, Kamine).
// Alles andere (Geschosshöhen, Dachneigungen, Nord-/Ost-/Westfassade) ist eine plausible Annahme.
// Teile in src/haus/, von tools/bauen.js nach Namen sortiert zu einer Datei zusammengesetzt: 00 Grundmaße, Höhen, Dach und Helfer,
// 10 Fassaden mit allen Öffnungen, 20 Freisitz, Terrasse, Podest, Balkone, Kamine, 30 Rampe und Tiefgarage, 40 Pool, Poolhaus, Zaun,
// Lichthof und Rückgabe, 50 Garten (Hecken, Spielplatz).
const HOUSE = (() => {
  const W = 16.0, D = 11.65, wall = 0.36;
  // deckeSpitz: Unterseite der flachen Decke im DG (lichte Höhe 2,60 m), darüber der Spitzboden
  const Z = {
    ffbUG: -3.4, gelaende: 0, sockel: 0.2, ffbEG: 0.2, gurtU: 3.2, gurtO: 3.45, ffbOG: 3.55,
    sturzOG: 6.05, deckeDG: 6.3, ffbDG: 6.65, gesimsU: 6.55, gesimsO: 6.83, wand: 7.25, deckeSpitz: 9.25, knick: 10.35, first: 11.12,
  };
  // Klassisches Mansarddach wie im Rendering: unten steil (~70°), oben flach (~9°)
  const run1 = 1.15;
  const tan1 = (Z.knick - Z.wand) / run1;              // untere Dachfläche
  const ueberstand = (Z.wand - Z.gesimsO) / tan1;      // Traufe genau auf der Oberkante des Gesimses
  const run2 = (D - 2 * run1) / 2;                     // bis zum First
  const tan2 = (Z.first - Z.knick) / run2;             // obere Dachfläche
  const roofZ = s => Z.wand + s * tan1;                // Höhe der Dachhaut s Meter hinter der Außenwand
  const roofIn = s => roofZ(s) - 0.3 / Math.cos(Math.atan(tan1));   // Unterseite des 30 cm starken Dachaufbaus
  const traufe = roofZ(-ueberstand);                   // Traufkante 6,83 m
  const dachwinkel = [Math.atan(tan1) * 180 / Math.PI, Math.atan(tan2) * 180 / Math.PI];

  const ax7 = [[0.9, 1.9], [2.8, 3.8], [5.2, 6.2], [7.0, 9.0], [9.8, 10.8], [12.2, 13.2], [14.1, 15.1]];
  const pilLang = [[0, 0.5], [4.4, 4.95], [11.05, 11.6], [15.5, 16]];
  const pilKurz = [[0, 0.5], [11.15, 11.65]];
  // Alle Fenster und Fenstertüren mit senkrechter Mittelsprosse, also zwei Glasfelder (Daniel, 4.11.2026); die Haustür bleibt einflügelig.
  // Türen bis 1,10 m Breite einflügelig mit aufgesetzter Sprosse (zwei Flügel à ~0,37 m wären unbrauchbar), sonst zwei Flügel
  const fluegel = (u0, u1, kind) => kind === 'tuer' && u1 - u0 <= 1.1 ? { leaves: 1, sprosse: true } : { leaves: 2 };
  const op = (u0, u1, z0, z1, kind, extra = {}) => ({ u0, u1, z0, z1, kind, ...fluegel(u0, u1, kind), ...extra });
  const gaube = (u0, u1, win, extra = {}) => ({ u0, u1, top: 9.4, clad: 'putz', front: 0.2, win, ...extra });
  const gWin = (c, w = 0.9, z1 = 9.05) => ({ u0: c - w / 2, u1: c + w / 2, z0: 7.9, z1, leaves: 2 });
  // Dachfenster in der steilen Dachfläche: Mitte c entlang der Traufe, v0..v1 die Fläche hinauf (Meter ab Traufe)
  const dachfenster = (c, w = 0.9) => ({ u0: c - w / 2, u1: c + w / 2, v0: 1.15, v1: 2.6 });

