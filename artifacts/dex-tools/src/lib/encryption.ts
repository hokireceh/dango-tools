import CryptoJS from "crypto-js";

// We use a fixed key for local storage encryption just to prevent plaintext storage
// For a real production app, this key would ideally be derived from a user password,
// but since this is a DEX tool running locally, we at least obscure it.
const STORAGE_ENCRYPTION_KEY = "DANGO_DEX_LOCAL_SECURE_KEY_998877";

export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, STORAGE_ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return "";
  }
}

export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, STORAGE_ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}
