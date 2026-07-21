import CryptoJS from "crypto-js";

// Use a secret key from environment variables or a fallback for development
const SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET_KEY || "pm-tool-secure-storage-key-2024";

/**
 * Encrypts a string using AES
 */
const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decrypts an AES encrypted string
 */
const decrypt = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt data:", error);
    return "";
  }
};

/**
 * Simple hash for keys to make them unreadable but consistent
 */
const hashKey = (key: string): string => {
  return CryptoJS.SHA256(key + SECRET_KEY).toString().substring(0, 16);
};

export const secureStorage = {
  /**
   * Saves data to localStorage with encryption
   */
  setItem: (key: string, value: any): void => {
    try {
      const hashedKey = hashKey(key);
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      const encryptedValue = encrypt(stringValue);
      localStorage.setItem(hashedKey, encryptedValue);
    } catch (error) {
      console.error("Error saving to secure storage:", error);
    }
  },

  /**
   * Retrieves and decrypts data from localStorage
   */
  getItem: (key: string): any => {
    try {
      const hashedKey = hashKey(key);
      const encryptedValue = localStorage.getItem(hashedKey);
      
      if (!encryptedValue) return null;

      const decryptedValue = decrypt(encryptedValue);
      
      if (!decryptedValue) return null;

      try {
        return JSON.parse(decryptedValue);
      } catch {
        return decryptedValue;
      }
    } catch (error) {
      console.error("Error reading from secure storage:", error);
      return null;
    }
  },

  /**
   * Removes an item from localStorage
   */
  removeItem: (key: string): void => {
    const hashedKey = hashKey(key);
    localStorage.removeItem(hashedKey);
  },

  /**
   * Clears all localStorage
   */
  clear: (): void => {
    localStorage.clear();
  }
};
