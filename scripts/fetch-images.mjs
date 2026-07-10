// One-off content-sourcing script: pulls free-licensed hero photos from Wikimedia
// Commons for each trek/region/site page and records attribution metadata.
// Not part of the runtime build — run manually with `node scripts/fetch-images.mjs`.
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const UA = 'tripcamps-tekker-content-sourcing/1.0 (contact: connect.sagar93@gmail.com)';
const BLOCKLIST = /icon|logo|flag|coat_of_arms|seal_of|signature|\.svg$|map_of|locator|symbol/i;

async function searchCommons(term) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${term} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1600',
    origin: '*',
  }).toString();

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons search failed for "${term}": ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return [];
  return Object.values(pages)
    .filter((p) => p.imageinfo?.[0] && !BLOCKLIST.test(p.title))
    .map((p) => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata || {};
      const strip = (html) => (html || '').replace(/<[^>]+>/g, '').trim();
      return {
        title: p.title,
        url: info.thumburl || info.url,
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        mime: info.mime,
        author: strip(meta.Artist?.value) || 'Wikimedia Commons contributor',
        license: meta.LicenseShortName?.value || 'See file page',
        sourceUrl: info.descriptionurl,
      };
    })
    .filter((r) => r.mime === 'image/jpeg' || r.mime === 'image/png')
    .filter((r) => r.width >= 900 && r.height >= 500);
}

function pickBest(results) {
  if (!results.length) return null;
  const landscape = results.filter((r) => r.width > r.height * 1.15);
  return landscape[0] || results[0];
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
  return buf.length;
}

const targetsFile = process.argv[2] || 'image-targets.json';
const targets = JSON.parse(await (await import('node:fs/promises')).readFile(
  new URL(`./${targetsFile}`, import.meta.url)
));

const attrPath = path.resolve('src/data/attributions.json');
let attributions = {};
try {
  attributions = JSON.parse(await (await import('node:fs/promises')).readFile(attrPath, 'utf-8'));
} catch {}
const outDir = path.resolve('public/images');

for (const t of targets) {
  process.stdout.write(`Searching: ${t.slug} ("${t.query}")... `);
  try {
    const results = await searchCommons(t.query);
    const best = pickBest(results);
    if (!best) {
      console.log('NO MATCH — leaving as placeholder');
      continue;
    }
    const ext = best.mime === 'image/png' ? 'png' : 'jpg';
    const relPath = `${t.category}/${t.slug}.${ext}`;
    const destPath = path.join(outDir, relPath);
    const bytes = await downloadTo(best.url, destPath);
    attributions[t.slug] = {
      src: `/images/${relPath}`,
      alt: t.alt,
      author: best.author,
      license: best.license,
      sourceUrl: best.sourceUrl,
      commonsTitle: best.title,
    };
    console.log(`OK (${(bytes / 1024).toFixed(0)}KB) — ${best.title}`);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
  // Be polite to the API
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(
  path.resolve('src/data/attributions.json'),
  JSON.stringify(attributions, null, 2)
);
console.log(`\nDone. Wrote ${Object.keys(attributions).length}/${targets.length} images.`);
