import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import DarkoLogo from '../../components/DarkoLogo';

const ACCENT = '#CCFF00';
const BG = '#000000';
const TEXT_DIM = '#666666';
const ERROR_RED = '#FF4444';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [status, setStatus] = useState('VERIFYING...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const { code, error: errParam, error_description } = params;

      if (errParam) {
        setError(`[ ${(error_description ?? errParam).toUpperCase()} ]`);
        return;
      }

      if (!code) {
        // No code — check if session already exists (hash-based flow)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/');
        } else {
          setError('[ NO AUTH CODE RECEIVED ]');
        }
        return;
      }

      setStatus('EXCHANGING TOKEN...');
      const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeErr) {
        setError(`[ ${exchangeErr.message.toUpperCase()} ]`);
        return;
      }

      // Sync signup metadata → profiles table
      const meta = exchangeData.session?.user?.user_metadata;
      if (meta && exchangeData.session?.user?.id) {
        const update: Record<string, any> = {};
        if (meta.full_name) update.full_name = meta.full_name;
        if (meta.age)       update.age       = meta.age;
        if (meta.phone)     update.phone     = meta.phone;
        if (Object.keys(update).length > 0) {
          await supabase.from('profiles').update(update).eq('id', exchangeData.session.user.id);
        }
      }

      setStatus('ACCESS GRANTED');
      router.replace('/');
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.root}>
      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.sub}>close this screen and try again</Text>
        </>
      ) : (
        <>
          <View style={{ marginBottom: 20 }}><DarkoLogo size={26} /></View>
          <Text style={styles.status}>{status}</Text>
        </>
      )}
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
  label: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 4,
    marginBottom: 20,
  },
  status: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 3,
  },
  errorText: {
    fontFamily: MONO,
    fontSize: 12,
    color: ERROR_RED,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  sub: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
});
