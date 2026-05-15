/**
 * Safe localStorage utilities with error handling
 * Prevents crashes in private browsing mode or when storage is full
 */

export const safeLocalStorage = {
  /**
   * Safely get an item from localStorage
   */
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error);
      return null;
    }
  },

  /**
   * Safely set an item in localStorage
   */
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error);
      return false;
    }
  },

  /**
   * Safely remove an item from localStorage
   */
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error);
      return false;
    }
  },

  /**
   * Safely get and parse JSON from localStorage
   */
  getJSON: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to get/parse localStorage JSON "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Safely stringify and set JSON in localStorage
   */
  setJSON: <T>(key: string, value: T): boolean => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.warn(`Failed to set localStorage JSON "${key}":`, error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
};