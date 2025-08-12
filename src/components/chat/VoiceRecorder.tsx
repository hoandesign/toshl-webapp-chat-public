import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { AudioRecorder, AudioRecordingState, formatDuration, isAudioRecordingSupported } from '../../lib/audio';
import * as STRINGS from '../../constants/strings';

interface VoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob, duration: number) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onError,
  disabled = false,
  className = ''
}) => {
  const [recordingState, setRecordingState] = useState<AudioRecordingState>({
    isRecording: false,
    duration: 0,
    error: null
  });
  
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isAudioRecordingSupported());
  }, []);

  // Initialize recorder
  const initializeRecorder = useCallback(() => {
    if (recorderRef.current) {
      return recorderRef.current;
    }

    const recorder = new AudioRecorder(
      // onStateChange
      (state: AudioRecordingState) => {
        setRecordingState(state);
        if (state.error) {
          onError(state.error);
        }
      },
      // onComplete
      (audioBlob: Blob, duration: number) => {
        onAudioRecorded(audioBlob, duration);
        setRecordingState({
          isRecording: false,
          duration: 0,
          error: null
        });
      },
      // onError
      (error: string) => {
        onError(error);
        setRecordingState({
          isRecording: false,
          duration: 0,
          error
        });
      }
    );

    recorderRef.current = recorder;
    return recorder;
  }, [onAudioRecorded, onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError(STRINGS.AUDIO_NOT_SUPPORTED);
      return;
    }

    try {
      const recorder = initializeRecorder();
      await recorder.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError(error instanceof Error ? error.message : STRINGS.AUDIO_RECORDING_FAILED);
    }
  }, [isSupported, initializeRecorder, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording();
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancelRecording();
    }
    setRecordingState({
      isRecording: false,
      duration: 0,
      error: null
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancelRecording();
      }
    };
  }, []);

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const { isRecording, duration } = recordingState;

  return (
    <div className={`voice-recorder ${className}`}>
      {!isRecording ? (
        // Record button
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="text-secondary hover:text-primary p-2 rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed self-end mb-1"
          title={STRINGS.AUDIO_RECORD_BUTTON_TITLE}
        >
          <Mic size={20} />
        </button>
      ) : (
        // Recording controls
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {/* Recording indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-700 font-medium">
              {STRINGS.AUDIO_RECORDING_STATUS}
            </span>
            <span className="text-sm text-red-600 font-mono">
              {formatDuration(duration)}
            </span>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={stopRecording}
              className="text-red-600 hover:text-red-700 p-1 rounded transition duration-200"
              title={STRINGS.AUDIO_STOP_RECORDING_TITLE}
            >
              <Square size={16} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="text-red-600 hover:text-red-700 p-1 rounded transition duration-200"
              title={STRINGS.AUDIO_CANCEL_RECORDING_TITLE}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;