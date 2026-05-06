import { Platform, useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

const PHONE_MAX = 640;     // <  640 → phone
const TABLET_MAX = 1024;   // <  1024 → tablet, ≥ 1024 → desktop

/**
 * Unified responsive breakpoints for the Darko web app.
 *
 *   phone   — width <  640    stacked layouts, bottom sheets, FAB for primary actions
 *   tablet  — 640 ≤ w < 1024  side panels capped, but bottom sheets in portrait
 *   desktop — width ≥ 1024    full multi-column layouts
 *
 * Native (iOS/Android) is treated as 'phone' regardless of width — Darko ships
 * web only, but this keeps the Expo template paths sound.
 *
 * Use `useBottomSheet` to decide drawer/panel style: it folds in tablet portrait
 * (where a 360px side panel covers half the screen).
 */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  let breakpoint: Breakpoint = 'phone';
  if (isWeb) {
    if (width >= TABLET_MAX) breakpoint = 'desktop';
    else if (width >= PHONE_MAX) breakpoint = 'tablet';
  }

  const isPhone = breakpoint === 'phone';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';
  const isPortrait = height > width;
  const isTabletPortrait = isTablet && isPortrait;

  return {
    breakpoint,
    width,
    height,
    isPhone,
    isTablet,
    isDesktop,
    isPortrait,
    isTabletPortrait,
    /** Use bottom-sheet style drawers (phone or tablet portrait). */
    useBottomSheet: isPhone || isTabletPortrait,
  };
}
