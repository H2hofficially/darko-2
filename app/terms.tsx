import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const ACCENT = '#CCFF00';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function TermsScreen() {
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
          <Text style={styles.title}>// TERMS OF SERVICE</Text>
          <Text style={styles.updated}>Last updated: March 2026</Text>

          <Section title="Agreement">
            {`By creating an account and using DARKO, you agree to these terms. If you do not agree, do not use the service.`}
          </Section>

          <Section title="Purpose">
            {`DARKO is a tool for personal development, relationship strategy, and self-awareness. It is designed to help you understand social dynamics, communication patterns, and interpersonal psychology.\n\nDARKO does not provide professional psychological, psychiatric, legal, or medical advice. It is not a licensed therapist. Nothing DARKO says constitutes professional counsel of any kind. Use your own judgment.`}
          </Section>

          <Section title="Acceptable Use">
            {`You agree not to use DARKO for:\n\n• Stalking, harassment, or surveillance of any person\n• Planning or facilitating illegal activity\n• Blackmail, extortion, or coercion\n• Targeting minors\n\nViolations will result in immediate account termination without refund. We cooperate with law enforcement when legally required.`}
          </Section>

          <Section title="Free Tier">
            {`Free accounts receive 30 messages per day. This limit resets at midnight UTC. Message counts are tracked per account and cannot be transferred or rolled over.`}
          </Section>

          <Section title="Subscriptions">
            {`If a Pro subscription is offered:\n\n• Subscriptions are billed monthly or annually as selected at checkout.\n• Subscriptions auto-renew unless cancelled before the renewal date.\n• Refunds are not provided for partial billing periods.\n• Cancellation takes effect at the end of the current billing period. Access continues until the period ends.`}
          </Section>

          <Section title="Intellectual Property">
            {`DARKO, its code, design system, system prompts, and AI personas are proprietary. You may not copy, reverse-engineer, or reproduce any part of the service without written permission.\n\nYou retain ownership of the conversation content you submit. By submitting content, you grant us a limited license to process it for the purpose of delivering the service.`}
          </Section>

          <Section title="Disclaimers">
            {`THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE MAKE NO GUARANTEES ABOUT OUTCOMES, ACCURACY, OR RESULTS. RELATIONSHIP STRATEGY IS INHERENTLY UNCERTAIN. DARKO PROVIDES ANALYSIS, NOT GUARANTEES.\n\nIN NO EVENT SHALL DARKO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM USE OF THE SERVICE.`}
          </Section>

          <Section title="Termination">
            {`We reserve the right to suspend or terminate any account that violates these terms, at our sole discretion, with or without notice.`}
          </Section>

          <Section title="Governing Law">
            {`These terms are governed by the laws of the jurisdiction in which the operator is established, without regard to conflict of law provisions.`}
          </Section>

          <Section title="Changes">
            {`We may update these terms. Continued use after changes constitutes acceptance.`}
          </Section>

          <Text style={styles.contact}>Questions: support@darko.app</Text>
        </ScrollView>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>// {title.toUpperCase()}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
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
    width: '100%',
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
  title: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 6,
  },
  updated: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 10,
  },
  sectionBody: {
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_DIM,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  contact: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginTop: 16,
  },
});
