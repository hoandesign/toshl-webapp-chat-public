// src/constants/strings.ts

// General
export const CLOSE = "Close";
export const SAVE = "Save";
export const FETCHING_DATA = "Fetching Data...";
export const PROCESSING = "Processing...";
export const UNKNOWN_ERROR = "An unknown error occurred.";

// Toshl Types (used in components)
export const INCOME_TYPE = "Income";
export const EXPENSE_TYPE = "Expense"; // Adding Expense too for consistency

// Settings Page
export const SETTINGS_TITLE = "Settings";
export const CLOSE_SETTINGS_TITLE = "Close Settings";
export const TOSHL_API_KEY_LABEL = "Toshl API Key";
export const TOSHL_API_KEY_PLACEHOLDER = "Enter your Toshl API Key (used as username)";
export const TOSHL_PASSWORD_LABEL = "Toshl Password (if required for Basic Auth)";
export const TOSHL_PASSWORD_PLACEHOLDER = "Enter Toshl Password (leave blank if not needed)";
export const TOSHL_PASSWORD_HELP_TEXT = "Used with API Key for Basic Auth.";
export const GEMINI_API_KEY_LABEL = "Gemini API Key";
export const GEMINI_API_KEY_PLACEHOLDER = "Enter your Gemini API Key";
export const DEFAULT_CURRENCY_LABEL = "Default Currency";
export const DEFAULT_CURRENCY_PLACEHOLDER = "e.g., VND, USD";
export const DEFAULT_CURRENCY_HELP_TEXT = "Default: VND";
export const GEMINI_MODEL_LABEL = "Gemini Model";
export const GEMINI_MODEL_HELP_TEXT = "Default: gemini-2.0-flash"; // Update if default changes
export const SETUP_TOSHL_BUTTON = "Setup Accounts, Categories & Tags";
export const SAVE_SETTINGS_BUTTON = "Save Settings";
export const CLEAR_CHAT_HISTORY_BUTTON = "Clear Chat History"; // Added
export const HIDE_NUMBERS_LABEL = "Hide Numbers"; // Added
export const HIDE_NUMBERS_HELP_TEXT = "Hide all monetary values in the chat interface."; // Added
export const USE_GEMINI_CACHE_LABEL = "Use Gemini Context Cache (Experimental)"; // Toggle for context cache
export const USE_GEMINI_CACHE_HELP_TEXT = "Enable reusing Gemini context cache. Note: unstable feature."; // Help text for context cache toggle
export const SETTINGS_SAVED_ALERT = "Settings saved!";
export const TOSHL_API_KEY_REQUIRED_ALERT = "Please enter your Toshl API key first.";
export const UNKNOWN_TOSHL_SETUP_ERROR = "An unknown error occurred during Toshl setup.";


// Chat Interface
export const CHAT_TITLE = "Toshl Assistant";
export const SETTINGS_BUTTON_TITLE = "Settings";
export const FETCH_HISTORY_BUTTON_TITLE = "Fetch Last 7 Days History";
export const SEND_MESSAGE_ARIA_LABEL = "Send message";
export const MESSAGE_PLACEHOLDER = "Add expense or show your history...";
export const ENTRY_ADDED_SUCCESSFULLY = "Entry Added Successfully";
export const ERROR_FETCHING_ENTRIES_PREFIX = "Error fetching entries:";
export const UNKNOWN_ERROR_FETCHING_ENTRIES = "Unknown error fetching entries.";
export const ERROR_PROCESSING_MESSAGE_PREFIX = "Error processing message via Gemini or Toshl:";
export const CLARIFICATION_MESSAGE_PREFIX = "I'm sorry, I couldn't understand";

// Chat Bottom Sheet
export const ENTRIES_LIST_TITLE = "Entries List";
export const ACCOUNTS_LIST_TITLE = "Account Balances"; // Added
export const CLOSE_LIST_VIEW_TITLE = "Close list view";
export const NO_ENTRIES_TO_DISPLAY = "No entries to display.";
export const NO_ACCOUNTS_TO_DISPLAY = "No accounts to display."; // Added

