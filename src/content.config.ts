import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Vrste ur — določajo oznako ob naslovu ure. */
export const VRSTE_UR = [
  'uvod',
  'obravnava',
  'utrjevanje',
  'laboratorijska-vaja',
  'ponovitev',
  'priprava',
  'ocenjevanje',
  'projekt',
] as const;

export const OZNAKE_VRST: Record<(typeof VRSTE_UR)[number], string> = {
  uvod: 'Uvod',
  obravnava: 'Obravnava',
  utrjevanje: 'Utrjevanje',
  'laboratorijska-vaja': 'Laboratorijska vaja',
  ponovitev: 'Ponovitev',
  priprava: 'Priprava na ocenjevanje',
  ocenjevanje: 'Ocenjevanje znanja',
  projekt: 'Projektno delo',
};

const enacba = z.object({
  /** Zapis v TeX, npr. `v = \\frac{s}{t}`. */
  tex: z.string(),
  /** Količine in enote. */
  kolicine: z.string().optional(),
  /** Kratko pojasnilo ali opomba. */
  opomba: z.string().optional(),
  /**
   * Temeljna enačba ure — izriše se večja, z barvnim robom in prva na seznamu.
   * Na uro naj bosta največ dve; sicer poudarek izgubi pomen.
   */
  poudarek: z.boolean().default(false),
});

/* ---------- enote (sklopi) ---------- */

const enote = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/enote' }),
  schema: z.object({
    letnik: z.number().int().min(1).max(4),
    /** Zaporedna številka enote znotraj letnika. */
    stevilka: z.number().int().min(1),
    naslov: z.string(),
    podnaslov: z.string().optional(),
    /** Razpon ur v letniku, npr. 1–12. */
    ureOd: z.number().int().min(1).max(70),
    ureDo: z.number().int().min(1).max(70),
    /** Teme učnega načrta, ki jih enota pokriva. */
    teme: z.array(z.string()).default([]),
    /** Kaj dijak zna po koncu enote — za pregled na vrhu strani. */
    kriteriji: z.array(z.string()).default([]),
    stanje: z.enum(['pripravljeno', 'v-pripravi', 'osnutek']).default('osnutek'),
  }),
});

/* ---------- ure ---------- */

const ure = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/ure' }),
  schema: z.object({
    letnik: z.number().int().min(1).max(4),
    /** Številka enote znotraj letnika — poveže uro z njeno enoto. */
    enota: z.number().int().min(1),
    /** Zaporedna ura v letniku (1–70). */
    ura: z.number().int().min(1).max(70),
    naslov: z.string(),
    /** Ena vrstica, ki se pokaže v kazalu. */
    povzetek: z.string().optional(),
    vrsta: z.enum(VRSTE_UR).default('obravnava'),
    /** Cilji, zapisani dijaku: „Ob koncu ure znaš …“ */
    cilji: z.array(z.string()).default([]),
    /** Novi izrazi, ki jih uvedemo v tej uri. */
    termini: z.array(z.string()).default([]),
    enacbe: z.array(enacba).default([]),
    /** Označi vsebino, ki je obvezna za maturante (`M:` v učnem načrtu). */
    matura: z.boolean().default(false),
    /** Ura še ni napisana — na strani se pokaže kot pripravljeno mesto. */
    osnutek: z.boolean().default(false),
  }),
});

/* ---------- prosojnice ---------- */

/**
 * Prosojnice za projekcijo — ena datoteka na uro, ločena od snovi.
 * Prosojnice loči `---`; `<Opombe>` so opombe za predavatelja.
 */
const prosojnice = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/prosojnice' }),
  schema: z.object({
    letnik: z.number().int().min(1).max(4),
    /** Številka enote znotraj letnika. */
    enota: z.number().int().min(1),
    /** Zaporedna ura v letniku (1–70). */
    ura: z.number().int().min(1).max(70),
    naslov: z.string(),
    podnaslov: z.string().optional(),
  }),
});

export const collections = { enote, ure, prosojnice };
