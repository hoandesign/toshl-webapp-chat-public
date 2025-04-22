import {
    ToshlAccount, ToshlCategory, ToshlTag, ToshlBudget, // Added ToshlBudget
    addToshlEntry, fetchEntries, deleteToshlEntry, editToshlEntry, fetchEntryById, ToshlEntry,
    fetchToshlBudgets // Added fetchToshlBudgets
} from '../../lib/toshl';
// Import the MCP tool hook (assuming it's exported from somewhere, adjust path if needed)
// NOTE: We can't directly call MCP tools from here as it's not a React component.
// We'll need to refactor or pass the MCP call function down.
// For now, we'll simulate the call and data structure.
// import { useMcpTool } from '@modelcontextprotocol/react'; // Placeholder
import { processUserRequestViaGemini } from '../../lib/gemini';
import {
    GeminiResponseAction, GeminiShowFilters, GeminiChatMessage,
    GeminiGetAccountBalancesAction
} from '../../lib/gemini/types';
import * as STRINGS from '../../constants/strings';
import { EntryCardData, Message, AccountBalanceCardData } from './types'; // Added AccountBalanceCardData

// --- Helper to get required data from localStorage ---
const getRequiredApiData = () => {
    const toshlApiKey = localStorage.getItem('toshlApiKey');
    const geminiApiKey = localStorage.getItem('geminiApiKey');
    const currency = localStorage.getItem('currency') || STRINGS.DEFAULT_CURRENCY_VALUE;
    const geminiModel = localStorage.getItem('geminiModel') || STRINGS.DEFAULT_GEMINI_MODEL_VALUE;
    const toshlDataFetched = localStorage.getItem('toshlDataFetched');

    if (!toshlApiKey || !geminiApiKey) throw new Error(STRINGS.API_KEYS_NOT_CONFIGURED);
    if (!toshlDataFetched) throw new Error(STRINGS.TOSHL_DATA_NOT_FETCHED);

    const accountsStr = localStorage.getItem('toshlAccounts');
    const categoriesStr = localStorage.getItem('toshlCategories');
    const tagsStr = localStorage.getItem('toshlTags');

    if (!accountsStr || !categoriesStr || !tagsStr) throw new Error(STRINGS.FAILED_LOAD_TOSHL_DATA);

    const accounts: ToshlAccount[] = JSON.parse(accountsStr);
    const categories: ToshlCategory[] = JSON.parse(categoriesStr);
    const tags: ToshlTag[] = JSON.parse(tagsStr);

    if (accounts.length === 0 || categories.length === 0) throw new Error(STRINGS.NO_ACCOUNTS_OR_CATEGORIES);

    return { toshlApiKey, geminiApiKey, currency, geminiModel, accounts, categories, tags };
};

// --- API Handler for Fetching Entries (used by handleFetchDateRange and Gemini 'show') ---
export const handleFetchEntriesApi = async (
    filters: { from: string; to: string; [key: string]: any }, // Allow additional filters
    toshlApiKey: string,
    categories: ToshlCategory[],
    allTags: ToshlTag[]
): Promise<{ entries: ToshlEntry[], formattedMessages: Message[], rawEntryData: EntryCardData[] }> => { // Added rawEntryData to return type
    const entries = await fetchEntries(toshlApiKey, filters); // API Call

    if (entries.length === 0) {
        const filterForRepeating = !!filters.repeat_status;
        const noEntriesText = filterForRepeating
            ? STRINGS.HISTORY_NO_REPEATING_ENTRIES_MATCHING(`Filters: ${JSON.stringify(filters)}`) // Simplified header for API context
            : STRINGS.HISTORY_NO_ENTRIES_FOR_PERIOD(filters.from, filters.to);
        // Return empty rawEntryData as well
        return { entries: [], formattedMessages: [{ id: `hist_empty_${Date.now()}`, text: noEntriesText, sender: 'system', type: 'system_info' }], rawEntryData: [] };
    } else {
        // First, map to EntryCardData to get the raw data structure needed
        const rawEntryData: EntryCardData[] = entries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort before mapping
            .map((entry): EntryCardData => {
                const categoryName = categories.find(c => c.id === entry.category)?.name || STRINGS.UNKNOWN_CATEGORY;
                const tagNames = entry.tags
                    ?.map((tagId: string) => allTags.find(t => t.id === tagId)?.name)
                    .filter((name: string | undefined): name is string => !!name);

                return { // Return EntryCardData directly
                    date: entry.date, type: entry.amount < 0 ? STRINGS.EXPENSE_TYPE : STRINGS.INCOME_TYPE, amount: Math.abs(entry.amount),
                    currency: entry.currency.code, category: categoryName, tags: tagNames, description: entry.desc, id: entry.id
                };
            });

        // Then, map the rawEntryData to Message format for display
        const formattedMessages = rawEntryData.map((entryData, index): Message => {
            return {
                id: `hist_${entryData.id}_${index}`,
                sender: 'system',
                type: 'history_entry',
                entryData: entryData, // Use the already mapped data
                text: undefined
            };
        });
        // Return entries, formatted messages, and the raw entry data
        return { entries, formattedMessages: formattedMessages, rawEntryData: rawEntryData };
    }
};


