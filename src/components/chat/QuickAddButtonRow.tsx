import React from 'react';
import { QuickAddMessage } from './QuickAddModal';

interface QuickAddButtonRowProps {
  quickAddMessages: QuickAddMessage[];
  onQuickAddClick: (message: QuickAddMessage) => void;
  isVisible: boolean;
}

const QuickAddButtonRow: React.FC<QuickAddButtonRowProps> = ({
  quickAddMessages,
  onQuickAddClick,
  isVisible,
}) => {
  if (!isVisible || quickAddMessages.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 p-2 sm:p-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-1">
        {quickAddMessages.map((message) => (
          <button
            key={message.id}
            onClick={() => onQuickAddClick(message)}
            className="flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-md sm:rounded-lg hover:bg-gray-50 hover:border-gray-400 transition duration-200 text-xs sm:text-sm font-medium text-gray-700 shadow-sm"
            title={message.text}
          >
            <span className="truncate max-w-[80px] sm:max-w-[120px]">
              {message.label || message.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickAddButtonRow;