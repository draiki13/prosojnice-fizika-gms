/**
 * Zapis števil po slovenskem dogovoru (decimalna **vejica**) in
 * izbira „lepih“ vrednosti za osi grafov.
 */

const OBLIKA = new Map<string, Intl.NumberFormat>();

function oblikovalnik(najmanj: number, najvec: number): Intl.NumberFormat {
  const kljuc = `${najmanj}:${najvec}`;
  let o = OBLIKA.get(kljuc);
  if (!o) {
    o = new Intl.NumberFormat('sl-SI', {
      minimumFractionDigits: najmanj,
      maximumFractionDigits: najvec,
    });
    OBLIKA.set(kljuc, o);
  }
  return o;
}

/** `3.14` → `"3,14"`. Privzeto do 3 decimalna mesta. */
export function stevilka(n: number, decimalke?: number): string {
  if (!Number.isFinite(n)) return '—';
  if (decimalke !== undefined) return oblikovalnik(decimalke, decimalke).format(n);

  const a = Math.abs(n);
  // Zelo velika ali zelo majhna števila zapišemo s potenco z osnovo 10.
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return potenca(n);

  const mest = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return oblikovalnik(0, mest).format(n);
}

/** Zapis s potenco z osnovo 10: `0.00042` → `"4,2 · 10⁻⁴"`. */
export function potenca(n: number, veljavna = 2): string {
  if (n === 0) return '0';
  if (!Number.isFinite(n)) return '—';
  const eksponent = Math.floor(Math.log10(Math.abs(n)));
  const mantisa = n / Math.pow(10, eksponent);
  const m = oblikovalnik(0, veljavna - 1).format(mantisa);
  return `${m} · 10${nadpisano(eksponent)}`;
}

const NADPISANE = '⁰¹²³⁴⁵⁶⁷⁸⁹';

function nadpisano(n: number): string {
  const predznak = n < 0 ? '⁻' : '';
  return (
    predznak +
    String(Math.abs(n))
      .split('')
      .map((z) => NADPISANE[Number(z)] ?? z)
      .join('')
  );
}

/**
 * Zapis na dano število **veljavnih mest** — tako, kot zahtevamo pri meritvah.
 * `veljavno(0.6337, 2)` → `"0,63"` · `veljavno(4.03, 2)` → `"4,0"`
 */
export function veljavno(n: number, mest = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';

  const a = Math.abs(n);
  if (a >= 1e5 || a < 1e-3) return potenca(n, mest);

  const decimalk = Math.max(0, mest - 1 - Math.floor(Math.log10(a)));
  return oblikovalnik(decimalk, decimalk).format(veljavnaMesta(n, mest));
}

/** Zaokroži na dano število veljavnih mest — tako, kot zahtevamo pri meritvah. */
export function veljavnaMesta(n: number, mest: number): number {
  if (n === 0 || !Number.isFinite(n)) return n;
  const faktor = Math.pow(10, mest - Math.ceil(Math.log10(Math.abs(n))));
  return Math.round(n * faktor) / faktor;
}

/**
 * „Lepe“ vrednosti za os: koraki 1, 2, 5 × 10ⁿ.
 * Vrne mejnike znotraj [min, max] — vključno z robovoma, če nanje padeta.
 */
export function mejniki(min: number, max: number, priblizno = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];

  const razpon = max - min;
  const surovKorak = razpon / Math.max(1, priblizno);
  const velikost = Math.pow(10, Math.floor(Math.log10(surovKorak)));
  const normiran = surovKorak / velikost;

  const korak = (normiran <= 1 ? 1 : normiran <= 2 ? 2 : normiran <= 5 ? 5 : 10) * velikost;

  const prvi = Math.ceil(min / korak) * korak;
  const seznam: number[] = [];
  // Majhen dodatek zaradi zaokroževanja pri deljenju s plavajočo vejico.
  for (let v = prvi; v <= max + korak * 1e-9; v += korak) {
    seznam.push(Math.abs(v) < korak * 1e-9 ? 0 : v);
  }
  return seznam;
}

/** Koliko decimalk potrebuje mejnik na osi s tem korakom. */
export function decimalkeZaKorak(korak: number): number {
  if (!Number.isFinite(korak) || korak <= 0) return 0;
  return Math.max(0, Math.min(4, -Math.floor(Math.log10(korak))));
}
