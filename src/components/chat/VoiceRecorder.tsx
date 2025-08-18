import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Square, X, Play, Pause } from 'lucide-react';
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
  
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; duration: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
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
        setRecordedAudio({ blob: audioBlob, duration });
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
  }, [onError, setRecordingState, setRecordedAudio]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError(STRINGS.AUDIO_NOT_SUPPORTED);
      return;
    }

    try {
      setRecordedAudio(null); // Clear any previous recording
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
    setRecordedAudio(null);
  }, []);

  // Send recorded audio
  const sendAudio = useCallback(() => {
    if (recordedAudio) {
      onAudioRecorded(recordedAudio.blob, recordedAudio.duration);
      setRecordedAudio(null);
    }
  }, [recordedAudio, onAudioRecorded]);

  // Discard recorded audio
  const discardAudio = useCallback(() => {
    setRecordedAudio(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Play/pause recorded audio
  const togglePlayback = useCallback(() => {
    if (!recordedAudio || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, recordedAudio]);

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

  // Recorded audio preview - appears above chat bar
  if (recordedAudio) {
    return (
      <div className={`voice-recorder-preview mb-3 ${className}`}>
        <div className="bg-navigation-bg border border-btn-red rounded-lg px-4 py-3 flex items-center justify-between">
          {/* Audio preview with play button */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="text-btn-red hover:text-btn-red-highlight p-1 rounded transition duration-200"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="text-sm text-navigation-text">
              Audio recorded ({Math.round(recordedAudio.duration / 1000)}s)
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={discardAudio}
              className="text-btn-red hover:text-btn-red-highlight p-1 rounded transition duration-200"
              title="Discard audio"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* Hidden audio element for playback */}
        {recordedAudio && (
          <audio
            ref={audioRef}
            src={URL.createObjectURL(recordedAudio.blob)}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>
    );
  }

  // Default mic button
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="text-gray-text hover:text-black-text p-2 rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed self-end mb-1"
      title={STRINGS.AUDIO_RECORD_BUTTON_TITLE}
    >
      <Mic size={20} />
    </button>
  );
};

export default VoiceRecorder;
