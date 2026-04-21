import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Color palette from design
const COLORS = {
  bg: '#0a0a0a',
  s1: '#18181b',
  s2: '#1e1e21',
  b: '#27272a',
  b2: '#3f3f46',
  dim: '#52525b',
  muted: '#a1a1aa',
  text: '#fafafa',
  accent: '#CCFF00',
  accent8: 'rgba(204, 255, 0, 0.08)',
  accent15: 'rgba(204, 255, 0, 0.15)',
};

// Font families
const MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: "'JetBrains Mono', ui-monospace, monospace",
});
const SANS = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: "'Inter', ui-sans-serif, system-ui, sans-serif",
});

// ─── Navigation Component ─────────────────────────────────────────────────────

function Navigation({ scrolled }: { scrolled: boolean }) {
  const router = useRouter();
  
  return (
    <View style={[styles.nav, scrolled && styles.navScrolled]}>
      <View style={styles.navContent}>
        <View style={styles.navLogo}>
          <View style={styles.navLogoSq} />
          <Text style={styles.navLogoText}>DARKO</Text>
        </View>
        
        <View style={styles.navLinks}>
          <TouchableOpacity onPress={() => router.push('/auth' as any)}>
            <Text style={styles.navLink}>DECODE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/auth' as any)}>
            <Text style={styles.navLink}>TARGETS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/auth' as any)}>
            <Text style={styles.navLink}>CAMPAIGNS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/pricing' as any)}>
            <Text style={styles.navLink}>PRICING</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => router.push('/auth' as any)}
        >
          <Text style={styles.signInText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Status Ticker Component ─────────────────────────────────────────────────

function StatusTicker() {
  const tickerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animate = () => {
      tickerAnim.setValue(0);
      Animated.timing(tickerAnim, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => animate());
    };
    animate();
    return () => tickerAnim.stopAnimation();
  }, []);

  const translateX = tickerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1000], // Adjust based on content width
  });

  const STATUS_ITEMS = [
    { label: 'HANDLER ONLINE', val: null, dot: true },
    { label: 'DECODE ENGINE ACTIVE', val: null, dot: true },
    { label: 'ENGINE', val: 'DARKO v4.0' },
    { label: 'LATENCY', val: '142ms' },
    { label: 'ENCRYPTION', val: 'AES-256' },
    { label: 'DARKO · NXGEN MEDIA LLC · 2026', val: null },
  ];

  const renderItem = (item: typeof STATUS_ITEMS[0], index: number) => (
    <View key={index} style={styles.tickerItem}>
      {item.dot && <View style={styles.tickerDot} />}
      <Text style={styles.tickerLabel}>{item.label}</Text>
      {item.val && <Text style={styles.tickerVal}>{item.val}</Text>}
      <Text style={styles.tickerSep}>·</Text>
    </View>
  );

  return (
    <View style={styles.ticker}>
      <Animated.View 
        style={[styles.tickerInner, { transform: [{ translateX }] }]}
      >
        {[...STATUS_ITEMS, ...STATUS_ITEMS].map((item, i) => renderItem(item, i))}
      </Animated.View>
    </View>
  );
}

// ─── Decode Panel Component ──────────────────────────────────────────────────

