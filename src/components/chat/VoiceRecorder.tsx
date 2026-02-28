import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { AudioRecorder, AudioRecordingState, formatDuration, isAudioRecordingSupported } from '../../lib/audio';
import * as STRINGS from '../../constants/strings';

interface VoiceRecorderProps {
  onAudioRecorded: (audioBlob: Blob, duration: number) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onError,
  disabled = false,
  className = '',
  onRecordingStateChange
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

  // Notify parent about recording state changes
  useEffect(() => {
    onRecordingStateChange?.(recordingState.isRecording);
  }, [recordingState.isRecording, onRecordingStateChange]);

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
  }, [onError, onAudioRecorded]);

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

  // Recording state - full width bar
  if (isRecording) {
    return (
      <div className={`voice-recorder-bar flex items-center justify-between bg-navigation-bg border border-btn-red rounded-xl px-4 py-3 h-[44px] ${className}`}>
        {/* Recording indicator and timer */}
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-btn-red rounded-full animate-pulse" />
          <span className="text-sm text-navigation-text font-medium">
            {STRINGS.AUDIO_RECORDING_STATUS}
          </span>
          <span className="text-sm text-btn-red font-mono font-bold">
            {formatDuration(duration)}
          </span>
        </div>
        
        {/* Stop button */}
        <button
          type="button"
          onClick={stopRecording}
          className="text-btn-red hover:text-btn-red-highlight p-2 rounded-full transition duration-200"
          title={STRINGS.AUDIO_STOP_RECORDING_TITLE}
        >
          <Square size={20} fill="currentColor" />
        </button>
      </div>
    );
  }

  // Default mic button
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="text-gray-text hover:text-black-text p-2 rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      title={STRINGS.AUDIO_RECORD_BUTTON_TITLE}
    >
      <Mic size={20} />
    </button>
  );
};

export default VoiceRecorder;
