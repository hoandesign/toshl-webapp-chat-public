# Toshl WebApp Chat

[![DeepWiki](https://deepwiki.com/badge-maker?url=https%3A%2F%2Fdeepwiki.com%2Fhoandesign%2Ftoshl-webapp-chat-public)](https://deepwiki.com/hoandesign/toshl-webapp-chat-public)

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
-   **Google Gemini Integration:** Understands natural language requests, images, and audio to extract financial details and determine actions.
-   **Voice Recording:** Record voice messages for hands-free expense logging with real-time feedback and audio validation.
-   **Contextual Awareness:** Remembers recent requests and modifications for follow-up commands.
-   **Settings Management:** Configure API keys, default currency, and Gemini model.
-   **Local Storage:** Securely stores API keys and settings in your browser's `localStorage`.
-   **Offline Support:** Continue composing and queuing messages even when offline; they are sent automatically when you reconnect.
-   **Mention Suggestions:** Type `@` in the chat to quickly mention Toshl accounts, categories, or tags.
-   **Photo Input Support:** Upload images (receipts, bills, etc.) to help Gemini understand and process financial information.
-   **Debug Tools:** Comprehensive debugging interface for development and troubleshooting API interactions.
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
    -   react-markdown + remark-gfm: For rendering markdown content in chat.
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
        -   Upload a photo of a receipt and ask: `Add this expense to my account`
        -   Record a voice message: "Add fifty dollars for groceries yesterday"
    -   Use the history button to view recent entries.
    -   Click on entries for more options.
    -   Type `@` to mention accounts, categories, or tags.
    -   Record voice messages using the microphone button for hands-free expense logging.
    -   You can continue composing messages while offline; they will be sent when you reconnect.

## Logic

For a detailed explanation of the application's logic, refer to [logic.md](./logic.md).

## SEO & Social Media

The application includes comprehensive SEO and social media optimization:

- **Open Graph** tags for Facebook, LinkedIn, and other platforms
- **Twitter Cards** for enhanced Twitter sharing
- **Structured Data** (JSON-LD) for search engines
- **Progressive Web App** manifest for mobile installation
- **Sitemap** and **robots.txt** for search engine crawling

For detailed information, see [SEO Implementation Guide](docs/SEO_IMPLEMENTATION.md).

### Testing Social Media Previews
Visit `/test-og.html` after deployment to test how your app appears when shared on social media platforms.

## Deployment

Deploy to Vercel:

1.  Push your code to a Git repository.
2.  Connect your repository to Vercel.
3.  Vercel will automatically build and deploy the application.

No environment variables are needed on Vercel as API keys are managed client-side.

### Post-Deployment SEO Checklist
- [ ] Test Open Graph preview with Facebook Sharing Debugger
- [ ] Validate Twitter Cards with Twitter Card Validator
- [ ] Check structured data with Google Rich Results Test
- [ ] Verify sitemap accessibility at `/sitemap.xml`
- [ ] Test PWA installation on mobile devices

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
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- @types/react
- @types/react-dom
- @vitejs/plugin-react
- @vitest/ui
- autoprefixer
- eslint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- globals
- jsdom
- postcss
- tailwind-scrollbar
- tailwindcss
- terser
- ts-node
- typescript
- typescript-eslint
- vite
- vitest
