import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
// Import necessary types from toshl lib
import { ToshlAccount, ToshlCategory, ToshlTag } from '../../lib/toshl';
// Import types from gemini lib, API calls are handled elsewhere
import { GeminiShowFilters } from '../../lib/gemini/types';
// Import the new API handlers
import { handleFetchEntriesApi, handleProcessUserRequestApi, handleDeleteEntryApi } from './apiHandler';
import { getDecryptedApiKey } from '../../utils/encryption';
import * as STRINGS from '../../constants/strings';
import { EntryCardData, Message, MentionSuggestion, AccountBalanceCardData, DebugInfo } from './types'; // Added AccountBalanceCardData
// Removed vietnamese-search import

// Define the return type of the hook, adding retry function and mention logic
interface UseChatLogicReturn {
    messages: Message[];
    inputValue: string;
    // setInputValue: React.Dispatch<React.SetStateAction<string>>; // Replaced by handleInputChange
    isLoading: boolean;
    isRetrying: string | null;
    isDeleting: string | null;
    isLoadingHistory: boolean;
    isBottomSheetOpen: boolean;
    setIsBottomSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
    bottomSheetData: Message[];
    setBottomSheetData: React.Dispatch<React.SetStateAction<Message[]>>;
    handleFetchDateRange: (fromDate?: string, toDate?: string, days?: number, headerTextFromGemini?: string) => Promise<void>;
    handleFormSubmit: (e?: FormEvent) => Promise<void>;
    handleDeleteEntry: (messageId: string, toshlEntryId: string) => Promise<void>;
    handleDeleteMessageLocally: (messageId: string, associatedIds?: string[]) => void; // Updated signature
    handleShowMoreClick: (fullData: EntryCardData[]) => void; // For entries
    handleShowMoreAccountsClick: (fullData: AccountBalanceCardData[]) => void; // Added for accounts
    retrySendMessage: (offlineId: string) => Promise<void>;
    // Mention feature state and handlers
    isMentionPopupOpen: boolean;
    mentionSuggestions: MentionSuggestion[];
    handleInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    handleMentionSelect: (suggestion: MentionSuggestion) => void;
    // Image upload functionality
    selectedImage: string | null;
    handleImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    removeSelectedImage: () => void;
    // Audio recording functionality
    selectedAudio: string | null;
    selectedAudioMetadata: { duration: number; mimeType: string } | null;
    handleAudioRecorded: (audioBlob: Blob, duration: number) => void;
    removeSelectedAudio: () => void;
    // Image cache functionality
    getCachedDisplayImage: (imageId: string) => Promise<string | null>;
    clearImageCache: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'chatMessages';
const TOSHL_ACCOUNTS_KEY = 'toshlAccounts';
const TOSHL_CATEGORIES_KEY = 'toshlCategories';
const TOSHL_TAGS_KEY = 'toshlTags';

// IndexedDB configuration for image caching
const IMAGE_CACHE_DB_NAME = 'ImageCacheDB';
const IMAGE_CACHE_DB_VERSION = 1;
const IMAGE_CACHE_STORE_NAME = 'images';
const MAX_CACHE_SIZE_MB = 50; // Maximum cache size in MB
const MAX_CACHE_ENTRIES = 100; // Maximum number of cached images

// Image cache interface
interface CachedImage {
  id: string;
  displayUrl: string; // Resized version for display
  aiUrl: string; // Original/AI-processing version
  timestamp: number;
  size: number; // Size in bytes
}

// Image validation configuration
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_MB = 10; // Maximum file size in MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096; // Maximum width or height in pixels
const IMAGE_PROCESSING_TIMEOUT_MS = 30000; // 30 seconds timeout

// Image validation result interface
interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
  };
}

