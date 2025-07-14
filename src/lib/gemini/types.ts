import { ToshlEntryPayload } from '../toshl'; // Import necessary base type

// Define the structure for chat history messages passed to Gemini
export interface GeminiChatMessage {
    sender: 'user' | 'bot'; // Simplified sender types for the prompt
    text: string;
    image?: string; // Optional base64 encoded image
}

// Define the possible structured responses from Gemini based on the new prompt
export type GeminiAddAction = {
  action: 'add';
  payload: ToshlEntryPayload;
  headerText?: string; // Optional confirmation text
};

// Define the filters structure expected within the 'show' action
export interface GeminiShowFilters {
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    accounts?: string[];
    categories?: string[];
    tags?: string[];
    tags_exclude?: string[]; // Keep existing exclude for compatibility if needed, but prefer !tags
    tags_include_mode?: 'any' | 'all';
    "!categories"?: string[]; // Add exclusion filter for categories
    "!tags"?: string[]; // Add exclusion filter for tags
    type?: 'expense' | 'income';
    search?: string;
    repeat_status?: 'template' | 'instance' | 'all';
    min_amount?: number;
    max_amount?: number;
}

export type GeminiShowAction = {
  action: 'show';
  filters: GeminiShowFilters;
  headerText: string;
};

export type GeminiClarifyAction = {
  action: 'clarify';
  message: string;
};

// Define the structure for the 'edit' action
export type GeminiEditAction = {
    action: 'edit';
    entryId: string; // The ID of the entry to edit
    updatePayload: Partial<ToshlEntryPayload>; // Fields to update
    headerText: string; // Confirmation text for the edit
};

// Define the structure for the 'info' action (answering questions about setup/API)
export type GeminiInfoAction = {
    action: 'info';
    headerText: string; // The natural language answer
};

// Define the structure for the 'get_account_balances' action
export type GeminiGetAccountBalancesAction = {
    action: 'get_account_balances';
    headerText: string; // Confirmation/summary text
    accountName?: string; // Optional specific account name requested
};

// Define the structure for the 'show_budgets' action
export type GeminiShowBudgetsAction = {
    action: 'show_budgets';
    headerText: string; // Confirmation/summary text
    from?: string; // Optional start date (YYYY-MM-DD)
    to?: string;   // Optional end date (YYYY-MM-DD)
};

// Union type for all possible valid Gemini response actions
export type GeminiResponseAction = GeminiAddAction | GeminiShowAction | GeminiClarifyAction | GeminiEditAction | GeminiInfoAction | GeminiGetAccountBalancesAction | GeminiShowBudgetsAction;

// Interfaces for raw Gemini API request/response structures
export interface GeminiContentPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string; // base64 encoded image data
    };
}

export interface GeminiContentTurn {
    role?: 'user' | 'model'; // Role for conversational context
    parts: GeminiContentPart[];
}

// Define the structure for generation configuration options
export interface GeminiGenerationConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    responseMimeType?: string; // e.g., "application/json"
}

export interface GeminiGenerateContentRequest {
    contents: GeminiContentTurn[];
    generationConfig?: GeminiGenerationConfig; 
    cachedContent?: string; // Optional reference to context cache
    // safetySettings can also be added
}

export interface GeminiGenerateContentResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: {
        category: string;
        probability: string;
    }[];
  }[];
  promptFeedback?: { // Optional, depends on API version/response
     safetyRatings: {
        category: string;
        probability: string;
    }[];
  }
}

// Interfaces for Gemini API error structures
export interface GeminiErrorDetail {
    '@type': string;
    reason: string;
    domain: string;
    metadata: { service: string };
}

export interface GeminiErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: GeminiErrorDetail[];
    }
}

// --- Context Caching Types ---
/**
 * Metadata about cached tokens usage.
 */
export interface GeminiCacheUsageMetadata {
    cachedTokenCount: number;
}

/**
 * Represents a context cache resource.
 */
export interface GeminiCache {
    name: string;
    model: string;
    displayName?: string;
    usageMetadata: GeminiCacheUsageMetadata;
    createTime: string;
    updateTime: string;
    expireTime: string;
}

/**
 * Response for listing caches.
 */
export interface GeminiListCachesResponse {
    caches: GeminiCache[];
    nextPageToken?: string;
}

/**
 * Request body for creating a cache.
 */
export interface GeminiCreateCacheRequest {
    model: string;
    config: {
        contents: GeminiContentTurn[];
        systemInstruction?: string;
        ttl?: string;
    };
}

/**
 * Request body for updating cache TTL or expireTime.
 */
export interface GeminiUpdateCacheRequest {
    name: string;
    config: {
        ttl?: string;
        expireTime?: string;
    };
}
