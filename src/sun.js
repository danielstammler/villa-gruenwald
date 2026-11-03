// Sonnenstand nach dem NOAA-Verfahren (Genauigkeit etwa 0,1°), Ortszeit Europe/Berlin mit Sommerzeit.
const SUN = (() => {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const lastSunday = (y, m) => { const d = new Date(Date.UTC(y, m + 1, 0)); return d.getUTCDate() - d.getUTCDay(); };
  function utcOffset(y, m, d, h) {
    const start = Date.UTC(y, 2, lastSunday(y, 2), 1), end = Date.UTC(y, 9, lastSunday(y, 9), 1);
    const t = Date.UTC(y, m, d) + (h - 1) * 3600e3;
    return t >= start && t < end ? 2 : 1;
  }
  function position(y, m, d, h, lat, lon) {
    const off = utcOffset(y, m, d, h);
    const ms = Date.UTC(y, m, d) + (h - off) * 3600e3;
    const T = (ms / 86400000 + 2440587.5 - 2451545) / 36525;
    const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
    const omega = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad);
    const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(omega * rad);
    const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
    const yv = Math.tan(eps * rad / 2) ** 2;
    const eot = 4 * deg * (yv * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * yv * Math.sin(M * rad) * Math.cos(2 * L0 * rad)
      - 0.5 * yv * yv * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
    const minUTC = ((ms / 60000) % 1440 + 1440) % 1440;
    const tst = ((minUTC + eot + 4 * lon) % 1440 + 1440) % 1440;
    const ha = tst / 4 - 180;
    const la = lat * rad;
    const cosZ = Math.max(-1, Math.min(1, Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha * rad)));
    const zen = Math.acos(cosZ);
    const cosA = Math.max(-1, Math.min(1, (Math.sin(la) * Math.cos(zen) - Math.sin(decl)) / (Math.cos(la) * Math.sin(zen) || 1e-9)));
    const a = Math.acos(cosA) * deg;
    const az = ha > 0 ? (a + 180) % 360 : (540 - a) % 360;
    const geo = 90 - zen * deg;
    const el = geo > -0.575 ? geo + 1.02 / Math.tan((geo + 10.3 / (geo + 5.11)) * rad) / 60 : geo;
    return { az, el, geo, off };
  }
  function riseSet(y, m, d, lat, lon) {
    let rise = null, set = null, prev = position(y, m, d, 0, lat, lon).geo;
    for (let min = 2; min <= 1440; min += 2) {
      const g = position(y, m, d, min / 60, lat, lon).geo;
      if (prev < -0.833 && g >= -0.833 && rise === null) rise = min / 60;
      if (prev >= -0.833 && g < -0.833) set = min / 60;
      prev = g;
    }
    return { rise, set };
  }
  // Richtung zur Sonne im Plan (x = Plan-Ost, y = Plan-Nord); geographisch Nord liegt um north° gegen den Uhrzeigersinn gedreht.
  function planDir(az, el, north) {
    const th = (90 + north - az) * rad, c = Math.cos(el * rad);
    return { x: Math.cos(th) * c, y: Math.sin(th) * c, z: Math.sin(el * rad) };
  }
  const hhmm = h => {
    if (h == null) return '–';
    const t = Math.round(h * 60) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  return { position, riseSet, planDir, hhmm };
})();
