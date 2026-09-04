/**
 * Datoteke v `src/content/prosojnice/` razreže na prosojnice.
 *
 * Avtor loči prosojnice z vodoravno črto (`---`), kot v Marpu. Vtičnik vsak
 * odsek med črtama ovije v `<section class="prosojnica">`, kar je oblika,
 * ki jo pričakuje reveal.js (`.reveal > .slides > section`).
 *
 * Deluje samo na datotekah iz mape `prosojnice`; snov in naloge ur ostanejo
 * nedotaknjene.
 */
export default function rehypeProsojnice() {
  return (drevo, datoteka) => {
    const pot = String(datoteka?.path ?? datoteka?.history?.[0] ?? '').replace(/\\/g, '/');
    if (!pot.includes('/content/prosojnice/')) return;

    const uvoz = []; // uvozi in izvozi MDX ostanejo na vrhu datoteke
    const odseki = [];
    let trenutni = [];

    for (const otrok of drevo.children) {
      if (otrok.type === 'mdxjsEsm') {
        uvoz.push(otrok);
        continue;
      }
      if (otrok.type === 'element' && otrok.tagName === 'hr') {
        odseki.push(trenutni);
        trenutni = [];
        continue;
      }
      trenutni.push(otrok);
    }
    odseki.push(trenutni);

    const prosojnice = odseki
      .filter((o) => o.some((n) => !(n.type === 'text' && !n.value.trim())))
      .map((o) => ({
        type: 'element',
        tagName: 'section',
        properties: { className: ['prosojnica'] },
        children: o,
      }));

    drevo.children = [...uvoz, ...prosojnice];
  };
}
