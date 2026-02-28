import React from 'react';
import { Message } from './types'; // Import the Message type
import X from 'lucide-react/dist/esm/icons/x';
import * as STRINGS from '../../constants/strings'; // Import constants
import AccountBalanceCard from './AccountBalanceCard'; // Import the account card
import { formatCurrency } from '../../utils/formatting'; // Import the formatting utility

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    data: Message[];
    hideNumbers: boolean; // Add hideNumbers prop
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, data, hideNumbers }) => { // Accept hideNumbers prop
    if (!isOpen || data.length === 0) {
        return null;
    }

    // Determine content type based on the first message
    const contentType = data[0].type;
    const isAccountList = contentType === 'account_balance';
    const title = isAccountList ? STRINGS.ACCOUNTS_LIST_TITLE : STRINGS.ENTRIES_LIST_TITLE;
    const noDataText = isAccountList ? STRINGS.NO_ACCOUNTS_TO_DISPLAY : STRINGS.NO_ENTRIES_TO_DISPLAY;

    // Group entries by date (only if it's an entry list)
    const groupedEntries: { [date: string]: Message[] } = !isAccountList ? data.reduce((acc, msg) => {
        const date = msg.entryData?.date;
        if (date) {
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(msg);
        }
        return acc;
    }, {} as { [date: string]: Message[] }) : {};

    // Sort dates descending (only if it's an entry list)
    const sortedDates = !isAccountList ? Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) : [];

    return (
        <>
            {/* Dimmer Background */}
            <div
                className="fixed inset-0 bg-dimmer-bg z-10 animate-fade-in-dimmer"
                onClick={onClose} // Close sheet when clicking dimmer
            />
            {/* Bottom Sheet Container */}
            <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-card-bg border-t-2 border-separator-gray shadow-lg z-20 flex flex-col animate-slide-up"> {/* Use separator-gray */}
                {/* Bottom Sheet Header - Themed & Rounded */}
                <div className="flex justify-between items-center p-3 border-b border-separator-gray bg-card-bg rounded-t-lg"> {/* Use separator-gray */}
                <h3 className="text-lg font-semibold text-black-text">{title}</h3> {/* Use theme text */}
                <button
                    onClick={onClose}
                    className="text-gray-text hover:text-btn-red p-1 rounded-full hover:bg-gray-100 transition" /* Use theme text/hover */
                    title={STRINGS.CLOSE_LIST_VIEW_TITLE}
                >
                    <X size={20} />
                </button>
            </div>
            {/* Bottom Sheet Content - Themed scrollbar, Added Padding */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-text/40 hover:scrollbar-thumb-gray-text/60 scrollbar-track-input-bg"> {/* Added p-4, Use theme scrollbar */}
                {(() => {
                    if (data.length === 0) {
                        return <p className="text-gray-text text-center mt-4">{noDataText}</p>; {/* Use theme gray text */}
                    }

                    if (isAccountList) {
                        // Render Account Cards in a responsive grid (1 col mobile, 2 cols md+)
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"> {/* Made grid responsive */}
                                {data.map((msg) => {
                                    if (msg.type === 'account_balance' && msg.accountBalanceData) {
                                        // Pass hideNumbers to AccountBalanceCard
                                        return <AccountBalanceCard key={`bs-${msg.id}`} data={msg.accountBalanceData} hideNumbers={hideNumbers} />;
                                    }
                                    return null;
                                })}
                            </div>
                        );
                    } else {
                        // Render Entry List grouped by date
                        return sortedDates.map((date) => (
                            <div key={date} className="mb-0"> {/* Removed mb-3 */}
                                {/* Date Header - Themed */}
                                <div className="sticky top-0 bg-app-bg px-4 py-1.5 border-b border-t border-separator-gray z-10"> {/* Use separator-gray */}
                                    <h4 className="text-sm font-semibold text-black-text">{date}</h4> {/* Use theme text */}
                                </div>
                                {/* Entries for this date - Themed */}
                                <div className="px-4"> {/* Removed pt/pb */}
                                    {groupedEntries[date].map((msg) => {
                                        const entryData = msg.entryData;
                                        if (!entryData) return null;
                                        const amountColor = entryData.type === STRINGS.INCOME_TYPE ? 'text-btn-green' : 'text-expense-text'; // Use correct theme colors
                                        // Removed unused amountPrefix

                                        return (
                                            <div key={`list-${msg.id}`} className="flex justify-between items-center border-b border-separator-gray py-2.5 last:border-b-0 text-sm"> {/* Use separator-gray */}
                                                {/* Left Side: Text - Themed */}
                                                <div className="flex-1 mr-4 min-w-0">
                                                    <span className="font-medium text-black-text block truncate">{entryData.category}</span> {/* Use theme text */}
                                                    {/* Conditionally render description based on hideNumbers */}
                                                    {!hideNumbers && entryData.description && <span className="text-gray-text italic text-xs block truncate">({entryData.description})</span>} {/* Use theme gray text */}
                                                </div>
                                                {/* Right Side: Number - Themed */}
                                                <div className={`font-semibold ${amountColor} whitespace-nowrap pl-2`}>
                                                    {/* Use formatCurrency for consistent display */}
                                                    {formatCurrency(
                                                        entryData.type === STRINGS.INCOME_TYPE ? entryData.amount : -entryData.amount, // Pass positive/negative amount
                                                        entryData.currency,
                                                        undefined, // Use default locale
                                                        undefined, // Use default options
                                                        hideNumbers // Pass hideNumbers flag
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ));
                    }
                })()}
            </div>
        </div>
        </>
    );
};

export default BottomSheet;
