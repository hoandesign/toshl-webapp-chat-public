import React, { useState } from 'react';
import { Message } from './types'; // Import Message type
// Added Clock, RefreshCw, Copy icons
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import MessageCircleQuestion from 'lucide-react/dist/esm/icons/message-circle-question';
import Info from 'lucide-react/dist/esm/icons/info';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Hash from 'lucide-react/dist/esm/icons/hash';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Clock from 'lucide-react/dist/esm/icons/clock';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Copy from 'lucide-react/dist/esm/icons/copy';
import { FileImage, Volume2, Play, Pause } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as STRINGS from '../../constants/strings';
import DebugModal from './DebugModal';
// Removed unused AccountBalanceCard import

interface MessageRendererProps {
    message: Message;
    isDeleting: string | null;
    isRetrying: string | null;
    handleDeleteEntry: (messageId: string, toshlEntryId: string) => Promise<void>;
    handleDeleteMessageLocally: (messageId: string, associatedIds?: string[]) => void; // Updated signature to match useChatLogic
    retrySendMessage: (offlineId: string) => Promise<void>;
    hideNumbers: boolean; // Add hideNumbers prop
    // Removed handleShowMoreAccountsClick prop
}

// Audio Display Component for playing recorded audio messages
const AudioDisplay: React.FC<{
    audioData: string;
    metadata?: Message['audioMetadata'];
    messageId: string;
}> = ({ audioData, metadata }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioError, setAudioError] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    // Set initial duration from metadata if available
    React.useEffect(() => {
        if (metadata?.duration && duration === 0) {
            setDuration(metadata.duration / 1000); // Convert from milliseconds to seconds
        }
    }, [metadata?.duration, duration]);

    // Create audio URL from base64 data
    const audioUrl = React.useMemo(() => {
        try {
            const mimeType = metadata?.mimeType || 'audio/webm';
            return `data:${mimeType};base64,${audioData}`;
        } catch (error) {
            console.error('Failed to create audio URL:', error);
            setAudioError(true);
            return null;
        }
    }, [audioData, metadata?.mimeType]);

    // Handle play/pause
    const togglePlayback = async () => {
        if (!audioRef.current || audioError) return;

        try {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                await audioRef.current.play();
            }
        } catch (error) {
            console.error('Audio playback error:', error);
            setAudioError(true);
        }
    };

    // Format time for display
    const formatTime = (seconds: number) => {
        // Handle invalid values
        if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
            return '0:00';
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (audioError || !audioUrl) {
        return (
            <div className="flex items-center space-x-2 p-2 bg-btn-red/10 border border-btn-red/30 rounded-lg">
                <Volume2 size={16} className="text-btn-red" />
                <span className="text-sm text-btn-red">Audio playback error</span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-3 p-3 bg-navigation-bg border border-btn-red/30 rounded-lg">
            <button
                onClick={togglePlayback}
                className="flex-shrink-0 w-8 h-8 bg-btn-red hover:bg-btn-red-highlight text-white rounded-full flex items-center justify-center transition duration-200"
                title={isPlaying ? "Pause audio" : "Play audio"}
            >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-end text-sm text-navigation-text">
                    <span>
                        {formatTime(currentTime)} / {formatTime(duration > 0 ? duration : (metadata?.duration ? metadata.duration / 1000 : 0))}
                    </span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-1 w-full bg-gray-text/30 rounded-full h-1">
                    <div 
                        className="bg-btn-red h-1 rounded-full transition-all duration-100"
                        style={{ 
                            width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
                        }}
                    />
                </div>
            </div>

            <audio
                ref={audioRef}
                src={audioUrl}
                onLoadedMetadata={() => {
                    if (audioRef.current && isFinite(audioRef.current.duration)) {
                        setDuration(audioRef.current.duration);
                    } else if (metadata?.duration) {
                        // Fallback to metadata duration if audio duration is not available
                        setDuration(metadata.duration / 1000);
                    }
                }}
                onTimeUpdate={() => {
                    if (audioRef.current && isFinite(audioRef.current.currentTime)) {
                        setCurrentTime(audioRef.current.currentTime);
                    }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onError={(e) => {
                    console.error('Audio element error:', e);
                    setAudioError(true);
                }}
                preload="metadata"
            />
        </div>
    );
};

// Enhanced Image Display Component with comprehensive error handling and fallback mechanisms
const ImageDisplay: React.FC<{
    src: string;
    alt: string;
    messageId: string;
    displayUrl?: string;
    metadata?: Message['imageMetadata'];
}> = ({ src, alt, messageId, displayUrl, metadata }) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [fallbackAttempted, setFallbackAttempted] = useState(false);

    const MAX_RETRY_ATTEMPTS = 2;

    // Simplified image URL resolution - prioritize direct src
    React.useEffect(() => {
        setImageLoading(true);
        setImageError(false);

        // Priority 1: Use original src if available and valid (most common case)
        if (src && src.startsWith('data:image/')) {
            setCachedImageUrl(src);
            setImageLoading(false);
            return;
        }

        // Priority 2: Use provided displayUrl if available and valid
        if (displayUrl && displayUrl.startsWith('data:image/')) {
            setCachedImageUrl(displayUrl);
            setImageLoading(false);
            return;
        }

        // If no valid image URL found, show error
        console.warn('No valid image URL found for message:', messageId, { src, displayUrl });
        setCachedImageUrl(null);
        setImageError(true);
        setImageLoading(false);
    }, [src, messageId, displayUrl, retryCount]);

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
        setRetryCount(0); // Reset retry count on successful load
    };

    const handleImageError = () => {
        setImageLoading(false);

        if (retryCount < MAX_RETRY_ATTEMPTS && !fallbackAttempted) {
            // Try to retry with a different approach
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setFallbackAttempted(true);
            }, 1000);
        } else {
            setImageError(true);
        }
    };

    const handleRetryClick = () => {
        if (retryCount < MAX_RETRY_ATTEMPTS) {
            setRetryCount(prev => prev + 1);
            setFallbackAttempted(false);
        }
    };

    // Enhanced loading state with better visual feedback
    if (imageLoading && !imageError) {
        return (
            <div
                className="flex items-center justify-center h-32 bg-gradient-to-br from-navigation-bg to-navigation-lighter rounded-lg border-2 border-dashed border-gray-text/30 animate-pulse"
                role="status"
                aria-label="Loading image"
            >
                <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                        <Loader2 size={24} className="animate-spin text-btn-red" />
                        <div className="absolute inset-0 animate-ping">
                            <Loader2 size={24} className="text-btn-red/50 opacity-75" />
                        </div>
                    </div>
                    <span className="text-sm font-medium text-navigation-text">Loading image...</span>
                    {metadata && (
                        <span className="text-xs text-gray-text">
                            {metadata.mimeType?.split('/')[1]?.toUpperCase() || 'IMG'} • {Math.round((metadata.fileSize || 0) / 1024)}KB
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // Enhanced error state with better visual feedback and accessibility
    if (imageError || !cachedImageUrl) {
        return (
            <div
                className="flex flex-col items-center justify-center h-32 bg-gradient-to-br from-btn-red/10 to-btn-red/5 rounded-lg border-2 border-dashed border-btn-red/30 p-4"
                role="alert"
                aria-label="Image failed to load"
            >
                <div className="flex flex-col items-center space-y-2">
                    <div className="p-2 bg-btn-red/20 rounded-full">
                        <FileImage size={24} className="text-btn-red" />
                    </div>
                    <span className="text-sm font-medium text-btn-red text-center">
                        {STRINGS.IMAGE_DISPLAY_ERROR}
                    </span>
                    {metadata && (
                        <span className="text-xs text-gray-text text-center">
                            {metadata.mimeType} • {Math.round((metadata.fileSize || 0) / 1024)}KB
                        </span>
                    )}
                    {retryCount < MAX_RETRY_ATTEMPTS && (
                        <button
                            onClick={handleRetryClick}
                            className="flex items-center gap-1 px-3 py-1.5 bg-btn-red/20 hover:bg-btn-red/30 text-btn-red text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-btn-red focus:ring-offset-1"
                            title="Retry loading image"
                            aria-label="Retry loading image"
                        >
                            <RefreshCw size={12} />
                            Retry ({MAX_RETRY_ATTEMPTS - retryCount} left)
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Enhanced successful image display with better visual feedback
    return (
        <div className="relative group">
            {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-navigation-bg/80 rounded-lg backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center space-y-2">
                        <Loader2 size={20} className="animate-spin text-btn-red" />
                        <span className="text-xs text-navigation-text font-medium">Loading...</span>
                    </div>
                </div>
            )}
            <img
                src={cachedImageUrl}
                alt={alt}
                className="max-w-full h-auto rounded-lg shadow-md border-2 border-gray-text/20 transition-all duration-300 hover:shadow-lg hover:border-btn-red/50 focus:outline-none focus:ring-2 focus:ring-btn-red focus:ring-offset-2"
                style={{
                    maxHeight: '300px',
                    objectFit: 'contain',
                    opacity: imageLoading ? 0.3 : 1
                }}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                tabIndex={0}
                role="img"
            />
            {/* Enhanced metadata overlay with better visibility */}
            {metadata && !imageLoading && (
                <div className="absolute bottom-2 right-2 bg-gradient-to-r from-navigation-bg/90 to-navigation-bg/70 text-navigation-text text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-btn-red/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center space-x-2">
                        <span className="font-medium">
                            {metadata.mimeType?.split('/')[1]?.toUpperCase() || 'IMG'}
                        </span>
                        <span className="text-gray-text">•</span>
                        <span>{Math.round((metadata.fileSize || 0) / 1024)}KB</span>
                        {metadata.originalWidth && metadata.originalHeight && (
                            <>
                                <span className="text-gray-text">•</span>
                                <span>{metadata.originalWidth}×{metadata.originalHeight}</span>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* Success indicator for loaded images */}
            {!imageLoading && !imageError && (
                <div className="absolute top-2 left-2 bg-btn-green text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <CheckCircle size={12} />
                </div>
            )}
        </div>
    );
};

const MessageRenderer: React.FC<MessageRendererProps> = ({ message: msg, isDeleting, isRetrying, handleDeleteEntry, handleDeleteMessageLocally, retrySendMessage, hideNumbers }) => { // Accept hideNumbers prop
    const [showActions, setShowActions] = useState(false); // State to control action visibility on hover
    const [copySuccess, setCopySuccess] = useState(false); // State for copy feedback
    const [showDebugModal, setShowDebugModal] = useState(false); // State for debug modal
    const secondaryTextColor = 'text-text-secondary'; // Define theme color variable

    // Helper function to determine if this message should have a tail
    const shouldHaveTail = (message: Message, messages?: Message[], currentIndex?: number): boolean => {
        // For now, always show tail - in a full implementation, you'd check if the next message is from the same sender
        return true;
    };

    // Helper function to determine bubble classes
    const getBubbleClasses = (message: Message, isConsecutive = false): string => {
        const baseClasses = 'message-bubble';
        const senderClass = message.sender === 'user' ? 'from-user' : 'from-bot';
        const consecutiveClass = isConsecutive ? 'consecutive' : '';
        const noTailClass = isConsecutive ? 'no-tail' : '';
        
        // Special type classes
        let typeClass = '';
        switch (message.type) {
            case 'error':
                typeClass = 'error';
                break;
            case 'entry_success':
            case 'entry_edit_success':
                typeClass = 'success';
                break;
            case 'system_info':
                typeClass = 'system';
                break;
        }

        // Check if message is emoji-only
        const isEmojiOnly = message.text && /^[\p{Emoji}\s]+$/u.test(message.text.trim()) && message.text.trim().length <= 10;
        const emojiClass = isEmojiOnly ? 'emoji-only' : '';

        return [baseClasses, senderClass, consecutiveClass, noTailClass, typeClass, emojiClass].filter(Boolean).join(' ');
    };

    // Function to handle copying text
    const handleCopy = async (textToCopy: string | undefined) => {
        if (!textToCopy) return;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 1500); // Reset after 1.5s
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Optionally show an error message to the user
        }
    };

    // Determine if the message type should have actions (copy/delete)
    // Exclude loading, history cards, and account balance cards from having default actions for now
    const canHaveActions = msg.type !== 'loading' && msg.type !== 'history_entry' && msg.type !== 'account_balance' && msg.type !== 'account_balance_see_more' && msg.type !== 'entry_success'; // Exclude entry_success card itself from hover actions
    const canCopy = !!msg.text && msg.type !== 'entry_success'; // Can copy if text exists and not the main entry card
    const canDeleteLocally = msg.type !== 'entry_success'; // Can delete locally if not a Toshl entry card

    let content: React.ReactNode = null;
    let actionButtons: React.ReactNode = null;

    // --- Action Buttons ---
    const hasDebugInfo = (msg.sender === 'bot' || msg.sender === 'system') && msg.debugInfo;
    const shouldShowActions = canHaveActions || hasDebugInfo;
    
    if (shouldShowActions) {
        actionButtons = (
            <div className={`absolute -top-8 ${msg.sender === 'user' ? 'right-0' : 'left-0'} flex items-center space-x-1 bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg transition-all duration-200 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                {msg.timestamp && canHaveActions && (
                    <span className="text-xs text-gray-300 whitespace-nowrap" title={new Date(msg.timestamp).toLocaleString()}>
                        {new Date(msg.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
                            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(msg.timestamp).toLocaleString()
                        }
                    </span>
                )}
                {canCopy && canHaveActions && (
                    <button
                        onClick={() => handleCopy(msg.text)}
                        className="text-gray-300 hover:text-white p-1 rounded transition-colors"
                        title={STRINGS.COPY_MESSAGE_BUTTON_TITLE}
                    >
                        {copySuccess ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                )}
                {/* Debug Info Button - Only for bot/system messages with debug info */}
                {hasDebugInfo && (
                    <button
                        onClick={() => setShowDebugModal(true)}
                        className="text-gray-300 hover:text-blue-400 p-1 rounded transition-colors"
                        title={STRINGS.DEBUG_INFO_BUTTON_TITLE}
                    >
                        <Info size={14} />
                    </button>
                )}

                {/* Local Delete Button */}
                {canDeleteLocally && canHaveActions && (
                    <button
                        onClick={() => handleDeleteMessageLocally(msg.id)}
                        className="text-gray-300 hover:text-red-400 p-1 rounded transition-colors"
                        title={STRINGS.DELETE_MESSAGE_BUTTON_TITLE}
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        );
    }

    switch (msg.type) {
        case 'entry_success': {
            const successData = msg.entryData;
            // Use Toshl theme colors for success
            const bgColor = 'bg-btn-green/10'; // Use Toshl green background tint
            // const borderColor = 'border-btn-green/30'; // Removed as unused
            const successTextColor = 'text-btn-green'; // Use Toshl green for text
            const successIconColor = 'text-btn-green'; // Use Toshl green for icon
            // const secondaryTextColor = 'text-text-secondary'; // Defined above
            // const detailIconColor = 'text-text-secondary'; // Removed as unused

            if (msg.isDeleted || !successData) {
                // Render deleted entry placeholder (no actions needed) - Themed
                content = (
                    <div className="max-w-md w-full">
                        <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words bg-gray-100 text-gray-text italic rounded-bl-none flex items-center space-x-2 mx-auto relative`}> {/* Use gray-text */}
                            <Trash2 size={16} />
                            <p className="text-sm">{msg.text || STRINGS.ENTRY_DELETED_FALLBACK}</p>
                        </div>
                    </div>
                );
            } else {
                // Use theme colors for amount
                // Use Toshl theme colors for amount (already done in previous step, but ensure consistency)
                const successAmountColor = successData.type === STRINGS.INCOME_TYPE ? 'text-btn-green font-semibold' : 'text-expense-text font-semibold';
                content = (
                    <div className="max-w-sm w-full"> {/* Reduced max-width */}
                        <div className={`border border-btn-green/30 ${bgColor} rounded-lg shadow-md p-4 w-full animate-fade-in`}> {/* Use lighter border */}
                            <div className={`flex items-center mb-2 pb-2 border-b border-btn-green/30`}> {/* Use lighter border */}
                                <CheckCircle size={18} className={`${successIconColor} mr-2`} /> {/* Use Toshl green icon */}
                                <span className={`font-semibold text-sm ${successTextColor}`}>{STRINGS.ENTRY_ADDED_SUCCESSFULLY}</span> {/* Use Toshl green text */}
                                {successData.id && <span className={`ml-auto text-xs text-gray-text`}>{STRINGS.ENTRY_ID_PREFIX}{successData.id}</span>} {/* Use gray-text */}
                            </div>
                            {/* Amount Section - Adjusted font size and separated currency */}
                            <div className="flex items-baseline justify-start my-2 py-1">
                                <span className={`font-bold text-3xl ${successAmountColor}`}>{successData.type === STRINGS.INCOME_TYPE ? '+' : '-'} {hideNumbers ? '***' : successData.amount.toLocaleString()}</span>
                                <span className={`text-xs text-gray-text ml-1.5`}>{hideNumbers ? '' : successData.currency}</span> {/* Hide currency too */}
                            </div>
                            {/* Metadata Section - Standardized with baseline alignment */}
                            <div className={`space-y-1.5 text-xs text-gray-text border-t border-btn-green/30 pt-2`}> {/* Use lighter border */}
                                <div className="flex items-baseline"><CalendarDays size={14} className="mr-2 text-gray-text relative top-[2px]" /> <span>{new Date(successData.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div> {/* Format date specifically here */}
                                {/* Removed Income/Expense type display */}
                                <div className="flex items-baseline"><Tag size={14} className="mr-2 text-gray-text relative top-[2px]" /> <span>{successData.category}</span></div> {/* Use items-baseline, nudge icon */}
                                {successData.account && <div className="flex items-baseline"><Landmark size={14} className="mr-2 text-gray-text relative top-[2px]" /> <span>{successData.account}</span></div>} {/* Use items-baseline, nudge icon */}
                                {successData.tags && successData.tags.length > 0 && (
                                    <div className="flex items-baseline"> {/* Use items-baseline */}
                                        <Hash size={14} className="mr-2 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
                                        <span className="flex flex-wrap gap-1">
                                            {successData.tags.map((tag, i) => <span key={i} className="bg-gray-100 text-gray-text px-1.5 py-0.5 rounded text-xs">{tag}</span>)}
                                        </span>
                                    </div>
                                )}
                                {/* Description - Standardized */}
                                {successData.description && <div className="flex items-baseline"><FileText size={14} className="mr-2 text-gray-text relative top-[2px]" /> <span className="italic text-gray-text text-xs">{successData.description}</span></div>} {/* Use items-baseline, nudge icon */}
                            </div>
                        </div>
                        {/* API Delete Button for Toshl Entry (Already updated in previous step) */}
                        {successData.id && successData.id !== 'unknown_id' && successData.id !== STRINGS.TOSHL_ENTRY_CREATED_NO_ID && (
                            <div className="flex justify-end mt-2"> {/* Align button to the right */}
                                <button
                                    onClick={() => handleDeleteEntry(msg.id, successData.id!)} // Use API delete
                                    disabled={isDeleting === msg.id} // Use isDeleting state for this button
                                    className={`flex items-center px-3 py-1.5 bg-btn-red/10 text-btn-red text-sm font-medium rounded-lg hover:bg-btn-red/20 transition duration-150 disabled:opacity-50 disabled:cursor-wait shadow-sm hover:shadow`} // Larger, themed red delete button
                                    title={STRINGS.DELETE_ENTRY_BUTTON_TITLE} // Use specific title
                                >
                                    {isDeleting === msg.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} className="" />} {/* Larger icon */}
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
            break;
        }
        case 'loading': {
            // Loading message - no actions - Themed
            content = (
                <div className={`${getBubbleClasses(msg)} flex items-center space-x-2 animate-pulse relative italic`}>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">{msg.text || STRINGS.PROCESSING}</span>
                </div>
            );
            break;
        }
        case 'error': {
            // Error message - allow copy/delete - Themed
            content = (
                <div className={`${getBubbleClasses(msg)} flex items-center space-x-2 relative`}>
                    <AlertTriangle size={16} className="text-red-600" />
                    <p className="text-sm">{msg.text}</p>
                </div>
            );
            break;
        }
        case 'history_header': {
            // History header - match system_info style with icon
            content = (
                <div className={`${getBubbleClasses(msg)} flex items-start space-x-2 relative`}>
                    <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{msg.text}</p>
                </div>
            );
            break;
        }
        case 'entry_edit_success': {
            // Edit success message - allow copy/delete - Themed (using purple still)
            content = (
                <div className={`${getBubbleClasses(msg)} bg-purple-100 border border-purple-300 flex items-center space-x-2 relative`}>
                    <Pencil size={16} className="text-purple-500" />
                    <p className="text-sm text-purple-900">{msg.text}</p>
                </div>
            );
            break;
        }
        case 'system_info': {
            const isClarification = msg.text?.startsWith(STRINGS.CLARIFICATION_MESSAGE_PREFIX);
            const icon = isClarification ? <MessageCircleQuestion size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" /> : <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />;

            // System info/clarification - allow copy/delete - Themed text
            content = (
                <div className={`${getBubbleClasses(msg)} flex items-start space-x-2 relative`}>
                    {icon}
                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm break-words">{msg.text || ''}</ReactMarkdown>
                </div>
            );
            break;
        }
        // Removed budget_list case - handled by grouping logic now
        // Cases 'account_balance' and 'account_balance_see_more' are handled by the grouping logic in ChatInterface.tsx now.
        // We only need the default case to render text messages or other unhandled types.
        // Removed 'show_more_prompt' case - handled in ChatInterface now
        case 'text': // User message - Add status indicators and retry button
        default: {
            if (msg.sender === 'user') {
                const userStyle = 'bg-navigation-bg text-navigation-text rounded-br-none'; // Use navigation theme for user messages
                let statusIndicator: React.ReactNode = null;
                let retryButton: React.ReactNode = null;

                if (msg.status === 'pending') {
                    // Wrap icon in span for title attribute
                    statusIndicator = <span title="Pending..."><Clock size={12} className="text-blue-200 ml-1.5 flex-shrink-0" /></span>; // Keep blue-ish for pending
                    // Optionally add retry button for pending messages too
                    if (msg.offlineId) {
                        retryButton = (
                            <button
                                onClick={() => retrySendMessage(msg.offlineId!)}
                                disabled={isRetrying === msg.offlineId}
                                className="text-xs text-navigation-icon hover:text-navigation-text underline ml-2 disabled:opacity-50 disabled:cursor-wait" // Use navigation theme colors
                                title="Retry sending"
                            >
                                {isRetrying === msg.offlineId ? <Loader2 size={12} className="animate-spin inline-block" /> : <RefreshCw size={12} className="inline-block" />} Retry
                            </button>
                        );
                    }
                } else if (msg.status === 'error' && msg.offlineId) {
                    // Wrap icon in span for title attribute
                    statusIndicator = <span title="Failed to send"><AlertTriangle size={12} className="text-red-300 ml-1.5 flex-shrink-0" /></span>; // Keep red-ish for error
                    retryButton = (
                        <button
                            onClick={() => retrySendMessage(msg.offlineId!)}
                            disabled={isRetrying === msg.offlineId}
                            className="text-xs text-red-400 hover:text-navigation-text underline ml-2 disabled:opacity-50 disabled:cursor-wait" // Use red-400 for error, hover to white
                            title="Retry sending"
                        >
                            {isRetrying === msg.offlineId ? <Loader2 size={12} className="animate-spin inline-block" /> : <RefreshCw size={12} className="inline-block" />} Retry
                        </button>
                    );
                }
                // else status is 'sent' or undefined (treat as sent), no indicator needed

                // User message - allow copy/delete + show status/retry + display images and audio
                const hasImage = !!msg.image;
                const hasAudio = !!msg.audio;
                const hasText = !!msg.text;
                const hasMedia = hasImage || hasAudio;
                const isMediaProcessing = hasMedia && msg.status === 'pending';

                content = (
                    <div className={`${getBubbleClasses(msg)} ${isMediaProcessing ? 'animate-pulse' : ''} relative`}>


                        {/* Display image if present with enhanced loading state */}
                        {msg.image && (
                            <div className={hasText || hasAudio ? "mb-3" : "mb-1"}>
                                <div className="relative">
                                    {/* Image loading overlay for better UX */}
                                    <ImageDisplay
                                        src={msg.image}
                                        alt={`Uploaded image${msg.imageMetadata?.mimeType ? ` (${msg.imageMetadata.mimeType})` : ''}`}
                                        messageId={msg.id}
                                        displayUrl={msg.imageDisplayUrl}
                                        metadata={msg.imageMetadata}
                                    />
                                    {/* Accessibility enhancement: Screen reader description */}
                                    <div className="sr-only">
                                        Image message containing {msg.imageMetadata?.mimeType || 'image file'}
                                        {msg.imageMetadata?.fileSize && `, file size ${Math.round(msg.imageMetadata.fileSize / 1024)}KB`}
                                        {msg.imageMetadata?.originalWidth && msg.imageMetadata?.originalHeight &&
                                            `, dimensions ${msg.imageMetadata.originalWidth} by ${msg.imageMetadata.originalHeight} pixels`
                                        }
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Display audio if present */}
                        {msg.audio && (
                            <div className={hasText ? "mb-3" : "mb-1"}>
                                <AudioDisplay
                                    audioData={msg.audio}
                                    metadata={msg.audioMetadata}
                                    messageId={msg.id}
                                />
                                {/* Accessibility enhancement: Screen reader description */}
                                <div className="sr-only">
                                    Voice message
                                    {msg.audioMetadata?.duration && `, duration ${Math.round(msg.audioMetadata.duration / 1000)} seconds`}
                                    {msg.audioMetadata?.mimeType && `, format ${msg.audioMetadata.mimeType}`}
                                </div>
                            </div>
                        )}

                        {/* Display text if present */}
                        {msg.text && <p className="text-sm">{msg.text}</p>}

                        {/* Enhanced status section with better visual hierarchy */}
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center">
                                {/* Processing indicator for media messages */}
                                {isMediaProcessing && (
                                    <div className="flex items-center text-blue-300 text-xs mr-2">
                                        <Loader2 size={12} className="animate-spin mr-1" />
                                        {hasImage && hasAudio ? 'Processing media...' : hasImage ? 'Processing image...' : 'Processing audio...'}
                                        <span>Processing image...</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center">
                                {statusIndicator}
                                {retryButton}
                            </div>
                        </div>
                    </div>
                );

            } else {
                // Default Bot/System messages - allow copy/delete - Themed
                content = (
                    <div className={`${getBubbleClasses(msg)} relative`}>
                        <p className="text-sm">{msg.text}</p>
                    </div>
                );
            }
            break;
        }
    } // End switch

    // Render the message container with alignment and hover effect for actions
    const alignment = msg.sender === 'user' ? 'justify-end' : 'justify-start';
    return (
        <>
            <div
                className={`flex ${alignment} message-container relative group`}
                onMouseEnter={() => shouldShowActions && setShowActions(true)}
                onMouseLeave={() => shouldShowActions && setShowActions(false)}
            >
                <div className="relative">
                    {content}
                    {actionButtons}
                </div>
            </div>
            
            {/* Debug Modal */}
            {msg.debugInfo && (
                <DebugModal
                    isOpen={showDebugModal}
                    onClose={() => setShowDebugModal(false)}
                    debugInfo={msg.debugInfo}
                />
            )}
        </>
    );
};

export default MessageRenderer;
