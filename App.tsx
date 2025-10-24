

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { PortfolioHistory, Asset, Position, TradeViewData, AnalysisResult, BacktestResult, ClosedTrade, UserSubmission, Notification, Order } from './types';
// FIX: Import `DEFAULT_SCRIPT` to resolve "Cannot find name 'DEFAULT_SCRIPT'" error.
import { MOCK_PORTFOLIO_HISTORY, MOCK_ASSETS, MOCK_POSITIONS, MOCK_TRADE_VIEW_DATA, MOCK_INITIAL_ORDERBOOK, DEFAULT_SCRIPT } from './constants';
import { DashboardIcon, WalletIcon, SettingsIcon, TradeIcon, UserIcon, CheckCircleIcon, ArrowTrendingUpIcon, ChartBarIcon, SparklesIcon, LoadingIcon, PlayIcon, StopIcon, RocketIcon, CloseIcon, LightBulbIcon, InfoIcon, ProfitIcon, LossIcon, HistoryIcon, AboutIcon, ContactIcon, AdminIcon, ExclamationTriangleIcon, BellIcon, ExternalLinkIcon, ShieldCheckIcon, LinkIcon, WandSparklesIcon, SpeakerWaveIcon } from './components/icons';
import RecommendationsPanel from './components/RecommendationsPanel';
import BacktestResults from './components/BacktestResults';
import CodeViewer from './components/CodeViewer';
import { analyzeCode, runBacktest, generateEnhancedCode, getTradingSuggestion, generateLiveBotScript, formatCode } from './services/geminiService';
import { createWebSocketManager } from './services/websocketService';
import { APIProvider, useAPI } from './contexts/APIContext';
import { verifyAndFetchBalances, fetchPositions, executeLiveTrade, closeLivePosition } from './services/bybitService';
import DashboardHeader from './components/DashboardHeader';
import { playSound, AVAILABLE_SOUNDS } from './services/soundService';


// @ts-ignore - Chart is loaded from a script tag in index.html
const Chart = window.Chart;

// Custom Type for this file
export interface ActivityLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'profit' | 'loss' | 'trade';
}

// ============================================================================
// REUSABLE UI COMPONENTS
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{ children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; type?: 'button' | 'submit' | 'reset'; variant?: 'primary' | 'secondary'; className?: string; disabled?: boolean; }> = ({ children, onClick, type = 'button', variant = 'secondary', className = '', disabled = false }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variant === 'primary'
    ? 'bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-500'
    : 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500';
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses} ${className}`}>{children}</button>;
};

const Input: React.FC<{ label: string; id?: string; type?: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string, leadingAddon?: string; disabled?: boolean; name?: string; step?: string; min?: string; }> = ({ label, id, type = "text", value, onChange, placeholder, leadingAddon, disabled = false, name, step, min }) => {
    const inputId = id || name || label.toLowerCase().replace(/\s+/g, '-');
    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <div className="relative">
                 {leadingAddon && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-400 sm:text-sm">{leadingAddon}</span>
                    </div>
                )}
                <input
                    id={inputId}
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    step={step}
                    min={min}
                    className={`w-full bg-gray-700 border border-gray-600 rounded-md py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${leadingAddon ? 'pl-7' : 'px-3'} disabled:bg-gray-800 disabled:cursor-not-allowed`}
                />
            </div>
        </div>
    );
};

const Textarea: React.FC<{ label: string; id?: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; rows?: number; name?: string; }> = ({ label, id, value, onChange, placeholder, rows = 4, name }) => {
    const textareaId = id || name || label.toLowerCase().replace(/\s+/g, '-');
    return (
        <div>
            <label htmlFor={textareaId} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <textarea
                id={textareaId}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
            />
        </div>
    );
};

const ToggleSwitch: React.FC<{
  label: string;
  id?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}> = ({ label, id, enabled, onChange, disabled = false }) => {
    const switchId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex items-center justify-between py-2">
        <label htmlFor={switchId} className={`font-medium ${disabled ? 'text-gray-500' : 'text-gray-300'} flex-grow cursor-pointer`}>
            {label}
        </label>
        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => !disabled && onChange(!enabled)}
          disabled={disabled}
          className={`${
            enabled ? 'bg-cyan-500' : 'bg-gray-600'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ml-4`}
        >
          <span
            aria-hidden="true"
            className={`${
              enabled ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
  );
};

// ============================================================================
// VIEW SUB-COMPONENTS
// ============================================================================

interface AIStatusPanelProps {
    realizedPnl: number;
    activityLog: ActivityLogEntry[];
    onGetSuggestion: () => Promise<void>;
    aiSuggestion: { suggestion: string, isLoading: boolean, error: string | null };
}

