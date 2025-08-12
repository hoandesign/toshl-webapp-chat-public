import React, { useRef, useEffect, useCallback, useState } from 'react';
import Settings from 'lucide-react/dist/esm/icons/settings';
import History from 'lucide-react/dist/esm/icons/history';
import SendHorizonal from 'lucide-react/dist/esm/icons/send-horizonal';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { ImagePlus, X, Bug } from 'lucide-react';
import VoiceRecorder from './chat/VoiceRecorder';
import * as STRINGS from '../constants/strings';
import { Message, ChatInterfaceProps } from './chat/types'; // Removed unused EntryCardData, AccountBalanceCardData
import { useChatLogic } from './chat/useChatLogic';
import HistoryCard from './chat/HistoryCard';
import SeeMoreEntriesCard from './chat/SeeMoreEntriesCard'; // Import new card
import SeeMoreAccountsCard from './chat/SeeMoreAccountsCard'; // Import new card
import MessageRenderer from './chat/MessageRenderer';
import BottomSheet from './chat/BottomSheet';
import MentionSuggestionsPopup from './chat/MentionSuggestionsPopup';
import AccountBalanceCard from './chat/AccountBalanceCard';
import BudgetCard from './chat/BudgetCard'; // Import BudgetCard
import GlobalDebugModal from './chat/GlobalDebugModal';

// --- Simple Debounce Utility ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>): void => {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}
// --- End Debounce Utility ---

