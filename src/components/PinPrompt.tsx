import React, { useState } from 'react';
import { Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { idbStorage } from '../utils/indexedDbStorage';
import { decryptApiKey, setSessionPin, clearSessionPin } from '../utils/encryption';
import toast from 'react-hot-toast';

interface PinPromptProps {
    onPinSuccess: () => void;
}

const PinPrompt: React.FC<PinPromptProps> = ({ onPinSuccess }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!pin.trim()) {
            setError('Please enter your PIN.');
            return;
        }

        try {
            // Fetch one of the stored encrypted keys to verify the PIN
            const encryptedKey = await idbStorage.getItem('toshlApiKey');
            if (!encryptedKey) {
                // Should not happen if this component is rendered properly, but handle it
                setError('No stored keys found. Please reset and reconfigure.');
                return;
            }

            const decrypted = decryptApiKey(encryptedKey, pin);

            if (decrypted && decrypted.trim() !== '') {
                // PIN is correct (or at least decrypts into a non-empty string)
                setSessionPin(pin);
                onPinSuccess();
            } else {
                setError('Incorrect PIN. Please try again.');
            }
        } catch (err) {
            console.error('Decryption error:', err);
            setError('An error occurred during decryption.');
        }
    };

    const handleReset = async () => {
        const confirmReset = window.confirm(
            'Are you sure you want to reset everything? This will clear your stored API keys, configuration, and chat history. You will need to set up the application again.'
        );

        if (!confirmReset) return;

        setIsResetting(true);
        try {
            clearSessionPin();
            await idbStorage.removeItem('toshlApiKey');
            await idbStorage.removeItem('geminiApiKey');
            await idbStorage.removeItem('toshlDataFetched');
            // optionally remove other settings, but removing these will force a reconfiguration

            toast.success('App reset successful. Redirecting to setup...');
            // Reload the page to reset all states and redirect to welcome screen
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error('Reset error:', err);
            toast.error('Failed to reset the application.');
            setIsResetting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Enter Security PIN</h2>
                    <p className="text-center text-gray-600 mt-2">
                        Your API keys are encrypted. Please enter your PIN to unlock them for this session.
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="Enter your PIN"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow hover:shadow-md transition duration-200"
                    >
                        Unlock Application
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center mb-3">
                        Forgot your PIN? The only way to recover access is to reset the application and enter your API keys again.
                    </p>
                    <button
                        onClick={handleReset}
                        disabled={isResetting}
                        className="w-full flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2.5 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                        Reset Everything
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PinPrompt;
