import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, History, Zap, Trash2 } from 'lucide-react';
import * as STRINGS from '../../constants/strings';

interface MoreButtonProps {
  onHistoryClick: () => void;
  onQuickAddClick: () => void;
  onClearChatClick: () => void;
  disabled?: boolean;
}

const MoreButton: React.FC<MoreButtonProps> = ({
  onHistoryClick,
  onQuickAddClick,
  onClearChatClick,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleHistoryClick = () => {
    onHistoryClick();
    setIsOpen(false);
  };

  const handleQuickAddClick = () => {
    onQuickAddClick();
    setIsOpen(false);
  };

  const handleClearChatClick = () => {
    onClearChatClick();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="text-gray-text hover:text-black-text p-2 rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
        title={STRINGS.QUICK_ADD_MORE_BUTTON_TITLE}
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-40 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleHistoryClick}
              className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-start space-x-2"
            >
              <History size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-left">{STRINGS.QUICK_ADD_HISTORY_BUTTON_TITLE}</span>
            </button>
            <button
              onClick={handleQuickAddClick}
              className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-start space-x-2"
            >
              <Zap size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-left">{STRINGS.QUICK_ADD_SETUP_BUTTON_TITLE}</span>
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleClearChatClick}
              className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center justify-start space-x-2"
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-left">{STRINGS.CLEAR_CHAT_HISTORY_BUTTON}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoreButton;