import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { fetchToshlSetupData, updateToshlProfile } from '../../lib/toshl';
import { clearGeminiPromptCache } from '../../lib/gemini'; // Import the cache clearing function
import { encryptApiKey, decryptApiKey, getSessionPin, setSessionPin } from '../../utils/encryption';
import { idbStorage } from '../../utils/indexedDbStorage';
import * as STRINGS from '../../constants/strings';

// Define all model options (copied from SettingsPage)
export const geminiModelOptions = [
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (Fastest, cost-efficient)' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Fast Reasoning)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Advanced reasoning)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Old fast model)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Old cheap and fast model)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Adaptive thinking, cost efficiency)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Most cost efficiency)' },
];

// Define the hook's arguments
interface UseSettingsLogicProps {
    onConfigComplete?: () => void;
}

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
    handleRefreshApp: () => void;
}

const CHAT_MESSAGES_LOCAL_STORAGE_KEY = 'chatMessages'; // Define key constant

export const useSettingsLogic = ({ onConfigComplete }: UseSettingsLogicProps = {}): UseSettingsLogicReturn => {
    const [toshlApiKey, setToshlApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [currency, setCurrency] = useState(STRINGS.DEFAULT_CURRENCY_VALUE); // Use constant for default
    const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-lite-preview'); // Keep specific default model here
    const [hideNumbers, setHideNumbers] = useState<boolean>(false); // Loaded from IndexedDB on mount
    const [useCache, setUseCache] = useState<boolean>(false);
    const [securityPin, setSecurityPin] = useState<string>(''); // Loaded from IndexedDB on mount
    const [isLoadingSetup, setIsLoadingSetup] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // State for save operation
    const initialCurrencyRef = useRef<string | null>(null); // Ref to store initial currency

    // Load settings from localStorage on mount
    useEffect(() => {
        void (async () => {
            const [
                savedToshlKeyEncrypted,
                savedGeminiKeyEncrypted,
                savedCurrency,
                savedGeminiModel,
                savedHideNumbers,
                savedUseCache,
            ] = await Promise.all([
                idbStorage.getItem('toshlApiKey'),
                idbStorage.getItem('geminiApiKey'),
                idbStorage.getItem('currency'),
                idbStorage.getItem('geminiModel'),
                idbStorage.getItem('hideNumbers'),
                idbStorage.getItem('useGeminiCache'),
            ]);

            const isValidSavedModel = geminiModelOptions.some(option => option.value === savedGeminiModel);

            const currentPin = getSessionPin();
            if (currentPin) {
                setSecurityPin(currentPin);
                if (savedToshlKeyEncrypted) {
                    try {
                        const decryptedKey = decryptApiKey(savedToshlKeyEncrypted, currentPin);
                        if (decryptedKey) setToshlApiKey(decryptedKey);
                    } catch (error) {
                        console.warn('Failed to decrypt Toshl API key:', error);
                    }
                }
                if (savedGeminiKeyEncrypted) {
                    try {
                        const decryptedGeminiKey = decryptApiKey(savedGeminiKeyEncrypted, currentPin);
                        if (decryptedGeminiKey) setGeminiApiKey(decryptedGeminiKey);
                    } catch (error) {
                        console.warn('Failed to decrypt Gemini API key:', error);
                    }
                }
            }
            if (savedCurrency) {
                setCurrency(savedCurrency);
                initialCurrencyRef.current = savedCurrency;
            } else {
                initialCurrencyRef.current = STRINGS.DEFAULT_CURRENCY_VALUE;
            }
            if (savedHideNumbers) setHideNumbers(JSON.parse(savedHideNumbers));
            if (savedUseCache) setUseCache(JSON.parse(savedUseCache));
            if (savedGeminiModel && isValidSavedModel) {
                setGeminiModel(savedGeminiModel);
            } else {
                setGeminiModel('gemini-3.1-flash-lite-preview');
            }
        })();
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

        // Check for security pin
        if (!securityPin.trim()) {
            toast.error("A security PIN is required to encrypt your keys.");
            setIsSaving(false);
            return;
        }

        // Only save locally if the profile update was successful (or not needed)
        if (profileUpdateSuccess) {
            try {
                // Set the session PIN so they don't have to enter it immediately after saving
                setSessionPin(securityPin);

                await Promise.all([
                    idbStorage.setItem('toshlApiKey', encryptApiKey(toshlApiKey, securityPin)),
                    idbStorage.setItem('geminiApiKey', encryptApiKey(geminiApiKey, securityPin)),
                    idbStorage.setItem('currency', currency),
                    idbStorage.setItem('geminiModel', geminiModel),
                    idbStorage.setItem('hideNumbers', JSON.stringify(hideNumbers)),
                    idbStorage.setItem('useGeminiCache', JSON.stringify(useCache)),
                ]);
                toast.success(STRINGS.SETTINGS_SAVED_SUCCESS); // Use toast for general save success

                // Instead of reloading, just update the initial currency ref to prevent re-updating
                initialCurrencyRef.current = currency;
            } catch (error) {
                console.error('Failed to save settings:', error);
                toast.error('Failed to save settings. Please try again.');
            }
        }

        setIsSaving(false);
    }, [toshlApiKey, geminiApiKey, currency, geminiModel, hideNumbers, useCache, securityPin]); // Dependencies

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
            await Promise.all([
                idbStorage.setItem('toshlAccounts', JSON.stringify(accounts)),
                idbStorage.setItem('toshlCategories', JSON.stringify(categories)),
                idbStorage.setItem('toshlTags', JSON.stringify(tags)),
                idbStorage.setItem('toshlDataFetched', 'true'),
            ]);

            // Extract main currency and update state + localStorage
            if (userProfile?.currency?.main) {
                const mainCurrency = userProfile.currency.main;
                console.log(`Fetched main currency from Toshl profile: ${mainCurrency}`);
                setCurrency(mainCurrency); // Update state
                await idbStorage.setItem('currency', mainCurrency);
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

            // Notify parent component that configuration is complete
            if (onConfigComplete) {
                onConfigComplete();
            }

        } catch (error) {
            console.error('Toshl setup failed:', error); // Keep console error for debugging
            const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_TOSHL_SETUP_ERROR;
            // Show error toast
            toast.error(STRINGS.TOSHL_SETUP_FAILED_ALERT(errorMessage));
            await idbStorage.removeItem('toshlDataFetched');
        } finally {
            setIsLoadingSetup(false);
        }
    }, [toshlApiKey, geminiApiKey, onConfigComplete]); // Add geminiApiKey and onConfigComplete to dependencies

    // Function to clear chat history from localStorage
    const handleClearChatHistory = useCallback(() => {
        // Optional: Add a confirmation dialog
        // if (window.confirm(STRINGS.CLEAR_CHAT_HISTORY_CONFIRM)) {
        void (async () => {
            try {
                await idbStorage.removeItem(CHAT_MESSAGES_LOCAL_STORAGE_KEY);
                console.log("Chat history cleared from IndexedDB.");
                window.location.reload();
            } catch (error) {
                console.error("Failed to clear chat history:", error);
            }
        })();
        // }
    }, []); // No dependencies needed

    // Function to refresh the entire app (hard reload)
    const handleRefreshApp = useCallback(() => {
        try {
            // Force a hard reload to get the latest code and clear any cached resources
            window.location.reload();
        } catch (error) {
            console.error("Failed to refresh app:", error);
        }
    }, []);

    return {
        securityPin,
        setSecurityPin,
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
        handleRefreshApp,
    };
};
