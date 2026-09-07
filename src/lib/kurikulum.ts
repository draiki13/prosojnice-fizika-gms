import { getCollection, type CollectionEntry } from 'astro:content';

export type Enota = CollectionEntry<'enote'>;
export type Ura = CollectionEntry<'ure'>;

export const LETNIKI = [1, 2, 3, 4] as const;

/** `1` → `"1. letnik"` */
export function imeLetnika(n: number): string {
  return `${n}. letnik`;
}

/** `1` → `"1-letnik"` */
export function slugLetnika(n: number): string {
  return `${n}-letnik`;
}

/** `"1L-1-raziskovanje-v-fiziki"` → `"raziskovanje-v-fiziki"` (Astro id-je zniža) */
export function slugEnote(id: string): string {
  return id.replace(/^\d+l-\d+-/i, '');
}

/** Sestavi naslov znotraj strani in upošteva `base` iz nastavitev. */
export function pot(...deli: (string | number)[]): string {
  const osnova = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${osnova}/${deli.join('/')}/`.replace(/\/{2,}/g, '/');
}

export function potLetnika(letnik: number): string {
  return pot(slugLetnika(letnik));
}

export function potEnote(enota: Enota): string {
  return pot(slugLetnika(enota.data.letnik), slugEnote(enota.id));
}

/** Enote danega letnika, urejene po zaporedni številki. */
export async function enoteLetnika(letnik: number): Promise<Enota[]> {
  const vse = await getCollection('enote', (e) => e.data.letnik === letnik);
  return vse.sort((a, b) => a.data.stevilka - b.data.stevilka);
}

/** Vse enote vseh letnikov, urejene. */
export async function vseEnote(): Promise<Enota[]> {
  const vse = await getCollection('enote');
  return vse.sort(
    (a, b) => a.data.letnik - b.data.letnik || a.data.stevilka - b.data.stevilka,
  );
}

/** Ure ene enote, urejene po zaporedni številki ure. */
export async function ureEnote(letnik: number, enota: number): Promise<Ura[]> {
  const vse = await getCollection(
    'ure',
    (u) => u.data.letnik === letnik && u.data.enota === enota,
  );
  return vse.sort((a, b) => a.data.ura - b.data.ura);
}

/** Koliko ur enote je že napisanih. */
export function napredek(ure: Ura[]): { napisanih: number; skupaj: number } {
  return {
    napisanih: ure.filter((u) => !u.data.osnutek).length,
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
  return pot(slugLetnika(enota.data.letnik), slugEnote(enota.id), slugUre(ura), 'naloge');
}

/** Koliko nalog ima ura — prešteto iz vira, brez izrisa. */
export function stNalog(ura: Ura): number {
  return (ura.body?.match(/<Naloga[\s>]/g) ?? []).length;
}
