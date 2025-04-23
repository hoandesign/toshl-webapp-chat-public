# Toshl WebApp Chat

A conversational web application to manage your Toshl Finance data using natural language, powered by Google Gemini.

![Welcome Image](public/toshl-app.png)

## Overview

Toshl WebApp Chat provides a natural language interface for interacting with your Toshl Finance data. Using Google Gemini, you can add, view, edit, and delete financial entries through simple chat commands.

## Key Features

-   **Conversational Finance:** Manage your finances using natural language.
-   **Toshl Finance Integration:**
    -   Add expenses and income.
    -   View entries by date, category, tags, and description.
    -   Edit and delete existing entries.
-   **Google Gemini Integration:** Understands natural language requests to extract financial details and determine actions.
-   **Contextual Awareness:** Remembers recent requests and modifications for follow-up commands.
-   **Settings Management:** Configure API keys, default currency, and Gemini model.
-   **Local Storage:** Securely stores API keys and settings in your browser's `localStorage`.
-   **Offline Support:** Continue composing and queuing messages even when offline; they are sent automatically when you reconnect.
-   **Mention Suggestions:** Type `@` in the chat to quickly mention Toshl accounts, categories, or tags.
-   **Responsive Design:** Built with React and Tailwind CSS for a clean, adaptable user interface.
-   **Account Balance Overview:** View your Toshl account balances at a glance with interactive cards.
-   **Budget Insights:** Visualize your budgets, including limits, spending, planned amounts, and rollover details through budget cards.

## Technologies

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Tailwind CSS, lucide-react
-   **NLP:** Google Gemini API
-   **Finance API:** Toshl Finance API
-   **State Management:** React Hooks
-   **Libraries:**
    -   react: A JavaScript library for building user interfaces.
    -   react-dom: Provides DOM-specific methods for React.
    -   lucide-react: A library of beautiful SVG icons for React.
    -   currency-symbol-map: Get currency symbols by code.
    -   react-hot-toast: For displaying toast notifications.
    -   @vercel/speed-insights: Collect web performance metrics.

## Quick Start

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd toshl-webapp-chat
    ```
2.  **Install dependencies:**

    ```bash
    npm install
    ```
3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173`.

## Usage

1.  **Open the application** in your web browser.
2.  **Configure Settings:**
    -   Enter your Toshl API Key and Google Gemini API Key in the Settings sidebar.
    -   Set your default currency and preferred Gemini model (optional).
    -   Save the settings. The app will fetch your Toshl data.
3.  **Start Chatting:**
    -   Use natural language to manage your finances.
    -   **Example Commands:**
        -   `Add 50k vnd for coffee yesterday`
        -   `Log $2000 salary income today`
        -   `Show expenses from last week`
        -   `Edit the last entry, change amount to $60`
        -   `Show my account balances`
        -   `Show budgets for groceries this month`
    -   Use the history button to view recent entries.
    -   Click on entries for more options.
    -   Type `@` to mention accounts, categories, or tags.
    -   You can continue composing messages while offline; they will be sent when you reconnect.

## Logic

For a detailed explanation of the application's logic, refer to [logic.md](./logic.md).

## Deployment

Deploy to Vercel:

1.  Push your code to a Git repository.
2.  Connect your repository to Vercel.
3.  Vercel will automatically build and deploy the application.

No environment variables are needed on Vercel as API keys are managed client-side.

## API Key Security

-   API keys are stored in your browser's `localStorage` and are **never sent to any backend server**.
-   Treat your API keys as sensitive and do not share them.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Exception:** Images used in this project are sourced from the Toshl website and are subject to their respective terms of use.

## Libraries Used

### Dependencies
- @vercel/speed-insights
- currency-symbol-map
- lucide-react
- react-markdown
- remark-gfm
- react
- react-dom
- react-hot-toast

### Dev Dependencies
- @eslint/js
- @tailwindcss/typography
- @types/react
- @types/react-dom
- @vitejs/plugin-react
- autoprefixer
- eslint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- globals
- postcss
- tailwind-scrollbar
- tailwindcss
- terser
- typescript
- typescript-eslint
- vite
