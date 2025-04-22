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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as STRINGS from '../../constants/strings';
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

const MessageRenderer: React.FC<MessageRendererProps> = ({ message: msg, isDeleting, isRetrying, handleDeleteEntry, handleDeleteMessageLocally, retrySendMessage, hideNumbers }) => { // Accept hideNumbers prop
    const [showActions, setShowActions] = useState(false); // State to control action visibility on hover
    const [copySuccess, setCopySuccess] = useState(false); // State for copy feedback
    const secondaryTextColor = 'text-text-secondary'; // Define theme color variable

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
    if (canHaveActions) {
        actionButtons = (
            <div className={`absolute -top-2.5 ${msg.sender === 'user' ? 'left-1' : 'right-1'} flex space-x-1 bg-gray-700/80 backdrop-blur-sm p-1 rounded-md shadow-lg transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}> {/* Themed action buttons */}
                {msg.timestamp && (
                    <span className="text-xs text-white p-1" title={new Date(msg.timestamp).toLocaleString()}>
                        {new Date(msg.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
                            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(msg.timestamp).toLocaleString()
                        }
                    </span>
                )}
                {canCopy && (
                    <button
                        onClick={() => handleCopy(msg.text)}
                        className="text-gray-200 hover:text-primary p-1"
                        title={STRINGS.COPY_MESSAGE_BUTTON_TITLE}
                    >
                        {copySuccess ? <CheckCircle size={14} className="text-accent-positive" /> : <Copy size={14} />}
                    </button>
                )}
                {/* Local Delete Button */}
                {canDeleteLocally && (
                     <button
                         onClick={() => handleDeleteMessageLocally(msg.id)}
                         className="text-gray-200 hover:text-accent-negative p-1"
                         title={STRINGS.DELETE_MESSAGE_BUTTON_TITLE}
                     >
                         <Trash2 size={14} /> {/* Consistent icon size */}
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
            content = ( <div className={`px-4 py-2.5 rounded-xl shadow-md bg-gray-100 ${secondaryTextColor} italic text-sm rounded-bl-none flex items-center space-x-2 animate-pulse relative`}> <Loader2 size={16} className="animate-spin" /> <span>{msg.text || STRINGS.PROCESSING}</span> </div> );
            break;
        }
        case 'error': {
            // Error message - allow copy/delete - Themed
            content = ( <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words bg-accent-negative/10 text-text-primary border border-accent-negative/30 rounded-bl-none flex items-center space-x-2 relative`}> <AlertTriangle size={16} className="text-accent-negative"/> <p className="text-sm">{msg.text}</p> {actionButtons} </div> );
            break;
        }
        case 'history_header': {
            // History header - allow copy/delete - Themed (using indigo still)
            content = (
                <div className="max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words bg-indigo-100 text-text-primary border border-indigo-200 rounded-bl-none relative">
                    <p className="text-sm font-medium text-indigo-700 mb-1">{STRINGS.HISTORY_SUMMARY_TITLE}</p>
                    <p className="text-sm">{msg.text}</p>
                    {actionButtons}
                </div>
            );
            break;
        }
        case 'entry_edit_success': {
            // Edit success message - allow copy/delete - Themed (using purple still)
            content = (
                <div className="max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words bg-purple-100 text-text-primary border border-purple-300 rounded-bl-none flex items-center space-x-2 relative">
                    <Pencil size={16} className="text-purple-500"/>
                    <p className="text-sm">{msg.text}</p>
                    {actionButtons}
                </div>
            );
            break;
        }
        case 'system_info': {
            const isClarification = msg.text?.startsWith(STRINGS.CLARIFICATION_MESSAGE_PREFIX);
            // Keep existing colors for differentiation, but use primary text
            const bgColor = isClarification ? 'bg-yellow-100 border-yellow-300' : 'bg-blue-100 border-blue-300';
            const textColor = 'text-text-primary';
            const icon = isClarification ? <MessageCircleQuestion size={16} className="text-yellow-600 mt-0.5 flex-shrink-0"/> : <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0"/>;

            // System info/clarification - allow copy/delete - Themed text
            content = (
               <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words border rounded-bl-none flex items-start space-x-2 relative ${bgColor} ${textColor}`}>
                   {icon}
                   <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm break-words">{msg.text || ''}</ReactMarkdown>
                   {actionButtons}
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
                                 {isRetrying === msg.offlineId ? <Loader2 size={12} className="animate-spin inline-block"/> : <RefreshCw size={12} className="inline-block"/>} Retry
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
                                 {isRetrying === msg.offlineId ? <Loader2 size={12} className="animate-spin inline-block"/> : <RefreshCw size={12} className="inline-block"/>} Retry
                        </button>
                    );
                }
                // else status is 'sent' or undefined (treat as sent), no indicator needed

                // User message - allow copy/delete + show status/retry
                content = (
                    <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words relative ${userStyle}`}>
                        <p className="text-sm">{msg.text}</p>
                        <div className="flex items-center justify-end mt-1"> {/* Removed min-h */}
                            {statusIndicator}
                            {retryButton}
                        </div>
                        {actionButtons}
                    </div>
                );

            } else {
                // Default Bot/System messages - allow copy/delete - Themed
                const otherStyle = 'bg-card-bg text-black-text rounded-bl-none border border-separator-gray'; // Use separator-gray
                content = ( <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-xl shadow-md break-words relative ${otherStyle}`} > <p className="text-sm">{msg.text}</p> {actionButtons} </div> );
            }
            break;
        }
    } // End switch

    // Render the message container with alignment and hover effect for actions
    const alignment = msg.sender === 'user' ? 'justify-end' : 'justify-start';
    return (
        <div
            className={`flex ${alignment} mb-6 relative group`} // Increased bottom margin to mb-6
            onMouseEnter={() => canHaveActions && setShowActions(true)}
            onMouseLeave={() => canHaveActions && setShowActions(false)}
        >
            {content}
            {/* Action buttons are rendered inside the content div now */}
        </div>
    );
};

export default MessageRenderer;
