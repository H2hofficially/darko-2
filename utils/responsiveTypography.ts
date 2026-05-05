import { Platform, useWindowDimensions } from 'react-native';

// Responsive typography utility for DARKO
// Provides font sizes that scale with viewport width on web

const BREAKPOINTS = {
  MOBILE: 0,
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1400,
} as const;

export function useResponsiveFontSizes() {
  const { width } = useWindowDimensions();
  
  // Mobile-first approach
  const isMobile = width < BREAKPOINTS.TABLET;
  const isTablet = width >= BREAKPOINTS.TABLET && width < BREAKPOINTS.DESKTOP;
  const isDesktop = width >= BREAKPOINTS.DESKTOP && width < BREAKPOINTS.WIDE;
  const isWide = width >= BREAKPOINTS.WIDE;

  // Base font sizes for mobile
  const baseSizes = {
    tiny: 8,
    xs: 9,
    sm: 10,
    md: 11,
    base: 12,
    lg: 13,
    xl: 14,
    '2xl': 15,
    '3xl': 16,
    '4xl': 18,
    '5xl': 20,
    '6xl': 22,
    '7xl': 24,
    '8xl': 28,
    '9xl': 32,
    '10xl': 38,
  };

  // Scale factors for different breakpoints
  const scaleFactors = {
    mobile: 1,
    tablet: 1.1,
    desktop: 1.2,
    wide: 1.3,
  };

  let scale = scaleFactors.mobile;
  if (isWide) scale = scaleFactors.wide;
  else if (isDesktop) scale = scaleFactors.desktop;
  else if (isTablet) scale = scaleFactors.tablet;

  // Apply scaling
  const scaledSizes = Object.fromEntries(
    Object.entries(baseSizes).map(([key, value]) => [key, Math.round(value * scale)])
  ) as Record<keyof typeof baseSizes, number>;

  // Special adjustments for specific use cases
  const responsiveSizes = {
    ...scaledSizes,
    // Header sizes - more aggressive scaling on desktop
    headerSm: isMobile ? 18 : isDesktop ? 22 : 20,
    headerMd: isMobile ? 22 : isDesktop ? 28 : 24,
    headerLg: isMobile ? 28 : isDesktop ? 36 : 32,
    headerXl: isMobile ? 32 : isDesktop ? 42 : 38,
    header2xl: isMobile ? 38 : isDesktop ? 48 : 42,
    
    // Body text - moderate scaling
    bodySm: isMobile ? 12 : 13,
    bodyMd: isMobile ? 14 : 15,
    bodyLg: isMobile ? 16 : 17,
    
    // Mono font adjustments - slightly smaller scaling
    monoXs: isMobile ? 8 : 9,
    monoSm: isMobile ? 9 : 10,
    monoMd: isMobile ? 10 : 11,
    monoBase: isMobile ? 11 : 12,
    monoLg: isMobile ? 12 : 13,
    monoXl: isMobile ? 13 : 14,
    mono2xl: isMobile ? 14 : 15,
    mono3xl: isMobile ? 16 : 17,
  };

  return responsiveSizes;
}

// Helper to get responsive font size object for StyleSheet
export function getResponsiveFontSizes() {
  const sizes = useResponsiveFontSizes();
  
  return {
    // Standard sizes
    tiny: { fontSize: sizes.tiny },
    xs: { fontSize: sizes.xs },
    sm: { fontSize: sizes.sm },
    md: { fontSize: sizes.md },
    base: { fontSize: sizes.base },
    lg: { fontSize: sizes.lg },
    xl: { fontSize: sizes.xl },
    '2xl': { fontSize: sizes['2xl'] },
    '3xl': { fontSize: sizes['3xl'] },
    '4xl': { fontSize: sizes['4xl'] },
    '5xl': { fontSize: sizes['5xl'] },
    '6xl': { fontSize: sizes['6xl'] },
    '7xl': { fontSize: sizes['7xl'] },
    '8xl': { fontSize: sizes['8xl'] },
    '9xl': { fontSize: sizes['9xl'] },
    '10xl': { fontSize: sizes['10xl'] },
    
    // Header styles
    headerSm: { fontSize: sizes.headerSm, fontWeight: '700' as const },
    headerMd: { fontSize: sizes.headerMd, fontWeight: '700' as const },
    headerLg: { fontSize: sizes.headerLg, fontWeight: '700' as const },
    headerXl: { fontSize: sizes.headerXl, fontWeight: '700' as const },
    header2xl: { fontSize: sizes.header2xl, fontWeight: '700' as const },
    
    // Body styles
    bodySm: { fontSize: sizes.bodySm },
    bodyMd: { fontSize: sizes.bodyMd },
    bodyLg: { fontSize: sizes.bodyLg },
    
    // Mono styles
    monoXs: { fontSize: sizes.monoXs, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    monoSm: { fontSize: sizes.monoSm, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    monoMd: { fontSize: sizes.monoMd, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    monoBase: { fontSize: sizes.monoBase, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    monoLg: { fontSize: sizes.monoLg, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    monoXl: { fontSize: sizes.monoXl, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    mono2xl: { fontSize: sizes.mono2xl, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
    mono3xl: { fontSize: sizes.mono3xl, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
  };
}

// Simple hook for quick responsive font size values
export function useResponsiveFontSize(size: keyof ReturnType<typeof useResponsiveFontSizes>) {
  const sizes = useResponsiveFontSizes();
  return sizes[size];
}