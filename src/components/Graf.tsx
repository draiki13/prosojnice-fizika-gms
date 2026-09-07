/** @jsxImportSource preact */
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { prevediVarno, type Okolje, type Prevedeno } from '../lib/izraz';
import { decimalkeZaKorak, mejniki, stevilka, veljavno } from '../lib/stevila';
import './Graf.css';

/* =========================================================================
   Tipi — vse je preprost JSON, ker Astro lastnosti otoka serializira.
   Zato so formule **nizi** in ne funkcije.
   ========================================================================= */

export interface Os {
  /** Oznaka količine, npr. `"t"` ali `"v_T²"`. */
  oznaka: string;
  /** Enota brez oklepajev, npr. `"s"`, `"m/s"`, `"cm³"`. Izpiše se kot `t [s]`. */
  enota?: string;
  /** Meji osi. Če ju izpustiš, ju izračunamo iz podatkov ob privzetih drsnikih. */
  min?: number;
  max?: number;
  /**
   * Ime spremenljivke v formulah. Privzeto je `oznaka`, če je ta veljavno ime
   * (črke, števke, podčrtaj) — sicer `"x"`.
   */
  spremenljivka?: string;
  /** Približno število mejnikov na osi. */
  mejnikov?: number;
}

export interface Drsnik {
  /** Ime spremenljivke v formulah, npr. `"v"`. */
  id: string;
  /** Kar vidi dijak; privzeto `id`. */
  oznaka?: string;
  enota?: string;
  min: number;
  max: number;
  korak?: number;
  privzeto: number;
  /** Kratko pojasnilo pod drsnikom. */
  opis?: string;
}

export interface Krivulja {
  /** Formula kot niz, npr. `"x0 + v*t"`. Množenje je vedno eksplicitno. */
  izraz: string;
  oznaka?: string;
  /** 1–4 (barvna paleta) ali poljubna barva CSS. */
  barva?: number | string;
  crtkano?: boolean;
  debelina?: number;
  /**
   * Krivuljo rišemo samo na tem intervalu po osi x; privzeto čez ves graf.
   * Uporabno pri zvezah z asimptoto (npr. 1/r²), kjer naj se krivulja ne
   * dotakne navpične osi.
   */
  xOd?: number;
  xDo?: number;
}

export interface NizTock {
  x: number[];
  y: number[];
  /** Negotovost po x — enotna vrednost ali vrednost za vsako točko. */
  dx?: number | number[];
  /** Negotovost po y — enotna vrednost ali vrednost za vsako točko. */
  dy?: number | number[];
  oznaka?: string;
  barva?: number | string;
  /** Skozi točke nariše premico najboljšega prileganja. */
  premica?: boolean;
  /** Premico vsili skozi izhodišče (kadar velja: pri x = 0 je y = 0). */
  skoziIzhodisce?: boolean;
  /** Ob premici nariše trikotnik, iz katerega odčitamo strmino. */
  trikotnik?: boolean;
}

export interface GrafProps {
  naslov?: string;
  opis?: string;
  x: Os;
  y: Os;
  drsniki?: Drsnik[];
  krivulje?: Krivulja[];
  tocke?: NizTock[];
  /** Višina risbe v px; privzeto se prilagodi širini. */
  visina?: number;
  mreza?: boolean;
  /** Odčitavanje vrednosti z miško / dotikom. */
  odcitek?: boolean;
}

/* ========================================================================= */

const PALETA = [
  'var(--graf-krivulja-1)',
  'var(--graf-krivulja-2)',
  'var(--graf-krivulja-3)',
  'var(--graf-krivulja-4)',
];

function barvaIz(v: number | string | undefined, zaporedna: number): string {
  if (typeof v === 'string') return v;
  const i = typeof v === 'number' ? v - 1 : zaporedna;
  return PALETA[((i % PALETA.length) + PALETA.length) % PALETA.length]!;
}

function imeSpremenljivke(os: Os, rezerva: string): string {
  if (os.spremenljivka) return os.spremenljivka;
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(os.oznaka) ? os.oznaka : rezerva;
}

function zapisOsi(os: Os): string {
  return os.enota ? `${os.oznaka} [${os.enota}]` : os.oznaka;
}

