import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Modal, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import DarkoLogo from './DarkoLogo';

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
  const { width } = useWindowDimensions();
  const [userHovered, setUserHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Breakpoints
  const isMobile = Platform.OS === 'web' && width < 640;
  const isTablet = Platform.OS === 'web' && width >= 640 && width < 1024;

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace('/');
  };

  const isActive = (route: string) => {
    if (route === '/decode') return pathname.startsWith('/decode');
    return pathname === route;
  };

  const navigateTo = (route: string) => {
    setMenuOpen(false);
    router.push(route as any);
  };

  return (
    <>
      <View style={s.nav}>
        {/* Logo */}
        <Pressable style={s.logo} onPress={() => router.push('/targets' as any)}>
          <DarkoLogo size={15} />
        </Pressable>

        {/* Links — hidden on mobile */}
        {!isMobile && (
          <View style={s.links}>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.route}
                label={link.label}
                active={isActive(link.route)}
                onPress={() => navigateTo(link.route)}
              />
            ))}
          </View>
        )}

        {/* Spacer on mobile */}
        {isMobile && <View style={{ flex: 1 }} />}

        {/* Right */}
        <View style={s.right}>
          {/* Status chip — hide on small mobile */}
          {!isMobile && (
            <View style={s.statusChip}>
              <View style={s.dot} />
              <Text style={s.statusText}>ENGINE ACTIVE</Text>
            </View>
          )}

          {/* User chip — compact on mobile */}
          {!isMobile ? (
            <Pressable
              style={[s.userChip, userHovered && s.userChipHovered]}
              onPress={handleSignOut}
              onHoverIn={() => setUserHovered(true)}
              onHoverOut={() => setUserHovered(false)}
            >
              <Text style={s.userTier}>{tier.toUpperCase()}</Text>
              <Text style={s.userAction}>SIGN OUT</Text>
            </Pressable>
          ) : null}

          {/* Hamburger — mobile only */}
          {isMobile && (
            <Pressable style={s.hamburger} onPress={() => setMenuOpen(true)}>
              <View style={s.hLine} />
              <View style={s.hLine} />
              <View style={s.hLine} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Mobile menu sheet */}
      {isMobile && menuOpen && (
        <Modal transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={s.overlay} onPress={() => setMenuOpen(false)}>
            <View style={s.sheet}>
              {/* Header */}
              <View style={s.sheetHeader}>
                <View style={s.sheetLogoRow}>
                  <DarkoLogo size={16} />
                </View>
                <View style={s.statusChip}>
                  <View style={s.dot} />
                  <Text style={s.statusText}>{tier.toUpperCase()}</Text>
                </View>
              </View>

              {/* Links */}
              {NAV_LINKS.map((link) => (
                <Pressable
                  key={link.route}
                  style={[s.sheetLink, isActive(link.route) && s.sheetLinkActive]}
                  onPress={() => navigateTo(link.route)}
                >
                  <Text style={[s.sheetLinkText, isActive(link.route) && s.sheetLinkTextActive]}>
                    {link.label}
                  </Text>
                  {isActive(link.route) && <View style={s.sheetActiveDot} />}
                </Pressable>
              ))}

              {/* Sign out */}
              <Pressable style={s.sheetSignOut} onPress={handleSignOut}>
                <Text style={s.sheetSignOutText}>SIGN OUT</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
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
    backgroundColor: 'rgba(10,10,10,0.97)' as any,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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

  // Hamburger
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  hLine: {
    width: 20,
    height: 1,
    backgroundColor: DIM,
  },

  // Mobile sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
  },
  sheet: {
    backgroundColor: S1,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 4,
  },
  sheetLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39,39,42,0.5)' as any,
  },
  sheetLinkActive: {
    backgroundColor: 'rgba(204,255,0,0.04)' as any,
  },
  sheetLinkText: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: DIM,
    letterSpacing: 2,
  },
  sheetLinkTextActive: {
    color: TEXT,
  },
  sheetActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  sheetSignOut: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  sheetSignOutText: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: DIM,
    letterSpacing: 2,
  },
});
