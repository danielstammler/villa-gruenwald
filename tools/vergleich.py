#!/usr/bin/env python3
# Bildvergleich für tools/browser.js (./vg pruefen, ./vg bild, ./vg plan): aktuelle Bilder gegen die Referenz in tools/shots/referenz/.
# Je Paar der Anteil geänderter Pixel und der Bereich; für geänderte Bilder ein kleines „vorher | nachher“, auf den Bereich zugeschnitten
# (höchstens 1000 px breit); auf Wunsch eine Übersicht aller Bilder, geänderte rot umrandet.
# Schwelle: ein Pixel zählt, wenn ein Farbkanal um mehr als „pixel“ abweicht (3D 12 von 255, Zeichnungen 8). Im 3D zählen nur zusammen-
# hängende Gruppen (benachbarte 4×4-Blöcke mit solchen Pixeln) ab „gruppe“ Pixeln: verstreute Einzelpixel fallen weg, ein verschobenes Teil
# nicht (gemessen: 5 cm verschobene Kissen im fernen Geschossblick 41 px, Tür um 1° 717 px, Möbel um 3 cm 2751 px). Geändert ab „min_px“.
# Die Bilder selbst sind gleich, wenn sich nichts geändert hat (Rendern ohne Zufall, siehe tools/browser.js) – die Schwelle ist nur Reserve.
# Stufen im 3D: Rauschen ändert viele Pixel ein wenig. Gemessen 5.11.2026 an zwei neuen Rauschmustern der Umgebungsverdeckung in allen 25
# Ansichten (50 Paare): bis 71 % der Pixel, im Mittel 0,2–2,5 von 255; über 12 bis 2,4 % (größte Gruppe 580 px), über 40 nur verstreut
# (größte Gruppe 40 px, zusammen höchstens 143 px). Sichtbar: eine Gruppe über 40 ab „sichtbar“ px (2,5 × Rauschen) oder eine über 12 ab
# „flaeche“ px (schwache, aber zusammenhängende Änderung wie ein anderer Farbton, 4 × Rauschen). Deutlich: über 40 zusammen ab „deutlich“
# des Bilds (1020 × 775 px) oder über 12 ab „ganz“. Haustür 0,30 m versetzt: Eingang vom alten Standpunkt 10,8 % über 40, Galerie 5,3 %
# (deutlich), Nordseite von weitem 0,74 %, Geschossblicke EG/OG Gruppen 413/253 px (sichtbar), Westseite streifend hinter dem Pfeiler 8 px
# (Rauschen, man sieht es nicht).
# Aufruf: python3 tools/vergleich.py < auftrag.json   mit {"art": "3d"|"2d", "paare": [{"name", "ref", "akt", "aus", "zeige"?, "marke"?}],
#   "uebersicht": pfad|null} (zeige: Bild für die Übersicht statt akt, z. B. die Ansicht vom neuen Standpunkt, wenn akt vom alten Standpunkt
#   gerendert ist; marke: Zusatz unter dem Namen in der Übersicht)
# Ausgabe: JSON {name: {"anteil", "px", "box": [x0, y0, x1, y1], "ort", "bild", "stufe", "kern", "flaeche", "stark"} | {"gleich": true}
#   | {"fehlt": "ref"|"akt"} | {"groesse": [..]}}; stufe im 3D „deutlich“, „sichtbar“ oder „rauschen“ (dann ohne vorher | nachher),
#   kern/flaeche = größte Gruppe über 40 bzw. über 12 in px, stark = Anteil über 40
import json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ART = {'3d': {'pixel': 12, 'block': 4, 'gruppe': 12, 'min_px': 12, 'stark': 40, 'sichtbar': 100, 'flaeche': 2500, 'deutlich': 0.01, 'ganz': 0.2},
       '2d': {'pixel': 8, 'block': 1, 'gruppe': 1, 'min_px': 3}}


