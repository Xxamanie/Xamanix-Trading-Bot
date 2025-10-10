import type { Asset } from '../types';

// This is a mock service to simulate fetching data from the Bybit API.
// In a real application, this would use a library like 'bybit-api'
// and include proper request signing with the API key and secret.

const MOCK_REAL_BALANCES: Asset[] = [
  { name: 'USDT', total: 10520.75, available: 8300.50, inOrders: 2220.25, usdValue: 10520.75 },
  { name: 'Bitcoin (BTC)', total: 0.25, available: 0.20, inOrders: 0.05, usdValue: 17253.75 },
  { name: 'Ethereum (ETH)', total: 2.5, available: 2.5, inOrders: 0, usdValue: 9226.25 },
];

/**
 * Simulates verifying API keys and fetching wallet balances from Bybit.
 * @param apiKey The user's API key.
 * @param apiSecret The user's API secret.
 * @returns A promise that resolves with an array of Assets.
 * @throws An error if the keys are invalid.
 */
export const verifyAndFetchBalances = (apiKey: string, apiSecret: string): Promise<Asset[]> => {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      // Use simple mock keys for demonstration purposes.
      // A real implementation would not have hardcoded keys.
      if (apiKey === 'VALID_KEY' && apiSecret === 'VALID_SECRET') {
        console.log("Bybit Service: API Keys are valid. Fetching balances.");
        resolve(MOCK_REAL_BALANCES);
      } else {
        console.log("Bybit Service: Invalid API Keys provided.");
        reject(new Error("Verification Failed: Invalid API Key or Secret."));
      }
    }, 1500); // 1.5 second delay
  });
};
