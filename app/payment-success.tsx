import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUser } from '../context/UserContext';

const BG = '#09090B';
const ACCENT = '#CCFF00';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const BORDER = '#27272A';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { refreshTier } = useUser();

  useEffect(() => {
    // Refresh tier from DB — Stripe webhook may have already updated it
    const timeout = setTimeout(() => refreshTier(), 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        <Text style={styles.tag}>// PAYMENT CONFIRMED</Text>
        <View style={styles.divider} />
        <Text style={styles.title}>ACCESS GRANTED.</Text>
        <Text style={styles.body}>
          {'Your DARKO PRO subscription is now active.\n\nAll features have been unlocked. Return to the system to begin operating at full capacity.'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/')}>
          <Text style={styles.btnText}>[ RETURN TO SYSTEM ]</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inner: {
    width: '100%' as any,
    maxWidth: 480,
  },
  tag: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 3,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  title: {
    fontFamily: MONO as any,
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 20,
  },
  body: {
    fontFamily: MONO as any,
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 22,
    letterSpacing: 0.3,
    marginBottom: 36,
  },
  btn: {
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  btnText: {
    fontFamily: MONO as any,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
});