def lade(p):
    try:
        return np.asarray(Image.open(p).convert('RGB'))
    except (OSError, ValueError):
        return None


def gruppen(m, k, gruppe):
    # Pixel je k×k-Block zählen (Rand auf volle Blöcke auffüllen), benachbarte Blöcke (auch schräg) zu Gruppen, kleine Gruppen weg;
    # Ergebnis: Maske ohne die kleinen Gruppen und die Größe der größten Gruppe in Pixeln
    h, w = m.shape
    H, W = -(-h // k) * k, -(-w // k) * k
    p = np.zeros((H, W), bool)
    p[:h, :w] = m
    n = p.reshape(H // k, k, W // k, k).sum(axis=(1, 3))
    lab, cnt = ndimage.label(n > 0, structure=np.ones((3, 3), int))
    if not cnt:
        return m, 0
    groesse = np.asarray(ndimage.sum(n, lab, index=np.arange(1, cnt + 1)))
    behalten = np.zeros(cnt + 1, bool)
    behalten[1:] = groesse >= gruppe
    return m & np.repeat(np.repeat(behalten[lab], k, axis=0), k, axis=1)[:h, :w], int(groesse.max())


def maske(d, s, pixel=None):
    m = d > (s['pixel'] if pixel is None else pixel)
    if s['block'] > 1 and s['gruppe'] > 1 and m.any():
        return gruppen(m, s['block'], s['gruppe'])
    return m, int(m.sum())


def kasten(m):
    ys, xs = np.nonzero(m)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def ort(box, w, h):
    x0, y0, x1, y1 = box
    if (x1 - x0) > 0.7 * w and (y1 - y0) > 0.7 * h:
        return 'ganzes Bild'
    cx, cy = (x0 + x1) / 2 / w, (y0 + y1) / 2 / h
    v = 'oben' if cy < 1 / 3 else 'unten' if cy > 2 / 3 else ''
    q = 'links' if cx < 1 / 3 else 'rechts' if cx > 2 / 3 else ''
    return (f'{v} {q}'.strip()) or 'Mitte'


def paar_bild(a, b, box, aus):
    # Ausschnitt um den geänderten Bereich mit Rand, vorher | nachher, Bereich rot umrandet, höchstens 1000 × 600 px (kleines bis 2× vergrößert)
    h, w = a.shape[:2]
    x0, y0, x1, y1 = box
    r = max(30, int(0.15 * max(x1 - x0, y1 - y0)))
    c0, d0, c1, d1 = max(0, x0 - r), max(0, y0 - r), min(w, x1 + r), min(h, y1 + r)
    ca, cb = Image.fromarray(a[d0:d1, c0:c1]), Image.fromarray(b[d0:d1, c0:c1])
    cw, ch, gap = c1 - c0, d1 - d0, 8
    s = min(2.0, 1000 / (2 * cw + gap), 600 / (ch + 16))
    tw, th = max(1, round(cw * s)), max(1, round(ch * s))
    out = Image.new('RGB', (2 * tw + gap, th + 16), (255, 255, 255))
    dr = ImageDraw.Draw(out)
    for i, (im, txt) in enumerate(((ca, 'vorher'), (cb, 'nachher'))):
        ox = i * (tw + gap)
        out.paste(im.resize((tw, th), Image.LANCZOS if s < 1 else Image.NEAREST), (ox, 16))
        dr.text((ox + 2, 2), txt, fill=(0, 0, 0))
        bx = [ox + (x0 - c0) * s - 2, 16 + (y0 - d0) * s - 2, ox + (x1 - c0) * s + 2, 16 + (y1 - d0) * s + 2]
        dr.rectangle(bx, outline=(220, 30, 30), width=2)
    out.save(aus, optimize=True)


def uebersicht(eintraege, aus):
    # alle aktuellen Bilder klein, 4 Spalten à 240 px, sichtbar oder deutlich geänderte mit rotem Rahmen und Anteil unter dem Namen,
    # Rauschen nur grau vermerkt
    tw, cols, gap, cap = 240, 4, 8, 14
    bilder = []
    for name, pfad, info, marke in eintraege:
        try:
            im = Image.open(pfad).convert('RGB')
        except OSError:
            continue
        im.thumbnail((tw, tw * 3), Image.LANCZOS)
        bilder.append((name, im, info, marke))
    if not bilder:
        return
    rows = -(-len(bilder) // cols)
    rh = max(im.height for _, im, _, _ in bilder) + cap + gap
    out = Image.new('RGB', (cols * (tw + gap) + gap, rows * rh + gap), (255, 255, 255))
    dr = ImageDraw.Draw(out)
    for i, (name, im, info, marke) in enumerate(bilder):
        x, y = gap + (i % cols) * (tw + gap), gap + (i // cols) * rh
        out.paste(im, (x, y))
        rot = 'anteil' in info and info.get('stufe') != 'rauschen'
        if rot:
            dr.rectangle([x - 3, y - 3, x + im.width + 2, y + im.height + 2], outline=(220, 30, 30), width=4)
        txt = name + (f"  {info['anteil'] * 100:.1f} %".replace('.', ',') if rot else '  Rauschen' if 'anteil' in info
                      else '  neu' if info.get('fehlt') == 'ref' else '') + (f'  {marke}' if marke else '')
        dr.text((x, y + im.height + 2), txt, fill=(200, 20, 20) if rot else (120, 120, 120) if 'anteil' in info else (0, 0, 0))
    out.save(aus, optimize=True)


def main():
    auftrag = json.load(sys.stdin)
    s = ART[auftrag.get('art', '3d')]
    erg, liste = {}, []
    for p in auftrag['paare']:
        a, b = lade(p['ref']), lade(p['akt'])
        if b is None:
            erg[p['name']] = {'fehlt': 'akt'}
        elif a is None:
            erg[p['name']] = {'fehlt': 'ref'}
        elif a.shape != b.shape:
            erg[p['name']] = {'groesse': [list(a.shape[1::-1]), list(b.shape[1::-1])], 'anteil': 1.0, 'stufe': 'deutlich'}
        else:
            d = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2)
            m, flaeche = maske(d, s)
            n = int(m.sum())
            if n < s['min_px']:
                erg[p['name']] = {'gleich': True, 'px': n}
            else:
                e, fokus = {'anteil': n / m.size, 'px': n}, m
                if 'stark' in s:
                    # Stufe aus den größten Gruppen (stark geändert bzw. schwach, aber zusammenhängend) und den Mengen, siehe oben
                    ms, kern = maske(d, s, s['stark'])
                    st = int(ms.sum())
                    sichtbar = kern >= s['sichtbar'] or flaeche >= s['flaeche']
                    deutlich = st >= s['deutlich'] * m.size or n >= s['ganz'] * m.size
                    e.update(kern=kern, flaeche=flaeche, stark=st / m.size,
                             stufe='deutlich' if sichtbar and deutlich else 'sichtbar' if sichtbar else 'rauschen')
                    if kern >= s['sichtbar']:
                        fokus = ms   # Bereich nur aus den starken Gruppen, verstreutes Rauschen zöge ihn sonst aufs ganze Bild
                box = kasten(fokus)
                e.update(box=box, ort=ort(box, m.shape[1], m.shape[0]))
                if p.get('aus') and e.get('stufe') != 'rauschen':
                    paar_bild(a, b, box, p['aus'])
                    e['bild'] = p['aus']
                erg[p['name']] = e
        liste.append((p['name'], p.get('zeige') or p['akt'], erg[p['name']], p.get('marke')))
    if auftrag.get('uebersicht'):
        uebersicht(liste, auftrag['uebersicht'])
    json.dump(erg, sys.stdout)


if __name__ == '__main__':
    main()
