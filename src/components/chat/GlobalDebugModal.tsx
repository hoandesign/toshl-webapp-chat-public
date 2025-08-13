import React, { useState } from 'react';
import { X, Copy, CheckCircle, Bug, ArrowLeft } from 'lucide-react';
import { Message } from './types';

interface GlobalDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

const GlobalDebugModal: React.FC<GlobalDebugModalProps> = ({ isOpen, onClose, messages }) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  if (!isOpen) return null;

  // Filter messages that have debug info
  const messagesWithDebug = messages.filter(msg => msg.debugInfo);

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

  const selectedMessage = selectedMessageId ? messagesWithDebug.find(msg => msg.id === selectedMessageId) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-4xl lg:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bug size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Global Debug Information</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
          {/* Message List Sidebar */}
          <div className={`w-full sm:w-1/3 border-r sm:border-r border-b sm:border-b-0 bg-gray-50 overflow-y-auto max-h-48 sm:max-h-none ${showMobileDetail ? 'hidden sm:block' : 'block'}`}>
            <div className="p-3 sm:p-4">
              <h3 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                Messages with Debug Info ({messagesWithDebug.length})
              </h3>
              {messagesWithDebug.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">
                  No messages with debug information found
                </div>
              ) : (
                <div className="space-y-2">
                  {messagesWithDebug.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSelectedMessageId(msg.id);
                        setShowMobileDetail(true);
                      }}
                      className={`w-full text-left p-2 sm:p-3 rounded-lg border transition-colors ${
                        selectedMessageId === msg.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {msg.sender} • {msg.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 truncate">
                        {msg.text || `${msg.type} message`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debug Details */}
          <div className={`flex-1 overflow-y-auto min-h-0 ${!showMobileDetail ? 'hidden sm:block' : 'block'}`}>
            {selectedMessage?.debugInfo ? (
              <div className="p-3 sm:p-4">
                {/* Mobile back button */}
                <div className="sm:hidden mb-4">
                  <button
                    onClick={() => setShowMobileDetail(false)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Messages
                  </button>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                    Debug Info for Message: {selectedMessage.id}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {selectedMessage.text}
                  </div>
                </div>

                {/* Gemini Request */}
                {selectedMessage.debugInfo?.geminiRequest && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Gemini Request</h4>
                      <button
                        onClick={() => handleCopy(formatJSON(selectedMessage.debugInfo?.geminiRequest), 'Gemini Request')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copySuccess === 'Gemini Request' ? <CheckCircle size={12} /> : <Copy size={12} />}
                        Copy
                      </button>
                    </div>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40 border">
                      {formatJSON(selectedMessage.debugInfo?.geminiRequest)}
                    </pre>
                  </div>
                )}

                {/* Gemini Response */}
                {selectedMessage.debugInfo?.geminiResponse && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Gemini Response</h4>
                      <button
                        onClick={() => handleCopy(formatJSON(selectedMessage.debugInfo?.geminiResponse), 'Gemini Response')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copySuccess === 'Gemini Response' ? <CheckCircle size={12} /> : <Copy size={12} />}
                        Copy
                      </button>
                    </div>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40 border">
                      {formatJSON(selectedMessage.debugInfo?.geminiResponse)}
                    </pre>
                  </div>
                )}

                {/* Toshl Requests */}
                {selectedMessage.debugInfo?.toshlRequests && selectedMessage.debugInfo.toshlRequests.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Toshl API Calls ({selectedMessage.debugInfo?.toshlRequests?.length})</h4>
                    <div className="space-y-3">
                      {selectedMessage.debugInfo?.toshlRequests?.map((request: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
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
                              <span className="font-medium text-sm">
                                {String(request.endpoint)}
                              </span>
                              {request.duration && (
                                <span className="text-xs text-gray-500">
                                  ({String(request.duration)}ms)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleCopy(formatJSON(request), `Toshl Request ${index + 1}`)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-white hover:bg-gray-100 rounded transition-colors"
                            >
                              {copySuccess === `Toshl Request ${index + 1}` ? <CheckCircle size={12} /> : <Copy size={12} />}
                              Copy
                            </button>
                          </div>
                          
                          {request.timestamp && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">
                                {new Date(request.timestamp as string).toLocaleString()}
                              </span>
                            </div>
                          )}
                          
                          {request.payload && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-gray-700 mb-1">Request Payload</div>
                              <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-24 border">
                                {formatJSON(request.payload)}
                              </pre>
                            </div>
                          )}
                          
                          {request.response && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-gray-700 mb-1">Response</div>
                              <pre className="bg-green-50 p-2 rounded text-xs overflow-auto max-h-24 border border-green-200">
                                {formatJSON(request.response)}
                              </pre>
                            </div>
                          )}
                          
                          {request.error && (
                            <div>
                              <div className="text-xs font-medium text-red-700 mb-1">Error</div>
                              <pre className="bg-red-50 p-2 rounded text-xs overflow-auto max-h-24 border border-red-200 text-red-800">
                                {String(request.error)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {selectedMessage.debugInfo?.errors && selectedMessage.debugInfo.errors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Errors</h4>
                    <div className="space-y-2">
                      {selectedMessage.debugInfo?.errors?.map((error: string, index: number) => (
                        <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                          <pre className="text-xs text-red-800 whitespace-pre-wrap">{error}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-500 border-t pt-3">
                  Debug info captured at: {selectedMessage.debugInfo?.timestamp}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {messagesWithDebug.length === 0 
                  ? 'No messages with debug information found'
                  : 'Select a message from the left to view debug details'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalDebugModal;