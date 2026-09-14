/** @jsxImportSource preact */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import Graf, { type Krivulja, type NizTock } from './Graf';
import { decimalkeZaKorak, stevilka, veljavno } from '../lib/stevila';
import './Izmerki.css';

/* =========================================================================
   Izmerki razreda — dijaki v preglednico vnesejo čase istega padca.
   Aplikacija nariše graf kot na prosojnicah ure 4. Vrednost povprečja,
   odstopanja in obe oceni absolutne napake so skriti, dokler jih učitelj ne
   odkrije.
   ========================================================================= */

const PRIMER = ['0,58', '0,72', '0,65', '0,51', '0,69', '0,77', '0,61', '0,55', '0,70', '0,63', '0,66', '0,59'];
const KLJUC_SHRAMBE = 'izmerki-razreda-preglednica';
const STEVILO = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;

/** Višina risbe v px — stalna, da se graf ob odkrivanju in drsniku ne spreminja. */
const VISINA_GRAFA = 390;

/* ---------- branje vnosa ---------- */

/** `null` za prazno celico, `NaN` za neberljivo. Decimalka je vejica ali pika. */
function preberi(niz: string): number | null {
  const k = niz.trim();
  if (!k) return null;
  return STEVILO.test(k) ? Number(k.replace(',', '.')) : NaN;
}

function decimalk(niz: string): number {
  return niz.trim().match(/[.,](\d+)$/)?.[1]?.length ?? 0;
}

/** Na koncu je vedno natanko ena prazna vrstica — vanjo vpišemo naslednji izmerek. */
function sPraznoVrstico(vrstice: string[]): string[] {
  const out = [...vrstice];
  while (out.length > 0 && out[out.length - 1]!.trim() === '') out.pop();
  out.push('');
  return out;
}

/* ---------- račun ---------- */

interface Statistika {
  n: number;
  vsota: number;
  povprecje: number;
  min: number;
  max: number;
  /** Pravilo razpona: (t_max − t_min) / 2. */
  razpon: number;
  /** Pravilo dveh tretjin: razdalja od povprečja, znotraj katere leži ⌈2n/3⌉ izmerkov. */
  dveTretjini: number;
  vPasu: number;
}

function izracunaj(v: number[]): Statistika | null {
  const n = v.length;
  if (n < 2) return null;
  const vsota = v.reduce((a, b) => a + b, 0);
  const povprecje = vsota / n;
  const razdalje = v.map((x) => Math.abs(x - povprecje)).sort((a, b) => a - b);
  // Majhen odbitek, da 2 · 12 / 3 = 8 ne postane 8,000000001 in s tem 9.
  const vPasu = Math.max(1, Math.ceil((2 * n) / 3 - 1e-9));
  const min = Math.min(...v);
  const max = Math.max(...v);
  return {
    n,
    vsota,
    povprecje,
    min,
    max,
    razpon: (max - min) / 2,
    dveTretjini: razdalje[vPasu - 1] ?? 0,
    vPasu,
  };
}

function zaokrozi(x: number, dec: number): number {
  const f = Math.pow(10, dec);
  return Math.round(x * f) / f;
}

/**
 * Zapis rezultata po dogovoru iz ure 4: negotovost na eno veljavno mesto
 * (če je to 1, obdržimo dve), povprečje na isto decimalno mesto.
 */
function zapis(povprecje: number, d: number): { sredina: string; negotovost: string } {
  if (!(d > 0)) return { sredina: stevilka(povprecje), negotovost: '0' };
  const eksponent = Math.floor(Math.log10(d));
  const prva = Math.floor(d / Math.pow(10, eksponent) + 1e-9);
  const dec = (prva === 1 ? 2 : 1) - 1 - eksponent;
  const prikaz = Math.max(0, dec);
  return {
    sredina: stevilka(zaokrozi(povprecje, dec), prikaz),
    negotovost: stevilka(zaokrozi(d, dec), prikaz),
  };
}

const relativna = (s: Statistika, d: number): string =>
  s.povprecje !== 0 && d > 0 ? `relativna napaka ≈ ${veljavno((d / Math.abs(s.povprecje)) * 100, 2)} %` : '';

