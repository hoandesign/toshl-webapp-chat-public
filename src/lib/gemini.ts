import { ToshlAccount, ToshlCategory, ToshlTag } from './toshl';
// Import types from the new types file
import {
    GeminiChatMessage,
    GeminiShowFilters,
    GeminiResponseAction,
    GeminiGenerateContentRequest,
    GeminiGenerateContentResponse,
    GeminiErrorResponse
} from './gemini/types';
// Import the prompt construction function
import { constructGeminiPrompt } from './gemini/prompt';
import * as STRINGS from '../constants/strings'; // Import constants

// Base URL might vary slightly depending on the exact API version and region
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * Calls the Gemini API to process the user's request.
 * @param apiKey - The Gemini API key.
 * @param model - The Gemini model name (e.g., 'gemini-pro').
 * @param userMessage - The natural language input from the user.
 * @param categories - Array of available Toshl categories.
 * @param tags - Array of available Toshl tags.
 * @param accounts - Array of available Toshl accounts.
 * @param defaultCurrency - The default currency code.
 * @param userTimezone - The IANA timezone string of the user.
 * @param chatHistory - Recent chat history for context.
 * @param lastShowContext - Filters and header from the previous 'show' action, if any.
 * @param lastSuccessfulEntryId - The ID of the last entry successfully added/edited.
 * @returns A promise that resolves to the structured action determined by Gemini.
 */
