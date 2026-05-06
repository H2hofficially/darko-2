#!/usr/bin/env node
/**
 * inject-meta.mjs — postbuild patch for darkoapp.com.
 *
 * Expo Router's "single" output mode produces a bare default index.html
 * that ignores app/+html.tsx, so meta tags / favicons / OG / language hints
 * never reach the served HTML. We can't switch to output:"static" because
 * @react-native-async-storage/async-storage touches `window` during static
 * SSR and breaks the build (see PR #3, build log: "ReferenceError: window
 * is not defined" inside async-storage's commonjs entry).
 *
 * So instead: keep output:"single" and patch dist/index.html after the build
 * to inject the same tags +html.tsx would have produced. This runs as part
 * of the Netlify build command after `expo export`.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE = {
  url: 'https://darkoapp.com',
  title: 'Darko — Relationship Intelligence',
  description:
    'Darko reads the psychology underneath every text — attachment style, manipulation patterns, and the exact move to make. Stop guessing. Start operating.',
  themeColor: '#09090B',
};

// Tags inserted into <head>. Order roughly matches what app/+html.tsx defined.
const HEAD_INSERTIONS = `
  <meta http-equiv="content-language" content="en">
  <meta name="theme-color" content="${SITE.themeColor}">
  <meta name="google" content="notranslate">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="alternate icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="mask-icon" href="/favicon-static.svg" color="#CCFF00">
  <title>${SITE.title}</title>
  <meta name="description" content="${SITE.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE.url}">
  <meta property="og:title" content="${SITE.title}">
  <meta property="og:description" content="${SITE.description}">
  <meta property="og:image" content="${SITE.url}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${SITE.url}">
  <meta name="twitter:title" content="${SITE.title}">
  <meta name="twitter:description" content="${SITE.description}">
  <meta name="twitter:image" content="${SITE.url}/og-image.png">
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, '..', 'dist', 'index.html');

if (!existsSync(indexPath)) {
  console.error(`[inject-meta] dist/index.html not found at ${indexPath}`);
  process.exit(1);
}

let html = readFileSync(indexPath, 'utf8');
const before = html.length;

// 1) Force <html lang="en">.
html = html.replace(/<html\b[^>]*>/i, (m) => {
  if (/\blang=/i.test(m)) return m.replace(/\blang="[^"]*"/i, 'lang="en"');
  return m.replace(/<html/i, '<html lang="en"');
});

// 2) Annotate <body> with lang="en" class="notranslate" translate="no".
//    Each attribute is added only if missing; existing values get rewritten
//    if they clash with English.
html = html.replace(/<body\b[^>]*>/i, (m) => {
  let t = m;
  if (/\blang=/i.test(t)) {
    t = t.replace(/\blang="[^"]*"/i, 'lang="en"');
  } else {
    t = t.replace(/<body/i, '<body lang="en"');
  }
  if (/\bclass=/i.test(t)) {
    if (!/\bnotranslate\b/.test(t)) {
      t = t.replace(/\bclass="([^"]*)"/i, (_m, c) => `class="${(c + ' notranslate').trim()}"`);
    }
  } else {
    t = t.replace(/<body/i, '<body class="notranslate"');
  }
  if (!/\btranslate=/i.test(t)) {
    t = t.replace(/<body/i, '<body translate="no"');
  }
  return t;
});

// 3) Insert head tags before </head>. Idempotent — skip if our marker meta is
//    already present (in case the script runs twice).
if (!/name=["']google["']\s+content=["']notranslate["']/i.test(html)) {
  html = html.replace(/<\/head>/i, `${HEAD_INSERTIONS}</head>`);
}

writeFileSync(indexPath, html, 'utf8');
console.log(`[inject-meta] patched dist/index.html (${before} → ${html.length} bytes)`);