/** Število kot izraz za graf; oklepaj zaradi morebitnega minusa. */
const izraz = (v: number): string => `(${String(v)})`;

const T_POVP = 't̄';

interface Odkrito {
  povprecje: boolean;
  odstopanja: boolean;
  razpon: boolean;
  dve: boolean;
}

/* ========================================================================= */

export default function Izmerki(): JSX.Element {
  const [vrstice, nastaviVrstice] = useState<string[]>(sPraznoVrstico(PRIMER));
  const [nalozeno, nastaviNalozeno] = useState(false);
  const [odkrito, nastaviOdkrito] = useState<Odkrito>({
    povprecje: false,
    odstopanja: false,
    razpon: false,
    dve: false,
  });
  const [drsnik, nastaviDrsnik] = useState(false);
  const [dt, nastaviDt] = useState(0);
  const [povecan, nastaviPovecan] = useState(false);
  const [visinaOkna, nastaviVisinoOkna] = useState(800);

  const polja = useRef<(HTMLInputElement | null)[]>([]);
  const [fokus, nastaviFokus] = useState<number | null>(null);

  /* Izmerke si zapomnimo v brskalniku; odkritja ne — ob vsakem odprtju so skrita. */
  useEffect(() => {
    try {
      const shranjeno = JSON.parse(localStorage.getItem(KLJUC_SHRAMBE) ?? 'null');
      if (Array.isArray(shranjeno) && shranjeno.every((v) => typeof v === 'string')) {
        nastaviVrstice(sPraznoVrstico(shranjeno));
      }
    } catch {}
    nastaviNalozeno(true);
  }, []);

  useEffect(() => {
    if (!nalozeno) return;
    try {
      localStorage.setItem(KLJUC_SHRAMBE, JSON.stringify(vrstice.filter((v) => v.trim() !== '')));
    } catch {}
  }, [vrstice, nalozeno]);

  useEffect(() => {
    if (fokus === null) return;
    polja.current[fokus]?.focus();
    nastaviFokus(null);
  }, [fokus, vrstice]);

  /* Povečan graf: čez vse okno, zapre ga Esc. */
  useEffect(() => {
    const obVelikosti = () => nastaviVisinoOkna(window.innerHeight);
    obVelikosti();
    window.addEventListener('resize', obVelikosti);
    return () => window.removeEventListener('resize', obVelikosti);
  }, []);

  useEffect(() => {
    if (!povecan) return;
    const obTipki = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nastaviPovecan(false);
    };
    document.addEventListener('keydown', obTipki);
    const prej = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', obTipki);
      document.body.style.overflow = prej;
    };
  }, [povecan]);

  /* ---------- podatki ---------- */

  const izmerki = useMemo(
    () =>
      vrstice
        .map((niz, i) => ({ st: i + 1, t: preberi(niz) }))
        .filter((z): z is { st: number; t: number } => z.t !== null && Number.isFinite(z.t)),
    [vrstice],
  );
  const s = useMemo(() => izracunaj(izmerki.map((z) => z.t)), [izmerki]);

  const decOdstopanj = Math.min(4, Math.max(0, ...vrstice.map(decimalk)) + 1);

  // Pri pravilu dveh tretjin označimo izmerke zunaj pasu in tistega, ki določa Δt.
  const meja23 = s ? s.dveTretjini * (1 + 1e-9) + 1e-12 : 0;
  const stMejnega = useMemo(() => {
    if (!s) return -1;
    let najblizji = -1;
    let razlika = Infinity;
    for (const z of izmerki) {
      const r = Math.abs(Math.abs(z.t - s.povprecje) - s.dveTretjini);
      if (r < razlika) {
        razlika = r;
        najblizji = z.st;
      }
    }
    return najblizji;
  }, [izmerki, s]);

  // Drsnik: korak je desetina reda velikosti razpona.
  const korak = s && s.razpon > 0 ? Math.pow(10, Math.floor(Math.log10(s.razpon)) - 1) : 0.01;
  const najvec = s ? Math.max(korak * 10, Math.ceil((s.razpon * 1.5) / korak) * korak) : 1;
  const dtPrikaz = Math.min(dt, najvec);

  /* ---------- urejanje preglednice ---------- */

  const spremeni = (i: number, vrednost: string) => {
    const kosi = vrednost
      .split(/[\s;]+/)
      .map((k) => k.replace(/[.,]+$/, ''))
      .filter(Boolean);
    nastaviVrstice((prej) => {
      // Prilepljen niz več števil razdelimo po vrsticah.
      if (kosi.length > 1) {
        nastaviFokus(i + kosi.length);
        return sPraznoVrstico([...prej.slice(0, i), ...kosi, ...prej.slice(i + 1)]);
      }
      const nove = [...prej];
      nove[i] = vrednost;
      return sPraznoVrstico(nove);
    });
  };

  const odstrani = (i: number) => {
    nastaviVrstice((prej) => sPraznoVrstico(prej.filter((_, j) => j !== i)));
  };

  const obTipki = (i: number, e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nastaviFokus(Math.min(i + 1, vrstice.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nastaviFokus(Math.max(0, i - 1));
    }
  };

  const preklopi = (kaj: keyof Odkrito) => nastaviOdkrito((o) => ({ ...o, [kaj]: !o[kaj] }));

  /* ---------- izris ---------- */

  const orodjaGrafa = (
    <>
      <label class="izmerki__stikalo">
        <input type="checkbox" checked={drsnik} onChange={() => nastaviDrsnik((d) => !d)} />
        Drsnik Δt
      </label>
      <button type="button" class="izmerki__gumb" onClick={() => nastaviPovecan((p) => !p)}>
        {povecan ? 'Zapri povečavo' : 'Povečaj graf'}
      </button>
    </>
  );

  return (
    <div class="izmerki">
      <div class="izmerki__orodja izmerki__orodja--tabela">
        <button type="button" class="izmerki__gumb" onClick={() => nastaviVrstice(sPraznoVrstico(PRIMER))}>
          Primer
        </button>
        <button
          type="button"
          class="izmerki__gumb"
          onClick={() => {
            nastaviVrstice(['']);
            nastaviFokus(0);
          }}
        >
          Počisti
        </button>
      </div>

      <div class="izmerki__orodja izmerki__orodja--graf">{!povecan && orodjaGrafa}</div>

      <div class="izmerki__tabela-ovoj">
        <div class="izmerki__tabela-drsno">
          <table class="izmerki__tabela">
            <colgroup>
              <col class="izmerki__stolpec-st" />
              <col />
              <col />
              <col class="izmerki__stolpec-gumb" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" class="izmerki__st">
                  #
                </th>
                <th scope="col" class="izmerki__stevilo">
                  t [s]
                </th>
                <th scope="col" class="izmerki__stevilo">
                  |t − {T_POVP}| [s]
                </th>
                <th scope="col" class="izmerki__gumb-celica">
                  <GumbOko
                    odkrito={odkrito.odstopanja}
                    kaj="odstopanja od povprečja"
                    onClick={() => preklopi('odstopanja')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {vrstice.map((niz, i) => {
                const t = preberi(niz);
                const neberljivo = t !== null && !Number.isFinite(t);
                const odstopanje = s && t !== null && Number.isFinite(t) ? Math.abs(t - s.povprecje) : null;
                const zunaj = odkrito.dve && odstopanje !== null && odstopanje > meja23;
                const mejni = odkrito.dve && odstopanje !== null && i + 1 === stMejnega;
                return (
                  <tr key={i} class={mejni ? 'je-mejni' : zunaj ? 'je-zunaj' : undefined}>
                    <td class="izmerki__st">{i + 1}</td>
                    <td class="izmerki__vnos">
                      <input
                        ref={(el) => {
                          polja.current[i] = el;
                        }}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={niz}
                        aria-label={`izmerek ${i + 1} v sekundah`}
                        aria-invalid={neberljivo}
                        onInput={(e) => spremeni(i, (e.target as HTMLInputElement).value)}
                        onKeyDown={(e) => obTipki(i, e)}
                      />
                    </td>
                    <td class={`izmerki__stevilo izmerki__odstopanje${odkrito.odstopanja ? '' : ' je-skrito'}`}>
                      {odkrito.odstopanja && odstopanje !== null ? stevilka(odstopanje, decOdstopanj) : ''}
                    </td>
                    <td class="izmerki__gumb-celica">
                      {niz !== '' && (
                        <button
                          type="button"
                          class="izmerki__odstrani"
                          aria-label={`odstrani izmerek ${i + 1}`}
                          title="Odstrani izmerek"
                          onClick={() => odstrani(i)}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div
        class={`izmerki__graf-okvir${povecan ? ' je-povecan' : ''}`}
        role={povecan ? 'dialog' : undefined}
        aria-modal={povecan ? true : undefined}
        aria-label={povecan ? 'Povečan graf' : undefined}
      >
        {povecan && <div class="izmerki__orodja izmerki__orodja--povecava">{orodjaGrafa}</div>}

        {s ? (
          <GrafIzmerkov
            s={s}
            izmerki={izmerki}
            odkrito={odkrito}
            drsnik={drsnik}
            dt={dtPrikaz}
            visina={povecan ? Math.max(VISINA_GRAFA, visinaOkna - 260) : VISINA_GRAFA}
          />
        ) : (
          <p class="izmerki__prazno">Graf se nariše, ko sta vpisana vsaj dva izmerka.</p>
        )}

        <div class={`graf__drsniki izmerki__drsnik${drsnik && s ? '' : ' je-onemogoceno'}`}>
          <label class="graf__drsnik">
            <span class="graf__drsnik-oznaka">Δt — pas okoli povprečja</span>
            <span class="graf__drsnik-vrednost">{stevilka(dtPrikaz, decimalkeZaKorak(korak))} s</span>
            <input
              type="range"
              min={0}
              max={najvec}
              step={korak}
              value={dtPrikaz}
              disabled={!drsnik || !s}
              aria-label="Δt v sekundah"
              onInput={(e) => nastaviDt(Number((e.target as HTMLInputElement).value))}
            />
          </label>
        </div>
      </div>

      <div class="izmerki__rezultati">
        {s ? (
          <>
            <Kartica
              naslov="Povprečje"
              vrsta="povprecje"
              odkrito={odkrito.povprecje}
              onPreklop={() => preklopi('povprecje')}
            >
              <p class="izmerki__racun">
                {T_POVP} = {stevilka(s.vsota, 2)} s / {s.n}
              </p>
              <p class="izmerki__zapis">
                {T_POVP} = {veljavno(s.povprecje, 4)} s
              </p>
            </Kartica>

            <Kartica
              naslov="Pravilo razpona"
              vrsta="razpon"
              odkrito={odkrito.razpon}
              onPreklop={() => preklopi('razpon')}
            >
              <p class="izmerki__razlaga">V pasu so vsi izmerki.</p>
              <p class="izmerki__racun">
                Δt = ({stevilka(s.max)} s − {stevilka(s.min)} s) / 2 = {veljavno(s.razpon, 3)} s
              </p>
              <Zapis s={s} d={s.razpon} />
            </Kartica>

            <Kartica
              naslov="Pravilo dveh tretjin"
              vrsta="dve"
              odkrito={odkrito.dve}
              onPreklop={() => preklopi('dve')}
            >
              <p class="izmerki__razlaga">
                V pasu mora biti {s.vPasu} od {s.n} izmerkov. Δt je {s.vPasu}. najmanjše odstopanje od
                povprečja — v preglednici je označeno.
              </p>
              <p class="izmerki__racun">Δt ≈ {veljavno(s.dveTretjini, 3)} s</p>
              <Zapis s={s} d={s.dveTretjini} />
            </Kartica>
          </>
        ) : (
          <p class="izmerki__opozorilo">Vnesite vsaj dva izmerka.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- gradniki ---------- */

function GumbOko({
  odkrito,
  kaj,
  onClick,
}: {
  odkrito: boolean;
  kaj: string;
  onClick: () => void;
}): JSX.Element {
  const napis = `${odkrito ? 'Skrij' : 'Pokaži'} ${kaj}`;
  return (
    <button
      type="button"
      class={`izmerki__oko${odkrito ? ' je-odkrito' : ''}`}
      aria-pressed={odkrito}
      aria-label={napis}
      title={napis}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        {odkrito ? (
          <>
            <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19" />
            <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </>
        ) : (
          <>
            <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}

function Kartica({
  naslov,
  vrsta,
  odkrito,
  onPreklop,
  children,
}: {
  naslov: string;
  vrsta: 'povprecje' | 'razpon' | 'dve';
  odkrito: boolean;
  onPreklop: () => void;
  children: ComponentChildren;
}): JSX.Element {
  return (
    <section class={`izmerki__pravilo izmerki__pravilo--${vrsta}`}>
      <div class="izmerki__pravilo-glava">
        <h2>{naslov}</h2>
        <GumbOko odkrito={odkrito} kaj={naslov.toLowerCase()} onClick={onPreklop} />
      </div>
      {odkrito && <div class="izmerki__pravilo-telo">{children}</div>}
    </section>
  );
}

function Zapis({ s, d }: { s: Statistika; d: number }): JSX.Element {
  const z = zapis(s.povprecje, d);
  return (
    <>
      <p class="izmerki__zapis">
        t = ({z.sredina} ± {z.negotovost}) s
      </p>
      <p class="izmerki__razlaga">{relativna(s, d)}</p>
    </>
  );
}

/* ---------- graf ---------- */

function GrafIzmerkov({
  s,
  izmerki,
  odkrito,
  drsnik,
  dt,
  visina,
}: {
  s: Statistika;
  izmerki: { st: number; t: number }[];
  odkrito: Odkrito;
  drsnik: boolean;
  dt: number;
  visina: number;
}): JSX.Element {
  const zadnji = izmerki[izmerki.length - 1]?.st ?? s.n;
  // Nad največjim izmerkom pustimo več prostora — tam je legenda.
  const razpon = s.max - s.min || Math.abs(s.povprecje) * 0.2 || 1;
  const robSpodaj = razpon * 0.3;
  const robZgoraj = razpon * 0.6;

  // Črta povprečja je vedno na grafu; vrednost v legendi pokažemo šele ob odkritju.
  const krivulje: Krivulja[] = [
    {
      izraz: izraz(s.povprecje),
      oznaka: odkrito.povprecje ? `povprečje ${veljavno(s.povprecje, 3)} s` : 'povprečje',
      barva: 2,
    },
  ];

  const pas = (d: number, napis: string, barva: number) => {
    krivulje.push({ izraz: izraz(s.povprecje + d), oznaka: napis, barva, crtkano: true });
    krivulje.push({ izraz: izraz(s.povprecje - d), barva, crtkano: true });
  };
  if (drsnik) pas(dt, 'pas ± Δt', 1);
  if (odkrito.razpon) pas(s.razpon, `pravilo razpona ± ${zapis(s.povprecje, s.razpon).negotovost} s`, 3);
  if (odkrito.dve) pas(s.dveTretjini, `pravilo 2/3 ± ${zapis(s.povprecje, s.dveTretjini).negotovost} s`, 4);

  // Točke brez oznake — v legendi so le črte.
  const tocke: NizTock[] = [{ x: izmerki.map((z) => z.st), y: izmerki.map((z) => z.t), barva: 1 }];

  return (
    <Graf
      naslov="Izmerki razreda"
      x={{ oznaka: 'meritev', min: 0, max: zadnji + 1, mejnikov: Math.min(zadnji + 1, 10) }}
      y={{ oznaka: 't', enota: 's', min: s.min - robSpodaj, max: s.max + robZgoraj, mejnikov: 8 }}
      tocke={tocke}
      krivulje={krivulje}
      visina={visina}
      odcitek={false}
      oznakaYNaVrhu
      polmerTock={6}
    />
  );
}
