import { getCollection, type CollectionEntry } from 'astro:content';
import type { PROGRAMI } from '../content.config';

export type Enota = CollectionEntry<'enote'>;
export type Ura = CollectionEntry<'ure'>;
export type Program = (typeof PROGRAMI)[number];

export const LETNIKI = [1, 2, 3, 4] as const;

/** Letniki farmacevtskega tehnika, ki imajo na strani svoj razdelek. */
export const LETNIKI_FT = [1] as const;

/** Gradivo, na katero kaže kartica: program in letnik. */
export interface Razdelek {
  program: Program;
  letnik: number;
}

/** Kartica letnika na naslovnici. */
export interface KarticaLetnika {
  program: string;
  /** Vrstica mreže na naslovnici: 1 = gimnazija, 2 = farmacevtski tehnik. */
  vrstica: number;
  letnik: number;
  /** Sklopi, vsak v svoji vrstici kartice; brez seznama se vzamejo naslovi enot. */
  sklopi?: string[];
  /** Razdelek, ki ga kartica odpre; `null`, če gradiva še ni. */
  cilj: Razdelek | null;
  /** Razdelki, iz katerih se štejejo pripravljene ure (privzeto `cilj`). */
  stejIz?: Razdelek[];
}

export const KARTICE_LETNIKOV: KarticaLetnika[] = [
  {
    program: 'Gimnazija',
    vrstica: 1,
    letnik: 1,
    cilj: { program: 'gim', letnik: 1 },
    sklopi: [
      'Raziskovanje v fiziki',
      'Opis premega gibanja',
      'Sile',
      'Tlak',
      'Navor',
      'Gravitacijski zakon',
      'II. Newtonov zakon',
    ],
  },
  {
    program: 'Gimnazija',
    vrstica: 1,
    letnik: 2,
    cilj: { program: 'gim', letnik: 2 },
    sklopi: [
      'Gibalna količina',
      'Delo in energija',
      'Tekočine',
      'Zgradba snovi in temperatura',
      'Notranja energija in toplota',
      'Nihanje',
      'Valovanje',
    ],
  },
  {
    program: 'Gimnazija',
    vrstica: 1,
    letnik: 3,
    cilj: { program: 'gim', letnik: 3 },
    sklopi: [
      'Električni naboj in električno polje',
      'Električni tok',
      'Magnetno polje in magnetna indukcija',
      'Zvok',
      'Optika',
    ],
  },
  {
    program: 'Gimnazija',
    vrstica: 1,
    letnik: 4,
    cilj: { program: 'gim', letnik: 4 },
    sklopi: ['Atom', 'Atomsko jedro', 'Astronomija', 'Priprava na maturo'],
  },
  {
    // Ure z isto vsebino kot v gimnaziji so skupne (polje `deljeno` v enotah FT).
    program: 'Farmacevtski tehnik',
    vrstica: 2,
    letnik: 1,
    cilj: { program: 'ft', letnik: 1 },
    sklopi: [
      'Raziskovanje v fiziki',
      'Opis premega gibanja',
      'Sile',
      'Tlak',
      'Navor',
      'Gravitacijski zakon',
      'II. Newtonov zakon',
      'Delo in energija',
      'Tekočine',
    ],
  },
  {
    program: 'Farmacevtski tehnik',
    vrstica: 2,
    letnik: 2,
    cilj: null,
    sklopi: [
      'Zgradba snovi in temperatura',
      'Notranja energija in toplota',
      'Električni tok',
      'Nihanje',
      'Valovanje',
      'Optika',
      'Atom',
      'Atomsko jedro',
    ],
  },
];

/** `1` → `"1. letnik"`; za FT `"1. letnik · farmacevtski tehnik"` */
export function imeLetnika(n: number, program: Program = 'gim'): string {
  return program === 'ft' ? `${n}. letnik · farmacevtski tehnik` : `${n}. letnik`;
}