export async function processUserRequestViaGemini( // Renamed function
    apiKey: string,
    model: string,
    userMessage: string,
    categories: ToshlCategory[],
    tags: ToshlTag[],
    accounts: ToshlAccount[],
    defaultCurrency: string,
    userTimezone: string,
    chatHistory: GeminiChatMessage[], // Added parameter
    lastShowContext?: { filters: GeminiShowFilters, headerText: string }, // Added parameter
    lastSuccessfulEntryId?: string // Added parameter
): Promise<GeminiResponseAction> { // Updated return type
    if (!apiKey || !model) {
        throw new Error(STRINGS.GEMINI_API_KEY_MODEL_REQUIRED);
    }
    if (!userTimezone) {
        console.warn('User timezone not provided to processUserRequestViaGemini, falling back to system time.');
        // Fallback or throw error depending on desired strictness
    }
     if (!categories || categories.length === 0) {
        throw new Error(STRINGS.TOSHL_CATEGORIES_REQUIRED);
     }
     if (!accounts || accounts.length === 0) {
        throw new Error(STRINGS.TOSHL_ACCOUNTS_REQUIRED);
    }


    const prompt = constructGeminiPrompt(
        // userMessage, // Removed argument
        categories,
        tags,
        accounts,
        defaultCurrency,
        userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone, // Use system TZ if not provided
        // chatHistory, // Removed argument
        lastShowContext, // Pass last show context
        lastSuccessfulEntryId // Pass last entry ID
    ); // 'prompt' now holds { systemInstructions: string; dynamicContext: string }

    const endpoint = `${GEMINI_API_BASE}${model}:generateContent?key=${apiKey}`;

    // --- Build the new contents structure ---
    const contents: GeminiGenerateContentRequest['contents'] = [];

    // 1. System Instructions (User Role)
    if (prompt.systemInstructions) { // Check if not empty
        contents.push({ role: 'user', parts: [{ text: prompt.systemInstructions }] });
    }

    // 2. Dynamic Context (User Role - without user message/history embedded)
    if (prompt.dynamicContext) { // Check if not empty
        contents.push({ role: 'user', parts: [{ text: prompt.dynamicContext }] });
    }

    // 3. Model Acknowledgment (Model Role)
    contents.push({ role: 'model', parts: [{ text: "OK. I will follow these instructions precisely, paying close attention to the required output format and user input's language." }] });

    // 4. Chat History (Alternating User/Model Roles)
    chatHistory.forEach(msg => {
        contents.push({
            role: msg.sender === 'user' ? 'user' : 'model', // Map 'bot' to 'model'
            parts: [{ text: msg.text }]
        });
    });

    // 5. Latest User Message (User Role)
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
    // --- End building contents structure ---


    // Structure the request body
    const requestBody: GeminiGenerateContentRequest = {
        contents: contents, // Use the newly built contents array
        // Generation Config to control creativity and output format
        generationConfig: {
            // responseMimeType: "application/json", // Enforce JSON - uncomment if model supports & desired
            temperature: 0.7, // Increase creativity/randomness (0.0 = deterministic, 1.0 = max random)
            topK: 40,         // Consider top K most likely tokens at each step
            // topP: 0.95,    // Alternative/additional sampling method (nucleus sampling)
        }
    };

    console.log('Sending request to Gemini API...');
    console.log('Gemini Request Body:', JSON.stringify(requestBody, null, 2)); // Log the request body

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorResponse = responseData as GeminiErrorResponse;
            console.error('Gemini API Error Response:', JSON.stringify(errorResponse, null, 2));
            const message = errorResponse?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(STRINGS.GEMINI_API_ERROR(message));
        }

        const geminiResponse = responseData as GeminiGenerateContentResponse;

        // Extract the text content from the first candidate
        const generatedText = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            console.error('Gemini response missing generated text:', JSON.stringify(geminiResponse, null, 2));
            throw new Error(STRINGS.GEMINI_NO_VALID_CONTENT);
        }

        console.log('Raw Gemini Response Text:', generatedText);

        // Attempt to parse the text as JSON (expecting ToshlEntryPayload)
        // Clean the text in case Gemini includes markdown backticks for JSON block
        const cleanedText = generatedText.replace(/^```json\s*|```$/g, '').trim();

        try {
            // Parse the JSON to get the action object
            const result: GeminiResponseAction = JSON.parse(cleanedText);

            // Validate the parsed structure based on the action
            switch (result.action) {
                case 'add':
                    const payload = result.payload;
                    if (!payload ||
                        typeof payload.amount !== 'number' ||
                        !payload.currency?.code ||
                        !payload.date || typeof payload.date !== 'string' || !payload.date.match(/^\d{4}-\d{2}-\d{2}$/) ||
                        !payload.account || typeof payload.account !== 'string' ||
                        !payload.category || typeof payload.category !== 'string' ||
                        (payload.tags && (!Array.isArray(payload.tags) || !payload.tags.every((t: string) => typeof t === 'string'))) || // Add type for t
                        (result.headerText && typeof result.headerText !== 'string') // Validate headerText if present
                       ) {
                         console.error("Parsed 'add' action payload validation failed:", result);
                         throw new Error(STRINGS.GEMINI_INVALID_ADD_PAYLOAD);
                    }
                    console.log("Successfully parsed 'add' action from Gemini:", result);
                    break;
                case 'show':
                    // Validate the 'show' action structure
                    if (!result.filters || typeof result.filters !== 'object' ||
                        !result.headerText || typeof result.headerText !== 'string') {
                        console.error("Parsed 'show' action validation failed (missing filters or headerText):", result);
                        throw new Error(STRINGS.GEMINI_INVALID_SHOW_PAYLOAD);
                    }
                    // Optional: Add more specific validation for fields within result.filters if needed
                    // e.g., check date formats if 'from'/'to' exist
                    if (result.filters.from && (typeof result.filters.from !== 'string' || !result.filters.from.match(/^\d{4}-\d{2}-\d{2}$/))) {
                         throw new Error(STRINGS.GEMINI_INVALID_SHOW_FROM_DATE);
                    }
                    if (result.filters.to && (typeof result.filters.to !== 'string' || !result.filters.to.match(/^\d{4}-\d{2}-\d{2}$/))) {
                         throw new Error(STRINGS.GEMINI_INVALID_SHOW_TO_DATE);
                    }
                    // Add checks for other filter types (arrays, strings, numbers) if necessary
                    console.log("Successfully parsed 'show' action from Gemini:", result);
                    break;
                case 'clarify':
                     if (!result.message || typeof result.message !== 'string') {
                         console.error("Parsed 'clarify' action validation failed:", result);
                         throw new Error(STRINGS.GEMINI_INVALID_CLARIFY_PAYLOAD);
                     }
                     console.log("Successfully parsed 'clarify' action from Gemini:", result);
                    break;
                case 'edit':
                    // Validate the 'edit' action structure
                    if (!result.entryId || typeof result.entryId !== 'string' ||
                        !result.updatePayload || typeof result.updatePayload !== 'object' || Object.keys(result.updatePayload).length === 0 ||
                        !result.headerText || typeof result.headerText !== 'string') {
                        console.error("Parsed 'edit' action validation failed:", result);
                        throw new Error(STRINGS.GEMINI_INVALID_EDIT_PAYLOAD);
                    }
                    // Optional: Add more specific validation for fields within result.updatePayload if needed
                    console.log("Successfully parsed 'edit' action from Gemini:", result);
                    break;
                case 'info':
                    // Validate the 'info' action structure
                    if (!result.headerText || typeof result.headerText !== 'string') {
                        console.error("Parsed 'info' action validation failed:", result);
                        throw new Error(STRINGS.GEMINI_INVALID_INFO_PAYLOAD);
                    }
                    console.log("Successfully parsed 'info' action from Gemini:", result);
                    break;
                case 'get_account_balances':
                    // Validate the 'get_account_balances' action structure
                    if (!result.headerText || typeof result.headerText !== 'string' ||
                        (result.accountName && typeof result.accountName !== 'string')) { // accountName is optional, but must be string if present
                        console.error("Parsed 'get_account_balances' action validation failed:", result);
                        throw new Error(STRINGS.GEMINI_INVALID_GET_BALANCE_PAYLOAD);
                    }
                    console.log("Successfully parsed 'get_account_balances' action from Gemini:", result);
                    break;
                case 'show_budgets':
                    // Validate the 'show_budgets' action structure
                    if (!result.headerText || typeof result.headerText !== 'string') {
                        console.error("Parsed 'show_budgets' action validation failed:", result);
                        // Consider creating a specific error string for this
                        throw new Error("Parsed JSON for 'show_budgets' action is missing the required 'headerText' field.");
                    }
                    console.log("Successfully parsed 'show_budgets' action from Gemini:", result);
                    break;
                default:
                    // If action is not one of the expected types
                    const unknownAction = (result as any)?.action || 'unknown';
                    console.error("Parsed JSON has unknown action:", result);
                    throw new Error(STRINGS.GEMINI_UNKNOWN_ACTION(unknownAction));
            }

            return result; // Return the validated action object

        } catch (parseError) {
            console.error('Failed to parse or validate JSON from Gemini response:', parseError);
            console.error('Cleaned text that failed parsing/validation:', cleanedText);
            // Return a clarify action as a fallback? Or throw a more specific error?
            // Throwing error seems more appropriate to signal failure upstream.
            throw new Error(STRINGS.GEMINI_JSON_PARSE_VALIDATE_FAILED(generatedText));
        }
    } catch (error) {
        console.error('Error calling or processing Gemini API response:', error);
        throw error; // Re-throw the error
    }
}
