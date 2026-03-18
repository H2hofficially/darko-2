import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG = '#09090B';
const ACCENT = '#CCFF00';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const BORDER = '#27272A';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

const SLIDES = [
  {
    large: 'Communication is an asymmetric game.',
    small: 'Someone is always controlling the frame. Most people never realize it.',
  },
  {
    large: 'Upload data. Isolate variables. Secure leverage.',
    small: 'DARKO intercepts subtext, identifies manipulation vectors, and compiles tactical intelligence.',
  },
  {
    large: 'Emotions are a vulnerability. Data is leverage.',
    small: 'Your private intelligence account. Every target. Every pattern. Every move.',
  },
];

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scanAnim = useRef(new Animated.Value(-10)).current;

  const runScanLine = () => {
    scanAnim.setValue(-10);
    Animated.timing(scanAnim, {
      toValue: SCREEN_HEIGHT + 10,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    runScanLine();
  }, [currentIndex]);

  const handleInitialize = async () => {
    await AsyncStorage.setItem('darko_onboarded', 'true');
    router.replace('/auth');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const renderItem = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={styles.slide}>
      <Text style={styles.largeText}>{item.large}</Text>
      <Text style={styles.smallText}>{item.small}</Text>
      {index === 2 && (
        <TouchableOpacity style={styles.initButton} onPress={handleInitialize} activeOpacity={0.85}>
          <Text style={styles.initButtonText}>[ INITIALIZE SYSTEM ]</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Scan line sweeps down on each screen */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]}
      />

      <FlatList
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        style={styles.flatList}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: ACCENT,
    opacity: 0.15,
    zIndex: 10,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 120,
  },
  largeText: {
    fontFamily: SANS,
    fontSize: 28,
    fontWeight: '300',
    color: TEXT_PRIMARY,
    lineHeight: 36,
  },
  smallText: {
    fontFamily: SANS,
    fontSize: 14,
    color: TEXT_DIM,
    lineHeight: 22,
    marginTop: 16,
  },
  initButton: {
    marginTop: 48,
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
  },
  initButtonText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BORDER,
  },
  dotActive: {
    width: 20,
    backgroundColor: ACCENT,
  },
});
