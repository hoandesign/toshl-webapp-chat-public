import { lazy, Suspense } from 'react';
import LoadingFallback from './LoadingFallback';

const SettingsPage = lazy(() => import('./SettingsPage'));

interface WelcomeScreenProps {
  onConfigComplete: () => void;
}

const WelcomeScreen = ({ onConfigComplete }: WelcomeScreenProps) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-lg flex flex-col text-center overflow-hidden">
        <div className="p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Toshl Chat</h1>
          <p className="text-lg text-gray-600">
            To get started, please configure your API keys and fetch your data from Toshl.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="w-full max-w-md mx-auto">
            <Suspense fallback={<LoadingFallback />}>
              <SettingsPage closeSettings={() => {}} onConfigComplete={onConfigComplete} isModal={false} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;