  // Teil der Ansichten (src/ansicht/, siehe 00-kern.js): render und Schnittstelle
  function render(view, opt) {
    const res = view === 'A' ? section(opt) : view === 'B' ? rampSection(opt) : facade(view, opt);
    return { ...res, svg: DEFS + res.svg };
  }
  const TITLES = {
    S: ['Ansicht Süd · Garten', 'Grundriss und Fensterachsen aus dem Konzeptplan, Gliederung aus dem Rendering'],
    N: ['Ansicht Nord · Eingang', 'Im Konzept noch nicht gezeichnet: Fenster und Eingang als Annahme im gleichen Stil'],
    E: ['Ansicht Ost · Freisitz', 'Freisitz 3,00 × 5,00 m aus dem Konzeptplan, Öffnungen angenommen'],
    W: ['Ansicht West', 'Öffnungen angenommen'],
    A: ['Schnitt A–A · Hausmitte, Blick nach Westen', 'Geschosshöhen, Untergeschoss und Dachaufbau sind Annahmen'],
    B: ['Schnitt B–B · Rampe zur Tiefgarage', 'Längsschnitt in der Rampenachse, Blick nach Westen; Neigungen und Höhen der Tiefgarage sind ein Vorschlag'],
  };
  return { render, TITLES };
})();
