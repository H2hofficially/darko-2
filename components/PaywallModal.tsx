import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { supabase } from '../lib/supabase';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const ERROR_RED = '#FF4444';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const PRO_PRICE_ID = 'price_1TFJfkEmZWsJibucl22phWB3';

type Props = {
  visible: boolean;
  onClose: () => void;
  reason?: string;
};

export function PaywallModal({ visible, onClose, reason }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('NOT AUTHENTICATED'); setLoading(false); return; }

      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PRO_PRICE_ID, userId: session.user.id },
      });

      if (fnErr || !data?.url) {
        setError((fnErr?.message ?? data?.error ?? 'CHECKOUT FAILED').toUpperCase());
      } else {
        Linking.openURL(data.url);
        onClose();
      }
    } catch (err: any) {
      setError((err.message ?? 'SOMETHING WENT WRONG').toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.tag}>// ACCESS RESTRICTED</Text>

          {reason ? <Text style={styles.reason}>{reason}</Text> : null}

          <View style={styles.divider} />

          <Text style={styles.tierName}>DARKO PRO</Text>
          <Text style={styles.price}>$0 for 4 days</Text>
          <Text style={styles.priceSub}>then $15/month</Text>

          <View style={styles.benefits}>
            <BenefitRow text="3 active targets" />
            <BenefitRow text="30 messages per day" />
            <BenefitRow text="// DOSSIER — full psychological profile" />
            <BenefitRow text="// BRIEF — campaign planning system" />
            <BenefitRow text="Voice input + transcription" />
            <BenefitRow text="Screenshot analysis" />
          </View>

          {error ? <Text style={styles.error}>[ {error} ]</Text> : null}

          <TouchableOpacity
            style={[styles.upgradeBtn, loading && { opacity: 0.5 }]}
            onPress={handleUpgrade}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={BG} />
              : <Text style={styles.upgradeBtnText}>[ START FREE TRIAL ]</Text>
            }
          </TouchableOpacity>

          <Text style={styles.trialNote}>4 days free, then $15/month. Cancel anytime.</Text>

          <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitArrow}>▸</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  box: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 24,
    maxWidth: 440,
    alignSelf: 'center' as const,
    width: '100%' as any,
  },
  tag: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 3,
    marginBottom: 10,
  },
  reason: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 18,
  },
  tierName: {
    fontFamily: MONO as any,
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 4,
  },
  price: {
    fontFamily: MONO as any,
    fontSize: 13,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 2,
  },
  priceSub: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginBottom: 20,
  },
  trialNote: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  benefits: {
    marginBottom: 20,
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  benefitArrow: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ACCENT,
    marginTop: 1,
  },
  benefitText: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    flex: 1,
    lineHeight: 17,
  },
  error: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ERROR_RED,
    letterSpacing: 2,
    marginBottom: 12,
  },
  upgradeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  upgradeBtnText: {
    fontFamily: MONO as any,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
  dismissBtn: {
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  dismissText: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
});
