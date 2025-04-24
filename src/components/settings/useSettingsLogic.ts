import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { fetchToshlSetupData, updateToshlProfile } from '../../lib/toshl';
import { clearGeminiPromptCache } from '../../lib/gemini'; // Import the cache clearing function
import * as STRINGS from '../../constants/strings';

// Define all model options (copied from SettingsPage)
export const geminiModelOptions = [
    { value: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro Preview (Advanced reasoning)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Next-gen speed & reasoning)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Cost-effective & low latency)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast & balanced)' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Large scale, lower intelligence)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Complex reasoning)' },
    { value: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash Preview 04-17 (Adaptive thinking, cost efficiency)' },
];

// Define the return type of the hook
interface UseSettingsLogicReturn {
    toshlApiKey: string;
    setToshlApiKey: React.Dispatch<React.SetStateAction<string>>;
    geminiApiKey: string;
    setGeminiApiKey: React.Dispatch<React.SetStateAction<string>>;
    currency: string;
    setCurrency: React.Dispatch<React.SetStateAction<string>>;
    geminiModel: string;
    setGeminiModel: React.Dispatch<React.SetStateAction<string>>;
    hideNumbers: boolean; // Add hideNumbers state
    setHideNumbers: React.Dispatch<React.SetStateAction<boolean>>; // Add setter
    useCache: boolean; // Add cache toggle
    setUseCache: React.Dispatch<React.SetStateAction<boolean>>; // Add cache toggle setter
    isLoadingSetup: boolean;
    isSaving: boolean; // Add saving state
    handleSave: () => Promise<void>; // Make async
    handleToshlSetup: () => Promise<void>;
    handleClearChatHistory: () => void;
}

const CHAT_MESSAGES_LOCAL_STORAGE_KEY = 'chatMessages'; // Define key constant

