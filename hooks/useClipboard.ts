import { Platform } from 'react-native';

// Web: navigator.clipboard.writeText()
// Native: expo-clipboard
export function useClipboard() {
  const copyToClipboard = async (text: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers / insecure contexts
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      return;
    }

    // Native path
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
  };

  return { copyToClipboard };
}
