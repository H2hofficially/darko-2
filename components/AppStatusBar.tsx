import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';

const BG = 'rgba(18,18,21,0.96)';
const BORDER = '#27272A';
const DIM = '#52525b';
const ACCENT = '#CCFF00';
const MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: "'JetBrains Mono', monospace",
});

const STATUS_ITEMS = [
  { dot: true, label: 'HANDLER ONLINE' },
  { dot: true, label: 'DECODE ENGINE ACTIVE' },
  { label: 'ENGINE', val: 'DARKO v4.0' },
  { label: 'LATENCY', val: '142ms' },
  { label: 'ENCRYPTION', val: 'AES-256' },
];

export function AppStatusBar() {
  const [latency, setLatency] = useState(142);

  // Subtly vary latency to feel live
  useEffect(() => {
    const t = setInterval(() => {
      setLatency(130 + Math.floor(Math.random() * 30));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={s.bar}>
      <View style={s.items}>
        <StatusItem dot label="HANDLER ONLINE" />
        <Separator />
        <StatusItem dot label="DECODE ENGINE ACTIVE" />
        <Separator />
        <StatusItem label="ENGINE" val="DARKO v4.0" />
        <Separator />
        <StatusItem label="LATENCY" val={`${latency}ms`} />
        <Separator />
        <StatusItem label="ENCRYPTION" val="AES-256" />
      </View>
      <Text style={s.copy}>DARKO · NXGEN MEDIA LLC · 2026</Text>
    </View>
  );
}

function StatusItem({ dot, label, val }: { dot?: boolean; label: string; val?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!dot) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);

  return (
    <View style={s.item}>
      {dot && (
        <Animated.View style={[s.dot, { opacity: pulse }]} />
      )}
      <Text style={s.label}>{label}</Text>
      {val && <Text style={s.val}> {val}</Text>}
    </View>
  );
}

function Separator() {
  return <Text style={s.sep}>·</Text>;
}

const s = StyleSheet.create({
  bar: {
    height: 30,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    flexShrink: 0,
  },
  items: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  label: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: DIM,
    letterSpacing: 1,
  },
  val: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1,
  },
  sep: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: BORDER,
  },
  copy: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: DIM,
    letterSpacing: 1,
  },
});
