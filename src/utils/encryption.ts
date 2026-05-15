import CryptoJS from 'crypto-js';
import { idbStorage } from './indexedDbStorage';

const SESSION_PIN_KEY = 'toshl_chat_session_pin';

/**
 * Gets the current PIN from session storage
 */
export function getSessionPin(): string | null {
    return sessionStorage.getItem(SESSION_PIN_KEY);
}

/**
 * Sets the PIN in session storage
 */
export function setSessionPin(pin: string): void {
    sessionStorage.setItem(SESSION_PIN_KEY, pin);
}

/**
 * Clears the PIN from session storage
 */
export function clearSessionPin(): void {
    sessionStorage.removeItem(SESSION_PIN_KEY);
}

/**
 * Encrypts an API key using AES encryption with the provided PIN
 */
export function encryptApiKey(apiKey: string, pin: string): string {
    return CryptoJS.AES.encrypt(apiKey, pin).toString();
}

/**
 * Decrypts an API key using AES decryption with the provided PIN
 */
export function decryptApiKey(ciphertext: string, pin: string): string | null {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, pin);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted ? decrypted : null; // returns null on failure
    } catch {
        return null;
    }
}

/**
 * Safely retrieves and decrypts an API key from indexedDb using the session PIN
 */
export async function getDecryptedApiKey(key: string): Promise<string | null> {
    try {
        const encrypted = await idbStorage.getItem(key);
        if (!encrypted) return null;

        const pin = getSessionPin();
        if (!pin) {
            console.warn(`Attempted to decrypt API key "${key}" without a session PIN.`);
            return null;
        }

        const decrypted = decryptApiKey(encrypted, pin);
        return decrypted;
    } catch (error) {
        console.warn(`Failed to decrypt API key "${key}":`, error);
        return null;
    }
}
