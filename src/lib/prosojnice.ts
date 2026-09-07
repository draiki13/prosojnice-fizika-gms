import { getCollection, type CollectionEntry } from 'astro:content';
import { pot, slugEnote, slugLetnika, slugUre, type Enota } from './kurikulum';

export { slugUre };

export type Prosojnice = CollectionEntry<'prosojnice'>;

/** Vse prosojnice, urejene po letniku, enoti in uri. */
export async function vseProsojnice(): Promise<Prosojnice[]> {
  const vse = await getCollection('prosojnice');
  return vse.sort(
    (a, b) =>
      a.data.letnik - b.data.letnik ||
      a.data.enota - b.data.enota ||
      a.data.ura - b.data.ura,
  );
}

/** Prosojnice ene enote, urejene po uri. */
export async function prosojniceEnote(letnik: number, enota: number): Promise<Prosojnice[]> {
  const vse = await getCollection(
    'prosojnice',
    (p) => p.data.letnik === letnik && p.data.enota === enota,
  );
  return vse.sort((a, b) => a.data.ura - b.data.ura);
}

/** `/3-letnik/elektricni-naboj-in-polje/ura-2/prosojnice/` */
export function potProsojnic(enota: Enota, ura: number): string {
  return pot(slugLetnika(enota.data.letnik), slugEnote(enota.id), slugUre(ura), 'prosojnice');
}
