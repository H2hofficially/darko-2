import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import type { Target } from '../services/storage';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const MONO = "'JetBrains Mono', monospace";

interface TargetSidebarProps {
  targets: (Target & { decodeCount: number })[];
  onSelectTarget: (target: Target & { decodeCount: number }) => void;
  onNewTarget: () => void;
  tier: string;
}

export function TargetSidebar({ targets, onSelectTarget, onNewTarget, tier }: TargetSidebarProps) {
  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      {/* Brand */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
        }}
      >
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 16,
            fontWeight: '700',
            color: TEXT_PRIMARY,
            letterSpacing: 4,
          }}
        >
          // DARKO
        </Text>
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: TEXT_DIM,
            letterSpacing: 2,
            marginTop: 4,
          }}
        >
          target profiles
        </Text>
      </View>

      {/* New target button */}
      <TouchableOpacity
        style={{
          margin: 16,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: ACCENT,
          borderRadius: 3,
          alignItems: 'center',
        }}
        onPress={onNewTarget}
      >
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: '700',
            color: ACCENT,
            letterSpacing: 3,
          }}
        >
          + NEW TARGET
        </Text>
      </TouchableOpacity>

      {/* Target list */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {targets.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: TEXT_DIM,
                letterSpacing: 2,
                textAlign: 'center',
              }}
            >
              NO TARGETS
            </Text>
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: '#3D3D40',
                letterSpacing: 1,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              acquire one to begin
            </Text>
          </View>
        ) : (
          targets.map((target) => (
            <Pressable
              key={target.id}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: BORDER,
                backgroundColor: pressed ? '#18181B' : 'transparent',
              })}
              onPress={() => onSelectTarget(target)}
            >
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: '700',
                  color: TEXT_PRIMARY,
                  letterSpacing: 2,
                }}
              >
                {target.name.toUpperCase()}
              </Text>
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: TEXT_DIM,
                  letterSpacing: 1,
                  marginTop: 3,
                }}
              >
                {target.decodeCount === 0
                  ? 'no decodes yet'
                  : `${target.decodeCount} decode${target.decodeCount !== 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Tier badge */}
      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: BORDER,
        }}
      >
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: tier === 'free' ? TEXT_DIM : ACCENT,
            letterSpacing: 2,
          }}
        >
          {tier === 'free' ? '// FREE TIER' : `// ${tier.toUpperCase()} TIER`}
        </Text>
      </View>
    </View>
  );
}
