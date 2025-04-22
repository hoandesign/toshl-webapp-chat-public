# Toshl WebApp Chat - Application Logic

This document details the architecture and logic flow of the Toshl WebApp Chat application.

## Core Components

-   **`App.tsx`**: The main component responsible for:
    -   Overall layout and structure.
    -   Conditional rendering of `ChatInterface` and `SettingsPage`.
    -   Managing the Settings sidebar's visibility.
-   **`ChatInterface.tsx`**: Renders the chat interface:
    -   Displays the header, message list, and input form.
    -   Delegates chat logic to the `useChatLogic` hook.
-   **`SettingsPage.tsx`**: Renders the settings interface.
    -   Allows users to configure API keys, currency, and Gemini model.
    -   Delegates settings logic to the `useSettingsLogic` hook.
-   **`useChatLogic.ts`**: A custom React hook that manages the chat UI's logic and state:
    -   Manages messages, input, loading states, mentions, and offline status.
    -   Handles user input and interacts with the Gemini and Toshl APIs via `apiHandler.ts`.
-   **`apiHandler.ts`**: Acts as an intermediary between the UI and the APIs:
    -   Orchestrates calls to the Gemini and Toshl libraries (`lib/gemini.ts`, `lib/toshl.ts`).
    -   Fetches API keys and Toshl metadata from `localStorage`.
-   **`useSettingsLogic.ts`**: A custom React hook for managing settings:
    -   Handles API key input and validation.
    -   Fetches and stores Toshl metadata (accounts, categories, tags).
-   **`lib/toshl.ts`**: Interacts with the Toshl Finance API:
    -   Fetches, adds, edits, and deletes entries.
    -   Fetches metadata.
    -   Uses `apiHelper.ts` for authentication, pagination, and raw API calls.
-   **`lib/gemini.ts`**: Interacts with the Google Gemini API:
    -   Sends user requests to Gemini.
    -   Parses and validates the JSON response.
    -   Uses `lib/gemini/prompt.ts` to construct prompts.
-   **`lib/gemini/prompt.ts`**: Constructs prompts for the Gemini API:
    -   Uses a template (`gemini_prompt.txt`) and dynamic data.
-   **`AccountBalanceCard.tsx`**: Renders account balance cards:
    -   Displays each Toshl account's name, balance, currency, and daily/average stats.
    -   Provides 'See More' interactions to view additional account details.
-   **`BudgetCard.tsx`**: Renders budget cards:
    -   Displays budget name, limit, spent amount, planned amount, rollover details, and currency.
    -   Supports summary headers and 'See More' for detailed budget lists.
-   **`localStorage`**: Persists data in the browser:
    -   Stores API keys, user settings, Toshl metadata, chat message history, account balances, and budget data.

## Initialization Flow (`App.tsx`)

1.  **Component Mount:** The `App` component mounts.
2.  **API Key Check:** An `useEffect` hook checks `localStorage` for `toshlApiKey` and `geminiApiKey`.
3.  **Settings Check:** If either key is missing, the `isSettingsOpen` state is set to `true`, opening the `SettingsPage`.
4.  **Lazy Loading:** `ChatInterface` and `SettingsPage` are lazy-loaded.
5.  **Rendering:** The `ChatInterface` is rendered. The `SettingsPage` is rendered in a sidebar, controlled by `isSettingsOpen`.
6.  **Network Listener:** `useChatLogic` listens for browser `online` and `offline` events.

## Settings Flow (`SettingsPage.tsx` & `useSettingsLogic.ts`)

1.  **User Input:** The user enters their Toshl API Key and Gemini API Key.
2.  **Save:** The user saves the settings.
3.  **Validation:** The `useSettingsLogic` hook validates the inputs.
4.  **Storage:** Valid API keys and settings are saved to `localStorage`.
5.  **Metadata Fetch:** The hook fetches the user's accounts, categories, and tags via `lib/toshl.ts`.
6.  **Metadata Storage:** Fetched data is stored in `localStorage`.
7.  **UI Update:** The settings page displays feedback.
8.  **Close:** The user closes the settings sidebar.

## Chat Interaction Flow (`ChatInterface.tsx` & `useChatLogic.ts`)

### Sending a Message (Online)

1.  **User Input:** The user types a request.
2.  **Submit:** The user submits the form.
3.  **`handleFormSubmit` Triggered:** The `onSubmit` handler calls `useChatLogic.handleFormSubmit`.
4.  **Input Validation:** The handler checks for empty input, offline status, or ongoing operations.
5.  **Display User Message:** The user's input is added to the `messages` state.
6.  **Show Loading:** A loading indicator is added to the `messages` state.
7.  **Call API Handler:** `useChatLogic.handleFormSubmit` calls `handleProcessUserRequestApi` in `apiHandler.ts`.
8.  **API Handler Logic (`handleProcessUserRequestApi`):**
    -   Retrieves API keys, settings, and Toshl metadata from `localStorage`.
    -   Constructs the chat history for Gemini.
    -   Calls `processUserRequestViaGemini` (`lib/gemini.ts`).
    -   Receives the `GeminiResponseAction`.
    -   Calls the appropriate Toshl function(s) from `lib/toshl.ts`:
        -   `addToshlEntry`, `editToshlEntry`, `deleteToshlEntry` for entry operations.
        -   `fetchEntries` for fetching history entries.
        -   `fetchAccountBalances` for account balance overview.
        -   `fetchBudgets` for budget insights.
    -   Formats the results into `Message` objects.
    -   Returns messages to add, updated context, and the ID of any updated entry.

