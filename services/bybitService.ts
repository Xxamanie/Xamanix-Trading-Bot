import type { Asset, Position, ClosedTrade } from '../types';
import { MOCK_TRADE_VIEW_DATA } from '../constants';


// This service simulates a live connection to the Bybit API.
// It maintains a session-specific state for balances and processes trade executions.
// For a successful connection, use the following dummy credentials:
// API Key: test_api_key_123
// API Secret: test_api_secret_456

let sessionBalances: Asset[] | null = null;
const VALID_API_KEY = 'test_api_key_123';
const VALID_API_SECRET = 'test_api_secret_456';

const generateRandomBalances = (): Asset[] => {
    const randomFloat = (min: number, max: number, decimals: number) => {
        const str = (Math.random() * (max - min) + min).toFixed(decimals);
        return parseFloat(str);
    };

    const usdtAmount = randomFloat(10000, 100000, 2);
    const btcAmount = randomFloat(0.1, 5, 6);
    const ethAmount = randomFloat(1, 50, 4);
    
    const btcPrice = 69000;
    const ethPrice = 3700;

    return [
        { name: 'USDT', total: usdtAmount, available: usdtAmount, inOrders: 0, usdValue: usdtAmount },
        { name: 'Bitcoin (BTC)', total: btcAmount, available: btcAmount, inOrders: 0, usdValue: btcAmount * btcPrice },
        { name: 'Ethereum (ETH)', total: ethAmount, available: ethAmount, inOrders: 0, usdValue: ethAmount * ethPrice },
    ];
};

export const verifyAndFetchBalances = (apiKey: string, apiSecret: string): Promise<Asset[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (apiKey === VALID_API_KEY && apiSecret === VALID_API_SECRET) {
        if (!sessionBalances) {
            sessionBalances = generateRandomBalances();
        }
        resolve(JSON.parse(JSON.stringify(sessionBalances)));
      } else {
        reject(new Error("Invalid API credentials. Please check and try again."));
      }
    }, 1500);
  });
};

export const transferFunds = (amount: number, currency: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (amount <= 0) return reject(new Error("Transfer amount must be positive."));
      if (!sessionBalances) return reject(new Error("Cannot transfer funds, no active connection session."));

      const assetToUpdate = sessionBalances.find(a => a.name === currency);
      if (assetToUpdate) {
        assetToUpdate.total += amount;
        assetToUpdate.available += amount;
        assetToUpdate.usdValue += amount;
      } else {
        sessionBalances.push({ name: currency, total: amount, available: amount, inOrders: 0, usdValue: amount });
      }
      resolve();
    }, 1000);
  });
};

export const clearSessionBalances = (): void => {
    sessionBalances = null;
};

// --- Live Trading Functions ---

interface ExecuteTradeDetails {
    asset: string;
    direction: 'LONG' | 'SHORT';
    amountUSD: number;
}

interface ExecuteTradeResult {
    position: Position;
    updatedAssets: Asset[];
}

export const executeLiveTrade = (details: ExecuteTradeDetails): Promise<ExecuteTradeResult> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!sessionBalances) {
                return reject(new Error("No active exchange session."));
            }
            
            const collateralAsset = sessionBalances.find(a => a.name === 'USDT');
            if (!collateralAsset || collateralAsset.available < details.amountUSD) {
                return reject(new Error("Insufficient USDT balance to open position."));
            }

            // Simulate market execution
            const entryPrice = MOCK_TRADE_VIEW_DATA[details.asset]['15m'].prices[0] * (1 + (Math.random() - 0.5) * 0.0005);
            const size = details.amountUSD / entryPrice;

            // Update balances
            collateralAsset.available -= details.amountUSD;
            collateralAsset.inOrders += details.amountUSD;

            const newPosition: Position = {
                id: `pos-${Date.now()}`,
                asset: details.asset,
                direction: details.direction,
                entryPrice: entryPrice,
                size: size,
                pnl: 0,
                pnlPercent: 0,
                openTimestamp: new Date().toISOString(),
                seen: false,
            };
            
            resolve({
                position: newPosition,
                updatedAssets: JSON.parse(JSON.stringify(sessionBalances)),
            });

        }, 1000); // Simulate network latency
    });
};


interface ClosePositionResult {
    closedTrade: ClosedTrade;
    updatedAssets: Asset[];
}

export const closeLivePosition = (position: Position): Promise<ClosePositionResult> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!sessionBalances) {
                return reject(new Error("No active exchange session."));
            }
            const collateralAsset = sessionBalances.find(a => a.name === 'USDT');
            if (!collateralAsset) {
                 return reject(new Error("Critical error: USDT collateral not found."));
            }

            // Simulate market close
            const exitPrice = MOCK_TRADE_VIEW_DATA[position.asset]['15m'].prices[0] * (1 + (Math.random() - 0.5) * 0.001);
            const pnl = (exitPrice - position.entryPrice) * position.size * (position.direction === 'LONG' ? 1 : -1);
            const initialCapital = position.entryPrice * position.size;

            // Update balances
            collateralAsset.inOrders -= initialCapital;
            if (collateralAsset.inOrders < 0) collateralAsset.inOrders = 0; // Prevent negative inOrders
            collateralAsset.available += (initialCapital + pnl);

            const closedTrade: ClosedTrade = {
                id: `trade-${Date.now()}`,
                asset: position.asset,
                direction: position.direction,
                entryPrice: position.entryPrice,
                exitPrice: exitPrice,
                size: position.size,
                pnl: pnl,
                openTimestamp: position.openTimestamp,
                closeTimestamp: new Date().toISOString(),
            };

            resolve({
                closedTrade,
                updatedAssets: JSON.parse(JSON.stringify(sessionBalances)),
            });

        }, 1000);
    });
};