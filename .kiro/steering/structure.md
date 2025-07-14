# Project Structure & Organization

## Root Level
```
├── public/                 # Static assets (icons, images)
├── src/                   # Source code
├── .kiro/                 # Kiro configuration and steering
├── node_modules/          # Dependencies
├── package.json           # Project metadata and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.cjs    # Tailwind CSS configuration
├── tsconfig*.json         # TypeScript configurations
├── eslint.config.js       # ESLint configuration
├── README.md              # Project documentation
└── logic.md               # Architecture overview
```

## Source Structure (`src/`)
```
src/
├── App.tsx                # Root component with lazy loading
├── main.tsx               # Application entry point
├── index.css              # Global styles
├── vite-env.d.ts          # Vite type definitions
├── components/            # React components
│   ├── ChatInterface.tsx      # Main chat UI
│   ├── SettingsPage.tsx       # Settings configuration
│   ├── LoadingFallback.tsx    # Loading component
│   ├── chat/                  # Chat-specific components
│   │   ├── useChatLogic.ts        # Chat state & logic hook
│   │   ├── apiHandler.ts          # API orchestration
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── MessageRenderer.tsx    # Message display logic
│   │   ├── MentionSuggestionsPopup.tsx
│   │   ├── BottomSheet.tsx        # Modal overlay
│   │   ├── *Card.tsx              # Specialized display cards
│   │   └── SeeMore*Card.tsx       # Expandable content cards
│   └── settings/              # Settings-specific components
│       └── useSettingsLogic.ts    # Settings state & logic
├── lib/                   # Core business logic
│   ├── toshl.ts               # Toshl API operations
│   ├── gemini.ts              # Gemini API operations
│   ├── prompts.ts             # Prompt templates
│   ├── gemini/                # Gemini-specific helpers
│   │   ├── prompt.ts              # Dynamic prompt construction
│   │   ├── types.ts               # Gemini type definitions
│   │   └── useGeminiAPI.ts        # Gemini API hook
│   └── toshl/                 # Toshl-specific helpers
│       ├── apiHelper.ts           # Toshl API utilities
│       └── types.ts               # Toshl type definitions
├── constants/             # Application constants
│   └── strings.ts             # String constants and messages
├── test/                  # Test files
│   ├── setup.ts               # Test configuration
│   ├── image-message-flow.test.tsx  # Image message rendering tests
│   ├── image-cache.test.ts    # Image caching system tests
│   ├── image-integration.test.ts    # Image integration tests
│   ├── api-handler.test.ts    # API handler tests
│   └── TEST_SUMMARY.md        # Test documentation
└── utils/                 # Utility functions
    └── formatting.ts          # Data formatting helpers
```

## Key Architectural Patterns

### Component Organization
- **Feature-based grouping**: Components grouped by domain (chat/, settings/)
- **Atomic design**: Small, reusable components composed into larger features
- **Lazy loading**: Main components loaded on-demand for performance

### Logic Separation
- **Custom hooks**: Business logic extracted from UI components
- **API handlers**: Centralized API orchestration in `apiHandler.ts`
- **Type definitions**: Shared interfaces in dedicated `types.ts` files

### File Naming Conventions
- **PascalCase**: React components (`ChatInterface.tsx`)
- **camelCase**: Hooks, utilities, and non-component files (`useChatLogic.ts`)
- **kebab-case**: Configuration files (`eslint.config.js`)

### Import Patterns
- **Absolute imports**: From `src/` root
- **Grouped imports**: External libraries, then internal modules
- **Specific icon imports**: `lucide-react/dist/esm/icons/[icon-name]`

### State Management Locations
- **Component state**: Local UI state in components
- **Business logic**: Custom hooks (`useChatLogic`, `useSettingsLogic`)
- **Persistence**: localStorage operations in hooks and API handlers
- **Image caching**: IndexedDB for resized image storage and retrieval
- **Global state**: Minimal - passed via props or context when needed

### Image Message Architecture
- **Caption-optional sending**: Images can be sent with or without text captions
- **Display optimization**: Cached resized images for chat interface performance
- **AI history optimization**: Old images replaced with "[image]" placeholders in prompts
- **Metadata tracking**: Image dimensions, file size, and format information
- **Error handling**: Graceful degradation for image processing failures

### Configuration Files
- **Tailwind**: Custom Toshl color system and typography
- **TypeScript**: Strict mode with project references
- **ESLint**: React and TypeScript rules with hooks validation
- **Vite**: Development proxy and production optimization