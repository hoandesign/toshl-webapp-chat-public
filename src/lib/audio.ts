import * as STRINGS from '../constants/strings';

// Audio recording configuration
const AUDIO_CONFIG = {
  mimeType: 'audio/webm;codecs=opus', // Preferred format for Gemini
  fallbackMimeType: 'audio/mp4', // Fallback for Safari
  maxDurationMs: 60000, // 60 seconds max
  sampleRate: 16000, // 16kHz for optimal speech recognition
};

// Audio validation result interface
export interface AudioValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    duration: number;
    size: number;
    mimeType: string;
  };
}

// Audio recording state interface
export interface AudioRecordingState {
  isRecording: boolean;
  duration: number;
  error: string | null;
}

/**
 * Check if the browser supports audio recording
 */
export const isAudioRecordingSupported = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
};

/**
 * Get the best supported audio MIME type for recording
 */
export const getSupportedAudioMimeType = (): string => {
  if (MediaRecorder.isTypeSupported(AUDIO_CONFIG.mimeType)) {
    return AUDIO_CONFIG.mimeType;
  }
  if (MediaRecorder.isTypeSupported(AUDIO_CONFIG.fallbackMimeType)) {
    return AUDIO_CONFIG.fallbackMimeType;
  }
  // Fallback to basic webm
  return 'audio/webm';
};

/**
 * Validate audio blob before processing
 */
export const validateAudioBlob = (blob: Blob): AudioValidationResult => {
  // Check if blob exists and has content
  if (!blob || blob.size === 0) {
    return {
      isValid: false,
      error: STRINGS.AUDIO_EMPTY_RECORDING
    };
  }

  // Check file size (max 10MB for Gemini API)
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (blob.size > maxSizeBytes) {
    return {
      isValid: false,
      error: STRINGS.AUDIO_FILE_TOO_LARGE
    };
  }

  return {
    isValid: true,
    metadata: {
      duration: 0, // Will be calculated during recording
      size: blob.size,
      mimeType: blob.type
    }
  };
};

/**
 * Convert audio blob to base64 for API transmission
 */
export const audioToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 data without data URL prefix
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    
    reader.onerror = () => {
      reject(new Error(STRINGS.AUDIO_PROCESSING_FAILED));
    };
    
    reader.readAsDataURL(blob);
  });
};

/**
 * Audio recorder class for managing recording state and operations
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private maxDuration: number = AUDIO_CONFIG.maxDurationMs;
  private onStateChange?: (state: AudioRecordingState) => void;
  private onComplete?: (audioBlob: Blob, duration: number) => void;
  private onError?: (error: string) => void;

  constructor(
    onStateChange?: (state: AudioRecordingState) => void,
    onComplete?: (audioBlob: Blob, duration: number) => void,
    onError?: (error: string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  /**
   * Start audio recording
   */
  async startRecording(): Promise<void> {
    try {
      // Check browser support
      if (!isAudioRecordingSupported()) {
        throw new Error(STRINGS.AUDIO_NOT_SUPPORTED);
      }

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.sampleRate,
          channelCount: 1, // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Get supported MIME type
      const mimeType = getSupportedAudioMimeType();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128kbps for good quality
      });

      // Reset audio chunks
      this.audioChunks = [];
      this.startTime = Date.now();

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const duration = Date.now() - this.startTime;
        
        // Validate the recorded audio
        const validation = validateAudioBlob(audioBlob);
        if (!validation.isValid) {
          this.handleError(validation.error || STRINGS.AUDIO_PROCESSING_FAILED);
          return;
        }

        this.onComplete?.(audioBlob, duration);
        this.cleanup();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.handleError(STRINGS.AUDIO_RECORDING_FAILED);
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second

      // Set up auto-stop timer
      setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.stopRecording();
        }
      }, this.maxDuration);

      // Update state
      this.updateState({
        isRecording: true,
        duration: 0,
        error: null
      });

      // Start duration timer
      this.startDurationTimer();

    } catch (error) {
      console.error('Failed to start recording:', error);
      let errorMessage = STRINGS.AUDIO_PERMISSION_DENIED;
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = STRINGS.AUDIO_PERMISSION_DENIED;
        } else if (error.name === 'NotFoundError') {
          errorMessage = STRINGS.AUDIO_NO_MICROPHONE;
        } else {
          errorMessage = error.message;
        }
      }
      
      this.handleError(errorMessage);
    }
  }

  /**
   * Stop audio recording
   */
  stopRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    this.updateState({
      isRecording: false,
      duration: Date.now() - this.startTime,
      error: null
    });
  }

  /**
   * Cancel recording and cleanup
   */
  cancelRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    
    this.updateState({
      isRecording: false,
      duration: 0,
      error: null
    });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    if (!this.isRecording()) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Handle errors
   */
  private handleError(error: string): void {
    this.cleanup();
    this.updateState({
      isRecording: false,
      duration: 0,
      error
    });
    this.onError?.(error);
  }

  /**
   * Update recording state
   */
  private updateState(state: AudioRecordingState): void {
    this.onStateChange?.(state);
  }

  /**
   * Start duration timer for UI updates
   */
  private startDurationTimer(): void {
    const updateInterval = setInterval(() => {
      if (!this.isRecording()) {
        clearInterval(updateInterval);
        return;
      }
      
      this.updateState({
        isRecording: true,
        duration: this.getCurrentDuration(),
        error: null
      });
    }, 100); // Update every 100ms for smooth UI
  }
}

/**
 * Format duration in milliseconds to MM:SS format
 */
export const formatDuration = (durationMs: number): string => {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};