
import type { Asset } from '../types';

// This is a stateful mock service to simulate fetching data from the Bybit API.
// In a real application, this would use a library like 'bybit-api'
// and include proper request signing with the API key and secret.

let mockBalances: Asset[] = [
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
        // Return a deep copy to prevent direct mutation of the service's state from the client
        resolve(JSON.parse(JSON.stringify(mockBalances)));
      } else {
        console.log("Bybit Service: API Key or Secret is missing.");
        reject(new Error("Verification Failed: API Key and Secret cannot be empty."));
      }
    }, 1500); // 1.5 second delay
  });
};

/**
 * Simulates transferring funds within the exchange, updating the persistent mock balance.
 * In a real app, this would make a POST request to the transfer endpoint.
 * @param amount The amount to transfer.
 * @param currency The currency to transfer, e.g., 'USDT'.
 * @returns A promise that resolves when the transfer is "complete".
 */
export const transferFunds = (amount: number, currency: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log(`Bybit Service: Simulating transfer of ${amount} ${currency}.`);
    setTimeout(() => {
      if (amount <= 0) {
        return reject(new Error("Transfer amount must be positive."));
      }

      // Find the asset to update. In this simulation, we assume 'currency' is a stablecoin like USDT.
      const assetToUpdate = mockBalances.find(a => a.name === currency);

      if (assetToUpdate) {
        assetToUpdate.total += amount;
        assetToUpdate.available += amount;
        assetToUpdate.usdValue += amount;
      } else {
        // If the stablecoin doesn't exist in the wallet, create it.
        mockBalances.push({
          name: currency,
          total: amount,
          available: amount,
          inOrders: 0,
          usdValue: amount,
        });
      }
      
      console.log(`Bybit Service: Balances updated. New ${currency} total: ${mockBalances.find(a => a.name === currency)?.total}`);
      resolve();
    }, 1000); // 1 second delay
  });
};
