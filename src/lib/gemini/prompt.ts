import { ToshlAccount, ToshlCategory, ToshlTag } from '../toshl';
import { GeminiShowFilters } from './types'; // Import types from the same directory - Removed GeminiChatMessage
import * as STRINGS from '../../constants/strings'; // Import constants
// Import the prompt template as a raw string
import promptTemplateRaw from '../gemini_prompt.txt?raw';

/**
 * Generates a prompt for Gemini to extract Toshl entry details from user text.
 * @param userMessage - The natural language input from the user.
 * @param categories - Array of available Toshl categories.
 * @param tags - Array of available Toshl tags.
 * @param accounts - Array of available Toshl accounts.
 * @param defaultCurrency - The default currency code (e.g., 'VND').
 * @param userTimezone - The IANA timezone string of the user (e.g., 'Asia/Saigon').
 * @param chatHistory - Recent chat history for context.
 * @param lastShowContext - Filters and header from the previous 'show' action, if any.
 * @param lastSuccessfulEntryId - The ID of the last entry successfully added/edited.
 * @returns An object containing the system instructions and dynamic context parts of the prompt.
 */
export function constructGeminiPrompt(
    // userMessage: string, // No longer used here
    categories: ToshlCategory[],
    tags: ToshlTag[],
    accounts: ToshlAccount[],
    defaultCurrency: string,
    userTimezone: string,
    // chatHistory: GeminiChatMessage[], // No longer used here
    lastShowContext?: { filters: GeminiShowFilters, headerText: string },
    lastSuccessfulEntryId?: string
): { systemInstructions: string; dynamicContext: string } { // Updated return type
    // Prepare lists of names and IDs for the prompt, separated by type
    const incomeCategories = categories.filter(c => c.type === STRINGS.INCOME_TYPE_FILTER);
    const expenseCategories = categories.filter(c => c.type === STRINGS.EXPENSE_TYPE_FILTER);

    // Generate Markdown Tables
    const createMarkdownTable = (items: { name: string; id: string; category?: string }[]): string => {
        if (!items || items.length === 0) return STRINGS.MARKDOWN_TABLE_EMPTY;
        const hasCategory = items.some(item => item.category !== undefined);
        const headerColumns = hasCategory ? ['Name', 'ID', 'Category'] : ['Name', 'ID'];
        const header = `| ${headerColumns.join(' | ')} |`;
        const separator = `| ${headerColumns.map(() => '---').join(' | ')} |`;
        const rows = items.map(item => {
            const cols = [item.name, item.id];
            if (hasCategory) cols.push(item.category ?? '');
            return `| ${cols.join(' | ')} |`;
        }).join('\n');
        return `${header}\n${separator}\n${rows}`;
    };

    const incomeCategoryList = createMarkdownTable(incomeCategories);
    const expenseCategoryList = createMarkdownTable(expenseCategories);

    // Separate tags by type as well
    const incomeTags = tags.filter(t => t.type === STRINGS.INCOME_TYPE_FILTER);
    const expenseTags = tags.filter(t => t.type === STRINGS.EXPENSE_TYPE_FILTER);

    const incomeTagList = createMarkdownTable(incomeTags);
    const expenseTagList = createMarkdownTable(expenseTags);

    // Find the "Personal" account, otherwise fall back to the first account.
    const personalAccount = accounts.find(acc => acc.name.toLowerCase() === STRINGS.PERSONAL_ACCOUNT_NAME);
    const defaultAccount = personalAccount || (accounts.length > 0 ? accounts[0] : null);

    // Ensure defaultAccount is not null before proceeding
    if (!defaultAccount) {
        // This case should ideally be handled before calling constructGeminiPrompt,
        // but we add a safeguard here.
        throw new Error(STRINGS.PROMPT_ERROR_NO_DEFAULT_ACCOUNT);
    }

    // Format account info as a table too (even if just one row for default)
    const accountTableItems = accounts.map(acc => ({ name: acc.name, id: acc.id }));
    const accountInfo = createMarkdownTable(accountTableItems);
    // Note: The defaultAccountId is still needed separately below.

    // Get today's date and current time in the user's timezone
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat(STRINGS.DATE_LOCALE_EN_CA, { // 'en-CA' gives YYYY-MM-DD format
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const timeFormatter = new Intl.DateTimeFormat(STRINGS.TIME_LOCALE_EN_US, { // 'en-US' with hour12: false gives HH:MM:SS
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const today = dateFormatter.format(now);
    const currentTime = timeFormatter.format(now);

    const defaultAccountId = defaultAccount.id;
    const exampleYear = new Date().getFullYear();
    const lastYear = exampleYear - 1;

    // Replace placeholders in the template loaded from the text file
    let promptText = promptTemplateRaw;
    // Remove potential initial comment/export lines from raw text
    promptText = promptText.replace(/^\/\/.*?\n/, '').replace(/^export const.*?=\s*`\n?/, '').replace(/`;\s*$/, '');

    promptText = promptText.replace(/{{currentTime}}/g, currentTime);
    promptText = promptText.replace(/{{today}}/g, today);
    promptText = promptText.replace(/{{userTimezone}}/g, userTimezone);
    // promptText = promptText.replace(/{{userMessage}}/g, userMessage); // REMOVED - Will be added as a separate turn
    promptText = promptText.replace(/{{incomeCategoryList}}/g, incomeCategoryList);
    promptText = promptText.replace(/{{expenseCategoryList}}/g, expenseCategoryList);
    promptText = promptText.replace(/{{incomeTagList}}/g, incomeTagList);
    promptText = promptText.replace(/{{expenseTagList}}/g, expenseTagList);
    promptText = promptText.replace(/{{accountInfo}}/g, accountInfo);
    promptText = promptText.replace(/{{defaultCurrency}}/g, defaultCurrency);
    promptText = promptText.replace(/{{defaultAccountId}}/g, defaultAccountId);
    promptText = promptText.replace(/{{exampleYear}}/g, exampleYear.toString());
    promptText = promptText.replace(/{{lastYear}}/g, lastYear.toString());

    // // Add Chat History section - REMOVED - Will be added as separate turns
    // const historySection = chatHistory.length > 0
    //     ? `${STRINGS.CHAT_HISTORY_SECTION_HEADER}\n${chatHistory.map(msg => STRINGS.CHAT_HISTORY_LINE_FORMAT(msg.sender === 'user' ? STRINGS.CHAT_HISTORY_USER_PREFIX : STRINGS.CHAT_HISTORY_ASSISTANT_PREFIX, msg.text)).join('\n')}${STRINGS.CHAT_HISTORY_SEPARATOR}`
    //     : `${STRINGS.CHAT_HISTORY_SECTION_HEADER}\n${STRINGS.CHAT_HISTORY_EMPTY}`;
    // promptText = promptText.replace(/{{chatHistory}}/g, historySection);

    // Add Last Show Request Context section
    const lastShowSection = lastShowContext
        ? `${STRINGS.LAST_SHOW_CONTEXT_SECTION_HEADER}\n${STRINGS.LAST_SHOW_CONTEXT_FORMAT(lastShowContext.headerText, JSON.stringify(lastShowContext.filters))}${STRINGS.CHAT_HISTORY_SEPARATOR}`
        : `${STRINGS.LAST_SHOW_CONTEXT_SECTION_HEADER}\n${STRINGS.LAST_SHOW_CONTEXT_EMPTY}`;
    promptText = promptText.replace(/{{lastShowContext}}/g, lastShowSection);

    // Add Last Successful Entry ID section
    const lastEntryIdSection = lastSuccessfulEntryId
        ? `${STRINGS.LAST_ENTRY_ID_SECTION_HEADER}\n${STRINGS.LAST_ENTRY_ID_FORMAT(lastSuccessfulEntryId)}${STRINGS.CHAT_HISTORY_SEPARATOR}`
        : `${STRINGS.LAST_ENTRY_ID_SECTION_HEADER}\n${STRINGS.LAST_ENTRY_ID_EMPTY}${STRINGS.CHAT_HISTORY_SEPARATOR}`;
    promptText = promptText.replace(/{{lastSuccessfulEntryId}}/g, lastEntryIdSection);

    // --- Split the prompt text ---
    // Find a suitable marker to split the instructions from the dynamic parts.
    // Let's split after the "General JSON Rules" section. We need a unique marker.
    // We'll assume the line "Action-Specific JSON Structures & Rules:" is a good separator.
    const splitMarker = STRINGS.PROMPT_SPLIT_MARKER;
    const parts = promptText.split(splitMarker);

    if (parts.length !== 2) {
        console.warn("Could not split Gemini prompt template at the expected marker. Sending as a single block.");
        // Fallback: return the whole prompt as context, empty instructions
        return { systemInstructions: "", dynamicContext: promptText };
    }

    const systemInstructionsPart = parts[0].trim();
    // Re-add the marker and the rest of the content to the dynamic part
    const dynamicContextPart = (splitMarker + parts[1]).trim();

    // Return the two parts
    return { systemInstructions: systemInstructionsPart, dynamicContext: dynamicContextPart };
}
