import React, { useEffect, useRef } from 'react';
import { Platform, View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// ─── Exact CSS from DARKO v3.html ─────────────────────────────────────────────
const V3_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0a;--s1:#18181b;--s2:#1e1e21;--b:#27272a;--b2:#3f3f46;
  --dim:#52525b;--muted:#a1a1aa;--text:#fafafa;--a:#CCFF00;
  --a8:rgba(204,255,0,0.08);--a15:rgba(204,255,0,0.15);
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --sans:'Inter',ui-sans-serif,system-ui,sans-serif;
  --ease:cubic-bezier(0.4,0,0.2,1);
  --nav-h:52px;
}
.v3-root{background:var(--bg);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden;}
::selection{background:var(--a);color:#000}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--b2)}

.nav{position:fixed;top:0;left:0;right:0;z-index:500;height:var(--nav-h);background:transparent;border-bottom:1px solid transparent;display:flex;align-items:center;padding:0 32px;gap:0;transition:background 300ms var(--ease),border-color 300ms var(--ease),backdrop-filter 300ms var(--ease);}
.nav.scrolled{background:rgba(10,10,10,0.7);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border-bottom:1px solid var(--b);}
.nav-logo{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:0.2em;color:var(--a);text-decoration:none;margin-right:40px;flex-shrink:0;}
.nav-logo-sq{width:12px;height:12px;background:var(--a);flex-shrink:0}
.nav-links{display:flex;gap:28px;flex:1}
.nav-link{font-family:var(--mono);font-size:10px;letter-spacing:0.14em;color:var(--dim);text-decoration:none;position:relative;padding-bottom:3px;transition:color 200ms var(--ease);}
.nav-link::after{content:'';position:absolute;bottom:0;left:0;right:100%;height:1px;background:var(--a);transition:right 200ms var(--ease);}
.nav-link:hover{color:var(--text)}
.nav-link:hover::after{right:0}
.nav-right{display:flex;align-items:center;gap:20px}
.btn-signin{padding:7px 20px;border:1px solid var(--a);color:var(--a);background:transparent;font-family:var(--mono);font-size:10px;letter-spacing:0.14em;cursor:pointer;transition:all 200ms var(--ease);}
.btn-signin:hover{background:var(--a);color:#000}

.ticker{position:fixed;top:var(--nav-h);left:0;right:0;z-index:499;height:28px;background:var(--s1);border-bottom:1px solid var(--b);display:flex;align-items:center;overflow:hidden;}
.ticker-inner{display:flex;align-items:center;white-space:nowrap;animation:tickscroll 30s linear infinite;}
@keyframes tickscroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.ticker-item{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:0.12em;padding:0 20px;display:inline-flex;align-items:center;gap:8px;}
.ticker-sep{color:var(--b2);font-size:8px}
.ticker-val{color:var(--a)}

.hero{min-height:100vh;padding-top:calc(var(--nav-h) + 28px);display:grid;grid-template-columns:60fr 40fr;max-width:1280px;margin:0 auto;padding-left:32px;padding-right:32px;padding-bottom:64px;align-items:center;gap:0;position:relative;}
.hero::before{content:'';position:absolute;top:calc(var(--nav-h)+28px);left:0;right:0;bottom:0;pointer-events:none;background-image:linear-gradient(var(--b) 1px,transparent 1px),linear-gradient(90deg,var(--b) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 60% 70% at 15% 40%,black,transparent 65%);-webkit-mask-image:radial-gradient(ellipse 60% 70% at 15% 40%,black,transparent 65%);opacity:0.18;}
.hero-left{padding-right:56px;border-right:1px solid var(--b);padding-top:32px;padding-bottom:32px}
.kicker{font-family:var(--mono);font-size:9.5px;color:var(--a);letter-spacing:0.2em;margin-bottom:28px;display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(14px);transition:opacity 0.5s var(--ease),transform 0.5s var(--ease);}
.kicker-line{display:inline-block;width:16px;height:1px;background:var(--a)}
.headline{font-family:var(--sans);font-weight:900;font-size:clamp(52px,6vw,84px);line-height:0.9;letter-spacing:-0.04em;margin-bottom:28px;opacity:0;transform:translateY(14px);transition:opacity 0.5s var(--ease) 0.1s,transform 0.5s var(--ease) 0.1s;}
.headline-white{color:var(--text);display:block}
.headline-accent{color:var(--a);display:block}
.sub{font-size:16px;color:var(--muted);line-height:1.65;max-width:440px;margin-bottom:40px;opacity:0;transform:translateY(14px);transition:opacity 0.5s var(--ease) 0.22s,transform 0.5s var(--ease) 0.22s;}
.cta-row{display:flex;align-items:center;gap:20px;opacity:0;transform:translateY(14px);transition:opacity 0.5s var(--ease) 0.32s,transform 0.5s var(--ease) 0.32s;}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
.btn-primary{padding:11px 28px;color:#000;border:none;font-family:var(--mono);font-size:11px;letter-spacing:0.14em;font-weight:600;cursor:pointer;position:relative;overflow:hidden;background:linear-gradient(105deg,var(--text) 0%,var(--text) 35%,rgba(255,255,255,0.55) 50%,var(--text) 65%,var(--text) 100%);background-size:300% 100%;background-position:200% center;animation:shimmer 3s ease-in-out infinite;transition:opacity 200ms var(--ease);}
.btn-primary:hover{opacity:0.88;animation-play-state:paused}
.btn-ghost{font-family:var(--mono);font-size:10px;color:var(--dim);text-decoration:none;letter-spacing:0.1em;position:relative;padding-bottom:2px;transition:color 200ms var(--ease);}
.btn-ghost::after{content:'';position:absolute;bottom:0;left:0;right:100%;height:1px;background:var(--a);transition:right 200ms var(--ease);}
.btn-ghost:hover{color:var(--text)}
.btn-ghost:hover::after{right:0}
.hero-right{padding-left:48px;padding-top:32px;padding-bottom:32px;position:relative;}
.hero-right::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:380px;height:380px;background:radial-gradient(circle,rgba(204,255,0,0.08) 0%,transparent 70%);pointer-events:none;z-index:0;filter:blur(40px);opacity:var(--glow-opacity,1);transition:opacity 0.4s;}
.decode-panel{background:rgba(24,24,27,0.6);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,0.06);border-left:2px solid var(--a);opacity:0;transform:translateY(14px);transition:opacity 0.5s var(--ease) 0.18s,transform 0.5s var(--ease) 0.18s;position:relative;z-index:1;}
.dp-header{padding:12px 18px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;}
.dp-title{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:0.1em}
.dp-dots{display:flex;gap:5px}
.dp-dot{width:7px;height:7px;border-radius:50%;background:var(--b2)}
.dp-live{width:7px;height:7px;border-radius:50%;background:var(--a);animation:dpulse 2s ease-in-out infinite}
@keyframes dpulse{0%,100%{opacity:1}50%{opacity:0.3}}
.dp-body{padding:0}
.dp-section{border-bottom:1px solid var(--b);padding:14px 18px 12px;}
.dp-section:last-child{border-bottom:none}
.dp-sec-label{font-family:var(--mono);font-size:9px;color:var(--a);letter-spacing:0.1em;margin-bottom:10px;}
.dp-row{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px solid rgba(39,39,42,0.4);opacity:0;transition:opacity 0.3s var(--ease);}
.dp-row:last-child{border-bottom:none}
.dp-row.visible{opacity:1}
.dp-key{font-family:var(--mono);font-size:9px;color:var(--muted);letter-spacing:0.06em;flex:0 0 160px}
.dp-val{font-family:var(--mono);font-size:10px;color:var(--text);font-weight:500;flex:1}
.dp-pct{font-family:var(--mono);font-size:10px;color:var(--a);font-weight:600;flex-shrink:0;padding-left:12px;text-align:right;min-width:40px;}

.caps-section{padding:100px 32px;max-width:1280px;margin:0 auto;border-top:1px solid var(--b);}
.section-kicker{font-family:var(--mono);font-size:9.5px;color:var(--a);letter-spacing:0.2em;margin-bottom:48px;display:flex;align-items:center;gap:12px;}
.section-kicker::after{content:'';flex:1;height:1px;background:var(--b)}
.caps-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--b);margin-bottom:80px;}
.cap-card{background:var(--s1);padding:36px 32px;position:relative;overflow:hidden;transition:background 200ms var(--ease);}
.cap-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--a);transform:scaleY(0);transform-origin:bottom;transition:transform 200ms var(--ease);}
.cap-card:hover::before{transform:scaleY(1)}
.cap-card:hover{background:var(--s2)}
.cap-label{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:0.14em;margin-bottom:10px;}
.cap-title{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-0.02em;margin-bottom:10px;line-height:1.15;}
.cap-desc{font-size:13px;color:var(--muted);line-height:1.65}
.cap-soon .cap-label,.cap-soon .cap-title,.cap-soon .cap-desc{color:var(--dim)}
.quote-block{text-align:center;padding:0 40px;position:relative}
.quote-text{font-family:var(--sans);font-size:clamp(28px,3.5vw,46px);font-weight:800;color:var(--text);letter-spacing:-0.025em;line-height:1.15;margin-bottom:20px;position:relative;}
.quote-mark{color:var(--a);font-family:var(--sans);font-weight:900}
.quote-attr{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:0.14em}

.pricing-section{padding:100px 32px;max-width:1280px;margin:0 auto;border-top:1px solid var(--b);}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--b);}
.price-card{background:var(--s1);padding:32px 28px;position:relative;overflow:hidden}
.price-card.featured{background:#0d1000;border:1px solid var(--a);box-shadow:inset 0 0 60px rgba(204,255,0,0.04);}
.price-tier{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:0.18em;margin-bottom:16px}
.price-number{font-family:var(--sans);font-size:44px;font-weight:900;color:var(--text);letter-spacing:-0.04em;line-height:1;margin-bottom:4px;}
.price-number sup{font-size:22px;font-weight:700;vertical-align:top;margin-top:7px;display:inline-block}
.price-per{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:0.1em;margin-bottom:24px}
.price-features{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:28px}
.pf{font-size:13px;color:var(--muted);display:flex;gap:10px;align-items:flex-start;line-height:1.45}
.pf::before{content:'▸';color:var(--dim);font-family:var(--mono);font-size:10px;flex-shrink:0;margin-top:1px;transition:color 200ms var(--ease)}
.price-card:hover .pf::before{color:var(--a)}
.price-badge{position:absolute;top:16px;right:18px;font-family:var(--mono);font-size:8px;letter-spacing:0.12em;padding:3px 10px;}
.badge-invite{background:var(--a);color:#000}
.btn-ghost-price{width:100%;padding:10px 0;background:transparent;border:1px solid var(--b);color:var(--dim);font-family:var(--mono);font-size:10px;letter-spacing:0.12em;cursor:pointer;transition:all 200ms var(--ease);}
.btn-ghost-price:hover{border-color:var(--a);color:var(--a)}
.btn-white-price{width:100%;padding:10px 0;background:var(--text);border:1px solid var(--text);color:#000;font-family:var(--mono);font-size:10px;letter-spacing:0.12em;font-weight:600;cursor:pointer;transition:opacity 200ms var(--ease);}
.btn-white-price:hover{opacity:0.85}
.btn-accent-price{width:100%;padding:10px 0;border:1px solid var(--a);color:#000;font-family:var(--mono);font-size:10px;letter-spacing:0.12em;font-weight:700;cursor:pointer;position:relative;overflow:hidden;background:linear-gradient(105deg,var(--a) 0%,var(--a) 35%,rgba(255,255,255,0.3) 50%,var(--a) 65%,var(--a) 100%);background-size:300% 100%;background-position:200% center;animation:shimmer 3s ease-in-out 1.5s infinite;transition:opacity 200ms var(--ease);}
.btn-accent-price:hover{opacity:0.88;animation-play-state:paused}

.footer{border-top:1px solid var(--b);background:var(--s1);height:36px;display:flex;align-items:center;overflow:hidden;}
.footer-inner{display:flex;align-items:center;white-space:nowrap;animation:tickscroll 28s linear infinite;}

.reveal{opacity:0;transform:translateY(20px);transition:opacity 0.55s var(--ease),transform 0.55s var(--ease)}
.reveal.in{opacity:1;transform:translateY(0)}
.reveal-delay-1{transition-delay:0.1s}
.reveal-delay-2{transition-delay:0.2s}
.reveal-delay-3{transition-delay:0.3s}
.reveal-delay-4{transition-delay:0.4s}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.cursor{display:inline-block;width:0.5em;height:0.85em;background:var(--a);vertical-align:middle;animation:blink 1s step-end infinite;margin-left:1px;}

@media(max-width:900px){
  .hero{grid-template-columns:1fr;padding-top:calc(var(--nav-h)+28px+16px)}
  .hero-left{padding-right:0;border-right:none;border-bottom:1px solid var(--b);padding-bottom:36px}
  .hero-right{padding-left:0;padding-top:36px}
  .caps-grid{grid-template-columns:1fr}
  .pricing-grid{grid-template-columns:1fr}
  .nav-links{display:none}
  .headline{font-size:clamp(44px,11vw,64px)}
}
`;

// ─── Exact HTML body from DARKO v3.html ──────────────────────────────────────
const V3_BODY = `
<nav class="nav">
  <a href="#" class="nav-logo"><div class="nav-logo-sq"></div>DARKO</a>
  <div class="nav-links">
    <a href="#capabilities" class="nav-link">CAPABILITIES</a>
    <a href="#pricing" class="nav-link">PRICING</a>
    <a href="#" class="nav-link">DOCS</a>
  </div>
  <div class="nav-right">
    <button class="btn-signin">SIGN IN</button>
  </div>
</nav>

<div class="ticker">
  <div class="ticker-inner" id="ticker-inner"></div>
</div>

<section class="hero">
  <div class="hero-left">
    <div class="kicker"><span class="kicker-line"></span>// RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0</div>
    <h1 class="headline">
      <span class="headline-white">STOP</span>
      <span class="headline-accent">GUESSING.</span>
    </h1>
    <p class="sub">Paste their texts, DMs, or screenshots. DARKO reads the psychology underneath — attachment style, manipulation patterns, and what they actually want from you. Then gives you the exact move.</p>
    <div class="cta-row">
      <button class="btn-primary">GET EARLY ACCESS</button>
      <a href="#capabilities" class="btn-ghost">SEE HOW IT WORKS</a>
    </div>
  </div>
  <div class="hero-right">
    <div class="decode-panel" id="decode-panel">
      <div class="dp-header">
        <span class="dp-title">DARKO ENGINE v4.0 — LIVE ANALYSIS STREAM</span>
        <div class="dp-dots"><div class="dp-dot"></div><div class="dp-dot"></div><div class="dp-live"></div></div>
      </div>
      <div class="dp-body">
        <div class="dp-section">
          <div class="dp-sec-label">// BEHAVIORAL PROFILE</div>
          <div class="dp-row" data-val="ANXIOUS-PREOCCUPIED" data-pct="91"><span class="dp-key">ATTACHMENT_STYLE</span><span class="dp-val"></span><span class="dp-pct">0%</span></div>
          <div class="dp-row" data-val="INTERMITTENT REINF." data-pct="87"><span class="dp-key">COMM_PATTERN</span><span class="dp-val"></span><span class="dp-pct">0%</span></div>
          <div class="dp-row" data-val="BEING SEEN SPECIFICALLY" data-pct="79"><span class="dp-key">VULNERABILITY</span><span class="dp-val"></span><span class="dp-pct">0%</span></div>
        </div>
        <div class="dp-section">
          <div class="dp-sec-label">// OPERATIONAL VECTORS</div>
          <div class="dp-row" data-val="WOUNDED" data-pct="94"><span class="dp-key">ARCHETYPE</span><span class="dp-val"></span><span class="dp-pct">0%</span></div>
          <div class="dp-row" data-val="APPROACH \u2192 DECIDE" data-pct="88"><span class="dp-key">CAMPAIGN_PHASE</span><span class="dp-val"></span><span class="dp-pct">0%</span></div>
        </div>
        <div class="dp-section">
          <div class="dp-sec-label">// RECOMMENDED MOVE</div>
          <div class="dp-row" data-val="PATTERN INTERRUPT" data-pct="82"><span class="dp-key">TACTIC</span><span class="dp-val"></span><span class="dp-pct">0%</span></div>
          <div class="dp-row" data-val='"I noticed you went quiet \u2014 doing okay?"' data-pct=""><span class="dp-key">SCRIPT</span><span class="dp-val" id="script-val" style="color:#CCFF00"></span><span class="dp-pct"></span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="caps-section" id="capabilities">
  <div class="section-kicker reveal">// CAPABILITIES</div>
  <div class="caps-grid">
    <div class="cap-card reveal reveal-delay-1">
      <div class="cap-label">01 \u2014 ATTACHMENT DECODE</div>
      <div class="cap-title">Read their wiring,<br>not their words.</div>
      <div class="cap-desc">Anxious, avoidant, or disorganized \u2014 decoded from patterns in how they actually communicate. Not what they say. What they do.</div>
    </div>
    <div class="cap-card reveal reveal-delay-2">
      <div class="cap-label">02 \u2014 SIGNAL DETECTION</div>
      <div class="cap-title">Every pull and push,<br>mapped and explained.</div>
      <div class="cap-desc">Hot-and-cold cycles, intermittent reinforcement, withdrawal tactics. DARKO names them before you can feel the effect.</div>
    </div>
    <div class="cap-card reveal reveal-delay-3">
      <div class="cap-label">03 \u2014 LIVE PROFILE BUILD</div>
      <div class="cap-title">Watch clarity<br>construct itself.</div>
      <div class="cap-desc">Paste anything. A dossier assembles in real time \u2014 archetype, vulnerabilities, campaign phase, and the precise window to act.</div>
    </div>
    <div class="cap-card cap-soon reveal reveal-delay-4">
      <div class="cap-label">04 \u2014 CAMPAIGN ENGINE \u00b7 COMING SOON</div>
      <div class="cap-title">Multi-phase strategy,<br>not one-off moves.</div>
      <div class="cap-desc">A structured campaign across weeks. Phase tracking, pattern interrupt scheduling, and adaptive scripts built around their psychology.</div>
    </div>
  </div>
  <div class="quote-block reveal" id="quote-block">
    <div class="quote-text"><span class="quote-mark">"</span><span id="quote-text-inner"></span><span class="quote-mark">"</span></div>
    <div class="quote-attr" id="quote-attr"></div>
  </div>
</section>

<section class="pricing-section" id="pricing">
  <div class="section-kicker reveal">// PRICING</div>
  <div class="pricing-grid">
    <div class="price-card reveal reveal-delay-1">
      <div class="price-tier">OBSERVER</div>
      <div class="price-number">$0</div>
      <div class="price-per">/ FOREVER FREE</div>
      <ul class="price-features">
        <li class="pf">5 reads per month \u2014 enough to get uncomfortable</li>
        <li class="pf">Attachment style analysis</li>
        <li class="pf">Basic signal detection</li>
      </ul>
      <button class="btn-ghost-price">GET STARTED</button>
    </div>
    <div class="price-card reveal reveal-delay-2">
      <div class="price-tier">OPERATOR</div>
      <div class="price-number"><sup>$</sup>15</div>
      <div class="price-per">/ MONTH</div>
      <ul class="price-features">
        <li class="pf">No limits on who you decode</li>
        <li class="pf">Full behavioral profile \u2014 every vector</li>
        <li class="pf">Tactical move recommendations</li>
        <li class="pf">90-day history and export</li>
        <li class="pf">Priority processing</li>
      </ul>
      <button class="btn-white-price">START OPERATING</button>
    </div>
    <div class="price-card featured reveal reveal-delay-3">
      <div class="price-badge badge-invite">INVITE ONLY</div>
      <div class="price-tier">EXECUTIVE</div>
      <div class="price-number"><sup>$</sup>100</div>
      <div class="price-per">/ MONTH \u00b7 INVITE ONLY</div>
      <ul class="price-features">
        <li class="pf">Everything in Operator \u2014 without ceilings</li>
        <li class="pf">Multi-target simultaneous tracking</li>
        <li class="pf">4-phase campaign engine with phase locks</li>
        <li class="pf">Custom archetype model training</li>
        <li class="pf">API access + white-label export</li>
        <li class="pf">Direct handler support</li>
      </ul>
      <button class="btn-accent-price">REQUEST ACCESS</button>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="footer-inner" id="footer-ticker"></div>
</footer>
`;

// ─── Scripts (adapted from v3.html — uses container R instead of window scroll) ─
function runV3Scripts(R: HTMLElement) {
  // Hero entrance
  requestAnimationFrame(() => {
    ['.kicker', '.headline', '.sub', '.cta-row', '.decode-panel'].forEach(sel => {
      const el = R.querySelector(sel) as HTMLElement | null;
      if (el) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }
    });
  });

  // Nav frosted on container scroll
  const navEl = R.querySelector('.nav') as HTMLElement | null;
  R.addEventListener('scroll', () => {
    navEl?.classList.toggle('scrolled', R.scrollTop > 10);
  }, { passive: true });

  // Build tickers
  const STATUS_ITEMS = [
    { label: 'HANDLER ONLINE', val: null as string | null, dot: true },
    { label: 'DECODE ENGINE ACTIVE', val: null as string | null, dot: true },
    { label: 'ENGINE', val: 'DARKO v4.0', dot: false },
    { label: 'LATENCY', val: '142ms', dot: false },
    { label: 'ENCRYPTION', val: 'AES-256', dot: false },
    { label: 'DARKO \u00b7 NXGEN MEDIA LLC \u00b7 2026', val: null as string | null, dot: false },
  ];

  function buildTicker(el: Element | null) {
    if (!el) return;
    el.innerHTML = [...STATUS_ITEMS, ...STATUS_ITEMS].map(item => {
      const dot = item.dot
        ? `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#CCFF00;margin-right:6px;vertical-align:middle;animation:dpulse 2s ease-in-out infinite"></span>`
        : '';
      const val = item.val ? `<span class="ticker-val">${item.val}</span>` : '';
      return `<span class="ticker-item">${dot}${item.label}${item.val ? '&nbsp;' : ''}${val}<span class="ticker-sep" style="margin-left:20px">\u00b7</span></span>`;
    }).join('');
  }

  buildTicker(R.querySelector('#ticker-inner'));
  buildTicker(R.querySelector('#footer-ticker'));

  // Decode panel row animations
  const rows = R.querySelectorAll<HTMLElement>('.dp-row');
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_\u2192\u2190\u2014';

  function animatePct(el: HTMLElement, target: number, duration: number) {
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target) + '%';
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target + '%';
    }
    requestAnimationFrame(tick);
  }

  function typewrite(el: HTMLElement, text: string) {
    let i = 0;
    const iv = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(iv);
    }, 22);
  }

  function glitchResolve(el: HTMLElement, finalText: string) {
    const end = performance.now() + 1800 * 0.7;
    const gi = setInterval(() => {
      if (performance.now() >= end) {
        clearInterval(gi);
        el.textContent = '';
        typewrite(el, finalText);
        return;
      }
      const len = Math.floor(Math.random() * 14) + 4;
      el.textContent = Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    }, 50);
  }

  rows.forEach((row, i) => {
    const val = row.querySelector<HTMLElement>('.dp-val');
    const pctEl = row.querySelector<HTMLElement>('.dp-pct');
    const isScript = !row.dataset.pct && !!row.dataset.val;
    setTimeout(() => {
      row.classList.add('visible');
      if (!val) return;
      if (isScript) {
        setTimeout(() => glitchResolve(val, row.dataset.val || ''), 100);
      } else {
        val.textContent = row.dataset.val || '';
        if (row.dataset.pct && pctEl) animatePct(pctEl, parseInt(row.dataset.pct), 1200);
      }
    }, 400 + i * 220);
  });

  // Greene quote rotator
  const QUOTES = [
    { text: 'Never assume that the person who seems open and friendly is being genuine. People show only what they want you to see.', attr: '\u2014 ROBERT GREENE \u00b7 THE 48 LAWS OF POWER' },
    { text: "Do not leave your reputation to chance or gossip; it is your life\u2019s artwork, and you must craft it, hone it, and display it.", attr: '\u2014 ROBERT GREENE \u00b7 THE 48 LAWS OF POWER' },
    { text: 'The most important skill in all of human interaction is the ability to see things from other people\u2019s point of view.', attr: '\u2014 ROBERT GREENE \u00b7 THE LAWS OF HUMAN NATURE' },
    { text: 'Keep people off-balance and in the dark by never revealing the purpose behind your actions.', attr: '\u2014 ROBERT GREENE \u00b7 THE 48 LAWS OF POWER' },
  ];
  let qi = 0;
  const quoteEl = R.querySelector<HTMLElement>('#quote-text-inner');
  const attrEl = R.querySelector<HTMLElement>('#quote-attr');

  function showQuote(idx: number) {
    const q = QUOTES[idx % QUOTES.length];
    if (quoteEl) quoteEl.style.opacity = '0';
    if (attrEl) attrEl.style.opacity = '0';
    setTimeout(() => {
      if (quoteEl) { quoteEl.textContent = q.text; quoteEl.style.transition = 'opacity 0.5s'; quoteEl.style.opacity = '1'; }
      if (attrEl) { attrEl.textContent = q.attr; attrEl.style.transition = 'opacity 0.5s 0.1s'; attrEl.style.opacity = '1'; }
    }, 300);
  }
  showQuote(0);
  setInterval(() => { qi++; showQuote(qi); }, 6000);

  // Scroll reveal — use R as IntersectionObserver root
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.06, root: R });
  R.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  // Smooth scroll anchor links within container
  R.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      const target = R.querySelector<HTMLElement>(href);
      if (target) {
        const rTop = R.getBoundingClientRect().top;
        const tTop = target.getBoundingClientRect().top;
        R.scrollTo({ top: R.scrollTop + tTop - rTop - 80, behavior: 'smooth' });
      }
    });
  });

  // SPA navigation wiring
  R.querySelector('.btn-signin')?.addEventListener('click', () => { window.location.href = '/auth'; });
  R.querySelector('.btn-primary')?.addEventListener('click', () => { window.location.href = '/auth'; });
  R.querySelector('.btn-ghost-price')?.addEventListener('click', () => { window.location.href = '/auth'; });
  R.querySelector('.btn-white-price')?.addEventListener('click', () => { window.location.href = '/auth'; });
  R.querySelector('.btn-accent-price')?.addEventListener('click', () => { window.location.href = '/pricing'; });
}

