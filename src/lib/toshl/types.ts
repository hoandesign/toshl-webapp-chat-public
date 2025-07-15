// --- Toshl Data Types ---

export interface ToshlErrorResponse {
  error: string;
  description?: string;
}

export interface ToshlAccount {
  id: string;
  name: string;
  currency: { code: string; rate: number; main_rate?: number; fixed: boolean };
  balance: number;
  type: string; // e.g., 'cash', 'bank', 'custom'
  status?: string; // e.g., 'active', 'archived'
  modified?: string; // ISO timestamp string
  initial_balance?: number;
  limit?: number;
  count?: number; // Number of entries
  order?: number; // Display order
  daily_sum_median?: { expenses?: number; incomes?: number };
  avg?: { expenses?: number; incomes?: number };
  // ... other fields like review, deleted, recalculated
}

export interface ToshlCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  // ... other fields
}

export interface ToshlTag {
  id: string;
  name: string;
  type: 'expense' | 'income'; // Added based on API documentation
  category?: string; // Optional primary category ID
  // count?: number; // Optional usage count
  // deleted?: boolean; // Optional deleted status
  // ... other fields like modified, counts, meta_tag, extra
}

// --- Payload Structures for API Calls ---

// Payload structure for adding/updating repeats (subset of ToshlEntry['repeat'])
export interface ToshlRepeatPayload {
    start: string; // YYYY-MM-DD
    frequency: string; // 'daily' | 'weekly' | 'monthly' | 'yearly' - Use string for broader compatibility with ToshlEntry
    interval?: number; // >= 1 - Make optional to align with ToshlEntry, validation happens in addToshlEntry
    end?: string; // YYYY-MM-DD, optional
    count?: number; // Optional, alternative to end
    byday?: string; // Optional: MO,TU,WE,TH,FR,SA,SU (comma-separated, with optional +/- prefix like 1MO, -1MO)
    bymonthday?: string; // Optional: 1-31 (comma-separated, with optional +/- prefix)
    bysetpos?: string; // Optional: Nth occurrence (comma-separated)
    // 'template' and 'iteration' are typically read-only from the API
}

// Payload structure for adding/updating location (subset of ToshlEntry['location'])
export interface ToshlLocationPayload {
    latitude: number;
    longitude: number;
    venue_id?: string; // Optional Foursquare venue ID
    // 'id' is typically read-only from the API
}

// Payload structure for adding/updating transactions (subset of ToshlEntry['transaction'])
export interface ToshlTransactionPayload {
    account: string; // Companion account ID *required*
    currency: { code: string }; // Companion currency *required*
    amount?: number; // Optional: Amount in companion currency (if different from entry amount)
    rate?: number; // Optional: Exchange rate if fixed
    fixed?: boolean; // Optional: Default false
    // 'id', 'main_rate' are typically read-only
}

// Payload structure for adding/updating reminders (subset of ToshlEntry['reminders'])
export interface ToshlReminderPayload {
    period: string; // 'day' | 'week' | 'month' | 'year' - Use string for broader compatibility
    number: number; // >= 0
    at: string; // HH:mm:ss
}

// Base payload for creating/updating entries
export interface ToshlEntryPayload {
    amount: number; // Negative for expense, positive for income
    currency: { code: string };
    date: string; // YYYY-MM-DD
    account: string; // Account ID
    category: string; // Category ID
    tags?: string[]; // Array of Tag IDs
    desc?: string; // Description
    repeat?: ToshlRepeatPayload; // Optional: For adding repeating entries
    location?: ToshlLocationPayload; // Optional: For adding location
    transaction?: ToshlTransactionPayload; // Optional: For adding transfers
    reminders?: ToshlReminderPayload[]; // Optional: For adding reminders
    completed?: boolean; // Optional: For marking completed status
}

// --- API Response Structures ---

// Define Toshl Entry structure received from API (extends the payload)
export interface ToshlEntry {
    id: string;
    amount: number; // Negative for expense, positive for income
    currency: { code: string; rate: number; main_rate?: number; fixed: boolean };
    date: string; // YYYY-MM-DD
    desc?: string; // Description
    account: string; // Account ID
    category: string; // Category ID
    tags?: string[]; // Array of Tag IDs
    location?: ToshlLocationPayload; // Optional: For adding location
    modified: string; // ISO timestamp string e.g., "2025-01-26 17:13:58.252"
    created: string; // ISO timestamp string e.g., "2025-01-26T17:13:58Z"
    completed: boolean;
    deleted: boolean;
    repeat?: { // Optional repeat info
        id: string;
        start: string; // YYYY-MM-DD
        frequency: string; // e.g., 'monthly'
        interval?: number;
        bymonthday?: string; // e.g., "28,29"
        bysetpos?: string; // e.g., "-1"
        iteration?: number;
        template?: boolean;
        type?: string; // e.g., "confirmed"
        status?: string; // e.g., "ok"
    };
    transaction?: { // Optional transaction info for transfers
        id: string;
        amount: number;
        account: string;
        currency: { code: string; rate: number; fixed: boolean };
    };
    split?: { // Optional split info
        parent: string;
        children: string[];
    };
    reminders?: { // Optional reminders
        period: string; // e.g., "day"
        number: number;
        at: string; // HH:MM:SS
    }[];
    // Add other fields like location if needed based on full API spec
}

// Type for the sum/count object within daily sums
export interface ToshlSumDetail {
    sum: number;
    count: number;
}

