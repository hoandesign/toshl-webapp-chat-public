import React, { useState } from 'react';
import { X, Copy, CheckCircle } from 'lucide-react';
import { DebugInfo } from './types';
import * as STRINGS from '../../constants/strings';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: DebugInfo;
}

const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, debugInfo }) => {
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'toshl'>('request');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatJSON = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{STRINGS.DEBUG_MODAL_TITLE}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'request'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
{STRINGS.DEBUG_TAB_REQUEST}
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'response'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
{STRINGS.DEBUG_TAB_RESPONSE}
          </button>
          <button
            onClick={() => setActiveTab('toshl')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'toshl'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
{STRINGS.DEBUG_TAB_TOSHL}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'request' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">User Input</h3>
                  <button
                    onClick={() => handleCopy(debugInfo.geminiRequest?.userInput || '', 'User Input')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copySuccess === 'User Input' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                  {debugInfo.geminiRequest?.userInput}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Chat History</h3>
                  <button
                    onClick={() => handleCopy(formatJSON(debugInfo.geminiRequest?.chatHistory), 'Chat History')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copySuccess === 'Chat History' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
                  {formatJSON(debugInfo.geminiRequest?.chatHistory)}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Full Request Body</h3>
                  <button
                    onClick={() => handleCopy(formatJSON(debugInfo.geminiRequest?.fullRequestBody), 'Full Request')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copySuccess === 'Full Request' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-60">
                  {formatJSON(debugInfo.geminiRequest?.fullRequestBody)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'response' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Raw Response</h3>
                  <button
                    onClick={() => handleCopy(debugInfo.geminiResponse?.rawResponse || '', 'Raw Response')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copySuccess === 'Raw Response' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
                  {debugInfo.geminiResponse?.rawResponse}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Cleaned Response</h3>
                  <button
                    onClick={() => handleCopy(debugInfo.geminiResponse?.cleanedResponse || '', 'Cleaned Response')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copySuccess === 'Cleaned Response' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
                  {debugInfo.geminiResponse?.cleanedResponse}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Parsed Data</h3>
                  <button
                    onClick={() => handleCopy(formatJSON(debugInfo.geminiResponse?.parsedData), 'Parsed Data')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copySuccess === 'Parsed Data' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
                  {formatJSON(debugInfo.geminiResponse?.parsedData)}
                </pre>
              </div>

              {debugInfo.geminiResponse?.processingTime && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Processing Time</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {debugInfo.geminiResponse.processingTime}ms
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'toshl' && (
            <div className="space-y-4">
              {debugInfo.toshlRequests && debugInfo.toshlRequests.length > 0 ? (
                debugInfo.toshlRequests.map((request: Record<string, unknown>, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {request.method} {request.endpoint}
                      </h3>
                      <button
                        onClick={() => handleCopy(formatJSON(request), `Request ${index + 1}`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copySuccess === `Request ${index + 1}` ? <CheckCircle size={12} /> : <Copy size={12} />}
                        Copy
                      </button>
                    </div>
                    
                    {request.payload && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Payload</h4>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                          {formatJSON(request.payload)}
                        </pre>
                      </div>
                    )}
                    
                    {request.response && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Response</h4>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                          {formatJSON(request.response)}
                        </pre>
                      </div>
                    )}
                    
                    {request.error && (
                      <div>
                        <h4 className="text-sm font-medium text-red-700 mb-1">Error</h4>
                        <pre className="bg-red-50 p-2 rounded text-xs overflow-auto max-h-32 text-red-800">
                          {request.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-8">
                  No Toshl API calls recorded for this request
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 text-xs text-gray-500">
          Debug information captured at: {debugInfo.timestamp}
        </div>
      </div>
    </div>
  );
};

export default DebugModal;