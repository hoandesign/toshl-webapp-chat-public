import { ToshlErrorResponse, ToshlDailySum, ToshlDailySumsResponse, ToshlBudget } from './types'; // Import error type, sum types, and budget type
import * as STRINGS from '../../constants/strings'; // Import constants

// Use the local proxy path during development to avoid CORS issues
const TOSHL_API_BASE = '/api/toshl';

// Global debug tracker for Toshl API calls
interface ToshlDebugRequest {
  endpoint: string;
  method: string;
  payload?: Record<string, unknown>;
  response?: unknown;
  error?: string;
  timestamp: string;
  duration?: number;
}

let currentDebugRequests: ToshlDebugRequest[] = [];

// Function to get current debug requests and clear the array
export function getToshlDebugRequests(): ToshlDebugRequest[] {
  const requests = [...currentDebugRequests];
  currentDebugRequests = [];
  return requests;
}

// Function to add a debug request
function addDebugRequest(request: ToshlDebugRequest) {
  currentDebugRequests.push(request);
}

// Export the addDebugRequest function for use in other Toshl API functions
export { addDebugRequest };

/**
 * Helper function to make authenticated requests to Toshl API, handling pagination.
 * Uses Basic Authentication (API Key as username, password from storage).
 * @param endpoint - The original endpoint path with query string (e.g., /accounts, /entries?from=...).
 * @param apiKey - The Toshl API key (used as username).
 * @param options - Optional fetch options (method, headers, body).
 * @param page - Current page number to fetch (used internally for recursion).
 * @param accumulatedData - Accumulator for data from previous pages (used internally).
 * @returns A promise that resolves to an array containing all data fetched across pages.
 */
export async function fetchFromToshl<T>( // Added export
  endpoint: string,
  apiKey: string,
  options: RequestInit = {},
  page: number = 0,
  accumulatedData: T[] = []
): Promise<T[]> {
  // Construct URL relative to the current origin when using the proxy
  const url = new URL(`${TOSHL_API_BASE}${endpoint}`, window.location.origin);
  // Add/update the page parameter for pagination
  url.searchParams.set('page', page.toString());
  // Consider adding per_page if needed, e.g., url.searchParams.set('per_page', '50');

  // Retrieve password from local storage - needed for every fetch call
  const password = localStorage.getItem('toshlPassword') || ''; // Use empty string if not found

  // Encode API key and password for Basic Auth
  const basicAuth = btoa(`${apiKey}:${password}`); // Base64 encode "apiKey:password"

  const headers = new Headers({
    'Authorization': `Basic ${basicAuth}`, // Use Basic Auth with password
    'Content-Type': 'application/json',
    ...options.headers,
  });

  // Debug tracking
  const debugRequest: ToshlDebugRequest = {
    endpoint: endpoint,
    method: options.method || 'GET',
    payload: options.body ? JSON.parse(options.body as string) : undefined,
    timestamp: new Date().toISOString()
  };
  const startTime = Date.now();

  try {
    const response = await fetch(url.toString(), { ...options, headers });

    if (!response.ok) {
      let errorData: ToshlErrorResponse | string = STRINGS.TOSHL_HTTP_ERROR(response.status) + ` fetching page ${page}`; // Added page info
      try {
        // Try to parse specific Toshl error format
        const jsonError = await response.json();
        if (jsonError && (jsonError.error || jsonError.description)) {
           errorData = jsonError;
           console.error('Toshl API Error:', errorData);
           
           // Capture error in debug
           debugRequest.error = jsonError.description || jsonError.error;
           debugRequest.duration = Date.now() - startTime;
           addDebugRequest(debugRequest);
           
           throw new Error(STRINGS.TOSHL_API_ERROR_DESC(jsonError.description || jsonError.error, response.status));
        }
      } catch {
         // If parsing fails or it's not the expected format, use the status text
         console.error('Failed to parse Toshl error response or unexpected format.');
      }
      
      // Capture generic error in debug
      const errorMessage = typeof errorData === 'string' ? errorData : STRINGS.TOSHL_HTTP_ERROR(response.status) + ` fetching page ${page}`;
      debugRequest.error = errorMessage;
      debugRequest.duration = Date.now() - startTime;
      addDebugRequest(debugRequest);
      
      // Throw generic error if specific one wasn't parsed/thrown
      throw new Error(errorMessage); // Added page info
    }

    // Handle 204 No Content - should not happen for list endpoints, but good practice
    if (response.status === 204) {
        console.warn(`Received 204 No Content for ${url.toString()}, returning accumulated data.`);
        
        // Capture 204 response in debug
        debugRequest.response = { status: 204, message: 'No Content' };
        debugRequest.duration = Date.now() - startTime;
        addDebugRequest(debugRequest);
        
        return accumulatedData;
    }

    const currentPageData = await response.json() as T[];
    const allData = accumulatedData.concat(currentPageData);

    // Capture successful response in debug (only for the first page to avoid spam)
    if (page === 0) {
      debugRequest.response = {
        status: response.status,
        data: currentPageData,
        totalItems: allData.length
      };
      debugRequest.duration = Date.now() - startTime;
      addDebugRequest(debugRequest);
    }

    // Check for next page link in the Link header
    const linkHeader = response.headers.get('Link');
    let hasNextPage = false;
    if (linkHeader) {
        const links = linkHeader.split(',').map(link => link.trim());
        hasNextPage = links.some(link => link.includes('rel="next"'));
    }

    if (hasNextPage && currentPageData.length > 0) {
        // Recursively fetch the next page
        console.log(`Fetching next page for ${endpoint.split('?')[0]} (page ${page + 1})`); // Log base endpoint
        // Recursive call: pass the original endpoint path, apiKey, options, next page number, and accumulated data
        return fetchFromToshl<T>(endpoint, apiKey, options, page + 1, allData);
    } else {
        // Last page or no Link header or empty page data, return all accumulated data
        return allData;
    }

  } catch (error) {
    console.error(`Error fetching ${url.toString()}:`, error);
    
    // Capture unexpected error in debug if not already captured
    if (!debugRequest.error) {
      debugRequest.error = error instanceof Error ? error.message : String(error);
      debugRequest.duration = Date.now() - startTime;
      addDebugRequest(debugRequest);
    }
    
    // Re-throw the error so the caller can handle it
    throw error;
  }
}

