

import type { Asset, Position, ClosedTrade } from '../types';

// This service provides a live connection to the Bybit v5 API.
// It handles API request signing and translates API responses into the application's data types.

const URL_MAINNET = 'https://api.bybit.com';
const URL_TESTNET = 'https://api-testnet.bybit.com';

// --- API Request Signing & Handling ---

async function signRequest(timestamp: string, apiKey: string, apiSecret: string, recvWindow: string, params: string): Promise<string> {
    const message = timestamp + apiKey + recvWindow + params;
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function makeRequest(
    method: 'GET' | 'POST',
    path: string,
    params: any,
    apiKey: string,
    apiSecret: string,
    environment: 'testnet' | 'mainnet'
) {
    const baseUrl = environment === 'mainnet' ? URL_MAINNET : URL_TESTNET;
    const timestamp = Date.now().toString();
    const recvWindow = '10000'; // Increased receive window for network variability

    let signaturePayload = '';
    let requestBody: string | undefined = undefined;
    let fullUrl = baseUrl + path;

    if (method === 'GET') {
        // Build the query string from sorted keys to ensure a consistent signature.
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
            
        if (queryString) {
            fullUrl += '?' + queryString;
            signaturePayload = queryString;
        }
    } else { // POST
        requestBody = JSON.stringify(params);
        signaturePayload = requestBody;
    }

    const signature = await signRequest(timestamp, apiKey, apiSecret, recvWindow, signaturePayload);

    const headers = {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signature,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json; charset=utf-8'
    };

    const response = await fetch(fullUrl, {
        method,
        headers,
        body: requestBody,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not retrieve error body.');
         // Provide a more specific error for 401 Unauthorized
        if (response.status === 401) {
             throw new Error(`Bybit API Error (401 Unauthorized): Please check if your API Key, Secret, and selected environment (${environment}) are correct. The request signature may be invalid.`);
        }
        throw new Error(`Bybit API request failed with status ${response.status}: ${errorText}`);
    }
    
    const responseText = await response.text();
    if (!responseText) {
        throw new Error("Received an empty response from Bybit API.");
    }
    
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        // This will catch the "unexpected end of JSON input" error and provide more context.
        throw new Error(`Failed to parse JSON response from Bybit. Response: ${responseText}`);
    }

    if (data.retCode !== 0) {
        throw new Error(`Bybit API Error: ${data.retMsg} (Code: ${data.retCode})`);
    }

    return data.result;
}

// --- Service Functions ---

export const verifyAndFetchBalances = async (apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet'): Promise<{ assets: Asset[], totalEquity: number }> => {
    const result = await makeRequest('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' }, apiKey, apiSecret, environment);
    
    if (!result.list || result.list.length === 0) {
        throw new Error("Could not find Unified Trading Account balance.");
    }

    const account = result.list[0];
    const assets = account.coin.map((coin: any): Asset => ({
        name: coin.coin,
        total: parseFloat(coin.walletBalance),
        available: parseFloat(coin.availableToWithdraw), // A more accurate representation of available capital
        inOrders: parseFloat(coin.walletBalance) - parseFloat(coin.availableToWithdraw),
        usdValue: parseFloat(coin.usdValue),
    })).sort((a: Asset, b: Asset) => b.usdValue - a.usdValue);
    
    const totalEquity = parseFloat(account.totalEquity);

    return { assets, totalEquity };
};

