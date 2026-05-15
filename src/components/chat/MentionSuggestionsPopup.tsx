import React from 'react';
import { MentionSuggestion } from './types'; // Import the type

interface MentionSuggestionsPopupProps {
  suggestions: MentionSuggestion[];
  onSelect: (suggestion: MentionSuggestion) => void;
}

const MentionSuggestionsPopup: React.FC<MentionSuggestionsPopupProps> = ({ suggestions, onSelect }) => {
  if (suggestions.length === 0) {
    return null; // Don't render if no suggestions
  }

  // Function to get background color based on suggestion type
  const getBackgroundColor = (type: MentionSuggestion['type']) => {
    switch (type) {
      case 'account': return 'bg-blue-100 text-blue-800';
      case 'category': return 'bg-green-100 text-green-800';
      case 'tag': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className="absolute bottom-full left-[60px] right-[60px] mb-1 max-h-[150px] overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-md z-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
    >
      <ul className="py-1">
        {suggestions.map((suggestion) => (
          <li key={`${suggestion.type}-${suggestion.id}`}>
            <button
              type="button"
              onClick={() => onSelect(suggestion)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition duration-150 ease-in-out flex justify-between items-center"
            >
              <span>{suggestion.name}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getBackgroundColor(suggestion.type)}`}>
                {suggestion.type}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MentionSuggestionsPopup;
