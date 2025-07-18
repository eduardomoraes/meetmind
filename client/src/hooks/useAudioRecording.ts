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
    mimeType = 'audio/webm',
    audioBitsPerSecond = 128000,
    timeslice, // No longer sending chunks during recording
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

      // Check for the best supported audio format for OpenAI transcription
      // Prioritize formats that work reliably with OpenAI Whisper API
      let finalMimeType = mimeType;
      
      // Try formats in order of OpenAI compatibility
      const preferredFormats = [
        'audio/mp4',
        'audio/mpeg',
        'audio/wav', 
        'audio/ogg;codecs=opus',
        'audio/webm;codecs=opus',
        'audio/webm'
      ];
      
      for (const format of preferredFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          finalMimeType = format;
          console.log(`Using ${format} for recording - optimized for OpenAI compatibility`);
          break;
        }
      }
      
      if (finalMimeType === mimeType && !MediaRecorder.isTypeSupported(finalMimeType)) {
        throw new Error('No supported audio format found for OpenAI transcription');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: finalMimeType,
        audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // Accumulate audio chunks for complete processing
          audioChunksRef.current.push(event.data);
          console.log(`Audio chunk recorded: ${event.data.size} bytes, total chunks: ${audioChunksRef.current.length}`);
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
        
        // Process complete audio when recording stops
        if (audioChunksRef.current.length > 0) {
          const completeAudioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
          console.log(`Complete recording: ${completeAudioBlob.size} bytes from ${audioChunksRef.current.length} chunks`);
          
          // Convert complete audio to base64 for transmission
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            onDataAvailable?.(base64Data);
            
            // Clear chunks for next recording
            audioChunksRef.current = [];
          };
          reader.readAsDataURL(completeAudioBlob);
        }
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
