import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable,
  StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const C = {
  bg: '#0a0a0a', s1: '#18181b', s2: '#1e1e21', b: '#27272a', b2: '#3f3f46',
  dim: '#52525b', muted: '#a1a1aa', text: '#fafafa', a: '#CCFF00', a8: 'rgba(204,255,0,0.08)',
};
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: "'JetBrains Mono',ui-monospace,monospace" });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: "'Inter',ui-sans-serif,system-ui,sans-serif" });
const EASE = 'cubic-bezier(0.4,0,0.2,1)';

// ─── Injected web CSS ─────────────────────────────────────────────────────────
const WEB_CSS = `
.lp-kicker,.lp-headline,.lp-sub,.lp-cta-row,.lp-decode-panel{opacity:0;transform:translateY(14px)}
.lp-kicker{transition:opacity .5s ${EASE},transform .5s ${EASE}}
.lp-headline{transition:opacity .5s ${EASE} .1s,transform .5s ${EASE} .1s}
.lp-sub{transition:opacity .5s ${EASE} .22s,transform .5s ${EASE} .22s}
.lp-cta-row{transition:opacity .5s ${EASE} .32s,transform .5s ${EASE} .32s}
.lp-decode-panel{transition:opacity .5s ${EASE} .18s,transform .5s ${EASE} .18s;position:relative;z-index:1}
.lp-kicker.in,.lp-headline.in,.lp-sub.in,.lp-cta-row.in,.lp-decode-panel.in{opacity:1!important;transform:none!important}

.lp-hero{display:grid!important;grid-template-columns:60fr 40fr;min-height:100vh;padding-top:80px!important;max-width:1280px;margin:0 auto!important;padding-left:32px!important;padding-right:32px!important;padding-bottom:64px!important;align-items:center;gap:0;position:relative!important;width:100%;box-sizing:border-box;align-self:unset!important}
.lp-hero-texture{position:absolute;inset:0;background-image:linear-gradient(#27272a 1px,transparent 1px),linear-gradient(90deg,#27272a 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 60% 70% at 15% 40%,black,transparent 65%);-webkit-mask-image:radial-gradient(ellipse 60% 70% at 15% 40%,black,transparent 65%);opacity:.18;pointer-events:none;z-index:0}
.lp-hero-left{padding-right:56px!important;border-right:1px solid #27272a!important;padding-top:32px!important;padding-bottom:32px!important;flex:none!important;width:auto!important}
.lp-hero-right{padding-left:48px!important;padding-top:32px!important;padding-bottom:32px!important;position:relative!important;flex:none!important;width:auto!important}
.lp-hero-right::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:380px;height:380px;background:radial-gradient(circle,rgba(204,255,0,.08) 0%,transparent 70%);pointer-events:none;z-index:0;filter:blur(40px)}

.lp-nav-link{position:relative;padding-bottom:3px;transition:color 200ms ${EASE};cursor:pointer;display:inline-block}
.lp-nav-link::after{content:'';position:absolute;bottom:0;left:0;right:100%;height:1px;background:#CCFF00;transition:right 200ms ${EASE}}
.lp-nav-link:hover,.lp-nav-link:hover *{color:#fafafa!important}
.lp-nav-link:hover::after{right:0}
.lp-sign-in{cursor:pointer}
.lp-sign-in:hover{background:#CCFF00!important;transition:background 200ms ${EASE}}
.lp-sign-in:hover *{color:#000!important}
.lp-nav-scrolled{background:rgba(10,10,10,.7)!important;backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border-bottom-color:#27272a!important}

.lp-btn-ghost-cta{position:relative;padding-bottom:2px;transition:color 200ms ${EASE};cursor:pointer;display:inline-flex}
.lp-btn-ghost-cta::after{content:'';position:absolute;bottom:0;left:0;right:100%;height:1px;background:#CCFF00;transition:right 200ms ${EASE}}
.lp-btn-ghost-cta:hover,.lp-btn-ghost-cta:hover *{color:#fafafa!important}
.lp-btn-ghost-cta:hover::after{right:0}

.lp-caps-grid{display:grid!important;grid-template-columns:1fr 1fr;gap:1px!important;background:#27272a!important;margin-bottom:80px!important;flex-wrap:unset!important;flex-direction:unset!important}
.lp-cap-card{position:relative!important;overflow:hidden!important;transition:background 200ms ${EASE}!important;background:#18181b!important;width:auto!important;flex:none!important}
.lp-cap-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#CCFF00;transform:scaleY(0);transform-origin:bottom;transition:transform 200ms ${EASE}}
.lp-cap-card:hover::before{transform:scaleY(1)}
.lp-cap-card:hover{background:#1e1e21!important}

.lp-pricing-grid{display:grid!important;grid-template-columns:1fr 1fr 1fr;gap:1px!important;background:#27272a!important;flex-wrap:unset!important;flex-direction:unset!important}
.lp-price-card{position:relative!important;overflow:hidden!important;background:#18181b!important;width:auto!important;flex:none!important}
.lp-price-featured{background:#0d1000!important;border:1px solid #CCFF00!important;box-shadow:inset 0 0 60px rgba(204,255,0,.04)}
.lp-price-card:hover .lp-pf-bullet{color:#CCFF00!important}
.lp-btn-ghost-price{cursor:pointer;transition:border-color 200ms,color 200ms;display:block;width:100%;text-align:center}
.lp-btn-ghost-price:hover{border-color:#CCFF00!important}
.lp-btn-ghost-price:hover,.lp-btn-ghost-price:hover *{color:#CCFF00!important}
.lp-btn-white-price{cursor:pointer;transition:opacity 200ms;display:block;width:100%;text-align:center}
.lp-btn-white-price:hover{opacity:.85}
.lp-btn-accent-price{cursor:pointer;transition:opacity 200ms;display:block;width:100%;text-align:center}
.lp-btn-accent-price:hover{opacity:.88;animation-play-state:paused}

@keyframes lp-tickscroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.lp-ticker-anim{animation:lp-tickscroll 30s linear infinite;white-space:nowrap;display:inline-flex!important;flex-direction:row!important;align-items:center;height:100%}
.lp-footer-anim{animation:lp-tickscroll 28s linear infinite;white-space:nowrap;display:inline-flex!important;flex-direction:row!important;align-items:center;height:100%}

.lp-reveal{opacity:0;transform:translateY(20px);transition:opacity .55s ${EASE},transform .55s ${EASE}}
.lp-reveal.in{opacity:1!important;transform:none!important}
.lp-reveal-d1{transition-delay:.1s}.lp-reveal-d2{transition-delay:.2s}
.lp-reveal-d3{transition-delay:.3s}.lp-reveal-d4{transition-delay:.4s}

@keyframes lp-dpulse{0%,100%{opacity:1}50%{opacity:.3}}
.lp-dp-live{animation:lp-dpulse 2s ease-in-out infinite}

@media(max-width:900px){
  .lp-hero{grid-template-columns:1fr!important}
  .lp-hero-left{padding-right:0!important;border-right:none!important;border-bottom:1px solid #27272a!important;padding-bottom:36px!important}
  .lp-hero-right{padding-left:0!important;padding-top:36px!important}
  .lp-caps-grid{grid-template-columns:1fr!important}
  .lp-pricing-grid{grid-template-columns:1fr!important}
}
`;

