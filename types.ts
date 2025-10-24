// FIX: Import React to make the React namespace available for types like React.ReactElement.
import React from 'react';

export interface Asset {
  name: string;
  total: number;
  available: number;
  inOrders: number;
  usdValue: number;
}

export interface Position {
  id: string;
  asset: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  openTimestamp: string;
  seen?: boolean;
}

export interface ClosedTrade {
  id: string;
  asset: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  openTimestamp: string;
  closeTimestamp: string;
}

export interface PortfolioHistory {
  timestamps: string[];
  equity: number[];
}

export interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export type PriceData = Candle[];

export interface TradeViewData {
    [market: string]: {
        [frequency: string]: PriceData;
    };
}


export interface AnalysisParameter {
  name: string;
  value: string;
  description: string;
}

export interface Recommendation {
  title: string;
  description:string;
  pythonCodeSnippet: string;
}

export interface AnalysisResult {
  parameters: AnalysisParameter[];
  recommendations: Recommendation[];
}

export interface BacktestSummary {
    final_equity: number;
    total_return_pct: number;
    n_trades: number;
    wins: number;
    win_rate: number;
    avg_win: number;
    avg_loss: number;
    profit_factor: number;
    max_consecutive_losses: number;
    max_drawdown: number;
    sharpe: number;
}

export interface BacktestResult {
    summary: BacktestSummary;
    equity_curve_csv: string;
    error?: string;
}

export interface UserSubmission {
  id: string;
  type: 'comment' | 'complaint';
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  icon: React.ReactElement;
}

export interface Order {
  price: number;
  quantity: number;
  total: number;
}