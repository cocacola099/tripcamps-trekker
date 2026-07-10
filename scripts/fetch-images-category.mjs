// Precision pass: search Wikimedia Commons *categories* (curated, far less noisy
// than full-text search) for a matching topic category, then pick a landscape
// photo from inside it. Falls back to reporting no-match so we can placeholder it.
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const UA = 'tripcamps-tekker-content-sourcing/1.0 (contact: connect.sagar93@gmail.com)';
const BLOCKLIST = /icon|logo|flag|coat_of_arms|seal_of|signature|^map|_map|map_|locator|symbol|painting|engraving|aquatint|lithograph|drawing|postage|stamp|geology|diagram|chart|flower|orchid|hydrangea|butterfly|insect|bird|bug|plant\b/i;

async function findCategory(term) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', list: 'search',
    srnamespace: '14', srsearch: term, srlimit: '5', origin: '*',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.query?.search || []).map((r) => r.title);
}

async function categoryImages(categoryTitle) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'categorymembers',
    gcmtitle: categoryTitle, gcmtype: 'file', gcmlimit: '20',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '1600', origin: '*',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return [];
  const strip = (html) => (html || '').replace(/<[^>]+>/g, '').trim();
  return Object.values(pages)
    .filter((p) => p.imageinfo?.[0] && !BLOCKLIST.test(p.title))
    .map((p) => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata || {};
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

const targetsFileArg = process.argv[3] || 'image-targets.json';
const allTargets = JSON.parse(await readFile(new URL(`./${targetsFileArg}`, import.meta.url)));
const jobs = JSON.parse(process.argv[2]); // [{slug, categoryQuery}]
const targetsBySlug = Object.fromEntries(allTargets.map((t) => [t.slug, t]));

const attrPath = path.resolve('src/data/attributions.json');
let attributions = {};
try { attributions = JSON.parse(await readFile(attrPath, 'utf-8')); } catch {}
const outDir = path.resolve('public/images');

for (const job of jobs) {
  const t = targetsBySlug[job.slug];
  process.stdout.write(`Category search: ${job.slug} ("${job.categoryQuery}")... `);
  try {
    const cats = await findCategory(job.categoryQuery);
    if (!cats.length) { console.log('no category found'); continue; }
    let best = null, bestCat = null;
    for (const cat of cats) {
      const imgs = await categoryImages(cat);
      const candidate = pickBest(imgs);
      if (candidate) { best = candidate; bestCat = cat; break; }
    }
    if (!best) { console.log(`categories found (${cats.join(', ')}) but no usable images`); continue; }
    const ext = best.mime === 'image/png' ? 'png' : 'jpg';
    const relPath = `${t.category}/${t.slug}.${ext}`;
    const destPath = path.join(outDir, relPath);
    const bytes = await downloadTo(best.url, destPath);
    attributions[t.slug] = {
      src: `/images/${relPath}`, alt: t.alt, author: best.author,
      license: best.license, sourceUrl: best.sourceUrl, commonsTitle: best.title,
    };
    console.log(`OK (${(bytes / 1024).toFixed(0)}KB) — ${bestCat} -> ${best.title}`);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(attrPath, JSON.stringify(attributions, null, 2));
console.log(`\nDone. Total attributions: ${Object.keys(attributions).length}/${allTargets.length}`);