export const useSettingsLogic = (): UseSettingsLogicReturn => {
    const [toshlApiKey, setToshlApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [currency, setCurrency] = useState(STRINGS.DEFAULT_CURRENCY_VALUE); // Use constant for default
    const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash'); // Keep specific default model here
    const [hideNumbers, setHideNumbers] = useState<boolean>(() => { // Add hideNumbers state
        const saved = localStorage.getItem('hideNumbers');
        return saved ? JSON.parse(saved) : false;
    });
    const [useCache, setUseCache] = useState<boolean>(() => { // Toggle Gemini context cache (default OFF)
        const saved = localStorage.getItem('useGeminiCache');
        return saved ? JSON.parse(saved) : false;
    });
    const [isLoadingSetup, setIsLoadingSetup] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // State for save operation
    const initialCurrencyRef = useRef<string | null>(null); // Ref to store initial currency

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedToshlKey = localStorage.getItem('toshlApiKey');
        const savedGeminiKey = localStorage.getItem('geminiApiKey');
        const savedCurrency = localStorage.getItem('currency');
        const savedGeminiModel = localStorage.getItem('geminiModel');
        const savedHideNumbers = localStorage.getItem('hideNumbers'); // Load hideNumbers
        const savedUseCache = localStorage.getItem('useGeminiCache'); // Load cache toggle
        const isValidSavedModel = geminiModelOptions.some(option => option.value === savedGeminiModel);

        if (savedToshlKey) setToshlApiKey(savedToshlKey);
        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
        if (savedCurrency) {
            setCurrency(savedCurrency);
            initialCurrencyRef.current = savedCurrency; // Store initial currency
        } else {
             initialCurrencyRef.current = STRINGS.DEFAULT_CURRENCY_VALUE; // Store default if nothing saved
        }
        if (savedHideNumbers) setHideNumbers(JSON.parse(savedHideNumbers)); // Set hideNumbers state
        if (savedUseCache) setUseCache(JSON.parse(savedUseCache)); // Set cache toggle
        if (savedGeminiModel && isValidSavedModel) {
            setGeminiModel(savedGeminiModel);
        } else {
            setGeminiModel('gemini-2.0-flash'); // Fallback to default if invalid/not set
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        let profileUpdateSuccess = true; // Assume success unless API call fails

        // Check if currency changed and API key exists
        const currencyChanged = currency !== initialCurrencyRef.current;
        if (currencyChanged && toshlApiKey) {
            console.log(`Currency changed from ${initialCurrencyRef.current} to ${currency}. Updating Toshl profile...`);
            try {
                await updateToshlProfile(toshlApiKey, { currency: { main: currency } });
                toast.success(STRINGS.TOSHL_CURRENCY_UPDATE_SUCCESS);
                initialCurrencyRef.current = currency; // Update ref to prevent re-updating on immediate re-save
            } catch (error) {
                profileUpdateSuccess = false; // Mark as failed
                console.error('Failed to update Toshl profile currency:', error);
                const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_ERROR;
                toast.error(STRINGS.TOSHL_CURRENCY_UPDATE_FAILED(errorMessage));
                // Do not proceed with saving or reloading if the profile update failed
            }
        }

        // Only save locally and reload if the profile update was successful (or not needed)
        if (profileUpdateSuccess) {
            localStorage.setItem('toshlApiKey', toshlApiKey);
            localStorage.setItem('geminiApiKey', geminiApiKey);
            localStorage.setItem('currency', currency); // Save potentially updated currency
            localStorage.setItem('geminiModel', geminiModel);
            localStorage.setItem('hideNumbers', JSON.stringify(hideNumbers)); // Save hideNumbers state
            localStorage.setItem('useGeminiCache', JSON.stringify(useCache)); // Save cache toggle
            toast.success(STRINGS.SETTINGS_SAVED_SUCCESS); // Use toast for general save success
            // Consider delaying reload slightly to allow toast to be seen
            setTimeout(() => window.location.reload(), 1000); // Refresh the page after 1s
        }

        setIsSaving(false);
    }, [toshlApiKey, geminiApiKey, currency, geminiModel, hideNumbers, useCache]); // Dependencies

    const handleToshlSetup = useCallback(async () => {
        if (!toshlApiKey) {
            alert(STRINGS.TOSHL_API_KEY_REQUIRED_ALERT);
            return;
        }
        setIsLoadingSetup(true);
        try {
            // Fetch setup data including user profile
            const { accounts, categories, tags, userProfile } = await fetchToshlSetupData(toshlApiKey);

            // Store fetched data
            localStorage.setItem('toshlAccounts', JSON.stringify(accounts));
            localStorage.setItem('toshlCategories', JSON.stringify(categories));
            localStorage.setItem('toshlTags', JSON.stringify(tags));
            localStorage.setItem('toshlDataFetched', 'true');

            // Extract main currency and update state + localStorage
            if (userProfile?.currency?.main) {
                const mainCurrency = userProfile.currency.main;
                console.log(`Fetched main currency from Toshl profile: ${mainCurrency}`);
                setCurrency(mainCurrency); // Update state
                localStorage.setItem('currency', mainCurrency); // Save to localStorage
            } else {
                console.warn('Could not find main currency in Toshl user profile. Using default.');
                // Optionally keep the existing default or saved currency
            }

            // Clear Gemini cache after successful setup
            if (geminiApiKey) {
                await clearGeminiPromptCache(geminiApiKey);
            } else {
                console.warn('Gemini API key not available, skipping cache clearing.');
                // Optionally inform the user via toast if this is critical
            }

             // Show success toast (updated message potentially)
             toast.success(STRINGS.TOSHL_SETUP_SUCCESS_ALERT(accounts.length, categories.length, tags.length) + ` Default currency set to ${userProfile?.currency?.main || 'default'}. Gemini cache cleared.`);

         } catch (error) {
             console.error('Toshl setup failed:', error); // Keep console error for debugging
             const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_TOSHL_SETUP_ERROR;
             // Show error toast
             toast.error(STRINGS.TOSHL_SETUP_FAILED_ALERT(errorMessage));
             localStorage.removeItem('toshlDataFetched');
         } finally {
            setIsLoadingSetup(false);
        }
    }, [toshlApiKey, geminiApiKey]); // Add geminiApiKey to dependencies

    // Function to clear chat history from localStorage
    const handleClearChatHistory = useCallback(() => {
        // Optional: Add a confirmation dialog
        // if (window.confirm(STRINGS.CLEAR_CHAT_HISTORY_CONFIRM)) {
            try {
                localStorage.removeItem(CHAT_MESSAGES_LOCAL_STORAGE_KEY);
                console.log("Chat history cleared from localStorage.");
                // Reload the page to reflect the cleared state
                window.location.reload();
            } catch (error) {
                console.error("Failed to clear chat history:", error);
                // Optionally alert the user
                // alert("Failed to clear chat history.");
            }
        // }
    }, []); // No dependencies needed

    return {
        toshlApiKey,
        setToshlApiKey,
        geminiApiKey,
        setGeminiApiKey,
        currency,
        setCurrency,
        geminiModel,
        setGeminiModel,
        hideNumbers, // Return hideNumbers state
        setHideNumbers, // Return setter
        useCache, // Return cache toggle
        setUseCache, // Return cache toggle setter
        isLoadingSetup,
        isSaving, // Return saving state
        handleSave,
        handleToshlSetup,
        handleClearChatHistory,
    };
};
