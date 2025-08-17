import { useState, useCallback, useEffect, lazy, Suspense } from 'react'; // Add lazy and Suspense imports
import { Toaster } from 'react-hot-toast'; // Import Toaster
import LoadingFallback from './components/LoadingFallback';
import './index.css'; // Ensure Tailwind styles are imported
import { SpeedInsights } from '@vercel/speed-insights/react';
import { initializeViewportHeight, cleanupViewportHeight } from './utils/viewport';

// Lazy load components for code splitting
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hideNumbers, setHideNumbers] = useState<boolean>(false); // Add state for hideNumbers

  // Check on mount if API keys are set and load hideNumbers setting.
  useEffect(() => {
    const toshlKey = localStorage.getItem('toshlApiKey');
    const geminiKey = localStorage.getItem('geminiApiKey');
    const savedHideNumbers = localStorage.getItem('hideNumbers');

    if (!toshlKey || !geminiKey) {
      setIsSettingsOpen(true);
    }

    if (savedHideNumbers) {
      setHideNumbers(JSON.parse(savedHideNumbers));
    }

    // Initialize viewport height handling for mobile navigation bars
    initializeViewportHeight();

    // Cleanup on unmount
    return () => {
      cleanupViewportHeight();
    };
  }, []);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((prev: boolean) => !prev); // Add explicit type for prev
  }, []);

  return (
    <div className="App h-screen relative overflow-hidden bg-app-bg text-black-text font-sans"> {/* Fixed height and use proper theme colors */}
      <Toaster position="top-center" reverseOrder={false} /> {/* Add Toaster component */}
      {/* Main Chat Interface */}
      <Suspense fallback={<LoadingFallback />}>
        <ChatInterface
          isSettingsOpen={isSettingsOpen}
          toggleSettings={toggleSettings}
          hideNumbers={hideNumbers} // Pass hideNumbers prop
        />
      </Suspense>
      <SpeedInsights />

      {/* Overlay */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out"
          onClick={toggleSettings} // Close sidebar when clicking overlay
        />
      )}

      {/* Settings Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto
                   ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Pass toggleSettings to allow closing from within */}
        <Suspense fallback={<div className="p-4 flex justify-center items-center h-full"><div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div></div>}>
          <SettingsPage closeSettings={toggleSettings} />
        </Suspense>
      </div>
    </div>
  );
}

export default App;
