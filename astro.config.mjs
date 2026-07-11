// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// GitHub Pages serves project sites from a /<repo-name>/ subpath, so the CI
// build sets GITHUB_PAGES=true to point `site`/`base` there. Local and VPS
// production builds are unaffected and keep serving from the domain root.
const isGithubPages = process.env.GITHUB_PAGES === 'true';

// https://astro.build/config
export default defineConfig({
  site: isGithubPages ? 'https://cocacola099.github.io/tripcamps-trekker' : 'https://tripcamps.com',
  base: isGithubPages ? '/tripcamps-trekker' : '/',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap(), mdx()]
});