// Type for a single day's sum entry
export interface ToshlDailySum {
    day: string; // YYYY-MM-DD
    expenses?: ToshlSumDetail; // Optional because a day might only have income
    incomes?: ToshlSumDetail; // Optional because a day might only have expense
    modified: string; // ISO 8601 timestamp
}

// Type for the response of the /entries/sums endpoint (an array of daily sums)
export type ToshlDailySumsResponse = ToshlDailySum[];

// Define Toshl Budget structure based on MCP server output/logic
export interface ToshlBudget {
    id: string; // ID for the specific budget period (e.g., "1743771-7")
    parent?: string; // ID of the parent recurring budget (e.g., "1743771-0")
    name: string;
    limit: number; // The budgeted amount for this period
    limit_planned?: number;
    amount: number; // The amount spent/earned in this period
    planned?: number;
    history_amount_median?: number;
    currency: { code: string; rate?: number; fixed?: boolean };
    from: string; // Start date of this period (YYYY-MM-DD)
    to: string; // End date of this period (YYYY-MM-DD)
    rollover: boolean;
    rollover_override?: boolean;
    rollover_amount?: number;
    rollover_amount_planned?: number;
    modified: string; // ISO timestamp string
    recurrence?: { // Details if it's a recurring budget period
        frequency: string; // e.g., 'monthly', 'yearly', 'one-time'
        interval?: number;
        start: string; // Start date of the *entire* recurrence
        end?: string; // End date of the *entire* recurrence (for one-time)
        byday?: string;
        bymonthday?: string;
        bysetpos?: string;
        iteration?: number; // Which iteration this period is
    };
    status?: string; // e.g., 'active'
    type?: string; // e.g., 'regular', 'percent'
    percent?: number; // If type is 'percent'
    order?: number;
    categories?: string[]; // Array of category IDs
    '!categories'?: string[]; // Excluded category IDs
    tags?: string[]; // Array of tag IDs
    '!tags'?: string[]; // Excluded tag IDs
    accounts?: string[]; // Array of account IDs
    '!accounts'?: string[]; // Excluded account IDs
    deleted?: boolean;
    recalculated?: boolean;
    // Removed current_period as amount/limit are top-level per period
}


// --- Filter Structures ---

// Filters for fetching entries: 'from' and 'to' are REQUIRED by Toshl API.
export interface FetchEntriesFilters {
    from: string; // YYYY-MM-DD *Required*
    to: string; // YYYY-MM-DD *Required*
    accounts?: string[]; // Array of account IDs
    categories?: string[]; // Array of category IDs to *include*
    "!categories"?: string[]; // Array of category IDs to *exclude*
    tags?: string[]; // Array of tag IDs to *include* (any match)
    tags_exclude?: string[]; // Array of tag IDs to *exclude* (kept for compatibility)
    "!tags"?: string[]; // Array of tag IDs to *exclude* (preferred)
    tags_include_mode?: 'any' | 'all'; // Default 'any'
    type?: 'expense' | 'income'; // Filter by type
    search?: string; // Search term for description
    pending?: boolean; // Filter by pending status
    starred?: boolean; // Filter by starred status (if applicable, check API docs)
    repeat_status?: 'template' | 'instance' | 'all'; // Filter repeating entries (check exact API param name)
    min_amount?: number;
    max_amount?: number;
    // Add other potential filters based on full API spec: page, per_page (handled by fetchFromToshl), order, etc.
}

// --- User Profile Type ---

export interface ToshlUserProfile {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    joined: string; // ISO date-time
    modified: string; // ISO date-time
    pro?: {
        level?: 'pro' | 'medici';
        since?: string; // ISO date-time
        until?: string; // ISO date-time
        payment?: {
            id?: string;
            provider?: 'apple' | 'google' | 'microsoft' | 'g2s' | 'adyen' | 'amazon' | 'bitpay' | 'paypal' | 'unknown';
            next?: string; // ISO date-time
            trial?: boolean;
        };
        trial?: {
            start?: string; // ISO date-time
            end?: string; // ISO date-time
        };
        remaining_credit?: number;
        vat?: {
            name: string;
            address: string;
            city: string;
            post: string;
            state?: string;
            country: string;
            vat: string;
        };
        partner?: {
            name?: string;
            start?: string; // ISO date-time
            end?: string; // ISO date-time
        }[];
        trial_eligible?: boolean;
    };
    currency: {
        main: string; // Main currency code (e.g., "USD")
        update?: 'historical' | 'custom' | 'sign';
        update_accounts?: boolean;
        custom_exchange_rate?: number;
        custom?: {
            code: string;
            rate: number;
            fixed: boolean;
        };
        reference_currency?: string;
    };
    start_day: number; // 1-31
    notifications?: number;
    social?: ('toshl' | 'google' | 'facebook' | 'twitter' | 'evernote' | 'foursquare' | 'etalio' | 'flickr' | 'apple')[];
    steps?: ('income' | 'expense' | 'budget' | 'budget_category')[];
    migration?: {
        finished?: boolean;
        date_migrated?: string; // ISO date-time
        revert_until?: string; // ISO date-time
    };
    limits?: {
        accounts?: boolean;
        budgets?: boolean;
        images?: boolean;
        import?: boolean;
        bank?: boolean;
        repeats?: boolean;
        reminders?: boolean;
        export?: boolean;
        pro_share?: boolean;
        passcode?: boolean;
        planning?: boolean;
        locations?: boolean;
    };
    locale?: string;
    language?: string;
    timezone?: string;
    country?: string; // 2-letter code
    otp_enabled?: boolean;
    flags?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: Record<string, any>; // Custom JSON object
}
