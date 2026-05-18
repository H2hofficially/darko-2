import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import DarkoLogo from '../components/DarkoLogo';

// BUG-04: client-side email format validation. Lightweight regex — exists strictly
// to catch obvious typos before a server round-trip, not to be RFC-5322 perfect.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// BUG-11: minimum password length for signup. Server will enforce its own rule;
// this short-circuits the round-trip when the password is obviously too short.
const MIN_PASSWORD_LEN = 8;

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#666666';
const ERROR_RED = '#FF4444';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  // BUG-07: hero CTAs from the landing page navigate here with `?plan=pro` (and
  // `mode=signup` is also accepted as an explicit override). Default to signup
  // when either is present so users land on the CREATE ACCOUNT form, not login.
  const params = useLocalSearchParams<{ plan?: string; mode?: string }>();
  const initialMode: Mode =
    params?.mode === 'signup' || (typeof params?.plan === 'string' && params.plan.length > 0)
      ? 'signup'
      : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup-only fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [ageFocused, setAgeFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // Already logged in → skip to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  // ── Forgot password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('ENTER YOUR EMAIL FIRST, THEN TAP FORGOT PASSWORD');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('PLEASE ENTER A VALID EMAIL ADDRESS');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
    setLoading(false);
    if (err) {
      setError(err.message.toUpperCase());
    } else {
      setResetSent(true);
    }
  };

  // ── Login ────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    // BUG-05: empty submit was a silent no-op. Surface specific field errors so
    // the user knows which field is missing instead of staring at a dead button.
    const trimmedEmail = email.trim();
    if (!trimmedEmail && !password) {
      setError('EMAIL AND PASSWORD ARE REQUIRED');
      return;
    }
    if (!trimmedEmail) { setError('EMAIL IS REQUIRED'); return; }
    if (!password) { setError('PASSWORD IS REQUIRED'); return; }

    // BUG-04: client-side email format check. Avoids a round-trip + the generic
    // "INVALID LOGIN CREDENTIALS" message for an obviously malformed address.
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('PLEASE ENTER A VALID EMAIL ADDRESS');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setLoading(false);

    if (err) {
      setError(err.message.toUpperCase());
    } else {
      await AsyncStorage.setItem('darko_onboarded', 'true');
      router.replace('/');
    }
  };

  // ── Signup ───────────────────────────────────────────────────────────────────

  const handleSignup = async () => {
    const name = fullName.trim();
    const ageNum = parseInt(age.trim(), 10);
    const trimmedEmail = email.trim();

    if (!name) { setError('FULL NAME IS REQUIRED'); return; }
    if (!age.trim() || isNaN(ageNum)) { setError('ENTER YOUR AGE'); return; }
    // BUG-10: also defend against negative ages here, since the on-change strip
    // is the only thing currently preventing them — a paste or autofill could
    // bypass that. Belt + suspenders.
    if (ageNum < 0) { setError('AGE MUST BE A POSITIVE NUMBER'); return; }
    if (ageNum < 18) {
      setError('YOU MUST BE 18 OR OLDER TO USE DARKO');
      return;
    }
    if (!trimmedEmail) { setError('EMAIL IS REQUIRED'); return; }
    // BUG-04: same client-side email format guard as login.
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('PLEASE ENTER A VALID EMAIL ADDRESS');
      return;
    }
    if (!password) { setError('PASSWORD IS REQUIRED'); return; }
    // BUG-11: enforce a visible minimum password length on the client. Hint text
    // below the input also communicates the requirement up-front (see render).
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`PASSWORD MUST BE AT LEAST ${MIN_PASSWORD_LEN} CHARACTERS`);
      return;
    }
    if (!consent) {
      setError('YOU MUST AGREE TO THE TERMS AND PRIVACY POLICY');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name,
          age: ageNum,
          consent_at: new Date().toISOString(),
        },
      },
    });

    setLoading(false);

    if (err) {
      setError(err.message.toUpperCase());
    } else if (!data.session) {
      setConfirmPending(true);
    } else {
      await AsyncStorage.setItem('darko_onboarded', 'true');
      router.replace('/');
    }
  };

  // ── Confirm pending screen ────────────────────────────────────────────────────

  if (confirmPending) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={[styles.flex, Platform.OS === 'web' && styles.webColumn]}>
          <ScrollView
            contentContainerStyle={[styles.scroll, Platform.OS === 'web' && styles.scrollWeb]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <DarkoLogo size={32} />
              <Text style={styles.logoSub}>psychological intelligence system</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.confirmTitle}>CHECK YOUR EMAIL</Text>
            <Text style={styles.confirmBody}>
              A verification link has been sent to{'\n'}
              <Text style={styles.confirmEmail}>{email.trim()}</Text>
              {'\n\n'}Click the link to activate your account, then return here to sign in.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}
              onPress={() => { setConfirmPending(false); switchMode('login'); }}
            >
              <Text style={styles.secondaryButtonText}>[ BACK TO SIGN IN ]</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Login form ────────────────────────────────────────────────────────────────

  if (mode === 'login') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={[styles.flex, Platform.OS === 'web' && styles.webColumn]}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={[styles.scroll, Platform.OS === 'web' && styles.scrollWeb]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <DarkoLogo size={32} />
                <Text style={styles.logoSub}>psychological intelligence system</Text>
              </View>

              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>SYSTEM ACCESS</Text>

              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="operator@domain.com"
                  placeholderTextColor={TEXT_DIM}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={[styles.inputWrapper, passFocused && styles.inputWrapperFocused]}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor={TEXT_DIM}
                  secureTextEntry
                  autoComplete="password"
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  onSubmitEditing={handleLogin}
                />
              </View>

              <Pressable
                onPress={handleForgotPassword}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.forgotRow}
              >
                <Text style={styles.forgotLink}>forgot password?</Text>
              </Pressable>

              {resetSent && (
                <Text style={styles.resetSent}>[ RESET LINK SENT — CHECK YOUR EMAIL ]</Text>
              )}

              {error && <Text style={styles.errorText}>[ {error} ]</Text>}

              <Pressable
                style={({ pressed, hovered }: any) => [
                  styles.primaryButton,
                  loading && styles.buttonDisabled,
                  Platform.OS === 'web' && hovered && !loading && styles.primaryButtonHovered,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={BG} /> : <Text style={styles.primaryButtonText}>[ ACCESS SYSTEM ]</Text>}
              </Pressable>

              <View style={styles.divider} />

              <Text style={styles.switchLabel}>Don't have an account?</Text>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}
                onPress={() => switchMode('signup')}
              >
                <Text style={styles.secondaryButtonText}>[ CREATE ACCOUNT ]</Text>
              </Pressable>

              <Text style={styles.disclaimer}>
                End-to-end encrypted. Anonymous decodes deleted in 24h.{'\n'}
                Content is never sold or shared with third parties.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.flex, Platform.OS === 'web' && styles.webColumn]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scroll, Platform.OS === 'web' && styles.scrollWeb]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <DarkoLogo size={32} />
              <Text style={styles.logoSub}>psychological intelligence system</Text>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>INITIALIZE PROFILE</Text>

            {/* Full Name */}
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <View style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="your full name"
                placeholderTextColor={TEXT_DIM}
                autoCapitalize="words"
                autoComplete="name"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Age */}
            <Text style={styles.fieldLabel}>AGE</Text>
            <View style={[styles.inputWrapper, ageFocused && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                placeholder="must be 18 or older"
                placeholderTextColor={TEXT_DIM}
                keyboardType="number-pad"
                maxLength={3}
                onFocus={() => setAgeFocused(true)}
                onBlur={() => setAgeFocused(false)}
              />
            </View>

            {/* Email */}
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="operator@domain.com"
                placeholderTextColor={TEXT_DIM}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[styles.inputWrapper, passFocused && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor={TEXT_DIM}
                secureTextEntry
                autoComplete="new-password"
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                onSubmitEditing={handleSignup}
              />
            </View>
            {/* BUG-11: communicate the minimum length up-front so users aren't
                surprised by the post-submit error. */}
            <Text style={styles.fieldHint}>
              minimum {MIN_PASSWORD_LEN} characters
            </Text>

            <Pressable
              style={styles.consentRow}
              onPress={() => setConsent(!consent)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
                {consent && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                I agree to the{' '}
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push('/terms' as any)}
                >Terms</Text>
                {' '}and{' '}
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push('/privacy' as any)}
                >Privacy Policy</Text>
                , and consent to my threads being processed by Darko's decode engine.
              </Text>
            </Pressable>

            {error && <Text style={styles.errorText}>[ {error} ]</Text>}

            <Pressable
              style={({ pressed, hovered }: any) => [
                styles.primaryButton,
                loading && styles.buttonDisabled,
                Platform.OS === 'web' && hovered && !loading && styles.primaryButtonHovered,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={BG} /> : <Text style={styles.primaryButtonText}>[ INITIALIZE PROFILE ]</Text>}
            </Pressable>

            <View style={styles.divider} />

            <Text style={styles.switchLabel}>Already have an account?</Text>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}
              onPress={() => switchMode('login')}
            >
              <Text style={styles.secondaryButtonText}>[ SIGN IN ]</Text>
            </Pressable>

            <Text style={styles.disclaimer}>
                End-to-end encrypted. Anonymous decodes deleted in 24h.{'\n'}
                Content is never sold or shared with third parties.
              </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  webColumn: {
    maxWidth: 480,
    alignSelf: 'center' as const,
    width: '100%' as any,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1A1A1D',
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 60,
  },
  scrollWeb: {
    paddingTop: 0,
    paddingBottom: 0,
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingVertical: 48,
  },
  header: { marginBottom: 8 },
  logo: {
    fontFamily: MONO as any,
    fontSize: 28,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 6,
  },
  logoSub: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 28,
  },
  sectionLabel: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 4,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 3,
    marginBottom: 8,
  },
  fieldHint: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginTop: -12,
    marginBottom: 20,
  },
  inputWrapper: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 20,
  },
  inputWrapperFocused: {
    borderColor: ACCENT,
  },
  input: {
    fontFamily: MONO as any,
    fontSize: 14,
    color: TEXT_PRIMARY,
    padding: 14,
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: ERROR_RED,
    letterSpacing: 2,
    marginBottom: 16,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  primaryButtonHovered: {
    backgroundColor: '#D4FF00',
  },
  primaryButtonText: {
    fontFamily: MONO as any,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  secondaryButtonText: {
    fontFamily: MONO as any,
    fontSize: 13,
    color: ACCENT,
    letterSpacing: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  switchLabel: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  disclaimer: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: '#2A2A2A',
    letterSpacing: 2,
    textAlign: 'center' as const,
    marginTop: 24,
  },
  confirmTitle: {
    fontFamily: MONO as any,
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 3,
    marginBottom: 20,
  },
  confirmBody: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 1,
    lineHeight: 20,
    marginBottom: 28,
  },
  confirmEmail: {
    color: TEXT_PRIMARY,
  },
  // Forgot-password link on sign-in screen
  forgotRow: {
    alignSelf: 'flex-end' as const,
    marginTop: -10,
    marginBottom: 18,
  },
  forgotLink: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
  },
  resetSent: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 14,
    lineHeight: 16,
  },
  // Terms + privacy consent on signup
  consentRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    marginTop: 4,
    marginBottom: 18,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxChecked: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
  },
  checkboxMark: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: ACCENT,
    lineHeight: 13,
  },
  consentText: {
    flex: 1,
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  consentLink: {
    color: ACCENT,
    textDecorationLine: 'underline' as const,
  },
});
