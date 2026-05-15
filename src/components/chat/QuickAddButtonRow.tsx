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
    <div className="flex-shrink-0 px-3 md:px-4 py-2.5">
      <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto scrollbar-thin scrollbar-thumb-btn-red/30 hover:scrollbar-thumb-btn-red/50 scrollbar-track-transparent">
        {quickAddMessages.map((message) => (
          <button
            key={message.id}
            onClick={() => onQuickAddClick(message)}
            className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-btn-red/20 rounded-lg hover:bg-btn-red/5 hover:border-btn-red/40 transition duration-200 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:shadow"
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