function injectCSS() {
  if (typeof document === 'undefined' || document.getElementById('lp-v3-css')) return;
  const s = document.createElement('style');
  s.id = 'lp-v3-css';
  s.textContent = WEB_CSS;
  document.head.appendChild(s);
}

// className helper — only adds on web
function wc(cls: string): any {
  return Platform.OS === 'web' ? { className: cls } : {};
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Navigation({ scrolled }: { scrolled: boolean }) {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  const goTo = (id: string) => {
    if (typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <View
      nativeID={isWeb ? 'lp-nav' : undefined}
      {...(isWeb ? { className: scrolled ? 'lp-nav-scrolled' : '' } as any : {})}
      style={[styles.nav, !isWeb && scrolled && styles.navScrolledNative]}
    >
      <View style={styles.navContent}>
        <TouchableOpacity onPress={() => router.replace('/' as any)} style={styles.navLogo}>
          <View style={styles.navLogoSq} />
          <Text style={styles.navLogoText}>DARKO</Text>
        </TouchableOpacity>

        <View style={styles.navLinks}>
          <TouchableOpacity {...wc('lp-nav-link')} onPress={() => isWeb ? goTo('capabilities') : null}>
            <Text style={styles.navLink}>CAPABILITIES</Text>
          </TouchableOpacity>
          <TouchableOpacity {...wc('lp-nav-link')} onPress={() => router.push('/pricing' as any)}>
            <Text style={styles.navLink}>PRICING</Text>
          </TouchableOpacity>
          <TouchableOpacity {...wc('lp-nav-link')}>
            <Text style={styles.navLink}>DOCS</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          {...wc('lp-sign-in')}
          style={styles.signInBtn}
          onPress={() => router.push('/auth' as any)}
        >
          <Text style={styles.signInText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Status Ticker ────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: 'HANDLER ONLINE', dot: true },
  { label: 'DECODE ENGINE ACTIVE', dot: true },
  { label: 'ENGINE', val: 'DARKO v4.0' },
  { label: 'LATENCY', val: '142ms' },
  { label: 'ENCRYPTION', val: 'AES-256' },
  { label: 'DARKO · NXGEN MEDIA LLC · 2026' },
];

function TickerItem({ item }: { item: typeof TICKER_ITEMS[0] }) {
  return (
    <View style={styles.tickerItem}>
      {item.dot && <View style={styles.tickerDot} />}
      <Text style={styles.tickerLabel}>{item.label}</Text>
      {item.val && <Text style={styles.tickerVal}> {item.val}</Text>}
      <Text style={styles.tickerSep}>·</Text>
    </View>
  );
}

function StatusTicker() {
  const anim = useRef(new Animated.Value(0)).current;
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const loop = () => {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true }).start(loop);
    };
    loop();
    return () => anim.stopAnimation();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -1400] });

  if (Platform.OS === 'web') {
    return (
      <View style={styles.ticker}>
        <View {...wc('lp-ticker-anim')}>
          {items.map((item, i) => <TickerItem key={i} item={item} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ticker}>
      <Animated.View style={[styles.tickerInner, { transform: [{ translateX }] }]}>
        {items.map((item, i) => <TickerItem key={i} item={item} />)}
      </Animated.View>
    </View>
  );
}

// ─── Decode Panel ─────────────────────────────────────────────────────────────
function DecodePanel() {
  const [revealed, setRevealed] = useState<number[]>([]);
  const [pct, setPct] = useState<Record<number, number>>({});
  const [scriptText, setScriptText] = useState('');
  const [glitching, setGlitching] = useState(false);

  const ROWS = [
    { key: 'ATTACHMENT_STYLE', val: 'ANXIOUS-PREOCCUPIED', pct: 91 },
    { key: 'COMM_PATTERN', val: 'INTERMITTENT REINF.', pct: 87 },
    { key: 'VULNERABILITY', val: 'BEING SEEN SPECIFICALLY', pct: 79 },
    { key: 'ARCHETYPE', val: 'WOUNDED', pct: 94 },
    { key: 'CAMPAIGN_PHASE', val: 'APPROACH → DECIDE', pct: 88 },
    { key: 'TACTIC', val: 'PATTERN INTERRUPT', pct: 82 },
    { key: 'SCRIPT', val: '"I noticed you went quiet — doing okay?"', pct: 0 },
  ];

  useEffect(() => {
    ROWS.forEach((row, i) => {
      setTimeout(() => {
        setRevealed(prev => [...prev, i]);
        if (row.pct) {
          const start = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - start) / 1200, 1);
            const e = 1 - Math.pow(1 - p, 3);
            setPct(prev => ({ ...prev, [i]: Math.round(e * row.pct) }));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        if (row.key === 'SCRIPT') {
          setGlitching(true);
          const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_→←—';
          let count = 0;
          const gi = setInterval(() => {
            const len = Math.floor(Math.random() * 14) + 4;
            setScriptText(Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''));
            if (++count >= 10) {
              clearInterval(gi);
              setGlitching(false);
              let j = 0;
              const ti = setInterval(() => {
                setScriptText(row.val.slice(0, ++j));
                if (j >= row.val.length) clearInterval(ti);
              }, 22);
            }
          }, 80);
        }
      }, 400 + i * 220);
    });
  }, []);

  const sections = [
    { label: '// BEHAVIORAL PROFILE', rows: ROWS.slice(0, 3), base: 0 },
    { label: '// OPERATIONAL VECTORS', rows: ROWS.slice(3, 5), base: 3 },
    { label: '// RECOMMENDED MOVE', rows: ROWS.slice(5), base: 5 },
  ];

  return (
    <View style={styles.decodePanel}>
      <View style={styles.dpHeader}>
        <Text style={styles.dpTitle}>DARKO ENGINE v4.0 — LIVE ANALYSIS STREAM</Text>
        <View style={styles.dpDots}>
          <View style={styles.dpDot} />
          <View style={styles.dpDot} />
          <View {...wc('lp-dp-live')} style={[styles.dpDot, styles.dpLive]} />
        </View>
      </View>
      {sections.map(({ label, rows, base }) => (
        <View key={label} style={styles.dpSection}>
          <Text style={styles.dpSecLabel}>{label}</Text>
          {rows.map((row, j) => {
            const idx = base + j;
            const isScript = row.key === 'SCRIPT';
            return (
              <View key={row.key} style={[styles.dpRow, revealed.includes(idx) && styles.dpRowVisible]}>
                <Text style={styles.dpKey}>{row.key}</Text>
                <Text style={[styles.dpVal, isScript && { color: C.a }]}>
                  {isScript ? scriptText : row.val}
                </Text>
                {row.pct > 0 && (
                  <Text style={styles.dpPct}>{pct[idx] !== undefined ? `${pct[idx]}%` : '0%'}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Capabilities Grid ────────────────────────────────────────────────────────
const CAPS = [
  { label: '01 — ATTACHMENT DECODE', title: 'Read their wiring,\nnot their words.', desc: 'Anxious, avoidant, or disorganized — decoded from patterns in how they actually communicate. Not what they say. What they do.' },
  { label: '02 — SIGNAL DETECTION', title: 'Every pull and push,\nmapped and explained.', desc: 'Hot-and-cold cycles, intermittent reinforcement, withdrawal tactics. DARKO names them before you can feel the effect.' },
  { label: '03 — LIVE PROFILE BUILD', title: 'Watch clarity\nconstruct itself.', desc: 'Paste anything. A dossier assembles in real time — archetype, vulnerabilities, campaign phase, and the precise window to act.' },
  { label: '04 — CAMPAIGN ENGINE · COMING SOON', title: 'Multi-phase strategy,\nnot one-off moves.', desc: 'A structured campaign across weeks. Phase tracking, pattern interrupt scheduling, and adaptive scripts built around their psychology.', soon: true },
];

const revealDelays = ['', 'lp-reveal-d1', 'lp-reveal-d2', 'lp-reveal-d3', 'lp-reveal-d4'];

function CapabilitiesGrid() {
  return (
    <View {...wc('lp-caps-grid')} style={styles.capsGrid}>
      {CAPS.map((cap, i) => (
        <View
          key={i}
          {...wc(`lp-cap-card lp-reveal ${revealDelays[i + 1]}`)}
          style={[styles.capCard, cap.soon && styles.capSoon]}
        >
          <Text style={[styles.capLabel, cap.soon && { color: C.dim }]}>{cap.label}</Text>
          <Text style={[styles.capTitle, cap.soon && { color: C.dim }]}>{cap.title}</Text>
          <Text style={[styles.capDesc, cap.soon && { color: C.dim }]}>{cap.desc}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Quote Rotator ────────────────────────────────────────────────────────────
const QUOTES = [
  { text: 'Never assume that the person who seems open and friendly is being genuine. People show only what they want you to see.', attr: '— ROBERT GREENE · THE 48 LAWS OF POWER' },
  { text: 'Do not leave your reputation to chance or gossip; it is your life\'s artwork, and you must craft it, hone it, and display it.', attr: '— ROBERT GREENE · THE 48 LAWS OF POWER' },
  { text: 'The most important skill in all of human interaction is the ability to see things from other people\'s point of view.', attr: '— ROBERT GREENE · THE LAWS OF HUMAN NATURE' },
  { text: 'Keep people off-balance and in the dark by never revealing the purpose behind your actions.', attr: '— ROBERT GREENE · THE 48 LAWS OF POWER' },
];

function QuoteRotator() {
  const [qi, setQi] = useState(0);
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVis(false);
      setTimeout(() => { setQi(p => (p + 1) % QUOTES.length); setVis(true); }, 350);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  const q = QUOTES[qi];
  return (
    <View {...wc('lp-reveal')} style={[styles.quoteBlock, !vis && { opacity: 0 }]}>
      <Text style={styles.quoteText}>
        <Text style={{ color: C.a }}>"</Text>
        {q.text}
        <Text style={{ color: C.a }}>"</Text>
      </Text>
      <Text style={styles.quoteAttr}>{q.attr}</Text>
    </View>
  );
}

// ─── Pricing Grid ─────────────────────────────────────────────────────────────
const TIERS = [
  {
    tier: 'OBSERVER', price: '0', free: true,
    period: '/ FOREVER FREE',
    features: ['5 reads per month — enough to get uncomfortable', 'Attachment style analysis', 'Basic signal detection'],
    btnLabel: 'GET STARTED', btnCls: 'lp-btn-ghost-price', btnStyle: 'ghost',
  },
  {
    tier: 'OPERATOR', price: '15',
    period: '/ MONTH',
    features: ['No limits on who you decode', 'Full behavioral profile — every vector', 'Tactical move recommendations', '90-day history and export', 'Priority processing'],
    btnLabel: 'START OPERATING', btnCls: 'lp-btn-white-price', btnStyle: 'white',
  },
  {
    tier: 'EXECUTIVE', price: '100', featured: true, badge: 'INVITE ONLY',
    period: '/ MONTH · INVITE ONLY',
    features: ['Everything in Operator — without ceilings', 'Multi-target simultaneous tracking', '4-phase campaign engine with phase locks', 'Custom archetype model training', 'API access + white-label export', 'Direct handler support'],
    btnLabel: 'REQUEST ACCESS', btnCls: 'lp-btn-accent-price', btnStyle: 'accent',
  },
];

function PricingGrid() {
  const router = useRouter();

  return (
    <View {...wc('lp-pricing-grid')} style={styles.pricingGrid}>
      {TIERS.map((tier, i) => (
        <View
          key={i}
          {...wc(`lp-price-card${tier.featured ? ' lp-price-featured' : ''} lp-reveal ${revealDelays[i + 1]}`)}
          style={[styles.priceCard, tier.featured && styles.priceCardFeatured]}
        >
          {tier.badge && (
            <View style={styles.priceBadge}><Text style={styles.priceBadgeText}>{tier.badge}</Text></View>
          )}
          <Text style={styles.priceTier}>{tier.tier}</Text>
          <Text style={styles.priceNum}>
            {!tier.free && <Text style={styles.priceSup}>$</Text>}
            {tier.free ? '$0' : tier.price}
          </Text>
          <Text style={styles.pricePer}>{tier.period}</Text>
          <View style={styles.priceFeatures}>
            {tier.features.map((f, j) => (
              <View key={j} style={styles.pf}>
                <Text {...wc('lp-pf-bullet')} style={styles.pfBullet}>▸</Text>
                <Text style={styles.pfText}>{f}</Text>
              </View>
            ))}
          </View>
          <Pressable
            {...wc(tier.btnCls)}
            style={[
              styles.priceBtn,
              tier.btnStyle === 'ghost' && styles.priceBtnGhost,
              tier.btnStyle === 'white' && styles.priceBtnWhite,
              tier.btnStyle === 'accent' && styles.priceBtnAccent,
            ]}
            onPress={() => router.push(tier.btnStyle === 'accent' ? '/pricing' as any : '/auth' as any)}
          >
            <Text style={[styles.priceBtnText, (tier.btnStyle === 'white' || tier.btnStyle === 'accent') && { color: C.bg }]}>
              {tier.btnLabel}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
const FOOTER_TEXT = 'DARKO · NXGEN MEDIA LLC · 2026 · RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0 · ';
const FOOTER_ITEMS = [...Array(12)].map((_, i) => FOOTER_TEXT);

function FooterTicker() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const loop = () => {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 28000, easing: Easing.linear, useNativeDriver: true }).start(loop);
    };
    loop();
    return () => anim.stopAnimation();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -1400] });

  if (Platform.OS === 'web') {
    return (
      <View style={styles.footer}>
        <View {...wc('lp-footer-anim')}>
          {[...FOOTER_ITEMS, ...FOOTER_ITEMS].map((t, i) => (
            <Text key={i} style={styles.footerText}>{t}</Text>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.footer}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', position: 'absolute' }, { transform: [{ translateX }] }]}>
        {[...FOOTER_ITEMS, ...FOOTER_ITEMS].map((t, i) => (
          <Text key={i} style={styles.footerText}>{t}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPageV3() {
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb) return;
    injectCSS();

    // Hero entrance
    requestAnimationFrame(() => {
      ['.lp-kicker', '.lp-headline', '.lp-sub', '.lp-cta-row', '.lp-decode-panel'].forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.classList.add('in'));
      });
    });

    // Scroll reveal
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.06 });

    setTimeout(() => {
      document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el));
    }, 200);

    return () => obs.disconnect();
  }, []);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrollY(y);
    if (isWeb) {
      document.getElementById('lp-nav')?.classList.toggle('lp-nav-scrolled', y > 10);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <Navigation scrolled={scrollY > 10} />
      <StatusTicker />

      <ScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View {...wc('lp-hero')} style={isWeb ? styles.heroWeb : styles.heroNative}>
          {isWeb && <View {...wc('lp-hero-texture')} style={styles.heroTexturePlaceholder} />}

          <View {...wc('lp-hero-left')} style={isWeb ? styles.heroLeftWeb : styles.heroLeftNative}>
            <View {...wc('lp-kicker')} style={styles.kicker}>
              <View style={styles.kickerLine} />
              <Text style={styles.kickerText}>// RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0</Text>
            </View>

            <Text {...wc('lp-headline')} style={styles.headline}>
              <Text style={{ color: C.text, display: 'block' as any }}>STOP{'\n'}</Text>
              <Text style={{ color: C.a }}>GUESSING.</Text>
            </Text>

            <Text {...wc('lp-sub')} style={styles.sub}>
              Paste their texts, DMs, or screenshots. DARKO reads the psychology underneath —
              attachment style, manipulation patterns, and what they actually want from you.
              Then gives you the exact move.
            </Text>

            <View {...wc('lp-cta-row')} style={styles.ctaRow}>
              <Pressable style={styles.btnPrimary} onPress={() => router.push('/auth' as any)}>
                <Text style={styles.btnPrimaryText}>GET EARLY ACCESS</Text>
              </Pressable>
              <TouchableOpacity
                {...wc('lp-btn-ghost-cta')}
                onPress={() => isWeb ? document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' }) : null}
              >
                <Text style={styles.btnGhostText}>SEE HOW IT WORKS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View {...wc('lp-hero-right')} style={isWeb ? styles.heroRightWeb : styles.heroRightNative}>
            <View {...wc('lp-decode-panel')} style={styles.decodePanelWrap}>
              <DecodePanel />
            </View>
          </View>
        </View>

        {/* Capabilities */}
        <View
          nativeID={isWeb ? 'capabilities' : undefined}
          {...wc('lp-reveal')}
          style={styles.section}
        >
          <View style={styles.sectionKicker}>
            <Text style={styles.sectionKickerText}>// CAPABILITIES</Text>
            <View style={styles.sectionKickerLine} />
          </View>
          <CapabilitiesGrid />
          <QuoteRotator />
        </View>

        {/* Pricing */}
        <View
          nativeID={isWeb ? 'pricing' : undefined}
          {...wc('lp-reveal')}
          style={[styles.section, styles.sectionBorder]}
        >
          <View style={styles.sectionKicker}>
            <Text style={styles.sectionKickerText}>// PRICING</Text>
            <View style={styles.sectionKickerLine} />
          </View>
          <PricingGrid />
        </View>

        <FooterTicker />
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  nav: {
    ...Platform.select({ web: { position: 'fixed' } as any, default: { position: 'absolute' } }),
    top: 0, left: 0, right: 0, zIndex: 500, height: 52,
    backgroundColor: 'transparent',
    borderBottomWidth: 1, borderBottomColor: 'transparent',
    ...Platform.select({ web: { transition: 'background 300ms, border-color 300ms, backdrop-filter 300ms' } as any }),
  },
  navScrolledNative: {
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderBottomColor: C.b,
  },
  navContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32 },
  navLogo: { flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 40 },
  navLogoSq: { width: 12, height: 12, backgroundColor: C.a },
  navLogoText: { fontFamily: MONO, fontSize: 13, fontWeight: '600', letterSpacing: 2, color: C.a },
  navLinks: { flex: 1, flexDirection: 'row', gap: 28 },
  navLink: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, color: C.dim },
  signInBtn: { paddingVertical: 7, paddingHorizontal: 20, borderWidth: 1, borderColor: C.a },
  signInText: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.4, color: C.a },

  ticker: {
    ...Platform.select({ web: { position: 'fixed' } as any, default: { position: 'absolute' } }),
    top: 52, left: 0, right: 0, zIndex: 499, height: 28,
    backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: C.b, overflow: 'hidden',
  },
  tickerInner: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 0, top: 0, bottom: 0 },
  tickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  tickerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.a, marginRight: 6 },
  tickerLabel: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, color: C.dim },
  tickerVal: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, color: C.a },
  tickerSep: { fontFamily: MONO, fontSize: 8, color: C.b2, marginLeft: 20 },

  container: { flex: 1, backgroundColor: C.bg, paddingTop: 80 },

  heroWeb: { backgroundColor: C.bg },
  heroNative: { minHeight: 700, paddingTop: 64, paddingHorizontal: 32, paddingBottom: 64, backgroundColor: C.bg },
  heroTexturePlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroLeftWeb: {},
  heroLeftNative: { marginBottom: 48 },
  heroRightWeb: {},
  heroRightNative: { paddingBottom: 48, paddingHorizontal: 0 },
  decodePanelWrap: {},

  kicker: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  kickerLine: { width: 16, height: 1, backgroundColor: C.a },
  kickerText: { fontFamily: MONO, fontSize: 9.5, letterSpacing: 2, color: C.a },

  headline: {
    fontFamily: SANS, fontWeight: '900',
    ...Platform.select({ web: { fontSize: 'clamp(52px,6vw,84px)' } as any, default: { fontSize: 64 } }),
    lineHeight: Platform.select({ default: 58, web: undefined }),
    letterSpacing: -1.5, marginBottom: 28,
  },
  sub: { fontFamily: SANS, fontSize: 16, color: C.muted, lineHeight: 26, maxWidth: 440, marginBottom: 40 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },

  btnPrimary: {
    paddingVertical: 11, paddingHorizontal: 28, backgroundColor: C.text,
    ...Platform.select({
      web: {
        background: `linear-gradient(105deg,${C.text} 0%,${C.text} 35%,rgba(255,255,255,.55) 50%,${C.text} 65%,${C.text} 100%)`,
        backgroundSize: '300% 100%', backgroundPosition: '200% center',
        animation: 'shimmer 3s ease-in-out infinite',
      } as any,
    }),
  },
  btnPrimaryText: { fontFamily: MONO, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, color: C.bg },
  btnGhostText: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: C.dim },

  decodePanel: {
    backgroundColor: Platform.select({ web: 'rgba(24,24,27,0.6)', default: C.s1 }),
    borderWidth: 1,
    borderColor: Platform.select({ web: 'rgba(255,255,255,0.06)', default: C.b }),
    borderLeftWidth: 2, borderLeftColor: C.a,
    ...Platform.select({ web: { backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)' } as any }),
  },
  dpHeader: { paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.b, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dpTitle: { fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: C.dim },
  dpDots: { flexDirection: 'row', gap: 5 },
  dpDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.b2 },
  dpLive: { backgroundColor: C.a },
  dpSection: { borderBottomWidth: 1, borderBottomColor: C.b, paddingVertical: 14, paddingHorizontal: 18 },
  dpSecLabel: { fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: C.a, marginBottom: 10 },
  dpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.4)', opacity: 0 },
  dpRowVisible: { opacity: 1 },
  dpKey: { fontFamily: MONO, fontSize: 9, letterSpacing: 0.6, color: C.muted, width: 160 },
  dpVal: { fontFamily: MONO, fontSize: 10, fontWeight: '500', color: C.text, flex: 1 },
  dpPct: { fontFamily: MONO, fontSize: 10, fontWeight: '600', color: C.a, marginLeft: 12, minWidth: 40, textAlign: 'right' },

  section: { paddingVertical: 100, paddingHorizontal: 32, maxWidth: 1280, alignSelf: 'center', width: '100%', borderTopWidth: 1, borderTopColor: C.b },
  sectionBorder: { borderTopWidth: 1, borderTopColor: C.b },
  sectionKicker: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 },
  sectionKickerText: { fontFamily: MONO, fontSize: 9.5, letterSpacing: 2, color: C.a },
  sectionKickerLine: { flex: 1, height: 1, backgroundColor: C.b },

  capsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 80, backgroundColor: C.b },
  capCard: { backgroundColor: C.s1, padding: 36, width: '50%' as any },
  capSoon: { opacity: 0.7 },
  capLabel: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.4, color: C.dim, marginBottom: 10 },
  capTitle: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.2, marginBottom: 10, lineHeight: 26 },
  capDesc: { fontSize: 13, color: C.muted, lineHeight: 21 },

  quoteBlock: { alignItems: 'center', paddingHorizontal: 40 },
  quoteText: { fontFamily: SANS, fontSize: 36, fontWeight: '800', color: C.text, letterSpacing: -0.25, marginBottom: 20, lineHeight: 42, textAlign: 'center' },
  quoteAttr: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.4, color: C.dim },

  pricingGrid: { flexDirection: 'row', backgroundColor: C.b },
  priceCard: { backgroundColor: C.s1, padding: 32, flex: 1 },
  priceCardFeatured: { backgroundColor: '#0d1000', borderWidth: 1, borderColor: C.a },
  priceBadge: { position: 'absolute', top: 16, right: 18, backgroundColor: C.a, paddingVertical: 3, paddingHorizontal: 10 },
  priceBadgeText: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.2, color: C.bg },
  priceTier: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.8, color: C.dim, marginBottom: 16 },
  priceNum: { fontFamily: SANS, fontSize: 44, fontWeight: '900', color: C.text, letterSpacing: -1, lineHeight: 44, marginBottom: 4 },
  priceSup: { fontSize: 22, fontWeight: '700', verticalAlign: 'top' as any },
  pricePer: { fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: C.dim, marginBottom: 24 },
  priceFeatures: { marginBottom: 28, gap: 9 },
  pf: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pfBullet: { fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 1 },
  pfText: { fontSize: 13, color: C.muted, lineHeight: 19, flex: 1 },
  priceBtn: { paddingVertical: 10, alignItems: 'center' },
  priceBtnGhost: { borderWidth: 1, borderColor: C.b },
  priceBtnWhite: { borderWidth: 1, borderColor: C.text, backgroundColor: C.text },
  priceBtnAccent: {
    borderWidth: 1, borderColor: C.a, backgroundColor: C.a,
    ...Platform.select({
      web: {
        background: `linear-gradient(105deg,${C.a} 0%,${C.a} 35%,rgba(255,255,255,.3) 50%,${C.a} 65%,${C.a} 100%)`,
        backgroundSize: '300% 100%', backgroundPosition: '200% center',
        animation: 'shimmer 3s ease-in-out 1.5s infinite',
      } as any,
    }),
  },
  priceBtnText: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.2, color: C.muted },

  footer: { height: 36, backgroundColor: C.s1, borderTopWidth: 1, borderTopColor: C.b, overflow: 'hidden' },
  footerText: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, color: C.dim, paddingHorizontal: 16 },
});
