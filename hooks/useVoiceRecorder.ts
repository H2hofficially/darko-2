import { useState, useRef } from 'react';
import { Platform } from 'react-native';

export interface RecorderState {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ base64: string; mimeType: string } | null>;
}

// Web: MediaRecorder API
// Native: expo-audio
export function useVoiceRecorder(): RecorderState {
  const [isRecording, setIsRecording] = useState(false);

  // Web refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Native ref
  const nativeRecorderRef = useRef<any>(null);

  const startRecording = async (): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mediaRecorderRef.current = mr;
        mr.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
      return;
    }

    // Native path
    try {
      const { Audio } = await import('expo-audio');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      nativeRecorderRef.current = recording;
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = async (): Promise<{ base64: string; mimeType: string } | null> => {
    setIsRecording(false);

    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const mr = mediaRecorderRef.current;
        if (!mr) { resolve(null); return; }
        mr.onstop = async () => {
          // Stop all tracks to release mic
          mr.stream.getTracks().forEach((t) => t.stop());
          const mimeType = mr.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, mimeType });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };
        mr.stop();
      });
    }

    // Native path
    try {
      const recording = nativeRecorderRef.current;
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return null;
      const { FileSystem } = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { base64, mimeType: 'audio/m4a' };
    } catch {
      return null;
    } finally {
      nativeRecorderRef.current = null;
    }
  };

  return { isRecording, startRecording, stopRecording };
}
