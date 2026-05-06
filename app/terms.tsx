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

export default function TermsScreen() {
  const router = useRouter();

  // Same back-button fallback as privacy.tsx — see note there.
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>// TERMS OF SERVICE</Text>
          <Text style={styles.meta}>Last updated: {LAST_UPDATED}</Text>

          <Text style={styles.body}>
            Darko (&quot;Darko&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;, &quot;the Service&quot;) is a product of NXGEN MEDIA LLC, a Delaware limited liability company. These Terms of Service govern your use of darkoapp.com. By creating an account, signing in, or otherwise using the Service, you agree to these Terms. If you do not agree, do not use the Service.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>1 // What Darko is</Text>
          <Text style={styles.body}>
            Darko is an analytical tool that decodes text-based communication and surfaces behavioral and psychological patterns to help you read interpersonal situations more clearly. Outputs include profiles, archetype labels, manipulation pattern flags, and recommended scripts. Darko is provided as an analytical and educational tool. It is <Text style={styles.bold}>not</Text> a substitute for mental-health care, legal advice, or professional counseling.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>2 // Eligibility</Text>
          <Text style={styles.body}>
            You must be at least 18 years old to use Darko. By using the Service you represent that you are 18 or older and that your use of the Service does not violate any law or contract that applies to you.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>3 // Your account</Text>
          <Text style={styles.body}>
            You are responsible for activity under your account, for keeping your sign-in credentials secure, and for the accuracy of any information you submit. Notify us immediately if you suspect unauthorized access. We may suspend or terminate accounts that violate these Terms or that we reasonably believe pose a risk to the Service or to other users.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>4 // Acceptable use</Text>
          <Text style={styles.body}>
            You agree not to: (a) use the Service to harass, defame, threaten, stalk, or unlawfully surveil any person; (b) submit content that infringes another person&apos;s rights, including intellectual property and privacy; (c) upload content depicting or sexualizing minors; (d) attempt to reverse-engineer, scrape, or circumvent technical limits on the Service; (e) resell or sublicense access; (f) use the Service to plan or carry out illegal activity. Violations may result in immediate termination.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>5 // Subscriptions &amp; pricing</Text>
          <Text style={styles.body}>
            Darko is offered in three tiers:
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>OBSERVER</Text> — free forever. 5 reads per month, basic decoding, single target.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>PRO</Text> — $15 / month or $150 / year. 150 messages per month, up to 8 targets, voice and image input, full dossiers, phase tracking. A 4-day free trial is available before the first charge.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>EXECUTIVE</Text> — $100 / month. The first 100 founder seats are price-locked at $100/month for life. Removes message caps, opens campaign engine and additional features described on the pricing page.
          </Text>
          <Text style={styles.body}>
            Pricing on the in-app pricing page is canonical and may be revised. Material price increases for an existing subscription will be communicated in advance and will not apply mid-billing-cycle.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>6 // Payments</Text>
          <Text style={styles.body}>
            All paid subscriptions are processed through <Text style={styles.bold}>Stripe</Text>. We do not store full card numbers, CVVs, or bank account details. Subscriptions renew automatically at the end of each billing period until you cancel. You authorize Stripe, on our behalf, to charge the payment method you provide for each renewal.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>7 // Cancellation &amp; refunds</Text>
          <Text style={styles.body}>
            You may cancel your subscription at any time from inside the app: Account → Subscription → Cancel. Cancellation takes effect at the end of the current billing period; access continues until then. <Text style={styles.bold}>Subscription fees are non-refundable</Text> except where required by law. The 4-day free trial does not result in a charge if you cancel before the trial ends.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>8 // Disclaimer</Text>
          <Text style={styles.body}>
            DARKO IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. The Service produces analytical and behavioral interpretations based on the input you provide. Those interpretations are inferences, not facts. You are solely responsible for how you act on Darko&apos;s output, including any messages, plans, or decisions you make in reliance on it.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>9 // Limitation of liability</Text>
          <Text style={styles.body}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, NXGEN MEDIA LLC AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, RELATIONSHIPS, OR DATA, ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (a) THE AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM AND (b) USD $100.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>10 // Indemnification</Text>
          <Text style={styles.body}>
            You agree to indemnify and hold harmless NXGEN MEDIA LLC and its officers, employees, and agents from any claim, damage, or expense (including reasonable attorneys&apos; fees) arising out of (a) your use of the Service, (b) your violation of these Terms, or (c) your violation of any law or third-party right.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>11 // Intellectual property</Text>
          <Text style={styles.body}>
            Darko, its branding, code, copy, design, and the engine that produces decode output are the property of NXGEN MEDIA LLC, protected by copyright and other intellectual property laws. Content <Text style={styles.bold}>you</Text> submit remains yours; you grant us a limited license to process it as needed to provide the Service.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>12 // Termination</Text>
          <Text style={styles.body}>
            You may stop using the Service and delete your account at any time. We may suspend or terminate access to the Service for violations of these Terms, fraud, abuse, or risk to the Service. Upon termination, your right to use the Service ends immediately. Sections that by their nature should survive termination (Disclaimer, Limitation of Liability, Indemnification, Governing Law) will survive.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>13 // Changes to these Terms</Text>
          <Text style={styles.body}>
            We may revise these Terms over time. Material changes will be flagged at sign-in and reflected in the &quot;Last updated&quot; date above. Continued use after revisions take effect constitutes acceptance.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>14 // Governing law</Text>
          <Text style={styles.body}>
            These Terms are governed by the laws of the State of Delaware, USA, without regard to its conflict-of-laws principles. Any dispute arising out of or relating to these Terms or the Service will be brought exclusively in the state or federal courts located in Delaware, and you consent to personal jurisdiction there.
          </Text>

          <View style={styles.sectionDivider} />
          <Text style={styles.heading}>15 // Contact</Text>
          <Text style={styles.body}>
            NXGEN MEDIA LLC{'\n'}
            For questions about these Terms, billing, or termination:{'\n'}
            <Text style={styles.bold}>support@darkoapp.com</Text>
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
