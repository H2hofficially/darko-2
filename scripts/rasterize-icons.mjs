// Generate PNG raster fallbacks + .ico from the SVG sources in public/.
// Run once after editing public/favicon-static.svg or public/og-image.svg:
//
//   npm i -D sharp png-to-ico
//   node scripts/rasterize-icons.mjs
//
// Outputs (to public/):
//   favicon-16.png, favicon-32.png       — legacy favicons
//   favicon.ico                          — multi-size (16 + 32) for old browsers
//   apple-touch-icon.png (180x180)       — iOS home screen
//   icon-192.png, icon-512.png           — PWA / Android
//   og-image.png (1200x630)              — Twitter / iMessage / LinkedIn share preview

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(here, '..', 'public');

async function rasterize(svgName, outName, size, opts = {}) {
  const svg = await fs.readFile(path.join(PUB, svgName));
  await sharp(svg, { density: 384 })
    .resize(opts.width ?? size, opts.height ?? size, { fit: 'contain', background: opts.bg ?? { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUB, outName));
  console.log(`  ✓ ${outName}  (${opts.width ?? size}x${opts.height ?? size})`);
}

async function main() {
  console.log('Rasterizing icons from SVG sources...');

  // Square favicons / PWA icons (use static favicon — animation doesn't survive raster)
  await rasterize('favicon-static.svg', 'favicon-16.png', 16);
  await rasterize('favicon-static.svg', 'favicon-32.png', 32);
  await rasterize('favicon-static.svg', 'apple-touch-icon.png', 180);
  await rasterize('favicon-static.svg', 'icon-192.png', 192);
  await rasterize('favicon-static.svg', 'icon-512.png', 512);

  // Multi-size .ico
  const icoBuf = await pngToIco([
    path.join(PUB, 'favicon-16.png'),
    path.join(PUB, 'favicon-32.png'),
  ]);
  await fs.writeFile(path.join(PUB, 'favicon.ico'), icoBuf);
  console.log('  ✓ favicon.ico (16 + 32)');

  // Open Graph share image
  await rasterize('og-image.svg', 'og-image.png', null, { width: 1200, height: 630 });

  // Also overwrite the Expo bundler favicon so app.json keeps working without changes.
  // assets/favicon.png is what Expo ships as /favicon.ico in the Vercel build.
  const assetsFav = path.resolve(here, '..', 'assets', 'favicon.png');
  await sharp(await fs.readFile(path.join(PUB, 'favicon-static.svg')), { density: 384 })
    .resize(48, 48)
    .png()
    .toFile(assetsFav);
  console.log(`  ✓ assets/favicon.png  (48x48 — Expo bundler default)`);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
