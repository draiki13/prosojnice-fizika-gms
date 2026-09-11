/**
 * Izriše električno polje točkastih nabojev kot SVG, ki ga prilepimo v prosojnico:
 * silnice, karto puščic (vektorsko polje) ali oboje na isti sliki.
 *
 * Silnice so izračunane (integracija smeri polja z RK4), ne narisane na oko,
 * zato je gostota silnic pravilna in se silnice nikjer ne sekajo. Karta puščic
 * ima puščico v vsaki točki mreže; puščica se začne v točki, na katero se
 * nanaša, dolžina pa je sorazmerna z velikostjo polja.
 *
 * Uporaba:
 *   node scripts/silnice.mjs <razporeditev> [silnice|puscice|oboje]
 *
 * Razporeditve so na dnu datoteke (tocka-plus, tocka-minus, dipol, enaka).
 * Nova razporeditev: dodaj vnos v RAZPOREDITVE in poženi skript.
 * Iz drugega skripta: import { izrisi, RAZPOREDITVE } from './silnice.mjs'.
 */

import { pathToFileURL } from 'node:url';

/* ---------- fizika ---------- */

/** Polje v točki (x, y); konstanto izpustimo, ker nas zanimata le smer in razmerja. */
function polje(x, y, naboji) {
  let ex = 0;
  let ey = 0;
  for (const n of naboji) {
    const dx = x - n.x;
    const dy = y - n.y;
    const r2 = dx * dx + dy * dy;
    const k = n.q / (r2 * Math.sqrt(r2));
    ex += k * dx;
    ey += k * dy;
  }
  return [ex, ey];
}

