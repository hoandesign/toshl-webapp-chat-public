// Toshl API Client Functions
// Import types from the new types file and re-export them
export * from './toshl/types';
import {
    ToshlAccount,
    ToshlCategory,
    ToshlTag,
    ToshlEntryPayload,
    ToshlEntry,
    FetchEntriesFilters,
    ToshlUserProfile // Import the new user profile type
} from './toshl/types'; // Keep internal imports if needed
// Import the API helper functions
import { fetchFromToshl, fetchSingleFromToshl, fetchDailySums, fetchToshlBudgets, getToshlDebugRequests, addDebugRequest } from './toshl/apiHelper'; // Added fetchSingleFromToshl, fetchDailySums and fetchToshlBudgets
import * as STRINGS from '../constants/strings'; // Import constants

// Use the local proxy path during development to avoid CORS issues
const TOSHL_API_BASE = '/api/toshl';

// --- API Functions ---

/**
 * Fetches all accounts, categories, and tags from Toshl.
 * Uses Basic Authentication (API Key as username, password from storage).
 * Handles pagination automatically.
 * @param apiKey - The Toshl API key (used as username).
 * @returns An object containing arrays of accounts, categories, tags, and the user profile.
 */
export async function fetchToshlSetupData(apiKey: string): Promise<{
  accounts: ToshlAccount[];
  categories: ToshlCategory[];
  tags: ToshlTag[];
  userProfile: ToshlUserProfile; // Add user profile to the return type
}> {
  if (!apiKey) {
    throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
  }

  console.log('Fetching Toshl setup data (accounts, categories, tags, profile)...');
  try {
    // Fetch lists and profile concurrently
    const [accounts, categories, tags, userProfile] = await Promise.all([
      fetchFromToshl<ToshlAccount>('/accounts', apiKey), // Fetch ToshlAccount items
      fetchFromToshl<ToshlCategory>('/categories', apiKey), // Fetch ToshlCategory items
      fetchFromToshl<ToshlTag>('/tags', apiKey), // Fetch ToshlTag items
      fetchSingleFromToshl<ToshlUserProfile>('/me', apiKey), // Fetch user profile
    ]);
    console.log(`Successfully fetched ${accounts.length} accounts, ${categories.length} categories, ${tags.length} tags, and user profile.`);
    return { accounts, categories, tags, userProfile }; // Return all data in an object
  } catch (error) {
    console.error('Failed to fetch Toshl setup data:', error);
    // Propagate the error to be handled by the caller UI
    throw error;
  }
}

/**
 * Updates the Toshl user profile (/me endpoint).
 * Only include fields that need to be updated in the payload.
 * @param apiKey - The Toshl API key.
 * @param payload - A partial ToshlUserProfile object containing the fields to update.
 * @returns A promise resolving to the updated ToshlUserProfile object.
 */
export async function updateToshlProfile(apiKey: string, payload: Partial<ToshlUserProfile>): Promise<ToshlUserProfile> {
    if (!apiKey) {
        throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
    }
    if (!payload || Object.keys(payload).length === 0) {
        throw new Error("Update payload cannot be empty."); // Add specific error
    }

    // Ensure only writable fields are sent. For currency, we only send the 'currency' object.
    // Create a minimal payload based on what we intend to change.
    const updateData: Partial<ToshlUserProfile> = {};
    if (payload.currency) {
        // Only include the 'main' part if that's what we're updating
        if (payload.currency.main) {
            updateData.currency = { main: payload.currency.main };
        } else {
             throw new Error("Payload must include 'currency.main' to update currency.");
        }
        // Add other updatable currency fields here if needed in the future
    }
    // Add other updatable profile fields here if needed (e.g., first_name, last_name)
    if (payload.first_name) updateData.first_name = payload.first_name;
    if (payload.last_name) updateData.last_name = payload.last_name;
    // ... etc. for other writable fields like start_day, locale, timezone, country

    if (Object.keys(updateData).length === 0) {
         throw new Error("No valid fields provided in the update payload.");
    }


    console.log('Updating Toshl user profile (/me) with payload:', updateData);

    try {
        // Use fetchSingleFromToshl with PUT method and the constructed payload
        // This will automatically include debug tracking
        const updatedProfile = await fetchSingleFromToshl<ToshlUserProfile>(
            '/me',
            apiKey,
            {
                method: 'PUT',
                body: JSON.stringify(updateData), // Send only the fields to update
            }
        );
        console.log('Successfully updated Toshl user profile.');
        return updatedProfile; // Toshl PUT /me returns the updated profile
    } catch (error) {
        console.error('Failed to update Toshl user profile:', error);
        // Add more specific error handling if needed based on potential API responses
        throw error; // Re-throw
    }
}