// useChatLogic Hook
export const INITIAL_GREETING = "Hello! How can I help you log your expenses today?";
export const THINKING = "Thinking...";
export const TOSHL_API_KEY_NOT_CONFIGURED = "Toshl API key not configured.";
export const API_KEYS_NOT_CONFIGURED = "API keys not configured. Please go to Settings.";
export const TOSHL_DATA_NOT_FETCHED = "Toshl data not fetched. Please run Toshl Setup in Settings.";
export const FAILED_LOAD_TOSHL_DATA = "Failed to load Toshl data. Try Toshl Setup again.";
export const NO_ACCOUNTS_OR_CATEGORIES = "No Toshl accounts or categories found.";
export const UNKNOWN_CATEGORY = "Unknown Category";
export const UNKNOWN_ACCOUNT = "Unknown Account";
export const DEFAULT_CURRENCY_VALUE = "VND"; // Default currency code
export const DEFAULT_GEMINI_MODEL_VALUE = "gemini-pro"; // Default model name
export const TOSHL_ENTRY_CREATED_NO_ID = "created_no_id"; // Special status string
export const ENTRIES_DEFAULT_HEADER = "Entries";
export const SUM_PLACEHOLDER = "[SUM_PLACEHOLDER]";
export const INTERNAL_DATE_ERROR = "Internal error: 'from' and 'to' dates missing.";
export const UNEXPECTED_GEMINI_ACTION = "Received unexpected action from Gemini processing.";
export const GENERIC_ERROR_PREFIX = "Error: ";
export const CANNOT_DELETE_MISSING_ID_CONSOLE = "Cannot delete entry: Invalid or missing Toshl Entry ID.";
export const ERROR_CANNOT_DELETE_MISSING_ID = "Error: Cannot delete entry (missing ID)";
export const UNKNOWN_DELETION_ERROR = "Unknown error during deletion.";
export const ERROR_DELETING_ENTRY_PREFIX = "Error deleting entry: ";
export const ENTRY_DELETED_SUCCESS = (entryId: string) => `Entry ${entryId} deleted.`; // Function for dynamic string
export const ENTRY_CARD_REMOVED_UPDATED = (entryId: string) => `Entry card removed (updated). ID: ${entryId}`; // Function for dynamic string
export const ENTRY_UPDATED_FETCH_DETAILS_FAILED = (entryId: string) => `Successfully updated entry ${entryId}. (Could not fetch details)`; // Function for dynamic string
export const ENTRY_UPDATED_FETCH_DETAILS_ERROR = (entryId: string) => `Successfully updated entry ${entryId}. (Error fetching details)`; // Function for dynamic string
export const HISTORY_HEADER_DATE_RANGE = (from: string, to: string) => `Entries from ${from} to ${to} ---`; // Function for dynamic string
export const HISTORY_HEADER_LAST_DAYS = (days: number) => `Here are your entries from last ${days} days`; // Function for dynamic string
export const HISTORY_NO_ENTRIES_FOR_PERIOD = (from: string, to: string) => `No entries found for the specified period (${from} to ${to}).`; // Function for dynamic string
export const HISTORY_NO_ENTRIES_MATCHING = (header: string) => `No entries found matching your criteria. (${header})`; // Function for dynamic string
export const HISTORY_NO_REPEATING_ENTRIES_MATCHING = (header: string) => `No repeating entries found matching your criteria. (${header})`; // Function for dynamic string
export const SHOW_MORE_ENTRIES = (count: number) => `See ${count} more entries...`; // Function for dynamic string
export const SHOW_MORE_ACCOUNTS = (count: number) => `See ${count} more accounts...`; // Function for dynamic string
export const SEE_MORE_ENTRIES_TEXT = (count: number) => `See all ${count} entries`; // Function for dynamic string

