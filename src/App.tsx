import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import LoadingFallback from './components/LoadingFallback';
import './index.css';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { initializeViewportHeight, cleanupViewportHeight } from './utils/viewport';

// Lazy load components
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen'));

type AppStatus = 'checking' | 'needs_config' | 'ready';

function App() {
  const [appStatus, setAppStatus] = useState<AppStatus>('checking');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hideNumbers, setHideNumbers] = useState<boolean>(false);

  const checkConfig = useCallback(() => {
    const toshlKey = localStorage.getItem('toshlApiKey');
    const geminiKey = localStorage.getItem('geminiApiKey');
    const dataFetched = localStorage.getItem('toshlDataFetched');
    const savedHideNumbers = localStorage.getItem('hideNumbers');

    if (toshlKey && geminiKey && dataFetched === 'true') {
      setAppStatus('ready');
    } else {
      setAppStatus('needs_config');
    }

    if (savedHideNumbers) {
      setHideNumbers(JSON.parse(savedHideNumbers));
    }
  }, []);

  useEffect(() => {
    checkConfig();
    initializeViewportHeight();
    return () => {
      cleanupViewportHeight();
    };
  }, [checkConfig]);

  const handleConfigComplete = () => {
    setAppStatus('ready');
  };

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);

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
                className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out"
                onClick={toggleSettings}
              />
            )}
            <div
              className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto
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