const ChatInterface: React.FC<ChatInterfaceProps> = ({ toggleSettings, hideNumbers }): React.ReactElement => { // Accept hideNumbers prop
  const [isGlobalDebugOpen, setIsGlobalDebugOpen] = useState(false);
  const {
    messages,
    inputValue,
    isLoading,
    isRetrying,
    isDeleting,
    isLoadingHistory,
    isBottomSheetOpen,
    setIsBottomSheetOpen,
    bottomSheetData,
    // setBottomSheetData, // Removed unused variable
    handleFetchDateRange,
    handleFormSubmit,
    handleDeleteEntry,
    handleShowMoreClick, // For entries
    handleShowMoreAccountsClick, // For accounts
    retrySendMessage,
    handleDeleteMessageLocally,
    isMentionPopupOpen,
    mentionSuggestions,
    handleInputChange,
    handleMentionSelect,
    selectedImage,
    handleImageUpload,
    removeSelectedImage,
    selectedAudio,
    selectedAudioMetadata,
    handleAudioRecorded,
    removeSelectedAudio,
  } = useChatLogic();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const debouncedResizeTextarea = useCallback(() => {
      const resizeFunction = debounce(() => {
          if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              const maxHeight = 200;
              const scrollHeight = textareaRef.current.scrollHeight;
              textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
              textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
          }
      }, 150);
      return resizeFunction();
  }, []);

  useEffect(() => {
      debouncedResizeTextarea();
  }, [inputValue, debouncedResizeTextarea]);

  const scrollToBottom = useCallback(() => {
      if (!isBottomSheetOpen) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [isBottomSheetOpen]);

  useEffect(() => {
      scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- Helper function to process and render messages ---
  const renderProcessedMessages = () => {
    // Define types for processed items, including the new combined group
    type HistoryGroup = { type: 'history_group'; entries: Message[]; id: string };
    type AccountBalanceGroup = { type: 'account_balance_group'; accounts: Message[]; id: string };
    type BudgetGroup = { type: 'budget_group'; budgets: Message[]; id: string }; // New group type
    type MessageWithHistoryGroup = { type: 'message_with_history_group'; message: Message; group: HistoryGroup; id: string };
    type MessageWithBudgetGroup = { type: 'message_with_budget_group'; message: Message; group: BudgetGroup; id: string }; // New combined type
    // Add MessageWithAccountGroup if needed in the future
    type ProcessedItem = Message | HistoryGroup | AccountBalanceGroup | BudgetGroup | MessageWithHistoryGroup | MessageWithBudgetGroup; // Added BudgetGroup and MessageWithBudgetGroup

    const processedItems: ProcessedItem[] = [];
    let currentHistoryGroup: Message[] = [];
    let currentAccountGroup: Message[] = [];
    let currentBudgetGroup: Message[] = []; // New group array

    // --- First Pass: Group consecutive entries/accounts ---
    messages.forEach((msg, index) => {
      if (msg.type === 'history_entry' || msg.type === 'history_see_more') {
        if (currentAccountGroup.length > 0) {
          processedItems.push({ type: 'account_balance_group', accounts: currentAccountGroup, id: `acc-group-${index}` });
          currentAccountGroup = [];
        }
        currentHistoryGroup.push(msg);
      } else if (msg.type === 'account_balance' || msg.type === 'account_balance_see_more') {
        if (currentHistoryGroup.length > 0) {
          processedItems.push({ type: 'history_group', entries: currentHistoryGroup, id: `hist-group-${index}` });
          currentHistoryGroup = [];
        }
        if (currentBudgetGroup.length > 0) { // Push pending budget group
            processedItems.push({ type: 'budget_group', budgets: currentBudgetGroup, id: `budget-group-${index}` });
            currentBudgetGroup = [];
        }
        currentAccountGroup.push(msg);
      } else if (msg.type === 'budget_card') { // Handle budget cards
        if (currentHistoryGroup.length > 0) {
          processedItems.push({ type: 'history_group', entries: currentHistoryGroup, id: `hist-group-${index}` });
          currentHistoryGroup = [];
        }
        if (currentAccountGroup.length > 0) {
          processedItems.push({ type: 'account_balance_group', accounts: currentAccountGroup, id: `acc-group-${index}` });
          currentAccountGroup = [];
        }
        currentBudgetGroup.push(msg);
      } else {
        // Push pending groups before the individual message
        if (currentHistoryGroup.length > 0) {
          processedItems.push({ type: 'history_group', entries: currentHistoryGroup, id: `hist-group-${index}` });
          currentHistoryGroup = [];
        }
        if (currentAccountGroup.length > 0) {
          processedItems.push({ type: 'account_balance_group', accounts: currentAccountGroup, id: `acc-group-${index}` });
          currentAccountGroup = [];
        }
        if (currentBudgetGroup.length > 0) { // Push pending budget group
            processedItems.push({ type: 'budget_group', budgets: currentBudgetGroup, id: `budget-group-${index}` });
            currentBudgetGroup = [];
        }
        processedItems.push(msg); // Push the individual message
      }
    });
    // Push any remaining groups at the end
    if (currentHistoryGroup.length > 0) {
      processedItems.push({ type: 'history_group', entries: currentHistoryGroup, id: 'hist-group-end' });
    }
    if (currentAccountGroup.length > 0) {
      processedItems.push({ type: 'account_balance_group', accounts: currentAccountGroup, id: 'acc-group-end' });
    }
    if (currentBudgetGroup.length > 0) { // Push final budget group
        processedItems.push({ type: 'budget_group', budgets: currentBudgetGroup, id: 'budget-group-end' });
    }

    // --- Second Pass: Combine message bubbles with their immediately following group ---
    const finalRenderItems: ProcessedItem[] = [];
    for (let i = 0; i < processedItems.length; i++) {
      const currentItem = processedItems[i];
      const nextItem = processedItems[i + 1];

      // Check if current item is a message that can precede a group
      if ('sender' in currentItem) {
          if (currentItem.type === 'history_header' && nextItem?.type === 'history_group') {
              finalRenderItems.push({ type: 'message_with_history_group', message: currentItem, group: nextItem, id: `combo-hist-${currentItem.id}` });
              i++; // Skip the group
          } else if (currentItem.type === 'budget_header' && nextItem?.type === 'budget_group') { // Check for budget header and group
              finalRenderItems.push({ type: 'message_with_budget_group', message: currentItem, group: nextItem, id: `combo-budget-${currentItem.id}` });
              i++; // Skip the group
          }
          // Add similar logic for 'message_with_account_group' if needed here
          else {
              finalRenderItems.push(currentItem); // Push message as is
          }
      } else {
          // Otherwise, push the group item as is (if it wasn't combined)
          finalRenderItems.push(currentItem);
      }
    }


    // --- Render the final items ---
    return finalRenderItems.map((item) => {
      // --- Render Combined Message + History Group ---
      if (item.type === 'message_with_history_group') {
        return (
          // This outer div wraps the message and the card carousel
          <div key={item.id} className="message-group flex flex-col space-y-0"> {/* Reduced space */}
            {/* Render the message part using MessageRenderer */}
            <MessageRenderer
              message={item.message}
              isDeleting={isDeleting}
              isRetrying={isRetrying}
              handleDeleteEntry={handleDeleteEntry}
              // Pass a modified delete handler that knows about the group
              handleDeleteMessageLocally={() => handleDeleteMessageLocally(item.message.id, item.group.entries.map(e => e.id))}
              retrySendMessage={retrySendMessage}
              hideNumbers={hideNumbers} // Pass hideNumbers down
            />
            {/* Render the history group part (horizontal scroll) */}
            {/* Note: Removed mb-4 from the inner div to avoid double margin */}
            <div className="history-group-content"> {/* No margin here */}
              <div className="grid grid-flow-col auto-cols-max items-stretch gap-x-3 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 scrollbar-track-border-color/30 -mx-4 px-4">
                {item.group.entries.map((histMsg) => {
                  if (histMsg.type === 'history_entry' && histMsg.entryData) {
                    return <HistoryCard key={histMsg.id} entryData={histMsg.entryData} hideNumbers={hideNumbers} />; // Pass hideNumbers
                  } else if (histMsg.type === 'history_see_more' && histMsg.text && histMsg.fullEntryData) {
                    return (
                      <SeeMoreEntriesCard
                        key={histMsg.id}
                        text={histMsg.text}
                        onClick={() => handleShowMoreClick(histMsg.fullEntryData!)}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        );
      }
      // --- Render Combined Message + Budget Group ---
      else if (item.type === 'message_with_budget_group') {
        return (
          <div key={item.id} className="message-group flex flex-col space-y-0">
            {/* Render the message part */}
            <MessageRenderer
              message={item.message}
              isDeleting={isDeleting}
              isRetrying={isRetrying}
              handleDeleteEntry={handleDeleteEntry}
              handleDeleteMessageLocally={() => handleDeleteMessageLocally(item.message.id, item.group.budgets.map(b => b.id))}
              retrySendMessage={retrySendMessage}
              hideNumbers={hideNumbers} // Pass hideNumbers down
            />
            {/* Render the budget group part (carousel) */}
            <div className="budget-group-content">
              <div className="grid grid-flow-col auto-cols-max items-stretch gap-x-3 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 scrollbar-track-border-color/30 -mx-4 px-4">
                {item.group.budgets.map((budgetMsg) => {
                  if (budgetMsg.type === 'budget_card' && budgetMsg.budgetData) {
                    return <BudgetCard key={budgetMsg.id} budget={budgetMsg.budgetData} hideNumbers={hideNumbers} />; // Pass hideNumbers
                  }
                  // No "See More" for budgets currently
                  return null;
                })}
              </div>
            </div>
          </div>
        );
      }
      // --- Render Standalone History Group ---
      else if (item.type === 'history_group') {
        return (
          <div key={item.id} className="mb-4">
            <div className="grid grid-flow-col auto-cols-max items-stretch gap-x-3 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 scrollbar-track-border-color/30 -mx-4 px-4">
              {item.entries.map((histMsg) => {
                if (histMsg.type === 'history_entry' && histMsg.entryData) {
                  return <HistoryCard key={histMsg.id} entryData={histMsg.entryData} hideNumbers={hideNumbers} />; // Pass hideNumbers
                } else if (histMsg.type === 'history_see_more' && histMsg.text && histMsg.fullEntryData) {
                  return (
                    <SeeMoreEntriesCard
                      key={histMsg.id}
                      text={histMsg.text}
                      onClick={() => handleShowMoreClick(histMsg.fullEntryData!)}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      }
      // --- Render Standalone Account Balance Group ---
      else if (item.type === 'account_balance_group') {
        return (
          <div key={item.id} className="mb-4">
            <div className="grid grid-flow-col auto-cols-max items-start gap-x-3 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 scrollbar-track-border-color/30 -mx-4 px-4">
              {item.accounts.map((accMsg) => {
                if (accMsg.type === 'account_balance' && accMsg.accountBalanceData) {
                  return <AccountBalanceCard key={accMsg.id} data={accMsg.accountBalanceData} hideNumbers={hideNumbers} />; // Pass hideNumbers
                } else if (accMsg.type === 'account_balance_see_more' && accMsg.text && accMsg.fullAccountBalanceData) {
                  return (
                    <SeeMoreAccountsCard
                      key={accMsg.id}
                      text={accMsg.text}
                      onClick={() => handleShowMoreAccountsClick(accMsg.fullAccountBalanceData!)}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      }
      // --- Render Standalone Budget Group ---
      else if (item.type === 'budget_group') {
        return (
          <div key={item.id} className="mb-4">
            <div className="grid grid-flow-col auto-cols-max items-stretch gap-x-3 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 scrollbar-track-border-color/30 -mx-4 px-4">
              {item.budgets.map((budgetMsg) => {
                if (budgetMsg.type === 'budget_card' && budgetMsg.budgetData) {
                  // Add fixed width and flex-shrink-0 here for standalone group items
                  return (
                    <div key={budgetMsg.id} className="flex-shrink-0 w-72"> {/* Adjust width (w-72) as needed */}
                      <BudgetCard budget={budgetMsg.budgetData} hideNumbers={hideNumbers} /> {/* Pass hideNumbers */}
                    </div>
                  );
                }
                // No "See More" for budgets currently
                return null;
              })}
            </div>
          </div>
        );
      }
      // --- Render Individual Messages ---
      else if ('sender' in item) { // Check if it's a Message object
        return (
          <MessageRenderer
            key={item.id}
            message={item}
            isDeleting={isDeleting}
            isRetrying={isRetrying}
            handleDeleteEntry={handleDeleteEntry}
            // Pass the original delete handler for standalone messages
            handleDeleteMessageLocally={() => handleDeleteMessageLocally(item.id)}
            retrySendMessage={retrySendMessage}
            hideNumbers={hideNumbers} // Pass hideNumbers down
          />
        );
      }
      // Fallback
      return null;
    }); // End map
  };
  // --- End helper function ---

  return (
    <div className="flex flex-col h-screen"> {/* Removed gradient background */}
      {/* Header - Navigation Theme */}
      <header className="sticky top-0 bg-navigation-bg text-navigation-text p-4 shadow-md z-10 flex items-center justify-between"> {/* Use navigation theme */}
          <div className="flex items-center space-x-3 flex-1">
          <img
            src="/logo.webp"
            alt={STRINGS.TOSHL_LOGO_ALT}
            className="h-8 w-8"
            width="32"
            height="32"
            loading="eager"
          />
          <h1 className="text-xl font-bold tracking-wide">{STRINGS.CHAT_TITLE}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
              onClick={() => setIsGlobalDebugOpen(true)}
              className="text-navigation-icon hover:text-navigation-text p-2 rounded-full transition duration-200"
              title="View debug information for all messages"
          >
              <Bug size={20} />
          </button>
          <button
              onClick={toggleSettings}
              className="text-navigation-icon hover:text-navigation-text p-2 rounded-full transition duration-200" /* Use navigation theme */
              title={STRINGS.SETTINGS_BUTTON_TITLE}
          >
              <Settings size={20} /> {/* Slightly smaller icon */}
          </button>
        </div>
      </header>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/50 hover:scrollbar-thumb-primary/70 scrollbar-track-border-color/50"> {/* Increased spacing */}
        {renderProcessedMessages()} {/* Call the helper function */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className="relative p-3 md:p-4 bg-card-bg border-t border-separator-gray shadow-inner z-5"> {/* Use separator-gray */}
        {isMentionPopupOpen && mentionSuggestions.length > 0 && (
          <MentionSuggestionsPopup
            suggestions={mentionSuggestions}
            onSelect={handleMentionSelect}
          />
        )}
        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img 
              src={selectedImage} 
              alt="Selected image" 
              className="max-w-xs max-h-32 rounded-lg border border-separator-gray"
            />
            <button
              type="button"
              onClick={removeSelectedImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition duration-200"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        {/* Audio Preview */}
        {selectedAudio && selectedAudioMetadata && (
          <div className="mb-3 relative inline-block">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-blue-700">
                Audio recorded ({Math.round(selectedAudioMetadata.duration / 1000)}s)
              </span>
              <button
                type="button"
                onClick={removeSelectedAudio}
                className="text-blue-600 hover:text-blue-700 p-1 rounded transition duration-200"
                title="Remove audio"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="flex items-end space-x-2 md:space-x-3">
          <button
            type="button"
            onClick={() => handleFetchDateRange(undefined, undefined, 7)}
            disabled={isLoadingHistory || isLoading || !!isDeleting}
            className="text-secondary hover:text-primary p-2 rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-wait self-end mb-1" /* Updated colors */
            title={STRINGS.FETCH_HISTORY_BUTTON_TITLE}
          >
            {isLoadingHistory ? <Loader2 size={20} className="animate-spin" /> : <History size={20} />} {/* Slightly smaller icon */}
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading || isLoadingHistory || !!isDeleting}
            className="text-secondary hover:text-primary p-2 rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-wait self-end mb-1"
            title="Upload photo"
          >
            <ImagePlus size={20} />
          </button>
          <VoiceRecorder
            onAudioRecorded={handleAudioRecorded}
            onError={(error) => {
              // For now, just log the error - in a real implementation, you'd want to
              // pass a callback to handle errors or use a toast notification
              console.error('Voice recording error:', error);
            }}
            disabled={isLoading || isLoadingHistory || !!isDeleting}
          />
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit();
              }
            }}
            placeholder={STRINGS.MESSAGE_PLACEHOLDER}
            className="flex-1 px-4 py-2.5 border border-separator-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition duration-200 ease-in-out text-sm text-black-text resize-none min-h-[44px] max-h-[200px] overflow-y-hidden" /* Use separator-gray */
            rows={1}
            disabled={isLoading || isLoadingHistory || !!isDeleting}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="imageUpload"
            onChange={handleImageUpload}
            ref={imageInputRef}
          />
          <button
            type="submit"
            disabled={isLoading || isLoadingHistory || !!isDeleting || (!inputValue.trim() && !selectedImage && !selectedAudio)}
            className="bg-black hover:bg-gray-700 text-white font-semibold p-2.5 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition duration-200 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black self-end mb-0.5" /* Updated bg, hover, focus */
            aria-label={STRINGS.SEND_MESSAGE_ARIA_LABEL}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin"/> : <SendHorizonal size={20} />} {/* Consistent icon size */}
          </button>
        </form>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        data={bottomSheetData} // Pass the data for the bottom sheet
        hideNumbers={hideNumbers} // Pass hideNumbers down
      />

      {/* Global Debug Modal */}
      <GlobalDebugModal
        isOpen={isGlobalDebugOpen}
        onClose={() => setIsGlobalDebugOpen(false)}
        messages={messages}
      />
    </div>
  );
};

export default ChatInterface;
