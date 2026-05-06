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

const LAST_UPDATED = 'May 6, 2026';

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
          <Text style={styles.meta}>Last updated: {LAST_UPDATED}</Text>

          <Text style={styles.body}>
            Darko (&quot;Darko&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a product of NXGEN MEDIA LLC, a Delaware limited liability company. This Privacy Policy explains what we collect when you use darkoapp.com, what we do with it, who we share it with, and the controls you have. By using Darko you accept the practices described here.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>1 // What we collect</Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Account data.</Text> When you sign up we collect the email address you sign in with and a unique account identifier issued by our authentication provider. We do not ask for your real name or phone number.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Content you submit.</Text> Whatever you paste, type, upload, or speak into the decode interface — text excerpts, screenshots, voice clips, target notes, leverage and objective fields, operator notes. We treat this as private to your account.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Derived analysis.</Text> Profiles, archetypes, attachment style readings, manipulation pattern flags, and recommended scripts that Darko generates from your inputs. These are stored alongside your account so the engine can build on prior context across sessions.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Operational telemetry.</Text> Standard server logs (IP address, timestamp, request path, status code) for security and debugging, retained no longer than 30 days unless we&apos;re actively investigating an incident.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Payment metadata.</Text> If you subscribe, our payment processor (Stripe) issues a customer ID we associate with your account. <Text style={styles.bold}>We do not store, see, or have access to your full credit card number, CVV, or bank details</Text> — those live with Stripe.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>2 // How we use it</Text>
          <Text style={styles.body}>
            We use your data to run the service: returning decodes, building dossiers, tracking phase progression for each target, enforcing tier limits, and processing payments. Aggregated, de-identified usage metrics may inform product decisions. We do not sell your data, share it with data brokers, or use the content you submit to train third-party AI models on your behalf.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>3 // Where data lives</Text>
          <Text style={styles.body}>
            Your account row, conversation history, target list, and derived profiles are stored in a Postgres database hosted by Supabase in a US region. Database access is gated by row-level security so a request authenticated as you can only return your own rows. Connections are TLS-encrypted in transit. Stored content is encrypted at rest by the hosting provider.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>4 // Third-party processors</Text>
          <Text style={styles.body}>
            Darko sends the text and image content you submit to upstream model providers strictly to generate your decode response. Current providers: <Text style={styles.bold}>DeepSeek</Text> (text reasoning), <Text style={styles.bold}>Google</Text> (Gemini, screenshot/image extraction and classification). These providers process the request statelessly per their published policies; we do not authorize them to retain your prompts for model training. Payment processing is handled by <Text style={styles.bold}>Stripe</Text>. Authentication is handled by Supabase. Hosting is on <Text style={styles.bold}>Netlify</Text> (static frontend) and Supabase (backend).
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>5 // Retention &amp; deletion</Text>
          <Text style={styles.body}>
            You can delete an individual target — and every conversation, profile, and note attached to it — from inside the app at any time. Deletion is propagated to our database within 60 seconds. Account-wide deletion is available on request: email the address at the bottom of this page and we will purge your account, all associated rows, and your Stripe customer record within 30 days. Server logs containing your IP address are rotated on a 30-day window.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>6 // Your rights</Text>
          <Text style={styles.body}>
            Depending on where you live (notably the EU/UK under GDPR and California under CCPA) you may have the right to access, correct, port, or delete the personal data we hold about you, and to object to or restrict certain processing. Send any such request to the contact address below; we will respond within 30 days.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>7 // Children</Text>
          <Text style={styles.body}>
            Darko is not directed at children. The service is restricted to users 18 years of age or older. We do not knowingly collect data from anyone under 18; if you believe a child has signed up, contact us and we will delete the account.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>8 // Security</Text>
          <Text style={styles.body}>
            We use TLS 1.2+ for every request to darkoapp.com, encrypted-at-rest storage at our database provider, and row-level security policies to ensure no user can read another user&apos;s rows. No system is perfectly secure; if you believe your account has been compromised, contact us immediately.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>9 // Changes to this policy</Text>
          <Text style={styles.body}>
            We may update this policy as the product evolves. Material changes will be flagged at sign-in and reflected in the &quot;Last updated&quot; date at the top of this page. Continued use after the update means you accept the revised policy.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>10 // Contact</Text>
          <Text style={styles.body}>
            NXGEN MEDIA LLC{'\n'}
            For privacy requests, account deletion, or any of the above rights:{'\n'}
            <Text style={styles.bold}>privacy@darkoapp.com</Text>
          </Text>

          <View style={[styles.sectionDivider, { marginTop: 32 }]} />
          <Text style={styles.footnote}>© 2026 NXGEN MEDIA LLC. All rights reserved.</Text>
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
    marginBottom: 8,
  },
  meta: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginBottom: 16,
  },
  heading: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 12,
  },
  body: {
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_DIM,
    lineHeight: 22,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  bold: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  footnote: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
