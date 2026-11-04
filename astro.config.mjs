// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// Hosting: GitHub Pages pod https://jbutton.github.io/nocny-kurs/
export default defineConfig({
  site: 'https://jbutton.github.io',
  base: '/nocny-kurs',
  trailingSlash: 'always',
  integrations: [
    svelte(),
    sitemap({
      i18n: { defaultLocale: 'pl', locales: { pl: 'pl-PL', en: 'en-US' } },
    }),
  ],
});
