import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BG = '#09090B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const ACCENT = '#CCFF00';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const SUPPORT_EMAIL = 'donniedarkoapp@gmail.com';

export default function ContactScreen() {
  const router = useRouter();

  const openMail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=DARKO%20Support%20Request`,
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        <Text style={styles.title}>// SUPPORT</Text>
        <Text style={styles.subtitle}>
          {'Have a question, bug report, or feedback? Reach out directly.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SUPPORT EMAIL</Text>
          <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
          <Text style={styles.cardNote}>
            {'Response time: 24–48 hours.\nInclude your account email and a description of the issue.'}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={openMail}>
            <Text style={styles.btnText}>[ SEND EMAIL ]</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <Text style={styles.footnote}>
          {'For billing and subscription issues, include "BILLING" in your subject line.\nFor account deletion requests, include "DELETE ACCOUNT".'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    width: '100%' as any,
  },
  content: {
    maxWidth: 480,
    alignSelf: 'center' as const,
    width: '100%' as any,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 80,
  },
  pageHeader: {
    marginBottom: 8,
  },
  back: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 24,
  },
  title: {
    fontFamily: MONO as any,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 0.5,
    lineHeight: 18,
    marginBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 20,
    backgroundColor: '#18181B',
  },
  cardLabel: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 3,
    marginBottom: 10,
  },
  emailText: {
    fontFamily: MONO as any,
    fontSize: 15,
    color: ACCENT,
    letterSpacing: 1,
    marginBottom: 14,
  },
  cardNote: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    lineHeight: 17,
    marginBottom: 20,
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
  footnote: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: '#3D3D40',
    letterSpacing: 0.3,
    lineHeight: 17,
  },
});
