import { useState, useRef, useCallback } from 'react';

interface UseAudioRecordingOptions {
  onDataAvailable?: (audioData: string) => void;
  onError?: (error: string) => void;
  mimeType?: string;
  audioBitsPerSecond?: number;
  timeslice?: number;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const {
    onDataAvailable,
    onError,
    mimeType = 'audio/webm;codecs=opus',
    audioBitsPerSecond = 128000,
    timeslice = 3000, // Send data every 3 seconds for better transcription
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1, // Mono audio for better transcription
        },
      });

      streamRef.current = stream;

      // Check if the browser supports the specified MIME type
      let finalMimeType = mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to basic webm if opus is not supported
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          finalMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          finalMimeType = 'audio/mp4';
        } else {
          throw new Error('No supported audio format found');
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: finalMimeType,
        audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // Convert blob to base64 for transmission
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove the data URL prefix to get just the base64 data
            const base64Data = base64.split(',')[1];
            onDataAvailable?.(base64Data);
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        const errorMessage = `MediaRecorder error: ${(event as any).error?.message || 'Unknown error'}`;
        setError(errorMessage);
        onError?.(errorMessage);
        stopRecording();
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
      };

      // Start recording with specified timeslice
      mediaRecorder.start(timeslice);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      onError?.(errorMessage);
      
      // Clean up if something went wrong
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [mimeType, audioBitsPerSecond, timeslice, onDataAvailable, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Clean up the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
