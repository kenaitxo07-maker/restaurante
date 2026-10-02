// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import site from './src/data/site.json' with { type: 'json' };

// La URL pública vive en site.json para cambiarla en un solo sitio.
export default defineConfig({
  site: site.url,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
  compressHTML: true,
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
