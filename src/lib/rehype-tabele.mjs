/**
 * Vsako preglednico ovije v `<div class="tabela-ovoj">`, da se na telefonu
 * pomika vodoravno namesto da razteguje stran.
 *
 * Avtorju vsebine tako ni treba pisati ničesar — piše navadne preglednice
 * v Markdownu.
 */
export default function rehypeTabele() {
  return (drevo) => {
    obisci(drevo, null, -1);
  };
}

function obisci(vozlisce, starsi, indeks) {
  if (!vozlisce || typeof vozlisce !== 'object') return;

  const otroci = vozlisce.children;
  if (Array.isArray(otroci)) {
    // Od zadaj naprej, ker med hojo zamenjujemo elemente.
    for (let i = otroci.length - 1; i >= 0; i--) {
      obisci(otroci[i], vozlisce, i);
    }
  }

  if (
    vozlisce.type === 'element' &&
    vozlisce.tagName === 'table' &&
    starsi &&
    indeks >= 0 &&
    !(starsi.type === 'element' && starsi.properties?.className?.includes?.('tabela-ovoj'))
  ) {
    starsi.children[indeks] = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['tabela-ovoj'], tabindex: 0, role: 'region' },
      children: [vozlisce],
    };
  }
}