/**
 * Helper function to make authenticated requests to Toshl API for endpoints returning a single object.
 * Uses Basic Authentication (API Key as username, password from storage).
 * @param endpoint - The endpoint path (e.g., /me, /entries/{id}).
 * @param apiKey - The Toshl API key (used as username).
 * @param options - Optional fetch options (method, headers, body).
 * @returns A promise that resolves to the fetched object.
 */
export async function fetchSingleFromToshl<T>( // Added export
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  // Construct URL relative to the current origin when using the proxy
  const url = new URL(`${TOSHL_API_BASE}${endpoint}`, window.location.origin);

  // Retrieve password from local storage
  const password = localStorage.getItem('toshlPassword') || ''; // Use empty string if not found

  // Encode API key and password for Basic Auth
  const basicAuth = btoa(`${apiKey}:${password}`); // Base64 encode "apiKey:password"

  const headers = new Headers({
    'Authorization': `Basic ${basicAuth}`, // Use Basic Auth with password
    'Content-Type': 'application/json',
    ...options.headers,
  });

  // Debug tracking
  const debugRequest: ToshlDebugRequest = {
    endpoint: endpoint,
    method: options.method || 'GET',
    payload: options.body ? JSON.parse(options.body as string) : undefined,
    timestamp: new Date().toISOString()
  };
  const startTime = Date.now();

  try {
    const response = await fetch(url.toString(), { ...options, headers });

    if (!response.ok) {
      let errorData: ToshlErrorResponse | string = STRINGS.TOSHL_HTTP_ERROR(response.status) + ` fetching ${endpoint}`;
      try {
        // Try to parse specific Toshl error format
        const jsonError = await response.json();
        if (jsonError && (jsonError.error || jsonError.description)) {
           errorData = jsonError;
           console.error('Toshl API Error:', errorData);
           
           // Capture error in debug
           debugRequest.error = jsonError.description || jsonError.error;
           debugRequest.duration = Date.now() - startTime;
           addDebugRequest(debugRequest);
           
           throw new Error(STRINGS.TOSHL_API_ERROR_DESC(jsonError.description || jsonError.error, response.status));
        }
      } catch {
         // If parsing fails or it's not the expected format, use the status text
         console.error('Failed to parse Toshl error response or unexpected format.');
      }
      
      // Capture generic error in debug
      const errorMessage = typeof errorData === 'string' ? errorData : STRINGS.TOSHL_HTTP_ERROR(response.status) + ` fetching ${endpoint}`;
      debugRequest.error = errorMessage;
      debugRequest.duration = Date.now() - startTime;
      addDebugRequest(debugRequest);
      
      // Throw generic error if specific one wasn't parsed/thrown
      throw new Error(errorMessage);
    }

    // Handle 204 No Content - might happen on PUT/DELETE, return undefined or handle appropriately
    if (response.status === 204) {
        console.warn(`Received 204 No Content for ${url.toString()}, returning undefined.`);
        
        // Capture 204 response in debug
        debugRequest.response = { status: 204, message: 'No Content' };
        debugRequest.duration = Date.now() - startTime;
        addDebugRequest(debugRequest);
        
        // For a GET request expecting an object, 204 is unusual. Might indicate an error or empty resource.
        // Throwing an error might be more appropriate depending on context.
        // For now, returning undefined as T might cause issues if T isn't Promise<T | undefined>.
        // Let's throw an error for GET requests receiving 204.
        if (options.method === 'GET' || !options.method) {
            throw new Error(`Received unexpected 204 No Content for GET request to ${endpoint}`);
        }
        // For PUT/DELETE, returning something might be needed, but the function signature is Promise<T>.
        // This needs careful handling based on how it's used. Let's assume GET for now.
        // A better approach might be separate functions for GET vs PUT/DELETE.
        // Or adjust the return type to Promise<T | void>.
        // For now, we'll assume GET and throw on 204.
    }

    // Parse the JSON response body
    const data = await response.json() as T;
    
    // Capture successful response in debug
    debugRequest.response = {
      status: response.status,
      data: data
    };
    debugRequest.duration = Date.now() - startTime;
    addDebugRequest(debugRequest);
    
    return data;

  } catch (error) {
    console.error(`Error fetching ${url.toString()}:`, error);
    
    // Capture unexpected error in debug if not already captured
    if (!debugRequest.error) {
      debugRequest.error = error instanceof Error ? error.message : String(error);
      debugRequest.duration = Date.now() - startTime;
      addDebugRequest(debugRequest);
    }
    
    // Re-throw the error so the caller can handle it
    throw error;
  }
}