/**
 * Fetches entries from Toshl, optionally filtering by date range, accounts, categories, or tags.
 * Uses Basic Authentication (API Key as username, password from storage).
 * Handles pagination automatically.
 * @param apiKey - The Toshl API key (used as username).
 * @param filters - Optional filters for the entries query.
 * @param filters - Filters for the entries query. 'from' and 'to' are required.
 * @returns A promise that resolves to an array of ToshlEntry objects.
 */
export async function fetchEntries(apiKey: string, filters: FetchEntriesFilters): Promise<ToshlEntry[]> {
    if (!apiKey) {
        throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
    }
    // Explicitly check for required 'from' and 'to' dates
    if (!filters.from || !filters.to) {
        throw new Error(STRINGS.TOSHL_FETCH_REQUIRES_DATES);
    }

    // Construct the endpoint with query parameters based on filters
    const params = new URLSearchParams();
    // Set required dates
    params.set('from', filters.from);
    params.set('to', filters.to);
    // Set optional filters
    if (filters.accounts) params.set('accounts', filters.accounts.join(','));
    // Handle category inclusion and exclusion
    if (filters.categories && filters.categories.length > 0) params.set('categories', filters.categories.join(','));
    if (filters['!categories'] && filters['!categories'].length > 0) params.set('!categories', filters['!categories'].join(',')); // Add exclusion
    // Handle tag filtering logic (inclusion, exclusion, mode)
    if (filters.tags && filters.tags.length > 0) {
        params.set('tags', filters.tags.join(','));
        if (filters.tags_include_mode) {
            params.set('tags_include_mode', filters.tags_include_mode);
        }
    }
    // Note: tags_exclude is kept for potential backward compatibility but !tags is preferred
    if (filters.tags_exclude && filters.tags_exclude.length > 0) {
        params.set('tags_exclude', filters.tags_exclude.join(','));
    }
    // Add !tags exclusion
    if (filters['!tags'] && filters['!tags'].length > 0) params.set('!tags', filters['!tags'].join(','));
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    if (filters.pending !== undefined) params.set('pending', filters.pending.toString());
    if (filters.starred !== undefined) params.set('starred', filters.starred.toString()); // Check API for actual param name
    if (filters.repeat_status) params.set('repeat_status', filters.repeat_status); // Corrected param name
    if (filters.min_amount !== undefined) params.set('min_amount', filters.min_amount.toString());
    if (filters.max_amount !== undefined) params.set('max_amount', filters.max_amount.toString());
    // Add other filters here

    // Base endpoint path without query string for fetchFromToshl
    let endpoint = '/entries';
    const queryString = params.toString();
    if (queryString) {
        endpoint += `?${queryString}`;
    }

    console.log(`Fetching Toshl entries with endpoint: ${endpoint}`);

    try {
        // Use the paginated fetch helper. It will handle adding the page param.
        // Pass the full endpoint including initial filters.
        const entries = await fetchFromToshl<ToshlEntry>(endpoint, apiKey);
        console.log(`Successfully fetched ${entries.length} entries.`);
        return entries;
    } catch (error) {
        console.error('Failed to fetch Toshl entries:', error);
    throw error; // Re-throw
  }
}

// --- Export API Helper Functions ---
// Re-export the helper functions intended for external use
export { fetchFromToshl, fetchSingleFromToshl, fetchDailySums, fetchToshlBudgets, getToshlDebugRequests, addDebugRequest };

/**
 * Fetches a single Toshl entry by its ID.
 * Uses Basic Authentication (API Key as username, password from storage).
 * @param apiKey - The Toshl API key (used as username).
 * @param entryId - The ID of the Toshl entry to fetch.
 * @returns A promise that resolves to the ToshlEntry object.
 */