/** `1` → `"1-letnik"`; za FT `"ft-1-letnik"` */
export function slugLetnika(n: number, program: Program = 'gim'): string {
  return program === 'ft' ? `ft-${n}-letnik` : `${n}-letnik`;
}

/**
 * `"1L-1-raziskovanje-v-fiziki"` → `"raziskovanje-v-fiziki"`,
 * `"FT-1L-2-opis-premega-gibanja"` → `"opis-premega-gibanja"` (Astro id-je zniža)
 */
export function slugEnote(id: string): string {
  return id.replace(/^(ft-)?\d+l-\d+-/i, '');
}

/** Sestavi naslov znotraj strani in upošteva `base` iz nastavitev. */
export function pot(...deli: (string | number)[]): string {
  const osnova = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${osnova}/${deli.join('/')}/`.replace(/\/{2,}/g, '/');
}

export function potLetnika(letnik: number, program: Program = 'gim'): string {
  return pot(slugLetnika(letnik, program));
}

export function potEnote(enota: Enota): string {
  return pot(slugLetnika(enota.data.letnik, enota.data.program), slugEnote(enota.id));
}

/** Enote danega letnika in programa, urejene po zaporedni številki. */
export async function enoteLetnika(letnik: number, program: Program = 'gim'): Promise<Enota[]> {
  const vse = await getCollection(
    'enote',
    (e) => e.data.letnik === letnik && e.data.program === program,
  );
  return vse.sort((a, b) => a.data.stevilka - b.data.stevilka);
}

/** Vse enote vseh programov in letnikov, urejene. */
export async function vseEnote(): Promise<Enota[]> {
  const vse = await getCollection('enote');
  return vse.sort(
    (a, b) =>
      a.data.program.localeCompare(b.data.program) ||
      a.data.letnik - b.data.letnik ||
      a.data.stevilka - b.data.stevilka,
  );
}

/** Ure ene enote, urejene po zaporedni številki ure. */
export async function ureEnote(
  letnik: number,
  enota: number,
  program: Program = 'gim',
): Promise<Ura[]> {
  const vse = await getCollection(
    'ure',
    (u) => u.data.letnik === letnik && u.data.enota === enota && u.data.program === program,
  );
  return vse.sort((a, b) => a.data.ura - b.data.ura);
}

/**
 * Vse ure enote: lastne in gimnazijske, ki jih enota deli (`deljeno`),
 * urejene po zaporedni številki ure.
 */
export async function vseUreEnote(enota: Enota): Promise<Ura[]> {
  const { program, letnik, stevilka, deljeno } = enota.data;
  const lastne = await ureEnote(letnik, stevilka, program);
  const prevzete = await Promise.all(
    deljeno.map(async (d) =>
      (await ureEnote(letnik, d.enota, 'gim')).filter(
        (u) => u.data.ura >= d.od && u.data.ura <= d.do,
      ),
    ),
  );
  return [...prevzete.flat(), ...lastne].sort((a, b) => a.data.ura - b.data.ura);
}

/** Koliko ur enote je že napisanih. */
export function napredek(ure: Ura[]): { napisanih: number; skupaj: number } {
  return {
    napisanih: ure.filter((u) => !u.data.osnutek && !u.data.rezervirano).length,
    skupaj: ure.length,
  };
}

/** Sidro ure na strani enote. */
export function sidroUre(ura: number): string {
  return `ura-${ura}`;
}

/** Zadnji del poti do ure, npr. `ura-2`. */
export function slugUre(ura: number): string {
  return `ura-${ura}`;
}

/** `/1-letnik/raziskovanje-v-fiziki/ura-2/naloge/` */
export function potNalog(enota: Enota, ura: number): string {
  return pot(
    slugLetnika(enota.data.letnik, enota.data.program),
    slugEnote(enota.id),
    slugUre(ura),
    'naloge',
  );
}

/** Koliko nalog ima ura — prešteto iz vira, brez izrisa. */
export function stNalog(ura: Ura): number {
  return (ura.body?.match(/<Naloga[\s>]/g) ?? []).length;
}
