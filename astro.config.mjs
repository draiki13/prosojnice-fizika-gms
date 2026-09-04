// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeTabele from './src/lib/rehype-tabele.mjs';
import rehypeProsojnice from './src/lib/rehype-prosojnice.mjs';

// https://astro.build/config
export default defineConfig({
  // Naslov objavljene strani (Vercel). Ko dodaš lastno domeno, jo zamenjaj tukaj.
  // `base` ni potreben, ker stran teče v korenu domene.
  site: 'https://prosojnice-fizika-gms.vercel.app',
  integrations: [mdx(), preact()],

  markdown: {
    // Enačbe se izrišejo ob gradnji strani (build-time).
    // Na strani ni nobenega JavaScripta za matematiko — le HTML in CSS.
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [rehypeKatex, { strict: false, trust: false }],
      rehypeTabele,
      // Prosojnice: `---` loči slajde (samo v `src/content/prosojnice/`).
      rehypeProsojnice,
    ],
    shikiConfig: { theme: 'github-light', wrap: true },
  },

  build: { inlineStylesheets: 'auto' },
});
