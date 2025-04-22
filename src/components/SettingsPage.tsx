import React from 'react'; // Removed useState, useEffect
// Removed fetchToshlSetupData import (handled by hook)
import X from 'lucide-react/dist/esm/icons/x';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import * as STRINGS from '../constants/strings';
// Import the custom hook and options
import { useSettingsLogic, geminiModelOptions } from './settings/useSettingsLogic';

interface SettingsPageProps {
  closeSettings: () => void; // Function to close the sidebar
}

const SettingsPage: React.FC<SettingsPageProps> = ({ closeSettings }) => {
  // Use the custom hook to get state and handlers
  const {
    toshlApiKey,
    setToshlApiKey,
    geminiApiKey,
    setGeminiApiKey,
    currency,
    setCurrency,
    geminiModel,
        setGeminiModel,
        hideNumbers, // Get hideNumbers state
        setHideNumbers, // Get setter
        isLoadingSetup,
        handleSave,
        handleToshlSetup,
        handleClearChatHistory,
    } = useSettingsLogic();

  // The component now only focuses on rendering the UI

  return (
    // Themed container
    <div className="flex flex-col h-full bg-app-bg"> {/* Changed main bg to app-bg for consistency */}
       {/* Header with Close Button - Navigation Theme */}
       <header className="sticky top-0 bg-navigation-bg text-navigation-text p-4 shadow-md z-10 flex items-center justify-between"> {/* Use navigation theme */}
         <h1 className="text-xl font-bold tracking-wide">{STRINGS.SETTINGS_TITLE}</h1> {/* Matched ChatInterface */}
         <button
           onClick={closeSettings}
           className="text-navigation-icon hover:text-navigation-text p-2 rounded-full transition duration-200" /* Use navigation theme */
           title={STRINGS.CLOSE_SETTINGS_TITLE}
         >
           <X size={20} /> {/* Consistent icon size */}
         </button>
       </header>

       {/* Scrollable Content Area - Wrapped in Form */}
       <form className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5 bg-card-bg" onSubmit={(e) => { e.preventDefault(); handleSave(); }}> {/* Added bg-card-bg here */}

        {/* Toshl API Key - Themed */}
        <div className="space-y-1">
          <label htmlFor="toshlApiKey" className="block text-sm font-medium text-black-text"> {/* Use Toshl theme color */}
            {STRINGS.TOSHL_API_KEY_LABEL}
          </label>
          <input
            type="password"
            id="toshlApiKey"
            value={toshlApiKey}
            onChange={(e) => setToshlApiKey(e.target.value)}
            className="w-full px-4 py-2 border border-separator-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition duration-200 bg-input-bg text-black-text" /* Use separator-gray */
            placeholder={STRINGS.TOSHL_API_KEY_PLACEHOLDER}
          />
        </div>


        {/* Gemini API Key - Themed */}
        <div className="space-y-1">
          <label htmlFor="geminiApiKey" className="block text-sm font-medium text-black-text"> {/* Use Toshl theme color */}
            {STRINGS.GEMINI_API_KEY_LABEL}
          </label>
          <input
            type="password"
            id="geminiApiKey"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full px-4 py-2 border border-separator-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition duration-200 bg-input-bg text-black-text" /* Use separator-gray */
            placeholder={STRINGS.GEMINI_API_KEY_PLACEHOLDER}
          />
        </div>

        {/* Default Currency - Themed */}
        <div className="space-y-1">
          <label htmlFor="currency" className="block text-sm font-medium text-black-text"> {/* Use Toshl theme color */}
            {STRINGS.DEFAULT_CURRENCY_LABEL}
          </label>
          <input
            type="text"
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border border-separator-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition duration-200 bg-input-bg text-black-text" /* Use separator-gray */
            placeholder={STRINGS.DEFAULT_CURRENCY_PLACEHOLDER}
          />
          <p className="text-xs text-gray-text pt-1">{STRINGS.DEFAULT_CURRENCY_HELP_TEXT}</p> {/* Use Toshl theme color */}
        </div>

        {/* Gemini Model - Themed */}
        <div className="space-y-1">
          <label htmlFor="geminiModel" className="block text-sm font-medium text-black-text"> {/* Use Toshl theme color */}
            {STRINGS.GEMINI_MODEL_LABEL}
          </label>
          <select
            id="geminiModel"
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value)}
            className="w-full px-4 py-2 border border-separator-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition duration-200 appearance-none bg-input-bg text-black-text pr-8" /* Use separator-gray */
          >
            {geminiModelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-text pt-1">{STRINGS.GEMINI_MODEL_HELP_TEXT}</p> {/* Use Toshl theme color */}
        </div>

        {/* Hide Numbers Toggle - Themed */}
        <div className="flex items-center justify-between space-y-1">
          <label htmlFor="hideNumbers" className="block text-sm font-medium text-black-text">
            {STRINGS.HIDE_NUMBERS_LABEL}
          </label>
          <label htmlFor="hideNumbers" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="hideNumbers"
              className="sr-only peer"
              checked={hideNumbers}
              onChange={(e) => setHideNumbers(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-xs text-gray-text pt-1">{STRINGS.HIDE_NUMBERS_HELP_TEXT}</p> {/* Help text */}


        {/* Action Buttons */}
        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-4">
          {/* Setup Toshl Button - Themed (Darker) */}
          <button
              type="button" // Prevent form submission
              onClick={handleToshlSetup}
              disabled={isLoadingSetup || !toshlApiKey}
              className="w-full bg-btn-dark-highlight hover:bg-navigation-bg text-button-text font-semibold py-2.5 px-4 rounded-lg shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navigation-active transition duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed" // Use darker theme colors
            >
              {isLoadingSetup ? (
                <span className="flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  {STRINGS.FETCHING_DATA}
                </span>
              ) : STRINGS.SETUP_TOSHL_BUTTON}
            </button>
            {/* Save Button - Themed (Green) */}
            <button
              type="submit" // Changed to submit for form handling
              className="w-full bg-btn-green hover:bg-btn-green-highlight text-button-text font-semibold py-2.5 px-4 rounded-lg shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-btn-green transition duration-200 ease-in-out" // Use green theme
            >
              {STRINGS.SAVE_SETTINGS_BUTTON}
            </button>
            {/* Clear Chat History Button - Themed (Darker Red) */}
            <button
              type="button" // Prevent form submission
              onClick={handleClearChatHistory}
              className="w-full flex items-center justify-center bg-btn-red text-button-text hover:bg-btn-red/90 font-semibold py-2.5 px-4 rounded-lg shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-btn-red transition duration-200 ease-in-out" // Use solid btn-red bg, white text
            >
              <Trash2 size={18} className="mr-2" />
              {STRINGS.CLEAR_CHAT_HISTORY_BUTTON}
            </button>
            {/* Form submission is handled by the onSubmit prop on the <form> tag */}
        </div>
      </form> {/* Close the form tag */}
    </div>
  );
};

export default SettingsPage;
