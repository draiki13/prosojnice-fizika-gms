/**
 * Majhen, varen razčlenjevalnik matematičnih izrazov.
 *
 * Zakaj lasten in ne `eval` / `new Function`:
 *  - deluje tudi ob strogi varnostni politiki (CSP) brez `unsafe-eval`;
 *  - izraz razčleni **enkrat** in ga prevede v zaprtje (closure), zato je
 *    ponovno računanje ob premikanju drsnika hitro (nekaj sto točk na sličico).
 *
 * Podprto:  + - * / ^ %  oklepaji, unarni minus, funkcije, konstante.
 * Zapis:    množenje vedno eksplicitno — `2*t`, ne `2t`.
 * Decimalke: pika (`0.5`). Vejica loči argumente funkcij.
 *
 *   prevedi('x0 + v*t')({ x0: 2, v: 3, t: 4 })  // → 14
 */

export type Okolje = Record<string, number>;
export type Prevedeno = (okolje: Okolje) => number;

/* ---------- funkcije in konstante ---------- */

const FUNKCIJE: Record<string, (...a: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  hypot: Math.hypot,
};

const KONSTANTE: Okolje = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

/* ---------- razbijanje na simbole ---------- */

type VrstaSimbola = 'stevilo' | 'ime' | 'operator' | 'oklepaj' | 'vejica';

interface Simbol {
  vrsta: VrstaSimbola;
  besedilo: string;
  mesto: number;
}

const JE_STEVKA = (z: string) => z >= '0' && z <= '9';
const JE_ZACETEK_IMENA = (z: string) => /[A-Za-zČŠŽčšž_]/.test(z);
const JE_IME = (z: string) => /[A-Za-zČŠŽčšž0-9_]/.test(z);

function razbij(vhod: string): Simbol[] {
  const simboli: Simbol[] = [];
  let i = 0;

  while (i < vhod.length) {
    const z = vhod[i]!;

    if (z === ' ' || z === '\t' || z === '\n' || z === '\r') {
      i++;
      continue;
    }

    if (JE_STEVKA(z) || (z === '.' && JE_STEVKA(vhod[i + 1] ?? ''))) {
      const zacetek = i;
      while (i < vhod.length && JE_STEVKA(vhod[i]!)) i++;
      if (vhod[i] === '.') {
        i++;
        while (i < vhod.length && JE_STEVKA(vhod[i]!)) i++;
      }
      // eksponentni zapis: 1e-3, 2.5E6
      if (vhod[i] === 'e' || vhod[i] === 'E') {
        const shrani = i;
        i++;
        if (vhod[i] === '+' || vhod[i] === '-') i++;
        if (JE_STEVKA(vhod[i] ?? '')) {
          while (i < vhod.length && JE_STEVKA(vhod[i]!)) i++;
        } else {
          i = shrani; // ni eksponent, ampak konstanta `e`
        }
      }
      simboli.push({ vrsta: 'stevilo', besedilo: vhod.slice(zacetek, i), mesto: zacetek });
      continue;
    }

    if (JE_ZACETEK_IMENA(z)) {
      const zacetek = i;
      while (i < vhod.length && JE_IME(vhod[i]!)) i++;
      simboli.push({ vrsta: 'ime', besedilo: vhod.slice(zacetek, i), mesto: zacetek });
      continue;
    }

    if ('+-*/^%'.includes(z)) {
      simboli.push({ vrsta: 'operator', besedilo: z, mesto: i });
      i++;
      continue;
    }

    if (z === '(' || z === ')') {
      simboli.push({ vrsta: 'oklepaj', besedilo: z, mesto: i });
      i++;
      continue;
    }

    if (z === ',') {
      simboli.push({ vrsta: 'vejica', besedilo: z, mesto: i });
      i++;
      continue;
    }

    throw new NapakaIzraza(`Neznan znak «${z}»`, i);
  }

  return simboli;
}

export class NapakaIzraza extends Error {
  mesto: number;
  constructor(sporocilo: string, mesto: number) {
    super(`${sporocilo} (mesto ${mesto})`);
    this.name = 'NapakaIzraza';
    this.mesto = mesto;
  }
}

/* ---------- razčlenjevanje (Pratt) in prevajanje ---------- */

// Večja vrednost = tesneje veže.
const MOC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
const DESNO_ASOCIATIVEN = new Set(['^']);

/**
 * Razčleni izraz in ga prevede v zaprtje.
 * Vrže {@link NapakaIzraza}, če je zapis neveljaven.
 */