// Image cache utility functions
const initImageCacheDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_CACHE_DB_NAME, IMAGE_CACHE_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_CACHE_STORE_NAME)) {
        const store = db.createObjectStore(IMAGE_CACHE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

const cacheImage = async (id: string, displayUrl: string, aiUrl: string): Promise<void> => {
  try {
    const db = await initImageCacheDB();
    const transaction = db.transaction([IMAGE_CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    // Calculate approximate size (base64 data URL size)
    const size = displayUrl.length + aiUrl.length;
    
    // Check if we have enough space before caching
    const totalSize = await getCurrentCacheSize();
    const totalSizeMB = (totalSize + size) / (1024 * 1024);
    
    if (totalSizeMB > MAX_CACHE_SIZE_MB) {
      // Try to cleanup first
      await cleanupImageCache();
      
      // Check again after cleanup
      const newTotalSize = await getCurrentCacheSize();
      const newTotalSizeMB = (newTotalSize + size) / (1024 * 1024);
      
      if (newTotalSizeMB > MAX_CACHE_SIZE_MB) {
        throw new Error(STRINGS.IMAGE_CACHE_STORAGE_FULL);
      }
    }
    
    const cachedImage: CachedImage = {
      id,
      displayUrl,
      aiUrl,
      timestamp: Date.now(),
      size
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(cachedImage);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to store image in cache'));
    });
    
    // Cleanup old entries if needed
    await cleanupImageCache();
    
  } catch (error) {
    console.error('Failed to cache image:', error);
    throw error; // Re-throw to allow caller to handle
  }
};

// Helper function to get current cache size
const getCurrentCacheSize = async (): Promise<number> => {
  try {
    const db = await initImageCacheDB();
    const transaction = db.transaction([IMAGE_CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    const allEntries = await new Promise<CachedImage[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return allEntries.reduce((sum, entry) => sum + entry.size, 0);
  } catch (error) {
    console.error('Failed to get current cache size:', error);
    return 0;
  }
};

const getCachedImage = async (id: string): Promise<CachedImage | null> => {
  try {
    const db = await initImageCacheDB();
    const transaction = db.transaction([IMAGE_CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    return new Promise<CachedImage | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Cache retrieval timeout'));
      }, 5000); // 5 second timeout
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        clearTimeout(timeout);
        const result = request.result;
        
        // Validate cached data integrity
        if (result && result.displayUrl && result.displayUrl.startsWith('data:image/')) {
          resolve(result);
        } else if (result) {
          console.warn(`Invalid cached image data for ${id}, removing from cache`);
          // Remove invalid cache entry
          removeCachedImage(id).catch(console.error);
          resolve(null);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        clearTimeout(timeout);
        reject(request.error || new Error('Failed to retrieve cached image'));
      };
    });
  } catch (error) {
    console.error('Failed to get cached image:', error);
    return null;
  }
};

// Helper function to remove invalid cached images
const removeCachedImage = async (id: string): Promise<void> => {
  try {
    const db = await initImageCacheDB();
    const transaction = db.transaction([IMAGE_CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to remove cached image ${id}:`, error);
  }
};

const cleanupImageCache = async (): Promise<void> => {
  try {
    const db = await initImageCacheDB();
    const transaction = db.transaction([IMAGE_CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    const index = store.index('timestamp');
    
    // Set timeout for cleanup operation
    const cleanupTimeout = setTimeout(() => {
      throw new Error('Cache cleanup timeout');
    }, 10000); // 10 second timeout
    
    try {
      // Get all entries sorted by timestamp (oldest first)
      const allEntries = await new Promise<CachedImage[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('Failed to get cache entries'));
      });
      
      clearTimeout(cleanupTimeout);
      
      if (allEntries.length <= MAX_CACHE_ENTRIES) {
        // Check total size
        const totalSize = allEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
        const totalSizeMB = totalSize / (1024 * 1024);
        
        if (totalSizeMB <= MAX_CACHE_SIZE_MB) {
          return; // No cleanup needed
        }
      }
      
      // Sort by timestamp (oldest first) and remove excess entries
      allEntries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      let currentSize = allEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
      const targetSizeMB = MAX_CACHE_SIZE_MB * 0.8; // Clean up to 80% of max size
      const targetSize = targetSizeMB * 1024 * 1024;
      
      // Remove oldest entries until we're under limits
      const entriesToDelete = [];
      for (let i = 0; i < allEntries.length && (allEntries.length - i > MAX_CACHE_ENTRIES * 0.8 || currentSize > targetSize); i++) {
        const entryToDelete = allEntries[i];
        entriesToDelete.push(entryToDelete);
        currentSize -= (entryToDelete.size || 0);
      }
      
      // Delete entries in batch
      for (const entry of entriesToDelete) {
        try {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(entry.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        } catch (deleteError) {
          console.warn(`Failed to delete cache entry ${entry.id}:`, deleteError);
          // Continue with other deletions
        }
      }
      
      console.log(`Cache cleanup completed. Removed ${entriesToDelete.length} entries.`);
      
    } catch (timeoutError) {
      clearTimeout(cleanupTimeout);
      throw timeoutError;
    }
    
  } catch (error) {
    console.error('Failed to cleanup image cache:', error);
    // Don't throw error to prevent breaking the main flow
  }
};

const clearImageCache = async (): Promise<void> => {
  try {
    const db = await initImageCacheDB();
    const transaction = db.transaction([IMAGE_CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear image cache:', error);
  }
};

// Image validation function
const validateImageFile = (file: File): Promise<ImageValidationResult> => {
  return new Promise((resolve) => {
    // Check file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      resolve({
        isValid: false,
        error: STRINGS.IMAGE_UNSUPPORTED_FORMAT
      });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      resolve({
        isValid: false,
        error: STRINGS.IMAGE_FILE_TOO_LARGE(MAX_FILE_SIZE_MB)
      });
      return;
    }

    // Check image dimensions and validate image integrity
    const img = new Image();
    const reader = new FileReader();

    const timeout = setTimeout(() => {
      resolve({
        isValid: false,
        error: STRINGS.IMAGE_PROCESSING_TIMEOUT
      });
    }, IMAGE_PROCESSING_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeout);
      
      // Check dimensions
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        resolve({
          isValid: false,
          error: STRINGS.IMAGE_DIMENSIONS_INVALID
        });
        return;
      }

      // Check for valid dimensions (not zero)
      if (img.width === 0 || img.height === 0) {
        resolve({
          isValid: false,
          error: STRINGS.IMAGE_CORRUPTED
        });
        return;
      }

      resolve({
        isValid: true,
        metadata: {
          width: img.width,
          height: img.height,
          fileSize: file.size,
          mimeType: file.type
        }
      });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({
        isValid: false,
        error: STRINGS.IMAGE_CORRUPTED
      });
    };

    reader.onload = (event) => {
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        clearTimeout(timeout);
        resolve({
          isValid: false,
          error: STRINGS.IMAGE_PROCESSING_FAILED
        });
      }
    };

    reader.onerror = () => {
      clearTimeout(timeout);
      resolve({
        isValid: false,
        error: STRINGS.IMAGE_PROCESSING_FAILED
      });
    };

    reader.readAsDataURL(file);
  });
};

// Enhanced helper function to resize images with error handling
const resizeImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number,
    callback: (dataUrl: string | null, error?: string) => void
) => {
    const reader = new FileReader();
    
    const timeout = setTimeout(() => {
        callback(null, STRINGS.IMAGE_PROCESSING_TIMEOUT);
    }, IMAGE_PROCESSING_TIMEOUT_MS);

    reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
            clearTimeout(timeout);
            
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    callback(null, STRINGS.IMAGE_RESIZE_FAILED);
                    return;
                }
                
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to data URL with specified quality
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Validate the result
                if (dataUrl && dataUrl.startsWith('data:image/')) {
                    callback(dataUrl);
                } else {
                    callback(null, STRINGS.IMAGE_RESIZE_FAILED);
                }
            } catch {
                callback(null, STRINGS.IMAGE_RESIZE_FAILED);
            }
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            callback(null, STRINGS.IMAGE_CORRUPTED);
        };
        
        if (event.target?.result) {
            img.src = event.target.result as string;
        } else {
            clearTimeout(timeout);
            callback(null, STRINGS.IMAGE_PROCESSING_FAILED);
        }
    };
    
    reader.onerror = () => {
        clearTimeout(timeout);
        callback(null, STRINGS.IMAGE_PROCESSING_FAILED);
    };
    
    reader.readAsDataURL(file);
};

export const useChatLogic = (): UseChatLogicReturn => {
    // Load initial messages from localStorage or set default greeting
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedMessages) {
                // Basic validation: ensure it's an array
                const parsed = JSON.parse(storedMessages);
                return Array.isArray(parsed)
                    ? parsed
                    : [{ id: 'init', text: STRINGS.INITIAL_GREETING, sender: 'system', type: 'system_info', status: 'sent', timestamp: new Date().toISOString() }];
            }
        } catch (error) {
            console.error("Failed to load messages from localStorage:", error);
        }
        return [{ id: 'init', text: STRINGS.INITIAL_GREETING, sender: 'system', type: 'system_info', status: 'sent', timestamp: new Date().toISOString() }];
    });
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false); // General loading for API calls
    const [isRetrying, setIsRetrying] = useState<string | null>(null); // Track which offline message is currently retrying
    const [isDeleting, setIsDeleting] = useState<string | null>(null); // Still needed for delete operations
    const [isLoadingHistory, setIsLoadingHistory] = useState(false); // Still needed for history fetch
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [bottomSheetData, setBottomSheetData] = useState<Message[]>([]);
    const [lastShowContext, setLastShowContext] = useState<{ filters: GeminiShowFilters, headerText: string } | null>(null);
    const [lastSuccessfulEntryId, setLastSuccessfulEntryId] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine); // Track network status

    // --- State for Toshl Data (Accounts, Categories, Tags) ---
    const [accounts, setAccounts] = useState<ToshlAccount[]>([]);
    const [categories, setCategories] = useState<ToshlCategory[]>([]);
    const [tags, setTags] = useState<ToshlTag[]>([]);

// State for Image Uploads
const [selectedImage, setSelectedImage] = useState<string | null>(null);

// State for Audio Recording
const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
const [selectedAudioMetadata, setSelectedAudioMetadata] = useState<{ duration: number; mimeType: string } | null>(null);

// --- State for Mention Feature ---
const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
    const [isMentionPopupOpen, setIsMentionPopupOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionTriggerIndex, setMentionTriggerIndex] = useState<number | null>(null);


    // --- Effects for Network Status, Local Storage, and Data Loading ---

    // Save messages to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save messages to localStorage:", error);
            // Optionally notify user or implement more robust error handling
        }
    }, [messages]);

    // Effect to handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            console.log("Network status: Online");
            setIsOnline(true);
            // Attempt to sync pending messages when coming online
            syncPendingMessages();
        };
        const handleOffline = () => {
            console.log("Network status: Offline");
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup listeners on component unmount
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount/unmount

    // Effect to load Toshl data from localStorage on mount
    useEffect(() => {
        try {
            const storedAccounts = localStorage.getItem(TOSHL_ACCOUNTS_KEY);
            const storedCategories = localStorage.getItem(TOSHL_CATEGORIES_KEY);
            const storedTags = localStorage.getItem(TOSHL_TAGS_KEY);

            if (storedAccounts) setAccounts(JSON.parse(storedAccounts));
            if (storedCategories) setCategories(JSON.parse(storedCategories));
            if (storedTags) setTags(JSON.parse(storedTags));

            console.log("Loaded Toshl data for mentions:", {
                accounts: storedAccounts ? JSON.parse(storedAccounts).length : 0,
                categories: storedCategories ? JSON.parse(storedCategories).length : 0,
                tags: storedTags ? JSON.parse(storedTags).length : 0,
            });
        } catch (error) {
            console.error("Failed to load Toshl data from localStorage for mentions:", error);
        }
    }, []); // Run only on mount

    // Effect to populate cached display images for messages that have imageId but no imageDisplayUrl
    useEffect(() => {
        const populateDisplayImages = async () => {
            const messagesToUpdate: Message[] = [];
            
            for (const message of messages) {
                if (message.imageId && !message.imageDisplayUrl) {
                    const cachedImage = await getCachedImage(message.imageId);
                    if (cachedImage) {
                        messagesToUpdate.push({
                            ...message,
                            imageDisplayUrl: cachedImage.displayUrl
                        });
                    }
                }
            }
            
            if (messagesToUpdate.length > 0) {
                setMessages(prevMessages => 
                    prevMessages.map(msg => {
                        const updatedMessage = messagesToUpdate.find(updated => updated.id === msg.id);
                        return updatedMessage || msg;
                    })
                );
            }
        };
        
        populateDisplayImages();
    }, [messages]); // Include messages dependency as required by ESLint

    // State for selected image and its cache ID
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    // State for selected image metadata
    const [selectedImageMetadata, setSelectedImageMetadata] = useState<{
        width: number;
        height: number;
        fileSize: number;
        mimeType: string;
    } | null>(null);

    const handleImageUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // Validate the image file first
            const validation = await validateImageFile(file);
            
            if (!validation.isValid) {
                // Show error message to user
                const errorMessage: Message = {
                    id: `img_error_${Date.now()}`,
                    text: validation.error || STRINGS.IMAGE_PROCESSING_FAILED,
                    sender: 'system',
                    type: 'error',
                    status: 'error',
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMessage]);
                return;
            }

            const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create display version (smaller, optimized for UI)
            resizeImage(file, 800, 600, 0.7, (displayUrl, displayError) => {
                if (displayError || !displayUrl) {
                    // Show error message for display version failure
                    const errorMessage: Message = {
                        id: `img_display_error_${Date.now()}`,
                        text: displayError || STRINGS.IMAGE_RESIZE_FAILED,
                        sender: 'system',
                        type: 'error',
                        status: 'error',
                        timestamp: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }

                // Create AI processing version (larger, higher quality)
                resizeImage(file, 1024, 1024, 0.8, async (aiUrl, aiError) => {
                    if (aiError || !aiUrl) {
                        // Show error message for AI version failure
                        const errorMessage: Message = {
                            id: `img_ai_error_${Date.now()}`,
                            text: aiError || STRINGS.IMAGE_RESIZE_FAILED,
                            sender: 'system',
                            type: 'error',
                            status: 'error',
                            timestamp: new Date().toISOString()
                        };
                        setMessages(prev => [...prev, errorMessage]);
                        return;
                    }

                    // Set the AI version for immediate use (will be sent to API)
                    setSelectedImage(aiUrl);
                    setSelectedImageId(imageId);
                    
                    // Store the metadata from validation for later use
                    if (validation.metadata) {
                        setSelectedImageMetadata(validation.metadata);
                    }
                    
                    // Try to cache both versions (non-blocking)
                    cacheImage(imageId, displayUrl, aiUrl).catch(cacheError => {
                        // Cache failed but we can still use the image - just log the error
                        console.warn('Image caching failed (non-critical):', cacheError);
                        // Don't show user-facing error message since the image still works
                    });
                });
            });
            
        } catch (error) {
            // Unexpected error during validation
            console.error('Unexpected error during image upload:', error);
            const errorMessage: Message = {
                id: `img_unexpected_error_${Date.now()}`,
                text: STRINGS.IMAGE_PROCESSING_FAILED,
                sender: 'system',
                type: 'error',
                status: 'error',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    }, [setMessages]);

    const removeSelectedImage = useCallback(() => {
        setSelectedImage(null);
        setSelectedImageId(null);
        setSelectedImageMetadata(null);
    }, []);

    // Audio recording handlers
    const handleAudioRecorded = useCallback(async (audioBlob: Blob, duration: number) => {
        try {
            // Convert audio blob to base64
            const { audioToBase64 } = await import('../../lib/audio');
            const base64Audio = await audioToBase64(audioBlob);
            
            setSelectedAudio(base64Audio);
            setSelectedAudioMetadata({
                duration,
                mimeType: audioBlob.type
            });
        } catch (error) {
            console.error('Failed to process recorded audio:', error);
            const errorMessage: Message = {
                id: `audio_error_${Date.now()}`,
                text: STRINGS.AUDIO_PROCESSING_FAILED,
                sender: 'system',
                type: 'error',
                status: 'error',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    }, [setMessages]);

    const removeSelectedAudio = useCallback(() => {
        setSelectedAudio(null);
        setSelectedAudioMetadata(null);
    }, []);

    // --- Core Logic Functions ---

    // Function to fetch and display history (Refactored for single state update)
    const handleFetchDateRange = useCallback(async (fromDate?: string, toDate?: string, days?: number, headerTextFromGemini?: string) => {
        if (!isOnline) {
            setMessages((prev) => [...prev, { id: `err_offline_${Date.now()}`, text: STRINGS.ERROR_OFFLINE_HISTORY, sender: 'system', type: 'error', status: 'error', timestamp: new Date().toISOString() }]);
            return; // Don't attempt fetch if offline
        }
        setIsLoadingHistory(true);
        const loadingId = `hist_loading_${Date.now()}`;
        setMessages((prev) => [...prev, { id: loadingId, text: STRINGS.FETCHING_DATA, sender: 'system', type: 'loading', status: 'sent', timestamp: new Date().toISOString() }]); // Assume sent status for loading

        let messagesToAdd: Message[] = [];

        try {
            // Get API key and data needed for the API call (still needed here to pass to handler)
            const toshlApiKey = getDecryptedApiKey('toshlApiKey');
            if (!toshlApiKey) throw new Error(STRINGS.TOSHL_API_KEY_NOT_CONFIGURED);

            // Fetch categories/tags locally to format results (API handler doesn't need them for fetch)
            const categoriesStr = localStorage.getItem('toshlCategories');
            const tagsStr = localStorage.getItem('toshlTags');
            const categories: ToshlCategory[] = categoriesStr ? JSON.parse(categoriesStr) : [];
            const allTags: ToshlTag[] = tagsStr ? JSON.parse(tagsStr) : [];

            let finalFromDate: string;
            let finalToDate: string;
            let finalHeaderText: string;

            // Determine date range and header text
            if (headerTextFromGemini) {
                finalHeaderText = headerTextFromGemini;
                if (fromDate && toDate) {
                    finalFromDate = fromDate;
                    finalToDate = toDate;
                } else {
                    const numDays = days || 7;
                    const today = new Date();
                    const pastDate = new Date();
                    pastDate.setDate(today.getDate() - numDays);
                    finalFromDate = pastDate.toISOString().split('T')[0];
                    finalToDate = today.toISOString().split('T')[0];
                    console.warn(STRINGS.CONSOLE_WARN_DEFAULT_DATE_RANGE);
                }
            } else if (fromDate && toDate) {
                finalFromDate = fromDate;
                finalToDate = toDate;
                finalHeaderText = STRINGS.HISTORY_HEADER_DATE_RANGE(finalFromDate, finalToDate);
            } else {
                const numDays = days || 7;
                const today = new Date();
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - numDays);
                finalFromDate = pastDate.toISOString().split('T')[0];
                finalToDate = today.toISOString().split('T')[0];
                finalHeaderText = STRINGS.HISTORY_HEADER_LAST_DAYS(numDays);
            }

            const filters = { from: finalFromDate, to: finalToDate };
            const { formattedMessages, rawEntryData } = await handleFetchEntriesApi(filters, toshlApiKey, categories, allTags); // Get raw data too

            const headerMessage: Message = { id: `hist_header_${Date.now()}`, text: finalHeaderText, sender: 'system', type: 'history_header', status: 'sent', timestamp: new Date().toISOString() };

            const PREVIEW_LIMIT = 5; // Define the preview limit

            if (formattedMessages.length > PREVIEW_LIMIT) {
                const messagesToDisplay = formattedMessages.slice(0, PREVIEW_LIMIT).map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message));
                const seeMoreMessage: Message = {
                    id: `hist_see_more_${Date.now()}`,
                    sender: 'system',
                    type: 'history_see_more',
                    text: STRINGS.SEE_MORE_ENTRIES_TEXT(formattedMessages.length), // e.g., "See all 15 entries"
                    fullEntryData: rawEntryData, // Store the full raw data here
                    status: 'sent',
                    timestamp: new Date().toISOString()
                };
                messagesToAdd = [headerMessage, ...messagesToDisplay, seeMoreMessage];
            } else {
                // If 3 or fewer entries, show them all directly
                messagesToAdd = [
                    headerMessage,
                    ...formattedMessages.map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message))
                ];
            }

        } catch (error) {
            console.error(STRINGS.ERROR_FETCHING_ENTRIES_PREFIX, error);
            const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR_FETCHING_ENTRIES;
            messagesToAdd = [{ id: `hist_error_${Date.now()}`, text: `${STRINGS.ERROR_FETCHING_ENTRIES_PREFIX} ${errorMessage}`, sender: 'system', type: 'error', status: 'error', timestamp: new Date().toISOString() }];
        } finally {
            setMessages((prev) => {
                const filtered = prev.filter(msg => msg.id !== loadingId);
                // Ensure messagesToAdd is always an array before spreading
                const finalMessagesToAdd = Array.isArray(messagesToAdd) ? messagesToAdd : [];
                return [...filtered, ...finalMessagesToAdd.map(msg => ({ ...msg, timestamp: new Date().toISOString() }))];
            });
            setIsLoadingHistory(false);
        }
    }, [isOnline]); // Dependencies: setMessages, setIsLoadingHistory, isOnline

    // Function to handle form submission (sending message/creating entry)
    const handleFormSubmit = useCallback(async (e?: FormEvent) => {
        if (e) e.preventDefault();

        // Close mention popup on submit
        setIsMentionPopupOpen(false);
        setMentionTriggerIndex(null);
        setMentionSuggestions([]);

        const text = inputValue.trim();
        if ((!text && !selectedImage && !selectedAudio) || isLoading || isLoadingHistory || isDeleting || isRetrying) return; // Prevent sending while retrying

            setInputValue(''); // Clear input immediately
            const currentImage = selectedImage;
            const currentImageId = selectedImageId;
            const currentAudio = selectedAudio;
            const currentAudioMetadata = selectedAudioMetadata;
            setSelectedImage(null); // Clear selected image
            setSelectedImageId(null); // Clear selected image ID
            setSelectedImageMetadata(null); // Clear selected image metadata
            setSelectedAudio(null); // Clear selected audio
            setSelectedAudioMetadata(null); // Clear selected audio metadata

            if (!isOnline) {
                // --- Offline Handling ---
            const offlineId = `offline_${Date.now()}`;
            const userMessage: Message = {
                id: offlineId, // Use offlineId as the main ID for now
                offlineId: offlineId,
                text,
                image: currentImage || undefined,
                imageId: currentImageId || undefined,
                imageMetadata: currentImage ? {
                    processedAt: new Date().toISOString(),
                    mimeType: selectedImageMetadata?.mimeType || 'image/jpeg', // Use original mime type or default
                    fileSize: selectedImageMetadata?.fileSize || 0,
                    originalWidth: selectedImageMetadata?.width,
                    originalHeight: selectedImageMetadata?.height
                } : undefined,
                audio: currentAudio || undefined,
                audioMetadata: currentAudio ? {
                    duration: currentAudioMetadata?.duration || 0,
                    mimeType: currentAudioMetadata?.mimeType || 'audio/webm',
                    processedAt: new Date().toISOString()
                } : undefined,
                sender: 'user',
                type: 'text',
                status: 'pending', // Mark as pending
                timestamp: new Date().toISOString()
            };
            setMessages((prev) => [...prev, userMessage]);
            console.log(`Message queued offline with ID: ${offlineId}`);
            // No API call here, message saved via useEffect on `messages`
        } else {
            // --- Online Handling ---
            const now = new Date().toISOString();
            const userMessage: Message = { 
                id: `user_${Date.now()}`, 
                text, 
                image: currentImage || undefined, 
                imageId: currentImageId || undefined,
                imageMetadata: currentImage ? {
                    processedAt: new Date().toISOString(),
                    mimeType: selectedImageMetadata?.mimeType || 'image/jpeg', // Use original mime type or default
                    fileSize: selectedImageMetadata?.fileSize || 0,
                    originalWidth: selectedImageMetadata?.width,
                    originalHeight: selectedImageMetadata?.height
                } : undefined,
                audio: currentAudio || undefined,
                audioMetadata: currentAudio ? {
                    duration: currentAudioMetadata?.duration || 0,
                    mimeType: currentAudioMetadata?.mimeType || 'audio/webm',
                    processedAt: new Date().toISOString()
                } : undefined,
                sender: 'user', 
                type: 'text', 
                status: 'sent', 
                timestamp: now 
            }; // Mark as sent initially
            const loadingId = `loading_${Date.now()}`;
            const loadingMessage: Message = { id: loadingId, text: STRINGS.THINKING, sender: 'system', type: 'loading', status: 'sent', timestamp: now };

            setMessages((prev) => [...prev, userMessage, loadingMessage]);
            setIsLoading(true);

            const currentMessages = messages; // Capture state before async call
            const currentLastShowContext = lastShowContext;
            const currentLastSuccessfulEntryId = lastSuccessfulEntryId;

            let resultMessages: Message[] = [];
            let updatedEntryIdForMarking: string | undefined = undefined;

            try {
                const apiResult = await handleProcessUserRequestApi(
                    text,
                    currentMessages,
                    currentLastShowContext,
                    currentLastSuccessfulEntryId,
                    currentImage || undefined,
                    currentAudio || undefined,
                    currentAudioMetadata?.mimeType || undefined
                );

                setLastShowContext(apiResult.newLastShowContext);
                setLastSuccessfulEntryId(apiResult.newLastSuccessfulEntryId);
                // Ensure messages from API have 'sent' status
                resultMessages = apiResult.messagesToAdd.map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message));
                updatedEntryIdForMarking = apiResult.updatedEntryId;

                if (updatedEntryIdForMarking) {
                    const confirmedEntryId = updatedEntryIdForMarking;
                    setMessages(prevMessages =>
                        prevMessages.map(msg =>
                            (msg.type === 'entry_success' || msg.type === 'history_entry') && msg.entryData?.id === confirmedEntryId
                                ? { ...msg, type: 'system_info', text: STRINGS.ENTRY_CARD_REMOVED_UPDATED(confirmedEntryId), entryData: undefined, isDeleted: true, status: 'sent', timestamp: new Date().toISOString() } as Message // Mark as sent
                                : msg
                        )
                    );
                }

            } catch (error) {
                console.error(STRINGS.ERROR_PROCESSING_MESSAGE_PREFIX, error);
                const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR;
                
                // Try to extract debug info from the error if it's available
                let debugInfo: DebugInfo | undefined = undefined;
                if (error && typeof error === 'object' && 'debugInfo' in error) {
                    debugInfo = (error as { debugInfo: DebugInfo }).debugInfo;
                }
                
                // Mark error message with 'error' status and include debug info if available
                resultMessages = [{ 
                    id: `error_${Date.now()}`, 
                    text: `${STRINGS.GENERIC_ERROR_PREFIX}${errorMessage}`, 
                    sender: 'system', 
                    type: 'error', 
                    status: 'error', 
                    timestamp: new Date().toISOString(),
                    debugInfo: debugInfo
                }];
            } finally {
                setMessages((prev) => {
                    const filtered = prev.filter(msg => msg.id !== loadingId);
                    const finalMessagesToAdd = Array.isArray(resultMessages) ? resultMessages : [];
                    return [...filtered, ...finalMessagesToAdd.map(msg => ({ ...msg, timestamp: new Date().toISOString() }))];
                });
                setIsLoading(false);
            }
        }
    }, [inputValue, isLoading, isLoadingHistory, isDeleting, isRetrying, isOnline, messages, lastShowContext, lastSuccessfulEntryId, selectedImage, selectedImageId, selectedImageMetadata, selectedAudio, selectedAudioMetadata]); // Added missing audio dependencies

    // Function to handle deleting a Toshl entry
    const handleDeleteEntry = useCallback(async (messageId: string, toshlEntryId: string) => {
        if (!toshlEntryId || toshlEntryId === 'unknown_id' || toshlEntryId === STRINGS.TOSHL_ENTRY_CREATED_NO_ID) {
            console.error(STRINGS.CANNOT_DELETE_MISSING_ID_CONSOLE);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, text: STRINGS.ERROR_CANNOT_DELETE_MISSING_ID, type: 'error', entryData: undefined, status: 'error', timestamp: new Date().toISOString() } : msg // Add status
            ));
            return;
        }
        // Prevent deleting if offline? Or allow and sync later? For now, allow online only.
        if (!isOnline) {
             setMessages(prev => prev.map(msg =>
                 msg.id === messageId ? { ...msg, text: STRINGS.ERROR_OFFLINE_DELETE, type: 'error', status: 'error', timestamp: new Date().toISOString() } : msg
             ));
             return;
        }

        setIsDeleting(messageId);

        try {
            await handleDeleteEntryApi(toshlEntryId);
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId
                        ? { ...msg, isDeleted: true, entryData: undefined, text: STRINGS.ENTRY_DELETED_SUCCESS(toshlEntryId), type: 'system_info', status: 'sent', timestamp: new Date().toISOString() } // Mark as sent
                        : msg
                )
            );
        } catch (error) {
            console.error(`Failed to delete Toshl entry ${toshlEntryId}:`, error);
            const errorText = error instanceof Error ? error.message : STRINGS.UNKNOWN_DELETION_ERROR;
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId
                        ? { ...msg, text: `${STRINGS.ERROR_DELETING_ENTRY_PREFIX}${errorText}`, type: 'error', entryData: undefined, status: 'error', timestamp: new Date().toISOString() } // Mark as error
                        : msg
                )
            );
        } finally {
            setIsDeleting(null);
        }
    }, [isOnline]); // Added isOnline dependency

    // Function to handle clicking the "Show More" prompt
    const handleShowMoreClick = useCallback((fullData: EntryCardData[]) => {
        if (!fullData || fullData.length === 0) return;

        // Map the full EntryCardData back to Message objects for the bottom sheet
        const bottomSheetMessages: Message[] = fullData.map((entryData, index) => ({
            id: `bs_${entryData.id}_${index}`, // Use a different prefix for ID if needed
            sender: 'system', // Or 'bot', depending on how you want it styled in the sheet
            type: 'history_entry', // Use the same type as regular history entries
            entryData: entryData,
            timestamp: new Date().toISOString()
        }));

        // Add a header to the bottom sheet data if desired
        // Example: Find the original header message if possible, or create a generic one
        // For simplicity, let's assume no header for now, but you could add one:
        // bottomSheetMessages.unshift({ id: `bs_header_${Date.now()}`, text: "Full Entry List", sender: 'system', type: 'history_header' });

        setBottomSheetData(bottomSheetMessages);
        setIsBottomSheetOpen(true);
    }, []);

    // Function to handle clicking the "Show More Accounts" prompt
    const handleShowMoreAccountsClick = useCallback((fullData: AccountBalanceCardData[]) => {
        if (!fullData || fullData.length === 0) return;

        // Map the full AccountBalanceCardData back to Message objects for the bottom sheet
        const bottomSheetMessages: Message[] = fullData.map((accountData, index) => ({
            id: `bs_acc_${accountData.id}_${index}`,
            sender: 'bot', // Use 'bot' sender for card display
            type: 'account_balance', // Use the single account balance type
            accountBalanceData: accountData,
            text: undefined,
            timestamp: new Date().toISOString()
        }));

        // Optional: Add a header to the bottom sheet
        // bottomSheetMessages.unshift({ id: `bs_acc_header_${Date.now()}`, text: "All Account Balances", sender: 'system', type: 'history_header' });

        setBottomSheetData(bottomSheetMessages);
        setIsBottomSheetOpen(true);
    }, []);


    // --- Mention Feature Logic ---

    const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        const cursorPosition = event.target.selectionStart;
        setInputValue(newValue);

        // Check if we are currently inside a potential mention
        const textBeforeCursor = newValue.substring(0, cursorPosition);
        const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtSymbolIndex !== -1) {
            const potentialQuery = textBeforeCursor.substring(lastAtSymbolIndex + 1);
            // Allow any non-space characters in the query after '@'
            if (!potentialQuery.includes(' ')) {
                const lowerCaseQuery = potentialQuery.toLowerCase();
                setMentionTriggerIndex(lastAtSymbolIndex);
                setMentionQuery(lowerCaseQuery); // Revert to lowercase for consistency
                setIsMentionPopupOpen(true);
                // console.log(`Mention triggered: query='${lowerCaseQuery}', index=${lastAtSymbolIndex}`); // Remove logging
            } else {
                // Invalid character or space entered after @, close popup
                // console.log("Mention closed: space entered"); // Remove logging
                setIsMentionPopupOpen(false);
                setMentionTriggerIndex(null);
                setMentionSuggestions([]);
            }
        } else {
            // No '@' found before cursor, close popup
            // if (isMentionPopupOpen) { // Only log if it was open
            //      console.log("Mention closed: no @ detected before cursor"); // Remove logging
            // }
            setIsMentionPopupOpen(false);
            setMentionTriggerIndex(null);
            setMentionSuggestions([]);
        }
    }, []); // Removed unnecessary dependencies as they're not used in the function

    // Effect to filter suggestions when query changes
    useEffect(() => {
        // console.log(`Filtering effect: open=${isMentionPopupOpen}, index=${mentionTriggerIndex}, query='${mentionQuery}'`); // Remove logging
        if (!isMentionPopupOpen || mentionTriggerIndex === null) {
            // Only clear if suggestions exist, prevent unnecessary updates
            if (mentionSuggestions.length > 0) {
                setMentionSuggestions([]);
                // console.log("Filtering effect: clearing suggestions (not open or no index)"); // Remove logging
            }
            return;
        }

        const query = mentionQuery.trim(); // Trimmed query for searching
        // console.log(`Filtering effect: trimmed query='${query}'`); // Remove logging

        if (query === '') {
            // Show initial suggestions (e.g., recent or all?) - For now, show all if query is empty after @
            const allSuggestions: MentionSuggestion[] = [
                ...accounts.map(a => ({ id: a.id, name: a.name, type: 'account' as const })),
                ...categories.map(c => ({ id: c.id, name: c.name, type: 'category' as const })),
                ...tags.map(t => ({ id: t.id, name: t.name, type: 'tag' as const })),
            ];
            const limitedSuggestions = allSuggestions.slice(0, 10); // Limit initial suggestions
            setMentionSuggestions(limitedSuggestions);
            // console.log("Filtering effect: set initial suggestions", limitedSuggestions); // Remove logging
            return;
        }

        const filteredSuggestions: MentionSuggestion[] = [];
        const lowerCaseQuery = query.toLowerCase(); // Ensure query is lowercase for comparison

        // Filter Accounts using standard JS includes()
        accounts.forEach(account => {
            if (account.name.toLowerCase().includes(lowerCaseQuery)) {
                filteredSuggestions.push({ id: account.id, name: account.name, type: 'account' });
            }
        });

        // Filter Categories using standard JS includes()
        categories.forEach(category => {
            if (category.name.toLowerCase().includes(lowerCaseQuery)) {
                filteredSuggestions.push({ id: category.id, name: category.name, type: 'category' });
            }
        });

        // Filter Tags using standard JS includes()
        tags.forEach(tag => {
            if (tag.name.toLowerCase().includes(lowerCaseQuery)) {
                filteredSuggestions.push({ id: tag.id, name: tag.name, type: 'tag' });
            }
        });

        const limitedFilteredSuggestions = filteredSuggestions.slice(0, 10); // Limit results
        setMentionSuggestions(limitedFilteredSuggestions);
        // console.log(`Filtering effect: found ${filteredSuggestions.length} matches, showing ${limitedFilteredSuggestions.length}`, limitedFilteredSuggestions); // Remove logging

    }, [mentionQuery, isMentionPopupOpen, mentionTriggerIndex, accounts, categories, tags, mentionSuggestions.length]); // Added back mentionSuggestions.length dependency


    const handleMentionSelect = useCallback((suggestion: MentionSuggestion) => {
        if (mentionTriggerIndex === null) return;

        const textBeforeMention = inputValue.substring(0, mentionTriggerIndex);
        // Include the type prefix for clarity, e.g., "category:Groceries"
        const formattedSuggestion = `${suggestion.type}:${suggestion.name}`;
        // Add a space after the suggestion for better UX
        const textAfterMention = inputValue.substring(mentionTriggerIndex + mentionQuery.length + 1); // +1 for '@'

        const newValue = `${textBeforeMention}@${formattedSuggestion} ${textAfterMention}`;

        setInputValue(newValue);

        // Reset mention state
        setIsMentionPopupOpen(false);
        setMentionTriggerIndex(null);
        setMentionQuery('');
        setMentionSuggestions([]);

        // TODO: Focus textarea and move cursor after the inserted text
        // This might need to be handled in ChatInterface.tsx using a ref

    }, [inputValue, mentionTriggerIndex, mentionQuery]);


    // --- Offline Retry and Sync Logic ---

    const retrySendMessage = useCallback(async (offlineId: string) => {
        const messageToRetry = messages.find(msg => msg.offlineId === offlineId && msg.status === 'pending');

        if (!messageToRetry || !messageToRetry.text || !isOnline) {
            console.warn(`Cannot retry message ${offlineId}. Not found, no text, or offline.`);
            if (!isOnline) {
                 setMessages(prev => prev.map(msg => msg.offlineId === offlineId ? { ...msg, text: `${messageToRetry?.text}\n${STRINGS.ERROR_OFFLINE_RETRY}` } : msg));
            }
            return;
        }

        console.log(`Retrying message with offline ID: ${offlineId}`);
        setIsRetrying(offlineId); // Set retrying state for this specific message

        // Use the existing handleFormSubmit logic, but adapted for retry
        const text = messageToRetry.text;
        // Need context from messages *before* the one being retried
        const messagesBeforeRetry = messages.slice(0, messages.findIndex(msg => msg.offlineId === offlineId));
        const currentLastShowContext = lastShowContext; // Use current context
        const currentLastSuccessfulEntryId = lastSuccessfulEntryId; // Use current context

        let resultMessages: Message[] = [];
        let updatedEntryIdForMarking: string | undefined = undefined;

        try {
            const apiResult = await handleProcessUserRequestApi(
                text,
                messagesBeforeRetry, // Pass messages *before* the retried one for context
                currentLastShowContext,
                currentLastSuccessfulEntryId,
                messageToRetry.image || undefined,
                messageToRetry.audio || undefined,
                messageToRetry.audioMetadata?.mimeType || undefined
            );

            setLastShowContext(apiResult.newLastShowContext);
            setLastSuccessfulEntryId(apiResult.newLastSuccessfulEntryId);
            // Ensure messages from API have 'sent' status
            resultMessages = apiResult.messagesToAdd.map(msg => ({ ...msg, status: 'sent', timestamp: new Date().toISOString() } as Message));
            updatedEntryIdForMarking = apiResult.updatedEntryId;

            // --- Update state after successful retry ---
            setMessages(prev => {
                // Remove the original pending message
                const withoutPending = prev.filter(msg => msg.offlineId !== offlineId);
                // Add the new successful messages
                const finalMessages = [...withoutPending, ...resultMessages];

                // If an edit happened, mark older versions (might need adjustment if context is complex)
                if (updatedEntryIdForMarking) {
                    const confirmedId = updatedEntryIdForMarking;
                    return finalMessages.map(msg =>
                        (msg.type === 'entry_success' || msg.type === 'history_entry') && msg.entryData?.id === confirmedId && msg.offlineId !== offlineId // Don't mark the newly added one
                            ? { ...msg, type: 'system_info', text: STRINGS.ENTRY_CARD_REMOVED_UPDATED(confirmedId), entryData: undefined, isDeleted: true, status: 'sent', timestamp: new Date().toISOString() } as Message
                            : msg
                    );
                }
                return finalMessages;
            });
            // --- End state update ---

        } catch (error) {
            console.error(`Error retrying message ${offlineId}:`, error);
            const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR;
            
            // Try to extract debug info from the error if it's available
            let debugInfo: DebugInfo | undefined = undefined;
            if (error && typeof error === 'object' && 'debugInfo' in error) {
                debugInfo = (error as { debugInfo: DebugInfo }).debugInfo;
            }
            
            // Update the original message status to 'error'
            setMessages(prev => prev.map(msg =>
                msg.offlineId === offlineId
                    ? { 
                        ...msg, 
                        status: 'error', 
                        text: `${msg.text}\n${STRINGS.ERROR_RETRY_FAILED} ${errorMessage}`,
                        debugInfo: debugInfo
                    } // Append error info
                    : msg
            ));
        } finally {
            setIsRetrying(null); // Clear retrying state
        }

    }, [messages, isOnline, lastShowContext, lastSuccessfulEntryId, setMessages, setLastShowContext, setLastSuccessfulEntryId]); // Removed setIsLoading as it's not necessary

    // Function to sync all pending messages (called on going online)
    const syncPendingMessages = useCallback(async () => {
        const pending = messages.filter(msg => msg.status === 'pending' && msg.offlineId);
        if (pending.length > 0) {
            console.log(`Syncing ${pending.length} pending messages...`);
            // Retry messages one by one sequentially to maintain order and context
            for (const msg of pending) {
                if (msg.offlineId) {
                    // Check if still online before each retry attempt
                    if (!navigator.onLine) {
                        console.warn("Went offline during sync, stopping.");
                        break;
                    }
                    await retrySendMessage(msg.offlineId);
                    // Optional: Add a small delay between retries if needed
                    // await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            console.log("Sync attempt finished.");
        }
    }, [messages, retrySendMessage]); // Dependencies for sync

    // Function to delete a message locally (not from Toshl API)
    // Updated to handle associated IDs for grouped messages
    const handleDeleteMessageLocally = useCallback((messageId: string, associatedIds?: string[]) => {
        const idsToDelete = new Set<string>([messageId]);
        if (associatedIds) {
            associatedIds.forEach(id => idsToDelete.add(id));
        }
        console.log(`Locally deleting messages with IDs: ${Array.from(idsToDelete).join(', ')}`);
        setMessages(prev => prev.filter(msg => !idsToDelete.has(msg.id)));
        // localStorage update happens automatically via the useEffect watching `messages`
    }, []);


    return {
        messages,
        inputValue,
        // setInputValue, // Removed
        isLoading,
        isRetrying, // Added missing return
        isDeleting,
        isLoadingHistory,
        isBottomSheetOpen,
        setIsBottomSheetOpen,
        bottomSheetData,
        setBottomSheetData,
        handleFetchDateRange,
        handleFormSubmit,
        handleDeleteEntry,
        handleDeleteMessageLocally,
        handleShowMoreClick,
        handleShowMoreAccountsClick, // Added handler
        retrySendMessage,
        // Mention feature
        isMentionPopupOpen,
        mentionSuggestions,
        handleInputChange,
        handleMentionSelect,
        // Image upload
        selectedImage,
        handleImageUpload,
        removeSelectedImage,
        // Audio recording
        selectedAudio,
        selectedAudioMetadata,
        handleAudioRecorded,
        removeSelectedAudio,
        // Image cache
        getCachedDisplayImage: useCallback(async (imageId: string): Promise<string | null> => {
            try {
                const cachedImage = await getCachedImage(imageId);
                if (cachedImage && cachedImage.displayUrl) {
                    // Validate that the cached URL is still valid
                    if (cachedImage.displayUrl.startsWith('data:image/')) {
                        return cachedImage.displayUrl;
                    } else {
                        console.warn(`Invalid cached image URL for ${imageId}`);
                        return null;
                    }
                }
                return null;
            } catch (error) {
                console.error(`Failed to get cached display image for ${imageId}:`, error);
                return null;
            }
        }, []),
        clearImageCache: useCallback(async (): Promise<void> => {
            await clearImageCache();
        }, []),
    };
};