export async function fetchEntryById(apiKey: string, entryId: string): Promise<ToshlEntry> {
    if (!apiKey) {
        throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
    }
    if (!entryId) {
        throw new Error(STRINGS.TOSHL_ENTRY_ID_REQUIRED_FETCH);
    }

    console.log(`Fetching Toshl entry with ID: ${entryId}`);

    // Retrieve password from local storage
    const password = localStorage.getItem('toshlPassword') || '';
    // Encode API key and password for Basic Auth
    const basicAuth = btoa(`${apiKey}:${password}`);

    const endpoint = `${TOSHL_API_BASE}/entries/${entryId}`;

    // Debug tracking
    const debugRequest = {
        endpoint: `/entries/${entryId}`,
        method: 'GET',
        timestamp: new Date().toISOString()
    };
    const startTime = Date.now();

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
            },
        });

        if (!response.ok) {
            let detailedErrorMessage = STRINGS.TOSHL_HTTP_ERROR(response.status);
            try {
                const jsonError = await response.json();
                console.error('Toshl API Error (Fetch Entry):', jsonError);
                if (jsonError.description || jsonError.error) {
                    detailedErrorMessage = STRINGS.TOSHL_API_ERROR_DESC(jsonError.description || jsonError.error, response.status);
                }
                
                // Capture error in debug
                debugRequest.error = jsonError.description || jsonError.error || detailedErrorMessage;
                debugRequest.duration = Date.now() - startTime;
                addDebugRequest(debugRequest);
                
            } catch (parseError) {
                console.error('Failed to parse Toshl error response body on fetch entry:', parseError);
                
                // Capture generic error in debug
                debugRequest.error = detailedErrorMessage;
                debugRequest.duration = Date.now() - startTime;
                addDebugRequest(debugRequest);
            }
            throw new Error(detailedErrorMessage);
        }

        const entryData = await response.json();
        console.log(`Successfully fetched entry ID: ${entryId}`);
        
        // Capture successful response in debug
        debugRequest.response = {
            status: response.status,
            data: entryData
        };
        debugRequest.duration = Date.now() - startTime;
        addDebugRequest(debugRequest);
        
        return entryData as ToshlEntry;

    } catch (error) {
        console.error(`Failed to fetch Toshl entry ID ${entryId}:`, error);
        
        // Capture unexpected error in debug if not already captured
        if (!debugRequest.error) {
            debugRequest.error = error instanceof Error ? error.message : String(error);
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
        }
        
        throw error; // Re-throw
    }
}


/**
 * Updates an existing Toshl entry by its ID.
 * Uses Basic Authentication (API Key as username, password from storage).
 * @param apiKey - The Toshl API key (used as username).
 * @param entryId - The ID of the Toshl entry to update.
 * @param updatePayload - An object containing the fields to update. Only provided fields will be changed.
 *                        This should be a partial structure based on ToshlEntryPayload.
 * @returns A promise that resolves when the entry is successfully updated (Toshl returns 200 OK with no body).
 */
