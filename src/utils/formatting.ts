/**
 * Formats a number as currency using the Intl.NumberFormat API.
 *
 * @param amount - The numeric amount to format.
 * @param currencyCode - The ISO 4217 currency code (e.g., 'USD', 'VND', 'EUR').
 * @param locale - Optional locale string (e.g., 'en-US', 'vi-VN'). Defaults to browser's default locale.
 * Formats a number according to locale rules, suitable for currency display *without* the symbol/code.
 *
 * @param amount - The numeric amount to format.
 * @param locale - Optional locale string (e.g., 'en-US', 'vi-VN'). Defaults to browser's default locale.
 * @param options - Optional Intl.NumberFormat options (e.g., minimumFractionDigits).
 * @param hideNumbers - Optional boolean flag to hide the actual number.
 * @returns The formatted currency string (e.g., "$1,234.56", "₫1.234.567") or '***' if hideNumbers is true.
 */
import currencySymbolMap from 'currency-symbol-map';

/**
 * Formats a number as currency using the Intl.NumberFormat API.
 *
 * @param amount - The numeric amount to format.
 * @param currencyCode - The ISO 4217 currency code (e.g., 'USD', 'VND', 'EUR').
 * @param locale - Optional locale string (e.g., 'en-US', 'vi-VN'). Defaults to browser's default locale.
 * @param options - Optional Intl.NumberFormat options (e.g., minimumFractionDigits).
 * @param hideNumbers - Optional boolean flag to hide the actual number.
 * @returns The formatted currency string (e.g., "$1,234.56", "₫1.234.567") or '***' if hideNumbers is true.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string, // Currency code is needed again
  locale: string | undefined = undefined, // Use browser default if not specified
  options?: Intl.NumberFormatOptions, // Allow custom options
  hideNumbers: boolean = false // Add hideNumbers flag, default to false
): string {
  if (hideNumbers) {
    return '***'; // Return placeholder if numbers should be hidden
  }
  try {
    // Use currency-symbol-map to get the currency symbol
    let currencySymbol = currencySymbolMap(currencyCode) || currencyCode;

    if (!currencySymbol) {
      currencySymbol = currencyCode;
    }

    // Use Intl.NumberFormat for robust currency formatting without symbol
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'decimal', // Use decimal style instead of currency
      // currency: currencyCode, // Remove currency code
      // currencyDisplay: 'symbol', // Remove currency display
      // Adjust options as needed (e.g., minimumFractionDigits)
      minimumFractionDigits: 0, // Example: Show no decimals for VND
      maximumFractionDigits: 0,
      ...options, // Allow overriding defaults
    };
    const formattedAmount = new Intl.NumberFormat(locale, defaultOptions).format(amount);
    return `${currencySymbol}${formattedAmount}`; // Prepend currency symbol

  } catch (error) {
    console.error(`Error formatting currency (${currencyCode}):`, error);
    // Fallback formatting if Intl fails or currency code is invalid
    // Append code in fallback only
    return `${amount.toLocaleString(locale)} ${currencyCode}`;
  }
}

/**
 * Formats a date string (YYYY-MM-DD) or Date object into a more readable format.
 *
 * @param dateInput - The date string or Date object.
 * @param locale - Optional locale string.
 * @returns Formatted date string (e.g., "Apr 7, 2025").
 */
export function formatDate(
    dateInput: string | Date,
    locale: string | undefined = undefined
): string {
    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput; // Ensure correct parsing
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    } catch (error) {
        console.error('Error formatting date:', error);
        return String(dateInput); // Fallback to original string
    }
}

// Add other formatting utilities as needed
