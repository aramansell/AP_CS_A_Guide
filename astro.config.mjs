// @ts-check
import { defineConfig } from 'astro/config';
import { writePacingMd } from './src/integrations/pacing-md.ts';

// GitHub Pages project site: served from https://aramansell.github.io/AP_CS_A_Guide/
// All internal links in content are relative, so the site also works at any
// other base path (or a custom domain) without changes.
export default defineConfig({
  site: 'https://aramansell.github.io',
  base: '/AP_CS_A_Guide',
  build: {
    // 'preserve' keeps the exact URLs the old static site had — the output
    // tree mirrors the source tree:
    //   lessons/1.1a.astro        -> /lessons/1.1a.html
    //   docs/unit-01/index.astro  -> /docs/unit-01/index.html
    //   pace.astro                -> /pace.html
    format: 'preserve',
  },
  // Match the 'preserve' format (no trailing-slash URLs anywhere).
  trailingSlash: 'never',
  integrations: [writePacingMd()],
});
