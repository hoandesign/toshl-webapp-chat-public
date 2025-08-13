# Product Overview

Toshl WebApp Chat is a conversational web application that provides a natural language interface for managing Toshl Finance data using Google Gemini AI.

## Core Features

- **Natural Language Finance Management**: Add, view, edit, and delete financial entries through chat commands
- **Toshl Finance Integration**: Full CRUD operations for expenses, income, accounts, categories, and tags
- **Google Gemini AI**: Processes natural language requests and extracts financial details from text, images, and audio
- **Enhanced Image Message System**: Upload images of receipts/bills with or without captions, displayed directly in chat with optimized caching and AI history management
- **Voice Recording**: Record voice messages for hands-free expense logging with real-time feedback and audio validation
- **Contextual Awareness**: Maintains conversation context for follow-up commands
- **Offline Support**: Queue messages when offline, auto-send when reconnected
- **Mention System**: Type `@` to quickly reference accounts, categories, or tags
- **Account & Budget Overview**: Visual cards showing balances, spending, and budget insights
- **Debug Tools**: Comprehensive debugging interface for development and troubleshooting

## User Flow

1. Configure API keys (Toshl + Gemini) in settings
2. Chat naturally: "Add $50 for coffee yesterday" or "Show last week's expenses"
3. Upload receipt photos with or without captions - images display directly in chat and are automatically processed by AI
4. Record voice messages for hands-free expense logging - audio is processed by Gemini for speech-to-text and financial data extraction
5. View account balances and budget status through interactive cards
6. Edit/delete entries through chat or card actions
7. Use debug tools to inspect API calls and troubleshoot issues during development

## Security Model

- Client-side only application
- API keys stored in browser localStorage
- No backend server - direct API communication
- Keys never transmitted to external servers