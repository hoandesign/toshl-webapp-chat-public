import { ToshlAccount, ToshlCategory, ToshlTag } from './toshl';
// Import types from the new types file
import {
    GeminiChatMessage,
    GeminiShowFilters,
    GeminiResponseAction,
    GeminiGenerateContentRequest,
    GeminiGenerateContentResponse,
    GeminiErrorResponse,
    GeminiCache,
    GeminiListCachesResponse,
    GeminiCreateCacheRequest,
    GeminiUpdateCacheRequest,
    GeminiContentPart
} from './gemini/types';
import { DebugInfo } from '../components/chat/types';

// Import the prompt construction function
import { constructGeminiPrompt } from './gemini/prompt';
import * as STRINGS from '../constants/strings'; // Import constants

// Base URL might vary slightly depending on the exact API version and region
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_FILES_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/files';

// Cache storage for static prompt content
let promptCacheName: string | null = null;
let cacheAttempted = false; // Track if cache creation has been attempted to avoid repeated failures

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
    lastSuccessfulEntryId?: string, // Added parameter
    currentImage?: string, // Added current image parameter
    currentAudio?: string, // Added current audio parameter
    currentAudioMimeType?: string, // Added current audio MIME type parameter
    captureDebugInfo?: boolean // Added debug capture flag
): Promise<{ result: GeminiResponseAction; debugInfo?: DebugInfo }> { // Updated return type to include debug info
    const startTime = Date.now();
    const debugInfo: DebugInfo | undefined = captureDebugInfo ? {
        geminiRequest: {
            model,
            userInput: userMessage,
            chatHistory: chatHistory.map(msg => ({ sender: msg.sender, text: msg.text, hasImage: !!msg.image }))
        },
        geminiResponse: {},
        toshlRequests: [],
        errors: [],
        timestamp: new Date().toISOString()
    } : undefined;

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

    // Construct prompt parts, including dynamic time info
    const { systemInstructions, dynamicContext, currentTime, today } = constructGeminiPrompt(
        categories,
        tags,
        accounts,
        defaultCurrency,
        userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        lastShowContext,
        lastSuccessfulEntryId
    );

    const endpoint = `${GEMINI_API_BASE}${model}:generateContent?key=${apiKey}`;

    // Cache toggle based on user settings
    const cacheEnabled = JSON.parse(localStorage.getItem('useGeminiCache') || 'false');
    console.log(`[Cache Setting] cacheEnabled: ${cacheEnabled}`);
    let cacheName = cacheEnabled ? promptCacheName : null; // Allow reassignment
    if (cacheEnabled) {
        console.log(`[Cache Check] Current promptCacheName before check: ${promptCacheName}`);
    } else {
        console.log('[Cache Disabled] Skipping cache logic.');
    }

    if (cacheEnabled && !cacheName && !cacheAttempted) {
        cacheAttempted = true; // Avoid repeated cache creation attempts
        console.log('[Cache Check] promptCacheName is null or empty, attempting to create a new cache.'); // Add diagnostic log
        try {
            // Cache only the static instructions and context, NOT the time info
            const cache = await createGeminiCache(apiKey, {
                model,
                config: {
                    contents: [
                        { role: 'user', parts: [{ text: systemInstructions }] },
                        { role: 'user', parts: [{ text: dynamicContext }] }
                    ],
                    ttl: '360s' // Keep the 1-hour TTL
                }
            });
            cacheName = cache.name;
            promptCacheName = cacheName;
        } catch (e) {
            console.warn('Prompt cache creation failed, proceeding without cache', e);
        }
    }

    // Build the request contents array
    const contents: GeminiGenerateContentRequest['contents'] = [];

    // Add static parts ONLY if not using cache
    if (!cacheName) {
        if (systemInstructions) {
            contents.push({ role: 'user', parts: [{ text: systemInstructions }] });
        }
        if (dynamicContext) {
            contents.push({ role: 'user', parts: [{ text: dynamicContext }] });
        }
    }

    // Model acknowledgment (always included, not cached)
    contents.push({ role: 'model', parts: [{ text: "OK. I will follow these instructions precisely, paying close attention to the required output format (only a single JSON, without markdown formatting) and user input's language." }] });

    // Add dynamic time context (always included, not cached)
    const timeContextMessage = `Current time context: ${currentTime} on ${today} (${userTimezone}).`;
    contents.push({ role: 'user', parts: [{ text: timeContextMessage }] });

    // Add Chat history (always included, not cached)
    for (const msg of chatHistory) {
        const parts: GeminiContentPart[] = [{ text: msg.text }];
        
        // Handle images in chat history
        if (msg.image) {
            try {
                // Upload image to Files API and get file URI
                const fileUri = await uploadImageToFilesAPI(apiKey, msg.image);
                parts.push({
                    fileData: {
                        mimeType: 'image/jpeg', // Default to JPEG, could be enhanced to detect actual format
                        fileUri: fileUri
                    }
                });
            } catch (error) {
                console.warn('Failed to upload image to Files API, falling back to inline data:', error);
                // Fallback to inline data if Files API fails
                // Extract base64 data from data URL if present
                let cleanBase64 = msg.image;
                if (msg.image.startsWith('data:')) {
                    const [, data] = msg.image.split(',');
                    cleanBase64 = data;
                }
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: cleanBase64
                    }
                });
            }
        }
        
        // Handle audio in chat history
        if (msg.audio) {
            try {
                // Upload audio to Files API and get file URI
                const fileUri = await uploadAudioToFilesAPI(apiKey, msg.audio, 'audio/webm');
                parts.push({
                    fileData: {
                        mimeType: 'audio/webm',
                        fileUri: fileUri
                    }
                });
            } catch (error) {
                console.warn('Failed to upload audio to Files API, falling back to inline data:', error);
                // Fallback to inline data if Files API fails
                parts.push({
                    inlineData: {
                        mimeType: 'audio/webm',
                        data: msg.audio
                    }
                });
            }
        }
        
        contents.push({ role: msg.sender === 'user' ? 'user' : 'model', parts });
    }
    // Latest user message with optional image and/or audio
    const userParts: GeminiContentPart[] = [{ text: userMessage }];
    
    // Handle current image
    if (currentImage) {
        try {
            // Upload image to Files API and get file URI
            const fileUri = await uploadImageToFilesAPI(apiKey, currentImage);
            userParts.push({
                fileData: {
                    mimeType: 'image/jpeg', // Default to JPEG, could be enhanced to detect actual format
                    fileUri: fileUri
                }
            });
        } catch (error) {
            console.warn('Failed to upload current image to Files API, falling back to inline data:', error);
            // Fallback to inline data if Files API fails
            // Extract base64 data from data URL if present
            let cleanBase64 = currentImage;
            if (currentImage.startsWith('data:')) {
                const [, data] = currentImage.split(',');
                cleanBase64 = data;
            }
            userParts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }
    }
    
    // Handle current audio
    if (currentAudio) {
        try {
            // Upload audio to Files API and get file URI
            const mimeType = currentAudioMimeType || 'audio/webm';
            const fileUri = await uploadAudioToFilesAPI(apiKey, currentAudio, mimeType);
            userParts.push({
                fileData: {
                    mimeType: mimeType,
                    fileUri: fileUri
                }
            });
        } catch (error) {
            console.warn('Failed to upload current audio to Files API, falling back to inline data:', error);
            // Fallback to inline data if Files API fails
            userParts.push({
                inlineData: {
                    mimeType: currentAudioMimeType || 'audio/webm',
                    data: currentAudio
                }
            });
        }
    }
    
    contents.push({ role: 'user', parts: userParts });

    // Structure request body with optional cache reference
    const requestBody: GeminiGenerateContentRequest = {
        contents,
        generationConfig: {
            temperature: 0.7,
            topK: 40,
        },
        ...(cacheEnabled && cacheName ? { cachedContent: cacheName } : {})
    };
    if ('cachedContent' in requestBody) {
        console.log(`[Cache Usage] Using cachedContent: ${(requestBody as { cachedContent: string }).cachedContent}`);
    } else {
        console.log('[Cache Usage] Sending full prompt (no cache).');
    }

    console.log('Sending request to Gemini API...');
    console.log('Gemini Request Body:', JSON.stringify(requestBody, null, 2)); // Log the request body

    // Capture debug info for request
    if (debugInfo && debugInfo.geminiRequest) {
        debugInfo.geminiRequest.fullRequestBody = JSON.parse(JSON.stringify(requestBody));
        debugInfo.geminiRequest.systemPrompt = systemInstructions;
    }

    try {
        let response = await fetch(endpoint, { // Use let for potential reassignment on retry
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        let responseData = await response.json(); // Use let for potential reassignment on retry

        if (!response.ok) {
            const errorResponse = responseData as GeminiErrorResponse;
            const errorMessage = errorResponse?.error?.message || `HTTP error! status: ${response.status}`;
            console.error('Gemini API Error Response:', JSON.stringify(errorResponse, null, 2));

            // Check if it's a cache-related error AND if we actually tried to use the cache
            // Using a simple regex check - adjust keywords based on actual Gemini error messages if needed
            const isCacheError = /cached content|invalid cache/i.test(errorMessage);
            const usedCache = !!requestBody.cachedContent; // Check if cachedContent was in the initial request

            if (isCacheError && usedCache) {
                console.warn(`Gemini cache error detected (Cache Name: ${requestBody.cachedContent}). Clearing local cache reference and retrying with full prompt...`);
                promptCacheName = null; // Clear the module-level cache name
                cacheAttempted = false; // Reset cacheAttempted so caching can be retried after clear

                // Rebuild contents WITH static prompt parts for retry
                const retryContents: GeminiGenerateContentRequest['contents'] = [];
                if (systemInstructions) {
                    retryContents.push({ role: 'user', parts: [{ text: systemInstructions }] });
                }
                if (dynamicContext) {
                    retryContents.push({ role: 'user', parts: [{ text: dynamicContext }] });
                }
                // Model acknowledgment
                retryContents.push({ role: 'model', parts: [{ text: "OK. I will follow these instructions precisely, paying close attention to the required output format and user input's language." }] });
                // Add dynamic time context again for retry
                retryContents.push({ role: 'user', parts: [{ text: timeContextMessage }] });
                // Chat history (simplified for retry - no images to avoid complexity)
                chatHistory.forEach(msg => {
                    retryContents.push({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
                });
                // Latest user message
                retryContents.push({ role: 'user', parts: [{ text: userMessage }] });


                // Rebuild request body WITHOUT cachedContent
                const retryRequestBody: GeminiGenerateContentRequest = {
                    contents: retryContents,
                    generationConfig: requestBody.generationConfig, // Use same generation config
                    // No cachedContent property here
                };

                console.log('Retrying Gemini request with full prompt...');
                console.log('Gemini Retry Request Body:', JSON.stringify(retryRequestBody, null, 2));

                // Retry the fetch call
                response = await fetch(endpoint, { // Reassign response
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(retryRequestBody),
                });
                responseData = await response.json(); // Reassign responseData

                // Check the response of the retry attempt
                if (!response.ok) {
                    const retryErrorResponse = responseData as GeminiErrorResponse;
                    const retryErrorMessage = retryErrorResponse?.error?.message || `HTTP error! status: ${response.status}`;
                    console.error('Gemini API Error Response (after retry):', JSON.stringify(retryErrorResponse, null, 2));
                    // Throw error from the retry attempt
                    throw new Error(STRINGS.GEMINI_API_ERROR(`Retry failed: ${retryErrorMessage}`));
                }

                // If retry succeeded, responseData is now the successful response, proceed normally
                console.log('Gemini request succeeded after retry.');
                // The next call to this function will attempt to create a new cache since promptCacheName is now null.

            } else {
                // Not a cache error, or cache wasn't used, throw the original error
                throw new Error(STRINGS.GEMINI_API_ERROR(errorMessage));
            }
        }

        // If we reach here, response is OK (either initially or after retry)
        const geminiResponse = responseData as GeminiGenerateContentResponse;

        // Extract the text content from the first candidate
        const generatedText = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            console.error('Gemini response missing generated text:', JSON.stringify(geminiResponse, null, 2));
            throw new Error(STRINGS.GEMINI_NO_VALID_CONTENT);
        }

        console.log('Raw Gemini Response Text:', generatedText);

        // Capture debug info for response
        if (debugInfo && debugInfo.geminiResponse) {
            debugInfo.geminiResponse.rawResponse = generatedText;
            debugInfo.geminiResponse.processingTime = Date.now() - startTime;
        }

        // Attempt to parse the text as JSON (expecting ToshlEntryPayload)
        // Clean the text in case Gemini includes markdown backticks for JSON block
        let cleanedText = generatedText
            .replace(/^```(?:json|javascript|js)?\s*/gm, '') // Remove opening code blocks with various language identifiers
            .replace(/```\s*$/gm, '') // Remove closing code blocks
            .trim();
        
        // If the cleaned text doesn't start with {, try to extract JSON object
        if (!cleanedText.startsWith('{')) {
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedText = jsonMatch[0].trim();
            }
        }

        // Capture cleaned response in debug info
        if (debugInfo && debugInfo.geminiResponse) {
            debugInfo.geminiResponse.cleanedResponse = cleanedText;
        }

        try {
            // Parse the JSON to get the action object
            const result: GeminiResponseAction = JSON.parse(cleanedText);

            // Capture parsed result in debug info
            if (debugInfo && debugInfo.geminiResponse) {
                debugInfo.geminiResponse.parsedData = result as Record<string, unknown>;
            }

            // Validate the parsed structure based on the action
            switch (result.action) {
                case 'add': {
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
                }
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
                default: {
                    // If action is not one of the expected types
                    const unknownAction = (result as { action?: string })?.action || 'unknown';
                    console.error("Parsed JSON has unknown action:", result);
                    throw new Error(STRINGS.GEMINI_UNKNOWN_ACTION(unknownAction));
                }
            }

            return { result, debugInfo }; // Return the validated action object with debug info

        } catch (parseError) {
            console.error('Failed to parse or validate JSON from Gemini response:', parseError);
            console.error('Cleaned text that failed parsing/validation:', cleanedText);
            
            // Capture parse error in debug info
            if (debugInfo && debugInfo.errors) {
                debugInfo.errors.push(`JSON Parse Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }
            
            // Return a clarify action as a fallback? Or throw a more specific error?
            // Throwing error seems more appropriate to signal failure upstream.
            throw new Error(STRINGS.GEMINI_JSON_PARSE_VALIDATE_FAILED(generatedText));
        }
    } catch (error) {
        console.error('Error calling or processing Gemini API response:', error);
        throw error; // Re-throw the error
    }
}

// --- Context Caching API Functions ---

/**
 * List all available context caches.
 */
export async function listGeminiCaches(
    apiKey: string,
    pageSize?: number,
    pageToken?: string
): Promise<GeminiListCachesResponse> {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/cachedContents');
    url.searchParams.append('key', apiKey);
    if (pageSize !== undefined) url.searchParams.append('pageSize', pageSize.toString());
    if (pageToken) url.searchParams.append('pageToken', pageToken);
    console.log(`[Cache List] Fetching caches from ${url.toString()}`);
    const response = await fetch(url.toString());
    const data = await response.json();
    console.log(`[Cache List] Response status: ${response.status}`);
    console.log(`[Cache List] Response data:`, data);
    if (!response.ok) throw new Error(`Error listing caches: ${data.error?.message || response.status}`);
    return data as GeminiListCachesResponse;
}

/**
 * Create a new context cache.
 */
export async function createGeminiCache(
    apiKey: string,
    request: GeminiCreateCacheRequest
): Promise<GeminiCache> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`;
    // Normalize model name to required format
    const modelName = request.model.startsWith('models/') ? request.model : `models/${request.model}`;
    const body: {
        model: string;
        contents: unknown[];
        systemInstruction?: { text: string };
        ttl?: string;
    } = {
        model: modelName,
        contents: request.config.contents,
    };
    if (request.config.systemInstruction) {
        body.systemInstruction = { text: request.config.systemInstruction };
    }
    if (request.config.ttl) {
        body.ttl = request.config.ttl;
    }
    console.log(`[Cache Create] Request: model=${modelName}, ttl=${request.config.ttl || 'none'}, systemInstruction=${request.config.systemInstruction ? 'present' : 'none'}`);
    console.log(`[Cache Create] Sending POST to ${endpoint} with body:`, JSON.stringify(body, null, 2));
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log(`[Cache Create] Response status: ${response.status}`);
    console.log(`[Cache Create] Response data:`, data);
    if (!response.ok) throw new Error(`Error creating cache: ${data.error?.message || response.status}`);
    return data as GeminiCache;
}

/**
 * Update TTL or expireTime of an existing context cache.
 */
export async function updateGeminiCache(
    apiKey: string,
    request: GeminiUpdateCacheRequest
): Promise<GeminiCache> {
    const { name, config } = request;
    const updateMask = Object.keys(config).map(k => `config.${k}`).join(',');
    console.log(`[Cache Update] Request: name=${name}, updateMask=${updateMask}, config=${JSON.stringify(config)}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/${name}?updateMask=${updateMask}&key=${apiKey}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
    });
    const data = await response.json();
    console.log(`[Cache Update] Response status: ${response.status}`);
    console.log(`[Cache Update] Response data:`, data);
    if (!response.ok) throw new Error(`Error updating cache: ${data.error?.message || response.status}`);
    return data as GeminiCache;
}

/**
 * Delete a context cache.
 */
async function deleteGeminiCache(
    apiKey: string,
    name: string
): Promise<void> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`;
    console.log(`[Cache Delete] Sending DELETE to ${endpoint}`);
    const response = await fetch(endpoint, { method: 'DELETE' });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error deleting cache: ${error.error?.message || response.status}`);
    }
    console.log(`[Cache Delete] Successfully deleted cache ${name}`);
}

/**
 * Uploads an image to the Gemini Files API and returns the file URI.
 * @param apiKey - The Gemini API key.
 * @param base64Image - The base64 encoded image data (without data URL prefix).
 * @returns Promise that resolves to the file URI.
 */
export async function uploadImageToFilesAPI(apiKey: string, base64Image: string): Promise<string> {
    const uploadEndpoint = `${GEMINI_FILES_API_BASE}?key=${apiKey}`;

    // Extract base64 data from data URL if present
    let cleanBase64 = base64Image;
    let mimeType = 'image/jpeg'; // Default

    if (base64Image.startsWith('data:')) {
        const [header, data] = base64Image.split(',');
        cleanBase64 = data;
        // Extract MIME type from header
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }
    }

    // Convert base64 to blob
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', blob, 'uploaded_image.jpg');

    console.log('Uploading image to Files API...');

    try {
        const response = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Files API upload error response:', errorText);
            throw new Error(`Files API upload failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Files API upload successful:', data);

        // The response should contain the file object with uri
        if (data && data.file && data.file.uri) {
            return data.file.uri;
        } else {
            console.error('Unexpected Files API response format:', data);
            throw new Error('Invalid Files API response format');
        }
    } catch (error) {
        console.error('Error uploading to Files API:', error);
        throw error;
    }
}

/**
 * Uploads audio to the Gemini Files API and returns the file URI.
 * @param apiKey - The Gemini API key.
 * @param base64Audio - The base64 encoded audio data.
 * @param mimeType - The MIME type of the audio (e.g., 'audio/webm', 'audio/mp4').
 * @returns Promise that resolves to the file URI.
 */
export async function uploadAudioToFilesAPI(apiKey: string, base64Audio: string, mimeType: string): Promise<string> {
    const uploadEndpoint = `${GEMINI_FILES_API_BASE}?key=${apiKey}`;

    // Convert base64 to blob
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    // Create FormData for multipart upload
    const formData = new FormData();
    const fileName = mimeType.includes('webm') ? 'audio.webm' : 'audio.mp4';
    formData.append('file', blob, fileName);

    console.log('Uploading audio to Files API...');

    try {
        const response = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Files API audio upload error response:', errorText);
            throw new Error(`Files API audio upload failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Files API audio upload successful:', data);

        // The response should contain the file object with uri
        if (data && data.file && data.file.uri) {
            return data.file.uri;
        } else {
            console.error('Unexpected Files API response format:', data);
            throw new Error('Invalid Files API response format');
        }
    } catch (error) {
        console.error('Audio upload to Files API failed:', error);
        throw error;
    }
}

/**
 * Clears the currently stored Gemini prompt cache name and attempts to delete the cache on the server,
 * logging cache lists before and after for diagnostics.
 * @param apiKey - The Gemini API key needed to authorize the deletion and listing.
 */
export async function clearGeminiPromptCache(apiKey: string): Promise<void> {
    console.log(`[Cache Clear] Starting clearGeminiPromptCache. Local cacheName: ${promptCacheName}`);
    const cacheNameToDelete = promptCacheName; // Store the name before clearing the reference
    if (cacheNameToDelete) {
        console.log(`Attempting to clear Gemini prompt cache: ${cacheNameToDelete}`);

        // --- Log caches BEFORE deletion ---
        try {
            console.log("--- Listing caches BEFORE deletion attempt ---");
            const beforeCaches = await listGeminiCaches(apiKey);
            if (beforeCaches.caches && beforeCaches.caches.length > 0) { // Use .caches
                beforeCaches.caches.forEach((cache: GeminiCache) => console.log(`  - ${cache.name} (Model: ${cache.model}, Expires: ${cache.expireTime})`)); // Use .caches and add type
            } else {
                console.log("  No caches found.");
            }
            console.log("------------------------------------------");
        } catch (listError) {
            console.warn("Failed to list caches before deletion:", listError);
        }

        // --- Attempt deletion ---
        try {
            await deleteGeminiCache(apiKey, cacheNameToDelete);
            console.log(`Successfully requested deletion for Gemini cache ${cacheNameToDelete} from server.`);
        } catch (deleteError) {
            console.warn(`Failed to delete Gemini cache ${cacheNameToDelete} from server. It might have already expired or been deleted. Error:`, deleteError);
            // Proceed to clear local reference and list caches even if deletion fails
        } finally {
            promptCacheName = null; // Clear the local reference regardless of deletion success
            cacheAttempted = false; // Reset cacheAttempted so caching can be retried after clear
            console.log(`Cleared local Gemini prompt cache reference (was ${cacheNameToDelete}).`);

            // --- Log caches AFTER deletion attempt ---
            try {
                console.log("--- Listing caches AFTER deletion attempt ---");
                // Add a small delay in case deletion is not instantaneous on the server
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                const afterCaches = await listGeminiCaches(apiKey);
                if (afterCaches.caches && afterCaches.caches.length > 0) { // Use .caches
                    afterCaches.caches.forEach((cache: GeminiCache) => console.log(`  - ${cache.name} (Model: ${cache.model}, Expires: ${cache.expireTime})`)); // Use .caches and add type
                } else {
                    console.log("  No caches found.");
                }
                console.log("-----------------------------------------");
            } catch (listError) {
                console.warn("Failed to list caches after deletion:", listError);
            }
        }
    } else {
        console.log('No active Gemini prompt cache reference to clear.');
        // Optionally list existing caches even if no local reference exists
        try {
            console.log("--- Listing caches (no local reference to clear) ---");
            const currentCaches = await listGeminiCaches(apiKey);
            if (currentCaches.caches && currentCaches.caches.length > 0) { // Use .caches
                currentCaches.caches.forEach((cache: GeminiCache) => console.log(`  - ${cache.name} (Model: ${cache.model}, Expires: ${cache.expireTime})`)); // Use .caches and add type
            } else {
                console.log("  No caches found.");
            }
            console.log("--------------------------------------------------");
        } catch (listError) {
            console.warn("Failed to list caches:", listError);
        }
    }
}
