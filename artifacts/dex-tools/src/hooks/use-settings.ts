import { useState, useEffect, useCallback } from "react";
import { encryptData, decryptData } from "../lib/encryption";

export interface ConnectionSettings {
  rpcEndpoint: string;
  privateKey: string;
}

const SETTINGS_KEY = "dango_dex_secure_settings";

const defaultSettings: ConnectionSettings = {
  rpcEndpoint: "",
  privateKey: "",
};

export function useSettings() {
  const [settings, setSettingsState] = useState<ConnectionSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const decrypted = decryptData(stored);
        if (decrypted) {
          setSettingsState(JSON.parse(decrypted));
        }
      }
    } catch (err) {
      console.error("Failed to load settings from local storage");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveSettings = useCallback((newSettings: ConnectionSettings) => {
    try {
      const encrypted = encryptData(JSON.stringify(newSettings));
      localStorage.setItem(SETTINGS_KEY, encrypted);
      setSettingsState(newSettings);
      return true;
    } catch (err) {
      console.error("Failed to save settings");
      return false;
    }
  }, []);

  const clearSettings = useCallback(() => {
    localStorage.removeItem(SETTINGS_KEY);
    setSettingsState(defaultSettings);
  }, []);

  return {
    settings,
    saveSettings,
    clearSettings,
    isLoaded
  };
}
