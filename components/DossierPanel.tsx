import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

const ACCENT = '#CCFF00';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const CARD_BG = '#18181B';
const MONO = "'JetBrains Mono', monospace";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 8,
          color: TEXT_DIM,
          letterSpacing: 2,
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 11,
          color: TEXT_PRIMARY,
          letterSpacing: 1,
        }}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

interface DossierPanelProps {
  targetName: string;
  archetype?: string;
  attachmentStyle?: string;
  phase?: number;
  lastContact?: string;
  suggestedFollowups?: string[];
  onSelectFollowup?: (text: string) => void;
  onClose?: () => void;
}

export function DossierPanel({
  targetName,
  archetype,
  attachmentStyle,
  phase,
  lastContact,
  suggestedFollowups = [],
  onSelectFollowup,
  onClose,
}: DossierPanelProps) {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
        }}
      >
        <Text style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 3 }}>
          // DOSSIER
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontFamily: MONO, fontSize: 12, color: TEXT_DIM }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ padding: 20 }}>
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 16,
            fontWeight: '700',
            color: TEXT_PRIMARY,
            letterSpacing: 2,
            marginBottom: 20,
          }}
        >
          {targetName.toUpperCase()}
        </Text>

        <StatRow label="ARCHETYPE" value={archetype ?? ''} />
        <StatRow label="ATTACHMENT STYLE" value={attachmentStyle ?? ''} />
        <StatRow label="MISSION PHASE" value={phase != null ? `Phase ${phase}` : ''} />
        <StatRow label="LAST CONTACT" value={lastContact ?? ''} />

        {suggestedFollowups.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: TEXT_DIM,
                letterSpacing: 3,
                marginBottom: 12,
              }}
            >
              // NEXT MOVES
            </Text>
            {suggestedFollowups.map((followup, i) => (
              <TouchableOpacity
                key={i}
                style={{
                  backgroundColor: CARD_BG,
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 3,
                  padding: 12,
                  marginBottom: 8,
                }}
                onPress={() => onSelectFollowup?.(followup)}
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    color: TEXT_PRIMARY,
                    letterSpacing: 1,
                    lineHeight: 16,
                  }}
                >
                  {followup}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
