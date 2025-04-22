import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
// Import necessary types from toshl lib
import { ToshlAccount, ToshlCategory, ToshlTag } from '../../lib/toshl';
// Import types from gemini lib, API calls are handled elsewhere
import { GeminiShowFilters } from '../../lib/gemini/types';
// Import the new API handlers
import { handleFetchEntriesApi, handleProcessUserRequestApi, handleDeleteEntryApi } from './apiHandler';
import * as STRINGS from '../../constants/strings';
import { EntryCardData, Message, MentionSuggestion, AccountBalanceCardData } from './types'; // Added AccountBalanceCardData
// Removed vietnamese-search import

// Define the return type of the hook, adding retry function and mention logic
interface UseChatLogicReturn {
    messages: Message[];
    inputValue: string;
    // setInputValue: React.Dispatch<React.SetStateAction<string>>; // Replaced by handleInputChange
    isLoading: boolean;
    isRetrying: string | null;
    isDeleting: string | null;
    isLoadingHistory: boolean;
    isBottomSheetOpen: boolean;
    setIsBottomSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
    bottomSheetData: Message[];
    setBottomSheetData: React.Dispatch<React.SetStateAction<Message[]>>;
    handleFetchDateRange: (fromDate?: string, toDate?: string, days?: number, headerTextFromGemini?: string) => Promise<void>;
    handleFormSubmit: (e?: FormEvent) => Promise<void>;
    handleDeleteEntry: (messageId: string, toshlEntryId: string) => Promise<void>;
    handleDeleteMessageLocally: (messageId: string, associatedIds?: string[]) => void; // Updated signature
    handleShowMoreClick: (fullData: EntryCardData[]) => void; // For entries
    handleShowMoreAccountsClick: (fullData: AccountBalanceCardData[]) => void; // Added for accounts
    retrySendMessage: (offlineId: string) => Promise<void>;
    // Mention feature state and handlers
    isMentionPopupOpen: boolean;
    mentionSuggestions: MentionSuggestion[];
    handleInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    handleMentionSelect: (suggestion: MentionSuggestion) => void;
}

const LOCAL_STORAGE_KEY = 'chatMessages';
const TOSHL_ACCOUNTS_KEY = 'toshlAccounts';
const TOSHL_CATEGORIES_KEY = 'toshlCategories';
const TOSHL_TAGS_KEY = 'toshlTags';

