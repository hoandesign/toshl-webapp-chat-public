import { useState, useCallback, useMemo } from 'react';
import { processUserRequestViaGemini } from '../gemini';
import { GeminiChatMessage, GeminiResponseAction, GeminiShowFilters } from './types';
import { ToshlAccount, ToshlCategory, ToshlTag } from '../toshl';

interface UseGeminiAPIReturn {
  processRequest: (
    userInput: string,
    chatHistory: GeminiChatMessage[],
    geminiApiKey: string,
    model: string,
    categories: ToshlCategory[],
    tags: ToshlTag[],
    accounts: ToshlAccount[],
    defaultCurrency: string,
    lastShowContext?: { filters: GeminiShowFilters, headerText: string },
    lastSuccessfulEntryId?: string
  ) => Promise<GeminiResponseAction>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for efficient Gemini API interactions
 */
export const useGeminiAPI = (): UseGeminiAPIReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized wrapper for processUserRequestViaGemini with loading state
  const processRequest = useCallback(
    async (
      userInput: string,
      chatHistory: GeminiChatMessage[],
      geminiApiKey: string,
      model: string,
      categories: ToshlCategory[],
      tags: ToshlTag[],
      accounts: ToshlAccount[],
      defaultCurrency: string,
      lastShowContext?: { filters: GeminiShowFilters, headerText: string },
      lastSuccessfulEntryId?: string
    ): Promise<GeminiResponseAction> => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get user timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const { result } = await processUserRequestViaGemini(
          geminiApiKey,
          model,
          userInput,
          categories,
          tags,
          accounts,
          defaultCurrency,
          userTimezone,
          chatHistory,
          lastShowContext,
          lastSuccessfulEntryId,
          undefined, // currentImage
          false // captureDebugInfo - disabled for this hook
        );
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      processRequest,
      isLoading,
      error
    }),
    [processRequest, isLoading, error]
  );
};

export default useGeminiAPI; 