function DecodePanel() {
  const [revealedRows, setRevealedRows] = useState<number[]>([]);
  const [pctValues, setPctValues] = useState<Record<number, number>>({});
  const [scriptText, setScriptText] = useState('');
  const [glitching, setGlitching] = useState(true);
  
  const rows = [
    { key: 'ATTACHMENT_STYLE', val: 'ANXIOUS-PREOCCUPIED', pct: 91 },
    { key: 'COMM_PATTERN', val: 'INTERMITTENT REINF.', pct: 87 },
    { key: 'VULNERABILITY', val: 'BEING SEEN SPECIFICALLY', pct: 79 },
    { key: 'ARCHETYPE', val: 'WOUNDED', pct: 94 },
    { key: 'CAMPAIGN_PHASE', val: 'APPROACH → DECIDE', pct: 88 },
    { key: 'TACTIC', val: 'PATTERN INTERRUPT', pct: 82 },
    { key: 'SCRIPT', val: '"I noticed you went quiet — doing okay?"', pct: null },
  ];

  useEffect(() => {
    // Animate rows with staggered delay
    rows.forEach((row, i) => {
      setTimeout(() => {
        setRevealedRows(prev => [...prev, i]);
        
        // Animate percentage counter
        if (row.pct) {
          animatePct(i, row.pct);
        }
        
        // Special handling for SCRIPT row
        if (row.key === 'SCRIPT') {
          setTimeout(() => {
            setGlitching(true);
            // Start glitch animation
            let glitchCount = 0;
            const maxGlitches = 8;
            const glitchInterval = setInterval(() => {
              setScriptText(generateGlitchText());
              glitchCount++;
              if (glitchCount >= maxGlitches) {
                clearInterval(glitchInterval);
                setGlitching(false);
                // Typewrite the final text
                typewriteText(row.val);
              }
            }, 50);
          }, 300);
        }
      }, 400 + i * 220);
    });
  }, []);

  const animatePct = (index: number, target: number) => {
    const duration = 1200;
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const current = Math.round(ease * target);
      
      setPctValues(prev => ({ ...prev, [index]: current }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPctValues(prev => ({ ...prev, [index]: target }));
      }
    };
    requestAnimationFrame(animate);
  };

  const generateGlitchText = () => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_→←—';
    const len = Math.floor(Math.random() * 14) + 4;
    return Array.from({ length: len }, () => 
      CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
  };

  const typewriteText = (finalText: string) => {
    let i = 0;
    const interval = setInterval(() => {
      setScriptText(finalText.slice(0, ++i));
      if (i >= finalText.length) {
        clearInterval(interval);
      }
    }, 22);
  };

  return (
    <View style={styles.decodePanel}>
      <View style={styles.dpHeader}>
        <Text style={styles.dpTitle}>DARKO ENGINE v4.0 — LIVE ANALYSIS STREAM</Text>
        <View style={styles.dpDots}>
          <View style={styles.dpDot} />
          <View style={styles.dpDot} />
          <View style={[styles.dpDot, styles.dpLive]} />
        </View>
      </View>
      
      <View style={styles.dpBody}>
        <View style={styles.dpSection}>
          <Text style={styles.dpSecLabel}>// BEHAVIORAL PROFILE</Text>
          {rows.slice(0, 3).map((row, i) => (
            <View key={i} style={[styles.dpRow, revealedRows.includes(i) && styles.dpRowVisible]}>
              <Text style={styles.dpKey}>{row.key}</Text>
              <Text style={styles.dpVal}>{row.val}</Text>
              {row.pct && (
                <Text style={styles.dpPct}>
                  {pctValues[i] !== undefined ? `${pctValues[i]}%` : '0%'}
                </Text>
              )}
            </View>
          ))}
        </View>
        
        <View style={styles.dpSection}>
          <Text style={styles.dpSecLabel}>// OPERATIONAL VECTORS</Text>
          {rows.slice(3, 5).map((row, i) => {
            const index = i + 3;
            return (
              <View key={i} style={[styles.dpRow, revealedRows.includes(index) && styles.dpRowVisible]}>
                <Text style={styles.dpKey}>{row.key}</Text>
                <Text style={styles.dpVal}>{row.val}</Text>
                {row.pct && (
                  <Text style={styles.dpPct}>
                    {pctValues[index] !== undefined ? `${pctValues[index]}%` : '0%'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        
        <View style={styles.dpSection}>
          <Text style={styles.dpSecLabel}>// RECOMMENDED MOVE</Text>
          {rows.slice(5).map((row, i) => {
            const index = i + 5;
            const isScript = row.key === 'SCRIPT';
            return (
              <View key={i} style={[styles.dpRow, revealedRows.includes(index) && styles.dpRowVisible]}>
                <Text style={styles.dpKey}>{row.key}</Text>
                <Text style={[
                  styles.dpVal, 
                  isScript && { color: COLORS.accent },
                  glitching && isScript && styles.glitchText
                ]}>
                  {isScript ? (glitching ? scriptText : row.val) : row.val}
                </Text>
                {row.pct && (
                  <Text style={styles.dpPct}>
                    {pctValues[index] !== undefined ? `${pctValues[index]}%` : '0%'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Capabilities Grid ───────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    label: '01 — ATTACHMENT DECODE',
    title: 'Read their wiring,\nnot their words.',
    desc: 'Anxious, avoidant, or disorganized — decoded from patterns in how they actually communicate. Not what they say. What they do.',
  },
  {
    label: '02 — SIGNAL DETECTION',
    title: 'Every pull and push,\nmapped and explained.',
    desc: 'Hot-and-cold cycles, intermittent reinforcement, withdrawal tactics. DARKO names them before you can feel the effect.',
  },
  {
    label: '03 — LIVE PROFILE BUILD',
    title: 'Watch clarity\nconstruct itself.',
    desc: 'Paste anything. A dossier assembles in real time — archetype, vulnerabilities, campaign phase, and the precise window to act.',
  },
  {
    label: '04 — CAMPAIGN ENGINE · COMING SOON',
    title: 'Multi-phase strategy,\nnot one-off moves.',
    desc: 'A structured campaign across weeks. Phase tracking, pattern interrupt scheduling, and adaptive scripts built around their psychology.',
    soon: true,
  },
];

function CapabilitiesGrid() {
  return (
    <View style={styles.capsGrid}>
      {CAPABILITIES.map((cap, i) => (
        <View 
          key={i} 
          style={[
            styles.capCard, 
            cap.soon && styles.capCardSoon,
            Platform.OS === 'web' && styles.capCardWeb,
          ]}
        >
          <View style={styles.capCardInner}>
            <Text style={[styles.capLabel, cap.soon && styles.capLabelSoon]}>
              {cap.label}
            </Text>
            <Text style={[styles.capTitle, cap.soon && styles.capTitleSoon]}>
              {cap.title}
            </Text>
            <Text style={[styles.capDesc, cap.soon && styles.capDescSoon]}>
              {cap.desc}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Quote Rotator ───────────────────────────────────────────────────────────

const QUOTES = [
  {
    text: "Never assume that the person who seems open and friendly is being genuine. People show only what they want you to see.",
    attr: "— ROBERT GREENE · THE 48 LAWS OF POWER",
  },
  {
    text: "Do not leave your reputation to chance or gossip; it is your life's artwork, and you must craft it, hone it, and display it.",
    attr: "— ROBERT GREENE · THE 48 LAWS OF POWER",
  },
  {
    text: "The most important skill in all of human interaction is the ability to see things from other people's point of view.",
    attr: "— ROBERT GREENE · THE LAWS OF HUMAN NATURE",
  },
  {
    text: "Keep people off-balance and in the dark by never revealing the purpose behind your actions.",
    attr: "— ROBERT GREENE · THE 48 LAWS OF POWER",
  },
];

function QuoteRotator() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[currentIndex];

  return (
    <View style={styles.quoteBlock}>
      <Text style={styles.quoteText}>
        <Text style={styles.quoteMark}>"</Text>
        {quote.text}
        <Text style={styles.quoteMark}>"</Text>
      </Text>
      <Text style={styles.quoteAttr}>{quote.attr}</Text>
    </View>
  );
}

// ─── Pricing Cards ───────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    tier: 'OBSERVER',
    price: '$0',
    period: '/ FOREVER FREE',
    features: [
      '5 reads per month — enough to get uncomfortable',
      'Attachment style analysis',
      'Basic signal detection',
    ],
    buttonText: 'GET STARTED',
    buttonStyle: 'ghost',
  },
  {
    tier: 'OPERATOR',
    price: '$15',
    period: '/ MONTH',
    features: [
      'No limits on who you decode',
      'Full behavioral profile — every vector',
      'Tactical move recommendations',
      '90-day history and export',
      'Priority processing',
    ],
    buttonText: 'START OPERATING',
    buttonStyle: 'white',
  },
  {
    tier: 'EXECUTIVE',
    price: '$100',
    period: '/ MONTH · INVITE ONLY',
    features: [
      'Everything in Operator — without ceilings',
      'Multi-target simultaneous tracking',
      '4-phase campaign engine with phase locks',
      'Custom archetype model training',
      'API access + white-label export',
      'Direct handler support',
    ],
    buttonText: 'REQUEST ACCESS',
    buttonStyle: 'accent',
    featured: true,
    badge: 'INVITE ONLY',
  },
];

function PricingGrid() {
  const router = useRouter();
  
  return (
    <View style={styles.pricingGrid}>
      {PRICING_TIERS.map((tier, i) => (
        <View 
          key={i} 
          style={[
            styles.priceCard,
            tier.featured && styles.priceCardFeatured,
          ]}
        >
          {tier.badge && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>{tier.badge}</Text>
            </View>
          )}
          
          <Text style={styles.priceTier}>{tier.tier}</Text>
          <Text style={styles.priceNumber}>
            {tier.price.includes('$') ? (
              <>
                <Text style={styles.priceSup}>$</Text>
                <Text>{tier.price.replace('$', '')}</Text>
              </>
            ) : (
              tier.price
            )}
          </Text>
          <Text style={styles.pricePeriod}>{tier.period}</Text>
          
          <View style={styles.priceFeatures}>
            {tier.features.map((feature, j) => (
              <View key={j} style={styles.priceFeature}>
                <Text style={styles.priceFeatureIcon}>▸</Text>
                <Text style={styles.priceFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <Pressable
            style={[
              styles.priceButton,
              tier.buttonStyle === 'ghost' && styles.priceButtonGhost,
              tier.buttonStyle === 'white' && styles.priceButtonWhite,
              tier.buttonStyle === 'accent' && styles.priceButtonAccent,
            ]}
            onPress={() => router.push(tier.buttonStyle === 'accent' ? '/pricing' as any : '/auth' as any)}
          >
            <Text style={[
              styles.priceButtonText,
              (tier.buttonStyle === 'white' || tier.buttonStyle === 'accent') && 
                { color: COLORS.bg }
            ]}>
              {tier.buttonText}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ─── Footer Ticker ───────────────────────────────────────────────────────────

function FooterTicker() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerInner}>
        <Text style={styles.footerText}>
          DARKO · NXGEN MEDIA LLC · 2026 · RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0 · 
          DARKO · NXGEN MEDIA LLC · 2026 · RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0
        </Text>
      </View>
    </View>
  );
}

// ─── Main Landing Page Component ─────────────────────────────────────────────

export default function LandingPageV3() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setScrolled(scrollY > 10);
  };

  return (
    <>
      <StatusBar style="light" />
      
      <Navigation scrolled={scrolled} />
      <StatusTicker />
      
      <ScrollView 
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
          <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
            <View style={styles.kicker}>
              <View style={styles.kickerLine} />
              <Text style={styles.kickerText}>
                // RELATIONSHIP INTELLIGENCE · AI-POWERED · BUILD 4.0
              </Text>
            </View>
            
            <Text style={styles.headline}>
              <Text style={styles.headlineWhite}>STOP</Text>
              {'\n'}
              <Text style={styles.headlineAccent}>GUESSING.</Text>
            </Text>
            
            <Text style={styles.subtitle}>
              Paste their texts, DMs, or screenshots. DARKO reads the psychology underneath —
              attachment style, manipulation patterns, and what they actually want from you.
              Then gives you the exact move.
            </Text>
            
            <View style={styles.ctaRow}>
              <Pressable 
                style={styles.primaryButton}
                onPress={() => router.push('/auth')}
              >
                <Text style={styles.primaryButtonText}>GET EARLY ACCESS</Text>
              </Pressable>
              
              <Pressable 
                style={styles.ghostButton}
                onPress={() => {
                  // Scroll to capabilities
                }}
              >
                <Text style={styles.ghostButtonText}>SEE HOW IT WORKS</Text>
              </Pressable>
            </View>
          </View>
          
          {isDesktop && (
            <View style={styles.heroRight}>
              <View style={styles.glowEffect} />
              <DecodePanel />
            </View>
          )}
        </View>
        
        {!isDesktop && (
          <View style={styles.mobileDecodePanel}>
            <DecodePanel />
          </View>
        )}
        
        {/* Capabilities Section */}
        <View style={styles.capsSection}>
          <View style={styles.sectionKicker}>
            <Text style={styles.sectionKickerText}>// CAPABILITIES</Text>
            <View style={styles.sectionKickerLine} />
          </View>
          
          <CapabilitiesGrid />
          
          <QuoteRotator />
        </View>
        
        {/* Pricing Section */}
        <View style={styles.pricingSection}>
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
  // Navigation
  nav: {
    ...Platform.select({
      web: {
        position: 'fixed',
      } as any,
      default: {
        position: 'absolute',
      },
    }),
    top: 0,
    left: 0,
    right: 0,
    zIndex: 500,
    height: 52,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    ...Platform.select({
      web: {
        transition: 'background-color 300ms, border-color 300ms, backdrop-filter 300ms',
      },
    }),
  },
  navScrolled: {
    backgroundColor: Platform.select({
      web: 'rgba(10, 10, 10, 0.7)',
      default: 'rgba(10, 10, 10, 0.95)',
    }),
    borderBottomColor: COLORS.b,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      },
    }),
  },
  navContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 0,
  },
  navLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginRight: 40,
  },
  navLogoSq: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.accent,
  },
  navLogoText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    color: COLORS.accent,
  },
  navLinks: {
    flex: 1,
    flexDirection: 'row',
    gap: 28,
  },
  navLink: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.dim,
    paddingBottom: 3,
    ...Platform.select({
      web: {
        position: 'relative',
        ':hover': {
          color: COLORS.text,
        },
        '::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: '100%',
          height: 1,
          backgroundColor: COLORS.accent,
          transition: 'right 200ms',
        },
        ':hover::after': {
          right: 0,
        },
      },
    }),
  },
  signInBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: 'transparent',
  },
  signInText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.accent,
  },
  
  // Status Ticker
  ticker: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 499,
    height: 28,
    backgroundColor: COLORS.s1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.b,
    overflow: 'hidden',
  },
  tickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tickerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent,
    marginRight: 6,
  },
  tickerLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.dim,
  },
  tickerVal: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.accent,
    marginLeft: 4,
  },
  tickerSep: {
    fontFamily: MONO,
    fontSize: 8,
    color: COLORS.b2,
    marginLeft: 20,
  },
  
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 80, // nav height + ticker height
  },
  
  // Hero Section
  hero: {
    minHeight: 700,
    paddingTop: 64,
    paddingHorizontal: 32,
    paddingBottom: 64,
  },
  heroDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  heroLeft: {
    flex: 1,
  },
  heroLeftDesktop: {
    paddingRight: 56,
    borderRightWidth: 1,
    borderRightColor: COLORS.b,
    paddingTop: 32,
    paddingBottom: 32,
  },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  kickerLine: {
    width: 16,
    height: 1,
    backgroundColor: COLORS.accent,
  },
  kickerText: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 2,
    color: COLORS.accent,
  },
  headline: {
    fontFamily: SANS,
    fontWeight: '900',
    fontSize: 64,
    lineHeight: 0.9,
    letterSpacing: -0.4,
    marginBottom: 28,
  },
  headlineWhite: {
    color: COLORS.text,
  },
  headlineAccent: {
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    lineHeight: 26,
    maxWidth: 440,
    marginBottom: 40,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  primaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 28,
    backgroundColor: COLORS.text,
    ...Platform.select({
      web: {
        background: `linear-gradient(105deg, ${COLORS.text} 0%, ${COLORS.text} 35%, rgba(255,255,255,0.55) 50%, ${COLORS.text} 65%, ${COLORS.text} 100%)`,
        backgroundSize: '300% 100%',
        backgroundPosition: '200% center',
        animation: 'shimmer 3s ease-in-out infinite',
      } as any,
    }),
  },
  primaryButtonText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: COLORS.bg,
  },
  ghostButton: {
    paddingVertical: 11,
  },
  ghostButtonText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.dim,
    ...Platform.select({
      web: {
        position: 'relative',
        ':hover': {
          color: COLORS.text,
        },
        '::after': {
          content: '""',
          position: 'absolute',
          bottom: -2,
          left: 0,
          right: '100%',
          height: 1,
          backgroundColor: COLORS.accent,
          transition: 'right 200ms',
        },
        ':hover::after': {
          right: 0,
        },
      },
    }),
  },
  heroRight: {
    flex: 1,
    paddingLeft: 48,
    paddingTop: 32,
    paddingBottom: 32,
  },
  glowEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 380,
    height: 380,
    backgroundColor: COLORS.accent8,
    borderRadius: 190,
    transform: [{ translateX: -190 }, { translateY: -190 }],
    ...Platform.select({
      web: {
        filter: 'blur(40px)',
        background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)',
      },
    }),
  },
  mobileDecodePanel: {
    paddingHorizontal: 32,
    marginBottom: 64,
  },
  
  // Decode Panel
  decodePanel: {
    backgroundColor: Platform.select({
      web: 'rgba(24, 24, 27, 0.6)',
      default: COLORS.s1,
    }),
    borderWidth: 1,
    borderColor: Platform.select({
      web: 'rgba(255, 255, 255, 0.06)',
      default: COLORS.b,
    }),
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      },
    }),
  },
  dpHeader: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.b,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dpTitle: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.dim,
  },
  dpDots: {
    flexDirection: 'row',
    gap: 5,
  },
  dpDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.b2,
  },
  dpLive: {
    backgroundColor: COLORS.accent,
  },
  dpBody: {
    padding: 0,
  },
  dpSection: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.b,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  dpSecLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.accent,
    marginBottom: 10,
  },
  dpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.4)',
    opacity: 0,
  },
  dpRowVisible: {
    opacity: 1,
  },
  dpKey: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.6,
    color: COLORS.muted,
    width: 160,
  },
  dpVal: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  dpPct: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  glitchText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.text,
    letterSpacing: 1,
  },
  
  // Sections
  capsSection: {
    paddingVertical: 100,
    paddingHorizontal: 32,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.b,
  },
  pricingSection: {
    paddingVertical: 100,
    paddingHorizontal: 32,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.b,
  },
  sectionKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 48,
  },
  sectionKickerText: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 2,
    color: COLORS.accent,
  },
  sectionKickerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.b,
  },
  
  // Capabilities Grid
  capsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 80,
    ...Platform.select({
      web: {
        gap: 1,
        backgroundColor: COLORS.b,
      },
    }),
  },
  capCard: {
    backgroundColor: COLORS.s1,
    padding: 36,
    ...Platform.select({
      web: {
        width: '50%' as any,
        boxSizing: 'border-box' as any,
        ':hover': {
          backgroundColor: COLORS.s2,
        },
        '::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: COLORS.accent,
          transform: 'scaleY(0)',
          transformOrigin: 'bottom',
          transition: 'transform 200ms',
        },
        ':hover::before': {
          transform: 'scaleY(1)',
        },
      },
    }),
  },
  capCardWeb: {
    position: 'relative',
    overflow: 'hidden',
  },
  capCardSoon: {
    opacity: 0.7,
  },
  capCardInner: {
    flex: 1,
  },
  capLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
    color: COLORS.dim,
    marginBottom: 10,
  },
  capLabelSoon: {
    color: COLORS.dim,
  },
  capTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
    marginBottom: 10,
    lineHeight: 26,
  },
  capTitleSoon: {
    color: COLORS.dim,
  },
  capDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 21,
  },
  capDescSoon: {
    color: COLORS.dim,
  },
  
  // Quote Rotator
  quoteBlock: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  quoteText: {
    fontFamily: SANS,
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.25,
    marginBottom: 20,
    lineHeight: 40,
    textAlign: 'center',
  },
  quoteMark: {
    color: COLORS.accent,
    fontWeight: '900',
  },
  quoteAttr: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.4,
    color: COLORS.dim,
  },
  
  // Pricing Grid
  pricingGrid: {
    ...Platform.select({
      web: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 1,
        backgroundColor: COLORS.b,
      },
      default: {
        flexDirection: 'column',
        gap: 1,
        backgroundColor: COLORS.b,
      },
    }),
  },
  priceCard: {
    backgroundColor: COLORS.s1,
    padding: 32,
    ...Platform.select({
      web: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      },
      default: {
        flex: 1,
      },
    }),
  },
  priceCardFeatured: {
    backgroundColor: '#0d1000',
    borderWidth: 1,
    borderColor: COLORS.accent,
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 0 60px rgba(204, 255, 0, 0.04)',
      },
    }),
  },
  priceBadge: {
    position: 'absolute',
    top: 16,
    right: 18,
    backgroundColor: COLORS.accent,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  priceBadgeText: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.2,
    color: COLORS.bg,
  },
  priceTier: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.8,
    color: COLORS.dim,
    marginBottom: 16,
  },
  priceNumber: {
    fontFamily: SANS,
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 44,
    marginBottom: 4,
  },
  priceSup: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 7,
  },
  pricePeriod: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.dim,
    marginBottom: 24,
  },
  priceFeatures: {
    marginBottom: 28,
  },
  priceFeature: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 9,
    alignItems: 'flex-start',
  },
  priceFeatureIcon: {
    fontFamily: MONO,
    fontSize: 10,
    color: COLORS.dim,
    marginTop: 1,
    ...Platform.select({
      web: {
        transition: 'color 200ms',
        '.priceCard:hover &': {
          color: COLORS.accent,
        },
      },
    }),
  },
  priceFeatureText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
    flex: 1,
  },
  priceButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  priceButtonGhost: {
    borderWidth: 1,
    borderColor: COLORS.b,
    backgroundColor: 'transparent',
  },
  priceButtonWhite: {
    borderWidth: 1,
    borderColor: COLORS.text,
    backgroundColor: COLORS.text,
  },
  priceButtonAccent: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
    ...Platform.select({
      web: {
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(105deg, 
          ${COLORS.accent} 0%, ${COLORS.accent} 35%,
          rgba(255,255,255,0.3) 50%,
          ${COLORS.accent} 65%, ${COLORS.accent} 100%)`,
        backgroundSize: '300% 100%',
        backgroundPosition: '200% center',
        animation: 'shimmer 3s ease-in-out 1.5s infinite',
        ':hover': {
          opacity: 0.88,
          animationPlayState: 'paused',
        },
      } as any,
    }),
  },
  priceButtonText: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.2,
    color: COLORS.muted,
  },
  
  // Footer
  footer: {
    height: 36,
    backgroundColor: COLORS.s1,
    borderTopWidth: 1,
    borderTopColor: COLORS.b,
    overflow: 'hidden',
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  footerText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.dim,
    paddingHorizontal: 20,
  },
});