export const useChatLogic = (): UseChatLogicReturn => {
    // Load initial messages from localStorage or set default greeting
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedMessages) {
                // Basic validation: ensure it's an array
                const parsed = JSON.parse(storedMessages);
                return Array.isArray(parsed)
                    ? parsed
                    : [{ id: 'init', text: STRINGS.INITIAL_GREETING, sender: 'system', type: 'system_info', status: 'sent', timestamp: new Date().toISOString() }];
            }
        } catch (error) {
            console.error("Failed to load messages from localStorage:", error);
        }
        return [{ id: 'init', text: STRINGS.INITIAL_GREETING, sender: 'system', type: 'system_info', status: 'sent', timestamp: new Date().toISOString() }];
    });
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false); // General loading for API calls
    const [isRetrying, setIsRetrying] = useState<string | null>(null); // Track which offline message is currently retrying
    const [isDeleting, setIsDeleting] = useState<string | null>(null); // Still needed for delete operations
    const [isLoadingHistory, setIsLoadingHistory] = useState(false); // Still needed for history fetch
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [bottomSheetData, setBottomSheetData] = useState<Message[]>([]);
    const [lastShowContext, setLastShowContext] = useState<{ filters: GeminiShowFilters, headerText: string } | null>(null);
    const [lastSuccessfulEntryId, setLastSuccessfulEntryId] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine); // Track network status

    // --- State for Toshl Data (Accounts, Categories, Tags) ---
    const [accounts, setAccounts] = useState<ToshlAccount[]>([]);
    const [categories, setCategories] = useState<ToshlCategory[]>([]);
    const [tags, setTags] = useState<ToshlTag[]>([]);

    // --- State for Mention Feature ---
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
    const [isMentionPopupOpen, setIsMentionPopupOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionTriggerIndex, setMentionTriggerIndex] = useState<number | null>(null);


    // --- Effects for Network Status, Local Storage, and Data Loading ---

    // Save messages to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save messages to localStorage:", error);
            // Optionally notify user or implement more robust error handling
        }
    }, [messages]);

    // Effect to handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            console.log("Network status: Online");
            setIsOnline(true);
            // Attempt to sync pending messages when coming online
            syncPendingMessages();
        };
        const handleOffline = () => {
            console.log("Network status: Offline");
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup listeners on component unmount
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount/unmount

    // Effect to load Toshl data from localStorage on mount
    useEffect(() => {
        try {
            const storedAccounts = localStorage.getItem(TOSHL_ACCOUNTS_KEY);
            const storedCategories = localStorage.getItem(TOSHL_CATEGORIES_KEY);
            const storedTags = localStorage.getItem(TOSHL_TAGS_KEY);

            if (storedAccounts) setAccounts(JSON.parse(storedAccounts));
            if (storedCategories) setCategories(JSON.parse(storedCategories));
            if (storedTags) setTags(JSON.parse(storedTags));

            console.log("Loaded Toshl data for mentions:", {
                accounts: storedAccounts ? JSON.parse(storedAccounts).length : 0,
                categories: storedCategories ? JSON.parse(storedCategories).length : 0,
                tags: storedTags ? JSON.parse(storedTags).length : 0,
            });
        } catch (error) {
            console.error("Failed to load Toshl data from localStorage for mentions:", error);
        }
    }, []); // Run only on mount

    // --- Core Logic Functions ---

    // Function to fetch and display history (Refactored for single state update)
    const handleFetchDateRange = useCallback(async (fromDate?: string, toDate?: string, days?: number, headerTextFromGemini?: string) => {
        if (!isOnline) {
            setMessages((prev) => [...prev, { id: `err_offline_${Date.now()}`, text: STRINGS.ERROR_OFFLINE_HISTORY, sender: 'system', type: 'error', status: 'error', timestamp: new Date().toISOString() }]);
            return; // Don't attempt fetch if offline
        }
        setIsLoadingHistory(true);
        const loadingId = `hist_loading_${Date.now()}`;
        setMessages((prev) => [...prev, { id: loadingId, text: STRINGS.FETCHING_DATA, sender: 'system', type: 'loading', status: 'sent', timestamp: new Date().toISOString() }]); // Assume sent status for loading

        let messagesToAdd: Message[] = [];

        try {
            // Get API key and data needed for the API call (still needed here to pass to handler)
            const toshlApiKey = localStorage.getItem('toshlApiKey');
            if (!toshlApiKey) throw new Error(STRINGS.TOSHL_API_KEY_NOT_CONFIGURED);

            // Fetch categories/tags locally to format results (API handler doesn't need them for fetch)
            const categoriesStr = localStorage.getItem('toshlCategories');
            const tagsStr = localStorage.getItem('toshlTags');
            const categories: ToshlCategory[] = categoriesStr ? JSON.parse(categoriesStr) : [];
            const allTags: ToshlTag[] = tagsStr ? JSON.parse(tagsStr) : [];

            let finalFromDate: string;
            let finalToDate: string;
            let finalHeaderText: string;

            // Determine date range and header text
            if (headerTextFromGemini) {
                finalHeaderText = headerTextFromGemini;
                if (fromDate && toDate) {
                    finalFromDate = fromDate;
                    finalToDate = toDate;
                } else {
                    const numDays = days || 7;
                    const today = new Date();
                    const pastDate = new Date();
                    pastDate.setDate(today.getDate() - numDays);
                    finalFromDate = pastDate.toISOString().split('T')[0];
                    finalToDate = today.toISOString().split('T')[0];
                    console.warn(STRINGS.CONSOLE_WARN_DEFAULT_DATE_RANGE);
                }
            } else if (fromDate && toDate) {
                finalFromDate = fromDate;
                finalToDate = toDate;
                finalHeaderText = STRINGS.HISTORY_HEADER_DATE_RANGE(finalFromDate, finalToDate);
            } else {
                const numDays = days || 7;
                const today = new Date();
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - numDays);
                finalFromDate = pastDate.toISOString().split('T')[0];
                finalToDate = today.toISOString().split('T')[0];
                finalHeaderText = STRINGS.HISTORY_HEADER_LAST_DAYS(numDays);
            }

            const filters = { from: finalFromDate, to: finalToDate };
            const { formattedMessages, rawEntryData } = await handleFetchEntriesApi(filters, toshlApiKey, categories, allTags); // Get raw data too

            const headerMessage: Message = { id: `hist_header_${Date.now()}`, text: finalHeaderText, sender: 'system', type: 'history_header', status: 'sent', timestamp: new Date().toISOString() };

            const PREVIEW_LIMIT = 5; // Define the preview limit

            if (formattedMessages.length > PREVIEW_LIMIT) {
                const messagesToDisplay = formattedMessages.slice(0, PREVIEW_LIMIT).map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message));
                const seeMoreMessage: Message = {
                    id: `hist_see_more_${Date.now()}`,
                    sender: 'system',
                    type: 'history_see_more',
                    text: STRINGS.SEE_MORE_ENTRIES_TEXT(formattedMessages.length), // e.g., "See all 15 entries"
                    fullEntryData: rawEntryData, // Store the full raw data here
                    status: 'sent',
                    timestamp: new Date().toISOString()
                };
                messagesToAdd = [headerMessage, ...messagesToDisplay, seeMoreMessage];
            } else {
                // If 3 or fewer entries, show them all directly
                messagesToAdd = [
                    headerMessage,
                    ...formattedMessages.map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message))
                ];
            }

        } catch (error) {
            console.error(STRINGS.ERROR_FETCHING_ENTRIES_PREFIX, error);
            const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR_FETCHING_ENTRIES;
            messagesToAdd = [{ id: `hist_error_${Date.now()}`, text: `${STRINGS.ERROR_FETCHING_ENTRIES_PREFIX} ${errorMessage}`, sender: 'system', type: 'error', status: 'error', timestamp: new Date().toISOString() }];
        } finally {
            setMessages((prev) => {
                const filtered = prev.filter(msg => msg.id !== loadingId);
                // Ensure messagesToAdd is always an array before spreading
                const finalMessagesToAdd = Array.isArray(messagesToAdd) ? messagesToAdd : [];
                return [...filtered, ...finalMessagesToAdd.map(msg => ({ ...msg, timestamp: new Date().toISOString() }))];
            });
            setIsLoadingHistory(false);
        }
    }, [isOnline]); // Dependencies: setMessages, setIsLoadingHistory, isOnline

    // Function to handle form submission (sending message/creating entry)
    const handleFormSubmit = useCallback(async (e?: FormEvent) => {
        if (e) e.preventDefault();

        // Close mention popup on submit
        setIsMentionPopupOpen(false);
        setMentionTriggerIndex(null);
        setMentionSuggestions([]);

        const text = inputValue.trim();
        if (!text || isLoading || isLoadingHistory || isDeleting || isRetrying) return; // Prevent sending while retrying

            setInputValue(''); // Clear input immediately

            if (!isOnline) {
                // --- Offline Handling ---
            const offlineId = `offline_${Date.now()}`;
            const userMessage: Message = {
                id: offlineId, // Use offlineId as the main ID for now
                offlineId: offlineId,
                text,
                sender: 'user',
                type: 'text',
                status: 'pending', // Mark as pending
                timestamp: new Date().toISOString()
            };
            setMessages((prev) => [...prev, userMessage]);
            console.log(`Message queued offline with ID: ${offlineId}`);
            // No API call here, message saved via useEffect on `messages`
        } else {
            // --- Online Handling ---
            const now = new Date().toISOString();
            const userMessage: Message = { id: `user_${Date.now()}`, text, sender: 'user', type: 'text', status: 'sent', timestamp: now }; // Mark as sent initially
            const loadingId = `loading_${Date.now()}`;
            const loadingMessage: Message = { id: loadingId, text: STRINGS.THINKING, sender: 'system', type: 'loading', status: 'sent', timestamp: now };

            setMessages((prev) => [...prev, userMessage, loadingMessage]);
            setIsLoading(true);

            const currentMessages = messages; // Capture state before async call
            const currentLastShowContext = lastShowContext;
            const currentLastSuccessfulEntryId = lastSuccessfulEntryId;

            let resultMessages: Message[] = [];
            let updatedEntryIdForMarking: string | undefined = undefined;

            try {
                const apiResult = await handleProcessUserRequestApi(
                    text,
                    currentMessages,
                    currentLastShowContext,
                    currentLastSuccessfulEntryId
                );

                setLastShowContext(apiResult.newLastShowContext);
                setLastSuccessfulEntryId(apiResult.newLastSuccessfulEntryId);
                // Ensure messages from API have 'sent' status
                resultMessages = apiResult.messagesToAdd.map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message));
                updatedEntryIdForMarking = apiResult.updatedEntryId;

                if (updatedEntryIdForMarking) {
                    const confirmedEntryId = updatedEntryIdForMarking;
                    setMessages(prevMessages =>
                        prevMessages.map(msg =>
                            (msg.type === 'entry_success' || msg.type === 'history_entry') && msg.entryData?.id === confirmedEntryId
                                ? { ...msg, type: 'system_info', text: STRINGS.ENTRY_CARD_REMOVED_UPDATED(confirmedEntryId), entryData: undefined, isDeleted: true, status: 'sent', timestamp: new Date().toISOString() } as Message // Mark as sent
                                : msg
                        )
                    );
                }

            } catch (error) {
                console.error(STRINGS.ERROR_PROCESSING_MESSAGE_PREFIX, error);
                const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR;
                // Mark error message with 'error' status
                resultMessages = [{ id: `error_${Date.now()}`, text: `${STRINGS.GENERIC_ERROR_PREFIX}${errorMessage}`, sender: 'system', type: 'error', status: 'error', timestamp: new Date().toISOString() }];
            } finally {
                setMessages((prev) => {
                    const filtered = prev.filter(msg => msg.id !== loadingId);
                    const finalMessagesToAdd = Array.isArray(resultMessages) ? resultMessages : [];
                    return [...filtered, ...finalMessagesToAdd.map(msg => ({ ...msg, timestamp: new Date().toISOString() }))];
                });
                setIsLoading(false);
            }
        }
    }, [inputValue, isLoading, isLoadingHistory, isDeleting, isRetrying, isOnline, messages, lastShowContext, lastSuccessfulEntryId]); // Removed setInputValue dependency

    // Function to handle deleting a Toshl entry
    const handleDeleteEntry = useCallback(async (messageId: string, toshlEntryId: string) => {
        if (!toshlEntryId || toshlEntryId === 'unknown_id' || toshlEntryId === STRINGS.TOSHL_ENTRY_CREATED_NO_ID) {
            console.error(STRINGS.CANNOT_DELETE_MISSING_ID_CONSOLE);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, text: STRINGS.ERROR_CANNOT_DELETE_MISSING_ID, type: 'error', entryData: undefined, status: 'error', timestamp: new Date().toISOString() } : msg // Add status
            ));
            return;
        }
        // Prevent deleting if offline? Or allow and sync later? For now, allow online only.
        if (!isOnline) {
             setMessages(prev => prev.map(msg =>
                 msg.id === messageId ? { ...msg, text: STRINGS.ERROR_OFFLINE_DELETE, type: 'error', status: 'error', timestamp: new Date().toISOString() } : msg
             ));
             return;
        }

        setIsDeleting(messageId);

        try {
            await handleDeleteEntryApi(toshlEntryId);
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId
                        ? { ...msg, isDeleted: true, entryData: undefined, text: STRINGS.ENTRY_DELETED_SUCCESS(toshlEntryId), type: 'system_info', status: 'sent', timestamp: new Date().toISOString() } // Mark as sent
                        : msg
                )
            );
        } catch (error) {
            console.error(`Failed to delete Toshl entry ${toshlEntryId}:`, error);
            const errorText = error instanceof Error ? error.message : STRINGS.UNKNOWN_DELETION_ERROR;
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId
                        ? { ...msg, text: `${STRINGS.ERROR_DELETING_ENTRY_PREFIX}${errorText}`, type: 'error', entryData: undefined, status: 'error', timestamp: new Date().toISOString() } // Mark as error
                        : msg
                )
            );
        } finally {
            setIsDeleting(null);
        }
    }, [isOnline]); // Added isOnline dependency

    // Function to handle clicking the "Show More" prompt
    const handleShowMoreClick = useCallback((fullData: EntryCardData[]) => {
        if (!fullData || fullData.length === 0) return;

        // Map the full EntryCardData back to Message objects for the bottom sheet
        const bottomSheetMessages: Message[] = fullData.map((entryData, index) => ({
            id: `bs_${entryData.id}_${index}`, // Use a different prefix for ID if needed
            sender: 'system', // Or 'bot', depending on how you want it styled in the sheet
            type: 'history_entry', // Use the same type as regular history entries
            entryData: entryData,
            timestamp: new Date().toISOString()
        }));

        // Add a header to the bottom sheet data if desired
        // Example: Find the original header message if possible, or create a generic one
        // For simplicity, let's assume no header for now, but you could add one:
        // bottomSheetMessages.unshift({ id: `bs_header_${Date.now()}`, text: "Full Entry List", sender: 'system', type: 'history_header' });

        setBottomSheetData(bottomSheetMessages);
        setIsBottomSheetOpen(true);
    }, []);

    // Function to handle clicking the "Show More Accounts" prompt
    const handleShowMoreAccountsClick = useCallback((fullData: AccountBalanceCardData[]) => {
        if (!fullData || fullData.length === 0) return;

        // Map the full AccountBalanceCardData back to Message objects for the bottom sheet
        const bottomSheetMessages: Message[] = fullData.map((accountData, index) => ({
            id: `bs_acc_${accountData.id}_${index}`,
            sender: 'bot', // Use 'bot' sender for card display
            type: 'account_balance', // Use the single account balance type
            accountBalanceData: accountData,
            text: undefined,
            timestamp: new Date().toISOString()
        }));

        // Optional: Add a header to the bottom sheet
        // bottomSheetMessages.unshift({ id: `bs_acc_header_${Date.now()}`, text: "All Account Balances", sender: 'system', type: 'history_header' });

        setBottomSheetData(bottomSheetMessages);
        setIsBottomSheetOpen(true);
    }, []);


    // --- Mention Feature Logic ---

    const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        const cursorPosition = event.target.selectionStart;
        setInputValue(newValue);

        // Check if we are currently inside a potential mention
        const textBeforeCursor = newValue.substring(0, cursorPosition);
        const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtSymbolIndex !== -1) {
            const potentialQuery = textBeforeCursor.substring(lastAtSymbolIndex + 1);
            // Allow any non-space characters in the query after '@'
            if (!potentialQuery.includes(' ')) {
                const lowerCaseQuery = potentialQuery.toLowerCase();
                setMentionTriggerIndex(lastAtSymbolIndex);
                setMentionQuery(lowerCaseQuery); // Revert to lowercase for consistency
                setIsMentionPopupOpen(true);
                // console.log(`Mention triggered: query='${lowerCaseQuery}', index=${lastAtSymbolIndex}`); // Remove logging
            } else {
                // Invalid character or space entered after @, close popup
                // console.log("Mention closed: space entered"); // Remove logging
                setIsMentionPopupOpen(false);
                setMentionTriggerIndex(null);
                setMentionSuggestions([]);
            }
        } else {
            // No '@' found before cursor, close popup
            // if (isMentionPopupOpen) { // Only log if it was open
            //      console.log("Mention closed: no @ detected before cursor"); // Remove logging
            // }
            setIsMentionPopupOpen(false);
            setMentionTriggerIndex(null);
            setMentionSuggestions([]);
        }
    }, [accounts, categories, tags, isMentionPopupOpen]); // Added isMentionPopupOpen dependency for logging context

    // Effect to filter suggestions when query changes
    useEffect(() => {
        // console.log(`Filtering effect: open=${isMentionPopupOpen}, index=${mentionTriggerIndex}, query='${mentionQuery}'`); // Remove logging
        if (!isMentionPopupOpen || mentionTriggerIndex === null) {
            // Only clear if suggestions exist, prevent unnecessary updates
            if (mentionSuggestions.length > 0) {
                setMentionSuggestions([]);
                // console.log("Filtering effect: clearing suggestions (not open or no index)"); // Remove logging
            }
            return;
        }

        const query = mentionQuery.trim(); // Trimmed query for searching
        // console.log(`Filtering effect: trimmed query='${query}'`); // Remove logging

        if (query === '') {
            // Show initial suggestions (e.g., recent or all?) - For now, show all if query is empty after @
            const allSuggestions: MentionSuggestion[] = [
                ...accounts.map(a => ({ id: a.id, name: a.name, type: 'account' as const })),
                ...categories.map(c => ({ id: c.id, name: c.name, type: 'category' as const })),
                ...tags.map(t => ({ id: t.id, name: t.name, type: 'tag' as const })),
            ];
            const limitedSuggestions = allSuggestions.slice(0, 10); // Limit initial suggestions
            setMentionSuggestions(limitedSuggestions);
            // console.log("Filtering effect: set initial suggestions", limitedSuggestions); // Remove logging
            return;
        }

        const filteredSuggestions: MentionSuggestion[] = [];
        const lowerCaseQuery = query.toLowerCase(); // Ensure query is lowercase for comparison

        // Filter Accounts using standard JS includes()
        accounts.forEach(account => {
            if (account.name.toLowerCase().includes(lowerCaseQuery)) {
                filteredSuggestions.push({ id: account.id, name: account.name, type: 'account' });
            }
        });

        // Filter Categories using standard JS includes()
        categories.forEach(category => {
            if (category.name.toLowerCase().includes(lowerCaseQuery)) {
                filteredSuggestions.push({ id: category.id, name: category.name, type: 'category' });
            }
        });

        // Filter Tags using standard JS includes()
        tags.forEach(tag => {
            if (tag.name.toLowerCase().includes(lowerCaseQuery)) {
                filteredSuggestions.push({ id: tag.id, name: tag.name, type: 'tag' });
            }
        });

        const limitedFilteredSuggestions = filteredSuggestions.slice(0, 10); // Limit results
        setMentionSuggestions(limitedFilteredSuggestions);
        // console.log(`Filtering effect: found ${filteredSuggestions.length} matches, showing ${limitedFilteredSuggestions.length}`, limitedFilteredSuggestions); // Remove logging

    }, [mentionQuery, isMentionPopupOpen, mentionTriggerIndex, accounts, categories, tags]); // Removed mentionSuggestions.length dependency


    const handleMentionSelect = useCallback((suggestion: MentionSuggestion) => {
        if (mentionTriggerIndex === null) return;

        const textBeforeMention = inputValue.substring(0, mentionTriggerIndex);
        // Include the type prefix for clarity, e.g., "category:Groceries"
        const formattedSuggestion = `${suggestion.type}:${suggestion.name}`;
        // Add a space after the suggestion for better UX
        const textAfterMention = inputValue.substring(mentionTriggerIndex + mentionQuery.length + 1); // +1 for '@'

        const newValue = `${textBeforeMention}@${formattedSuggestion} ${textAfterMention}`;

        setInputValue(newValue);

        // Reset mention state
        setIsMentionPopupOpen(false);
        setMentionTriggerIndex(null);
        setMentionQuery('');
        setMentionSuggestions([]);

        // TODO: Focus textarea and move cursor after the inserted text
        // This might need to be handled in ChatInterface.tsx using a ref

    }, [inputValue, mentionTriggerIndex, mentionQuery]);


    // --- Offline Retry and Sync Logic ---

    const retrySendMessage = useCallback(async (offlineId: string) => {
        const messageToRetry = messages.find(msg => msg.offlineId === offlineId && msg.status === 'pending');

        if (!messageToRetry || !messageToRetry.text || !isOnline) {
            console.warn(`Cannot retry message ${offlineId}. Not found, no text, or offline.`);
            if (!isOnline) {
                 setMessages(prev => prev.map(msg => msg.offlineId === offlineId ? { ...msg, text: `${messageToRetry?.text}\n${STRINGS.ERROR_OFFLINE_RETRY}` } : msg));
            }
            return;
        }

        console.log(`Retrying message with offline ID: ${offlineId}`);
        setIsRetrying(offlineId); // Set retrying state for this specific message

        // Use the existing handleFormSubmit logic, but adapted for retry
        const text = messageToRetry.text;
        // Need context from messages *before* the one being retried
        const messagesBeforeRetry = messages.slice(0, messages.findIndex(msg => msg.offlineId === offlineId));
        const currentLastShowContext = lastShowContext; // Use current context
        const currentLastSuccessfulEntryId = lastSuccessfulEntryId; // Use current context

        let resultMessages: Message[] = [];
        let updatedEntryIdForMarking: string | undefined = undefined;

        try {
            const apiResult = await handleProcessUserRequestApi(
                text,
                messagesBeforeRetry, // Pass messages *before* the retried one for context
                currentLastShowContext,
                currentLastSuccessfulEntryId
            );

            setLastShowContext(apiResult.newLastShowContext);
            setLastSuccessfulEntryId(apiResult.newLastSuccessfulEntryId);
            // Ensure messages from API have 'sent' status
            resultMessages = apiResult.messagesToAdd.map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message));
            updatedEntryIdForMarking = apiResult.updatedEntryId;

            // --- Update state after successful retry ---
            setMessages(prev => {
                // Remove the original pending message
                const withoutPending = prev.filter(msg => msg.offlineId !== offlineId);
                // Add the new successful messages
                const finalMessages = [...withoutPending, ...resultMessages];

                // If an edit happened, mark older versions (might need adjustment if context is complex)
                if (updatedEntryIdForMarking) {
                    const confirmedId = updatedEntryIdForMarking;
                    return finalMessages.map(msg =>
                        (msg.type === 'entry_success' || msg.type === 'history_entry') && msg.entryData?.id === confirmedId && msg.offlineId !== offlineId // Don't mark the newly added one
                            ? { ...msg, type: 'system_info', text: STRINGS.ENTRY_CARD_REMOVED_UPDATED(confirmedId), entryData: undefined, isDeleted: true, status: 'sent', timestamp: new Date().toISOString() } as Message
                            : msg
                    );
                }
                return finalMessages;
            });
            // --- End state update ---

        } catch (error) {
            console.error(`Error retrying message ${offlineId}:`, error);
            const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR;
            // Update the original message status to 'error'
            setMessages(prev => prev.map(msg =>
                msg.offlineId === offlineId
                    ? { ...msg, status: 'error', text: `${msg.text}\n${STRINGS.ERROR_RETRY_FAILED} ${errorMessage}` } // Append error info
                    : msg
            ));
        } finally {
            setIsRetrying(null); // Clear retrying state
        }

    }, [messages, isOnline, lastShowContext, lastSuccessfulEntryId, setMessages, setIsLoading, setLastShowContext, setLastSuccessfulEntryId]); // Dependencies for retry

    // Function to sync all pending messages (called on going online)
    const syncPendingMessages = useCallback(async () => {
        const pending = messages.filter(msg => msg.status === 'pending' && msg.offlineId);
        if (pending.length > 0) {
            console.log(`Syncing ${pending.length} pending messages...`);
            // Retry messages one by one sequentially to maintain order and context
            for (const msg of pending) {
                if (msg.offlineId) {
                    // Check if still online before each retry attempt
                    if (!navigator.onLine) {
                        console.warn("Went offline during sync, stopping.");
                        break;
                    }
                    await retrySendMessage(msg.offlineId);
                    // Optional: Add a small delay between retries if needed
                    // await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            console.log("Sync attempt finished.");
        }
    }, [messages, retrySendMessage]); // Dependencies for sync

    // Function to delete a message locally (not from Toshl API)
    // Updated to handle associated IDs for grouped messages
    const handleDeleteMessageLocally = useCallback((messageId: string, associatedIds?: string[]) => {
        const idsToDelete = new Set<string>([messageId]);
        if (associatedIds) {
            associatedIds.forEach(id => idsToDelete.add(id));
        }
        console.log(`Locally deleting messages with IDs: ${Array.from(idsToDelete).join(', ')}`);
        setMessages(prev => prev.filter(msg => !idsToDelete.has(msg.id)));
        // localStorage update happens automatically via the useEffect watching `messages`
    }, []);


    return {
        messages,
        inputValue,
        // setInputValue, // Removed
        isLoading,
        isRetrying, // Added missing return
        isDeleting,
        isLoadingHistory,
        isBottomSheetOpen,
        setIsBottomSheetOpen,
        bottomSheetData,
        setBottomSheetData,
        handleFetchDateRange,
        handleFormSubmit,
        handleDeleteEntry,
        handleDeleteMessageLocally,
        handleShowMoreClick,
        handleShowMoreAccountsClick, // Added handler
        retrySendMessage,
        // Mention feature
        isMentionPopupOpen,
        mentionSuggestions,
        handleInputChange,
        handleMentionSelect,
    };
};
