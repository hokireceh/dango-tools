import CryptoJS from "crypto-js";

// Catatan keamanan: Key ini hardcoded dan terekspos di JS bundle.
// Fungsi ini hanya mengaburkan (obfuscate) data agar tidak tersimpan
// sebagai plaintext di localStorage — BUKAN enkripsi yang aman secara kriptografis.
const STORAGE_ENCRYPTION_KEY = "DANGO_DEX_LOCAL_SECURE_KEY_998877";

export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, STORAGE_ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error("Obfuscation failed:", error);
    return "";
  }
}

export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, STORAGE_ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Deobfuscation failed:", error);
    return "";
  }
}
