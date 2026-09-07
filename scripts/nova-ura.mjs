/**
 * Ustvari novo datoteko ure iz predloge.
 *
 *   npm run nova-ura -- --letnik 1 --enota 2 --ura 13 --naslov "Lega in premik"
 *
 * Neobvezno:
 *   --vrsta laboratorijska-vaja    (privzeto: obravnava)
 *   --ime lega-in-premik           (privzeto: iz naslova)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- argumenti ---------- */

const arg = (ime) => {
  const i = process.argv.indexOf(`--${ime}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const letnik = Number(arg('letnik'));
const enota = Number(arg('enota'));
const ura = Number(arg('ura'));
const naslov = arg('naslov');
const vrsta = arg('vrsta') ?? 'obravnava';

if (!letnik || !enota || !ura || !naslov) {
  console.error(
    'Uporaba:\n' +
      '  npm run nova-ura -- --letnik 1 --enota 2 --ura 13 --naslov "Lega in premik"\n\n' +
      'Neobvezno: --vrsta <uvod|obravnava|utrjevanje|laboratorijska-vaja|ponovitev|priprava|ocenjevanje|projekt>  --ime <kratko-ime>',
  );
  process.exit(1);
}

if (letnik < 1 || letnik > 4) {
  console.error('Letnik mora biti med 1 in 4.');
  process.exit(1);
}
if (ura < 1 || ura > 70) {
  console.error('Ura mora biti med 1 in 70.');
  process.exit(1);
}

/* ---------- ime datoteke ---------- */

const brezSumnikov = (s) =>
  s
    .toLowerCase()
    .replaceAll('č', 'c')
    .replaceAll('š', 's')
    .replaceAll('ž', 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ime = arg('ime') ?? brezSumnikov(naslov);
const mapa = resolve(koren, 'src/content/ure', `${letnik}L-${enota}`);
const pot = resolve(mapa, `ura-${String(ura).padStart(2, '0')}-${ime}.mdx`);

if (existsSync(pot)) {
  console.error(`Datoteka že obstaja: ${pot}`);
  process.exit(1);
}

/* ---------- vsebina ---------- */

const vsebina = `---
letnik: ${letnik}
enota: ${enota}
ura: ${ura}
naslov: ${naslov}
povzetek: V enem stavku, kaj dijak iz te ure odnese.
vrsta: ${vrsta}
cilji:
  - prvi cilj
termini:
  - prvi izraz
enacbe: []
osnutek: true
---

<Snov>

Tu pride razlaga.

</Snov>

<Naloge>

<Naloga st="${ura}.1">

Besedilo naloge.

<Resitev>

Postopek in rezultat.

</Resitev>

</Naloga>

<Domaca rok="do naslednje ure">

1. Prva naloga.

</Domaca>

</Naloge>
`;

await mkdir(mapa, { recursive: true });
await writeFile(pot, vsebina, 'utf8');

console.log(`Ustvarjeno: ${pot.replace(koren, '.')}`);
console.log('Vsi gradniki so opisani v src/content/ure/_predloga.mdx');
