# Technology Stack

## Frontend Framework
- **React 19** with TypeScript
- **Vite** as build tool and dev server
- **ES Modules** (type: "module" in package.json)

## Styling & UI
- **Tailwind CSS** with custom Toshl color system
- **Lucide React** for icons
- **Source Sans Pro** as default font family
- Custom Toshl brand colors defined in tailwind.config.cjs
- Responsive design with mobile-first approach

## State Management
- **React Hooks** (useState, useEffect, useCallback)
- **Custom hooks** for logic separation (useChatLogic, useSettingsLogic)
- **localStorage** for persistence (API keys, settings, chat history, metadata)

## APIs & External Services
- **Google Gemini API** for natural language processing and image analysis
- **Gemini Files API** for optimized large image uploads
- **Toshl Finance API** for financial data operations
- **Vercel Speed Insights** for performance monitoring

## Image Processing & Storage
- **Canvas API** for client-side image resizing and optimization
- **IndexedDB** for browser-based image caching
- **Base64 encoding** for image data transmission
- **Multimodal content** support for text + image AI processing

## Key Libraries
- `react-hot-toast` - Toast notifications
- `react-markdown` + `remark-gfm` - Markdown rendering in chat
- `currency-symbol-map` - Currency symbol mapping
- `@tailwindcss/typography` - Enhanced text styling
- `tailwind-scrollbar` - Custom scrollbar styling

## Testing Framework
- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM testing
- **jsdom** - DOM environment for testing

## Development Tools
- **ESLint** with TypeScript and React plugins
- **TypeScript 5.7** with strict configuration
- **PostCSS** with Autoprefixer
- **Terser** for production minification

## Build Configuration
- Code splitting with lazy loading (React.lazy)
- Manual chunks for React and Lucide icons
- Console/debugger removal in production
- Vite proxy for Toshl API during development

## Common Commands
```bash
# Development
npm run dev          # Start dev server (localhost:5173)

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## Node Requirements
- **Node.js >= 18.0.0** (specified in engines)

## Architecture Patterns
- **Component composition** over inheritance
- **Custom hooks** for business logic
- **Separation of concerns** (UI, logic, API handlers)
- **Error boundaries** and loading states
- **Offline-first** design with retry mechanisms