function priNapaki(d: number | number[] | undefined, i: number): number {
  if (d === undefined) return 0;
  return typeof d === 'number' ? d : (d[i] ?? 0);
}

/** Premica najboljšega prileganja po metodi najmanjših kvadratov. */
function prileganje(
  x: number[],
  y: number[],
  skoziIzhodisce: boolean,
): { k: number; n: number } | null {
  const n = Math.min(x.length, y.length);
  if (n < 2) return null;

  if (skoziIzhodisce) {
    let xy = 0;
    let xx = 0;
    for (let i = 0; i < n; i++) {
      xy += x[i]! * y[i]!;
      xx += x[i]! * x[i]!;
    }
    if (xx === 0) return null;
    return { k: xy / xx, n: 0 };
  }

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i]!;
    sy += y[i]!;
    sxy += x[i]! * y[i]!;
    sxx += x[i]! * x[i]!;
  }
  const imenovalec = n * sxx - sx * sx;
  if (imenovalec === 0) return null;
  const k = (n * sxy - sx * sy) / imenovalec;
  return { k, n: (sy - k * sx) / n };
}

/* ========================================================================= */

export default function Graf(props: GrafProps): JSX.Element {
  const {
    naslov,
    opis,
    x: osX,
    y: osY,
    drsniki = [],
    krivulje = [],
    tocke = [],
    visina,
    mreza = true,
    odcitek = true,
  } = props;

  const spremX = imeSpremenljivke(osX, 'x');

  /* ---------- vrednosti drsnikov ---------- */

  const privzete = useMemo<Okolje>(
    () => Object.fromEntries(drsniki.map((d) => [d.id, d.privzeto])),
    [drsniki],
  );
  const [vrednosti, nastaviVrednosti] = useState<Okolje>(privzete);

  const nastaviEno = useCallback((id: string, v: number) => {
    nastaviVrednosti((prej) => ({ ...prej, [id]: v }));
  }, []);

  const spremenjeno = drsniki.some((d) => vrednosti[d.id] !== d.privzeto);

  /* ---------- prevedene formule (enkrat na izraz) ---------- */

  const prevedene = useMemo(() => {
    return krivulje.map((k) => {
      const { fn, napaka } = prevediVarno(k.izraz);
      return { ...k, fn, napaka };
    });
  }, [krivulje]);

  const napake = prevedene.map((k) => k.napaka).filter((n): n is string => n !== null);

  /* ---------- velikost risbe ---------- */

  const ovoj = useRef<HTMLDivElement>(null);
  const [sirina, nastaviSirino] = useState(640);

  useEffect(() => {
    const el = ovoj.current;
    if (!el) return;
    const opazovalec = new ResizeObserver(([vnos]) => {
      const w = vnos?.contentRect.width ?? 0;
      if (w > 0) nastaviSirino(w);
    });
    opazovalec.observe(el);
    return () => opazovalec.disconnect();
  }, []);

  const ozko = sirina < 420;
  const v = visina ?? Math.round(Math.min(Math.max(sirina * 0.62, 230), 400));
  const rob = {
    levo: ozko ? 46 : 58,
    desno: 14,
    zgoraj: 14,
    spodaj: ozko ? 44 : 48,
  };
  const pl = rob.levo;
  const pr = Math.max(pl + 10, sirina - rob.desno);
  const pt = rob.zgoraj;
  const pb = Math.max(pt + 10, v - rob.spodaj);

  /* ---------- meje osi ---------- */

  // Samodejne meje računamo ob **privzetih** vrednostih drsnikov, da graf
  // ob premikanju drsnika ne poskakuje.
  const meje = useMemo(() => {
    const xmin = osX.min ?? najdiMejo(tocke, 'x', 'min', 0);
    const xmax = osX.max ?? najdiMejo(tocke, 'x', 'max', 10);

    let ymin = osY.min;
    let ymax = osY.max;

    if (ymin === undefined || ymax === undefined) {
      let lo = Infinity;
      let hi = -Infinity;

      for (const t of tocke) {
        for (let i = 0; i < t.y.length; i++) {
          const d = priNapaki(t.dy, i);
          lo = Math.min(lo, t.y[i]! - d);
          hi = Math.max(hi, t.y[i]! + d);
        }
      }

      const okolje: Okolje = { ...privzete };
      for (const k of prevedene) {
        for (let i = 0; i <= 100; i++) {
          okolje[spremX] = xmin + ((xmax - xmin) * i) / 100;
          const y = k.fn(okolje);
          if (Number.isFinite(y)) {
            lo = Math.min(lo, y);
            hi = Math.max(hi, y);
          }
        }
      }

      if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
        lo = 0;
        hi = 1;
      }
      if (lo === hi) {
        lo -= 1;
        hi += 1;
      }
      const zracnost = (hi - lo) * 0.08;
      ymin = ymin ?? lo - zracnost;
      ymax = ymax ?? hi + zracnost;
    }

    return { xmin, xmax, ymin, ymax };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osX.min, osX.max, osY.min, osY.max, tocke, prevedene, privzete, spremX]);

  const { xmin, xmax, ymin, ymax } = meje;

  const X = useCallback(
    (val: number) => pl + ((val - xmin) / (xmax - xmin)) * (pr - pl),
    [pl, pr, xmin, xmax],
  );
  const Y = useCallback(
    (val: number) => pb - ((val - ymin) / (ymax - ymin)) * (pb - pt),
    [pb, pt, ymin, ymax],
  );

  /* ---------- mejniki ---------- */

  const mejnikiX = useMemo(
    () => mejniki(xmin, xmax, osX.mejnikov ?? (ozko ? 4 : 7)),
    [xmin, xmax, osX.mejnikov, ozko],
  );
  const mejnikiY = useMemo(
    () => mejniki(ymin, ymax, osY.mejnikov ?? (ozko ? 4 : 5)),
    [ymin, ymax, osY.mejnikov, ozko],
  );
  const decX = decimalkeZaKorak((mejnikiX[1] ?? 1) - (mejnikiX[0] ?? 0));
  const decY = decimalkeZaKorak((mejnikiY[1] ?? 1) - (mejnikiY[0] ?? 0));

  /* ---------- vzorčenje krivulj ---------- */

  const poti = useMemo(() => {
    const korakov = Math.max(80, Math.min(400, Math.round(pr - pl)));
    const okolje: Okolje = { ...vrednosti };

    return prevedene.map((k) => {
      let d = '';
      let risem = false;

      for (let i = 0; i <= korakov; i++) {
        const xv = xmin + ((xmax - xmin) * i) / korakov;

        // Zunaj predpisanega intervala krivulje ne rišemo.
        if ((k.xOd !== undefined && xv < k.xOd) || (k.xDo !== undefined && xv > k.xDo)) {
          risem = false;
          continue;
        }

        okolje[spremX] = xv;
        const yv = (k.fn as Prevedeno)(okolje);

        // Točke daleč izven okvira prekinemo — sicer se pri poteh z
        // navpično asimptoto nariše lažna navpičnica.
        const zunaj = !Number.isFinite(yv) || yv > ymax + (ymax - ymin) * 4 || yv < ymin - (ymax - ymin) * 4;

        if (zunaj) {
          risem = false;
          continue;
        }
        const px = X(xv).toFixed(1);
        const py = Y(yv).toFixed(1);
        d += `${risem ? 'L' : 'M'}${px},${py}`;
        risem = true;
      }
      return d;
    });
  }, [prevedene, vrednosti, xmin, xmax, ymin, ymax, X, Y, pr, pl, spremX]);

  /* ---------- prileganje premic ---------- */

  const premice = useMemo(
    () =>
      tocke.map((t) =>
        t.premica ? prileganje(t.x, t.y, t.skoziIzhodisce === true) : null,
      ),
    [tocke],
  );

  /* ---------- odčitavanje ---------- */

  const [kazalec, nastaviKazalec] = useState<{ x: number; y: number } | null>(null);

  const obPremiku = (e: PointerEvent & { currentTarget: SVGSVGElement }) => {
    if (!odcitek) return;
    const cilj = e.currentTarget;
    const okvir = cilj.getBoundingClientRect();
    // SVG rišemo v pravih pikslih, a brskalnik ga lahko vseeno skalira.
    const razmerje = cilj.clientWidth ? sirina / okvir.width : 1;
    const px = (e.clientX - okvir.left) * razmerje;
    const py = (e.clientY - okvir.top) * razmerje;
    if (px < pl || px > pr || py < pt || py > pb) {
      nastaviKazalec(null);
      return;
    }
    nastaviKazalec({
      x: xmin + ((px - pl) / (pr - pl)) * (xmax - xmin),
      y: ymin + ((pb - py) / (pb - pt)) * (ymax - ymin),
    });
  };

  const prvaKrivulja = prevedene[0];
  const odcitanaY =
    kazalec && prvaKrivulja
      ? prvaKrivulja.fn({ ...vrednosti, [spremX]: kazalec.x })
      : null;

  /* ---------- izris ---------- */

  const idNaslova = naslov ? `graf-${naslov.replace(/\W+/g, '-').toLowerCase()}` : undefined;

  return (
    <figure class="graf">
      {(naslov || opis) && (
        <div class="graf__glava">
          {naslov && (
            <figcaption class="graf__naslov" id={idNaslova}>
              {naslov}
            </figcaption>
          )}
          {opis && <p class="graf__opis">{opis}</p>}
        </div>
      )}

      {napake.length > 0 && (
        <p class="graf__napaka">Napaka v formuli: {napake.join(' · ')}</p>
      )}

      <div class="graf__risba" ref={ovoj}>
        <svg
          width={sirina}
          height={v}
          viewBox={`0 0 ${sirina} ${v}`}
          role="img"
          aria-labelledby={idNaslova}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse') obPremiku(e);
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse') obPremiku(e);
          }}
          onPointerLeave={() => nastaviKazalec(null)}
        >
          {/* mreža */}
          {mreza && (
            <g stroke="var(--graf-mreza)" stroke-width="1">
              {mejnikiX.map((t) => (
                <line key={`mx${t}`} x1={X(t)} y1={pt} x2={X(t)} y2={pb} />
              ))}
              {mejnikiY.map((t) => (
                <line key={`my${t}`} x1={pl} y1={Y(t)} x2={pr} y2={Y(t)} />
              ))}
            </g>
          )}

          {/* osi — pri predznačenih razponih narišemo tudi ničelnici */}
          <g stroke="var(--graf-os)" stroke-width="1.25">
            <line x1={pl} y1={pt} x2={pl} y2={pb} />
            <line x1={pl} y1={pb} x2={pr} y2={pb} />
            {ymin < 0 && ymax > 0 && <line x1={pl} y1={Y(0)} x2={pr} y2={Y(0)} />}
            {xmin < 0 && xmax > 0 && <line x1={X(0)} y1={pt} x2={X(0)} y2={pb} />}
          </g>

          {/* mejniki */}
          <g class="graf-mejnik">
            {mejnikiX.map((t) => (
              <text key={`bx${t}`} x={X(t)} y={pb + 16} text-anchor="middle">
                {stevilka(t, decX)}
              </text>
            ))}
            {mejnikiY.map((t) => (
              <text
                key={`by${t}`}
                x={pl - 7}
                y={Y(t)}
                text-anchor="end"
                dominant-baseline="middle"
              >
                {stevilka(t, decY)}
              </text>
            ))}
          </g>

          {/* oznaki osi */}
          <text class="graf-os-oznaka" x={(pl + pr) / 2} y={v - 8} text-anchor="middle">
            {zapisOsi(osX)}
          </text>
          <text
            class="graf-os-oznaka"
            x={ozko ? 12 : 14}
            y={(pt + pb) / 2}
            text-anchor="middle"
            transform={`rotate(-90 ${ozko ? 12 : 14} ${(pt + pb) / 2})`}
          >
            {zapisOsi(osY)}
          </text>

          {/* krivulje */}
          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            {poti.map((d, i) => (
              <path
                key={`k${i}`}
                d={d}
                stroke={barvaIz(krivulje[i]?.barva, i)}
                stroke-width={krivulje[i]?.debelina ?? 2.5}
                stroke-dasharray={krivulje[i]?.crtkano ? '6 5' : undefined}
              />
            ))}
          </g>

          {/* premice najboljšega prileganja */}
          {premice.map((p, i) => {
            if (!p) return null;
            const t = tocke[i]!;
            const barva = barvaIz(t.barva, krivulje.length + i);
            const y1 = p.k * xmin + p.n;
            const y2 = p.k * xmax + p.n;
            return (
              <g key={`p${i}`}>
                <line
                  x1={X(xmin)}
                  y1={Y(y1)}
                  x2={X(xmax)}
                  y2={Y(y2)}
                  stroke={barva}
                  stroke-width="2"
                  stroke-dasharray="7 4"
                  opacity="0.85"
                />
                {t.trikotnik && <Trikotnik p={p} X={X} Y={Y} xmin={xmin} xmax={xmax} barva={barva} />}
              </g>
            );
          })}

          {/* merske točke z negotovostmi */}
          {tocke.map((t, ti) => {
            const barva = barvaIz(t.barva, krivulje.length + ti);
            return (
              <g key={`t${ti}`} stroke={barva} fill={barva}>
                {t.x.map((xv, i) => {
                  const yv = t.y[i];
                  if (yv === undefined || !Number.isFinite(xv) || !Number.isFinite(yv)) return null;
                  const dx = priNapaki(t.dx, i);
                  const dy = priNapaki(t.dy, i);
                  const cx = X(xv);
                  const cy = Y(yv);
                  return (
                    <g key={i}>
                      {dy > 0 && (
                        <>
                          <line x1={cx} y1={Y(yv - dy)} x2={cx} y2={Y(yv + dy)} stroke-width="1.25" />
                          <line x1={cx - 4} y1={Y(yv + dy)} x2={cx + 4} y2={Y(yv + dy)} stroke-width="1.25" />
                          <line x1={cx - 4} y1={Y(yv - dy)} x2={cx + 4} y2={Y(yv - dy)} stroke-width="1.25" />
                        </>
                      )}
                      {dx > 0 && (
                        <>
                          <line x1={X(xv - dx)} y1={cy} x2={X(xv + dx)} y2={cy} stroke-width="1.25" />
                          <line x1={X(xv - dx)} y1={cy - 4} x2={X(xv - dx)} y2={cy + 4} stroke-width="1.25" />
                          <line x1={X(xv + dx)} y1={cy - 4} x2={X(xv + dx)} y2={cy + 4} stroke-width="1.25" />
                        </>
                      )}
                      <circle cx={cx} cy={cy} r="3.5" stroke="var(--barva-ploskev)" stroke-width="1.5" />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* navzkrižje ob odčitavanju */}
          {kazalec && odcitanaY !== null && Number.isFinite(odcitanaY) && (
            <g pointer-events="none">
              <line
                x1={X(kazalec.x)}
                y1={pt}
                x2={X(kazalec.x)}
                y2={pb}
                stroke="var(--barva-besedilo-tisje)"
                stroke-width="1"
                stroke-dasharray="3 3"
              />
              <circle
                cx={X(kazalec.x)}
                cy={Y(odcitanaY)}
                r="4.5"
                fill="var(--barva-ploskev)"
                stroke={barvaIz(krivulje[0]?.barva, 0)}
                stroke-width="2.5"
              />
            </g>
          )}
        </svg>
      </div>

      <Legenda krivulje={krivulje} tocke={tocke} premice={premice} osX={osX} osY={osY} />

      {drsniki.length > 0 && (
        <div class="graf__drsniki">
          {drsniki.map((d) => {
            const vrednost = vrednosti[d.id] ?? d.privzeto;
            const korak = d.korak ?? (d.max - d.min) / 100;
            const dec = decimalkeZaKorak(korak);
            return (
              <label class="graf__drsnik" key={d.id}>
                <span class="graf__drsnik-oznaka">
                  {d.oznaka ?? d.id}
                  {d.opis ? ` — ${d.opis}` : ''}
                </span>
                <span class="graf__drsnik-vrednost">
                  {stevilka(vrednost, dec)}
                  {d.enota ? ` ${d.enota}` : ''}
                </span>
                <input
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={korak}
                  value={vrednost}
                  aria-label={`${d.oznaka ?? d.id}${d.enota ? ` v ${d.enota}` : ''}`}
                  onInput={(e) => nastaviEno(d.id, Number((e.target as HTMLInputElement).value))}
                />
              </label>
            );
          })}
        </div>
      )}

      {(odcitek || spremenjeno) && (
        <div class="graf__noga">
          <span class="graf__odcitek">
            {kazalec && odcitanaY !== null && Number.isFinite(odcitanaY) ? (
              <>
                {osX.oznaka} = <b>{stevilka(kazalec.x)}</b>
                {osX.enota ? ` ${osX.enota}` : ''} · {osY.oznaka} ={' '}
                <b>{stevilka(odcitanaY)}</b>
                {osY.enota ? ` ${osY.enota}` : ''}
              </>
            ) : odcitek && prevedene.length > 0 ? (
              'Podrsaj z miško ali se dotakni grafa za odčitek.'
            ) : (
              ''
            )}
          </span>
          {spremenjeno && (
            <button
              type="button"
              class="graf__ponastavi"
              onClick={() => nastaviVrednosti(privzete)}
            >
              Ponastavi
            </button>
          )}
        </div>
      )}
    </figure>
  );
}

/* ---------- trikotnik za odčitavanje strmine ---------- */

function Trikotnik({
  p,
  X,
  Y,
  xmin,
  xmax,
  barva,
}: {
  p: { k: number; n: number };
  X: (v: number) => number;
  Y: (v: number) => number;
  xmin: number;
  xmax: number;
  barva: string;
}): JSX.Element {
  const a = xmin + (xmax - xmin) * 0.35;
  const b = xmin + (xmax - xmin) * 0.7;
  const ya = p.k * a + p.n;
  const yb = p.k * b + p.n;
  return (
    <g stroke={barva} stroke-width="1.25" fill="none" opacity="0.9">
      <line x1={X(a)} y1={Y(ya)} x2={X(b)} y2={Y(ya)} />
      <line x1={X(b)} y1={Y(ya)} x2={X(b)} y2={Y(yb)} />
    </g>
  );
}

/* ---------- legenda ---------- */

function Legenda({
  krivulje,
  tocke,
  premice,
  osX,
  osY,
}: {
  krivulje: Krivulja[];
  tocke: NizTock[];
  premice: ({ k: number; n: number } | null)[];
  osX: Os;
  osY: Os;
}): JSX.Element | null {
  const enotaStrmine =
    osY.enota && osX.enota ? `${osY.enota}/${osX.enota}` : (osY.enota ?? '');

  const vnosi: JSX.Element[] = [];

  krivulje.forEach((k, i) => {
    if (!k.oznaka) return;
    vnosi.push(
      <span class="graf__legenda-vnos" key={`lk${i}`}>
        <span
          class="graf__legenda-crta"
          style={{
            borderTopColor: barvaIz(k.barva, i),
            borderTopStyle: k.crtkano ? 'dashed' : 'solid',
          }}
        />
        {k.oznaka}
      </span>,
    );
  });

  tocke.forEach((t, i) => {
    const p = premice[i];
    // Strmino izpišemo na dve veljavni mesti — toliko, kolikor jih dijak
    // dobi, če jo odčita z grafa. Več mest bi lagalo o natančnosti meritve.
    const besedilo = p
      ? `${t.oznaka ? `${t.oznaka} — ` : ''}strmina k = ${veljavno(p.k, 2)}${
          enotaStrmine ? ` ${enotaStrmine}` : ''
        }`
      : t.oznaka;
    if (!besedilo) return;
    vnosi.push(
      <span class="graf__legenda-vnos" key={`lt${i}`}>
        <span
          class="graf__legenda-crta"
          style={{
            borderTopColor: barvaIz(t.barva, krivulje.length + i),
            borderTopStyle: p ? 'dashed' : 'solid',
          }}
        />
        {besedilo}
      </span>,
    );
  });

  if (vnosi.length === 0) return null;
  return <div class="graf__legenda">{vnosi}</div>;
}

/* ---------- pomožno ---------- */

function najdiMejo(
  tocke: NizTock[],
  os: 'x' | 'y',
  vrsta: 'min' | 'max',
  rezerva: number,
): number {
  const vse = tocke.flatMap((t) => t[os]).filter(Number.isFinite);
  if (vse.length === 0) return rezerva;
  const v = vrsta === 'min' ? Math.min(...vse) : Math.max(...vse);
  const razpon = Math.max(...vse) - Math.min(...vse) || Math.abs(v) || 1;
  return vrsta === 'min' ? v - razpon * 0.08 : v + razpon * 0.08;
}
