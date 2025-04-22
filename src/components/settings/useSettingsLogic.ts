import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; // Import toast
import { fetchToshlSetupData } from '../../lib/toshl';
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
    isLoadingSetup: boolean;
    handleSave: () => void;
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
    const [isLoadingSetup, setIsLoadingSetup] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedToshlKey = localStorage.getItem('toshlApiKey');
        const savedGeminiKey = localStorage.getItem('geminiApiKey');
        const savedCurrency = localStorage.getItem('currency');
        const savedGeminiModel = localStorage.getItem('geminiModel');
        const savedHideNumbers = localStorage.getItem('hideNumbers'); // Load hideNumbers
        const isValidSavedModel = geminiModelOptions.some(option => option.value === savedGeminiModel);

        if (savedToshlKey) setToshlApiKey(savedToshlKey);
        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
        if (savedCurrency) setCurrency(savedCurrency);
        if (savedHideNumbers) setHideNumbers(JSON.parse(savedHideNumbers)); // Set hideNumbers state
        if (savedGeminiModel && isValidSavedModel) {
            setGeminiModel(savedGeminiModel);
        } else {
            setGeminiModel('gemini-2.0-flash'); // Fallback to default if invalid/not set
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    const handleSave = useCallback(() => {
        localStorage.setItem('toshlApiKey', toshlApiKey);
        localStorage.setItem('geminiApiKey', geminiApiKey);
        localStorage.setItem('currency', currency);
        localStorage.setItem('geminiModel', geminiModel);
        localStorage.setItem('hideNumbers', JSON.stringify(hideNumbers)); // Save hideNumbers state
        // alert(STRINGS.SETTINGS_SAVED_ALERT); // Removed alert
        window.location.reload(); // Refresh the page
    }, [toshlApiKey, geminiApiKey, currency, geminiModel, hideNumbers]); // Add hideNumbers dependency

    const handleToshlSetup = useCallback(async () => {
        if (!toshlApiKey) {
            alert(STRINGS.TOSHL_API_KEY_REQUIRED_ALERT);
            return;
        }
        setIsLoadingSetup(true);
        try {
            const { accounts, categories, tags } = await fetchToshlSetupData(toshlApiKey);

            localStorage.setItem('toshlAccounts', JSON.stringify(accounts));
            localStorage.setItem('toshlCategories', JSON.stringify(categories));
            localStorage.setItem('toshlTags', JSON.stringify(tags));
             localStorage.setItem('toshlDataFetched', 'true');

             // Show success toast
             toast.success(STRINGS.TOSHL_SETUP_SUCCESS_ALERT(accounts.length, categories.length, tags.length));

         } catch (error) {
             console.error('Toshl setup failed:', error); // Keep console error for debugging
             const errorMessage = error instanceof Error ? error.message : STRINGS.UNKNOWN_TOSHL_SETUP_ERROR;
             // Show error toast
             toast.error(STRINGS.TOSHL_SETUP_FAILED_ALERT(errorMessage));
             localStorage.removeItem('toshlDataFetched');
         } finally {
            setIsLoadingSetup(false);
        }
    }, [toshlApiKey]); // Dependency on toshlApiKey

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
        isLoadingSetup,
        handleSave,
        handleToshlSetup,
        handleClearChatHistory,
    };
};