export async function editToshlEntry(apiKey: string, entryId: string, updatePayload: Partial<ToshlEntryPayload>): Promise<void> {
    if (!apiKey) {
        throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
    }
     if (!entryId) {
         throw new Error(STRINGS.TOSHL_ENTRY_ID_REQUIRED_EDIT);
     }
     if (!updatePayload || Object.keys(updatePayload).length === 0) {
         throw new Error(STRINGS.TOSHL_EDIT_PAYLOAD_EMPTY);
     }

     console.log(`Attempting to update Toshl entry ID ${entryId} with changes:`, updatePayload);

    // Retrieve password from local storage
    const password = localStorage.getItem('toshlPassword') || '';
    // Encode API key and password for Basic Auth
    const basicAuth = btoa(`${apiKey}:${password}`);

     const endpoint = `${TOSHL_API_BASE}/entries/${entryId}`;

     try {
         // 1. Fetch the current entry data first
         console.log(`Fetching current data for entry ID ${entryId} before update...`);
         const currentEntry = await fetchEntryById(apiKey, entryId);

         // 2. Merge the updatePayload into the current entry data
         // Important: Ensure all required fields from the fetched entry are preserved.
         // The 'modified' field from the fetched entry is crucial.
         const finalPayload = {
             ...currentEntry, // Spread the fetched entry first
             ...updatePayload, // Spread the updates, overwriting changed fields
             id: undefined, // Remove id from payload as it's in the URL path
             created: undefined, // Remove created timestamp if present
             // Ensure required fields are present (they should be from currentEntry)
             amount: updatePayload.amount !== undefined ? updatePayload.amount : currentEntry.amount,
             currency: updatePayload.currency !== undefined ? updatePayload.currency : currentEntry.currency,
             date: updatePayload.date !== undefined ? updatePayload.date : currentEntry.date,
             account: updatePayload.account !== undefined ? updatePayload.account : currentEntry.account,
             category: updatePayload.category !== undefined ? updatePayload.category : currentEntry.category,
             modified: currentEntry.modified, // Use the fetched modified timestamp
         };
         // Remove fields that shouldn't be in the PUT payload according to docs (like id, created)
         delete finalPayload.id;
         delete finalPayload.created;
         // Also remove potentially read-only nested fields if necessary (e.g., repeat.id, transaction.id)
         if (finalPayload.repeat) delete (finalPayload.repeat as { id?: string }).id;
         if (finalPayload.transaction) delete (finalPayload.transaction as { id?: string }).id;
         // Remove deleted flag if present, as it's likely read-only
         delete (finalPayload as { deleted?: boolean }).deleted;


         console.log(`Sending merged payload for update to entry ID ${entryId}:`, finalPayload);

         // Debug tracking for the PUT request
         const debugRequest = {
             endpoint: `/entries/${entryId}`,
             method: 'PUT',
             payload: finalPayload,
             timestamp: new Date().toISOString()
         };
         const startTime = Date.now();

         // 3. Send the PUT request with the merged payload
         const response = await fetch(endpoint, {
             method: 'PUT',
             headers: {
                 'Authorization': `Basic ${basicAuth}`,
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(finalPayload),
         });

        // Toshl returns 200 OK on successful update (usually with no body, but check just in case)
        if (response.ok && response.status === 200) {
             console.log(`Successfully updated Toshl entry ID: ${entryId}`);
             // Check if there's a body, although typically there isn't for PUT success
             try {
                 const responseBody = await response.text();
                 if (responseBody) {
                     console.log("Update response body (unexpected):", responseBody);
                 }
                 
                 // Capture successful response in debug
                 debugRequest.response = {
                     status: response.status,
                     body: responseBody || 'No Content'
                 };
                 debugRequest.duration = Date.now() - startTime;
                 addDebugRequest(debugRequest);
                 
             } catch { /* Ignore body parsing errors on success */ }
             return; // Success
        }

        // Handle other non-OK statuses
        let detailedErrorMessage = STRINGS.TOSHL_HTTP_ERROR(response.status);
        try {
            const jsonError = await response.json();
            console.error('Toshl API Error (Update Entry):', jsonError);
            if (jsonError.description || jsonError.error) {
                detailedErrorMessage = STRINGS.TOSHL_API_ERROR_DESC(jsonError.description || jsonError.error, ''); // Status added later
                 if (jsonError.field_errors && Array.isArray(jsonError.field_errors) && jsonError.field_errors.length > 0) {
                    const firstError = jsonError.field_errors[0];
                    detailedErrorMessage += STRINGS.TOSHL_API_ERROR_FIELD(firstError.field, firstError.error);
                 }
                 detailedErrorMessage += STRINGS.TOSHL_API_ERROR_STATUS_SUFFIX(response.status);
            }
            
            // Capture error in debug
            debugRequest.error = jsonError.description || jsonError.error || detailedErrorMessage;
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
            
        } catch (parseError) {
            console.error('Failed to parse Toshl error response body on update:', parseError);
            
            // Capture generic error in debug
            debugRequest.error = detailedErrorMessage;
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
        }
        throw new Error(detailedErrorMessage);

    } catch (error) {
        console.error(`Failed to update Toshl entry ID ${entryId}:`, error);
        
        // Capture unexpected error in debug if not already captured
        if (typeof debugRequest !== 'undefined' && !debugRequest.error) {
            debugRequest.error = error instanceof Error ? error.message : String(error);
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
        }
        
        throw error; // Re-throw
    }
}


/**
 * Deletes a specific Toshl entry by its ID.
 * Uses Basic Authentication (API Key as username, password from storage).
 * @param apiKey - The Toshl API key (used as username).
 * @param entryId - The ID of the Toshl entry to delete.
 * @returns A promise that resolves when the entry is successfully deleted.
 */
export async function deleteToshlEntry(apiKey: string, entryId: string): Promise<void> {
    if (!apiKey) {
        throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
    }
    if (!entryId) {
        throw new Error(STRINGS.TOSHL_ENTRY_ID_REQUIRED_DELETE);
    }

    console.log(`Deleting Toshl entry with ID: ${entryId}`);

    // Retrieve password from local storage
    const password = localStorage.getItem('toshlPassword') || '';
    // Encode API key and password for Basic Auth
    const basicAuth = btoa(`${apiKey}:${password}`);

    const endpoint = `${TOSHL_API_BASE}/entries/${entryId}`;

    // Debug tracking
    const debugRequest = {
        endpoint: `/entries/${entryId}`,
        method: 'DELETE',
        timestamp: new Date().toISOString()
    };
    const startTime = Date.now();

    try {
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${basicAuth}`, // Use Basic Auth with password
            },
        });

        // Toshl returns 204 No Content on successful deletion
        if (response.status === 204) {
            console.log(`Successfully deleted Toshl entry ID: ${entryId}`);
            
            // Capture successful response in debug
            debugRequest.response = {
                status: response.status,
                message: 'Successfully deleted'
            };
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
            
            return; // Success
        }

        // Handle other non-OK statuses
        if (!response.ok) {
            let detailedErrorMessage = STRINGS.TOSHL_HTTP_ERROR(response.status);
            try {
                const jsonError = await response.json();
                console.error('Toshl API Error (Delete Entry):', jsonError);
                if (jsonError.description || jsonError.error) {
                    detailedErrorMessage = STRINGS.TOSHL_API_ERROR_DESC(jsonError.description || jsonError.error, response.status);
                }
                
                // Capture error in debug
                debugRequest.error = jsonError.description || jsonError.error || detailedErrorMessage;
                debugRequest.duration = Date.now() - startTime;
                addDebugRequest(debugRequest);
                
            } catch (parseError) {
                console.error('Failed to parse Toshl error response body on delete:', parseError);
                
                // Capture generic error in debug
                debugRequest.error = detailedErrorMessage;
                debugRequest.duration = Date.now() - startTime;
                addDebugRequest(debugRequest);
            }
            throw new Error(detailedErrorMessage);
        } else {
            // Should not happen if 204 and !response.ok are handled, but as a fallback
            const unexpectedError = STRINGS.TOSHL_UNEXPECTED_DELETE_STATUS(response.status);
            
            // Capture unexpected error in debug
            debugRequest.error = unexpectedError;
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
            
            throw new Error(unexpectedError);
        }
    } catch (error) {
        console.error(`Failed to delete Toshl entry ID ${entryId}:`, error);
        
        // Capture unexpected error in debug if not already captured
        if (!debugRequest.error) {
            debugRequest.error = error instanceof Error ? error.message : String(error);
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
        }
        
        throw error; // Re-throw
    }
}


/**
 * Adds a new expense or income entry to Toshl.
 * Uses Basic Authentication (API Key as username, password from storage).
 * @param apiKey - The Toshl API key (used as username).
 * @param payload - The entry data matching ToshlEntryPayload.
 * @returns The ID of the created entry from the Location header, or the full entry object if available.
 */
export async function addToshlEntry(apiKey: string, payload: ToshlEntryPayload): Promise<string | ToshlEntry> {
   if (!apiKey) {
    throw new Error(STRINGS.TOSHL_API_KEY_REQUIRED);
  }
   // Basic validation - more complex validation (e.g., for repeat) might be needed
   if (!payload.account || !payload.category || !payload.date || payload.amount === undefined || !payload.currency?.code) {
       throw new Error(STRINGS.TOSHL_ADD_MISSING_FIELDS);
   }
   // Validate repeat payload if present
   if (payload.repeat && (!payload.repeat.start || !payload.repeat.frequency || !payload.repeat.interval)) {
       throw new Error(STRINGS.TOSHL_ADD_MISSING_REPEAT_FIELDS);
   }
   // Validate transaction payload if present
   if (payload.transaction && (!payload.transaction.account || !payload.transaction.currency?.code)) {
       throw new Error(STRINGS.TOSHL_ADD_MISSING_TRANSACTION_FIELDS);
   }

  console.log('Adding Toshl entry:', payload);

  // Retrieve password from local storage
  const password = localStorage.getItem('toshlPassword') || '';
  // Encode API key and password for Basic Auth
  const basicAuth = btoa(`${apiKey}:${password}`);

  // Debug tracking
  const debugRequest = {
    endpoint: '/entries',
    method: 'POST',
    payload: payload,
    timestamp: new Date().toISOString()
  };
  const startTime = Date.now();

  try {
     const response = await fetch(`${TOSHL_API_BASE}/entries`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basicAuth}`, // Use Basic Auth with password
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

     if (!response.ok) {
        // Attempt to parse the error response body
        let detailedErrorMessage = STRINGS.TOSHL_HTTP_ERROR(response.status);
        try {
            const jsonError = await response.json();
            console.error('Toshl API Error (Add Entry):', jsonError); // Log the full error object

            // Specifically log field errors if they exist, stringified
            if (jsonError.field_errors) {
                console.error('Toshl Field Errors:', JSON.stringify(jsonError.field_errors, null, 2));
            }

            // Construct a more informative error message
            if (jsonError.description || jsonError.error) {
                 detailedErrorMessage = STRINGS.TOSHL_API_ERROR_DESC(jsonError.description || jsonError.error, ''); // Status added later
                 if (jsonError.field_errors && Array.isArray(jsonError.field_errors) && jsonError.field_errors.length > 0) {
                    const firstError = jsonError.field_errors[0];
                    // Add specific field error details to the message
                    detailedErrorMessage += STRINGS.TOSHL_API_ERROR_FIELD(firstError.field, firstError.error);
                 }
                 detailedErrorMessage += STRINGS.TOSHL_API_ERROR_STATUS_SUFFIX(response.status);
            }
            
            // Capture error in debug
            debugRequest.error = jsonError.description || jsonError.error || detailedErrorMessage;
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
            
        } catch (parseError) {
            // If parsing the JSON fails, log that and keep the basic HTTP status error message
            console.error('Failed to parse Toshl error response body:', parseError);
            
            // Capture generic error in debug
            debugRequest.error = detailedErrorMessage;
            debugRequest.duration = Date.now() - startTime;
            addDebugRequest(debugRequest);
        }
        // Throw the constructed error message outside the inner try...catch
        throw new Error(detailedErrorMessage);
    }

    // Toshl returns 201 Created with Location header pointing to the new entry
    if (response.status === 201) {
        const locationHeader = response.headers.get('Location');
        const entryId = locationHeader ? locationHeader.split('/').pop() : null;
        console.log('Successfully added Toshl entry. ID:', entryId || 'N/A');

        let result: string | ToshlEntry;
        
        // Optionally, try to parse the response body for the created entry details
        try {
            const createdEntry = await response.json();
            if (createdEntry && createdEntry.id) {
                console.log('Returning full created entry object.');
                result = createdEntry as ToshlEntry;
                
                // Capture successful response in debug
                debugRequest.response = {
                    status: response.status,
                    data: createdEntry,
                    locationHeader: locationHeader
                };
                debugRequest.duration = Date.now() - startTime;
                addDebugRequest(debugRequest);
                
                return result;
            }
        } catch {
            console.warn('Could not parse response body after creating entry, returning ID only.');
        }

        // Fallback to returning ID or placeholder
        if (entryId) {
             result = entryId;
        } else {
             console.warn('Toshl entry created but Location header missing and body unparsable.');
             result = STRINGS.TOSHL_ENTRY_CREATED_NO_ID; // Explicit return for this path
        }
        
        // Capture successful response in debug
        debugRequest.response = {
            status: response.status,
            entryId: entryId,
            locationHeader: locationHeader
        };
        debugRequest.duration = Date.now() - startTime;
        addDebugRequest(debugRequest);
        
        return result;
    } else {
        // Should not happen if !response.ok is handled, but as a fallback
        debugRequest.error = `Unexpected status: ${response.status}`;
        debugRequest.duration = Date.now() - startTime;
        addDebugRequest(debugRequest);
        
        throw new Error(STRINGS.TOSHL_UNEXPECTED_STATUS(response.status));
    }
  } catch (error) {
    console.error('Failed to add Toshl entry:', error);
    
    // Capture unexpected error in debug if not already captured
    if (!debugRequest.error) {
      debugRequest.error = error instanceof Error ? error.message : String(error);
      debugRequest.duration = Date.now() - startTime;
      addDebugRequest(debugRequest);
    }
    
    throw error; // Re-throw
  }
}
