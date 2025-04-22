import React from 'react';
import { AccountBalanceCardData } from './types';
// Import necessary icons
import ArrowUpCircle from 'lucide-react/dist/esm/icons/arrow-up-circle';
import ArrowDownCircle from 'lucide-react/dist/esm/icons/arrow-down-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Target from 'lucide-react/dist/esm/icons/target';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Fingerprint from 'lucide-react/dist/esm/icons/fingerprint';
import { formatCurrency } from '../../utils/formatting'; // Import the shared formatter

interface AccountBalanceCardProps {
  data: AccountBalanceCardData;
  hideNumbers: boolean; // Add hideNumbers prop
}

// Helper function to format the date (optional)
const formatDate = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Return original string if formatting fails
  }
};

const AccountBalanceCard: React.FC<AccountBalanceCardProps> = ({ data, hideNumbers }) => { // Accept hideNumbers prop
  const formattedModifiedDate = formatDate(data.modified);

  return (
    // Themed card with refined spacing
    <div className="bg-card-bg shadow-md rounded-lg p-4 max-w-md border border-separator-gray flex flex-col"> {/* Use separator-gray */}
      {/* Header Section - Themed */}
      <div className="flex justify-between items-center pb-2 border-b border-separator-gray flex-shrink-0"> {/* Use separator-gray */}
        <h3 className="text-lg font-semibold text-black-text">{data.name}</h3> {/* Use theme black */}
        {data.status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
            data.status === 'active' ? 'bg-btn-green/10 text-btn-green' : 'bg-yellow-100 text-yellow-800' // Use Toshl green for active status
          }`}>
            {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
          </span>
        )}
      </div>

      {/* Balance Section - Improved Hierarchy, currency symbol included */}
      <div className="text-center py-3"> {/* Removed mb-4 */}
        <p className="text-xs text-gray-text mb-1">Current Balance</p> {/* Use theme gray */}
        <p className="text-4xl font-bold text-black-text leading-none"> {/* Use theme black */}
            {hideNumbers ? '***' : formatCurrency(data.balance, data.currency, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {/* Format with symbol, hide if needed */}
        </p>
        {/* Removed separate currency code paragraph */}
      </div>

      {/* Main Content Area (Stats) - Improved Spacing */}
      <div> {/* Removed mb-4 again */}
        {/* Summary Stats Section - Refined Layout */}
        {(data.daily_sum_median || data.avg) && (
          <div className="border-t border-separator-gray py-3"> {/* Use separator-gray */}
            <div className="grid grid-cols-2 gap-x-4 text-xs">
            {/* Median Column */}
            <div className="space-y-2 text-center"> {/* Increased spacing */}
              <p className="font-medium text-gray-text mb-2">Median Daily</p> {/* Use theme gray */}
              <div className="flex items-center justify-center text-btn-green"> {/* Use Toshl green */}
                <ArrowUpCircle size={14} className="mr-1 flex-shrink-0" />
                {/* Format with symbol */}
                <span>{data.daily_sum_median?.incomes !== undefined ? (hideNumbers ? '***' : formatCurrency(data.daily_sum_median.incomes, data.currency, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })) : '-'}</span>
              </div>
              <div className="flex items-center justify-center text-expense-text"> {/* Use Toshl red */}
                <ArrowDownCircle size={14} className="mr-1 flex-shrink-0" />
                 {/* Format with symbol */}
                <span>{data.daily_sum_median?.expenses !== undefined ? (hideNumbers ? '***' : formatCurrency(data.daily_sum_median.expenses, data.currency, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })) : '-'}</span>
              </div>
            </div>
            {/* Average Column */}
            <div className="space-y-2 text-center"> {/* Increased spacing */}
              <p className="font-medium text-gray-text mb-2">Average Daily</p> {/* Use theme gray */}
              <div className="flex items-center justify-center text-btn-green"> {/* Use Toshl green */}
                <ArrowUpCircle size={14} className="mr-1 flex-shrink-0" />
                 {/* Format with symbol */}
                <span>{data.avg?.incomes !== undefined ? (hideNumbers ? '***' : formatCurrency(data.avg.incomes, data.currency, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })) : '-'}</span>
              </div>
              <div className="flex items-center justify-center text-expense-text"> {/* Use Toshl red */}
                <ArrowDownCircle size={14} className="mr-1 flex-shrink-0" />
                 {/* Format with symbol */}
                <span>{data.avg?.expenses !== undefined ? (hideNumbers ? '***' : formatCurrency(data.avg.expenses, data.currency, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })) : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div> {/* End content area */}

      {/* Metadata Section - Standardized */}
      {/* Metadata Section - Standardized */}
      <div className="text-xs text-gray-text space-y-2 pt-3 border-t border-separator-gray flex-shrink-0"> {/* Use separator-gray */}
        {formattedModifiedDate && (
          <div className="flex items-baseline"> {/* Use items-baseline */}
            <Clock size={14} className="mr-1.5 opacity-90 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
            <span>{formattedModifiedDate}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between"> {/* Removed pt-2 */}
          {data.limit !== undefined && data.limit !== 0 && (
            <div className="flex items-baseline"> {/* Use items-baseline */}
              <Target size={14} className="mr-1.5 opacity-90 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
               {/* Format with symbol */}
              <span>Limit: {hideNumbers ? '***' : formatCurrency(data.limit, data.currency, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          )}
          {data.count !== undefined && (
             <div className="flex items-baseline"> {/* Use items-baseline */}
               <ListChecks size={14} className="mr-1.5 opacity-90 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
               <span>{data.count} entries</span>
             </div>
          )} {/* Correctly placed closing parenthesis and brace */}
        </div>
         {/* ID - Standardized */}
         <div className="flex items-baseline"> {/* Removed pt-2 */}
            <Fingerprint size={14} className="mr-1.5 opacity-90 text-gray-text relative top-[2px]" /> {/* Nudge icon down */}
            <span>{data.id}</span> {/* Removed "ID: " prefix */}
         </div>
      </div>
    </div>
  );
};

export default AccountBalanceCard;
