// BUG-12: branded DARKO 404 page. Replaces the unbranded
// "Unmatched Route — Page could not be found" hosting-platform fallback that
// previously rendered for any unknown route (e.g. /nonexistent-page).
//
// Stays inside the standard expo-router file-based routing convention
// (`+not-found.tsx`), so no router config changes are required.

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#71717A';
const MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.tag}>// SIGNAL LOST</Text>
        <View style={styles.divider} />
        <Text style={styles.headline}>This page is not on the map.</Text>
        <Text style={styles.body}>
          The route you tried doesn't resolve to anything DARKO knows about.
          It may have moved, never existed, or you mistyped the URL.
        </Text>

        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.btnPrimaryText}>[ RETURN HOME ]</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/contact' as any)}
          >
            <Text style={styles.btnGhostText}>[ CONTACT ]</Text>
          </Pressable>
        </View>

        <Text style={styles.foot}>// DARKO · NXGEN MEDIA LLC</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  code: {
    fontFamily: MONO as any,
    fontSize: 96,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 6,
    lineHeight: 100,
  },
  tag: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 4,
    marginTop: 8,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 32,
  },
  headline: {
    fontFamily: MONO as any,
    fontSize: 18,
    color: TEXT_PRIMARY,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: MONO as any,
    fontSize: 12,
    color: TEXT_DIM,
    letterSpacing: 0.5,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 480,
    marginBottom: 32,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 4,
  },
  btnPrimaryText: {
    fontFamily: MONO as any,
    fontSize: 12,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 4,
  },
  btnGhostText: {
    fontFamily: MONO as any,
    fontSize: 12,
    color: TEXT_DIM,
    letterSpacing: 3,
  },
  foot: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: '#3F3F46',
    letterSpacing: 2,
    marginTop: 64,
  },
});
