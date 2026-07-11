// Astro only auto-prefixes URLs it generates itself (bundled CSS/JS, image
// imports). Hand-written root-relative links and image paths need this
// helper so they still resolve correctly when `base` isn't "/" (e.g. the
// GitHub Pages test deploy, served from a /<repo-name>/ subpath).
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}
