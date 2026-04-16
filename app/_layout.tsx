import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { UserProvider } from '../context/UserContext';

// ── Global web styles ─────────────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    *, *::before, *::after {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      box-sizing: border-box;
    }
    html, body, #root { background: #09090B; height: 100%; margin: 0; padding: 0; overflow: hidden; }
    [role="button"], button, a, select { cursor: pointer; }
    textarea, input { cursor: text; }
    * { outline: none; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #09090B; }
    ::-webkit-scrollbar-thumb { background: #27272A; border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: #3D3D40; }
  `;
  document.head.appendChild(s);
}

// Push notifications are native-only — expo-notifications crashes on web
if (Platform.OS !== 'web') {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  const router = useRouter();

  // Notification tap → navigate to target's decode screen (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const Notifications = require('expo-notifications');
    const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as any;
      if (data?.targetId && data?.targetName) {
        router.push(
          `/decode?targetId=${data.targetId}&targetName=${encodeURIComponent(data.targetName)}&darkoAlert=${data.alertType ?? ''}`,
        );
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090B' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="decode" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="payment-success" />
        <Stack.Screen name="payment-cancel" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="contact" />
      </Stack>
    </UserProvider>
  );
}
