import { useState, useCallback } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';

/**
 * Wraps expo-audio recording with start / stop / pause / resume. Requests mic
 * permission lazily and returns the recorded file URI on stop.
 */
export function useAudioRecorder() {
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('Microphone permission denied.');

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  }, [recorder]);

  /** Stops recording and returns the audio file URI (or null if nothing recorded). */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    setIsRecording(false);
    try {
      await recorder.stop();
    } catch {
      // already stopped
    }
    await setAudioModeAsync({ allowsRecording: false });
    return recorder.uri ?? null;
  }, [recorder]);

  const pauseRecording = useCallback(() => {
    try {
      recorder.pause();
    } catch {
      // no-op if not recording
    }
  }, [recorder]);

  const resumeRecording = useCallback(() => {
    try {
      recorder.record();
    } catch {
      // no-op
    }
  }, [recorder]);

  return { isRecording, startRecording, stopRecording, pauseRecording, resumeRecording };
}
