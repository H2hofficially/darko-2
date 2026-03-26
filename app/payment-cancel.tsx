import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BG = '#09090B';
const ACCENT = '#CCFF00';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const BORDER = '#27272A';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function PaymentCancelScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        <Text style={styles.tag}>// PAYMENT CANCELLED</Text>
        <View style={styles.divider} />
        <Text style={styles.title}>ABORTED.</Text>
        <Text style={styles.body}>
          {'No charges were made.\n\nYour free tier access remains active. You can upgrade at any time from within the system.'}
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
    color: TEXT_DIM,
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
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  btnText: {
    fontFamily: MONO as any,
    fontSize: 13,
    color: ACCENT,
    letterSpacing: 3,
  },
});