/**
 * Fetches daily entry sums from Toshl API based on specified criteria.
 * @param apiKey - The Toshl API key.
 * @param from - Start date (YYYY-MM-DD).
 * @param to - End date (YYYY-MM-DD).
 * @param currency - Currency code for the sums.
 * @param filters - Optional additional filters (accounts, categories, tags, etc.).
 * @returns A promise that resolves to an array of daily sums.
 */
export async function fetchDailySums(
  apiKey: string,
  from: string,
  to: string,
  currency: string,
  filters?: {
    accounts?: string;
    categories?: string;
    '!categories'?: string;
    tags?: string;
    '!tags'?: string;
    locations?: string;
    '!locations'?: string;
    search?: string;
    since?: string; // ISO 8601 date-time
    range?: 'day' | 'week' | 'month';
    type?: 'expense' | 'income';
    per_page?: number; // Allow overriding per_page for sums endpoint
  }
): Promise<ToshlDailySumsResponse> { // Use the new type
  const endpoint = '/entries/sums';
  const params = new URLSearchParams({
    from,
    to,
    currency,
    per_page: filters?.per_page?.toString() || '500', // Default to max per_page for sums
    ...(filters?.range && { range: filters.range }),
    ...(filters?.type && { type: filters.type }),
    ...(filters?.accounts && { accounts: filters.accounts }),
    ...(filters?.categories && { categories: filters.categories }),
    ...(filters?.['!categories'] && { '!categories': filters['!categories'] }),
    ...(filters?.tags && { tags: filters.tags }),
    ...(filters?.['!tags'] && { '!tags': filters['!tags'] }),
    ...(filters?.locations && { locations: filters.locations }),
    ...(filters?.['!locations'] && { '!locations': filters['!locations'] }),
    ...(filters?.search && { search: filters.search }),
    ...(filters?.since && { since: filters.since }),
  });

  const endpointWithParams = `${endpoint}?${params.toString()}`;

  // Use fetchFromToshl - it handles auth and base URL.
  // The sums endpoint might not use Link header pagination, but fetchFromToshl
  // should still work correctly for single-page responses or if it does.
  return fetchFromToshl<ToshlDailySum>(endpointWithParams, apiKey, { method: 'GET' });
}

/**
 * Fetches the list of budgets from Toshl API.
 * @param apiKey - The Toshl API key.
 * @param from - Optional start date (YYYY-MM-DD).
 * @param to - Optional end date (YYYY-MM-DD). Defaults to last day of current month if not provided.
 * @returns A promise that resolves to an array of ToshlBudget objects.
 */
export async function fetchToshlBudgets(apiKey: string, from?: string, to?: string): Promise<ToshlBudget[]> {
    const endpoint = '/budgets';
    const params = new URLSearchParams();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Default 'from' date to the first day of the current month if not provided
    const effectiveFrom = from || `${year}-${String(month).padStart(2, '0')}-01`;

    // Default 'to' date to last day of current month if not provided, mirroring MCP server logic
    const effectiveTo = to || (() => {
        // Note: 'now', 'year', 'month' are already defined above for effectiveFrom
        const lastDay = new Date(year, month, 0).getDate(); // Get last day of current month
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    })();

    // Set both effective dates
    params.set('from', effectiveFrom);
    params.set('to', effectiveTo);

    // Add other potential filters here if needed (e.g., status=active)
    // params.set('status', 'active');

    const endpointWithParams = `${endpoint}?${params.toString()}`;
    console.log(`Fetching budgets list with endpoint: ${endpointWithParams}`); // Log the final endpoint with both dates

    // Using fetchFromToshl to handle auth, base URL, and potential pagination
    return fetchFromToshl<ToshlBudget>(endpointWithParams, apiKey, { method: 'GET' });
}
