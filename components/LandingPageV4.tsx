import React, { useEffect, useRef } from 'react';
import { Platform, View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// ─── CSS ported from DARKO Landing v6.html (Tailwind utilities expanded) ──────
const V4_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#09090B;--s1:#18181b;--s2:#1e1e21;--b:#27272a;--b2:#3f3f46;
  --dim:#52525b;--muted:#a1a1aa;--text:#fafafa;--a:#CCFF00;
  --zinc-50:#fafafa;--zinc-100:#f4f4f5;--zinc-200:#e4e4e7;--zinc-300:#d4d4d8;
  --zinc-400:#a1a1aa;--zinc-500:#71717a;--zinc-600:#52525b;--zinc-700:#3f3f46;
  --zinc-800:#27272a;--zinc-900:#18181b;--zinc-950:#09090B;
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(0.4,0,0.2,1);
  --nav-h:48px;
}

/* Mono-only — scoped to v4 root so it doesn't leak into the rest of the app */
.v4-root, .v4-root * { font-family: var(--mono) !important; -webkit-font-smoothing: antialiased; }
.v4-root{background:var(--bg);color:var(--zinc-100);text-rendering:optimizeLegibility;overflow-x:hidden;}
.v4-root ::selection{background:var(--a);color:#000}
.v4-root::-webkit-scrollbar{width:6px;height:6px}
.v4-root::-webkit-scrollbar-track{background:var(--bg)}
.v4-root::-webkit-scrollbar-thumb{background:var(--zinc-800)}
.v4-root::-webkit-scrollbar-thumb:hover{background:var(--zinc-700)}

/* Caret */
.caret::after{content:'_';color:var(--a);animation:blink 1.05s steps(2) infinite;margin-left:2px}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}

/* Backgrounds */
.grid-bg{
  background-image:
    linear-gradient(to right, rgba(39,39,42,0.5) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(39,39,42,0.5) 1px, transparent 1px);
  background-size:56px 56px;
}
.scanline{background-image:repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px);}

/* Focus */
.v4-root button:focus-visible,
.v4-root a:focus-visible,
.v4-root input:focus-visible,
.v4-root textarea:focus-visible{outline:1px solid var(--a);outline-offset:2px}

/* Scanbar */
@keyframes scan{0%{left:-30%}100%{left:100%}}
.scanbar{position:relative;overflow:hidden}
.scanbar::after{content:'';position:absolute;top:0;bottom:0;left:-30%;width:30%;background:linear-gradient(90deg, transparent, rgba(204,255,0,0.4), transparent);animation:scan 1.4s linear infinite}

/* Pulse */
@keyframes v4pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.animate-pulse{animation:v4pulse 2s cubic-bezier(0.4,0,0.6,1) infinite}

/* Generic helpers (Tailwind utility expansions) */
.mx-auto{margin-left:auto;margin-right:auto}
.relative{position:relative}
.absolute{position:absolute}
.fixed{position:fixed}
.inset-0{top:0;right:0;bottom:0;left:0}
.hidden{display:none}
.flex{display:flex}
.grid{display:grid}
.inline-flex{display:inline-flex}
.inline-block{display:inline-block}
.block{display:block}
.items-center{align-items:center}
.items-start{align-items:flex-start}
.items-baseline{align-items:baseline}
.justify-center{justify-content:center}
.justify-between{justify-content:space-between}
.flex-wrap{flex-wrap:wrap}
.flex-1{flex:1 1 0%}
.shrink-0{flex-shrink:0}
.min-w-0{min-width:0}
.text-center{text-align:center}
.font-medium{font-weight:500}
.font-semibold{font-weight:600}
.leading-none{line-height:1}
.leading-snug{line-height:1.375}
.leading-relaxed{line-height:1.625}
.tracking-tight{letter-spacing:-0.025em}
.uppercase{text-transform:uppercase}
.line-through{text-decoration:line-through}
.opacity-100{opacity:1}
.opacity-0{opacity:0}
.transition-opacity{transition-property:opacity;transition-duration:300ms;transition-timing-function:var(--ease)}
.duration-300{transition-duration:300ms}
.transition-colors{transition-property:background-color,border-color,color;transition-duration:200ms;transition-timing-function:var(--ease)}

