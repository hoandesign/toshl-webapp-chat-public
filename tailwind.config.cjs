/** @type {import('tailwindcss').Config} */
// Use CommonJS format
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensure this covers all component files
  ],
  theme: {
    extend: {
      colors: {
        // Toshl Color System
        'app-bg': '#fafaf5',
        'gray-text': 'rgba(8, 14, 16, 0.62)',
        'gray-text-2': '#abb0b3',
        'black-text': 'rgba(0, 0, 0, 0.8)',
        'expense-text': 'rgb(178, 54, 85)',
        'navigation-active': '#474b4d',
        'navigation-bg': '#000000',
        'navigation-lighter': '#17191a',
        'navigation-text': '#ffffff',
        'navigation-icon': 'rgba(255, 255, 255, 0.6)',
        'black-button-bg': 'rgba(0, 0, 0, 0.8)',
        'button-text': '#ffffff',
        'card-bg': '#ffffff', // Overwrites default card-bg
        'river-flow-card-bg': '#ffffff',
        'chart-bg': '#f2f2ed',
        'dimmer-bg': 'rgba(0, 0, 0, 0.6)',
        'input-bg': 'rgba(0, 0, 0, 0.02)',
        'input-bg-2': 'hsl(200, 100%, 98%)',
        'input-border-side': 'rgba(0, 0, 0, 0.02)',
        'input-border-top': 'transparent',
        'input-border-bottom': 'rgba(0, 0, 0, 0.1)',
        'input-border-side-active': 'rgba(0, 0, 0, 0.02)',
        'input-border-top-active': 'transparent',
        'input-border-bottom-active': 'rgba(0, 0, 0, 0.1)',
        'input-focus': '#ffffff',
        'input-focus-opaq': '#ffffff',
        'modal-win-bg': '#fafaf5',
        'pale-card-bg': 'rgba(0, 0, 0, 0.02)',
        'switch-bg': '#DBE1E5',
        'switch-thumb': '#ffffff',
        'today-lollipop': '#474b4d',
        'tags-text': '#ffffff',
        'popup': '#fafaf5',
        'popup-white-bg': '#ffffff',
        'tabs-text': 'rgba(0, 0, 0, 0.8)',
        'tabs-active': 'rgba(0, 0, 0, 0.8)',
        'icon-on-white': 'rgba(0, 0, 0, 0.8)',
        'label-on-white': 'rgba(0, 0, 0, 0.8)',
        'icon-disabled': 'rgba(0, 0, 0, 0.35)',
        'info-normal-text': '#0d6180',
        'info-success-text': '#0d8059',
        'info-error-text': '#8c2248',
        'btn-red': '#b23655',
        'btn-red-highlight': '#b23655',
        'btn-green': '#36b35f',
        'btn-green-highlight': '#52cc66',
        'btn-dark': 'rgba(0, 0, 0, 0.6)',
        'btn-dark-highlight': 'rgba(0, 0, 0, 0.8)',
        'btn-format': '#f3fbff',
        'dropdown-bg': '#ffffff',
        'budget-chart-positive-bg': 'rgba(117, 209, 255, 0.2)',
        'accent': '#48CFBF',
        'accent-bg': '#48CFBF33', // Hex with alpha
        'separator-gray': '#DBE1E5', // Lighter gray for separators

        // Keep original semantic names if needed, or remove/replace them
        // primary: '#4F46E5', // Indigo 600 - Consider mapping or removing
        // secondary: '#6B7280', // Gray 500 - Consider mapping or removing
        // 'accent-positive': '#10B981', // Emerald 500 - Consider mapping or removing
        // 'accent-negative': '#EF4444', // Red 500 - Consider mapping or removing
        // background: '#F9FAFB', // Gray 50 - Replaced by app-bg
        // 'text-primary': '#111827', // Gray 900 - Replaced by black-text?
        // 'text-secondary': '#6B7280', // Gray 500 - Replaced by gray-text?
        // 'border-color': '#E5E7EB', // Gray 200 - No direct equivalent, maybe remove or map
      },
      fontFamily: {
        // Set "Source Sans Pro" as the default sans-serif font
        sans: ['"Source Sans Pro"', 'sans-serif'],
      },
      // Keep existing animations if desired
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
      },
      // Add typography styles from reference project if needed later
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Add typography plugin
    require('tailwind-scrollbar'), // Re-add scrollbar plugin (compatible with v3)
  ],
};
