// Custom HTML template for Expo Router's web export.
// Injects favicon links, OG meta, and theme colour into every page.
// See: https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const SITE = {
  url: 'https://darkoapp.com',
  title: 'Darko — Relationship Intelligence',
  description:
    'Darko reads the psychology underneath every text — attachment style, manipulation patterns, and the exact move to make. Stop guessing. Start operating.',
};

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta httpEquiv="content-language" content="en" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#09090B" />

        {/* Tells Chrome/Safari not to offer translation — short technical
            UPPERCASE copy ("DARKO ENGINE v4.0", "COMM_PATTERN") otherwise
            trips the heuristic and gets flagged as German on mobile. */}
        <meta name="google" content="notranslate" />

        {/* Animated SVG favicon — modern browsers; falls back to .ico/PNG below */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="alternate icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicon-static.svg" color="#CCFF00" />

        {/* Primary meta */}
        <title>{SITE.title}</title>
        <meta name="description" content={SITE.description} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE.url} />
        <meta property="og:title" content={SITE.title} />
        <meta property="og:description" content={SITE.description} />
        <meta property="og:image" content={`${SITE.url}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={SITE.url} />
        <meta name="twitter:title" content={SITE.title} />
        <meta name="twitter:description" content={SITE.description} />
        <meta name="twitter:image" content={`${SITE.url}/og-image.png`} />

        {/*
          Disable body scrolling on web — react-native-web handles scrolling at view
          level. See https://necolas.github.io/react-native-web/docs/setup/#root-element
        */}
        <ScrollViewStyleReset />
      </head>
      <body lang="en" className="notranslate" translate="no">{children}</body>
    </html>
  );
}
