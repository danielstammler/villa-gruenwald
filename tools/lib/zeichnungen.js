'use strict';
// Alle Zeichnungen als eigenständige SVG-Dateien wie auf der Seite (Ansichten und Schnitte mit Maßen und Koten, Grundrisse mit Möbeln und
// Flächen, Lageplan mit allen Ebenen), aber ohne eingebettetes CSS: die Klassen kommen aus src/style.css, das daneben liegt.
// Für tools/check.js (--svg) und tools/browser.js (plan, zeichnungen).
const fs = require('fs'), path = require('path');
const { SRC, rechne } = require('./laden');

const LISTE = [
  ...['S', 'N', 'E', 'W', 'A', 'B'].map(v => ({ datei: `ansicht-${v}`, titel: `Ansicht ${v}`, code: `Elev.render('${v}', { mass: true, koten: true })` })),
  ...['UG', 'EG', 'OG', 'DG'].map(fl => ({ datei: `grundriss-${fl}`, titel: `Grundriss ${fl}`, fl, code: `Plans.render('${fl}', { moebel: true, flaechen: true })` })),
  { datei: 'lageplan', titel: 'Lageplan', code: 'Site._build()' },
];
// Ausschnitt des Lageplans steht in siteplan.js (PanZoom-Startausschnitt); falls er dort nicht mehr zu finden ist, der bisherige
function lageplanVb() {
  const m = fs.readFileSync(path.join(SRC, 'siteplan.js'), 'utf8').match(/PanZoom\(svg, \(\) => \[([-\d.,\s]+)\]\)/);
  return m ? m[1].split(',').map(Number) : [-16, -17, 52, 80];
}
// { datei, titel, fl, svg (Inhalt), vb, text (eigenständige SVG-Datei) } je Zeichnung; nur = Liste von Dateinamen oder Geschossen
function zeichnungen(ctx, nur) {
  const vbSite = lageplanVb();
  return LISTE.filter(z => !nur || nur.includes(z.datei) || nur.includes(z.fl)).map(z => {
    const r = rechne(ctx, z.code), svg = typeof r === 'string' ? r : r.svg, vb = typeof r === 'string' ? vbSite : r.vb;
    const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(v => +(+v).toFixed(3)).join(' ')}">${svg}</svg>\n`;
    return { ...z, svg, vb, text };
  });
}
const css = () => fs.readFileSync(path.join(SRC, 'style.css'), 'utf8').replace(/\r\n?/g, '\n');
module.exports = { LISTE, zeichnungen, css };
