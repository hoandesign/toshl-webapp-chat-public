import { ToshlBudget } from '../../lib/toshl'; // Import budget type
import type {
  GeminiCache,
  GeminiListCachesResponse,
  GeminiCreateCacheRequest,
  GeminiUpdateCacheRequest
} from '../../lib/gemini/types';

// Define structure for entry data to be used in cards
export interface EntryCardData {
    date: string;
    type: 'Expense' | 'Income';
    amount: number; // Absolute value
    currency: string;
    category: string; // Name
    account?: string; // Name (for success message)
    tags?: string[]; // Names
    description?: string;
    id?: string; // Toshl Entry ID (for success message)
}

// Define structure for account balance data
export interface AccountBalanceCardData {
    name: string;
    balance: number;
    currency: string;
    type: string; // e.g., 'custom', 'cash'
    status?: string; // e.g., 'active'
    modified?: string; // ISO date string
    id: string; // Toshl Account ID
    initial_balance?: number;
    limit?: number;
    count?: number; // Number of entries
    order?: number; // Display order
    daily_sum_median?: { expenses?: number; incomes?: number }; // Added
    avg?: { expenses?: number; incomes?: number }; // Added
}

export interface Message {
  id: string;
  text?: string; // Optional for structured messages
  sender: 'user' | 'system' | 'bot';
  image?: string; // Optional base64 encoded image (AI processing version)
  imageId?: string; // Optional image cache ID for retrieving display version
  imageDisplayUrl?: string; // Optional cached display-optimized image URL
  imageMetadata?: {
    originalWidth?: number;
    originalHeight?: number;
    fileSize?: number;
    mimeType?: string;
    processedAt?: string; // ISO timestamp
  }; // Optional metadata for image display and caching
  audio?: string; // Optional base64 encoded audio data
  audioMetadata?: {
    duration?: number; // Duration in milliseconds
    fileSize?: number;
    mimeType?: string;
    processedAt?: string; // ISO timestamp
  }; // Optional metadata for audio display and processing
  // Added budget_card, budget_header, and context caching message types
  type?:
    | 'text'
    | 'entry_success'
    | 'entry_edit_success'
    | 'history_entry'
    | 'history_header'
    | 'error'
    | 'loading'
    | 'system_info'
    | 'history_see_more'
    | 'account_balance'
    | 'account_balance_see_more'
    | 'budget_card'
    | 'budget_header'
    | 'cache_list'
    | 'cache_created'
    | 'cache_updated'
    | 'cache_deleted';
  entryData?: EntryCardData; // Structured data for single entry cards
  accountBalanceData?: AccountBalanceCardData; // Re-added single card data field
  budgetData?: ToshlBudget; // Data for a single budget card
  cacheListData?: GeminiCache[]; // For 'cache_list'
  cacheData?: GeminiCache;     // For create/update/delete
  // accountBalanceCarouselData?: AccountBalanceCardData[]; // Removed carousel data field
  fullEntryData?: EntryCardData[]; // Optional, only for 'history_see_more' type
  fullAccountBalanceData?: AccountBalanceCardData[]; // Optional, only for 'account_balance_see_more' type
  // budgetListData?: ToshlBudget[]; // Removed - will use individual budget_card messages
  isDeleted?: boolean; // Flag to indicate if an entry message has been deleted
  status?: 'sent' | 'pending' | 'error'; // Status for offline handling
  timestamp?: string; // ISO timestamp for message
  offlineId?: string; // Unique ID generated offline before sending
  debugInfo?: DebugInfo; // Debug information for bot responses
}

// Debug information interface for troubleshooting
export interface DebugInfo {
  geminiRequest?: {
    model: string;
    userInput: string;
    chatHistory: Record<string, unknown>[];
    systemPrompt?: string;
    fullRequestBody?: Record<string, unknown>;
  };
  geminiResponse?: {
    rawResponse?: string;
    cleanedResponse?: string;
    parsedData?: Record<string, unknown>;
    processingTime?: number;
  };
  toshlRequests?: Array<{
    endpoint: string;
    method: string;
    payload?: Record<string, unknown>;
    response?: Record<string, unknown>;
    error?: string;
  }>;
  errors?: string[];
  timestamp: string;
}

export interface ChatInterfaceProps {
  isSettingsOpen: boolean; // Receive state from parent
  toggleSettings: () => void; // Receive toggle function from parent
  hideNumbers: boolean; // Add hideNumbers prop
  // Context caching handlers
  listCaches?: (pageSize?: number, pageToken?: string) => Promise<GeminiListCachesResponse>;
  createCache?: (request: GeminiCreateCacheRequest) => Promise<GeminiCache>;
  updateCache?: (request: GeminiUpdateCacheRequest) => Promise<GeminiCache>;
  deleteCache?: (name: string) => Promise<void>;
}

// Define structure for mention suggestions
export interface MentionSuggestion {
    id: string; // Toshl ID of the item
    name: string; // Display name
    type: 'category' | 'tag' | 'account'; // Type of item
}

// Define structure for image processing and caching
export interface ImageCacheEntry {
    id: string; // Unique cache ID
    displayUrl: string; // Cached display-optimized image URL
    originalUrl?: string; // Original image URL if different
    metadata: {
        width: number;
        height: number;
        fileSize: number;
        mimeType: string;
        cachedAt: string; // ISO timestamp
    };
}

// Define interface for image processing utilities
export interface ImageProcessor {
    resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string>;
    cacheImage(imageData: string, messageId: string, metadata: Partial<ImageCacheEntry['metadata']>): Promise<string>;
    getCachedImage(cacheId: string): Promise<string | null>;
    clearCache(): Promise<void>;
}

// Define structure for image validation
export interface ImageValidationResult {
    isValid: boolean;
    error?: string;
    metadata?: {
        width: number;
        height: number;
        fileSize: number;
        mimeType: string;
    };
}
