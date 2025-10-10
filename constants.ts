import type { PortfolioHistory, Asset, Position, TradeViewData, PriceData } from './types';

export const MOCK_PORTFOLIO_HISTORY: PortfolioHistory = {
  timestamps: Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString()),
  equity: [
    10000, 10050, 10100, 10080, 10150, 10200, 10250, 10300, 10280, 10350,
    10400, 10450, 10500, 10480, 10550, 10600, 10650, 10700, 10680, 10750,
    10800, 10850, 10900, 10880, 10950, 11000, 11050, 11100, 11080, 11150
  ],
};

export const MOCK_ASSETS: Asset[] = [
  { name: 'USD', total: 5230.50, available: 4100.30, inOrders: 1130.20, usdValue: 5230.50 },
  { name: 'Bitcoin (BTC)', total: 0.05, available: 0.05, inOrders: 0, usdValue: 3450.75 },
  { name: 'Ethereum (ETH)', total: 0.5, available: 0.2, inOrders: 0.3, usdValue: 1845.25 },
  { name: 'Solana (SOL)', total: 10, available: 10, inOrders: 0, usdValue: 1624.00 },
  { name: 'Naira (NGN)', total: 0, available: 0, inOrders: 0, usdValue: 0 },
];

export const MOCK_POSITIONS: Position[] = [
  { id: '1', asset: 'BTC/USD', direction: 'LONG', entryPrice: 68500, size: 0.02, pnl: 120.50, pnlPercent: 8.8, openTimestamp: new Date(Date.now() - 3600000).toISOString(), seen: false },
  { id: '2', asset: 'ETH/USD', direction: 'LONG', entryPrice: 3600, size: 0.3, pnl: 85.23, pnlPercent: 7.9, openTimestamp: new Date(Date.now() - 7200000).toISOString(), seen: false },
  { id: '3', asset: 'SOL/USD', direction: 'SHORT', entryPrice: 165, size: 5, pnl: -25.50, pnlPercent: -3.1, openTimestamp: new Date(Date.now() - 1800000).toISOString(), seen: false },
];

const generateCandleData = (basePrice: number, points: number, volatility: number): PriceData => {
    const prices: number[] = [];
    const timestamps: string[] = [];
    let currentPrice = basePrice;
    for (let i = 0; i < points; i++) {
        const change = (Math.random() - 0.5) * (currentPrice * volatility);
        currentPrice += change;
        prices.unshift(currentPrice);
        timestamps.unshift(new Date(Date.now() - i * 60 * 1000).toISOString());
    }
    return { prices, timestamps };
}

export const MOCK_TRADE_VIEW_DATA: TradeViewData = {
    'BTC/USD': {
        '5m': generateCandleData(69123.45, 288, 0.0005), // 24 hours of 5m candles
        '15m': generateCandleData(69123.45, 96, 0.001), // 24 hours of 15m candles
        '1h': generateCandleData(69123.45, 24, 0.002), // 24 hours of 1h candles
        '4h': generateCandleData(69123.45, 30, 0.005), // 5 days of 4h candles
    },
    'ETH/USD': {
        '5m': generateCandleData(3690.12, 288, 0.0006),
        '15m': generateCandleData(3690.12, 96, 0.0012),
        '1h': generateCandleData(3690.12, 24, 0.0025),
        '4h': generateCandleData(3690.12, 30, 0.006),
    },
    'SOL/USD': {
        '5m': generateCandleData(162.40, 288, 0.0008),
        '15m': generateCandleData(162.40, 96, 0.0015),
        '1h': generateCandleData(162.40, 24, 0.003),
        '4h': generateCandleData(162.40, 30, 0.008),
    },
    'NGN/USD': {
        '5m': generateCandleData(0.00067, 288, 0.0009),
        '15m': generateCandleData(0.00067, 96, 0.0018),
        '1h': generateCandleData(0.00067, 24, 0.0035),
        '4h': generateCandleData(0.00067, 30, 0.009),
    },
};

