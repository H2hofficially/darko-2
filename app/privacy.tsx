import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BG = '#09090B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const ACCENT = '#CCFF00';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>// PRIVACY POLICY</Text>
          <Text style={styles.body}>
            {'DARKO is a product of Nxgen Media LLC.\n\nWe do not sell your personal text message data or psychological profiles to third-party brokers. For data deletion requests, contact our support team.'}
          </Text>
          <View style={styles.sectionDivider} />
          <Text style={styles.body}>
            {'Privacy Policy for DARKO. DARKO, a product of Nxgen Media LLC, collects minimal user data necessary to provide operational functionality and process payments securely via Stripe. We do not sell your personal text message data or psychological profiles to third-party brokers. For data deletion requests, contact our support team.'}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%' as any,
    maxWidth: 640,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 8,
  },
  back: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  content: {
    paddingBottom: 80,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 24,
  },
  title: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 24,
  },
  body: {
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_DIM,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
});