export function prevedi(izraz: string): Prevedeno {
  const simboli = razbij(izraz);
  let p = 0;

  const pogled = () => simboli[p];
  const vzemi = () => simboli[p++]!;

  function izrazMoci(najmanj: number): Prevedeno {
    let levo = enota();

    for (;;) {
      const s = pogled();
      if (!s || s.vrsta !== 'operator') break;
      const moc = MOC[s.besedilo];
      if (moc === undefined || moc < najmanj) break;
      vzemi();
      const naslednja = DESNO_ASOCIATIVEN.has(s.besedilo) ? moc : moc + 1;
      const desno = izrazMoci(naslednja);
      levo = zdruzi(s.besedilo, levo, desno);
    }

    return levo;
  }

  function zdruzi(op: string, a: Prevedeno, b: Prevedeno): Prevedeno {
    switch (op) {
      case '+':
        return (o) => a(o) + b(o);
      case '-':
        return (o) => a(o) - b(o);
      case '*':
        return (o) => a(o) * b(o);
      case '/':
        return (o) => a(o) / b(o);
      case '%':
        return (o) => a(o) % b(o);
      case '^':
        return (o) => Math.pow(a(o), b(o));
      default:
        throw new NapakaIzraza(`Neznan operator «${op}»`, 0);
    }
  }

  function enota(): Prevedeno {
    const s = pogled();
    if (!s) throw new NapakaIzraza('Nepričakovan konec izraza', izraz.length);

    // unarni predznak
    if (s.vrsta === 'operator' && (s.besedilo === '-' || s.besedilo === '+')) {
      vzemi();
      const notri = izrazMoci(MOC['*']!); // -x^2 = -(x^2), a -x*y = (-x)*y
      return s.besedilo === '-' ? (o) => -notri(o) : notri;
    }

    if (s.vrsta === 'stevilo') {
      vzemi();
      const v = Number(s.besedilo);
      return () => v;
    }

    if (s.vrsta === 'oklepaj' && s.besedilo === '(') {
      vzemi();
      const notri = izrazMoci(0);
      const zapri = vzemi();
      if (!zapri || zapri.besedilo !== ')') {
        throw new NapakaIzraza('Manjka zaklepaj', s.mesto);
      }
      return notri;
    }

    if (s.vrsta === 'ime') {
      vzemi();
      const ime = s.besedilo;

      // klic funkcije
      if (pogled()?.besedilo === '(') {
        vzemi();
        const argumenti: Prevedeno[] = [];
        if (pogled()?.besedilo !== ')') {
          for (;;) {
            argumenti.push(izrazMoci(0));
            if (pogled()?.vrsta === 'vejica') {
              vzemi();
              continue;
            }
            break;
          }
        }
        const zapri = vzemi();
        if (!zapri || zapri.besedilo !== ')') {
          throw new NapakaIzraza(`Manjka zaklepaj pri funkciji «${ime}»`, s.mesto);
        }
        // `Object.hasOwn`, ne `FUNKCIJE[ime]` — sicer bi se skozi ujela
        // imena s prototipa (`constructor`, `toString` …).
        const fn = Object.hasOwn(FUNKCIJE, ime) ? FUNKCIJE[ime] : undefined;
        if (!fn) throw new NapakaIzraza(`Neznana funkcija «${ime}»`, s.mesto);

        // pogosta primera prevedemo posebej — brez ustvarjanja polja ob vsakem klicu
        if (argumenti.length === 1) {
          const a = argumenti[0]!;
          return (o) => fn(a(o));
        }
        if (argumenti.length === 2) {
          const [a, b] = argumenti as [Prevedeno, Prevedeno];
          return (o) => fn(a(o), b(o));
        }
        return (o) => fn(...argumenti.map((a) => a(o)));
      }

      // konstanta
      if (Object.hasOwn(KONSTANTE, ime)) {
        const k = KONSTANTE[ime]!;
        return () => k;
      }

      // spremenljivka iz okolja; kar ni število, da NaN in graf tak odsek preskoči
      return (o) => {
        if (!Object.hasOwn(o, ime)) return NaN;
        const v = o[ime];
        return typeof v === 'number' ? v : NaN;
      };
    }

    throw new NapakaIzraza(`Nepričakovan simbol «${s.besedilo}»`, s.mesto);
  }

  const koren = izrazMoci(0);
  if (p < simboli.length) {
    throw new NapakaIzraza(`Odvečen zapis od «${simboli[p]!.besedilo}»`, simboli[p]!.mesto);
  }
  return koren;
}

/** Prevede izraz; ob napaki vrne funkcijo, ki vrača NaN (graf tak odsek preskoči). */
export function prevediVarno(izraz: string): { fn: Prevedeno; napaka: string | null } {
  try {
    return { fn: prevedi(izraz), napaka: null };
  } catch (e) {
    const sporocilo = e instanceof Error ? e.message : String(e);
    return { fn: () => NaN, napaka: sporocilo };
  }
}

/** Imena spremenljivk v izrazu (brez funkcij in konstant) — za preverjanje vsebine. */
export function spremenljivke(izraz: string): string[] {
  let simboli: Simbol[];
  try {
    simboli = razbij(izraz);
  } catch {
    return [];
  }
  const najdene = new Set<string>();
  simboli.forEach((s, i) => {
    if (s.vrsta !== 'ime') return;
    if (simboli[i + 1]?.besedilo === '(') return; // funkcija
    if (KONSTANTE[s.besedilo] !== undefined) return;
    najdene.add(s.besedilo);
  });
  return [...najdene];
}
