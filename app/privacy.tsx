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
          <Text style={styles.updated}>Last updated: March 2026</Text>

          <Section title="What We Collect">
            {`DARKO collects the following data to operate the service:\n\n• Email address — used for account authentication via Supabase Auth.\n• Messages and conversation history — the text you submit for analysis, and DARKO's responses, are stored in our database so that DARKO can maintain context across sessions.\n• Target profiles — the names, objectives, and leverage fields you enter for each target.\n• Usage counts — a daily message count is tracked per account for rate limiting on the free tier.\n• Push notification tokens — collected on native (iOS/Android) only, used to deliver campaign alerts. Not collected on web.`}
          </Section>

          <Section title="How Your Data Is Processed">
            {`Messages are sent to Google Gemini 2.5 Flash, Google's large language model, for psychological analysis. By using DARKO, you consent to this processing.\n\nAll data is stored in Supabase (supabase.io), a Postgres-based cloud database hosted on AWS. Data is stored in the us-east-1 region.\n\nWe do not use your data to train AI models.`}
          </Section>

          <Section title="Data We Do Not Collect">
            {`• We do not sell your data to third parties.\n• We do not share your conversation content with any party other than Google (for AI processing) and Supabase (for storage).\n• We do not collect payment information directly — if a payment feature is added in future, it will be handled by a third-party processor.`}
          </Section>

          <Section title="Data Retention">
            {`Your conversation history is retained as long as your account exists. Deleting a target profile permanently deletes all associated conversation messages via database cascade.\n\nTo request full account deletion and data erasure, contact us at privacy@darko.app. We will process deletion requests within 30 days.`}
          </Section>

          <Section title="Cookies & Local Storage">
            {`On web, your authentication session is stored in your browser's local storage via Supabase Auth. No third-party tracking cookies are used.`}
          </Section>

          <Section title="Children">
            {`DARKO is intended for users 18 and older. We do not knowingly collect data from minors.`}
          </Section>

          <Section title="Changes">
            {`We may update this policy. Continued use of the service after changes constitutes acceptance. Material changes will be noted on this page.`}
          </Section>

          <Text style={styles.contact}>Questions: privacy@darko.app</Text>
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
    maxWidth: 720,
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