// Console specific (optional to make constants)
export const CONSOLE_WARN_DEFAULT_DATE_RANGE = "Using default date range as Gemini didn't provide dates with header.";
export const CONSOLE_INFO_APPLYING_DEFAULT_DATE = (from: string, to: string) => `Applying default date range: ${from} to ${to}`;
export const CONSOLE_INFO_MANUAL_SUM = (count: number, sum: string) => `Manually Calculated Sum from ${count} entries: ${sum}`;
export const CONSOLE_INFO_HEADER_AFTER_SUM = (header: string) => `Header text after manual sum replacement: ${header}`;
export const CONSOLE_ERROR_MANUAL_SUM = "Error calculating sum manually from filtered entries:";

// Message Renderer
export const ENTRY_DELETED_FALLBACK = "Entry deleted.";
export const ENTRY_ID_PREFIX = "ID: ";
export const DELETE_ENTRY_BUTTON_TITLE = "Delete this entry (API & Local)"; // Updated title
export const DELETE_MESSAGE_BUTTON_TITLE = "Delete this message (Local only)"; // New title for local delete
export const COPY_MESSAGE_BUTTON_TITLE = "Copy message text"; // New title for copy
export const DELETE_ENTRY_BUTTON_TEXT = "Delete Entry"; // Keep for API delete button
export const HISTORY_SUMMARY_TITLE = "Summary:";

// Chat Interface Specific
export const TOSHL_LOGO_ALT = "Toshl Logo";
export const SHOW_AS_LIST_BUTTON_TITLE = "Show entries as a list";
export const SHOW_AS_LIST_BUTTON_TEXT = "Show as list";

// Gemini API Client (lib/gemini.ts)
export const GEMINI_API_KEY_MODEL_REQUIRED = "Gemini API key and model name are required.";
export const TOSHL_CATEGORIES_REQUIRED = "Toshl categories are required for Gemini processing.";
export const TOSHL_ACCOUNTS_REQUIRED = "At least one Toshl account is required for Gemini processing.";
export const GEMINI_API_ERROR = (message: string) => `Gemini API Error: ${message}`;
export const GEMINI_NO_VALID_CONTENT = "Gemini did not return valid content.";
export const GEMINI_INVALID_ADD_PAYLOAD = "Parsed JSON for 'add' action is missing required fields, has incorrect types, or invalid optional fields.";
export const GEMINI_INVALID_SHOW_PAYLOAD = "Parsed JSON for 'show' action is missing required 'filters' object or 'headerText' string.";
export const GEMINI_INVALID_SHOW_FROM_DATE = "Parsed 'show' action has invalid 'from' date format.";
export const GEMINI_INVALID_SHOW_TO_DATE = "Parsed 'show' action has invalid 'to' date format.";
export const GEMINI_INVALID_CLARIFY_PAYLOAD = "Parsed JSON for 'clarify' action is missing the message field.";
export const GEMINI_INVALID_EDIT_PAYLOAD = "Parsed JSON for 'edit' action is missing required fields (entryId, updatePayload, headerText) or updatePayload is empty.";
export const GEMINI_INVALID_INFO_PAYLOAD = "Parsed JSON for 'info' action is missing the required 'headerText' field.";
export const GEMINI_INVALID_GET_BALANCE_PAYLOAD = "Parsed JSON for 'get_account_balances' action is missing 'headerText' or has invalid 'accountName'.";
export const GEMINI_UNKNOWN_ACTION = (action: string) => `Parsed JSON from Gemini has an unknown action: ${action}`;
export const GEMINI_JSON_PARSE_VALIDATE_FAILED = (rawText: string) => `Failed to parse or validate JSON response from Gemini. Raw text: ${rawText}`;

