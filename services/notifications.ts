import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    if (!projectId) {
      console.warn('[DARKO] No EAS projectId — push token skipped. Add to app.json extra.eas.projectId.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('push_tokens').upsert({
      user_id: session.user.id,
      token,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DARKO] Push token registration error:', err);
  }
}
