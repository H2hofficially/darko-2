import React from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';

interface DesktopLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  panel?: React.ReactNode;
}

export function DesktopLayout({ sidebar, main, panel }: DesktopLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  if (!isDesktop) return <View style={{ flex: 1 }}>{main}</View>;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        height: '100%' as any,
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <View
        style={{
          width: 260,
          borderRightWidth: 1,
          borderRightColor: '#27272A',
          backgroundColor: '#09090B',
          paddingTop: 16,
        }}
      >
        {sidebar}
      </View>
      <View style={{ flex: 1, backgroundColor: '#09090B' }}>{main}</View>
      {panel && (
        <View
          style={{
            width: 320,
            borderLeftWidth: 1,
            borderLeftColor: '#27272A',
            backgroundColor: '#09090B',
            paddingTop: 16,
          }}
        >
          {panel}
        </View>
      )}
    </View>
  );
}
