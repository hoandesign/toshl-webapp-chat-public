import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2, Edit2, Save, XCircle } from 'lucide-react';
import * as STRINGS from '../../constants/strings';

export interface QuickAddMessage {
  id: string;
  text: string;
  label?: string;
}

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickAddMessages: QuickAddMessage[];
  onSave: (messages: QuickAddMessage[]) => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  quickAddMessages,
  onSave,
}) => {
  const [messages, setMessages] = useState<QuickAddMessage[]>(quickAddMessages);
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageLabel, setNewMessageLabel] = useState('');
  const [editingMessage, setEditingMessage] = useState<QuickAddMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [editLabel, setEditLabel] = useState('');

  // Update local state when props change
  React.useEffect(() => {
    setMessages(quickAddMessages);
  }, [quickAddMessages]);

  const handleAddMessage = useCallback(() => {
    if (!newMessageText.trim()) return;

    const newMessage: QuickAddMessage = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: newMessageText.trim(),
      label: newMessageLabel.trim() || undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setNewMessageText('');
    setNewMessageLabel('');
  }, [newMessageText, newMessageLabel]);

  const handleRemoveMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const handleStartEdit = useCallback((message: QuickAddMessage) => {
    setEditingMessage(message);
    setEditText(message.text);
    setEditLabel(message.label || '');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditText('');
    setEditLabel('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingMessage || !editText.trim()) return;

    const updatedMessage: QuickAddMessage = {
      ...editingMessage,
      text: editText.trim(),
      label: editLabel.trim() || undefined,
    };

    setMessages(prev => prev.map(msg => 
      msg.id === editingMessage.id ? updatedMessage : msg
    ));
    handleCancelEdit();
  }, [editingMessage, editText, editLabel, handleCancelEdit]);

  const handleSave = useCallback(() => {
    // Cancel any ongoing edit before saving
    if (editingMessage) {
      handleCancelEdit();
    }
    onSave(messages);
    onClose();
  }, [messages, onSave, onClose, editingMessage, handleCancelEdit]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleSaveEdit();
      } else {
        handleAddMessage();
      }
    } else if (e.key === 'Escape' && editingMessage) {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleAddMessage, editingMessage, handleSaveEdit, handleCancelEdit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{STRINGS.QUICK_ADD_MODAL_TITLE}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition duration-200 p-1"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {/* Edit Message Form */}
          {editingMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-4">{STRINGS.QUICK_ADD_EDIT_MESSAGE_TITLE}</h3>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="editText" className="block text-sm font-medium text-gray-700 mb-1">
                    {STRINGS.QUICK_ADD_MESSAGE_TEXT_LABEL} *
                  </label>
                  <input
                    id="editText"
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={STRINGS.QUICK_ADD_MESSAGE_TEXT_PLACEHOLDER}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="editLabel" className="block text-sm font-medium text-gray-700 mb-1">
                    {STRINGS.QUICK_ADD_MESSAGE_LABEL_LABEL}
                  </label>
                  <input
                    id="editLabel"
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={STRINGS.QUICK_ADD_MESSAGE_LABEL_PLACEHOLDER}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editText.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    <Save size={16} />
                    <span>{STRINGS.QUICK_ADD_SAVE_CHANGES_BUTTON_TEXT}</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
                  >
                    <XCircle size={16} />
                    <span>{STRINGS.QUICK_ADD_CANCEL_EDIT_BUTTON_TEXT}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add New Message Form */}
          {!editingMessage && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Quick Message</h3>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="messageText" className="block text-sm font-medium text-gray-700 mb-1">
                  {STRINGS.QUICK_ADD_MESSAGE_TEXT_LABEL} *
                </label>
                <input
                  id="messageText"
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={STRINGS.QUICK_ADD_MESSAGE_TEXT_PLACEHOLDER}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="messageLabel" className="block text-sm font-medium text-gray-700 mb-1">
                  {STRINGS.QUICK_ADD_MESSAGE_LABEL_LABEL}
                </label>
                <input
                  id="messageLabel"
                  type="text"
                  value={newMessageLabel}
                  onChange={(e) => setNewMessageLabel(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={STRINGS.QUICK_ADD_MESSAGE_LABEL_PLACEHOLDER}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={handleAddMessage}
                disabled={!newMessageText.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                <Plus size={16} />
                <span>{STRINGS.QUICK_ADD_ADD_MESSAGE_BUTTON}</span>
              </button>
            </div>
            </div>
          )}

          {/* Existing Messages List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{STRINGS.QUICK_ADD_QUICK_MESSAGES_TITLE}</h3>
            
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>{STRINGS.QUICK_ADD_NO_MESSAGES_TEXT}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {message.label || 'No label'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 break-words">
                        {message.text}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(message)}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded transition duration-200"
                        title={STRINGS.QUICK_ADD_EDIT_MESSAGE_BUTTON_TITLE}
                        disabled={!!editingMessage}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveMessage(message.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition duration-200"
                        title={STRINGS.QUICK_ADD_REMOVE_MESSAGE_TITLE}
                        disabled={!!editingMessage}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition duration-200 text-sm sm:text-base"
          >
            {STRINGS.QUICK_ADD_CANCEL_BUTTON}
          </button>
          <button
            onClick={handleSave}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-sm sm:text-base"
          >
            {STRINGS.QUICK_ADD_SAVE_CHANGES_BUTTON}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;