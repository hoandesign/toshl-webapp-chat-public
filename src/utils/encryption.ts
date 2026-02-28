import CryptoJS from 'crypto-js';

// Secret key for encryption/decryption (should be managed securely in production)
const API_KEY_SECRET = 'your-strong-secret-key';

/**
 * Encrypts an API key using AES encryption
 */
export function encryptApiKey(apiKey: string): string {
    return CryptoJS.AES.encrypt(apiKey, API_KEY_SECRET).toString();
}

/**
 * Decrypts an API key using AES decryption
 */
export function decryptApiKey(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, API_KEY_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Safely retrieves and decrypts an API key from localStorage
 */
export function getDecryptedApiKey(key: string): string | null {
    try {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        
        const decrypted = decryptApiKey(encrypted);
        return decrypted || null;
    } catch (error) {
        console.warn(`Failed to decrypt API key "${key}":`, error);
        return null;
    }
}