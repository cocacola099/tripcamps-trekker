// Fallback pass: use English Wikipedia's lead "pageimage" for topics that had no
// good direct Commons search match, then resolve that file's real Commons license.
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const UA = 'tripcamps-tekker-content-sourcing/1.0 (contact: connect.sagar93@gmail.com)';

async function wikipediaLeadImage(term) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: term,
    gsrlimit: '3',
    prop: 'pageimages',
    piprop: 'original',
    origin: '*',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {});
  for (const p of pages) {
    if (p.original?.source?.includes('/wikipedia/commons/')) {
      return { title: p.title, source: p.original.source };
    }
  }
  return null;
}

function commonsFileTitleFromUrl(source) {
  // .../commons/a/a1/File_Name.jpg -> File:File_Name.jpg
  const parts = source.split('/');
  const filename = decodeURIComponent(parts[parts.length - 1]);
  return `File:${filename}`;
}

async function commonsLicense(fileTitle) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: fileTitle,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1600',
    origin: '*',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {});
  const info = pages[0]?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata || {};
  const strip = (html) => (html || '').replace(/<[^>]+>/g, '').trim();
  return {
    url: info.thumburl || info.url,
    mime: info.mime,
    width: info.thumbwidth || info.width,
    height: info.thumbheight || info.height,
    author: strip(meta.Artist?.value) || 'Wikimedia Commons contributor',
    license: meta.LicenseShortName?.value || 'See file page',
    sourceUrl: info.descriptionurl,
  };
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
  return buf.length;
}

const allTargets = JSON.parse(await readFile(new URL('./image-targets.json', import.meta.url)));
const retrySlugs = process.argv.slice(2);
const targets = retrySlugs.length
  ? allTargets.filter((t) => retrySlugs.includes(t.slug))
  : allTargets;

const attrPath = path.resolve('src/data/attributions.json');
let attributions = {};
try {
  attributions = JSON.parse(await readFile(attrPath, 'utf-8'));
} catch {}

const outDir = path.resolve('public/images');

for (const t of targets) {
  process.stdout.write(`Wiki fallback: ${t.slug} ("${t.query}")... `);
  try {
    const lead = await wikipediaLeadImage(t.query);
    if (!lead) {
      console.log('no wikipedia lead image');
      continue;
    }
    const fileTitle = commonsFileTitleFromUrl(lead.source);
    const info = await commonsLicense(fileTitle);
    if (!info || !(info.mime === 'image/jpeg' || info.mime === 'image/png')) {
      console.log('no usable commons file');
      continue;
    }
    const ext = info.mime === 'image/png' ? 'png' : 'jpg';
    const relPath = `${t.category}/${t.slug}.${ext}`;
    const destPath = path.join(outDir, relPath);
    const bytes = await downloadTo(info.url, destPath);
    attributions[t.slug] = {
      src: `/images/${relPath}`,
      alt: t.alt,
      author: info.author,
      license: info.license,
      sourceUrl: info.sourceUrl,
      commonsTitle: fileTitle,
    };
    console.log(`OK (${(bytes / 1024).toFixed(0)}KB) — ${fileTitle}`);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(attrPath, JSON.stringify(attributions, null, 2));
console.log(`\nDone. Total attributions: ${Object.keys(attributions).length}/${allTargets.length}`);
