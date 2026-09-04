/**
 * Enkratno ogrodje: ustvari datoteke enot za 2.–4. letnik in za vsako enoto,
 * ki še nima nobene ure, doda predlogo prve ure.
 *
 * Poganjaj z: node scripts/zgradi-ogrodje.mjs
 * Obstoječih datotek NE prepiše.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPA_ENOT = resolve(koren, 'src/content/enote');
const MAPA_UR = resolve(koren, 'src/content/ure');

/* -------------------------------------------------------------------------
   Razporeditev tem po letnikih.

   1. letnik izhaja iz letne učne priprave (dokumentacija/03_...).
   2.–4. letnik je PREDLOG po zaporedju tem iz učnega načrta — letnih priprav
   zanje še ni. Ko jih napišeš, popravi razpone ur in naslove.
   ------------------------------------------------------------------------- */

const ENOTE = [
  // ---- 2. letnik ----
  {
    letnik: 2,
    stevilka: 1,
    ime: 'gibalna-kolicina-in-energija',
    naslov: 'Gibalna količina in energija',
    podnaslov: 'Sunek sile, izrek o gibalni količini, delo, moč in ohranitev energije.',
    ureOd: 1,
    ureDo: 20,
    teme: ['Izrek o gibalni količini', 'Delo in energija'],
    kriteriji: [
      'uporabil izrek o gibalni količini pri trkih;',
      'izračunal delo sile in moč;',
      'uporabil zakon o ohranitvi mehanske energije.',
    ],
    prvaUra: 'Sunek sile in gibalna količina',
  },
  {
    letnik: 2,
    stevilka: 2,
    ime: 'vrtenje-in-tekocine',
    naslov: 'Vrtenje togega telesa in tekočine',
    podnaslov: 'Vztrajnostni moment, pretakanje tekočin in njihove lastnosti.',
    ureOd: 21,
    ureDo: 34,
    teme: ['Vrtenje togega telesa', 'Tekočine'],
    kriteriji: [
      'opisal vrtenje togega telesa okoli stalne osi;',
      'uporabil kontinuitetno enačbo in Bernoullijevo enačbo;',
      'razložil pojave, povezane s površinsko napetostjo in viskoznostjo.',
    ],
    prvaUra: 'Vrtenje togega telesa okoli stalne osi',
  },
  {
    letnik: 2,
    stevilka: 3,
    ime: 'zgradba-snovi-in-temperatura',
    naslov: 'Zgradba snovi in temperatura',
    podnaslov: 'Od gibanja molekul do temperature, raztezanja in idealnega plina.',
    ureOd: 35,
    ureDo: 50,
    teme: ['Zgradba snovi in temperatura'],
    kriteriji: [
      'razložil temperaturo z gibanjem molekul;',
      'izračunal temperaturno raztezanje trdnih snovi in tekočin;',
      'uporabil plinsko enačbo.',
    ],
    prvaUra: 'Mikroskopska zgradba snovi',
  },
  {
    letnik: 2,
    stevilka: 4,
    ime: 'notranja-energija-in-toplota',
    naslov: 'Notranja energija in toplota',
    podnaslov: 'Fazni prehodi, prenos toplote in oba zakona termodinamike.',
    ureOd: 51,
    ureDo: 70,
    teme: ['Notranja energija in toplota'],
    kriteriji: [
      'izračunal toploto pri segrevanju in faznih prehodih;',
      'opisal tri načine prenosa toplote;',
      'uporabil prvi zakon termodinamike.',
    ],
    prvaUra: 'Fazni prehodi',
  },

  // ---- 3. letnik ----
  {
    letnik: 3,
    stevilka: 1,
    ime: 'elektricni-naboj-in-polje',
    naslov: 'Električni naboj in električno polje',
    podnaslov: 'Naboj, Coulombov zakon, električno polje, napetost in kondenzator.',
    ureOd: 1,
    ureDo: 17,
    teme: ['Električni naboj in električno polje'],
    kriteriji: [
      'uporabil Coulombov zakon;',
      'narisal in analiziral silnice električnega polja;',
      'povezal napetost z delom električne sile;',
      'izračunal kapacitivnost kondenzatorja.',
    ],
    prvaUra: 'Električni naboj',
  },
  {
    letnik: 3,
    stevilka: 2,
    ime: 'elektricni-tok',
    naslov: 'Električni tok',
    podnaslov: 'Tok, napetost, upor, vezave upornikov in električna moč.',
    ureOd: 18,
    ureDo: 34,
    teme: ['Električni tok'],
    kriteriji: [
      'uporabil Ohmov zakon;',
      'izračunal nadomestni upor zaporedne in vzporedne vezave;',
      'izračunal električno moč in porabljeno energijo.',
    ],
    prvaUra: 'Električni tok, napetost in upor',
  },
  {
    letnik: 3,
    stevilka: 3,
    ime: 'magnetno-polje-in-indukcija',
    naslov: 'Magnetno polje in indukcija',
    podnaslov: 'Magnetno polje, magnetna sila, inducirana napetost in transformator.',
    ureOd: 35,
    ureDo: 54,
    teme: ['Magnetno polje', 'Indukcija'],
    kriteriji: [
      'določil smer in velikost magnetne sile na vodnik in na naboj;',
      'uporabil indukcijski zakon;',
      'razložil delovanje transformatorja.',
    ],
    prvaUra: 'Magnetno polje',
  },
  {
    letnik: 3,
    stevilka: 4,
    ime: 'nihanje',
    naslov: 'Nihanje',
    podnaslov: 'Sinusno nihanje, sile pri nihanju, vzmetno in nitno nihalo, energija.',
    ureOd: 55,
    ureDo: 70,
    teme: ['Nihanje'],
    kriteriji: [
      'opisal nihanje z amplitudo, nihajnim časom in frekvenco;',
      'uporabil enačbi za nihajni čas vzmetnega in nitnega nihala;',
      'opisal pretvarjanje energije pri nihanju.',
    ],
    prvaUra: 'Opis nihanja',
  },

  // ---- 4. letnik ----
  {
    letnik: 4,
    stevilka: 1,
    ime: 'valovanje',
    naslov: 'Valovanje',
    podnaslov: 'Transverzalno in longitudinalno valovanje, valovni pojavi, zvok.',
    ureOd: 1,
    ureDo: 18,
    teme: ['Valovanje'],
    kriteriji: [
      'povezal valovno dolžino, frekvenco in hitrost valovanja;',
      'opisal odboj, lom, uklon in interferenco;',
      'razložil nastanek stoječega valovanja in lastnosti zvoka.',
    ],
    prvaUra: 'Transverzalno valovanje',
  },
  {
    letnik: 4,
    stevilka: 2,
    ime: 'svetloba',
    naslov: 'Svetloba',
    podnaslov: 'Geometrijska optika, svetloba kot valovanje, energija in polarizacija.',
    ureOd: 19,
    ureDo: 36,
    teme: ['Svetloba'],
    kriteriji: [
      'uporabil zakon odboja in lomni zakon;',
      'narisal potek žarkov pri zrcalih in lečah;',
      'razložil uklon in interferenco svetlobe.',
    ],
    prvaUra: 'Odboj in lom svetlobe',
  },
  {
    letnik: 4,
    stevilka: 3,
    ime: 'atom-in-atomsko-jedro',
    naslov: 'Atom in atomsko jedro',
    podnaslov: 'Zgradba atoma, energijski nivoji, fotoefekt, radioaktivnost in jedrske reakcije.',
    ureOd: 37,
    ureDo: 56,
    teme: ['Atom', 'Atomsko jedro'],
    kriteriji: [
      'razložil črtaste spektre z energijskimi nivoji;',
      'uporabil enačbo za fotoefekt;',
      'opisal vrste radioaktivnega razpada in uporabil razpadni zakon.',
    ],
    prvaUra: 'Zgradba atoma',
  },
  {
    letnik: 4,
    stevilka: 4,
    ime: 'astronomija-in-matura',
    naslov: 'Astronomija in priprava na maturo',
    podnaslov: 'Sonce, zvezde in vesolje; nato sistematična ponovitev vseh štirih letnikov.',
    ureOd: 57,
    ureDo: 70,
    teme: ['Astronomija'],
    kriteriji: [
      'opisal zgradbo Osončja in razvoj zvezd;',
      'uporabil znanje iz vseh letnikov pri reševanju maturitetnih nalog;',
      'samostojno rešil maturitetno polo v predpisanem času.',
    ],
    prvaUra: 'Osončje in zvezde',
  },
];