// --- API Handler for Processing User Request via Gemini and executing Toshl actions ---
interface ProcessRequestResult {
    messagesToAdd: Message[];
    newLastShowContext: { filters: GeminiShowFilters, headerText: string } | null;
    newLastSuccessfulEntryId: string | null;
    updatedEntryId?: string; // For edit case to mark old messages
}

export const handleProcessUserRequestApi = async (
    userInput: string,
    currentMessages: Message[], // Pass current messages for history context
    currentLastShowContext: { filters: GeminiShowFilters, headerText: string } | null,
    currentLastSuccessfulEntryId: string | null
): Promise<ProcessRequestResult> => {
    const { toshlApiKey, geminiApiKey, currency, geminiModel, accounts, categories, tags } = getRequiredApiData();

    let messagesToAdd: Message[] = [];
    let newLastShowContext = currentLastShowContext;
    let newLastSuccessfulEntryId = currentLastSuccessfulEntryId;
    let updatedEntryId: string | undefined = undefined;

    // --- Construct Enhanced History for Gemini ---
    const historyForGemini: GeminiChatMessage[] = currentMessages
        .filter(msg =>
            (msg.sender === 'user' && msg.text) ||
            (msg.sender === 'system' && (msg.type === 'system_info' || msg.type === 'history_header')) ||
            (msg.sender === 'bot' && msg.type === 'entry_success')
        )
        .slice(-10)
        .map((msg): GeminiChatMessage | null => {
            if (msg.sender === 'user' && msg.text) {
                return { sender: 'user', text: msg.text };
            } else if ((msg.sender === 'system' || msg.sender === 'bot') && msg.text) {
                let botText = '';
                if (msg.type === 'history_header') {
                    botText = `Response Header: ${msg.text}`;
                    if (currentLastShowContext?.filters) { // Use passed context
                        try { botText += `\nToshl Request Filters Used: ${JSON.stringify(currentLastShowContext.filters)}`; } catch (e) { console.error("Failed to stringify filters for history"); }
                    }
                } else if (msg.type === 'entry_success' && msg.entryData?.id) {
                    botText = `System Confirmation: Entry ${msg.entryData.id} processed successfully.`;
                } else if (msg.type === 'system_info' && msg.text) {
                    botText = `System Info: ${msg.text}`;
                } else if (msg.text) {
                    botText = msg.text;
                }
                return botText.trim() ? { sender: 'bot', text: botText } : null;
            }
            return null;
        })
        .filter((msg): msg is GeminiChatMessage => msg !== null && typeof msg.text === 'string');
    // --- End Enhanced History Construction ---

    // --- Call Gemini API ---
    const geminiResult: GeminiResponseAction = await processUserRequestViaGemini(
        geminiApiKey, geminiModel, userInput, categories, tags, accounts, currency,
        Intl.DateTimeFormat().resolvedOptions().timeZone, historyForGemini,
        currentLastShowContext || undefined, currentLastSuccessfulEntryId || undefined
    );
    // --- End Gemini API Call ---

    // --- Process Gemini Result ---
    switch (geminiResult.action) {
        case 'add': {
            newLastShowContext = null; // Reset context on add
            if (geminiResult.headerText) {
                messagesToAdd.push({ id: `confirm_${Date.now()}`, sender: 'system', type: 'system_info', text: geminiResult.headerText });
            }
            const toshlPayload = geminiResult.payload;
            const addResult = await addToshlEntry(toshlApiKey, toshlPayload); // API Call
            let finalEntryId: string | undefined;
            if (typeof addResult === 'string') finalEntryId = addResult;
            else if (typeof addResult === 'object' && addResult.id) finalEntryId = addResult.id;
            else finalEntryId = undefined;

            const categoryName = categories.find(c => c.id === toshlPayload.category)?.name || STRINGS.UNKNOWN_CATEGORY;
            const accountName = accounts.find(a => a.id === toshlPayload.account)?.name || STRINGS.UNKNOWN_ACCOUNT;
            const amountDisplay = Math.abs(toshlPayload.amount);
            const entryType = toshlPayload.amount < 0 ? STRINGS.EXPENSE_TYPE : STRINGS.INCOME_TYPE;
            const tagNamesArray = toshlPayload.tags?.map((tagId: string) => tags.find(t => t.id === tagId)?.name).filter((name): name is string => !!name) || [];

            const successEntryData: EntryCardData = {
                date: toshlPayload.date, type: entryType, amount: amountDisplay,
                currency: toshlPayload.currency.code, category: categoryName,
                account: accountName, tags: tagNamesArray,
                description: toshlPayload.desc, id: finalEntryId,
            };

            if (finalEntryId && finalEntryId !== STRINGS.TOSHL_ENTRY_CREATED_NO_ID) newLastSuccessfulEntryId = finalEntryId;
            else newLastSuccessfulEntryId = null;

            messagesToAdd.push({ id: `success_${finalEntryId || Date.now()}`, sender: 'bot', type: 'entry_success', entryData: successEntryData });
            break;
        }
        case 'show': {
            newLastShowContext = { filters: geminiResult.filters, headerText: geminiResult.headerText }; // Set context on show
            let finalFilters = geminiResult.filters || {};
            let finalHeaderText = geminiResult.headerText || STRINGS.ENTRIES_DEFAULT_HEADER;

            // Apply default date range if needed
            if (!finalFilters.from || !finalFilters.to) {
                const today = new Date();
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - 30);
                const defaultFromDate = pastDate.toISOString().split('T')[0];
                const defaultToDate = today.toISOString().split('T')[0];
                finalFilters.from = defaultFromDate;
                finalFilters.to = defaultToDate;
                finalHeaderText = geminiResult.headerText || STRINGS.HISTORY_HEADER_LAST_DAYS(30) + ` (${defaultFromDate} to ${defaultToDate})`;
                console.log(STRINGS.CONSOLE_INFO_APPLYING_DEFAULT_DATE(defaultFromDate, defaultToDate));
            } else {
                finalHeaderText = geminiResult.headerText || STRINGS.HISTORY_HEADER_DATE_RANGE(finalFilters.from, finalFilters.to);
            }

            // Fetch entries using the determined filters
            const { entries, formattedMessages: fetchedFormattedMessages } = await handleFetchEntriesApi(finalFilters as any, toshlApiKey, categories, tags); // Use the other handler

            // --- Process fetched entries ---
            let calculatedSumText = '';
            let headerTextWithSum = finalHeaderText;

            // Calculate sum if placeholder exists
            if (headerTextWithSum.includes(STRINGS.SUM_PLACEHOLDER)) {
                try {
                    const defaultCurrency = localStorage.getItem('currency') || STRINGS.DEFAULT_CURRENCY_VALUE;
                    let netSum = 0;
                    entries.forEach(entry => { if (typeof entry.amount === 'number') netSum += entry.amount; });
                    const formattedSum = netSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    calculatedSumText = `${formattedSum} ${defaultCurrency}`;
                    headerTextWithSum = headerTextWithSum.replace(STRINGS.SUM_PLACEHOLDER, calculatedSumText);
                } catch (manualSumError) { console.error(STRINGS.CONSOLE_ERROR_MANUAL_SUM, manualSumError); }
            }

            // Add header message FIRST
            messagesToAdd.push({ id: `hist_header_${Date.now()}`, text: headerTextWithSum, sender: 'system', type: 'history_header' });

            // Add entry messages or "no entries" message
            const allFormattedEntries = fetchedFormattedMessages.map(msg => msg.entryData).filter((d): d is EntryCardData => !!d); // Extract EntryCardData

            if (allFormattedEntries.length === 0) {
                // Use the "no entries" message returned by handleFetchEntriesApi
                messagesToAdd.push(...fetchedFormattedMessages);
            } else if (allFormattedEntries.length <= 5) {
                messagesToAdd.push(...fetchedFormattedMessages);
            } else {
                // Add first 5 entries
                messagesToAdd.push(...fetchedFormattedMessages.slice(0, 5));
                // Add "See More" prompt
                const remainingCount = allFormattedEntries.length - 5;
                messagesToAdd.push({
                    id: `hist_more_${Date.now()}`, sender: 'system', type: 'history_see_more',
                    text: STRINGS.SHOW_MORE_ENTRIES(remainingCount), fullEntryData: allFormattedEntries // Pass all data
                });
            }
            // --- End processing fetched entries ---
            break; // End of 'show' case
        }
        case 'edit': {
            messagesToAdd.push({ id: `confirm_edit_${Date.now()}`, sender: 'system', type: 'system_info', text: geminiResult.headerText });
            await editToshlEntry(toshlApiKey, geminiResult.entryId, geminiResult.updatePayload); // API Call
            newLastSuccessfulEntryId = geminiResult.entryId; // Update last successful ID
            newLastShowContext = null; // Reset context on edit
            updatedEntryId = geminiResult.entryId; // Signal that this entry was updated

            // Fetch the updated entry to display it
            try {
                const updatedEntry = await fetchEntryById(toshlApiKey, geminiResult.entryId); // API Call
                if (updatedEntry) {
                    const categoryName = categories.find(c => c.id === updatedEntry.category)?.name || STRINGS.UNKNOWN_CATEGORY;
                    const accountName = accounts.find(a => a.id === updatedEntry.account)?.name || STRINGS.UNKNOWN_ACCOUNT;
                    const amountDisplay = Math.abs(updatedEntry.amount);
                    const entryType = updatedEntry.amount < 0 ? STRINGS.EXPENSE_TYPE : STRINGS.INCOME_TYPE;
                    const tagNamesArray = updatedEntry.tags?.map((tagId: string) => tags.find(t => t.id === tagId)?.name).filter((name: string | undefined): name is string => !!name) || [];

                    const updatedEntryData: EntryCardData = {
                        date: updatedEntry.date, type: entryType, amount: amountDisplay,
                        currency: updatedEntry.currency.code, category: categoryName,
                        account: accountName, tags: tagNamesArray,
                        description: updatedEntry.desc, id: updatedEntry.id,
                    };
                    messagesToAdd.push({ id: `edit_display_${updatedEntry.id}_${Date.now()}`, sender: 'bot', type: 'entry_success', entryData: updatedEntryData });
                } else {
                    console.warn(`fetchEntryById returned undefined for ID: ${geminiResult.entryId}`);
                    messagesToAdd.push({ id: `edit_success_fallback_${geminiResult.entryId}_${Date.now()}`, sender: 'bot', type: 'entry_edit_success', text: STRINGS.ENTRY_UPDATED_FETCH_DETAILS_FAILED(geminiResult.entryId) });
                }
            } catch (fetchError) {
                console.error(`Error fetching updated entry ${geminiResult.entryId} using fetchEntryById:`, fetchError);
                messagesToAdd.push({ id: `edit_success_fetch_error_${geminiResult.entryId}_${Date.now()}`, sender: 'bot', type: 'entry_edit_success', text: STRINGS.ENTRY_UPDATED_FETCH_DETAILS_ERROR(geminiResult.entryId) });
            }
            break;
        }
        case 'info': {
            messagesToAdd.push({ id: `info_${Date.now()}`, sender: 'system', type: 'system_info', text: geminiResult.headerText });
            break;
        }
        case 'get_account_balances': {
            newLastShowContext = null; // Reset context
            newLastSuccessfulEntryId = null; // Reset context
            messagesToAdd.push({ id: `balance_header_${Date.now()}`, sender: 'system', type: 'system_info', text: geminiResult.headerText });

            // --- Simulate MCP Call to get accounts ---
            // In a real scenario, this would involve calling the MCP server.
            // We'll use the accounts data already fetched by getRequiredApiData for this example.
            // const { callMcpTool } = useMcpTool(); // This hook can't be used here directly
            // const mcpResult = await callMcpTool('github.com/hktari/toshl-mcp-server', 'account_list', {});
            // const allAccounts: ToshlAccount[] = mcpResult.content[0].text ? JSON.parse(mcpResult.content[0].text) : [];
            const allAccounts: ToshlAccount[] = accounts; // Using already fetched accounts
            // --- End Simulation ---

            const requestedAccountName = (geminiResult as GeminiGetAccountBalancesAction).accountName?.trim().toLowerCase();
            let accountsToShow: ToshlAccount[] = [];

            if (requestedAccountName) {
                accountsToShow = allAccounts.filter(acc => acc.name.toLowerCase().includes(requestedAccountName));
            } else {
                accountsToShow = allAccounts;
            }

            if (accountsToShow.length === 0) {
                messagesToAdd.push({
                    id: `balance_notfound_${Date.now()}`,
                    sender: 'system',
                    type: 'error',
                    text: requestedAccountName
                        ? STRINGS.BALANCE_ACCOUNT_NOT_FOUND(requestedAccountName)
                        : STRINGS.BALANCE_NO_ACCOUNTS_FOUND
                });
            } else {
                 // Map all accounts to the card data structure, including new fields
                const allAccountCardData: AccountBalanceCardData[] = accountsToShow.map(acc => ({
                    id: acc.id,
                    name: acc.name,
                    balance: acc.balance,
                    currency: acc.currency.code,
                    type: acc.type,
                    status: acc.status,
                    modified: acc.modified,
                    initial_balance: acc.initial_balance,
                    limit: acc.limit,
                    count: acc.count,
                    order: acc.order,
                    // Include summary stats if available
                    daily_sum_median: acc.daily_sum_median, // Assuming these exist on ToshlAccount now
                    avg: acc.avg, // Assuming these exist on ToshlAccount now
                }));

                // Sort accounts by the 'order' field before slicing/displaying
                const sortedAccountData = allAccountCardData.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

                const displayLimit = 3; // Show first N accounts

                if (sortedAccountData.length <= displayLimit) {
                    // Show all accounts if within limit
                    sortedAccountData.forEach((cardData, index) => {
                        messagesToAdd.push({
                            id: `balance_${cardData.id}_${index}`,
                            sender: 'bot',
                            type: 'account_balance',
                            accountBalanceData: cardData,
                            text: undefined
                        });
                    });
                } else {
                    // Show first few and a "See More" prompt
                    sortedAccountData.slice(0, displayLimit).forEach((cardData, index) => {
                         messagesToAdd.push({
                            id: `balance_${cardData.id}_${index}`,
                            sender: 'bot',
                            type: 'account_balance',
                            accountBalanceData: cardData,
                            text: undefined
                        });
                    });
                    // Add the "See More" message
                    const remainingCount = sortedAccountData.length - displayLimit;
                    messagesToAdd.push({
                        id: `acc_balance_more_${Date.now()}`,
                        sender: 'system', // Use system sender for prompts
                        type: 'account_balance_see_more', // Use the new type
                        text: STRINGS.SHOW_MORE_ACCOUNTS(remainingCount),
                        fullAccountBalanceData: sortedAccountData // Attach all sorted data
                    });
                }
            }
            break;
        }
        case 'show_budgets': { // Added case for budgets
            newLastShowContext = null; // Reset context
            newLastSuccessfulEntryId = null; // Reset context
            messagesToAdd.push({ id: `budget_header_${Date.now()}`, sender: 'system', type: 'system_info', text: geminiResult.headerText });

            try {
                const budgets: ToshlBudget[] = await fetchToshlBudgets(toshlApiKey); // API Call

                if (budgets.length === 0) {
                    messagesToAdd.push({
                        id: `budgets_empty_${Date.now()}`,
                        sender: 'system',
                        type: 'system_info',
                        text: STRINGS.BUDGETS_NO_BUDGETS_FOUND
                    });
                } else {
                    // Sort budgets (e.g., by name or period, adjust as needed)
                    const sortedBudgets = budgets.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)); // Sort by order like accounts

                    // Create individual messages for each budget card
                    sortedBudgets.forEach((budget, index) => {
                        messagesToAdd.push({
                            id: `budget_${budget.id}_${index}`, // Use budget ID in message ID
                            sender: 'bot', // Use 'bot' sender for cards
                            type: 'budget_card', // New type for individual card
                            budgetData: budget, // Attach single budget data
                            text: undefined
                        });
                    });
                    // Note: No "See More" card for budgets as per requirement.
                }
            } catch (fetchError) {
                console.error(STRINGS.CONSOLE_ERROR_FETCHING_BUDGETS, fetchError);
                messagesToAdd.push({ id: `budget_fetch_error_${Date.now()}`, sender: 'system', type: 'error', text: STRINGS.BUDGETS_FETCH_ERROR });
            }
            break;
        }
        case 'clarify': {
            messagesToAdd.push({ id: `clarify_${Date.now()}`, sender: 'system', type: 'system_info', text: geminiResult.message });
            break;
        }
        default: {
            messagesToAdd.push({ id: `error_action_${Date.now()}`, text: STRINGS.UNEXPECTED_GEMINI_ACTION, sender: 'system', type: 'error' });
            console.error(STRINGS.UNEXPECTED_GEMINI_ACTION, geminiResult);
            break;
        }
    }
    // --- End Gemini Result Processing ---

    return { messagesToAdd, newLastShowContext, newLastSuccessfulEntryId, updatedEntryId };
};


// --- API Handler for Deleting an Entry ---
export const handleDeleteEntryApi = async (toshlEntryId: string): Promise<void> => {
    const { toshlApiKey } = getRequiredApiData(); // Only need Toshl key
    await deleteToshlEntry(toshlApiKey, toshlEntryId); // API Call
};