// This function fetches live positions and maps them to the app's Position type.
export const fetchPositions = async (apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet'): Promise<Position[]> => {
    const result = await makeRequest('GET', '/v5/position/list', { category: 'linear', settleCoin: 'USDT' }, apiKey, apiSecret, environment);
    
    return result.list.map((pos: any): Position => {
        const leverage = parseFloat(pos.leverage);
        const entryPrice = parseFloat(pos.avgPrice);
        const size = parseFloat(pos.size);
        const unrealisedPnl = parseFloat(pos.unrealisedPnl);

        const positionValue = entryPrice * size;
        const margin = leverage > 0 ? positionValue / leverage : 0;
        
        return {
            id: `${pos.symbol}-${pos.side}`,
            asset: pos.symbol.replace('USDT', '/USD'),
            direction: pos.side === 'Buy' ? 'LONG' : 'SHORT',
            entryPrice: entryPrice,
            size: size,
            pnl: unrealisedPnl,
            pnlPercent: margin > 0 ? (unrealisedPnl / margin) * 100 : 0,
            openTimestamp: new Date(parseInt(pos.createdTime)).toISOString(),
            seen: false, // Default for new positions
        };
    });
};

const convertSymbolToBybit = (appSymbol: string): string => {
    return appSymbol.replace('/USD', 'USDT');
};

interface ExecuteTradeDetails {
    asset: string; // e.g., 'BTC/USD'
    direction: 'LONG' | 'SHORT';
    amountUSD: number;
    orderType: 'Market' | 'Limit';
    limitPrice?: string;
    takeProfit?: { type: 'Price' | 'Percentage', value: string };
}

export const executeLiveTrade = async (details: ExecuteTradeDetails, apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet'): Promise<void> => {
    const symbol = convertSymbolToBybit(details.asset);
    
    // Fetch latest price to calculate quantity
    const tickerResult = await makeRequest('GET', '/v5/market/tickers', { category: 'linear', symbol }, apiKey, apiSecret, environment);
    const markPrice = parseFloat(tickerResult.list[0].markPrice);
    if (!markPrice) throw new Error(`Could not fetch market price for ${symbol}`);
    
    const priceForQtyCalc = details.orderType === 'Limit' && details.limitPrice ? parseFloat(details.limitPrice) : markPrice;
    if (!priceForQtyCalc) throw new Error(`Could not determine price for quantity calculation for ${symbol}`);
    const quantity = (details.amountUSD / priceForQtyCalc).toFixed(3); // Adjust precision as needed

    const order: any = {
        category: 'linear',
        symbol: symbol,
        side: details.direction === 'LONG' ? 'Buy' : 'Sell',
        orderType: details.orderType,
        qty: quantity,
    };

    if (details.orderType === 'Limit') {
        if (!details.limitPrice || isNaN(parseFloat(details.limitPrice))) {
            throw new Error('A valid limit price is required for Limit orders.');
        }
        order.price = details.limitPrice;
    }

    if (details.takeProfit && details.takeProfit.value && parseFloat(details.takeProfit.value) > 0) {
        let tpPrice = 0;
        const tpValue = parseFloat(details.takeProfit.value);
        const entryPrice = priceForQtyCalc;

        if (details.takeProfit.type === 'Price') {
            tpPrice = tpValue;
        } else { // Percentage
            const percentage = tpValue / 100;
            if (details.direction === 'LONG') {
                tpPrice = entryPrice * (1 + percentage);
            } else { // SHORT
                tpPrice = entryPrice * (1 - percentage);
            }
        }
        order.takeProfit = tpPrice.toFixed(2);
    }

    await makeRequest('POST', '/v5/order/create', order, apiKey, apiSecret, environment);
};

export const closeLivePosition = async (position: Position, apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet'): Promise<void> => {
    const symbol = convertSymbolToBybit(position.asset);
    const order = {
        category: 'linear',
        symbol: symbol,
        side: position.direction === 'LONG' ? 'Sell' : 'Buy',
        orderType: 'Market',
        qty: String(position.size),
        reduceOnly: true, // This flag ensures the order only closes an existing position
    };
    await makeRequest('POST', '/v5/order/create', order, apiKey, apiSecret, environment);
};

// Dummy functions to satisfy legacy calls. Real transfers are complex and out of scope.
export const transferFunds = (amount: number, currency: string): Promise<void> => {
  return Promise.reject(new Error("Fund transfers must be managed directly on the Bybit exchange."));
};

export const clearSessionBalances = (): void => {
    // This is a legacy function from the simulation; it has no effect in the live version.
};