/* ---------- pisanje ---------- */

const seznam = (naslov, vrednosti) =>
  vrednosti.length ? `${naslov}:\n${vrednosti.map((v) => `  - ${v}`).join('\n')}` : `${naslov}: []`;

function datotekaEnote(e) {
  return `---
letnik: ${e.letnik}
stevilka: ${e.stevilka}
naslov: ${e.naslov}
podnaslov: ${e.podnaslov}
ureOd: ${e.ureOd}
ureDo: ${e.ureDo}
${seznam('teme', e.teme)}
${seznam('kriteriji', e.kriteriji)}
stanje: osnutek
---

Uvodno besedilo enote še ni napisano.

> **Opomba za pripravo:** razpored ur v tem letniku je predlog po zaporedju tem
> iz učnega načrta. Ko bo napisana letna učna priprava za ${e.letnik}. letnik,
> popravi razpon ur in naslove enot.
`;
}

function datotekaUre(e) {
  return `---
letnik: ${e.letnik}
enota: ${e.stevilka}
ura: ${e.ureOd}
naslov: ${e.prvaUra}
povzetek: Vsebina te ure še ni napisana.
vrsta: obravnava
cilji: []
termini: []
enacbe: []
osnutek: true
---

{/* Predloga za uro. Celoten opis vseh gradnikov je v
    src/content/ure/_predloga.mdx — od tam kopiraj, kar potrebuješ. */}

<Snov>

Tu pride razlaga.

</Snov>

<Naloge>

Tu pridejo naloge.

<Domaca>

Tu pride domača naloga.

</Domaca>

</Naloge>
`;
}

