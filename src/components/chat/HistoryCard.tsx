import React from 'react';
import { EntryCardData } from './types';
import Tag from 'lucide-react/dist/esm/icons/tag';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Hash from 'lucide-react/dist/esm/icons/hash';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { INCOME_TYPE } from '../../constants/strings';
import { formatCurrency } from '../../utils/formatting'; // Import shared formatter

// Helper function to format the date (copied from AccountBalanceCard)
const formatDate = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric' // Simplified format for history
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Return original string if formatting fails
  }
};


interface HistoryCardProps {
    entryData: EntryCardData; // Corrected prop type
    hideNumbers: boolean; // Add hideNumbers prop
}

const HistoryCard: React.FC<HistoryCardProps> = ({ entryData: data, hideNumbers }) => { // Accept hideNumbers prop
    // Use Toshl theme colors
    const amountColor = data.type === INCOME_TYPE ? 'text-btn-green' : 'text-expense-text';
    const amountPrefix = data.type === INCOME_TYPE ? '+' : '-';
    // Use the updated formatCurrency for the number part only
    const formattedDate = formatDate(data.date);

    return (
        // Themed card
        <div className="bg-card-bg shadow-md rounded-lg p-4 w-64 flex-shrink-0 border border-separator-gray flex flex-col h-full"> {/* Use separator-gray */}
            {/* Header: Date - Adjusted Spacing */}
            <div className="flex items-baseline pb-3 mb-3 border-b border-separator-gray flex-shrink-0"> {/* Use items-baseline */}
                <CalendarDays size={14} className="mr-2 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
                <span className="text-sm font-medium text-black-text">{formattedDate || data.date}</span>
            </div>

            {/* Amount Section - Adjusted Spacing, currency symbol included */}
            <div className="flex items-baseline justify-start mb-3 flex-shrink-0"> {/* Kept mb-3 */}
                <span className={`font-bold text-3xl ${amountColor}`}>{amountPrefix}{hideNumbers ? '***' : formatCurrency(Math.abs(data.amount), data.currency)}</span> {/* Use formatCurrency directly, hide if needed */}
                {/* Removed separate currency span */}
            </div>

            {/* Details Section - Cleaned Up */}
            <div className="space-y-2 text-black-text flex-grow"> {/* Removed redundant text-sm */}
                {/* Removed Type Display */}
                <div className="flex items-baseline"> {/* Use items-baseline */}
                    <Tag size={14} className="mr-2 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
                    <span className="text-xs">{data.category}</span>
                </div>
                {data.tags && data.tags.length > 0 && (
                    <div className="flex items-baseline"> {/* Use items-baseline */}
                        <Hash size={14} className="mr-2 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
                        <span className="flex flex-wrap gap-1">
                            {/* Reverted tag style */}
                            {data.tags.map((tag: string, i: number) => <span key={i} className="bg-gray-100 text-gray-text px-1.5 py-0.5 rounded text-xs">{tag}</span>)} {/* Use theme gray */}
                        </span>
                    </div>
                )}
                 {/* Description Section (Moved inside the space-y container) - Conditionally render based on hideNumbers */}
                 {!hideNumbers && data.description && ( // Add !hideNumbers check
                    <div className="flex items-baseline text-xs italic text-gray-text mt-auto"> {/* Removed pt-3, kept mt-auto */}
                        <FileText size={14} className="mr-2 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
                        <span className="truncate">{data.description}</span>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default HistoryCard;
