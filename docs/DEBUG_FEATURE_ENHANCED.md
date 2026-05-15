# Enhanced Debug Feature

## Overview

The debug feature has been enhanced to properly capture and display failed and parse errors from Gemini responses. This provides comprehensive debugging information for troubleshooting API issues.

## What's New

### Enhanced Error Capture

1. **Gemini API Errors**: HTTP errors, network failures, and API response errors are now captured with full details
2. **Parse Errors**: JSON parsing failures from Gemini responses are captured with the raw response text
3. **Validation Errors**: Schema validation errors for Gemini responses are captured with detailed context
4. **Network Errors**: Connection and timeout errors are properly categorized and captured

### Debug Information Structure

The `DebugInfo` interface now includes:

```typescript
interface DebugInfo {
  geminiRequest?: {
    model: string;
    userInput: string;
    chatHistory: Record<string, unknown>[];
    systemPrompt?: string;
    fullRequestBody?: Record<string, unknown>;
  };
  geminiResponse?: {
    rawResponse?: string;
    cleanedResponse?: string;
    parsedData?: Record<string, unknown>;
    processingTime?: number;
    httpStatus?: number;
    httpStatusText?: string;
  };
  geminiErrors?: Array<{
    type: 'api_error' | 'parse_error' | 'validation_error' | 'network_error';
    message: string;
    details?: string;
    httpStatus?: number;
    originalError?: string;
  }>;
  toshlRequests?: Array<{
    endpoint: string;
    method: string;
    payload?: Record<string, unknown>;
    response?: Record<string, unknown>;
    error?: string;
    httpStatus?: number;
    duration?: number;
    timestamp?: string;
  }>;
  errors?: string[]; // Legacy error array for backward compatibility
  timestamp: string;
}
```

### Error Types

1. **API Error**: HTTP errors from Gemini API (4xx, 5xx responses)
2. **Parse Error**: JSON parsing failures from Gemini responses
3. **Validation Error**: Schema validation failures for parsed Gemini responses
4. **Network Error**: Connection timeouts, network failures, etc.

## How to Access Debug Information

### Message Context Menu

1. Right-click on any bot or system message that has debug information
2. Look for the debug icon (🐛) in the message actions
3. Click the debug button to open the debug modal

### Global Debug View

1. Click the global debug button in the chat interface
2. Select a message from the list to view its debug information
3. All messages with debug info are listed with timestamps

### Debug Modal Features

- **Tabbed Interface**: Separate tabs for Request, Response, and Toshl API calls
- **Error Highlighting**: Different colors for different error types
- **Copy Functionality**: Copy any debug section to clipboard
- **HTTP Status Display**: Shows HTTP status codes and response times
- **Detailed Error Context**: Full error messages with stack traces when available

## Error Message Enhancement

Error messages now include debug information when available:

- Failed API calls include the debug info from the Gemini request
- Parse errors show the raw response that failed to parse
- Validation errors include the parsed data that failed validation
- Network errors include connection details

## Troubleshooting Guide

### Common Issues

1. **Parse Errors**: Usually indicate Gemini returned non-JSON or malformed JSON
   - Check the raw response in debug info
   - Look for markdown formatting that wasn't cleaned properly

2. **Validation Errors**: Indicate the parsed JSON doesn't match expected schema
   - Check the parsed data section
   - Verify required fields are present and have correct types

3. **API Errors**: HTTP errors from Gemini API
   - Check HTTP status code
   - Review error message from Gemini
   - Verify API key and model settings

4. **Network Errors**: Connection or timeout issues
   - Check internet connection
   - Verify API endpoints are accessible
   - Review timeout settings

### Debug Information Usage

- **For Users**: Helps understand why a request failed
- **For Developers**: Provides detailed context for bug reports
- **For Support**: Enables faster troubleshooting with complete request/response data

## Implementation Details

### Error Propagation

Errors are now properly propagated through the call stack:

1. Gemini API errors are captured in `processUserRequestViaGemini`
2. Debug info is attached to errors in `handleProcessUserRequestApi`
3. Chat logic extracts debug info from errors and attaches to error messages
4. UI components display debug info when available

### Backward Compatibility

- Legacy `errors` array is maintained for backward compatibility
- Existing debug modal functionality is preserved
- New error types are additive and don't break existing code

## Testing

To test the enhanced debug feature:

1. **API Errors**: Use invalid API key to trigger 401 error
2. **Parse Errors**: Modify Gemini prompt to return non-JSON
3. **Validation Errors**: Modify response validation to fail
4. **Network Errors**: Disconnect internet during API call

All error types should be captured and displayed in the debug modal with appropriate categorization and details.