let ustvarjenih = 0;
let preskocenih = 0;

for (const e of ENOTE) {
  const potEnote = resolve(MAPA_ENOT, `${e.letnik}L-${e.stevilka}-${e.ime}.md`);
  if (existsSync(potEnote)) {
    preskocenih++;
  } else {
    await writeFile(potEnote, datotekaEnote(e), 'utf8');
    ustvarjenih++;
    console.log(`enota   ${e.letnik}L-${e.stevilka}-${e.ime}.md`);
  }
}

// Vsaki enoti brez ur dodamo predlogo prve ure — tudi tistim iz 1. letnika.
const vseEnote = (await readdir(MAPA_ENOT)).filter((f) => !f.startsWith('_'));

for (const datoteka of vseEnote) {
  const [, letnik, stevilka] = datoteka.match(/^(\d+)L-(\d+)-/) ?? [];
  if (!letnik) continue;

  const mapa = resolve(MAPA_UR, `${letnik}L-${stevilka}`);
  const zeObstaja = existsSync(mapa) && (await readdir(mapa)).length > 0;
  if (zeObstaja) {
    preskocenih++;
    continue;
  }

  const e =
    ENOTE.find((x) => x.letnik === +letnik && x.stevilka === +stevilka) ??
    (await ostanekIzDatoteke(datoteka));
  if (!e) continue;

  await mkdir(mapa, { recursive: true });
  const ime = `ura-${String(e.ureOd).padStart(2, '0')}-predloga.mdx`;
  await writeFile(resolve(mapa, ime), datotekaUre(e), 'utf8');
  ustvarjenih++;
  console.log(`ura     ${letnik}L-${stevilka}/${ime}`);
}

/** Za enote 1. letnika, ki niso v tabeli zgoraj, preberemo podatke iz datoteke. */
async function ostanekIzDatoteke(datoteka) {
  const { readFile } = await import('node:fs/promises');
  const vsebina = await readFile(resolve(MAPA_ENOT, datoteka), 'utf8');
  const polje = (ime) => vsebina.match(new RegExp(`^${ime}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  const letnik = Number(polje('letnik'));
  const stevilka = Number(polje('stevilka'));
  const ureOd = Number(polje('ureOd'));
  if (!letnik || !stevilka || !ureOd) return null;
  return { letnik, stevilka, ureOd, prvaUra: 'Naslov ure' };
}

console.log(`\nUstvarjenih: ${ustvarjenih} · preskočenih (že obstajajo): ${preskocenih}`);
