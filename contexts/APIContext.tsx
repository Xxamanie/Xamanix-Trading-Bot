import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface APIContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  apiSecret: string;
  setApiSecret: (secret: string) => void;
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
}

const APIContext = createContext<APIContextType | undefined>(undefined);

export const APIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from localStorage or default values
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('xamanix-apiKey') || '');
  const [apiSecret, setApiSecret] = useState<string>(() => localStorage.getItem('xamanix-apiSecret') || '');
  const [isConnected, setIsConnected] = useState<boolean>(() => localStorage.getItem('xamanix-isConnected') === 'true');

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

  return (
    <APIContext.Provider value={{ apiKey, setApiKey, apiSecret, setApiSecret, isConnected, setIsConnected }}>
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
