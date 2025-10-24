import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AVAILABLE_SOUNDS } from '../services/soundService';

interface APIContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  apiSecret: string;
  setApiSecret: (secret: string) => void;
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  environment: 'testnet' | 'mainnet';
  setEnvironment: (env: 'testnet' | 'mainnet') => void;
  tradeMethod: 'Market' | 'Limit';
  setTradeMethod: (method: 'Market' | 'Limit') => void;
  soundAlertsEnabled: boolean;
  setSoundAlertsEnabled: (enabled: boolean) => void;
  priceAlertThreshold: number;
  setPriceAlertThreshold: (threshold: number) => void;
  selectedAlertSound: string;
  setSelectedAlertSound: (sound: string) => void;
}

const APIContext = createContext<APIContextType | undefined>(undefined);

export const APIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from localStorage or default values
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('xamanix-apiKey') || '');
  const [apiSecret, setApiSecret] = useState<string>(() => localStorage.getItem('xamanix-apiSecret') || '');
  const [isConnected, setIsConnected] = useState<boolean>(() => localStorage.getItem('xamanix-isConnected') === 'true');
  const [environment, setEnvironment] = useState<'testnet' | 'mainnet'>(() => (localStorage.getItem('xamanix-environment') as 'testnet' | 'mainnet') || 'testnet');
  const [tradeMethod, setTradeMethod] = useState<'Market' | 'Limit'>(() => (localStorage.getItem('xamanix-tradeMethod') as 'Market' | 'Limit') || 'Market');
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => localStorage.getItem('xamanix-soundAlertsEnabled') === 'true');
  const [priceAlertThreshold, setPriceAlertThreshold] = useState<number>(() => parseFloat(localStorage.getItem('xamanix-priceAlertThreshold') || '1'));
  const [selectedAlertSound, setSelectedAlertSound] = useState<string>(() => localStorage.getItem('xamanix-selectedAlertSound') || AVAILABLE_SOUNDS[0].url);

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('xamanix-apiKey', apiKey);
    } catch (e) {
      console.error("Failed to save API key to localStorage", e);
    }
  }, [apiKey]);

  useEffect(() => {
    try {
      localStorage.setItem('xamanix-apiSecret', apiSecret);
    } catch (e) {
      console.error("Failed to save API secret to localStorage", e);
    }
  }, [apiSecret]);

  useEffect(() => {
    try {
      localStorage.setItem('xamanix-isConnected', String(isConnected));
    } catch (e) {
      console.error("Failed to save connection status to localStorage", e);
    }
  }, [isConnected]);

  useEffect(() => {
    try {
      localStorage.setItem('xamanix-environment', environment);
    } catch (e) {
      console.error("Failed to save environment to localStorage", e);
    }
  }, [environment]);

  useEffect(() => {
    try {
      localStorage.setItem('xamanix-tradeMethod', tradeMethod);
    } catch (e) {
      console.error("Failed to save trade method to localStorage", e);
    }
  }, [tradeMethod]);
  
  useEffect(() => {
    localStorage.setItem('xamanix-soundAlertsEnabled', String(soundAlertsEnabled));
  }, [soundAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem('xamanix-priceAlertThreshold', String(priceAlertThreshold));
  }, [priceAlertThreshold]);

  useEffect(() => {
    localStorage.setItem('xamanix-selectedAlertSound', selectedAlertSound);
  }, [selectedAlertSound]);

  const value = {
    apiKey, setApiKey,
    apiSecret, setApiSecret,
    isConnected, setIsConnected,
    environment, setEnvironment,
    tradeMethod, setTradeMethod,
    soundAlertsEnabled, setSoundAlertsEnabled,
    priceAlertThreshold, setPriceAlertThreshold,
    selectedAlertSound, setSelectedAlertSound
  };

  return (
    <APIContext.Provider value={value}>
      {children}
    </APIContext.Provider>
  );
};

export const useAPI = (): APIContextType => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
};