### Handling API Handler Results (`handleFormSubmit` continued)

The `handleFormSubmit` function in `useChatLogic.ts` processes the results from `handleProcessUserRequestApi`:

-   **Update Context:** Updates `lastShowContext` and `lastSuccessfulEntryId`.
-   **Mark Updated Entries:** Marks previous messages related to an edited entry as outdated.
-   **Add New Messages:** Adds the new messages to the `messages` state.
-   **Remove Loading:** Removes the loading message.
-   **Reset Loading State:** Sets `isLoading` to `false`.
-   **UI Update:** The `ChatInterface` re-renders.
-   **Scroll:** The message list scrolls to the bottom.
-   **Save to localStorage:** The updated `messages` array is saved to `localStorage`.

### Fetching History Manually (`handleFetchDateRange`)

1.  **User Click:** The user clicks the History button.
2.  **Check Online Status:** If offline, an error message is displayed.
3.  **Set Loading:** Sets `isLoadingHistory` to `true` and adds a loading message.
4.  **Determine Filters/Header:** Calculates the date range and header text.
5.  **Call API Handler:** Calls `handleFetchEntriesApi` in `apiHandler.ts`.
6.  **API Handler Logic (`handleFetchEntriesApi`):**
    -   Calls `fetchEntries` (`lib/toshl.ts`).
    -   Formats the results into `Message` objects.
    -   Returns the fetched entries and formatted messages.
7.  **Process Results:**
    -   Removes the loading message.
    -   Adds the header message.
    -   Adds the entry messages.
    -   Handles truncation by adding a "See More" message.
    -   Sets `isLoadingHistory` to `false`.

### Deleting an Entry

1.  **User Click:** The user clicks the delete icon on an entry card.
2.  **`handleDeleteEntry` Triggered:** Calls `useChatLogic.handleDeleteEntry`.
3.  **Validation:** Checks if the `toshlEntryId` is valid.
4.  **Set Deleting State:** Sets `isDeleting` state to show a loading indicator.
5.  **Check Online Status:** If offline, an error message is displayed.
6.  **Call API Handler:** Calls `handleDeleteEntryApi` in `apiHandler.ts`.
7.  **API Handler Logic (`handleDeleteEntryApi`):**
    -   Retrieves the Toshl API key.
    -   Calls `deleteToshlEntry` (`lib/toshl.ts`).
8.  **Update Message:** On success, updates the message to indicate deletion.
9.  **Handle Error:** On failure, updates the message to show an error.
10. **Reset Deleting State:** Sets `isDeleting` back to `null`.

### Showing More History Entries

1.  **User Click:** The user clicks the "See More" card.
2.  **`handleShowMoreClick` Triggered:** Calls `useChatLogic.handleShowMoreClick`.
3.  **Format Data:** Maps the `EntryCardData` array into `Message` objects.
4.  **Open Bottom Sheet:** Sets the formatted messages into `bottomSheetData` and opens the `BottomSheet`.
5.  **UI Update:** The `BottomSheet` component displays the full list of entries.

### Offline Handling (`useChatLogic.ts`)

1.  **Network Status:** The hook maintains an `isOnline` state.
2.  **Sending Offline:** If `handleFormSubmit` is called while offline:
    -   An `offlineId` is generated.
    -   The user's message is added to the `messages` state with `status: 'pending'`.
    -   The message is saved to `localStorage`.
3.  **Going Online:** When the browser goes online:
    -   `syncPendingMessages` is called.
    -   It iterates through pending messages and calls `retrySendMessage`.
4.  **Retrying a Message (`retrySendMessage`):**
    -   Finds the message by `offlineId`.
    -   Sets `isRetrying` state.
    -   Calls `handleProcessUserRequestApi` with the message text and previous context.
    -   On success:
        -   Removes the original pending message.
        -   Adds the new messages returned by the API handler.
    -   On failure:
        -   Updates the original message's status to `'error'` and appends error details.
    -   Resets `isRetrying` state.

### Mention Feature (`useChatLogic.ts`)

1.  **Trigger:** Typing `@` followed by characters triggers the mention popup.
2.  **Filtering:** An `useEffect` hook filters accounts, categories, and tags based on the input.
3.  **Display:** The `MentionSuggestionsPopup` component displays the suggestions.
4.  **Selection:** Selecting a suggestion replaces the input with the formatted suggestion.
5.  **Closing:** The popup closes when the user types a space, deletes the `@`, moves the cursor, or submits the form.