// Toshl API Client (lib/toshl.ts)
export const TOSHL_API_KEY_REQUIRED = "Toshl API key is required.";
export const TOSHL_FETCH_REQUIRES_DATES = "The 'from' and 'to' date filters are required to fetch entries.";
export const TOSHL_ENTRY_ID_REQUIRED_FETCH = "Toshl entry ID is required to fetch.";
export const TOSHL_ENTRY_ID_REQUIRED_EDIT = "Toshl entry ID is required for editing.";
export const TOSHL_ENTRY_ID_REQUIRED_DELETE = "Toshl entry ID is required for deletion.";
export const TOSHL_EDIT_PAYLOAD_EMPTY = "Update payload cannot be empty.";
export const TOSHL_ADD_MISSING_FIELDS = "Missing required fields in Toshl entry payload (account, category, date, amount, currency.code).";
export const TOSHL_ADD_MISSING_REPEAT_FIELDS = "Missing required fields in repeat payload (start, frequency, interval).";
export const TOSHL_ADD_MISSING_TRANSACTION_FIELDS = "Missing required fields in transaction payload (account, currency.code).";
export const TOSHL_HTTP_ERROR = (status: number | string) => `HTTP error! status: ${status}`;
export const TOSHL_API_ERROR_DESC = (descOrError: string, status: number | string) => `Toshl API Error: ${descOrError} (Status: ${status})`;
export const TOSHL_API_ERROR_FIELD = (field: string, error: string) => ` (Field: ${field || 'unknown'}, Error: ${error || 'unknown'})`;
export const TOSHL_API_ERROR_STATUS_SUFFIX = (status: number | string) => ` (Status: ${status})`;
export const TOSHL_UNEXPECTED_DELETE_STATUS = (status: number | string) => `Unexpected status code during delete: ${status}`;
export const TOSHL_UNEXPECTED_STATUS = (status: number | string) => `Unexpected status code: ${status}`;

// Settings Logic Hook (useSettingsLogic.ts)
export const TOSHL_SETUP_SUCCESS_ALERT = (accounts: number, categories: number, tags: number) => `Successfully fetched ${accounts} accounts, ${categories} categories, and ${tags} tags from Toshl!`;
export const TOSHL_SETUP_FAILED_ALERT = (error: string) => `Toshl setup failed: ${error}`;

// Gemini Prompt Construction (lib/gemini/prompt.ts)
export const INCOME_TYPE_FILTER = "income";
export const EXPENSE_TYPE_FILTER = "expense";
export const INCOME_CATEGORY_FORMAT = (name: string, id: string) => `- ${name} (Income Category ID: ${id})`;
export const EXPENSE_CATEGORY_FORMAT = (name: string, id: string) => `- ${name} (Expense Category ID: ${id})`;
export const INCOME_TAG_FORMAT = (name: string, id: string) => `- ${name} (Income Tag ID: ${id})`;
export const EXPENSE_TAG_FORMAT = (name: string, id: string) => `- ${name} (Expense Tag ID: ${id})`;
export const PERSONAL_ACCOUNT_NAME = "personal";
export const PROMPT_ERROR_NO_DEFAULT_ACCOUNT = "Cannot construct Gemini prompt: No default account found.";
export const DEFAULT_ACCOUNT_INFO_FORMAT = (name: string, id: string) => `Default Account: ${name} (ID: ${id})`;
export const DATE_LOCALE_EN_CA = "en-CA";
export const TIME_LOCALE_EN_US = "en-US";
export const CHAT_HISTORY_SECTION_HEADER = "## Recent Chat History (for context):";
export const CHAT_HISTORY_USER_PREFIX = "User";
export const CHAT_HISTORY_ASSISTANT_PREFIX = "Assistant";
export const CHAT_HISTORY_LINE_FORMAT = (sender: string, text: string) => `${sender}: ${text}`;
export const CHAT_HISTORY_SEPARATOR = "\n---";
export const CHAT_HISTORY_EMPTY = "No previous messages in this session.";
export const LAST_SHOW_CONTEXT_SECTION_HEADER = "## Context from Last \"Show Entries\" Request:";
export const LAST_SHOW_CONTEXT_FORMAT = (header: string, filters: string) => `Header: ${header}\nFilters Used: ${filters}`;
export const LAST_SHOW_CONTEXT_EMPTY = "No previous \"show\" request in this session.";
export const LAST_ENTRY_ID_SECTION_HEADER = "## Last Successfully Added/Edited Entry ID (for potential edits):";
export const LAST_ENTRY_ID_FORMAT = (id: string) => `${id}`;
export const LAST_ENTRY_ID_EMPTY = "None in this session.";
export const PROMPT_SPLIT_MARKER = "**Action-Specific JSON Structures & Rules:**";