/* Color tokens */
.text-zinc-50{color:var(--zinc-50)}
.text-zinc-100{color:var(--zinc-100)}
.text-zinc-200{color:var(--zinc-200)}
.text-zinc-300{color:var(--zinc-300)}
.text-zinc-400{color:var(--zinc-400)}
.text-zinc-500{color:var(--zinc-500)}
.text-zinc-600{color:var(--zinc-600)}
.text-zinc-700{color:var(--zinc-700)}
.text-chart{color:var(--a)}
.text-black{color:#000}
.bg-chart{background:var(--a)}
.bg-black{background:#000}
.bg-zinc-800{background:var(--zinc-800)}
.bg-zinc-900-40{background:rgba(24,24,27,0.4)}
.bg-zinc-950-60{background:rgba(9,9,11,0.6)}
.bg-app{background:#09090B}
.bg-panel{background:#0b0b0d}
.bg-chart-04{background:rgba(204,255,0,0.04)}
.bg-chart-40{background:rgba(204,255,0,0.4)}

/* Borders */
.border{border:1px solid var(--zinc-800)}
.border-t{border-top:1px solid var(--zinc-800)}
.border-b{border-bottom:1px solid var(--zinc-800)}
.border-zinc-700{border-color:var(--zinc-700)}
.border-zinc-800{border-color:var(--zinc-800)}
.border-chart{border-color:var(--a)}
.border-transparent{border-color:transparent}

/* Layout containers (max-w / padding) */
.max-w-1280{max-width:1280px}
.max-w-1080{max-width:1080px}
.max-w-920{max-width:920px}

/* Nav */
.nav{position:fixed;top:0;left:0;right:0;z-index:50;border-bottom:1px solid transparent;background:transparent;transition:background 200ms var(--ease),border-color 200ms var(--ease),backdrop-filter 200ms var(--ease);}
.nav.scrolled{background:rgba(9,9,11,0.95);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--zinc-800);}
.nav-inner{max-width:1280px;margin:0 auto;padding:0 20px;height:var(--nav-h);display:flex;align-items:center;justify-content:space-between;}
.nav-logo{display:flex;align-items:center;gap:8px;color:var(--a);letter-spacing:0.22em;font-size:11px;font-weight:600;text-decoration:none;}
.nav-logo-sq{width:10px;height:10px;background:var(--a);display:inline-block}
.nav-links{display:none;align-items:center;gap:24px}
.nav-link{font-size:10px;letter-spacing:0.16em;color:var(--zinc-400);text-decoration:none;transition:color 200ms var(--ease);}
.nav-link:hover{color:var(--zinc-100)}
.nav-cta{padding:6px 12px;font-size:10px;letter-spacing:0.16em;background:var(--a);color:#000;text-decoration:none;transition:background 200ms var(--ease);}
.nav-cta:hover{background:#fff}

/* BUG-13: hamburger button — visible only below 768px since .nav-links is hidden there */
.nav-toggle{display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:transparent;border:1px solid var(--zinc-800);cursor:pointer;flex-direction:column;gap:5px;padding:0;margin-right:8px;}
.nav-toggle span{display:block;width:18px;height:1px;background:var(--zinc-300);transition:transform 200ms var(--ease),opacity 200ms var(--ease);}
.nav-toggle[aria-expanded="true"] span:nth-child(1){transform:translateY(6px) rotate(45deg);}
.nav-toggle[aria-expanded="true"] span:nth-child(2){opacity:0;}
.nav-toggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-6px) rotate(-45deg);}

/* BUG-13: slide-down mobile menu sheet */
.nav-mobile-menu{position:fixed;top:var(--nav-h);left:0;right:0;background:rgba(9,9,11,0.98);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--zinc-800);z-index:49;display:none;flex-direction:column;}
.nav-mobile-menu.open{display:flex;}
.nav-mobile-menu a{display:block;padding:16px 20px;font-size:12px;letter-spacing:0.18em;color:var(--zinc-300);text-decoration:none;border-bottom:1px solid var(--zinc-800);transition:background 200ms var(--ease),color 200ms var(--ease);}
.nav-mobile-menu a:last-child{border-bottom:none;}
.nav-mobile-menu a:hover{background:rgba(204,255,0,0.04);color:var(--a);}

/* Hero */
.hero{position:relative;padding-top:112px;padding-bottom:64px;border-bottom:1px solid var(--zinc-800);}
.hero-bg-grid{position:absolute;inset:0;opacity:0.4;pointer-events:none}
.hero-bg-scan{position:absolute;inset:0;pointer-events:none}
.hero-inner{position:relative;max-width:1080px;margin:0 auto;padding:0 20px;text-align:center;}
.hero-eyebrow{display:flex;align-items:center;justify-content:center;gap:12px;font-size:10px;letter-spacing:0.18em;color:var(--zinc-500);margin-bottom:40px;}
.hero-eyebrow .dot{color:var(--a)}
.hero-h1{color:var(--zinc-50);font-size:44px;line-height:0.96;letter-spacing:-0.025em;font-weight:500;}
.hero-h1 .accent{color:var(--a)}
.hero-sub{margin-top:24px;color:var(--zinc-400);font-size:14px;line-height:1.625;max-width:60ch;margin-left:auto;margin-right:auto;}
.hero-cta-row{margin-top:40px;display:flex;align-items:center;justify-content:center;gap:12px;}
.hero-cta{padding:12px 16px;background:var(--a);color:#000;font-size:12px;letter-spacing:0.16em;font-weight:600;text-decoration:none;transition:background 200ms var(--ease);}
.hero-cta:hover{background:#fff}
.hero-scroll-hint{margin-top:64px;font-size:10px;letter-spacing:0.18em;color:var(--zinc-600);}

/* Section labels */
.section-label{display:flex;align-items:center;gap:12px;font-size:10px;letter-spacing:0.2em;color:var(--zinc-500);}
.section-label .n{color:var(--a)}
.section-label .rule{flex:1;height:1px;background:var(--zinc-800);margin-left:8px;max-width:80px;}

/* Section padding */
.sec{border-bottom:1px solid var(--zinc-800);padding-top:80px;padding-bottom:80px;}
.sec-inner{max-width:1080px;margin:0 auto;padding:0 20px;}
.sec-inner-narrow{max-width:920px;margin:0 auto;padding:0 20px;}

/* Decode section header */
.decode-head{display:flex;align-items:center;justify-content:center;gap:12px;font-size:10px;letter-spacing:0.2em;color:var(--zinc-500);margin-bottom:32px;}
.decode-head .dot{color:var(--a)}
.decode-head .rule{flex:1;height:1px;background:var(--zinc-800);max-width:120px}

/* Decoder panel */
.dec-panel{border:1px solid var(--zinc-800);background:#0b0b0d}
.dec-titlebar{border-bottom:1px solid var(--zinc-800);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-size:10px;}
.dec-tb-left{display:flex;align-items:center;gap:12px;color:var(--zinc-500)}
.dec-tb-dots{display:flex;gap:6px}
.dec-tb-dot{width:8px;height:8px;border:1px solid var(--zinc-700);display:inline-block}
.dec-tb-dot.live{background:var(--a);border-color:var(--a)}
.dec-tb-title{letter-spacing:0.18em}
.dec-tb-right{display:flex;align-items:center;gap:8px;color:var(--zinc-500);letter-spacing:0.14em}
.dec-tb-right .pulse{color:var(--a)}

/* Decoder input */
.dec-input{padding:20px 16px;border-bottom:1px solid var(--zinc-800);}
.dec-input-head{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--zinc-500);letter-spacing:0.16em;margin-bottom:12px;}
.dec-input-head .meta{color:var(--zinc-600)}
.dec-input-box{border:1px solid var(--zinc-800);background:rgba(9,9,11,0.6);padding:16px;min-height:68px;}
.dec-input-text{color:var(--zinc-100);font-size:15px;line-height:1.375;}
.dec-quote{color:var(--zinc-600)}
.dec-status-row{margin-top:16px;display:flex;align-items:center;gap:12px;font-size:10px;letter-spacing:0.16em;}
.dec-chip{padding:4px 8px;border:1px solid var(--zinc-800);color:var(--zinc-500);}
.dec-chip.active{border-color:var(--a);color:var(--a)}
.dec-status-bar{flex:1;height:1px;background:var(--zinc-800);position:relative;}
.dec-status-bar .scanbar-fill{position:absolute;inset:0}
.dec-status-bar .done-fill{position:absolute;inset:0;background:rgba(204,255,0,0.4)}

/* Decoder output rows */
.dec-output{min-height:280px;}
.dec-row{padding:16px;border-bottom:1px solid var(--zinc-800);transition:opacity 300ms var(--ease);}
.dec-row:last-child{border-bottom:none}
.dec-row-inner{display:flex;align-items:flex-start;gap:12px;}
.dec-row-n{font-size:10px;letter-spacing:0.16em;color:var(--zinc-600);margin-top:2px;}
.dec-row-body{flex:1;min-width:0;}
.dec-row-label{font-size:10px;letter-spacing:0.16em;color:var(--zinc-500);}
.dec-row-value{margin-top:6px;color:var(--zinc-300);font-size:12.5px;line-height:1.625;}
.dec-row-value.accent{color:var(--zinc-50);font-size:16px;letter-spacing:-0.025em;line-height:1.2}
.dec-fw-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;}
.dec-fw-label{font-size:10px;letter-spacing:0.16em;color:var(--zinc-500);}
.dec-fw-law{color:var(--a);font-size:11px;letter-spacing:0.14em;}
.dec-move{color:var(--zinc-300);font-size:12.5px;line-height:1.625;margin-top:8px;}
.dec-move .arrow{color:var(--zinc-600)}

/* Decoder footer (dots / status line) */
.dec-foot{border-top:1px solid var(--zinc-800);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;font-size:9px;letter-spacing:0.14em;color:var(--zinc-600);}
.dec-foot-dots{display:flex;gap:6px}
.dec-foot-dot{width:16px;height:2px;background:var(--zinc-800)}
.dec-foot-dot.on{background:var(--a)}

/* Problem rows */
.prob-list{margin-top:40px;border:1px solid var(--zinc-800);}
.prob-row{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:center;padding:20px 16px;border-bottom:1px solid var(--zinc-800);transition:background 200ms var(--ease);}
.prob-row:last-child{border-bottom:none}
.prob-row:hover{background:rgba(24,24,27,0.4)}
.prob-n{grid-column:span 1 / span 1;font-size:10px;letter-spacing:0.16em;color:var(--zinc-600);}
.prob-tag{grid-column:span 11 / span 11;font-size:11px;letter-spacing:0.18em;color:var(--a);}
.prob-line{grid-column:span 12 / span 12;margin-top:4px;color:var(--zinc-300);font-size:14px;}

/* Fit grid */
.fit-grid{margin-top:40px;display:grid;grid-template-columns:1fr;gap:1px;background:var(--zinc-800);border:1px solid var(--zinc-800);}
.fit-col{background:#09090B;padding:24px}
.fit-col-head{display:flex;align-items:center;gap:12px;margin-bottom:32px;}
.fit-col-head .sq{width:10px;height:10px;}
.fit-col-head .sq.yes{background:var(--a)}
.fit-col-head .sq.no{background:var(--zinc-700)}
.fit-col-head .ttl{font-size:11px;letter-spacing:0.2em}
.fit-col-head .ttl.yes{color:var(--a)}
.fit-col-head .ttl.no{color:var(--zinc-500)}
.fit-list{display:flex;flex-direction:column;gap:20px;list-style:none}
.fit-li{display:flex;gap:16px;align-items:flex-start;}
.fit-mark{font-size:10px;letter-spacing:0.14em;margin-top:6px;flex-shrink:0;}
.fit-mark.yes{color:var(--a)}
.fit-mark.no{color:var(--zinc-700)}
.fit-text{font-size:15px;line-height:1.375;}
.fit-text.yes{color:var(--zinc-100)}
.fit-text.no{color:var(--zinc-500);text-decoration:line-through;text-decoration-color:var(--zinc-700);}

/* Pricing */
.pricing-card{margin-top:40px;border:1px solid var(--a);background:rgba(204,255,0,0.04);padding:24px;position:relative;}
.pricing-badge{position:absolute;top:0;right:0;background:var(--a);color:#000;font-size:10px;letter-spacing:0.18em;padding:4px 12px;}
.pricing-row{display:flex;align-items:baseline;gap:12px;}
.pricing-num{color:var(--zinc-50);font-size:80px;line-height:1;letter-spacing:-0.025em;}
.pricing-per{color:var(--zinc-500);font-size:14px}
.pricing-tag{margin-top:12px;color:var(--zinc-300);font-size:15px;}
.pricing-cta{margin-top:32px;display:inline-flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 20px;background:var(--a);color:#000;text-decoration:none;transition:background 200ms var(--ease);}
.pricing-cta:hover{background:#fff}
.pricing-cta .label{font-size:12px;letter-spacing:0.18em;font-weight:600}

/* Exec strip */
.exec-strip{margin-top:16px;border:1px solid var(--zinc-800);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:0.14em;color:var(--zinc-500);}
.exec-strip .name{color:var(--zinc-300)}
.exec-strip .ref{color:var(--zinc-700);display:none}

/* FAQ */
.faq-list{margin-top:40px;border-top:1px solid var(--zinc-800);}
.faq-item{border-bottom:1px solid var(--zinc-800);}
.faq-summary{padding:20px 8px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;cursor:pointer;list-style:none;transition:background 200ms var(--ease);}
.faq-summary::-webkit-details-marker{display:none}
.faq-summary:hover{background:rgba(24,24,27,0.4)}
.faq-q-wrap{display:flex;align-items:flex-start;gap:16px;min-width:0}
.faq-q-n{font-size:10px;letter-spacing:0.18em;color:var(--zinc-600);margin-top:4px;flex-shrink:0;width:32px;}
.faq-q{color:var(--zinc-100);font-size:15px;letter-spacing:-0.025em;}
.faq-chev{color:var(--a);font-size:18px;line-height:1;margin-top:4px;flex-shrink:0;transition:transform 200ms ease;}
.faq-item[open] .faq-chev{transform:rotate(45deg);}
.faq-answer{padding:0 8px 24px 48px;margin-top:-4px;}
.faq-answer p{color:var(--zinc-400);font-size:13px;line-height:1.625;max-width:72ch;}
.faq-answer .a-prefix{color:var(--zinc-600)}

/* Closer */
.closer{position:relative;border-bottom:1px solid var(--zinc-800);padding:80px 0;overflow:hidden;}
.closer-bg{position:absolute;inset:0;opacity:0.3;pointer-events:none}
.closer-inner{position:relative;max-width:1080px;margin:0 auto;padding:0 20px;text-align:center;}
.closer-h2{color:var(--zinc-50);font-size:40px;line-height:0.96;letter-spacing:-0.025em;}
.closer-h2 .accent{color:var(--a)}
.closer-cta{margin-top:40px;display:inline-flex;align-items:center;gap:16px;padding:16px 24px;background:var(--a);color:#000;text-decoration:none;transition:background 200ms var(--ease);}
.closer-cta:hover{background:#fff}
.closer-cta .label{font-size:13px;letter-spacing:0.18em;font-weight:600}

/* Footer */
.footer{padding:40px 0;}
.footer-inner{max-width:1080px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:1fr;gap:24px;font-size:10px;letter-spacing:0.16em;color:var(--zinc-500);}
.footer-logo{display:flex;align-items:center;gap:8px;color:var(--a);}
.footer-logo .sq{width:8px;height:8px;background:var(--a);display:inline-block}
.footer-links{display:flex;flex-wrap:wrap;gap:8px 20px;}
.footer-links a{color:var(--zinc-500);text-decoration:none;transition:color 200ms var(--ease);}
.footer-links a:hover{color:var(--zinc-200)}
.footer-copy{color:var(--zinc-600)}

/* ── Responsive ─────────────────────────────────────────────────────── */
@media (min-width:640px){
  .nav-inner{padding:0 32px}
  .hero{padding-top:144px}
  .hero-inner{padding:0 32px}
  .hero-h1{font-size:68px}
  .hero-sub{font-size:16px}
  .sec{padding-top:96px;padding-bottom:96px}
  .sec-inner,.sec-inner-narrow{padding:0 32px}
  .dec-input{padding:20px 24px}
  .dec-row{padding:16px 24px}
  .dec-foot{padding:12px 16px}
  .dec-input-text{font-size:17px}
  .dec-row-value.accent{font-size:18px}
  .prob-row{padding:20px 24px}
  .prob-tag{grid-column:span 3 / span 3}
  .prob-line{grid-column:span 8 / span 8;margin-top:0;font-size:16px}
  .fit-col{padding:40px}
  .fit-text{font-size:17px}
  .pricing-card{padding:40px}
  .pricing-num{font-size:120px}
  .pricing-tag{font-size:17px}
  .exec-strip .ref{display:inline}
  .faq-summary{padding:20px 16px}
  .faq-q{font-size:17px}
  .faq-answer{padding:0 16px 24px 64px}
  .faq-answer p{font-size:14px}
  .closer{padding:96px 0;}
  .closer-h2{font-size:64px}
  .footer-inner{grid-template-columns:repeat(3,minmax(0,1fr));padding:0 32px;}
  .footer-copy{text-align:right}
}

@media (min-width:768px){
  .nav-links{display:flex}
  /* BUG-13: hide hamburger + mobile menu on tablet/desktop */
  .nav-toggle{display:none !important}
  .nav-mobile-menu{display:none !important}
  .fit-grid{grid-template-columns:1fr 1fr;}
}

/* BUG-14: small-mobile guard. Below 400px the hero h1 (44px) and CTA can
   overflow on devices like iPhone SE (375px). Tighten font and force wrapping. */
@media (max-width:399px){
  .hero{padding-top:96px;padding-bottom:48px;}
  .hero-inner{padding:0 16px;}
  .hero-h1{font-size:34px;line-height:1.05;letter-spacing:-0.02em;word-break:break-word;overflow-wrap:anywhere;}
  .hero-sub{font-size:13px;}
  .hero-cta-row{flex-wrap:wrap;gap:8px;}
  .hero-cta{padding:10px 14px;font-size:11px;}
  .nav-inner{padding:0 14px;}
}

/* BUG-14: also defend the live-decode panel — long strings (e.g. ANXIOUS-PROTEST)
   were overflowing their containers at 375px. Allow break-anywhere on values. */
@media (max-width:639px){
  .dec-row-value, .dec-row-value.accent, .dec-fw-law, .dec-move{
    overflow-wrap:anywhere;word-break:break-word;
  }
  .dec-input-text{overflow-wrap:anywhere;word-break:break-word;}
  .hero-h1{overflow-wrap:anywhere;word-break:break-word;}
}

@media (min-width:1024px){
  .hero-h1{font-size:88px}
  .closer-h2{font-size:80px}
}
`;

// ─── HTML body ported from v6 (JSX flattened to static markup) ────────────────
// 5 decoder samples are emitted as data-attributes on hidden nodes; runV4Scripts
// drives the rotation by reading them.
const V4_BODY = `
<header class="nav" id="nav">
  <div class="nav-inner">
    <a href="#top" class="nav-logo"><span class="nav-logo-sq"></span>DARKO</a>
    <nav class="nav-links">
      <a href="#problem" class="nav-link">PROBLEM</a>
      <a href="#fit" class="nav-link">FIT</a>
      <a href="#pricing" class="nav-link">PRICING</a>
      <a href="#faq" class="nav-link">FAQ</a>
    </nav>
    <!-- BUG-13: hamburger replaces the nav links below 768px -->
    <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-mobile-menu" aria-label="Toggle menu" type="button">
      <span></span><span></span><span></span>
    </button>
    <a href="#" class="nav-cta" data-cta="trial">START&nbsp;TRIAL&nbsp;→</a>
  </div>
  <div class="nav-mobile-menu" id="nav-mobile-menu">
    <a href="#problem" class="nav-mobile-link">PROBLEM</a>
    <a href="#fit" class="nav-mobile-link">FIT</a>
    <a href="#pricing" class="nav-mobile-link">PRICING</a>
    <a href="#faq" class="nav-mobile-link">FAQ</a>
  </div>
</header>

<section id="top" class="hero">
  <div class="hero-bg-grid grid-bg"></div>
  <div class="hero-bg-scan scanline"></div>
  <div class="hero-inner">
    <div class="hero-eyebrow">
      <span class="dot">●</span>
      <span>RELATIONSHIP&nbsp;INTELLIGENCE</span>
    </div>
    <h1 class="hero-h1">
      Decode any text<br/>
      in <span class="accent">30 seconds</span>.<span class="caret"></span>
    </h1>
    <p class="hero-sub">Built on Robert Greene, Freud, Kamasutra, and attachment theory.</p>
    <div class="hero-cta-row">
      <a href="#decode" class="hero-cta">SEE IT DECODE&nbsp;↓</a>
    </div>
    <div class="hero-scroll-hint animate-pulse">↓ SCROLL</div>
  </div>
</section>

<section id="decode" class="sec">
  <div class="sec-inner-narrow">
    <div class="decode-head">
      <span class="dot">●</span>
      <span>LIVE&nbsp;DECODE</span>
      <span class="rule"></span>
    </div>

    <div class="dec-panel" id="dec-panel">
      <div class="dec-titlebar">
        <div class="dec-tb-left">
          <div class="dec-tb-dots">
            <span class="dec-tb-dot"></span>
            <span class="dec-tb-dot"></span>
            <span class="dec-tb-dot live"></span>
          </div>
          <span class="dec-tb-title">DARKO // DECODE.v2.4</span>
        </div>
        <div class="dec-tb-right">
          <span class="pulse">●</span>
          <span>LIVE · <span id="dec-idx">01</span>/<span id="dec-total">05</span></span>
        </div>
      </div>

      <div class="dec-input">
        <div class="dec-input-head">
          <span>&gt; INPUT</span>
          <span class="meta">SMS · <span id="dec-chars">0</span> CHARS</span>
        </div>
        <div class="dec-input-box">
          <p class="dec-input-text">
            <span class="dec-quote" id="dec-q-open">"</span><span id="dec-typed"></span><span class="caret"></span><span class="dec-quote" id="dec-q-close" style="display:none">"</span>
          </p>
        </div>

        <div class="dec-status-row">
          <span class="dec-chip" id="dec-chip">◌ AWAITING</span>
          <div class="dec-status-bar">
            <div class="scanbar-fill" id="dec-bar-scan" style="display:none"><div class="scanbar" style="position:absolute;inset:0"></div></div>
            <div class="done-fill" id="dec-bar-done" style="display:none"></div>
          </div>
        </div>
      </div>

      <div class="dec-output">
        <div class="dec-row" id="dec-row-1" style="opacity:0">
          <div class="dec-row-inner">
            <span class="dec-row-n">01 //</span>
            <div class="dec-row-body">
              <span class="dec-row-label">VERDICT</span>
              <p class="dec-row-value accent" id="dec-verdict"></p>
            </div>
          </div>
        </div>
        <div class="dec-row" id="dec-row-2" style="opacity:0">
          <div class="dec-row-inner">
            <span class="dec-row-n">02 //</span>
            <div class="dec-row-body">
              <span class="dec-row-label">PSYCHOLOGY</span>
              <p class="dec-row-value" id="dec-psych"></p>
            </div>
          </div>
        </div>
        <div class="dec-row" id="dec-row-3" style="opacity:0">
          <div class="dec-row-inner">
            <span class="dec-row-n">03 //</span>
            <div class="dec-row-body">
              <div class="dec-fw-row">
                <span class="dec-fw-label">FRAMEWORK</span>
                <span class="dec-fw-law" id="dec-law"></span>
              </div>
              <p class="dec-move"><span class="arrow">↳ MOVE&nbsp;&nbsp;</span><span id="dec-move"></span></p>
            </div>
          </div>
        </div>
      </div>

      <div class="dec-foot">
        <span>↳ live demo · rotates every 8s</span>
        <div class="dec-foot-dots" id="dec-foot-dots">
          <span class="dec-foot-dot on"></span>
          <span class="dec-foot-dot"></span>
          <span class="dec-foot-dot"></span>
          <span class="dec-foot-dot"></span>
          <span class="dec-foot-dot"></span>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="problem" class="sec">
  <div class="sec-inner">
    <div class="section-label">
      <span class="n">01&nbsp;//</span>
      <span>THE&nbsp;PROBLEM</span>
      <span class="rule"></span>
    </div>
    <div class="prob-list">
      <div class="prob-row">
        <span class="prob-n">01</span>
        <span class="prob-tag">CHATGPT</span>
        <span class="prob-line">agrees with whatever you say.</span>
      </div>
      <div class="prob-row">
        <span class="prob-n">02</span>
        <span class="prob-tag">FRIENDS</span>
        <span class="prob-line">are tired of hearing about it.</span>
      </div>
      <div class="prob-row">
        <span class="prob-n">03</span>
        <span class="prob-tag">THERAPISTS</span>
        <span class="prob-line">tell you to "communicate openly" — useless when they're the one being unclear.</span>
      </div>
      <div class="prob-row">
        <span class="prob-n">04</span>
        <span class="prob-tag">DATING SUBS</span>
        <span class="prob-line">give you 200 conflicting takes from strangers.</span>
      </div>
    </div>
  </div>
</section>

<section id="fit" class="sec">
  <div class="sec-inner">
    <div class="section-label">
      <span class="n">02&nbsp;//</span>
      <span>FIT</span>
      <span class="rule"></span>
    </div>
    <div class="fit-grid">
      <div class="fit-col">
        <div class="fit-col-head">
          <span class="sq yes"></span>
          <span class="ttl yes">FOR YOU</span>
        </div>
        <ul class="fit-list">
          <li class="fit-li"><span class="fit-mark yes">[+]</span><span class="fit-text yes">You read Greene or Cialdini.</span></li>
          <li class="fit-li"><span class="fit-mark yes">[+]</span><span class="fit-text yes">You find "just communicate" insulting.</span></li>
          <li class="fit-li"><span class="fit-mark yes">[+]</span><span class="fit-text yes">You want clarity, not comfort.</span></li>
        </ul>
      </div>
      <div class="fit-col">
        <div class="fit-col-head">
          <span class="sq no"></span>
          <span class="ttl no">NOT FOR YOU</span>
        </div>
        <ul class="fit-list">
          <li class="fit-li"><span class="fit-mark no">[ — ]</span><span class="fit-text no">You want a supportive friend.</span></li>
          <li class="fit-li"><span class="fit-mark no">[ — ]</span><span class="fit-text no">You're looking for couples therapy.</span></li>
          <li class="fit-li"><span class="fit-mark no">[ — ]</span><span class="fit-text no">You want to be told you're right.</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section id="pricing" class="sec">
  <div class="sec-inner">
    <div class="section-label">
      <span class="n">03&nbsp;//</span>
      <span>PRICING</span>
      <span class="rule"></span>
    </div>

    <!-- BUG-09: canonical pricing copy. Pro $15/mo, 4-day trial, 8 targets, full features.
         Annual ($150/yr) is shown but routes to /pricing where the live toggle lives. -->
    <div class="pricing-card">
      <div class="pricing-badge">DARKO PRO</div>
      <div class="pricing-row">
        <span class="pricing-num">$15</span>
        <span class="pricing-per">/month</span>
      </div>
      <p class="pricing-tag">150 messages a month · 8 targets · voice + image · dossier · brief · phase tracking. 4-day free trial.</p>
      <a href="#" class="pricing-cta" data-cta="trial">
        <span class="label">START 4-DAY FREE TRIAL</span>
        <span>→</span>
      </a>
    </div>

    <!-- BUG-09: Executive line includes founder framing (first 100 at $100 forever). -->
    <div class="exec-strip">
      <span><span class="name">DARKO EXECUTIVE</span> · $100/mo · first 100 founders locked at $100 forever</span>
      <a href="/pricing" class="ref" data-route="/pricing">see full plans →</a>
    </div>
  </div>
</section>

<section id="faq" class="sec">
  <div class="sec-inner">
    <div class="section-label">
      <span class="n">04&nbsp;//</span>
      <span>FAQ</span>
      <span class="rule"></span>
    </div>
    <div class="faq-list">
      <details class="faq-item">
        <summary class="faq-summary">
          <div class="faq-q-wrap">
            <span class="faq-q-n">Q.01</span>
            <span class="faq-q">Is this manipulation?</span>
          </div>
          <span class="faq-chev">+</span>
        </summary>
        <div class="faq-answer"><p><span class="a-prefix">A.&nbsp;</span>No — it's literacy. The people who study power are usually the ones who've been on the receiving end of it.</p></div>
      </details>
      <details class="faq-item">
        <summary class="faq-summary">
          <div class="faq-q-wrap">
            <span class="faq-q-n">Q.02</span>
            <span class="faq-q">Where do my texts go?</span>
          </div>
          <span class="faq-chev">+</span>
        </summary>
        <div class="faq-answer"><p><span class="a-prefix">A.&nbsp;</span>Encrypted at rest, end-to-end on the wire, never used to train models. Delete a thread and the source is gone in under 60 seconds.</p></div>
      </details>
      <details class="faq-item">
        <summary class="faq-summary">
          <div class="faq-q-wrap">
            <span class="faq-q-n">Q.03</span>
            <span class="faq-q">How do I cancel?</span>
          </div>
          <span class="faq-chev">+</span>
        </summary>
        <div class="faq-answer"><p><span class="a-prefix">A.&nbsp;</span>Account → Subscription → Cancel. Two taps, no retention loops.</p></div>
      </details>
      <details class="faq-item">
        <summary class="faq-summary">
          <div class="faq-q-wrap">
            <span class="faq-q-n">Q.04</span>
            <span class="faq-q">What counts as a "decode"?</span>
          </div>
          <span class="faq-chev">+</span>
        </summary>
        <div class="faq-answer"><p><span class="a-prefix">A.&nbsp;</span>One inbound message, or a short thread (≤8 messages) read as one. Pro is unlimited — no caps, no metering.</p></div>
      </details>
      <details class="faq-item">
        <summary class="faq-summary">
          <div class="faq-q-wrap">
            <span class="faq-q-n">Q.05</span>
            <span class="faq-q">Can I use it on my own texts?</span>
          </div>
          <span class="faq-chev">+</span>
        </summary>
        <div class="faq-answer"><p><span class="a-prefix">A.&nbsp;</span>Yes — and you should. Run your own drafts before you send. Most users find their first month of value comes from catching their own anxious-protest replies before they hit send.</p></div>
      </details>
    </div>
  </div>
</section>

<section class="closer">
  <div class="closer-bg grid-bg"></div>
  <div class="closer-inner">
    <h2 class="closer-h2">
      Stop guessing.<br/>
      <span class="accent">Start reading.<span class="caret"></span></span>
    </h2>
    <a href="#" class="closer-cta" data-cta="trial">
      <span class="label">START 4-DAY FREE TRIAL</span>
      <span>→</span>
    </a>
  </div>
</section>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-logo"><span class="sq"></span>DARKO</div>
    <div class="footer-links">
      <a href="#" data-route="/privacy">PRIVACY</a>
      <a href="#" data-route="/terms">TERMS</a>
      <a href="#" data-route="/contact">CONTACT</a>
    </div>
    <div class="footer-copy">© 2026 DARKO LABS</div>
  </div>
</footer>
`;

// ─── Decoder samples + interactivity ──────────────────────────────────────────
type DecodeSample = {
  text: string;
  verdict: string;
  psych: string;
  law: string;
  move: string;
};

const DECODE_SAMPLES: DecodeSample[] = [
  {
    text: "she texted me and went silent. i'm confused.",
    verdict: 'AVOIDANT WITHDRAWAL · TESTING',
    psych:   'Anxious-leaning read on your end. Her silence is the message — withdrawal after contact is a regulation move, not a verdict on you.',
    law:     'LAW 16 — absence increases respect',
    move:    '"hey." — match the temperature, not the volume.',
  },
  {
    text: "she laughed at me. i like her. i don't know what's in her mind.",
    verdict: 'PLAYFUL SIGNAL · LOW THREAT',
    psych:   'Teasing in early attraction is approach behavior dressed as distance. The laugh is a bid; reading it as rejection is your defense, not her intent.',
    law:     'LAW 25 — re-create yourself, do not be defined by reactions',
    move:    "Tease back once. Then change the subject. Don't over-explain.",
  },
  {
    text: "hey. been thinking about you lately 🙂",
    verdict: 'LOW-COST PING · KEEPING DOOR OPEN',
    psych:   'Avoidant-intermittent loop. Sent at low cost, after long silence — probes availability without committing to interest.',
    law:     'LAW 16 — use absence to increase respect',
    move:    '"hey" — refuses the bait without escalating. They get neither warmth nor anxiety.',
  },
  {
    text: "k. cool.",
    verdict: 'ANXIOUS-PROTEST · BAITING PURSUIT',
    psych:   'Reads as avoidance, runs on hyper-activation. The coldness is engineered — the reward they want is your chase.',
    law:     'LAW 2 — file the protest, do not reward it',
    move:    '"ok. talk later." — signal you noticed; refuse to pay.',
  },
  {
    text: "so sorry — today's been INSANE. next week instead?",
    verdict: 'PATTERN CANCEL · PRESERVING OPTIONALITY',
    psych:   'Third late cancel in five weeks. Apology intensity rising; specificity falling. Wants the relationship, flees the contact.',
    law:     'LAW 6 — refuse to be a backup option',
    move:    '"tuesday 7pm — yes or no?" Force a binary.',
  },
];

// ─── Vanilla JS reimplementation of v6 RotatingDecoder + nav scroll + anchors ─
function runV4Scripts(R: HTMLElement) {
  // Nav frosted on container scroll past 8px
  const navEl = R.querySelector('.nav') as HTMLElement | null;
  const onScroll = () => navEl?.classList.toggle('scrolled', R.scrollTop > 8);
  R.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Helper: scroll to a hash target inside this container, accounting for the
  // fixed nav (~64px). Used by both anchor clicks and the BUG-08 deep-link path.
  const scrollToHash = (hash: string, smooth = true) => {
    if (!hash || hash === '#') return;
    const target = R.querySelector<HTMLElement>(hash);
    if (!target) return;
    const rTop = R.getBoundingClientRect().top;
    const tTop = target.getBoundingClientRect().top;
    R.scrollTo({ top: R.scrollTop + tTop - rTop - 64, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Smooth scroll anchor links within the container
  R.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      scrollToHash(href, true);
      // Also reflect in URL so the user can copy a deep-link to the section.
      try { history.replaceState(null, '', href); } catch { /* ignore */ }
    });
  });

  // BUG-08: when the page loads with a hash (e.g. /#pricing), the original
  // implementation did nothing — the container booted at scrollTop 0 regardless.
  // Run the scroll once on mount, with a tick of delay to let layout settle.
  if (typeof window !== 'undefined' && window.location.hash) {
    const initialHash = window.location.hash;
    setTimeout(() => scrollToHash(initialHash, false), 60);
  }

  // BUG-13: hamburger toggle for mobile nav.
  const navToggleEl = R.querySelector<HTMLButtonElement>('#nav-toggle');
  const navMenuEl   = R.querySelector<HTMLElement>('#nav-mobile-menu');
  const setMenuOpen = (open: boolean) => {
    if (!navToggleEl || !navMenuEl) return;
    navToggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    navMenuEl.classList.toggle('open', open);
  };
  navToggleEl?.addEventListener('click', () => {
    const isOpen = navToggleEl.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!isOpen);
  });
  // Close menu when a mobile link is tapped (the click also triggers the
  // anchor handler above, which scrolls).
  navMenuEl?.querySelectorAll<HTMLAnchorElement>('a').forEach(a => {
    a.addEventListener('click', () => setMenuOpen(false));
  });

  // CTA wiring — every [data-cta="trial"] -> /auth?plan=pro
  R.querySelectorAll<HTMLElement>('[data-cta="trial"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      window.location.href = '/auth?plan=pro';
    });
  });

  // Footer routes
  R.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const route = el.getAttribute('data-route');
      if (route) window.location.href = route;
    });
  });

  // ── Rotating decoder ──────────────────────────────────────────────────────
  const typedEl   = R.querySelector<HTMLElement>('#dec-typed');
  const charsEl   = R.querySelector<HTMLElement>('#dec-chars');
  const idxEl     = R.querySelector<HTMLElement>('#dec-idx');
  const totalEl   = R.querySelector<HTMLElement>('#dec-total');
  const chipEl    = R.querySelector<HTMLElement>('#dec-chip');
  const qCloseEl  = R.querySelector<HTMLElement>('#dec-q-close');
  const verdictEl = R.querySelector<HTMLElement>('#dec-verdict');
  const psychEl   = R.querySelector<HTMLElement>('#dec-psych');
  const lawEl     = R.querySelector<HTMLElement>('#dec-law');
  const moveEl    = R.querySelector<HTMLElement>('#dec-move');
  const row1      = R.querySelector<HTMLElement>('#dec-row-1');
  const row2      = R.querySelector<HTMLElement>('#dec-row-2');
  const row3      = R.querySelector<HTMLElement>('#dec-row-3');
  const barScan   = R.querySelector<HTMLElement>('#dec-bar-scan');
  const barDone   = R.querySelector<HTMLElement>('#dec-bar-done');
  const dotsWrap  = R.querySelector<HTMLElement>('#dec-foot-dots');

  if (totalEl) totalEl.textContent = String(DECODE_SAMPLES.length).padStart(2, '0');

  let idx = 0;
  let typed = '';
  let phase: 'typing' | 'decoding' | 'shown' | 'erasing' = 'typing';
  let reveal = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  function setChip(text: string, active: boolean) {
    if (!chipEl) return;
    chipEl.textContent = text;
    chipEl.classList.toggle('active', active);
  }

  function setBar(p: typeof phase) {
    if (barScan) barScan.style.display = p === 'decoding' ? 'block' : 'none';
    if (barDone) barDone.style.display = p === 'shown' ? 'block' : 'none';
  }

  function setDots() {
    if (!dotsWrap) return;
    const dots = dotsWrap.querySelectorAll<HTMLElement>('.dec-foot-dot');
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
  }

  function setIdxLabel() {
    if (idxEl) idxEl.textContent = String(idx + 1).padStart(2, '0');
  }

  function paintTyped() {
    if (typedEl) typedEl.textContent = typed;
    if (charsEl) charsEl.textContent = String(typed.length);
  }

  function paintRows(sample: DecodeSample) {
    if (verdictEl) verdictEl.textContent = sample.verdict;
    if (psychEl)   psychEl.textContent   = sample.psych;
    if (lawEl)     lawEl.textContent     = sample.law;
    if (moveEl)    moveEl.textContent    = sample.move;
  }

  function setRowsVisible(n: number) {
    if (row1) row1.style.opacity = n >= 1 ? '1' : '0';
    if (row2) row2.style.opacity = n >= 2 ? '1' : '0';
    if (row3) row3.style.opacity = n >= 3 ? '1' : '0';
  }

  function tick() {
    if (cancelled) return;
    const sample = DECODE_SAMPLES[idx];

    if (phase === 'typing') {
      setChip('◌ AWAITING', false);
      setBar('typing');
      if (qCloseEl) qCloseEl.style.display = 'none';
      if (typed.length < sample.text.length) {
        typed = sample.text.slice(0, typed.length + 1);
        paintTyped();
        timer = setTimeout(tick, 28 + Math.random() * 40);
      } else {
        timer = setTimeout(() => { phase = 'decoding'; tick(); }, 600);
      }
    } else if (phase === 'decoding') {
      setChip('◐ DECODING', true);
      setBar('decoding');
      if (qCloseEl) qCloseEl.style.display = 'inline';
      paintRows(sample);
      timer = setTimeout(() => {
        phase = 'shown';
        reveal = 1;
        setRowsVisible(reveal);
        tick();
      }, 900);
    } else if (phase === 'shown') {
      setChip('✓ DECODED', true);
      setBar('shown');
      if (reveal < 3) {
        timer = setTimeout(() => {
          reveal += 1;
          setRowsVisible(reveal);
          tick();
        }, 520);
      } else {
        timer = setTimeout(() => { phase = 'erasing'; tick(); }, 4200);
      }
    } else if (phase === 'erasing') {
      setChip('◌ NEXT…', false);
      setBar('typing');
      if (qCloseEl) qCloseEl.style.display = 'none';
      setRowsVisible(0);
      if (typed.length > 0) {
        typed = typed.slice(0, -1);
        paintTyped();
        timer = setTimeout(tick, 12);
      } else {
        timer = setTimeout(() => {
          idx = (idx + 1) % DECODE_SAMPLES.length;
          setIdxLabel();
          setDots();
          phase = 'typing';
          tick();
        }, 350);
      }
    }
  }

  setIdxLabel();
  setDots();
  setRowsVisible(0);
  paintTyped();
  tick();

  // Cleanup hook attached on the container so the React useEffect can dispose.
  (R as any).__v4Cleanup = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    R.removeEventListener('scroll', onScroll);
  };
}

// ─── Web: mount outside React tree to escape Stack transforms/overflow ────────
function LandingPageWebDirect() {
  useEffect(() => {
    // Fonts — JetBrains Mono only (no Inter)
    let fontLink: HTMLLinkElement | null = null;
    if (!document.getElementById('v4-fonts')) {
      fontLink = document.createElement('link');
      fontLink.id = 'v4-fonts';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    }

    // CSS
    const style = document.createElement('style');
    style.id = 'v4-styles';
    style.textContent = V4_CSS;
    document.head.appendChild(style);

    // Mount directly on body
    const container = document.createElement('div');
    container.id = 'v4-landing';
    container.className = 'v4-root';
    container.style.cssText = [
      'position:fixed',
      'top:0', 'left:0', 'right:0', 'bottom:0',
      'z-index:9999',
      'overflow-y:auto',
      'overflow-x:hidden',
      'background:#09090B',
    ].join(';');
    container.innerHTML = V4_BODY;
    document.body.appendChild(container);

    runV4Scripts(container);

    return () => {
      const cleanup = (container as any).__v4Cleanup;
      if (typeof cleanup === 'function') cleanup();
      style.remove();
      container.remove();
      if (fontLink && fontLink.parentNode) fontLink.parentNode.removeChild(fontLink);
    };
  }, []);

  return null;
}

// ─── Native fallback (simplified RN port — same beats, no auto-typing) ────────
function LandingPageNative() {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const goTrial = () => router.push('/auth?plan=pro' as any);

  const FAQ_ITEMS = [
    { q: 'Is this manipulation?',
      a: "No — it's literacy. The people who study power are usually the ones who've been on the receiving end of it." },
    { q: 'Where do my texts go?',
      a: "Encrypted at rest, end-to-end on the wire, never used to train models. Delete a thread and the source is gone in under 60 seconds." },
    { q: 'How do I cancel?',
      a: "Account → Subscription → Cancel. Two taps, no retention loops." },
    { q: 'What counts as a "decode"?',
      a: "One inbound message, or a short thread (≤8 messages) read as one. Pro is unlimited — no caps, no metering." },
    { q: 'Can I use it on my own texts?',
      a: "Yes — and you should. Run your own drafts before you send. Most users find their first month of value comes from catching their own anxious-protest replies before they hit send." },
  ];

  const PROBLEM = [
    { tag: 'CHATGPT',     line: 'agrees with whatever you say.' },
    { tag: 'FRIENDS',     line: 'are tired of hearing about it.' },
    { tag: 'THERAPISTS',  line: 'tell you to "communicate openly" — useless when they\'re the one being unclear.' },
    { tag: 'DATING SUBS', line: 'give you 200 conflicting takes from strangers.' },
  ];

  const FOR_YOU = [
    'You read Greene or Cialdini.',
    'You find "just communicate" insulting.',
    'You want clarity, not comfort.',
  ];
  const NOT_FOR_YOU = [
    'You want a supportive friend.',
    "You're looking for couples therapy.",
    'You want to be told you\'re right.',
  ];

  const sample = DECODE_SAMPLES[0];

  return (
    <>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1, backgroundColor: '#09090B' }}>
        {/* ─── Hero ──────────────────────────────────────────────────────── */}
        <View style={{ paddingTop: 96, paddingHorizontal: 24, paddingBottom: 56 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <Text style={{ color: '#CCFF00', fontSize: 10, marginRight: 8 }}>{'●'}</Text>
            <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.6, color: '#71717a' }}>
              RELATIONSHIP INTELLIGENCE
            </Text>
          </View>
          <Text style={{ fontFamily: 'Courier New', fontSize: 44, fontWeight: '500', color: '#fafafa', letterSpacing: -1, lineHeight: 44, textAlign: 'center' }}>
            Decode any text{'\n'}in <Text style={{ color: '#CCFF00' }}>30 seconds</Text>.
          </Text>
          <Text style={{ marginTop: 20, fontFamily: 'Courier New', fontSize: 14, color: '#a1a1aa', lineHeight: 22, textAlign: 'center' }}>
            Built on Robert Greene, Freud, Kamasutra, and attachment theory.
          </Text>
          <TouchableOpacity
            onPress={goTrial}
            style={{ marginTop: 32, alignSelf: 'center', backgroundColor: '#CCFF00', paddingVertical: 12, paddingHorizontal: 18 }}
          >
            <Text style={{ fontFamily: 'Courier New', fontSize: 12, letterSpacing: 1.6, fontWeight: '600', color: '#000' }}>
              SEE IT DECODE {'↓'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Decoder mockup (static single sample) ────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 56, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: '#CCFF00', fontSize: 10, marginRight: 8 }}>{'●'}</Text>
            <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 2, color: '#71717a' }}>LIVE DECODE</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: '#27272a', backgroundColor: '#0b0b0d' }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#27272a', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, color: '#71717a', letterSpacing: 1.8 }}>DARKO // DECODE.v2.4</Text>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, color: '#CCFF00' }}>{'●'} LIVE</Text>
            </View>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.6, color: '#71717a', marginBottom: 8 }}>{'>'} INPUT</Text>
              <View style={{ borderWidth: 1, borderColor: '#27272a', padding: 12 }}>
                <Text style={{ fontFamily: 'Courier New', fontSize: 14, color: '#fafafa', lineHeight: 20 }}>
                  <Text style={{ color: '#52525b' }}>"</Text>{sample.text}<Text style={{ color: '#52525b' }}>"</Text>
                </Text>
              </View>
            </View>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, color: '#71717a', letterSpacing: 1.6 }}>VERDICT</Text>
              <Text style={{ marginTop: 6, fontFamily: 'Courier New', fontSize: 16, color: '#fafafa' }}>{sample.verdict}</Text>
            </View>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, color: '#71717a', letterSpacing: 1.6 }}>PSYCHOLOGY</Text>
              <Text style={{ marginTop: 6, fontFamily: 'Courier New', fontSize: 13, color: '#d4d4d8', lineHeight: 20 }}>{sample.psych}</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, color: '#71717a', letterSpacing: 1.6 }}>FRAMEWORK</Text>
              <Text style={{ marginTop: 6, fontFamily: 'Courier New', fontSize: 11, color: '#CCFF00', letterSpacing: 1.4 }}>{sample.law}</Text>
              <Text style={{ marginTop: 8, fontFamily: 'Courier New', fontSize: 13, color: '#d4d4d8', lineHeight: 20 }}>
                <Text style={{ color: '#52525b' }}>{'↳'} MOVE  </Text>{sample.move}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Problem ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 56, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 2, color: '#CCFF00', marginBottom: 32 }}>
            01 //  THE PROBLEM
          </Text>
          <View style={{ borderWidth: 1, borderColor: '#27272a' }}>
            {PROBLEM.map((r, i) => (
              <View key={r.tag} style={{ padding: 16, borderBottomWidth: i < PROBLEM.length - 1 ? 1 : 0, borderBottomColor: '#27272a' }}>
                <Text style={{ fontFamily: 'Courier New', fontSize: 11, letterSpacing: 1.8, color: '#CCFF00', marginBottom: 4 }}>
                  0{i + 1}  {r.tag}
                </Text>
                <Text style={{ fontFamily: 'Courier New', fontSize: 14, color: '#d4d4d8', lineHeight: 20 }}>{r.line}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Fit ──────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 56, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 2, color: '#CCFF00', marginBottom: 32 }}>
            02 //  FIT
          </Text>
          <View style={{ borderWidth: 1, borderColor: '#27272a', padding: 24, marginBottom: 1 }}>
            <Text style={{ fontFamily: 'Courier New', fontSize: 11, letterSpacing: 2, color: '#CCFF00', marginBottom: 16 }}>FOR YOU</Text>
            {FOR_YOU.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Courier New', fontSize: 11, color: '#CCFF00', marginRight: 12, marginTop: 3 }}>[+]</Text>
                <Text style={{ flex: 1, fontFamily: 'Courier New', fontSize: 15, color: '#fafafa', lineHeight: 22 }}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ borderWidth: 1, borderColor: '#27272a', padding: 24 }}>
            <Text style={{ fontFamily: 'Courier New', fontSize: 11, letterSpacing: 2, color: '#71717a', marginBottom: 16 }}>NOT FOR YOU</Text>
            {NOT_FOR_YOU.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Courier New', fontSize: 11, color: '#3f3f46', marginRight: 12, marginTop: 3 }}>{'[ — ]'}</Text>
                <Text style={{ flex: 1, fontFamily: 'Courier New', fontSize: 15, color: '#71717a', lineHeight: 22, textDecorationLine: 'line-through' }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Pricing ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 56, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 2, color: '#CCFF00', marginBottom: 32 }}>
            03 //  PRICING
          </Text>
          <View style={{ borderWidth: 1, borderColor: '#CCFF00', backgroundColor: 'rgba(204,255,0,0.04)', padding: 24, position: 'relative' }}>
            <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#CCFF00', paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.8, color: '#000' }}>DARKO PRO</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 64, color: '#fafafa', letterSpacing: -2, lineHeight: 64 }}>$15</Text>
              <Text style={{ fontFamily: 'Courier New', fontSize: 13, color: '#71717a', marginLeft: 8, marginBottom: 8 }}>/month</Text>
            </View>
            <Text style={{ marginTop: 12, fontFamily: 'Courier New', fontSize: 14, color: '#d4d4d8', lineHeight: 22 }}>
              Less than one therapy session. Unlimited decodes.
            </Text>
            <TouchableOpacity
              onPress={goTrial}
              style={{ marginTop: 24, alignSelf: 'flex-start', backgroundColor: '#CCFF00', paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Courier New', fontSize: 12, letterSpacing: 1.8, fontWeight: '600', color: '#000', marginRight: 16 }}>
                START 4-DAY FREE TRIAL
              </Text>
              <Text style={{ fontFamily: 'Courier New', fontSize: 14, color: '#000' }}>{'→'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 16, borderWidth: 1, borderColor: '#27272a', padding: 16 }}>
            <Text style={{ fontFamily: 'Courier New', fontSize: 11, letterSpacing: 1.4, color: '#71717a' }}>
              <Text style={{ color: '#d4d4d8' }}>DARKO EXECUTIVE</Text> {'·'} $100/mo {'·'} invite-only
            </Text>
          </View>
        </View>

        {/* ─── FAQ ──────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 56, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 2, color: '#CCFF00', marginBottom: 32 }}>
            04 //  FAQ
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: '#27272a' }}>
            {FAQ_ITEMS.map((it, i) => {
              const open = expanded === i;
              return (
                <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
                  <TouchableOpacity
                    onPress={() => setExpanded(open ? null : i)}
                    style={{ paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                      <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.8, color: '#52525b', width: 40, marginTop: 2 }}>
                        Q.0{i + 1}
                      </Text>
                      <Text style={{ flex: 1, fontFamily: 'Courier New', fontSize: 15, color: '#fafafa', lineHeight: 22 }}>{it.q}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Courier New', fontSize: 18, color: '#CCFF00', marginLeft: 12, transform: [{ rotate: open ? '45deg' : '0deg' }] }}>+</Text>
                  </TouchableOpacity>
                  {open && (
                    <View style={{ paddingLeft: 40, paddingBottom: 18 }}>
                      <Text style={{ fontFamily: 'Courier New', fontSize: 13, color: '#a1a1aa', lineHeight: 22 }}>
                        <Text style={{ color: '#52525b' }}>A.  </Text>{it.a}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── Closer ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 64, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 40, color: '#fafafa', letterSpacing: -1, lineHeight: 42, textAlign: 'center' }}>
            Stop guessing.{'\n'}
            <Text style={{ color: '#CCFF00' }}>Start reading.</Text>
          </Text>
          <TouchableOpacity
            onPress={goTrial}
            style={{ marginTop: 32, alignSelf: 'center', backgroundColor: '#CCFF00', paddingVertical: 14, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Courier New', fontSize: 13, letterSpacing: 1.8, fontWeight: '600', color: '#000', marginRight: 16 }}>
              START 4-DAY FREE TRIAL
            </Text>
            <Text style={{ fontFamily: 'Courier New', fontSize: 14, color: '#000' }}>{'→'}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Footer ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 8, height: 8, backgroundColor: '#CCFF00', marginRight: 8 }} />
            <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.8, color: '#CCFF00' }}>DARKO</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.push('/privacy' as any)}><Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.6, color: '#71717a', marginRight: 20 }}>PRIVACY</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/terms' as any)}><Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.6, color: '#71717a', marginRight: 20 }}>TERMS</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/contact' as any)}><Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.6, color: '#71717a' }}>CONTACT</Text></TouchableOpacity>
          </View>
          <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.6, color: '#52525b' }}>{'©'} 2026 DARKO LABS</Text>
        </View>
      </ScrollView>
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function LandingPageV4() {
  if (Platform.OS === 'web') {
    return <LandingPageWebDirect />;
  }
  return <LandingPageNative />;
}
