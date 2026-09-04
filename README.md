# Fizika — gradivo in prosojnice

Gradivo za pouk fizike v gimnaziji: **prosojnice za projekcijo** in **naloge**,
urejeni po letnikih in enotah. Stran je statična (Astro); enačbe se izrišejo že
ob gradnji, zato jih brskalnik ne računa.

## Zagon

```bash
npm install
npm run dev
```

Stran teče na `http://localhost:4321/`.

| Ukaz | Kaj naredi |
|---|---|
| `npm run dev` | razvojni strežnik s samodejnim osveževanjem |
| `npm run build` | statična gradnja v `dist/` |
| `npm run preview` | predogled zgrajene strani |
| `npm run check` | preverjanje tipov (`astro check`) |
| `npm run nova-ura` | ustvari datoteko nove ure iz predloge |

## Zgradba

```
src/
  content/
    enote/        sklopi (letnik, razpon ur, kriteriji uspešnosti)
    ure/          naloge posamezne ure (.mdx)
    prosojnice/   prosojnice posamezne ure (.mdx)
  components/     gradniki za vsebino (okvirji, graf, skice)
  layouts/        ovoja strani in prosojnic
  pages/          poti
  styles/         slog
```

- **Stran enote** (`/3-letnik/elektricni-naboj-in-polje/`) ima dve rubriki:
  *Prosojnice* (povezave na ure) in *Naloge* (iz datotek ur).
- **Prosojnice** (`/3-letnik/elektricni-naboj-in-polje/ura-2/prosojnice/`)
  poganja reveal.js.

## Pisanje prosojnic

Ena datoteka na uro v `src/content/prosojnice/<letnik>L-<enota>/ura-NN.mdx`.
Predloga z navodili je v `src/content/prosojnice/_predloga.mdx`.

- `---` v besedilu loči prosojnice;
- `<Opombe>` so opombe za predavatelja (na projekciji nevidne);
- enačbe: `$…$` in `$$…$$` (KaTeX), decimalna vejica kot `{,}`;
- graf kot slika: `<GrafSlika … />`;
- skice: inline `<svg class="skica" viewBox="…">`, pokončne še `skica--pokoncna`;
- dva stolpca: `<div class="stolpca">` z dvema otrokoma.

### Tipke med predstavitvijo

| Tipka | Kaj |
|---|---|
| → / ← | naslednja / prejšnja prosojnica |
| **S** | predavateljski pogled z opombami |
| **F** | cel zaslon |
| **Esc** | pregled vseh prosojnic |

**Izvoz v PDF:** naslovu dodaj `?print-pdf` in natisni iz brskalnika
(za opombe še `&showNotes=true`).

## Objava

Stran je statična, zato Vercel ne potrebuje posebnih nastavitev — zazna Astro,
požene `astro build` in postreže `dist/`. Ob dodani lastni domeni posodobi
`site` v `astro.config.mjs`.