// ─── Web: direct HTML injection (pixel-perfect match) ────────────────────────
function LandingPageWebDirect() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Inject fonts
    if (!document.getElementById('v3-fonts')) {
      const l = document.createElement('link');
      l.id = 'v3-fonts';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
      document.head.appendChild(l);
    }
    // Inject CSS
    if (!document.getElementById('v3-styles')) {
      const s = document.createElement('style');
      s.id = 'v3-styles';
      s.textContent = V3_CSS;
      document.head.appendChild(s);
    }

    const R = ref.current;
    if (!R) return;

    runV3Scripts(R);

    return () => {
      document.getElementById('v3-styles')?.remove();
    };
  }, []);

  // Use React.createElement so dangerouslySetInnerHTML works (not available on RN View)
  return React.createElement('div', {
    ref,
    className: 'v3-root',
    dangerouslySetInnerHTML: { __html: V3_BODY },
    style: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: '#0a0a0a',
    },
  });
}

// ─── Native fallback (simplified) ─────────────────────────────────────────────
function LandingPageNative() {
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);
  const [qi, setQi] = React.useState(0);

  const QUOTES = [
    'Never assume that the person who seems open and friendly is being genuine.',
    'Do not leave your reputation to chance or gossip; it is your life\'s artwork.',
    'The most important skill is the ability to see things from other people\'s point of view.',
    'Keep people off-balance and in the dark by never revealing the purpose behind your actions.',
  ];

  React.useEffect(() => {
    const iv = setInterval(() => setQi(p => (p + 1) % QUOTES.length), 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0a0a0a' }}
        onScroll={e => setScrolled(e.nativeEvent.contentOffset.y > 10)}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <View style={{ paddingTop: 120, paddingHorizontal: 24, paddingBottom: 48, backgroundColor: '#0a0a0a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 9, letterSpacing: 2, color: '#CCFF00', marginBottom: 24 }}>
            // RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0
          </Text>
          <Text style={{ fontSize: 56, fontWeight: '900', color: '#CCFF00', letterSpacing: -2, lineHeight: 50, marginBottom: 24 }}>
            STOP{'\n'}GUESSING.
          </Text>
          <Text style={{ fontSize: 15, color: '#a1a1aa', lineHeight: 24, marginBottom: 32 }}>
            Paste their texts, DMs, or screenshots. DARKO reads the psychology underneath — attachment style, manipulation patterns, and what they actually want from you.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth' as any)}
            style={{ backgroundColor: '#fafafa', paddingVertical: 13, paddingHorizontal: 28, alignSelf: 'flex-start', marginBottom: 16 }}
          >
            <Text style={{ fontFamily: 'Courier New', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, color: '#0a0a0a' }}>GET EARLY ACCESS</Text>
          </TouchableOpacity>
        </View>

        {/* Capabilities */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 48, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 9, letterSpacing: 2, color: '#CCFF00', marginBottom: 24 }}>// CAPABILITIES</Text>
          {['ATTACHMENT DECODE', 'SIGNAL DETECTION', 'LIVE PROFILE BUILD', 'CAMPAIGN ENGINE'].map((cap, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: '#27272a', padding: 24, marginBottom: 1, backgroundColor: '#18181b' }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 9, color: '#52525b', letterSpacing: 1.4, marginBottom: 8 }}>0{i + 1} — {cap}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: i === 3 ? '#52525b' : '#fafafa', marginBottom: 8 }}>
                {['Read their wiring,\nnot their words.', 'Every pull and push,\nmapped and explained.', 'Watch clarity\nconstruct itself.', 'Multi-phase strategy,\nnot one-off moves.'][i]}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 48, borderTopWidth: 1, borderTopColor: '#27272a' }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 9, letterSpacing: 2, color: '#CCFF00', marginBottom: 24 }}>// PRICING</Text>
          {[
            { tier: 'OBSERVER', price: '$0', period: 'FOREVER FREE', btn: 'GET STARTED', route: '/auth' },
            { tier: 'OPERATOR', price: '$15', period: 'PER MONTH', btn: 'START OPERATING', route: '/auth' },
            { tier: 'EXECUTIVE', price: '$100', period: 'INVITE ONLY', btn: 'REQUEST ACCESS', route: '/pricing', featured: true },
          ].map((t, i) => (
            <View key={i} style={{ backgroundColor: t.featured ? '#0d1000' : '#18181b', borderWidth: 1, borderColor: t.featured ? '#CCFF00' : '#27272a', padding: 24, marginBottom: 1 }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 9, color: '#52525b', letterSpacing: 1.8, marginBottom: 12 }}>{t.tier}</Text>
              <Text style={{ fontSize: 40, fontWeight: '900', color: '#fafafa', marginBottom: 4 }}>{t.price}</Text>
              <Text style={{ fontFamily: 'Courier New', fontSize: 9, color: '#52525b', marginBottom: 24 }}>/ {t.period}</Text>
              <TouchableOpacity
                onPress={() => router.push(t.route as any)}
                style={{ borderWidth: 1, borderColor: t.featured ? '#CCFF00' : '#27272a', backgroundColor: t.featured ? '#CCFF00' : 'transparent', paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'Courier New', fontSize: 10, letterSpacing: 1.2, color: t.featured ? '#000' : '#a1a1aa' }}>{t.btn}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 36, backgroundColor: '#18181b', borderTopWidth: 1, borderTopColor: '#27272a', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontFamily: 'Courier New', fontSize: 9, color: '#52525b', letterSpacing: 1.2 }}>DARKO · NXGEN MEDIA LLC · 2026</Text>
        </View>
      </ScrollView>
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function LandingPageV3() {
  if (Platform.OS === 'web') {
    return <LandingPageWebDirect />;
  }
  return <LandingPageNative />;
}