// Offline Mode Specific Strings
export const ERROR_OFFLINE_HISTORY = "Cannot fetch history while offline.";
export const ERROR_OFFLINE_DELETE = "Cannot delete entry while offline.";
export const ERROR_OFFLINE_RETRY = "Cannot retry message while offline.";
export const ERROR_RETRY_FAILED = "Retry failed:"; // Error message will be appended

// Account Balance Feature Strings
export const BALANCE_ACCOUNT_NOT_FOUND = (accountName: string) => `Sorry, I couldn't find an account matching "${accountName}".`;
export const BALANCE_NO_ACCOUNTS_FOUND = "Sorry, I couldn't find any accounts to show balances for.";

// Budget Strings
export const BUDGETS_NO_BUDGETS_FOUND = "You don't seem to have any active budgets set up.";
export const BUDGETS_FETCH_ERROR = "Oops! Something went wrong while fetching your budgets.";
export const CONSOLE_ERROR_FETCHING_BUDGETS = "Error fetching Toshl budgets:";

// Markdown Table Formatting Constants (for Gemini Prompt)
export const MARKDOWN_TABLE_HEADER = '| Name | ID |';
export const MARKDOWN_TABLE_SEPARATOR = '|---|---|';
export const MARKDOWN_TABLE_EMPTY = '(No items of this type)';

// Settings Logic Hook (useSettingsLogic.ts) - Additional
export const TOSHL_CURRENCY_UPDATE_SUCCESS = "Toshl profile currency updated successfully.";
export const TOSHL_CURRENCY_UPDATE_FAILED = (error: string) => `Failed to update Toshl profile currency: ${error}`;
export const SETTINGS_SAVED_SUCCESS = "Settings saved successfully.";

// Image Processing Error Messages
export const IMAGE_INVALID_FILE_TYPE = "Please select a valid image file (JPEG, PNG, GIF, WebP).";
export const IMAGE_FILE_TOO_LARGE = (maxSizeMB: number) => `Image file is too large. Maximum size allowed is ${maxSizeMB}MB.`;
export const IMAGE_PROCESSING_FAILED = "Failed to process the image. Please try again with a different image.";
export const IMAGE_RESIZE_FAILED = "Failed to resize the image. Please try with a smaller image.";
export const IMAGE_CACHE_FAILED = "Failed to cache the image. The image will still be sent but may not display properly.";
export const IMAGE_CACHE_UNAVAILABLE = "Cached image unavailable. Displaying placeholder.";
export const IMAGE_DISPLAY_ERROR = "Unable to display image";
export const IMAGE_LOAD_FAILED = "Failed to load image";
export const IMAGE_DIMENSIONS_INVALID = "Image dimensions are invalid or too large.";
export const IMAGE_CORRUPTED = "The selected image appears to be corrupted or invalid.";
export const IMAGE_UNSUPPORTED_FORMAT = "This image format is not supported. Please use JPEG, PNG, GIF, or WebP.";
export const IMAGE_CACHE_STORAGE_FULL = "Image cache storage is full. Some older images may not display properly.";
export const IMAGE_PROCESSING_TIMEOUT = "Image processing timed out. Please try with a smaller image.";
