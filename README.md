# Tripcamps Tekker

The Tripcamps marketing/discovery site: explore trekking destinations around the world, read full itineraries, and get in touch to have Tripcamps organise the trip. Phase 1 covers **India** with 30 trek guides across 7 regions. `/shop` is a "coming soon" placeholder for a future trekking-books store.

Built with [Astro](https://astro.build) (static output), Tailwind CSS v4, and Markdown content collections — no backend required to run.

## Project structure

```
src/
  content/
    treks/*.md       one file per trek (30) — itinerary, stats, images, SEO fields
    regions/*.md      one file per region (7) — intro copy + hero image
  content.config.ts    Zod schema for the two collections above
  data/
    attributions.json  photo credit metadata for every sourced image
    regions.ts          region display order + difficulty list
  components/          Header, Footer, SEO, TrekCard, RegionCard, etc.
  layouts/BaseLayout.astro
  pages/
    index.astro         homepage
    treks/index.astro   all-treks listing with client-side filter
    treks/[slug].astro  trek detail page (dynamic route over the treks collection)
    regions/index.astro
    regions/[region].astro
    shop.astro           "coming soon"
    contact.astro
    about.astro
public/
  images/                downloaded hero photos (treks/, regions/, site/)
scripts/
  fetch-images.mjs                  one-off Wikimedia Commons image sourcing script
  fetch-images-wiki-fallback.mjs    fallback pass via Wikipedia lead images
  fetch-images-category.mjs         precision pass via Commons categories
  image-targets.json                search terms per image slug
```

The `scripts/` folder is **not** part of the build — it was used once to source free-licensed photos from Wikimedia Commons into `public/images/` and `src/data/attributions.json`. Re-run it only if you need to re-source or add images for new content.

## Adding a new trek

Add one Markdown file to `src/content/treks/`, following the frontmatter shape in `src/content.config.ts` (title, region, difficulty, itinerary, heroImage, SEO fields, etc.) — copy an existing trek file as a template. The page at `/treks/<filename-without-extension>/` is generated automatically.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Build the static site to `./dist/` |
| `npm run preview` | Preview the production build locally |

## SEO

Every page sets a unique title, meta description, canonical URL, Open Graph/Twitter tags, and JSON-LD (`Organization` on the homepage; `TouristTrip` + `BreadcrumbList` on trek pages) via `src/components/SEO.astro`. `@astrojs/sitemap` generates `sitemap.xml` at build time from the `site` URL set in `astro.config.mjs` — **update that URL** once the production domain is confirmed.

## Deploying to a VPS

This is a fully static site — `npm run build` produces plain HTML/CSS/JS in `dist/`, no Node server required in production.

1. On the VPS: `git clone`, then `npm install && npm run build`.
2. Point nginx (or any static file server) at the `dist/` directory:

   ```nginx
   server {
     listen 80;
     server_name tripcamps.com www.tripcamps.com;
     root /var/www/tripcamps-tekker/dist;
     index index.html;

     location / {
       try_files $uri $uri/ $uri.html /404.html;
     }
   }
   ```

3. Add HTTPS with `certbot --nginx -d tripcamps.com -d www.tripcamps.com`.
4. To update the live site after content changes: `git pull && npm install && npm run build`, then reload nginx if needed (static files only, no restart required).

## Known follow-ups before launch

- **Contact form** (`src/pages/contact.astro`) and **shop notify form** (`src/pages/shop.astro`) are UI-only — wire them to a real backend (e.g. [Web3Forms](https://web3forms.com), [Formspree](https://formspree.io), or your own API route) before going live.
- Add a real **WhatsApp number** on the Contact page.
- Update the `site` URL in `astro.config.mjs` if the final domain differs from `tripcamps.com`.
- A few hero images are the closest available free-licensed regional photo rather than an exact on-location shot (noted honestly in each photo's alt text/caption) — swap in your own photography over time where it matters most.
