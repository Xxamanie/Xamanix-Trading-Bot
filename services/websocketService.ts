import type { Order } from '../types';

const WS_URLS = {
  mainnet: 'wss://stream.bybit.com/v5/public/linear',
  testnet: 'wss://stream-testnet.bybit.com/v5/public/linear',
};

// Callbacks
export type TickerCallback = (data: { symbol: string; price: number; }) => void;
export type OrderBookCallback = (data: { bids: Order[]; asks: Order[]; }) => void;

// Helper to convert app symbol to Bybit symbol
const toBybitSymbol = (symbol: string) => symbol.replace('/USD', 'USDT');
const fromBybitSymbol = (symbol: string) => symbol.replace('USDT', '/USD');

export function createWebSocketManager(
  environment: 'mainnet' | 'testnet',
  onTicker: TickerCallback,
  onOrderBook: OrderBookCallback
) {
  const wsUrl = WS_URLS[environment];
  let ws: WebSocket | null = null;
  let pingInterval: number | null = null;
  let currentSubscriptions = new Set<string>();

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      return;
    }

    ws.onopen = () => {
      console.log('WebSocket connection established.');
      // Send ping every 20 seconds to keep connection alive
      pingInterval = window.setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 'ping' }));
        }
      }, 20000);
      // Resubscribe if connection was dropped and re-established
      if (currentSubscriptions.size > 0) {
        ws.send(JSON.stringify({ op: 'subscribe', args: Array.from(currentSubscriptions) }));
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.op === 'pong' || data.op === 'subscribe') {
        return; // Ignore pong and subscription confirmations
      }
      
      if (data.topic && data.topic.startsWith('tickers') && data.data) {
        onTicker({
          symbol: fromBybitSymbol(data.data.symbol),
          price: parseFloat(data.data.markPrice),
        });
      }

      if (data.topic && data.topic.startsWith('orderbook') && data.data) {
        // Bybit sends separate 'snapshot' and 'delta' updates.
        // For simplicity here, we re-create the book from each message.
        const bids: Order[] = data.data.b.map(([price, quantity]: [string, string]) => ({ price: parseFloat(price), quantity: parseFloat(quantity), total: parseFloat(price) * parseFloat(quantity) }));
        const asks: Order[] = data.data.a.map(([price, quantity]: [string, string]) => ({ price: parseFloat(price), quantity: parseFloat(quantity), total: parseFloat(price) * parseFloat(quantity) }));
        onOrderBook({ bids, asks });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed. Reconnecting in 5 seconds...');
      if (pingInterval) clearInterval(pingInterval);
      ws = null;
      setTimeout(connect, 5000); // Reconnection logic
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws?.close(); // This will trigger the onclose handler for reconnection
    };
  };

  const send = (message: object) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const updateSubscriptions = (symbols: string[], orderBookSymbol: string | null) => {
    const newTopics = new Set<string>();
    symbols.forEach(s => {
      if(s) newTopics.add(`tickers.${toBybitSymbol(s)}`)
    });

    if (orderBookSymbol) {
      newTopics.add(`orderbook.50.${toBybitSymbol(orderBookSymbol)}`);
    }

    const topicsToUnsubscribe = Array.from(currentSubscriptions).filter(t => !newTopics.has(t));
    const topicsToSubscribe = Array.from(newTopics).filter(t => !currentSubscriptions.has(t));

    if (topicsToUnsubscribe.length > 0) {
      send({ op: 'unsubscribe', args: topicsToUnsubscribe });
    }
    if (topicsToSubscribe.length > 0) {
      send({ op: 'subscribe', args: topicsToSubscribe });
    }

    currentSubscriptions = newTopics;
  };

  const disconnect = () => {
    if (pingInterval) clearInterval(pingInterval);
    if (ws) {
      ws.onclose = null; // Prevent reconnection on manual disconnect
      ws.close();
      ws = null;
    }
    currentSubscriptions.clear();
  };

  connect();

  return { updateSubscriptions, disconnect };
}