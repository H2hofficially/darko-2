import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const S1 = '#18181B';
const BORDER = '#27272A';
const DIM = '#52525b';
const TEXT = '#fafafa';
const MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: "'JetBrains Mono', monospace",
});

const NAV_LINKS = [
  { label: 'DECODE', route: '/decode' },
  { label: 'TARGETS', route: '/targets' },
  { label: 'CAMPAIGNS', route: '/campaigns' },
  { label: 'PRICING', route: '/pricing' },
];

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { tier } = useUser();
  const [userHovered, setUserHovered] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const isActive = (route: string) => {
    if (route === '/decode') return pathname.startsWith('/decode');
    return pathname === route;
  };

  return (
    <View style={s.nav}>
      {/* Logo */}
      <Pressable style={s.logo} onPress={() => router.push('/targets' as any)}>
        <View style={s.logoSq} />
        <Text style={s.logoText}>DARKO</Text>
      </Pressable>

      {/* Links */}
      <View style={s.links}>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.route}
            label={link.label}
            active={isActive(link.route)}
            onPress={() => {
              if (link.route === '/decode') {
                // Decode needs a targetId — go to targets first if no context
                router.push('/targets' as any);
              } else {
                router.push(link.route as any);
              }
            }}
          />
        ))}
      </View>

      {/* Right */}
      <View style={s.right}>
        <View style={s.statusChip}>
          <View style={s.dot} />
          <Text style={s.statusText}>ENGINE ACTIVE</Text>
        </View>

        <Pressable
          style={[s.userChip, userHovered && s.userChipHovered]}
          onPress={handleSignOut}
          onHoverIn={() => setUserHovered(true)}
          onHoverOut={() => setUserHovered(false)}
        >
          <Text style={s.userTier}>{tier.toUpperCase()}</Text>
          <Text style={s.userAction}>SIGN OUT</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NavLink({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={s.navLinkWrap}
    >
      <Text style={[s.navLink, (active || hovered) && s.navLinkActive]}>
        {label}
      </Text>
      {/* underline accent */}
      {Platform.OS === 'web' && (
        <View
          style={[
            s.navLinkUnderline,
            (active || hovered) && s.navLinkUnderlineActive,
          ]}
        />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  nav: {
    height: 48,
    backgroundColor: 'rgba(10,10,10,0.95)' as any,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    flexShrink: 0,
    zIndex: 500,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 32,
  },
  logoSq: {
    width: 10,
    height: 10,
    backgroundColor: ACCENT,
  },
  logoText: {
    fontFamily: MONO as any,
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 3,
  },
  links: {
    flexDirection: 'row',
    gap: 24,
    flex: 1,
  },
  navLinkWrap: {
    paddingBottom: 2,
    position: 'relative',
  },
  navLink: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: DIM,
    letterSpacing: 2,
  },
  navLinkActive: {
    color: TEXT,
  },
  navLinkUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 1,
    backgroundColor: ACCENT,
  },
  navLinkUnderlineActive: {
    width: '100%' as any,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  statusText: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: DIM,
    letterSpacing: 2,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  userChipHovered: {
    borderColor: ACCENT,
  },
  userTier: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 2,
  },
  userAction: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: DIM,
    letterSpacing: 2,
  },
});
