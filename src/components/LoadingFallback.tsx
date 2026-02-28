import React from 'react';

const LoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700 font-medium">Loading Toshl Chat...</p>
      </div>
    </div>
  );
};

export default LoadingFallback; 