const AIStatusPanel: React.FC<AIStatusPanelProps> = ({ realizedPnl, activityLog, onGetSuggestion, aiSuggestion }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [activityLog]);

    const getIconForType = (type: ActivityLogEntry['type']) => {
        switch (type) {
            case 'profit': return <ProfitIcon className="w-4 h-4 text-green-400" />;
            case 'loss': return <LossIcon className="w-4 h-4 text-red-400" />;
            case 'trade': return <TradeIcon className="w-4 h-4 text-cyan-400" />;
            case 'info':
            default: return <InfoIcon className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <Card className="flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700 flex-shrink-0">AI Assisted Trading</h3>
            <div className="p-4 space-y-4 flex-shrink-0">
                <div>
                    <p className="text-sm text-gray-400">Session Realized PnL</p>
                    <p className={`text-2xl font-bold ${realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                         {realizedPnl >= 0 ? '+' : '-'}${Math.abs(realizedPnl).toFixed(2)}
                    </p>
                </div>
                 <p className="text-xs text-gray-400">This panel tracks manual trades, AI suggestions, and live bot activity.</p>
            </div>
            <div className="px-4 pb-4 space-y-3">
                 <Button onClick={onGetSuggestion} disabled={aiSuggestion.isLoading} className="w-full !py-2.5 flex items-center justify-center">
                     {aiSuggestion.isLoading ? <LoadingIcon className="w-5 h-5"/> : <LightBulbIcon />}
                    <span className="ml-2">Get AI Suggestion</span>
                 </Button>
                {aiSuggestion.suggestion && !aiSuggestion.isLoading && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-sm text-cyan-200">{aiSuggestion.suggestion}</p>
                    </div>
                )}
                 {aiSuggestion.error && !aiSuggestion.isLoading && (
                    <div className="bg-red-900/50 p-3 rounded-lg">
                        <p className="text-sm text-red-300">{aiSuggestion.error}</p>
                    </div>
                )}
            </div>

            <div className="flex-grow p-4 pt-0 flex flex-col min-h-0">
                <h4 className="text-md font-semibold text-gray-300 mb-2 flex-shrink-0">Activity Log</h4>
                <div ref={logContainerRef} className="flex-grow bg-gray-900/70 rounded-md p-2 space-y-2 overflow-y-auto">
                    {activityLog.length > 0 ? activityLog.map((log, index) => (
                        <div key={index} className="flex items-start text-xs">
                            <div className="flex-shrink-0 mt-0.5">{getIconForType(log.type)}</div>
                            <div className="ml-2">
                                <span className="text-gray-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className="text-gray-300">{log.message}</span>
                            </div>
                        </div>
                    )) : <p className="text-center text-sm text-gray-500 pt-8">Connect to an exchange to begin trading.</p>}
                </div>
            </div>
        </Card>
    );
};

const PillButton: React.FC<{ onClick: () => void, isActive: boolean, children: React.ReactNode }> = ({ onClick, isActive, children }) => (
    <button onClick={onClick} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${isActive ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        {children}
    </button>
);

const OrderBook: React.FC<{ bids: Order[]; asks: Order[]; }> = ({ bids, asks }) => {
    const allQuantities = [...bids.map(o => o.quantity), ...asks.map(o => o.quantity)];
    const maxQuantity = allQuantities.length > 0 ? Math.max(...allQuantities) : 0;

    const OrderColumn: React.FC<{ orders: Order[]; type: 'bid' | 'ask'; }> = ({ orders, type }) => (
        <div>
            <div className="flex justify-between text-xs text-gray-500 px-2 mb-1">
                <span>Price (USD)</span>
                <span>Quantity</span>
            </div>
            <div className="space-y-0.5">
                {orders.map((order, i) => (
                    <div key={i} className="relative flex justify-between text-xs font-mono px-2 py-0.5 hover:bg-gray-700/50 cursor-pointer">
                        <div
                            className={`absolute top-0 bottom-0 ${type === 'bid' ? 'right-0 bg-green-500/15' : 'left-0 bg-red-500/15'}`}
                            style={{ width: `${maxQuantity > 0 ? (order.quantity / maxQuantity) * 100 : 0}%` }}
                        />
                        <span className={type === 'bid' ? 'text-green-400' : 'text-red-400'}>{order.price.toFixed(2)}</span>
                        <span className="text-gray-300">{order.quantity.toFixed(4)}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // Sort asks ascending (lowest price first) to correctly display the order book.
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
    // Sort bids descending (highest price first).
    const sortedBids = [...bids].sort((a, b) => b.price - a.price);

    // Calculate the spread between the best bid and best ask.
    const bestBid = sortedBids.length > 0 ? sortedBids[0].price : 0;
    const bestAsk = sortedAsks.length > 0 ? sortedAsks[0].price : 0;
    const spread = (bestAsk > 0 && bestBid > 0) ? bestAsk - bestBid : 0;

    return (
        <Card className="p-0 flex-grow flex flex-col min-h-0">
             {/* Header now includes an explicit spread display. */}
            <div className="flex justify-between items-center p-3 border-b border-gray-700 flex-shrink-0">
                <h3 className="text-md font-semibold text-white">Order Book</h3>
                 {spread > 0 && (
                    <div className="text-right">
                        <span className="text-xs text-gray-400">Spread</span>
                        <p className="text-sm font-mono text-white">{spread.toFixed(2)}</p>
                    </div>
                 )}
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-2 overflow-y-auto">
                <OrderColumn orders={sortedBids.slice(0, 15)} type="bid" />
                 {/* Reverse the asks so the best price (lowest) is at the bottom, near the bids */}
                <OrderColumn orders={sortedAsks.slice(0, 15).reverse()} type="ask" />
            </div>
        </Card>
    );
};


const NotificationPopup: React.FC<{ notification: Notification; onDismiss: (id: number) => void; }> = ({ notification, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification, onDismiss]);

    const colors = {
        success: 'bg-green-500 border-green-600',
        error: 'bg-red-500 border-red-600',
        info: 'bg-cyan-500 border-cyan-600',
    };

    return (
        <div className={`fixed bottom-5 right-5 w-full max-w-sm rounded-lg shadow-lg text-white ${colors[notification.type]} border-l-4`}>
            <div className="p-4 flex items-center">
                <div className="flex-shrink-0">{notification.icon}</div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                    <button onClick={() => onDismiss(notification.id)} className="inline-flex rounded-md p-1.5 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// FULL-PAGE VIEW COMPONENTS
// ============================================================================

interface DashboardViewProps {
    history: PortfolioHistory;
    positions: Position[];
    realizedPnl: number;
    assets: Asset[];
    totalEquity: number;
    onManualClosePosition: (position: Position) => void;
    activityLog: ActivityLogEntry[];
    onGetSuggestion: () => Promise<void>;
    aiSuggestion: { suggestion: string; isLoading: boolean; error: string | null; };
}

const DashboardView: React.FC<DashboardViewProps> = ({ history, positions, realizedPnl, assets, totalEquity, onManualClosePosition, ...aiStatusPanelProps }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);

    const openPnl = positions.reduce((acc, pos) => acc + pos.pnl, 0);

    useEffect(() => {
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) chartInstance.current.destroy();

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.timestamps.map(t => new Date(t).toLocaleDateString()),
                datasets: [{
                    label: 'Portfolio Value',
                    data: history.equity,
                    borderColor: 'rgb(34, 211, 238)',
                    backgroundColor: 'rgba(34, 211, 238, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
        return () => chartInstance.current?.destroy();
    }, [history]);

    return (
        <div className="p-6 flex gap-6 h-full">
            <div className="w-2/3 flex flex-col gap-6">
                <Card className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-400">Total Portfolio Value</p>
                            <p className="text-4xl font-bold text-white">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`text-right ${openPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            <p className="font-semibold">{openPnl >= 0 ? '+' : ''}{openPnl.toFixed(2)}</p>
                            <p className="text-sm">Unrealized PnL</p>
                        </div>
                    </div>
                    <div className="h-48 mt-4">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </Card>

                <Card className="flex-grow flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700 flex-shrink-0">Open Positions</h3>
                    <div className="flex-grow overflow-y-auto">
                        <div className="divide-y divide-gray-700">
                            {positions.length > 0 ? positions.map(pos => (
                                <div key={pos.id} className="p-4 flex justify-between items-center hover:bg-gray-800 transition-colors">
                                <div className="flex-1 grid grid-cols-5 items-center gap-4">
                                        <div className="col-span-2">
                                            <p className="font-bold">{pos.asset} <span className={`text-xs font-semibold ${pos.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{pos.direction}</span></p>
                                            <p className="text-sm text-gray-400">Entry: ${pos.entryPrice.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Size</p>
                                            <p className="font-semibold">{pos.size.toFixed(4)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">PnL</p>
                                            <p className={`font-semibold ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {pos.pnl >= 0 ? '+' : '-'}${Math.abs(pos.pnl).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Button onClick={() => onManualClosePosition(pos)} className="!py-1.5 !px-3 text-sm">Close</Button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 py-8">No open positions.</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
            <div className="w-1/3 flex flex-col gap-6">
                <Card className="p-6 flex flex-col justify-center flex-shrink-0">
                    <p className="text-sm text-gray-400">Total Realized PnL</p>
                    <p className={`text-4xl font-bold ${realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {realizedPnl >= 0 ? '+' : '-'}${Math.abs(realizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Cumulative profit/loss from all closed trades in this session.</p>
                </Card>
                <div className="flex-grow min-h-0">
                     <AIStatusPanel {...aiStatusPanelProps} realizedPnl={realizedPnl} />
                </div>
            </div>
        </div>
    );
};

interface TradeViewProps {
    tradeViewData: TradeViewData;
    onExecuteTrade: (details: { 
        asset: string, 
        direction: 'LONG' | 'SHORT', 
        amountUSD: number, 
        orderType: 'Market' | 'Limit', 
        limitPrice?: string,
        takeProfit?: { type: 'Price' | 'Percentage', value: string }
    }) => void;
    isConnected: boolean;
    market: string;
    setMarket: (market: string) => void;
    liveOrderBook: { bids: Order[], asks: Order[] };
    liveTickerPrice: number | null;
    addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const TradeView: React.FC<TradeViewProps> = ({ tradeViewData, onExecuteTrade, isConnected, market, setMarket, liveOrderBook, liveTickerPrice, addNotification }) => {
    const { tradeMethod, soundAlertsEnabled, priceAlertThreshold, selectedAlertSound } = useAPI();
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);
    const candleFrequencies = ['5m', '15m', '1h', '4h'];
    const [candleFrequency, setCandleFrequency] = useState(candleFrequencies[1]);
    const marketData = tradeViewData[market]?.[candleFrequency];
    const [tradeAmount, setTradeAmount] = useState('100');
    const [limitPrice, setLimitPrice] = useState('');
    const [tpType, setTpType] = useState<'Price' | 'Percentage'>('Price');
    const [tpValue, setTpValue] = useState('');
    const [isTrading, setIsTrading] = useState(false);
    
    // Refs for price alert logic
    const priceHistory = useRef<{price: number, time: number}[]>([]);
    const lastAlertTimestamp = useRef<number>(0);
    const ALERT_COOLDOWN = 60 * 1000; // 1 minute
    const PRICE_HISTORY_WINDOW = 30 * 1000; // 30 seconds

    useEffect(() => {
        // Reset price history when market changes
        priceHistory.current = [];
        lastAlertTimestamp.current = 0;
    }, [market]);

    // Effect for handling price movement alerts
    useEffect(() => {
        if (!liveTickerPrice || !soundAlertsEnabled) return;
        
        const now = Date.now();
        
        // Check cooldown
        if (now - lastAlertTimestamp.current < ALERT_COOLDOWN) {
            return;
        }

        // Add current price to history
        priceHistory.current.push({ price: liveTickerPrice, time: now });
        
        // Filter out old prices
        priceHistory.current = priceHistory.current.filter(p => now - p.time <= PRICE_HISTORY_WINDOW);
        
        if (priceHistory.current.length < 5) return; // Need a few data points to measure

        const pricesInWindow = priceHistory.current.map(p => p.price);
        const minPrice = Math.min(...pricesInWindow);
        const maxPrice = Math.max(...pricesInWindow);
        
        if (minPrice > 0) {
            const pctChange = ((maxPrice - minPrice) / minPrice) * 100;

            if (pctChange >= priceAlertThreshold) {
                const message = `${market} price moved ${pctChange.toFixed(2)}% in the last 30 seconds.`;
                addNotification(message, 'info');
                playSound(selectedAlertSound);
                lastAlertTimestamp.current = now; // Set cooldown
                priceHistory.current = []; // Clear history to prevent immediate re-trigger
            }
        }

    }, [liveTickerPrice, soundAlertsEnabled, priceAlertThreshold, selectedAlertSound, addNotification, market]);

    // Chart initialization and setup
    useEffect(() => {
        if (!chartRef.current || !marketData) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const movingAveragePeriod = 20;
        const calculateEMA = (data: number[], period: number): (number | null)[] => {
            if (data.length < period) return Array(data.length).fill(null);
            const multiplier = 2 / (period + 1);
            const ema: (number | null)[] = Array(data.length).fill(null);
            let sum = 0;
            for (let i = 0; i < period; i++) sum += data[i];
            ema[period - 1] = sum / period;
            for (let i = period; i < data.length; i++) {
                ema[i] = (data[i] - (ema[i - 1] as number)) * multiplier + (ema[i - 1] as number);
            }
            return ema;
        };
        
        const closePrices = marketData.map(d => d.close);
        const emaData = calculateEMA(closePrices, movingAveragePeriod);

        chartInstance.current = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [
                    {
                        label: `${market} Price`,
                        data: marketData.map(d => ({
                            x: new Date(d.time).valueOf(),
                            o: d.open,
                            h: d.high,
                            l: d.low,
                            c: d.close,
                        })),
                    },
                    {
                        type: 'line',
                        label: `EMA(${movingAveragePeriod})`,
                        data: emaData.map((value, index) => value === null ? null : {
                            x: new Date(marketData[index].time).valueOf(),
                            y: value
                        }).filter(p => p !== null),
                        borderColor: 'rgba(251, 146, 60, 0.7)', // Orange
                        borderWidth: 1,
                        pointRadius: 0,
                        tension: 0.1,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            tooltipFormat: 'PPpp',
                        },
                        ticks: { color: '#9ca3af', maxTicksLimit: 8 },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        position: 'right',
                        ticks: { color: '#9ca3af', callback: (value: any) => `$${Number(value).toLocaleString()}` },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#d1d5db'
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                        },
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x',
                        }
                    }
                }
            }
        });
        return () => chartInstance.current?.destroy();
    }, [marketData, market]);


    const handleTrade = async (direction: 'LONG' | 'SHORT') => {
        setIsTrading(true);
        try {
            await onExecuteTrade({
                asset: market,
                direction,
                amountUSD: parseFloat(tradeAmount),
                orderType: tradeMethod,
                limitPrice: limitPrice,
                takeProfit: {
                    type: tpType,
                    value: tpValue,
                }
            });
        } finally {
            setIsTrading(false);
        }
    };
    
    const latestPrice = marketData?.[marketData.length - 1]?.close ?? 0;
    const currentPrice = liveTickerPrice ?? latestPrice;

    return (
        <div className="p-6 flex gap-6 h-full">
            <div className="w-2/3 flex flex-col gap-6">
                <Card className="flex-grow flex flex-col min-h-0">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                        <div>
                             <h3 className="text-xl font-bold text-white">{market}</h3>
                             <p className={`text-lg font-mono ${liveTickerPrice ? 'text-cyan-400' : 'text-gray-400'}`}>{currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="flex space-x-2">
                             {Object.keys(tradeViewData).map(m => <PillButton key={m} onClick={() => setMarket(m)} isActive={market === m}>{m}</PillButton>)}
                        </div>
                         <div className="flex space-x-2">
                             {candleFrequencies.map(cf => <PillButton key={cf} onClick={() => setCandleFrequency(cf)} isActive={candleFrequency === cf}>{cf}</PillButton>)}
                        </div>
                    </div>
                    <div className="flex-grow p-4 relative min-h-[300px]">
                         <canvas ref={chartRef}></canvas>
                    </div>
                </Card>
                <div className="h-1/3 flex-grow min-h-[200px]">
                   <OrderBook bids={liveOrderBook.bids} asks={liveOrderBook.asks} />
                </div>
            </div>

            <div className="w-1/3 flex flex-col gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Manual Trade</h3>
                     <div className="space-y-4">
                        <Input 
                            label="Amount (USD)"
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(e.target.value)}
                            type="number"
                            leadingAddon="$"
                            disabled={!isConnected}
                         />
                        {tradeMethod === 'Limit' && (
                             <Input 
                                label="Limit Price (USD)"
                                value={limitPrice}
                                onChange={(e) => setLimitPrice(e.target.value)}
                                type="number"
                                disabled={!isConnected}
                             />
                        )}
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <Input
                                    label="Take Profit"
                                    value={tpValue}
                                    onChange={(e) => setTpValue(e.target.value)}
                                    type="number"
                                    leadingAddon={tpType === 'Price' ? '$' : '%'}
                                    disabled={!isConnected}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex-shrink-0 mb-px">
                                <div className="flex rounded-md shadow-sm -space-x-px" role="group">
                                    <button
                                        type="button"
                                        onClick={() => setTpType('Price')}
                                        className={`px-3 py-2 text-xs font-medium ${tpType === 'Price' ? 'bg-cyan-600 text-white ring-1 ring-inset ring-cyan-500' : 'bg-gray-600 text-gray-300'} rounded-l-md hover:bg-cyan-700 focus:z-10`}
                                    >
                                        Price
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTpType('Percentage')}
                                        className={`px-3 py-2 text-xs font-medium ${tpType === 'Percentage' ? 'bg-cyan-600 text-white ring-1 ring-inset ring-cyan-500' : 'bg-gray-600 text-gray-300'} rounded-r-md hover:bg-cyan-700 focus:z-10`}
                                    >
                                        Percent
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <Button 
                                onClick={() => handleTrade('LONG')}
                                disabled={!isConnected || isTrading}
                                className="!py-3 !bg-green-600 hover:!bg-green-700 focus:!ring-green-500"
                            >
                                LONG
                            </Button>
                            <Button 
                                onClick={() => handleTrade('SHORT')}
                                disabled={!isConnected || isTrading}
                                className="!py-3 !bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
                            >
                                SHORT
                            </Button>
                        </div>
                         {!isConnected && <p className="text-xs text-center text-yellow-400">Connect to an exchange in Settings to trade.</p>}
                     </div>
                </Card>
                <Card className="p-6 flex-grow">
                     <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
                     <p className="text-center text-gray-500 pt-8">Feature coming soon.</p>
                </Card>
            </div>
        </div>
    );
};

interface StrategyViewProps {
    strategyState: {
        originalCode: string;
        enhancedCode: string;
        analysis: AnalysisResult | null;
        appliedRecommendations: Set<string>;
        backtestResult: BacktestResult | null;
    };
    setStrategyState: React.Dispatch<React.SetStateAction<StrategyViewProps['strategyState']>>;
    onGenerateScript: () => void;
    isGenerating: boolean;
    onRunBacktest: () => void;
    isBacktestRunning: boolean;
    onExportScript: () => void;
    isExporting: boolean;
    onFormatCode: () => void;
    isFormatting: boolean;
}

const StrategyView: React.FC<StrategyViewProps> = ({ 
    strategyState, 
    setStrategyState, 
    onGenerateScript, 
    isGenerating, 
    onRunBacktest, 
    isBacktestRunning, 
    onExportScript, 
    isExporting,
    onFormatCode,
    isFormatting,
 }) => {
    
    const handleToggleRecommendation = (title: string) => {
        setStrategyState(prevState => {
            const newSet = new Set(prevState.appliedRecommendations);
            if (newSet.has(title)) {
                newSet.delete(title);
            } else {
                newSet.add(title);
            }
            return { ...prevState, appliedRecommendations: newSet };
        });
    };
    
    const handleEnhancedCodeChange = (newCode: string) => {
      setStrategyState(prevState => ({ ...prevState, enhancedCode: newCode }));
    };

    return (
        <div className="p-6 flex gap-6 h-full">
            <div className="w-1/3 flex flex-col gap-6">
                {strategyState.analysis && (
                    <RecommendationsPanel
                        analysis={strategyState.analysis}
                        appliedRecommendations={strategyState.appliedRecommendations}
                        onToggleRecommendation={handleToggleRecommendation}
                        onGenerateScript={onGenerateScript}
                        isGenerating={isGenerating}
                    />
                )}
            </div>
            <div className="w-2/3 flex flex-col gap-6">
                <div className="h-1/2 flex flex-col">
                    <CodeViewer
                        title="Original Script"
                        code={strategyState.originalCode}
                        readOnly={true}
                    />
                </div>
                <div className="h-1/2 flex flex-col">
                    <CodeViewer
                        title="Enhanced Script"
                        code={strategyState.enhancedCode}
                        onCodeChange={handleEnhancedCodeChange}
                        isLoading={isGenerating}
                        onRunBacktest={onRunBacktest}
                        isBacktestRunning={isBacktestRunning}
                        onExportScript={onExportScript}
                        isExporting={isExporting}
                        onFormatCode={onFormatCode}
                        isFormatting={isFormatting}
                    />
                </div>
            </div>
        </div>
    );
};


interface BacktestViewProps {
  backtestResult: BacktestResult | null;
  isBacktestRunning: boolean;
  backtestError: string | null;
}

const BacktestView: React.FC<BacktestViewProps> = ({ backtestResult, isBacktestRunning, backtestError }) => {
    return (
        <div className="p-6 h-full">
            <BacktestResults results={backtestResult} isLoading={isBacktestRunning} error={backtestError} />
        </div>
    );
}


interface SettingsViewProps {
    onConnect: (apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet') => Promise<void>;
    onDisconnect: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onConnect, onDisconnect }) => {
    const { 
        apiKey, setApiKey, 
        apiSecret, setApiSecret, 
        isConnected, 
        environment, setEnvironment, 
        tradeMethod, setTradeMethod,
        soundAlertsEnabled, setSoundAlertsEnabled,
        priceAlertThreshold, setPriceAlertThreshold,
        selectedAlertSound, setSelectedAlertSound
    } = useAPI();
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsConnecting(true);
        setConnectionError(null);
        try {
            await onConnect(apiKey, apiSecret, environment);
        } catch (error: any) {
            setConnectionError(error.message);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="p-6 h-full flex items-center justify-center">
             <div className="max-w-2xl w-full">
                 <Card>
                    <div className="p-6 border-b border-gray-700">
                        <h3 className="text-xl font-semibold text-white">Exchange Connection</h3>
                        <p className="text-gray-400 mt-1">Connect to your Bybit account to enable live trading and data feeds.</p>
                    </div>
                    <form onSubmit={handleConnect}>
                        <div className="p-6 space-y-4">
                           {connectionError && (
                             <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">
                                <p className="font-bold mb-1">Connection Failed</p>
                                {connectionError}
                             </div>
                           )}

                           {isConnected && (
                               <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-md text-sm flex items-center">
                                   <CheckCircleIcon className="w-5 h-5 mr-2" />
                                   Successfully connected to Bybit {environment}.
                               </div>
                           )}

                           <Input label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Your Bybit API Key" disabled={isConnected} />
                           <Input label="API Secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Your Bybit API Secret" disabled={isConnected} />
                           <ToggleSwitch
                              label="Use Testnet Environment"
                              enabled={environment === 'testnet'}
                              onChange={(enabled) => setEnvironment(enabled ? 'testnet' : 'mainnet')}
                              disabled={isConnected}
                           />
                           <p className="text-xs text-gray-500">Enable to connect to the Bybit testnet for risk-free testing. Requires separate testnet API keys.</p>
                        </div>
                        <div className="p-6 bg-gray-900/50 rounded-b-xl flex justify-end space-x-4">
                            {isConnected ? (
                                <Button onClick={onDisconnect} variant="secondary">Disconnect</Button>
                            ) : (
                                <Button type="submit" variant="primary" disabled={isConnecting || !apiKey || !apiSecret}>
                                    {isConnecting ? 'Connecting...' : 'Connect'}
                                </Button>
                            )}
                        </div>
                    </form>
                 </Card>
                 <Card className="mt-6">
                    <div className="p-6 border-b border-gray-700">
                        <h3 className="text-xl font-semibold text-white">Trading Preferences</h3>
                         <p className="text-gray-400 mt-1">Configure how manual trades are executed from the Trade view.</p>
                    </div>
                     <div className="p-6">
                         <ToggleSwitch
                            label="Default to Limit Orders"
                            enabled={tradeMethod === 'Limit'}
                            onChange={(enabled) => setTradeMethod(enabled ? 'Limit' : 'Market')}
                         />
                         <p className="text-xs text-gray-500">When enabled, the trade panel will default to placing Limit orders instead of Market orders.</p>
                     </div>
                 </Card>
                 <Card className="mt-6">
                    <div className="p-6 border-b border-gray-700">
                        <h3 className="text-xl font-semibold text-white">Notification Preferences</h3>
                        <p className="text-gray-400 mt-1">Configure sound alerts for market events and AI suggestions.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <ToggleSwitch
                            label="Enable Sound Alerts"
                            enabled={soundAlertsEnabled}
                            onChange={setSoundAlertsEnabled}
                        />
                        <Input
                            label="Price Movement Threshold (%)"
                            type="number"
                            value={priceAlertThreshold}
                            onChange={e => setPriceAlertThreshold(Math.max(0.1, parseFloat(e.target.value)))}
                            disabled={!soundAlertsEnabled}
                            step="0.1"
                            min="0.1"
                        />
                        <div>
                            <label htmlFor="alert-sound" className="block text-sm font-medium text-gray-400 mb-1">Alert Sound</label>
                            <div className="flex items-center space-x-2">
                                <select
                                    id="alert-sound"
                                    value={selectedAlertSound}
                                    onChange={e => setSelectedAlertSound(e.target.value)}
                                    disabled={!soundAlertsEnabled}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
                                >
                                    {AVAILABLE_SOUNDS.map(sound => (
                                        <option key={sound.url} value={sound.url}>{sound.name}</option>
                                    ))}
                                </select>
                                <Button onClick={() => playSound(selectedAlertSound)} disabled={!soundAlertsEnabled} className="!px-3 !py-2">
                                    <SpeakerWaveIcon />
                                </Button>
                            </div>
                        </div>
                    </div>
                 </Card>
            </div>
        </div>
    );
};



// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
    return (
        <APIProvider>
            <MainLayout />
        </APIProvider>
    );
}

const MainLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isConnected, setIsConnected, apiKey, apiSecret, environment, soundAlertsEnabled, selectedAlertSound } = useAPI();
  
  // State for Dashboard / Global data
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistory>(MOCK_PORTFOLIO_HISTORY);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalEquity, setTotalEquity] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [realizedPnl, setRealizedPnl] = useState(0);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextNotificationId = useRef(0);
  const seenPositionIds = useRef(new Set<string>());

  // State for Trade View
  const [tradeViewData, setTradeViewData] = useState<TradeViewData>(MOCK_TRADE_VIEW_DATA);
  const [liveOrderBook, setLiveOrderBook] = useState<{bids: Order[], asks: Order[] }>(MOCK_INITIAL_ORDERBOOK);
  const [liveTickerPrice, setLiveTickerPrice] = useState<number | null>(null);
  const [market, setMarket] = useState<string>('BTC/USD');

  // State for Strategy View
  const [strategyState, setStrategyState] = useState({
      originalCode: DEFAULT_SCRIPT,
      enhancedCode: '',
      analysis: null as AnalysisResult | null,
      appliedRecommendations: new Set<string>(),
      backtestResult: null as BacktestResult | null,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBacktestRunning, setIsBacktestRunning] = useState(false);
  const [backtestError, setBacktestError] = useState<string|null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  
  // State for AI Suggestions
  const [aiSuggestion, setAiSuggestion] = useState({ suggestion: '', isLoading: false, error: null as string | null });

  // WebSocket manager
  const wsManager = useRef<ReturnType<typeof createWebSocketManager> | null>(null);
  
  // FIX: Moved `useRef` to the top level of the component to follow the Rules of Hooks.
  // This ref is used to store previous positions to avoid re-triggering the effect unnecessarily.
  const prevPositionsRef = useRef<Position[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
      const icons = {
          success: <CheckCircleIcon className="h-6 w-6" />,
          error: <ExclamationTriangleIcon className="h-6 w-6" />,
          info: <InfoIcon className="h-6 w-6" />,
      };
      const id = nextNotificationId.current++;
      setNotifications(prev => [...prev, { id, message, type, icon: icons[type] }]);
      if(soundAlertsEnabled && type !== 'info') playSound(selectedAlertSound);
  }, [soundAlertsEnabled, selectedAlertSound]);

  const dismissNotification = (id: number) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const addActivityLog = useCallback((message: string, type: ActivityLogEntry['type']) => {
      setActivityLog(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
  }, []);

  // Effect to manage WebSocket connection
  useEffect(() => {
    if (isConnected) {
        if (wsManager.current) wsManager.current.disconnect();

        wsManager.current = createWebSocketManager(
            environment,
            (tickerData) => { // Ticker callback
                if (tickerData.symbol === market) {
                    setLiveTickerPrice(tickerData.price);
                }
            },
            (orderBookData) => { // Order book callback
                setLiveOrderBook(orderBookData);
            }
        );

        // Subscribe to relevant market data
        const symbolsToTrack = Object.keys(tradeViewData);
        wsManager.current.updateSubscriptions(symbolsToTrack, market);
        addActivityLog(`WebSocket connected to Bybit ${environment}.`, 'info');
    }

    return () => {
        if (wsManager.current) {
            wsManager.current.disconnect();
            wsManager.current = null;
        }
    };
  }, [isConnected, environment, addActivityLog]);

  // Effect to update WebSocket subscriptions when market changes
  useEffect(() => {
      if (wsManager.current && isConnected) {
          const symbolsToTrack = Object.keys(tradeViewData);
          wsManager.current.updateSubscriptions(symbolsToTrack, market);
          // Clear old data for new market
          setLiveOrderBook(MOCK_INITIAL_ORDERBOOK);
          setLiveTickerPrice(null);
      }
  }, [market, isConnected, tradeViewData]);


  // Effect for fetching initial account data and periodic updates
  useEffect(() => {
      let interval: number;

      const fetchAllData = async () => {
          if (!isConnected || !apiKey || !apiSecret) return;
          try {
              const [balanceData, newPositions] = await Promise.all([
                  verifyAndFetchBalances(apiKey, apiSecret, environment),
                  fetchPositions(apiKey, apiSecret, environment)
              ]);
              
              setAssets(balanceData.assets);
              setTotalEquity(balanceData.totalEquity);
              
              setPositions(prevPositions => {
                  const updatedPositions = [...newPositions];
                  // Carry over 'seen' status from previous state
                  updatedPositions.forEach(p => {
                      if (seenPositionIds.current.has(p.id)) {
                          p.seen = true;
                      }
                  });
                  return updatedPositions;
              });
          } catch (error: any) {
              console.error("Error fetching account data:", error);
              addNotification(error.message, 'error');
              setIsConnected(false); // Disconnect on critical fetch error
          }
      };

      if (isConnected) {
          fetchAllData();
          interval = window.setInterval(fetchAllData, 10000); // Poll every 10 seconds
      }

      return () => {
          if (interval) clearInterval(interval);
      };
  }, [isConnected, apiKey, apiSecret, environment, addNotification, setIsConnected]);

  // Effect to process position changes for notifications and logging
    useEffect(() => {
        const prevPositionMap = new Map<string, Position>();
        prevPositionsRef.current.forEach(p => prevPositionMap.set(p.id, p));

        const currentPositionMap = new Map<string, Position>();
        positions.forEach(p => currentPositionMap.set(p.id, p));

        // Check for new positions
        for (const [id, pos] of currentPositionMap.entries()) {
            if (!prevPositionMap.has(id)) {
                addNotification(`New ${pos.direction} position opened for ${pos.asset}.`, 'info');
                addActivityLog(`Opened ${pos.direction} ${pos.asset} at $${pos.entryPrice.toFixed(2)}`, 'trade');
                seenPositionIds.current.add(id);
            }
        }

        // Check for closed positions
        for (const [id, pos] of prevPositionMap.entries()) {
            if (!currentPositionMap.has(id)) {
                // To calculate PnL, we need a better mechanism, this is an approximation
                // A dedicated trade history endpoint would be better.
                addNotification(`Position for ${pos.asset} closed.`, 'info');
                addActivityLog(`Closed ${pos.direction} ${pos.asset}. PnL: $${pos.pnl.toFixed(2)}`, pos.pnl >= 0 ? 'profit' : 'loss');
                setRealizedPnl(prev => prev + pos.pnl);
                seenPositionIds.current.delete(id);
            }
        }
        
        // Update the ref for the next render
        prevPositionsRef.current = positions;

    }, [positions, addNotification, addActivityLog]);


  const handleConnect = async (apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet') => {
      try {
          const { assets: initialAssets, totalEquity: initialEquity } = await verifyAndFetchBalances(apiKey, apiSecret, environment);
          setAssets(initialAssets);
          setTotalEquity(initialEquity);
          setIsConnected(true);
          addNotification('Successfully connected to Bybit!', 'success');
          addActivityLog('Connected to Bybit API.', 'info');
      } catch (error: any) {
          addNotification(error.message, 'error');
          setIsConnected(false);
          // Re-throw to be caught in the SettingsView component
          throw error;
      }
  };

  const handleDisconnect = () => {
      setIsConnected(false);
      setAssets([]);
      setPositions([]);
      setRealizedPnl(0);
      setTotalEquity(0);
      setActivityLog([]);
      if (wsManager.current) {
          wsManager.current.disconnect();
          wsManager.current = null;
      }
      addNotification('Disconnected from Bybit.', 'info');
  };
  
  const handleManualClosePosition = async (position: Position) => {
    try {
        await closeLivePosition(position, apiKey, apiSecret, environment);
        addNotification(`Close order for ${position.asset} submitted.`, 'success');
    } catch (error: any) {
        addNotification(`Failed to close position: ${error.message}`, 'error');
    }
  };
  
  const handleExecuteTrade = async (details: { 
      asset: string, 
      direction: 'LONG' | 'SHORT', 
      amountUSD: number, 
      orderType: 'Market' | 'Limit', 
      limitPrice?: string,
      takeProfit?: { type: 'Price' | 'Percentage', value: string }
    }) => {
      try {
          await executeLiveTrade(details, apiKey, apiSecret, environment);
          addNotification(`${details.direction} order for ${details.asset} submitted.`, 'success');
          addActivityLog(`Submitted ${details.direction} order for ${details.amountUSD} USD of ${details.asset}`, 'trade');
      } catch (error: any) {
           addNotification(`Trade failed: ${error.message}`, 'error');
      }
  };

  const handleAnalyzeCode = async () => {
    try {
        const result = await analyzeCode(strategyState.originalCode);
        setStrategyState(prevState => ({
            ...prevState,
            analysis: result,
            // Automatically select all new recommendations
            appliedRecommendations: new Set(result.recommendations.map(r => r.title))
        }));
    } catch (error: any) {
        addNotification(`Code analysis failed: ${error.message}`, 'error');
    }
  };

  // Run analysis on initial load
  useEffect(() => {
    handleAnalyzeCode();
  }, []);

  const handleRunBacktest = async () => {
      setIsBacktestRunning(true);
      setBacktestError(null);
      try {
          const result = await runBacktest(strategyState.enhancedCode);
          setStrategyState(prevState => ({ ...prevState, backtestResult: result }));
          setCurrentView('backtest'); // Switch to backtest view on success
      } catch (error: any) {
          setBacktestError(error.message);
          setCurrentView('backtest'); // Switch to backtest view even on error
      } finally {
          setIsBacktestRunning(false);
      }
  };
  
  const handleGenerateEnhancedCode = async () => {
      if (!strategyState.analysis) return;
      setIsGenerating(true);
      try {
          const applied = strategyState.analysis.recommendations.filter(rec =>
              strategyState.appliedRecommendations.has(rec.title)
          );
          const newCode = await generateEnhancedCode(strategyState.originalCode, applied);
          setStrategyState(prevState => ({ ...prevState, enhancedCode: newCode }));
      } catch (error: any) {
          addNotification(`Failed to generate code: ${error.message}`, 'error');
      } finally {
          setIsGenerating(false);
      }
  };
  
  const handleFormatCode = async () => {
      if(!strategyState.enhancedCode) return;
      setIsFormatting(true);
      try {
          const formatted = await formatCode(strategyState.enhancedCode);
          setStrategyState(prevState => ({ ...prevState, enhancedCode: formatted }));
          addNotification('Code formatted successfully.', 'success');
      } catch (error: any) {
          addNotification(`Code formatting failed: ${error.message}`, 'error');
      } finally {
          setIsFormatting(false);
      }
  }

  const handleExportScript = async () => {
      if(!strategyState.enhancedCode) return;
      setIsExporting(true);
      try {
          const liveScript = await generateLiveBotScript(strategyState.enhancedCode);
          const blob = new Blob([liveScript], { type: 'text/x-python' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'live_trading_bot.py';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addNotification('Live script exported successfully!', 'success');
      } catch (error: any) {
           addNotification(`Failed to export script: ${error.message}`, 'error');
      } finally {
          setIsExporting(false);
      }
  };

  const handleGetAISuggestion = async () => {
      setAiSuggestion({ suggestion: '', isLoading: true, error: null });
      try {
          const context = `Current realized PnL is $${realizedPnl.toFixed(2)}. There are ${positions.length} open positions. The bot is ${isConnected ? 'connected' : 'not connected'}.`;
          const suggestion = await getTradingSuggestion(context);
          setAiSuggestion({ suggestion, isLoading: false, error: null });
          if (soundAlertsEnabled) playSound(selectedAlertSound);
      } catch (error: any) {
           const errorMessage = `Failed to get AI suggestion: ${error.message}`;
           addNotification(errorMessage, 'error');
           setAiSuggestion({ suggestion: '', isLoading: false, error: errorMessage });
      }
  };
  
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
                    history={portfolioHistory} 
                    positions={positions} 
                    realizedPnl={realizedPnl}
                    assets={assets}
                    totalEquity={totalEquity}
                    onManualClosePosition={handleManualClosePosition}
                    activityLog={activityLog}
                    onGetSuggestion={handleGetAISuggestion}
                    aiSuggestion={aiSuggestion}
                />;
      case 'trade':
        return <TradeView 
                    tradeViewData={tradeViewData}
                    onExecuteTrade={handleExecuteTrade}
                    isConnected={isConnected}
                    market={market}
                    setMarket={setMarket}
                    liveOrderBook={liveOrderBook}
                    liveTickerPrice={liveTickerPrice}
                    addNotification={addNotification}
                />;
      case 'strategy':
        return <StrategyView 
                    strategyState={strategyState}
                    setStrategyState={setStrategyState}
                    onGenerateScript={handleGenerateEnhancedCode}
                    isGenerating={isGenerating}
                    onRunBacktest={handleRunBacktest}
                    isBacktestRunning={isBacktestRunning}
                    onExportScript={handleExportScript}
                    isExporting={isExporting}
                    onFormatCode={handleFormatCode}
                    isFormatting={isFormatting}
                />;
      case 'backtest':
        return <BacktestView 
                    backtestResult={strategyState.backtestResult} 
                    isBacktestRunning={isBacktestRunning}
                    backtestError={backtestError}
                />;
      case 'settings':
        return <SettingsView onConnect={handleConnect} onDisconnect={handleDisconnect} />;
      default:
        return <DashboardView 
                    history={portfolioHistory} 
                    positions={positions} 
                    realizedPnl={realizedPnl}
                    assets={assets}
                    totalEquity={totalEquity}
                    onManualClosePosition={handleManualClosePosition}
                    activityLog={activityLog}
                    onGetSuggestion={handleGetAISuggestion}
                    aiSuggestion={aiSuggestion}
                />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          currentView={currentView}
          isConnected={isConnected}
          isBotSimulating={false} // Placeholder for future live bot state
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900">
          {renderView()}
        </main>
      </div>
      {notifications.map(notification => (
        <NotificationPopup key={notification.id} notification={notification} onDismiss={dismissNotification} />
      ))}
    </div>
  );
};

const Sidebar: React.FC<{
  currentView: string;
  setCurrentView: (view: string) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}> = ({ currentView, setCurrentView, isCollapsed, toggleSidebar }) => {
  const navItems = [
    { name: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { name: 'trade', icon: <TradeIcon />, label: 'Trade' },
    { name: 'strategy', icon: <SparklesIcon />, label: 'Strategy' },
    { name: 'backtest', icon: <ChartBarIcon />, label: 'Backtest' },
    { name: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <div className={`flex flex-col bg-gray-800 border-r border-gray-700 transition-width duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} h-16 border-b border-gray-700`}>
        <RocketIcon className="h-8 w-8 text-cyan-400" />
        {!isCollapsed && <span className="ml-2 text-xl font-bold text-white">Xamanix</span>}
      </div>
      <nav className="flex-grow px-2 py-4 space-y-2">
        {navItems.map(item => (
          <a
            key={item.name}
            href="#"
            onClick={(e) => { e.preventDefault(); setCurrentView(item.name); }}
            className={`flex items-center p-3 rounded-lg transition-colors ${
              currentView === item.name
                ? 'bg-cyan-500 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            {item.icon}
            {!isCollapsed && <span className="ml-4">{item.label}</span>}
          </a>
        ))}
      </nav>
      {/* Footer can go here */}
    </div>
  );
};


export default App;