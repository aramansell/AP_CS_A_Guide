// @ts-check
import { defineConfig } from 'astro/config';
import { writePacingMd } from './src/integrations/pacing-md.mjs';

// GitHub Pages project site: served from https://aramansell.github.io/AP_CS_A_Guide/
// All internal links in content are relative, so the site also works at any
// other base path (or a custom domain) without changes.
export default defineConfig({
  site: 'https://aramansell.github.io',
  base: '/AP_CS_A_Guide',
  build: {
    // Keep the exact URLs the old static site had:
    //   /lessons/1.1a.html, /docs/unit-01/variables.html, ...
    format: 'file',
  },
  integrations: [writePacingMd()],
});
