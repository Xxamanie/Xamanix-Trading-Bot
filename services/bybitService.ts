import type { Asset } from '../types';

// This is a mock service to simulate fetching data from the Bybit API.
// In a real application, this would use a library like 'bybit-api'
// and include proper request signing with the API key and secret.

const MOCK_REAL_BALANCES: Asset[] = [
  { name: 'USDT', total: 500000.00, available: 480000.00, inOrders: 20000.00, usdValue: 500000.00 },
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
      // Mock verification: succeed if both fields have any content.
      if (apiKey.trim().length > 0 && apiSecret.trim().length > 0) {
        console.log("Bybit Service: API Keys provided. Mocking successful verification.");
        resolve(MOCK_REAL_BALANCES);
      } else {
        console.log("Bybit Service: API Key or Secret is missing.");
        reject(new Error("Verification Failed: API Key and Secret cannot be empty."));
      }
    }, 1500); // 1.5 second delay
  });
};
