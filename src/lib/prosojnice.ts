import { getCollection, type CollectionEntry } from 'astro:content';
import { pot, slugEnote, slugLetnika, slugUre, type Enota, type Program } from './kurikulum';

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
export async function prosojniceEnote(
  letnik: number,
  enota: number,
  program: Program = 'gim',
): Promise<Prosojnice[]> {
  const vse = await getCollection(
    'prosojnice',
    (p) => p.data.letnik === letnik && p.data.enota === enota && p.data.program === program,
  );
  return vse.sort((a, b) => a.data.ura - b.data.ura);
}

/** Prosojnice vseh ur enote, tudi gimnazijskih, ki jih enota deli (`deljeno`). */
export async function vseProsojniceEnote(enota: Enota): Promise<Prosojnice[]> {
  const { program, letnik, stevilka, deljeno } = enota.data;
  const lastne = await prosojniceEnote(letnik, stevilka, program);
  const prevzete = await Promise.all(
    deljeno.map(async (d) =>
      (await prosojniceEnote(letnik, d.enota, 'gim')).filter(
        (p) => p.data.ura >= d.od && p.data.ura <= d.do,
      ),
    ),
  );
  return [...prevzete.flat(), ...lastne].sort((a, b) => a.data.ura - b.data.ura);
}

/** Pot do datoteke v mapi `public/`, npr. PDF, ki nadomesti prosojnice. */
export function potDatoteke(datoteka: string): string {
  const osnova = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${osnova}/${datoteka.replace(/^\//, '')}`;
}

/** `/3-letnik/elektricni-naboj-in-polje/ura-2/prosojnice/` */
export function potProsojnic(enota: Enota, ura: number): string {
  return pot(
    slugLetnika(enota.data.letnik, enota.data.program),
    slugEnote(enota.id),
    slugUre(ura),
    'prosojnice',
  );
}
