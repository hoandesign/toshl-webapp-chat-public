import React from 'react';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import { ToshlBudget } from '../../lib/toshl'; // Import the budget type
import { formatCurrency } from '../../utils/formatting'; // Assuming a formatting utility exists

interface BudgetCardProps {
  budget: ToshlBudget;
  hideNumbers: boolean; // Add hideNumbers prop
}

// Helper to format date as DD Mon (e.g., 01 Apr)
const formatShortDate = (dateString?: string): string | null => {
    if (!dateString) return null;
    try {
        // Add time part to avoid timezone issues with parsing YYYY-MM-DD
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch (e) {
        console.error("Error formatting short date:", e);
        return dateString;
    }
};


const BudgetCard: React.FC<BudgetCardProps> = ({ budget, hideNumbers }) => { // Accept hideNumbers prop
  const spent = budget.amount ?? 0;
  const limit = budget.limit ?? 0;
  const remaining = limit - spent;
  const isOverBudget = remaining < 0;
  // Progress calculation: if over budget, progress is 100%, otherwise calculate normally
  const progress = limit > 0 ? (isOverBudget ? 100 : (spent / limit) * 100) : 0;
  const currencyCode = budget.currency.code;

  // Calculate percentage over/left
  let percentageValue = 0;
  if (limit > 0) {
      percentageValue = (Math.abs(remaining) / limit) * 100;
  }
  const formattedPercentage = `${Math.round(percentageValue)}%`;

  const formattedFromDate = formatShortDate(budget.from);
  const formattedToDate = formatShortDate(budget.to);

  return (
    // Apply consistent card styling from other cards
    <div className="bg-card-bg shadow-md rounded-lg p-4 border border-separator-gray flex flex-col h-full">
        {/* Title Section */}
        <div className="pb-2 mb-2 border-b border-separator-gray flex-shrink-0"> {/* Added border-b */}
            {/* Budget Name - Smaller font, medium weight */}
            <h3 className="text-sm font-medium text-black-text truncate mb-1"> {/* Changed size/weight */}
                {budget.name}
            </h3>
            {/* Remaining/Over Amount & Tag - Tag moved below */}
            <div className="flex flex-col items-start"> {/* Changed to flex-col and items-start */}
                {/* Big Number - Add minus sign if over budget */}
                <span className={`font-bold text-3xl ${isOverBudget ? 'text-expense-text' : 'text-blue-500'}`}>
                    {isOverBudget ? '-' : ''}{hideNumbers ? '***' : formatCurrency(Math.abs(remaining), currencyCode)}
                </span>
                {/* Tag for Over/Left status - Below number, with text */}
                <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isOverBudget ? 'bg-expense-text/10 text-expense-text' : 'bg-blue-500/10 text-blue-500'}`}>
                    {isOverBudget
                        ? <ArrowUp size={12} className="mr-1" />
                        : <ArrowDown size={12} className="mr-1" />
                    }
                    {formattedPercentage} {isOverBudget ? 'Over' : 'Left'} {/* Added text back */}
                </span>
            </div>
        </div>

        {/* Progress Bar Section */}
        <div className="mb-2 flex-grow"> {/* Allow this section to grow if needed */}
            {/* Labels: Spent vs Budget */}
            <div className="flex justify-between text-xs text-gray-text mb-1">
                {/* Spent Amount */}
                <span>{hideNumbers ? '***' : formatCurrency(spent, currencyCode)} used</span>
                {/* Budget Limit */}
                <span>{hideNumbers ? '***' : formatCurrency(limit, currencyCode)}</span>
            </div>
            {/* Bar */}
            {/* Track color depends on budget status */}
            <div className={`w-full ${isOverBudget ? 'bg-gray-200 dark:bg-gray-600' : 'bg-blue-500'} rounded-full h-1.5`}> {/* Thinner bar */}
                {/* Filled portion color depends on budget status */}
                <div
                    className={`${isOverBudget ? 'bg-expense-text' : 'bg-gray-200 dark:bg-gray-600'} h-1.5 rounded-full`}
                    style={{ width: `${Math.min(progress, 100)}%` }} // Cap width at 100% visually
                ></div>
            </div>
        </div>

        {/* Dates Section */}
        <div className="flex items-center justify-between text-xs text-gray-text pt-2 mt-auto flex-shrink-0"> {/* Added items-center */}
            <span>{formattedFromDate || budget.from}</span>
            <span>{formattedToDate || budget.to}</span>
        </div>
    </div>
  );
};

export default BudgetCard;
