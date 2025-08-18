# Enhanced Debug Feature for Toshl API Calls

## Overview

The debug feature has been enhanced to capture comprehensive information about all Toshl API requests made during chat interactions. This includes detailed tracking of requests, responses, errors, and timing information for all types of Toshl API operations.

## What's Captured

### All Toshl API Operations
- **GET requests**: Fetching entries, accounts, categories, tags, budgets, user profile
- **POST requests**: Adding new entries
- **PUT requests**: Updating entries and user profile
- **DELETE requests**: Deleting entries

### Debug Information Includes
- **Request Details**:
  - HTTP method (GET, POST, PUT, DELETE)
  - Endpoint path
  - Request payload (for POST/PUT operations)
  - Timestamp of the request

- **Response Details**:
  - HTTP status code
  - Response data
  - Success/error status

- **Performance Metrics**:
  - Request duration in milliseconds

- **Error Information**:
  - Detailed error messages
  - API-specific error descriptions
  - Field validation errors

## How It Works

### 1. Debug Tracking System
- Global debug tracker in `src/lib/toshl/apiHelper.ts`
- Automatic capture of all API calls through helper functions
- Thread-safe collection of debug information

### 2. API Integration
- Enhanced `fetchFromToshl()` and `fetchSingleFromToshl()` functions
- Individual Toshl API functions (`addToshlEntry`, `editToshlEntry`, etc.) include debug tracking
- Automatic collection and aggregation of debug data

### 3. Debug Display
- **Individual Message Debug**: Click the debug icon on any bot message to see detailed information
- **Global Debug View**: Access comprehensive debug information for all messages with debug data
- **Enhanced UI**: Color-coded HTTP methods, timing information, and structured display

## Debug Modal Features

### Individual Debug Modal
- **Gemini Request Tab**: Shows user input, chat history, and full request body
- **Gemini Response Tab**: Shows raw response, cleaned response, and parsed data
- **Toshl API Calls Tab**: Shows all Toshl API requests with detailed information

### Global Debug Modal
- **Message List**: Shows all messages with debug information
- **Detailed View**: Click on any message to see comprehensive debug details
- **Copy Functionality**: Easy copying of debug data for troubleshooting

### Visual Enhancements
- **HTTP Method Badges**: Color-coded badges for different HTTP methods
  - GET: Blue
  - POST: Green
  - PUT: Yellow
  - DELETE: Red
- **Timing Information**: Request duration displayed in milliseconds
- **Structured Layout**: Clear separation of request payload, response, and errors
- **Timestamp Display**: Human-readable timestamps for all requests

## Usage

### For Developers
1. **Enable Debug Mode**: Debug information is automatically captured for all bot responses
2. **Access Debug Info**: Click the debug icon (🐛) on any bot message
3. **View Global Debug**: Use the global debug modal to see all debug information
4. **Copy Debug Data**: Use the copy buttons to extract debug information for analysis

### For Troubleshooting
1. **API Call Analysis**: See exactly what requests were made to Toshl API
2. **Error Diagnosis**: View detailed error messages and field validation issues
3. **Performance Monitoring**: Check request durations to identify slow operations
4. **Request/Response Inspection**: Examine full request payloads and responses

## Technical Implementation

### Files Modified
- `src/lib/toshl/apiHelper.ts`: Added debug tracking system
- `src/lib/toshl.ts`: Enhanced individual API functions with debug tracking
- `src/components/chat/apiHandler.ts`: Integrated debug collection
- `src/components/chat/DebugModal.tsx`: Enhanced UI for debug display
- `src/components/chat/GlobalDebugModal.tsx`: Enhanced global debug view

### Key Functions
- `getToshlDebugRequests()`: Retrieves and clears current debug requests
- `addDebugRequest()`: Adds a debug request to the collection
- Enhanced API functions with automatic debug tracking

## Benefits

1. **Complete Visibility**: See all Toshl API interactions in one place
2. **Better Error Handling**: Detailed error information for troubleshooting
3. **Performance Insights**: Timing information for optimization
4. **Development Aid**: Comprehensive debugging information for developers
5. **User Support**: Easy access to technical details for support requests

## Example Debug Information

```json
{
  "endpoint": "/entries",
  "method": "POST",
  "payload": {
    "amount": -25.50,
    "currency": { "code": "USD" },
    "category": "cat1",
    "account": "acc1",
    "date": "2025-01-14",
    "desc": "Lunch expense"
  },
  "response": {
    "status": 201,
    "data": {
      "id": "entry_123",
      "amount": -25.50,
      "currency": { "code": "USD" },
      "created": "2025-01-14T10:30:00Z"
    }
  },
  "timestamp": "2025-01-14T10:30:00.123Z",
  "duration": 245
}
```

This enhanced debug feature provides complete transparency into all Toshl API operations, making it easier to develop, troubleshoot, and optimize the application.