import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import LoadingFallback from './components/LoadingFallback';
import './index.css';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { initializeViewportHeight, cleanupViewportHeight } from './utils/viewport';
import { idbStorage } from './utils/indexedDbStorage';
import { getSessionPin, decryptApiKey } from './utils/encryption';

// Lazy load components
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen'));
const PinPrompt = lazy(() => import('./components/PinPrompt'));

type AppStatus = 'checking' | 'needs_config' | 'needs_pin' | 'ready';

function App() {
  const [appStatus, setAppStatus] = useState<AppStatus>('checking');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hideNumbers, setHideNumbers] = useState<boolean>(false);

  const refreshFromStorage = useCallback(async () => {
    const [toshlKey, geminiKey, dataFetched, savedHideNumbers] = await Promise.all([
      idbStorage.getItem('toshlApiKey'),
      idbStorage.getItem('geminiApiKey'),
      idbStorage.getItem('toshlDataFetched'),
      idbStorage.getItem('hideNumbers'),
    ]);

    if (savedHideNumbers) setHideNumbers(JSON.parse(savedHideNumbers));

    if (toshlKey && geminiKey && dataFetched === 'true') {
        const pin = getSessionPin();
        if (pin) {
            // Try to decrypt to verify the PIN is still valid/correct
            const decrypted = decryptApiKey(toshlKey, pin);
            if (decrypted) {
                setAppStatus('ready');
            } else {
                setAppStatus('needs_pin');
            }
        } else {
            setAppStatus('needs_pin');
        }
    } else {
        setAppStatus('needs_config');
    }
  }, []);

  useEffect(() => {
    initializeViewportHeight();
    // One-time migration from legacy localStorage keys.
    void (async () => {
      await idbStorage.migrateFromLocalStorage([
        'toshlApiKey',
        'geminiApiKey',
        'currency',
        'geminiModel',
        'hideNumbers',
        'useGeminiCache',
        'toshlAccounts',
        'toshlCategories',
        'toshlTags',
        'toshlDataFetched',
        'chatMessages',
        'quickAddMessages',
        'toshlPassword',
      ]);
      await refreshFromStorage();
    })();
    return () => {
      cleanupViewportHeight();
    };
  }, [refreshFromStorage]);

  const handleConfigComplete = () => {
    void refreshFromStorage();
  };

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => {
      const next = !prev;
      // When closing settings, re-sync app state from storage.
      if (prev && !next) {
        void refreshFromStorage();
      }
      return next;
    });
  }, [refreshFromStorage]);

  const renderContent = () => {
    switch (appStatus) {
      case 'checking':
        return <LoadingFallback />;
      case 'needs_config':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <WelcomeScreen onConfigComplete={handleConfigComplete} />
          </Suspense>
        );
      case 'needs_pin':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PinPrompt onPinSuccess={() => setAppStatus('ready')} />
          </Suspense>
        );
      case 'ready':
        return (
          <>
            <Suspense fallback={<LoadingFallback />}>
              <ChatInterface
                isSettingsOpen={isSettingsOpen}
                toggleSettings={toggleSettings}
                hideNumbers={hideNumbers}
              />
            </Suspense>
            {isSettingsOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300 ease-in-out"
                onClick={toggleSettings}
              />
            )}
            <div
              className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-[9999] transform transition-transform duration-300 ease-in-out overflow-y-auto
                         ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <Suspense fallback={<div className="p-4 flex justify-center items-center h-full"><div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div></div>}>
                <SettingsPage closeSettings={toggleSettings} onConfigComplete={handleConfigComplete} isModal={true} />
              </Suspense>
            </div>
          </>
        );
    }
  };

  return (
    <div className="App h-screen relative overflow-hidden bg-app-bg text-black-text font-sans">
      <Toaster position="top-center" reverseOrder={false} />
      {renderContent()}
      <SpeedInsights />
    </div>
  );
}

export default App;
