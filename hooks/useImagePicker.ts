import { Platform } from 'react-native';

export interface PickedImage {
  base64: string;
  mimeType: string;
}

// Web: <input type="file"> + FileReader
// Native: expo-image-picker
export function useImagePicker() {
  const pickImage = (): Promise<PickedImage | null> => {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            // dataUrl is "data:image/jpeg;base64,XXXX..."
            const [header, base64] = dataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
            resolve({ base64, mimeType });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        // Cancelled with no file selected
        input.addEventListener('cancel', () => resolve(null));
        input.click();
      });
    }

    // Native path
    return import('expo-image-picker').then(async (ImagePicker) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return null;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      if (!asset.base64) return null;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      return { base64: asset.base64, mimeType };
    }).catch(() => null);
  };

  return { pickImage };
}
