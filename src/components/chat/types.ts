import { ToshlBudget } from '../../lib/toshl'; // Import budget type

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
  // Added 'account_balance', 'account_balance_see_more', and 'budget_card' types
  type?: 'text' | 'entry_success' | 'entry_edit_success' | 'history_entry' | 'history_header' | 'error' | 'loading' | 'system_info' | 'history_see_more' | 'account_balance' | 'account_balance_see_more' | 'budget_card' | 'budget_header'; // Added budget_card and budget_header
  entryData?: EntryCardData; // Structured data for single entry cards
  accountBalanceData?: AccountBalanceCardData; // Re-added single card data field
  budgetData?: ToshlBudget; // Data for a single budget card
  // accountBalanceCarouselData?: AccountBalanceCardData[]; // Removed carousel data field
  fullEntryData?: EntryCardData[]; // Optional, only for 'history_see_more' type
  fullAccountBalanceData?: AccountBalanceCardData[]; // Optional, only for 'account_balance_see_more' type
  // budgetListData?: ToshlBudget[]; // Removed - will use individual budget_card messages
  isDeleted?: boolean; // Flag to indicate if an entry message has been deleted
  status?: 'sent' | 'pending' | 'error'; // Status for offline handling
  timestamp?: string; // ISO timestamp for message
  offlineId?: string; // Unique ID generated offline before sending
}

export interface ChatInterfaceProps {
  isSettingsOpen: boolean; // Receive state from parent
  toggleSettings: () => void; // Receive toggle function from parent
  hideNumbers: boolean; // Add hideNumbers prop
}

// Define structure for mention suggestions
export interface MentionSuggestion {
    id: string; // Toshl ID of the item
    name: string; // Display name
    type: 'category' | 'tag' | 'account'; // Type of item
}
