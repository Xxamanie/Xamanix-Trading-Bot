
import type { PortfolioHistory, Asset, Position, TradeViewData, PriceData } from './types';

export const MOCK_PORTFOLIO_HISTORY: PortfolioHistory = {
  timestamps: Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString()),
  equity: [
    495276, 496150, 496847, 496690, 497677, 498308, 499156, 500139, 499540, 500742,
    501308, 502012, 502750, 502574, 503728, 504153, 505307, 505877, 505436, 506727,
    507425, 508200, 508735, 508795, 509930, 510526, 511520, 512211, 511736, 512880
  ],
};

export const MOCK_ASSETS: Asset[] = [
  { name: 'USD', total: 500000.00, available: 495000.00, inOrders: 5000.00, usdValue: 500000.00 },
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
# ============================================================================
# Xamanix Trading Bot: Advanced MACD Crossover with Integrated Risk Management
#
# This script combines a trading strategy (MACD Crossover) with a robust
# risk management framework to create a professional-grade trading bot.
#
# How it works:
# 1. Strategy: A MACD crossover provides the primary buy/sell signals.
# 2. Risk Management: Before any trade, the RiskManager calculates a safe
#    position size based on a dynamic stop-loss (using ATR) and a fixed
#    risk percentage of the total account.
# 3. Safety Monitoring: The backtest includes "circuit breakers" that halt
#    trading if the account drawdown or consecutive losses exceed set limits.
# ============================================================================

import pandas as pd
import numpy as np
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, List

# --- Configuration ---
DEFAULT_CFG = {
    # Trading Parameters
    "symbol": "BTC/USD",
    "timeframe": "1h",
    "capital": 10000.0,
    "fee": 0.001,

    # Strategy Parameters (MACD Crossover)
    "fast": 8,
    "slow": 21,
    "signal": 5,

    # Risk Management Parameters
    "max_risk_per_trade": 0.01,         # Risk 1% of capital per trade
    "risk_reward_ratio": 2.0,           # Aim for 2:1 reward to risk
    
    # Dynamic Stop Loss (ATR-based)
    "atr_period": 14,                   # Period for Average True Range
    "atr_multiplier": 2.0,              # Multiplier for ATR to set stop loss
    
    # Safety Monitor Parameters
    "max_drawdown_allowed": 0.20,       # Halt if drawdown exceeds 20%
    "max_consecutive_losses": 5,        # Halt after 5 consecutive losses
}

# ============================================================================
# RISK MANAGEMENT CLASS (Integrated from your submission)
# ============================================================================
class RiskManager:
    """
    Core risk management class for trading operations.
    Calculates position sizes and validates trades based on account health.
    """
    def __init__(
        self,
        account_balance: float,
        max_risk_per_trade: float = 0.01,
        max_daily_risk: float = 0.05
    ):
        self.account_balance = account_balance
        self.initial_balance = account_balance
        self.max_risk_per_trade = max_risk_per_trade
        self.peak_balance = account_balance
        self.daily_loss = 0.0

    def calculate_position_size(
        self,
        entry_price: float,
        stop_loss_price: float
    ) -> Dict[str, Any]:
        """Calculates safe position size based on risk parameters."""
        risk_amount = self.account_balance * self.max_risk_per_trade
        price_difference = abs(entry_price - stop_loss_price)
        
        if price_difference == 0:
            return {"position_size": 0.0, "error": "Stop loss cannot be at entry price"}
        
        position_size = risk_amount / price_difference
        return {"position_size": position_size}

    def update_account_balance(self, new_balance: float) -> None:
        """Updates account balance and tracks peak for drawdown calculation."""
        if new_balance < self.account_balance:
            self.daily_loss += self.account_balance - new_balance
        self.account_balance = new_balance
        if new_balance > self.peak_balance:
            self.peak_balance = new_balance


# ============================================================================
# TRADING BOT CLASS
# ============================================================================
class AdvancedMacdBot:
    def __init__(self, cfg):
        self.cfg = cfg
        self.risk_manager = RiskManager(
            account_balance=self.cfg['capital'],
            max_risk_per_trade=self.cfg['max_risk_per_trade']
        )
        self.trades: List[Dict] = []
        self.equity_curve: List[float] = []

    def _load_data(self):
        """Generates synthetic price data for the backtest."""
        np.random.seed(42)
        dates = pd.to_datetime(pd.date_range(start="2023-01-01", periods=1000, freq="H"))
        price_changes = 1 + np.random.randn(1000) * 0.02
        close_prices = 20000 * price_changes.cumprod()
        high_prices = close_prices * (1 + np.random.uniform(0, 0.01, size=1000))
        low_prices = close_prices * (1 - np.random.uniform(0, 0.01, size=1000))
        return pd.DataFrame(data={
            'timestamp': dates, 'high': high_prices, 'low': low_prices, 'close': close_prices
        }).set_index('timestamp')

    def _calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculates MACD and ATR indicators."""
        # MACD
        exp1 = df['close'].ewm(span=self.cfg['fast'], adjust=False).mean()
        exp2 = df['close'].ewm(span=self.cfg['slow'], adjust=False).mean()
        df['macd'] = exp1 - exp2
        df['signal'] = df['macd'].ewm(span=self.cfg['signal'], adjust=False).mean()
        
        # ATR (for dynamic stop loss)
        tr1 = df['high'] - df['low']
        tr2 = abs(df['high'] - df['close'].shift())
        tr3 = abs(df['low'] - df['close'].shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df['atr'] = tr.ewm(span=self.cfg['atr_period'], adjust=False).mean()
        return df.dropna()

    def run_backtest(self):
        df = self._load_data()
        df = self._calculate_indicators(df)

        position: Optional[str] = None
        entry_price = 0.0
        stop_loss_price = 0.0
        take_profit_price = 0.0
        position_size = 0.0
        consecutive_losses = 0

        self.equity_curve = [self.cfg['capital']]

        for i in range(1, len(df)):
            current_equity = self.risk_manager.account_balance
            
            # --- SAFETY MONITOR CHECKS (Integrated) ---
            # 1. Max Drawdown Check
            drawdown = (self.risk_manager.peak_balance - current_equity) / self.risk_manager.peak_balance
            if drawdown > self.cfg['max_drawdown_allowed']:
                break # Halt trading

            # 2. Max Consecutive Losses Check
            if consecutive_losses >= self.cfg['max_consecutive_losses']:
                break # Halt trading

            # --- POSITION MANAGEMENT ---
            if position == 'LONG':
                if df['close'].iloc[i] <= stop_loss_price or df['close'].iloc[i] >= take_profit_price:
                    exit_price = stop_loss_price if df['close'].iloc[i] <= stop_loss_price else take_profit_price
                    pnl = (exit_price - entry_price) * position_size - (self.cfg['fee'] * position_size * entry_price)
                    self.risk_manager.update_account_balance(current_equity + pnl)
                    self.trades.append({"entry": entry_price, "exit": exit_price, "pnl": pnl})
                    consecutive_losses = consecutive_losses + 1 if pnl < 0 else 0
                    position = None

            elif position == 'SHORT':
                if df['close'].iloc[i] >= stop_loss_price or df['close'].iloc[i] <= take_profit_price:
                    exit_price = stop_loss_price if df['close'].iloc[i] >= stop_loss_price else take_profit_price
                    pnl = (entry_price - exit_price) * position_size - (self.cfg['fee'] * position_size * entry_price)
                    self.risk_manager.update_account_balance(current_equity + pnl)
                    self.trades.append({"entry": entry_price, "exit": exit_price, "pnl": pnl})
                    consecutive_losses = consecutive_losses + 1 if pnl < 0 else 0
                    position = None

            # --- SIGNAL GENERATION & TRADE EXECUTION ---
            if position is None:
                is_buy_signal = df['macd'].iloc[i-1] < df['signal'].iloc[i-1] and df['macd'].iloc[i] > df['signal'].iloc[i]
                is_sell_signal = df['macd'].iloc[i-1] > df['signal'].iloc[i-1] and df['macd'].iloc[i] < df['signal'].iloc[i]
                
                entry_price = df['close'].iloc[i]
                stop_loss_distance = df['atr'].iloc[i] * self.cfg['atr_multiplier']
                
                if is_buy_signal:
                    stop_loss_price = entry_price - stop_loss_distance
                    sizing = self.risk_manager.calculate_position_size(entry_price, stop_loss_price)
                    if sizing.get("position_size", 0) > 0:
                        position = 'LONG'
                        position_size = sizing["position_size"]
                        take_profit_price = entry_price + (self.cfg['risk_reward_ratio'] * stop_loss_distance)
                
                elif is_sell_signal:
                    stop_loss_price = entry_price + stop_loss_distance
                    sizing = self.risk_manager.calculate_position_size(entry_price, stop_loss_price)
                    if sizing.get("position_size", 0) > 0:
                        position = 'SHORT'
                        position_size = sizing["position_size"]
                        take_profit_price = entry_price - (self.cfg['risk_reward_ratio'] * stop_loss_distance)

            self.equity_curve.append(self.risk_manager.account_balance)
        
        self._generate_results(pd.Series(self.equity_curve, index=df.index[:len(self.equity_curve)]))

    def _generate_results(self, equity_series: pd.Series):
        final_equity = equity_series.iloc[-1]
        total_return = (final_equity / self.cfg['capital']) - 1
        
        trade_df = pd.DataFrame(self.trades)
        wins = trade_df[trade_df['pnl'] > 0]
        losses = trade_df[trade_df['pnl'] < 0]

        summary = {
            "final_equity": final_equity,
            "total_return_pct": total_return,
            "n_trades": len(trade_df),
            "wins": len(wins),
            "win_rate": len(wins) / len(trade_df) if len(trade_df) > 0 else 0,
            "avg_win": wins['pnl'].mean() if len(wins) > 0 else 0,
            "avg_loss": losses['pnl'].mean() if len(losses) > 0 else 0,
            "profit_factor": wins['pnl'].sum() / abs(losses['pnl'].sum()) if abs(losses['pnl'].sum()) > 0 else 0,
            "max_consecutive_losses": 0, # Placeholder, more complex to track
            "max_drawdown": (equity_series.cummax() - equity_series).max() / equity_series.cummax().max(),
            "sharpe": 0, # Placeholder
        }
        
        print("---SUMMARY_JSON---")
        print(json.dumps(summary, indent=4))
        print("---EQUITY_CSV---")
        equity_df = equity_series.to_frame(name='equity')
        equity_df.index = equity_df.index.map(pd.Timestamp.isoformat)
        print(equity_df.to_csv())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Advanced MACD Trading Bot")
    parser.add_argument("--mode", type=str, default="backtest", help="Operation mode")
    args = parser.parse_args()

    bot = AdvancedMacdBot(DEFAULT_CFG)
    if args.mode == 'backtest':
        bot.run_backtest()
`;
