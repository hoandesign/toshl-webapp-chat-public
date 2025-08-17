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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
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
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'request'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
{STRINGS.DEBUG_TAB_REQUEST}
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'response'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
{STRINGS.DEBUG_TAB_RESPONSE}
          </button>
          <button
            onClick={() => setActiveTab('toshl')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'toshl'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
{STRINGS.DEBUG_TAB_TOSHL}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {activeTab === 'request' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">User Input</h3>
                  <button
                    onClick={() => handleCopy(debugInfo.geminiRequest?.userInput || '', 'User Input')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors min-h-[32px] touch-manipulation"
                  >
                    {copySuccess === 'User Input' ? <CheckCircle size={12} /> : <Copy size={12} />}
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs sm:text-sm overflow-auto">
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
                <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs sm:text-sm overflow-auto max-h-32 sm:max-h-40">
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
                <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs sm:text-sm overflow-auto max-h-48 sm:max-h-60">
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

              {debugInfo.geminiResponse?.httpStatus && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">HTTP Status</h3>
                  <div className={`p-3 rounded text-sm ${
                    debugInfo.geminiResponse.httpStatus >= 200 && debugInfo.geminiResponse.httpStatus < 300
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {debugInfo.geminiResponse.httpStatus} {debugInfo.geminiResponse.httpStatusText}
                  </div>
                </div>
              )}

              {debugInfo.geminiErrors && debugInfo.geminiErrors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Gemini Errors ({debugInfo.geminiErrors.length})</h3>
                    <button
                      onClick={() => handleCopy(formatJSON(debugInfo.geminiErrors), 'Gemini Errors')}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copySuccess === 'Gemini Errors' ? <CheckCircle size={12} /> : <Copy size={12} />}
                      Copy
                    </button>
                  </div>
                  <div className="space-y-2">
                    {debugInfo.geminiErrors.map((error, index) => (
                      <div key={index} className={`p-3 rounded border ${
                        error.type === 'api_error' ? 'bg-red-50 border-red-200' :
                        error.type === 'parse_error' ? 'bg-orange-50 border-orange-200' :
                        error.type === 'validation_error' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            error.type === 'api_error' ? 'bg-red-100 text-red-800' :
                            error.type === 'parse_error' ? 'bg-orange-100 text-orange-800' :
                            error.type === 'validation_error' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {error.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {error.httpStatus && (
                            <span className="text-xs text-gray-500">HTTP {error.httpStatus}</span>
                          )}
                        </div>
                        <div className="text-sm font-medium mb-1">{error.message}</div>
                        {error.details && (
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                            {error.details}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'toshl' && (
            <div className="space-y-4">
              {debugInfo.toshlRequests && debugInfo.toshlRequests.length > 0 ? (
                debugInfo.toshlRequests.map((request: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                          request.method === 'POST' ? 'bg-green-100 text-green-800' :
                          request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {String(request.method)}
                        </span>
                        <h3 className="font-medium text-gray-900">
                          {String(request.endpoint)}
                        </h3>
                        {request.duration && (
                          <span className="text-xs text-gray-500">
                            ({String(request.duration)}ms)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(formatJSON(request), `Request ${index + 1}`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copySuccess === `Request ${index + 1}` ? <CheckCircle size={12} /> : <Copy size={12} />}
                        Copy
                      </button>
                    </div>
                    
                    {request.timestamp && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">
                          Timestamp: {new Date(request.timestamp as string).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {request.payload && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Request Payload</h4>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32 border">
                          {formatJSON(request.payload)}
                        </pre>
                      </div>
                    )}
                    
                    {request.response && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Response</h4>
                        <pre className="bg-green-50 p-2 rounded text-xs overflow-auto max-h-32 border border-green-200">
                          {formatJSON(request.response)}
                        </pre>
                      </div>
                    )}
                    
                    {request.error && (
                      <div>
                        <h4 className="text-sm font-medium text-red-700 mb-1">Error</h4>
                        <pre className="bg-red-50 p-2 rounded text-xs overflow-auto max-h-32 text-red-800 border border-red-200">
                          {String(request.error)}
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