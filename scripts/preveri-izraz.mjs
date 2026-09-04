/**
 * Preverjanje razčlenjevalnika izrazov.
 * Poganjaj z: node scripts/preveri-izraz.mjs
 */
import { prevedi, prevediVarno, spremenljivke } from '../src/lib/izraz.ts';

let ok = 0;
let padlo = 0;

function je(izraz, okolje, pricakovano, dopusti = 1e-9) {
  let dobljeno;
  try {
    dobljeno = prevedi(izraz)(okolje);
  } catch (e) {
    console.log(`✗ ${izraz} → napaka: ${e.message}`);
    padlo++;
    return;
  }
  const prav = Number.isNaN(pricakovano)
    ? Number.isNaN(dobljeno)
    : Math.abs(dobljeno - pricakovano) <= dopusti * Math.max(1, Math.abs(pricakovano));
  if (prav) {
    ok++;
  } else {
    console.log(`✗ ${izraz}  →  ${dobljeno}, pričakovano ${pricakovano}`);
    padlo++;
  }
}

/* osnovno */
je('1+2*3', {}, 7);
je('(1+2)*3', {}, 9);
je('10-3-2', {}, 5); // levo asociativno
je('2^3^2', {}, 512); // desno asociativno
je('-2^2', {}, -4); // unarni minus šibkeje od potence
je('-3*4', {}, -12);
je('7%3', {}, 1);
je('10/4', {}, 2.5);

/* spremenljivke */
je('x0 + v*t', { x0: 2, v: 3, t: 4 }, 14);
je('a*x^n', { a: 2, x: 3, n: 2 }, 18);
je('4*pi^2/g*l', { g: 9.8, l: 1 }, (4 * Math.PI ** 2) / 9.8);
je('2*pi*sqrt(l/g)', { l: 1, g: 9.8 }, 2 * Math.PI * Math.sqrt(1 / 9.8));
je('100*dx/x', { dx: 1, x: 2 }, 50);
je('2*u^(2/n)', { u: 4, n: 2 }, 8);

/* funkcije in konstante */
je('sin(0)', {}, 0);
je('cos(pi)', {}, -1);
je('ln(e)', {}, 1);
je('log(1000)', {}, 3);
je('sqrt(16)', {}, 4);
je('abs(-5)', {}, 5);
je('max(1,7,3)', {}, 7);
je('min(1,7,3)', {}, 1);
je('pow(2,10)', {}, 1024);
je('149*d', { d: 0.2 }, 29.8);

/* števila */
je('1e-3', {}, 0.001);
je('2.5E2', {}, 250);
je('.5+.5', {}, 1);
je('e', {}, Math.E); // `e` kot konstanta, ne eksponent

/* neznana spremenljivka → NaN (graf tak odsek preskoči) */
je('y+1', {}, NaN);

/* napake se ujamejo */
for (const slab of ['1+', '(1+2', 'neznana(3)', '1 $ 2', '']) {
  const { napaka } = prevediVarno(slab);
  if (napaka) {
    ok++;
  } else {
    console.log(`✗ «${slab}» bi moral javiti napako`);
    padlo++;
  }
}

/* varnost: brez dostopa do JS okolja */
for (const zlonamerno of ['constructor', 'globalThis', 'process']) {
  const { fn, napaka } = prevediVarno(zlonamerno);
  const v = napaka ? NaN : fn({});
  if (Number.isNaN(v)) {
    ok++;
  } else {
    console.log(`✗ «${zlonamerno}» je vrnil ${v}, pričakovan NaN`);
    padlo++;
  }
}

/* iskanje spremenljivk */
const najdene = spremenljivke('x0 + v*t + sin(pi)').sort();
if (JSON.stringify(najdene) === JSON.stringify(['t', 'v', 'x0'])) ok++;
else {
  console.log(`✗ spremenljivke() → ${JSON.stringify(najdene)}`);
  padlo++;
}

console.log(`\n${ok} v redu · ${padlo} padlo`);
process.exit(padlo === 0 ? 0 : 1);