/** Sledi silnici od (x0, y0); smer +1 = s poljem, -1 = proti polju. */
function sledi(x0, y0, smer, naboji, okvir, { korak = 1.2, najvec = 6000 } = {}) {
  const enotska = (x, y) => {
    const [ex, ey] = polje(x, y, naboji);
    const d = Math.hypot(ex, ey);
    return d < 1e-12 ? null : [(smer * ex) / d, (smer * ey) / d];
  };

  const tocke = [[x0, y0]];
  let x = x0;
  let y = y0;

  for (let i = 0; i < najvec; i++) {
    const k1 = enotska(x, y);
    if (!k1) break;
    const k2 = enotska(x + (korak / 2) * k1[0], y + (korak / 2) * k1[1]);
    if (!k2) break;
    const k3 = enotska(x + (korak / 2) * k2[0], y + (korak / 2) * k2[1]);
    if (!k3) break;
    const k4 = enotska(x + korak * k3[0], y + korak * k3[1]);
    if (!k4) break;

    x += (korak / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (korak / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    tocke.push([x, y]);

    if (x < okvir.x0 || x > okvir.x1 || y < okvir.y0 || y > okvir.y1) break;
    // Silnica se konča, ko pride do drugega naboja.
    if (naboji.some((n) => Math.hypot(x - n.x, y - n.y) < n.r * 0.9 && i > 5)) break;
  }
  return tocke;
}

/* ---------- risanje ---------- */

const f = (v) => Math.round(v * 10) / 10;

function pot(tocke) {
  const vsaka = 3;
  let d = `M${f(tocke[0][0])},${f(tocke[0][1])}`;
  for (let i = vsaka; i < tocke.length; i += vsaka) d += `L${f(tocke[i][0])},${f(tocke[i][1])}`;
  const zadnja = tocke[tocke.length - 1];
  d += `L${f(zadnja[0])},${f(zadnja[1])}`;
  return d;
}

/** Konica puščice na razdalji `pri` od začetka silnice, v smeri polja. */
function konica(tocke, pri, proti) {
  let dolzina = 0;
  for (let i = 1; i < tocke.length; i++) {
    const [ax, ay] = tocke[i - 1];
    const [bx, by] = tocke[i];
    dolzina += Math.hypot(bx - ax, by - ay);
    if (dolzina >= pri) {
      let ux = bx - ax;
      let uy = by - ay;
      const d = Math.hypot(ux, uy) || 1;
      ux /= d;
      uy /= d;
      if (proti) {
        ux = -ux;
        uy = -uy;
      }
      const v = 9; // dolžina konice
      const s = 5; // polovična širina
      const tx = bx + (ux * v) / 2;
      const ty = by + (uy * v) / 2;
      const px = -uy;
      const py = ux;
      return `${f(tx)},${f(ty)} ${f(tx - ux * v + px * s)},${f(ty - uy * v + py * s)} ${f(tx - ux * v - px * s)},${f(ty - uy * v - py * s)}`;
    }
  }
  return null;
}

/**
 * Puščica iz točke (x, y) v smeri (ux, uy) z dolžino `dolzina`: črta in konica.
 * Konica se pri kratkih puščicah pomanjša, da ne požre cele puščice.
 */
export function puscica(x, y, ux, uy, dolzina) {
  const v = Math.min(8, dolzina * 0.55);
  const s = v * 0.55;
  const tx = x + ux * dolzina;
  const ty = y + uy * dolzina;
  const bx = tx - ux * v;
  const by = ty - uy * v;
  const px = -uy;
  const py = ux;
  return [
    `<line x1="${f(x)}" y1="${f(y)}" x2="${f(bx)}" y2="${f(by)}" />`,
    `<polygon points="${f(tx)},${f(ty)} ${f(bx + px * s)},${f(by + py * s)} ${f(bx - px * s)},${f(by - py * s)}" />`,
  ].join('');
}

/**
 * Silnice za razporeditev: vrne poti in konice.
 *
 * `zamik` zasuka izhodišča silnic za del kota med sosednjima silnicama:
 * 0 pomeni silnico tudi v smeri osi x (lepo pri enem naboju in dipolu),
 * 0,5 jih razmakne simetrično (nujno pri dveh enakih nabojih, sicer silnica
 * na zveznici obtiči v točki, kjer je polje nič).
 */
export function silnice({ sirina, visina, naboji, silnic, pri = 70, zamik = 0 }) {
  const okvir = { x0: -5, y0: -5, x1: sirina + 5, y1: visina + 5 };
  const imaPozitivne = naboji.some((n) => n.q > 0);
  // Silnice izvirajo v pozitivnih nabojih; če jih ni, sledimo nazaj od negativnih.
  const viri = imaPozitivne ? naboji.filter((n) => n.q > 0) : naboji.filter((n) => n.q < 0);
  const smer = imaPozitivne ? 1 : -1;

  const poti = [];
  const konice = [];
  for (const n of viri) {
    const st = silnic * Math.abs(n.q);
    for (let i = 0; i < st; i++) {
      const kot = (2 * Math.PI * (i + zamik)) / st;
      const t = sledi(n.x + n.r * Math.cos(kot), n.y + n.r * Math.sin(kot), smer, naboji, okvir);
      if (t.length < 4) continue;
      poti.push(pot(t));
      const p = konica(t, pri, smer < 0);
      if (p) konice.push(p);
    }
  }

  // Če so na sliki oba predznaka, v negativne naboje pritekajo tudi silnice,
  // ki izvirajo zunaj slike. Sledimo jim nazaj od negativnega naboja; tiste,
  // ki pridejo do pozitivnega naboja, so že narisane, zato jih izpustimo.
  if (imaPozitivne) {
    const pozitivni = naboji.filter((n) => n.q > 0);
    for (const n of naboji.filter((m) => m.q < 0)) {
      const st = silnic * Math.abs(n.q);
      for (let i = 0; i < st; i++) {
        const kot = (2 * Math.PI * (i + zamik)) / st;
        const t = sledi(n.x + n.r * Math.cos(kot), n.y + n.r * Math.sin(kot), -1, naboji, okvir);
        if (t.length < 4) continue;
        const [kx, ky] = t[t.length - 1];
        if (pozitivni.some((m) => Math.hypot(kx - m.x, ky - m.y) < m.r * 1.5)) continue;
        poti.push(pot(t));
        const p = konica(t, pri, true);
        if (p) konice.push(p);
      }
    }
  }

  return [
    `  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.85">`,
    ...poti.map((d) => `    <path d="${d}" />`),
    `  </g>`,
    `  <g fill="currentColor">`,
    ...konice.map((p) => `    <polygon points="${p}" />`),
    `  </g>`,
  ].join('\n');
}

/**
 * Karta puščic: v točkah pravokotne mreže puščica polja. Mreža je simetrična
 * glede na sredino slike, zato nobena točka ne leži na sredinski črti.
 *
 * `korak`     razmik mreže; `odmik` polmer okoli naboja, kjer puščic ne rišemo;
 * `najvec`    dolžina najdaljše puščice;
 * `nasicenje` delež največje velikosti, pri katerem puščica doseže `najvec`
 *             (1 = dolžina natančno sorazmerna z velikostjo polja; manj = puščice
 *             blizu naboja se nasičijo, daljne pa so še vidne).
 */
export function kartaPuscic(
  { sirina, visina, naboji },
  { korak = 50, odmik = 45, najvec = 40, nasicenje = 1, barva = 'var(--barva-poudarek)' } = {},
) {
  const tocke = [];
  const nx = Math.floor(sirina / 2 / korak);
  const ny = Math.floor(visina / 2 / korak);
  for (let i = -nx; i < nx; i++) {
    for (let j = -ny; j < ny; j++) {
      const x = sirina / 2 + (i + 0.5) * korak;
      const y = visina / 2 + (j + 0.5) * korak;
      if (naboji.some((n) => Math.hypot(x - n.x, y - n.y) < odmik)) continue;
      const [ex, ey] = polje(x, y, naboji);
      const e = Math.hypot(ex, ey);
      if (e < 1e-12) continue;
      tocke.push({ x, y, ux: ex / e, uy: ey / e, e });
    }
  }
  const emax = Math.max(...tocke.map((t) => t.e)) * nasicenje;
  const vrstice = [
    `  <g fill="${barva}" stroke="${barva}" stroke-width="2.2" stroke-linecap="round">`,
  ];
  for (const t of tocke) {
    const d = Math.max(4, najvec * Math.min(1, t.e / emax));
    vrstice.push(`    <circle cx="${f(t.x)}" cy="${f(t.y)}" r="2.2" stroke="none" />`);
    vrstice.push(`    ${puscica(t.x, t.y, t.ux, t.uy, d)}`);
  }
  vrstice.push(`  </g>`);
  return vrstice.join('\n');
}

/** Naboji kot krogci z znakom. */
export function znakiNabojev(naboji) {
  const znak = (n) => (n.q > 0 ? '+' : '–');
  return [
    `  <g fill="var(--barva-ploskev)" stroke="currentColor" stroke-width="2.5">`,
    ...naboji.map((n) => `    <circle cx="${n.x}" cy="${n.y}" r="${n.r}" />`),
    `  </g>`,
    `  <g font-size="${Math.round(naboji[0].r * 1.1)}" font-weight="700" fill="currentColor" text-anchor="middle">`,
    ...naboji.map(
      (n) => `    <text x="${n.x}" y="${f(n.y + n.r * (n.q > 0 ? 0.38 : 0.42))}">${znak(n)}</text>`,
    ),
    `  </g>`,
  ].join('\n');
}

/** Celoten SVG; `nacin` je 'silnice', 'puscice' ali 'oboje'. */
export function izrisi(cfg, nacin = 'silnice', mozKarte = {}) {
  const deli = [];
  if (nacin === 'silnice' || nacin === 'oboje') deli.push(silnice(cfg));
  if (nacin === 'puscice' || nacin === 'oboje') deli.push(kartaPuscic(cfg, { ...cfg.karta, ...mozKarte }));
  deli.push(znakiNabojev(cfg.naboji));
  const oznaka = nacin === 'puscice' ? cfg.oznakaKarte ?? cfg.oznaka : cfg.oznaka;
  return [
    `<svg class="skica" viewBox="0 0 ${cfg.sirina} ${cfg.visina}" role="img" aria-label="${oznaka}">`,
    ...deli,
    `</svg>`,
  ].join('\n');
}

/* ---------- razporeditve ---------- */

export const RAZPOREDITVE = {
  'tocka-plus': {
    oznaka: 'Silnice pozitivnega točkastega naboja: ravne, radialno navzven',
    oznakaKarte: 'Karta puščic okoli pozitivnega naboja: puščice kažejo stran od naboja in so z razdaljo krajše',
    sirina: 300,
    visina: 300,
    silnic: 12,
    pri: 80,
    naboji: [{ x: 150, y: 150, q: 1, r: 20 }],
  },
  'tocka-minus': {
    oznaka: 'Silnice negativnega točkastega naboja: ravne, radialno navznoter',
    oznakaKarte: 'Karta puščic okoli negativnega naboja: puščice kažejo proti naboju in so z razdaljo krajše',
    sirina: 300,
    visina: 300,
    silnic: 12,
    pri: 80,
    naboji: [{ x: 150, y: 150, q: -1, r: 20 }],
  },
  dipol: {
    oznaka: 'Silnice dveh nasprotnih nabojev: izvirajo v pozitivnem in ponirajo v negativnem',
    oznakaKarte: 'Karta puščic dveh nasprotnih nabojev: puščice so najdaljše med njima',
    sirina: 520,
    visina: 320,
    silnic: 14,
    pri: 60,
    karta: { korak: 40, odmik: 40, najvec: 34, nasicenje: 0.35 },
    naboji: [
      { x: 180, y: 160, q: 1, r: 20 },
      { x: 340, y: 160, q: -1, r: 20 },
    ],
  },
  enaka: {
    oznaka: 'Silnice dveh enakih pozitivnih nabojev: med njima je točka, kjer je polje nič',
    oznakaKarte: 'Karta puščic dveh enakih pozitivnih nabojev: na sredini med njima ni puščice, ker je polje nič',
    sirina: 520,
    visina: 320,
    silnic: 12,
    pri: 60,
    zamik: 0.5,
    karta: { korak: 40, odmik: 40, najvec: 34, nasicenje: 0.35 },
    naboji: [
      { x: 180, y: 160, q: 1, r: 20 },
      { x: 340, y: 160, q: 1, r: 20 },
    ],
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ime = process.argv[2];
  const nacin = process.argv[3] ?? 'silnice';
  if (!ime || !RAZPOREDITVE[ime] || !['silnice', 'puscice', 'oboje'].includes(nacin)) {
    console.error(
      `Uporaba: node scripts/silnice.mjs <${Object.keys(RAZPOREDITVE).join(' | ')}> [silnice | puscice | oboje]`,
    );
    process.exit(1);
  }
  console.log(izrisi(RAZPOREDITVE[ime], nacin));
}
