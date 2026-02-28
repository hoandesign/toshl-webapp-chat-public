import React from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import * as STRINGS from '../../constants/strings'; // Import strings for logo alt text

interface SeeMoreEntriesCardProps { // Renamed interface
  text: string;
  onClick: () => void;
}

// Renamed component
const SeeMoreEntriesCard: React.FC<SeeMoreEntriesCardProps> = ({ text, onClick }) => {
  return (
    // Add h-full back
    <div className="flex-shrink-0 w-64 h-full">
      <button
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center bg-primary/5 border border-primary/20 rounded-lg shadow-md hover:bg-primary/10 transition duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 p-4 text-center" // Themed button
      >
        {/* Add Toshl Logo */}
        <img
          src="/toshl-app.png"
          alt={STRINGS.TOSHL_LOGO_ALT}
          className="h-10 w-10 mb-3 opacity-80"
        />
        <p className="text-sm font-medium text-primary mb-2">{text}</p> {/* Themed text */}
        <ArrowRight size={18} className="text-primary" /> {/* Themed icon */}
      </button>
    </div>
  );
};

export default SeeMoreEntriesCard; // Export renamed component
