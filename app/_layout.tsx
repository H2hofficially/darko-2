import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';

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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090B' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="decode" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
