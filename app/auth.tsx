import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const ACCENT = '#CCFF00';
const BG = '#000000';
const CARD_BG = '#1A1A1A';
const BORDER = '#2A2A2A';
const TEXT_DIM = '#666666';
const ERROR_RED = '#FF4444';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  // If already logged in, skip straight to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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

  const handleSignup = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (err) {
      setError(err.message.toUpperCase());
    } else if (!data.session) {
      // Email confirmation required — Supabase returns no session until confirmed
      setConfirmPending(true);
    } else {
      await AsyncStorage.setItem('darko_onboarded', 'true');
      router.replace('/');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.flex, Platform.OS === 'web' && styles.webColumn]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>[ DARKO ]</Text>
            <Text style={styles.logoSub}>psychological intelligence system</Text>
          </View>

          {/* Email confirmation pending */}
          {confirmPending ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.confirmTitle}>CHECK YOUR EMAIL</Text>
              <Text style={styles.confirmBody}>
                A confirmation link has been sent to{'\n'}
                <Text style={styles.confirmEmail}>{email.trim()}</Text>
                {'\n\n'}Click the link to activate your account, then return here to sign in.
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setConfirmPending(false)}
              >
                <Text style={styles.secondaryButtonText}>[ BACK TO SIGN IN ]</Text>
              </TouchableOpacity>
            </>
          ) : (
          <>
          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>SYSTEM ACCESS</Text>

          {/* Email */}
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="operator@domain.com"
              placeholderTextColor={TEXT_DIM}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor={TEXT_DIM}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {/* Error */}
          {error && (
            <Text style={styles.errorText}>[ {error} ]</Text>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={BG} />
            ) : (
              <Text style={styles.primaryButtonText}>[ ACCESS SYSTEM ]</Text>
            )}
          </TouchableOpacity>

          {/* Signup button */}
          <TouchableOpacity
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>[ INITIALIZE PROFILE ]</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.disclaimer}>
            unauthorized access is logged and analyzed.
          </Text>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  webColumn: { maxWidth: 480, alignSelf: 'center' as const, width: '100%' as any, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1A1A1D' },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 60,
  },
  header: { marginBottom: 8 },
  logo: {
    fontFamily: MONO,
    fontSize: 28,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 6,
  },
  logoSub: {
    fontFamily: MONO,
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
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 4,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 3,
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 20,
  },
  input: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 14,
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: MONO,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: MONO,
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
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: MONO,
    fontSize: 13,
    color: ACCENT,
    letterSpacing: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  disclaimer: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#2A2A2A',
    letterSpacing: 2,
    textAlign: 'center',
  },
  confirmTitle: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 3,
    marginBottom: 20,
  },
  confirmBody: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 1,
    lineHeight: 20,
    marginBottom: 28,
  },
  confirmEmail: {
    color: '#FFFFFF',
  },
});