export const DEFAULT_SCRIPT = `
import pandas as pd
import numpy as np
import json
import argparse
from pathlib import Path

# Default configuration
DEFAULT_CFG = {
    "symbol": "BTC/USD",
    "timeframe": "1h",
    "capital": 10000.0,
    "fee": 0.001,
    "fast": 8,
    "slow": 21,
    "signal": 5,
}

class MacdBot:
    def __init__(self, cfg):
        self.cfg = cfg
        # Note: In the sandboxed environment, file operations are virtual.
        # We will print results to stdout for capture.
        self.results_dir = Path("results")
        self.results_dir.mkdir(exist_ok=True)

    def _load_data(self):
        # Generate synthetic data for demonstration.
        np.random.seed(42)
        dates = pd.to_datetime(pd.date_range(start="2023-01-01", periods=500, freq="H"))
        price_changes = 1 + np.random.randn(500) * 0.01
        close_prices = 20000 * price_changes.cumprod()
        return pd.DataFrame(data={'timestamp': dates, 'close': close_prices}).set_index('timestamp')

    def run_backtest(self):
        df = self._load_data()

        # Calculate MACD
        exp1 = df['close'].ewm(span=self.cfg['fast'], adjust=False).mean()
        exp2 = df['close'].ewm(span=self.cfg['slow'], adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=self.cfg['signal'], adjust=False).mean()
        df['macd'] = macd
        df['signal'] = signal

        # Trading Signals
        df['position'] = 0
        df.loc[df['macd'] > df['signal'], 'position'] = 1
        df.loc[df['macd'] < df['signal'], 'position'] = -1
        df['position'] = df['position'].shift(1).fillna(0)

        # Calculate returns
        df['market_returns'] = df['close'].pct_change()
        df['strategy_returns'] = df['market_returns'] * df['position']

        # Simulate trades and equity
        n_trades = 0
        position = 0
        equity = [self.cfg['capital']]
        for i in range(1, len(df)):
            current_equity = equity[-1]
            if df['position'].iloc[i] != position:
                n_trades += 1
                current_equity *= (1 - self.cfg['fee'])
            
            equity_change = current_equity * df['strategy_returns'].iloc[i]
            equity.append(current_equity + equity_change)
            position = df['position'].iloc[i]
        
        df['equity'] = equity
        self._generate_results(df, n_trades)

    def _generate_results(self, df, n_trades):
        final_equity = df['equity'].iloc[-1]
        total_return = (final_equity / self.cfg['capital']) - 1
        daily_returns = df['equity'].pct_change().dropna()
        sharpe = np.sqrt(252*24) * daily_returns.mean() / daily_returns.std() if daily_returns.std() > 0 else 0
        max_drawdown = (df['equity'].cummax() - df['equity']).max() / df['equity'].cummax().max()
        wins = df[df['strategy_returns'] > 0].shape[0]

        summary = {
            "final_equity": final_equity,
            "total_return_pct": total_return,
            "n_trades": n_trades,
            "wins": wins,
            "win_rate": wins / n_trades if n_trades > 0 else 0,
            "avg_win": df[df['strategy_returns'] > 0]['strategy_returns'].mean() * self.cfg['capital'],
            "avg_loss": df[df['strategy_returns'] < 0]['strategy_returns'].mean() * self.cfg['capital'],
            "profit_factor": df[df['strategy_returns'] > 0]['strategy_returns'].sum() / -df[df['strategy_returns'] < 0]['strategy_returns'].sum() if df[df['strategy_returns'] < 0]['strategy_returns'].sum() != 0 else 0,
            "max_consecutive_losses": 0,
            "max_drawdown": max_drawdown,
            "sharpe": sharpe,
        }
        
        # Print results to stdout for the Gemini environment to capture
        print("---SUMMARY_JSON---")
        print(json.dumps(summary, indent=4))
        print("---EQUITY_CSV---")
        # Use ISO format for dates to ensure consistent parsing
        equity_df = df[['equity']].copy()
        equity_df.index = equity_df.index.map(pd.Timestamp.isoformat)
        print(equity_df.to_csv())

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="MACD Trading Bot")
    parser.add_argument("--mode", type=str, default="backtest", help="Operation mode")
    args = parser.parse_args()

    bot = MacdBot(DEFAULT_CFG)
    if args.mode == 'backtest':
        bot.run_backtest()
`;