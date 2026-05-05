// Animated wordmark used wherever the brand appears in the React tree.
// Renders "Darko" + a blinking lime cursor "_". Subtle ambient loop, ~1s.
//
// On web, prefers CSS animation (single style mutation, GPU-friendly).
// On native, uses Animated.Value loop — kept here for completeness even though
// Darko ships as web only today.

import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Font size of the wordmark in px. The cursor matches. Default 18. */
  size?: number;
  /** Override the "Darko" text colour. Default white. */
  color?: string;
  /** Override the cursor colour. Default Darko lime. */
  cursorColor?: string;
  /** Letter spacing. Default tight (-0.4). */
  letterSpacing?: number;
  /** Fall back to a static "// DARKO" style label (e.g. for screen readers). */
  label?: string;
  /** Extra style override on the wrapper. */
  style?: any;
};

const DEFAULT_COLOR = '#FAFAFA';
const DEFAULT_CURSOR = '#CCFF00';
const MONO = Platform.select({
  web: "'JetBrains Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace",
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});

// Inject the @keyframes once on web. Idempotent — safe to call repeatedly.
function ensureWebKeyframes() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('darko-logo-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'darko-logo-keyframes';
  s.textContent = `@keyframes darko-blink{0%,49.99%{opacity:1}50%,100%{opacity:0}}`;
  document.head.appendChild(s);
}

export default function DarkoLogo({
  size = 18,
  color = DEFAULT_COLOR,
  cursorColor = DEFAULT_CURSOR,
  letterSpacing = -0.4,
  label = 'Darko',
  style,
}: Props) {
  // Web: pure CSS animation (no JS animation loop)
  if (Platform.OS === 'web') {
    ensureWebKeyframes();
    return (
      <View style={[styles.row, style]} accessibilityRole="text" accessibilityLabel={label}>
        <Text
          style={{
            fontFamily: MONO,
            fontSize: size,
            fontWeight: '700',
            color,
            letterSpacing,
            lineHeight: size * 1.1,
          }}
        >
          Darko
        </Text>
        <Text
          // @ts-expect-error react-native-web passes style.animationName through to CSS
          style={{
            fontFamily: MONO,
            fontSize: size,
            fontWeight: '700',
            color: cursorColor,
            letterSpacing,
            lineHeight: size * 1.1,
            marginLeft: 1,
            animationName: 'darko-blink',
            animationDuration: '1.06s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'steps(1, end)',
          }}
        >
          _
        </Text>
      </View>
    );
  }

  // Native: Animated.Value loop. Steps semantics via interpolation (0 or 1).
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: 530, useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: 530, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const opacity = phase.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });

  return (
    <View style={[styles.row, style]} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={{ fontFamily: MONO, fontSize: size, fontWeight: '700', color, letterSpacing }}>
        Darko
      </Text>
      <Animated.Text
        style={{
          fontFamily: MONO,
          fontSize: size,
          fontWeight: '700',
          color: cursorColor,
          letterSpacing,
          marginLeft: 1,
          opacity,
        }}
      >
        _
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
