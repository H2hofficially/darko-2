import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface DesktopLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  panel?: React.ReactNode;
}

export function DesktopLayout({ sidebar, main, panel }: DesktopLayoutProps) {
  const { width, isTablet, isDesktop } = useBreakpoint();

  // Wide desktop (≥1400) gets a slightly bigger right panel.
  const isWide = isDesktop && width >= 1400;

  // Mobile — main only
  if (!isTablet && !isDesktop) {
    return <View style={{ flex: 1 }}>{main}</View>;
  }

  // Tablet — sidebar + main, no panel
  if (isTablet) {
    return (
      <View style={styles.container}>
        <View style={styles.sidebarTablet}>{sidebar}</View>
        <View style={styles.main}>{main}</View>
      </View>
    );
  }

  // Desktop — sidebar + main + optional panel
  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>{sidebar}</View>
      <View style={styles.main}>{main}</View>
      {panel && (
        <View style={[styles.panel, isWide && styles.panelWide]}>
          {panel}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    height: '100%' as any,
    backgroundColor: '#09090B',
  },
  sidebarTablet: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#27272A',
    backgroundColor: '#09090B',
    paddingTop: 20,
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: '#27272A',
    backgroundColor: '#09090B',
    paddingTop: 24,
  },
  main: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingTop: 24,
    paddingHorizontal: 32,
    minWidth: 0,
  },
  panel: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: '#27272A',
    backgroundColor: '#09090B',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  panelWide: {
    width: 380,
  },
});
