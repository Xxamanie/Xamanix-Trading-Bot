
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PortfolioHistory, Asset, Position, TradeViewData, AnalysisResult, BacktestResult, ClosedTrade, UserSubmission, Notification, Order } from './types';
import { MOCK_PORTFOLIO_HISTORY, MOCK_ASSETS, MOCK_POSITIONS, MOCK_TRADE_VIEW_DATA, DEFAULT_SCRIPT } from './constants';
import { DashboardIcon, WalletIcon, SettingsIcon, TradeIcon, UserIcon, CheckCircleIcon, ArrowTrendingUpIcon, ChartBarIcon, SparklesIcon, LoadingIcon, PlayIcon, StopIcon, RocketIcon, CloseIcon, LightBulbIcon, InfoIcon, ProfitIcon, LossIcon, HistoryIcon, AboutIcon, ContactIcon, AdminIcon, ExclamationTriangleIcon, BellIcon, ExternalLinkIcon, ShieldCheckIcon, LinkIcon } from './components/icons';
import RecommendationsPanel from './components/RecommendationsPanel';
import BacktestResults from './components/BacktestResults';
import CodeViewer from './components/CodeViewer';
import { analyzeCode, runBacktest, generateEnhancedCode, getTradingSuggestion, generateLiveBotScript } from './services/geminiService';
import { APIProvider, useAPI } from './contexts/APIContext';
import { verifyAndFetchBalances, fetchPositions, executeLiveTrade, closeLivePosition } from './services/bybitService';
import DashboardHeader from './components/DashboardHeader';


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

const Input: React.FC<{ label: string; id?: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string, leadingAddon?: string; disabled?: boolean; name?: string; }> = ({ label, id, type = "text", value, onChange, placeholder, leadingAddon, disabled = false, name }) => {
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
    const allTotals = [...bids.map(o => o.quantity), ...asks.map(o => o.quantity)];
    const maxTotal = allTotals.length > 0 ? Math.max(...allTotals) : 0;

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
                            style={{ width: `${maxTotal > 0 ? (order.quantity / maxTotal) * 100 : 0}%` }}
                        />
                        <span className={type === 'bid' ? 'text-green-400' : 'text-red-400'}>{order.price.toFixed(2)}</span>
                        <span className="text-gray-300">{order.quantity.toFixed(4)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const sortedAsks = [...asks].sort((a, b) => b.price - a.price);
    const sortedBids = [...bids].sort((a, b) => b.price - a.price);

    return (
        <Card className="p-0 flex-grow flex flex-col min-h-0">
            <h3 className="text-md font-semibold text-white p-3 border-b border-gray-700 flex-shrink-0">Order Book</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-2 overflow-y-auto">
                <OrderColumn orders={sortedBids.slice(0, 15)} type="bid" />
                <OrderColumn orders={sortedAsks.slice(0, 15)} type="ask" />
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
    onManualClosePosition: (position: Position) => void;
    activityLog: ActivityLogEntry[];
    onGetSuggestion: () => Promise<void>;
    aiSuggestion: { suggestion: string; isLoading: boolean; error: string | null; };
}

const DashboardView: React.FC<DashboardViewProps> = ({ history, positions, realizedPnl, assets, onManualClosePosition, ...aiStatusPanelProps }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);

    const totalAssetsValue = assets.find(a => a.name === 'USDT')?.usdValue ?? 0;
    const openPnl = positions.reduce((acc, pos) => acc + pos.pnl, 0);
    const totalValue = totalAssetsValue + openPnl;

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
                            <p className="text-4xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
  data: TradeViewData;
  onExecuteTrade: (details: { asset: string, direction: 'LONG' | 'SHORT', amountUSD: number, orderType: 'Market' | 'Limit', limitPrice?: string }) => void;
  isConnected: boolean;
}

const TradeView: React.FC<TradeViewProps> = ({ data, onExecuteTrade, isConnected }) => {
    const { tradeMethod } = useAPI();
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);
    const [market, setMarket] = useState(Object.keys(data)[0]);
    const [orderBook, setOrderBook] = useState<{bids: Order[], asks: Order[]}>({ bids: [], asks: [] });
    const candleFrequencies = ['5m', '15m', '1h', '4h'];
    const [candleFrequency, setCandleFrequency] = useState(candleFrequencies[1]);
    const marketData = data[market]?.[candleFrequency];
    const [tradeAmount, setTradeAmount] = useState('100');
    const [limitPrice, setLimitPrice] = useState('');
    const [isTrading, setIsTrading] = useState(false);

    useEffect(() => {
        if (!chartRef.current || !marketData) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const movingAveragePeriod = 20;
        const calculateEMA = (data: number[], period: number): (number | null)[] => {
            if (data.length < period) return Array(data.length).fill(null);
            const multiplier = 2 / (period + 1);
            const ema: (number | null)[] = Array(period - 1).fill(null);
            let previousEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
            ema.push(previousEma);
            for (let i = period; i < data.length; i++) {
                const newEma = (data[i] - previousEma) * multiplier + previousEma;
                ema.push(newEma);
                previousEma = newEma;
            }
            return ema;
        };
        const generateOrderBookData = (currentPrice: number, market: string): { bids: Order[]; asks: Order[] } => {
            const bids: Order[] = [];
            const asks: Order[] = [];
            const levels = 20;
            let priceStep = 0.5;
            if (market.includes('ETH')) priceStep = 0.25;
            if (market.includes('SOL')) priceStep = 0.05;
            if (market.includes('NGN')) priceStep = 0.00001;
            for (let i = 1; i <= levels; i++) {
                const askPrice = currentPrice + (i * priceStep * (1 + (Math.random() - 0.5) * 0.1));
                const askQuantity = Math.random() * (market.includes('BTC') ? 0.5 : 5);
                asks.push({ price: askPrice, quantity: askQuantity, total: askPrice * askQuantity });
                const bidPrice = currentPrice - (i * priceStep * (1 + (Math.random() - 0.5) * 0.1));
                const bidQuantity = Math.random() * (market.includes('BTC') ? 0.5 : 5);
                bids.push({ price: bidPrice, quantity: bidQuantity, total: bidPrice * bidQuantity });
            }
            return { bids, asks };
        };

        const initialPrices = [...marketData.prices];
        const initialEmaData = calculateEMA(initialPrices, movingAveragePeriod);
        if (initialPrices.length > 0) {
            const currentPrice = initialPrices[initialPrices.length - 1];
            setOrderBook(generateOrderBookData(currentPrice, market));
            if (!limitPrice) setLimitPrice(currentPrice.toFixed(2));
        }

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: marketData.timestamps.map(t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
                datasets: [
                    { label: 'Price', data: initialPrices, borderColor: 'rgb(34, 211, 238)', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: `EMA(${movingAveragePeriod})`, data: initialEmaData, borderColor: 'rgb(250, 204, 21)', borderWidth: 1.5, pointRadius: 0, borderDash: [5, 5], tension: 0.1 },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top', labels: { color: '#d1d5db' } } },
                scales: {
                    x: { ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { position: 'right', ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
        return () => chartInstance.current?.destroy();
    }, [marketData, market, limitPrice]);
    
    const handleTrade = async (direction: 'LONG' | 'SHORT') => {
        setIsTrading(true);
        try {
            await onExecuteTrade({
                asset: market,
                direction,
                amountUSD: parseFloat(tradeAmount),
                orderType: tradeMethod,
                limitPrice: tradeMethod === 'Limit' ? limitPrice : undefined,
            });
        } finally {
            setIsTrading(false);
        }
    };

    return (
        <div className="p-6 flex gap-6 h-full">
            <div className="w-2/3 flex flex-col gap-6">
                <Card className="flex-grow flex flex-col min-h-0">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center space-x-2">
                           {Object.keys(data).map(m => <PillButton key={m} onClick={() => setMarket(m)} isActive={market === m}>{m}</PillButton>)}
                        </div>
                        <div className="flex items-center space-x-1 bg-gray-900/50 rounded-md p-1">
                           {candleFrequencies.map(f => <button key={f} onClick={() => setCandleFrequency(f)} className={`px-2 py-1 text-xs rounded ${candleFrequency === f ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>{f}</button>)}
                        </div>
                    </div>
                    <div className="flex-grow p-4 relative"><canvas ref={chartRef}></canvas></div>
                </Card>
            </div>
            <div className="w-1/3 flex flex-col gap-6">
                <Card className="p-4 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Manual Trade</h3>
                    <Input label="Trade Amount" type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} leadingAddon="$" disabled={!isConnected || isTrading} />
                    {tradeMethod === 'Limit' && (
                        <Input label="Limit Price" type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} leadingAddon="$" disabled={!isConnected || isTrading} />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => handleTrade('LONG')} disabled={!isConnected || isTrading} className="!py-3 !bg-green-600 hover:!bg-green-700 disabled:!bg-green-600/50 flex items-center justify-center">
                            {isTrading ? <LoadingIcon /> : <ArrowTrendingUpIcon className="w-5 h-5"/>}<span className="ml-2">Long</span>
                        </Button>
                        <Button onClick={() => handleTrade('SHORT')} disabled={!isConnected || isTrading} className="!py-3 !bg-red-600 hover:!bg-red-700 disabled:!bg-red-600/50 flex items-center justify-center">
                            {isTrading ? <LoadingIcon /> : <ArrowTrendingUpIcon className="w-5 h-5 transform rotate-180"/>}<span className="ml-2">Short</span>
                        </Button>
                    </div>
                    {!isConnected && <p className="text-xs text-center text-yellow-400">Connect to an exchange in Settings to trade.</p>}
                </Card>
                <OrderBook bids={orderBook.bids} asks={orderBook.asks} />
            </div>
        </div>
    );
};

interface StrategyViewProps {
    isBotSimulating: boolean;
    onToggleBot: (active: boolean) => void;
    onAddNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}
const StrategyView: React.FC<StrategyViewProps> = ({ isBotSimulating, onToggleBot, onAddNotification }) => {
    const [originalCode, setOriginalCode] = useState<string>(DEFAULT_SCRIPT);
    const [enhancedCode, setEnhancedCode] = useState<string>('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
    const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState({ analysis: true, generation: false, backtest: false, export: false });
    const [error, setError] = useState({ analysis: null, backtest: null, export: null });
    
    useEffect(() => {
        handleAnalyze();
    }, []);

    const handleAnalyze = async () => {
        setIsLoading(prev => ({ ...prev, analysis: true }));
        setError(prev => ({...prev, analysis: null}));
        try {
            const result = await analyzeCode(originalCode);
            setAnalysis(result);
            setAppliedRecommendations(new Set(result.recommendations.map(r => r.title)));
        } catch (e: any) {
            setError(prev => ({...prev, analysis: e.message}));
            onAddNotification(`Analysis failed: ${e.message}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, analysis: false }));
        }
    };
    
    const handleGenerateScript = async () => {
        if (!analysis) return;
        setIsLoading(prev => ({ ...prev, generation: true }));
        setEnhancedCode('');
        try {
            const selectedRecs = analysis.recommendations.filter(r => appliedRecommendations.has(r.title));
            const code = await generateEnhancedCode(originalCode, selectedRecs);
            setEnhancedCode(code);
            onAddNotification('Enhanced script generated successfully!', 'success');
        } catch (e: any) {
            onAddNotification(`Script generation failed: ${e.message}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, generation: false }));
        }
    };
    
    const handleRunBacktest = async () => {
        setIsLoading(prev => ({ ...prev, backtest: true }));
        setBacktestResults(null);
        setError(prev => ({ ...prev, backtest: null }));
        try {
            const codeToTest = enhancedCode || originalCode;
            const results = await runBacktest(codeToTest);
            setBacktestResults(results);
            onAddNotification('Backtest completed!', 'success');
        } catch (e: any) {
            setError(prev => ({ ...prev, backtest: e.message }));
            onAddNotification(`Backtest failed: ${e.message}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, backtest: false }));
        }
    };

    const handleExportScript = async () => {
        setIsLoading(prev => ({ ...prev, export: true }));
        setError(prev => ({ ...prev, export: null }));
        try {
            const codeToExport = enhancedCode || originalCode;
            const liveScript = await generateLiveBotScript(codeToExport);
            
            const blob = new Blob([liveScript], { type: 'text/x-python;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'live_trading_bot.py';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            onAddNotification('Live bot script exported!', 'success');
        } catch (e: any) {
            setError(prev => ({ ...prev, export: e.message }));
            onAddNotification(`Export failed: ${e.message}`, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, export: false }));
        }
    };

    const toggleRecommendation = (title: string) => {
        setAppliedRecommendations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(title)) newSet.delete(title);
            else newSet.add(title);
            return newSet;
        });
    };
    
    return (
        <div className="p-6 grid grid-cols-3 gap-6 h-full">
            <div className="col-span-1 flex flex-col gap-6">
                {isLoading.analysis ? (
                    <Card className="flex items-center justify-center p-8 h-full"><LoadingIcon className="w-8 h-8" /></Card>
                ) : error.analysis || !analysis ? (
                    <Card className="flex flex-col items-center justify-center p-8 h-full text-center">
                        <ExclamationTriangleIcon className="w-10 h-10 text-red-400" />
                        <p className="mt-4 text-red-400">Failed to analyze script.</p>
                        <p className="text-xs text-gray-400 mt-1">{error.analysis}</p>
                        <Button onClick={handleAnalyze} className="mt-4">Retry Analysis</Button>
                    </Card>
                ) : (
                    <RecommendationsPanel
                        analysis={analysis}
                        appliedRecommendations={appliedRecommendations}
                        onToggleRecommendation={toggleRecommendation}
                        onGenerateScript={handleGenerateScript}
                        isGenerating={isLoading.generation}
                    />
                )}
            </div>
            <div className="col-span-2 flex flex-col gap-6">
                 <Card className="p-4 flex justify-between items-center">
                     <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-white">Strategy Deployment</h3>
                        <p className="text-sm text-gray-400">Simulate your enhanced strategy with live market data.</p>
                     </div>
                     {isBotSimulating ? (
                        <Button onClick={() => onToggleBot(false)} variant="secondary" className="!bg-red-600 hover:!bg-red-700 w-48 flex items-center justify-center">
                            <StopIcon /><span className="ml-2">Stop Deployment</span>
                        </Button>
                     ) : (
                        <div className="relative group">
                            <Button onClick={() => onToggleBot(true)} variant="primary" disabled={!enhancedCode} className="w-48 flex items-center justify-center">
                                <PlayIcon className="!h-5 !w-5" /><span className="ml-2">Deploy Strategy</span>
                            </Button>
                            {!enhancedCode && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                    Generate the enhanced script to enable deployment.
                                </div>
                            )}
                        </div>
                     )}
                 </Card>
                <div className="grid grid-rows-2 gap-6 flex-grow">
                    <CodeViewer
                        title="Enhanced Strategy Script"
                        code={enhancedCode}
                        isLoading={isLoading.generation}
                        isBacktestRunning={isLoading.backtest}
                        onRunBacktest={handleRunBacktest}
                        onExportScript={handleExportScript}
                        isExporting={isLoading.export}
                    />
                    <BacktestResults results={backtestResults} isLoading={isLoading.backtest} error={error.backtest} />
                </div>
            </div>
        </div>
    );
};

const SettingsView: React.FC<{
    onAddNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}> = ({ onAddNotification }) => {
    const { apiKey, setApiKey, apiSecret, setApiSecret, isConnected, setIsConnected, environment, setEnvironment, tradeMethod, setTradeMethod } = useAPI();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            await verifyAndFetchBalances(apiKey, apiSecret, environment);
            setIsConnected(true);
            onAddNotification('Successfully connected to Bybit!', 'success');
        } catch (error: any) {
            setIsConnected(false);
            onAddNotification(`Connection failed: ${error.message}`, 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        onAddNotification('Disconnected from exchange.', 'info');
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Card className="p-6">
                <h2 className="text-2xl font-bold text-white mb-1">Exchange Connection</h2>
                <p className="text-gray-400 mb-6">Connect your Bybit account to enable live trading and portfolio tracking.</p>

                <div className="space-y-4">
                    <Input label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your Bybit API Key" disabled={isConnected} />
                    <Input label="API Secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Enter your Bybit API Secret" disabled={isConnected} />
                    <ToggleSwitch label="Use Testnet Environment" enabled={environment === 'testnet'} onChange={enabled => setEnvironment(enabled ? 'testnet' : 'mainnet')} disabled={isConnected} />
                    
                    <div className="pt-2">
                        {isConnected ? (
                            <Button onClick={handleDisconnect} variant="secondary" className="w-full !py-3 !bg-red-600 hover:!bg-red-700">Disconnect</Button>
                        ) : (
                            <Button onClick={handleConnect} variant="primary" className="w-full !py-3" disabled={isConnecting || !apiKey || !apiSecret}>
                                {isConnecting ? <LoadingIcon /> : <LinkIcon />} <span className="ml-2">{isConnecting ? 'Connecting...' : 'Connect to Bybit'}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
            
            <Card className="p-6 mt-6">
                 <h2 className="text-2xl font-bold text-white mb-1">Trading Preferences</h2>
                 <p className="text-gray-400 mb-6">Configure default settings for manual trading.</p>
                 <ToggleSwitch label="Default to Limit Orders" enabled={tradeMethod === 'Limit'} onChange={enabled => setTradeMethod(enabled ? 'Limit' : 'Market')} />
                 <p className="text-xs text-gray-500 mt-2">When enabled, the trade panel will default to Limit orders. This can be toggled per trade.</p>
            </Card>
        </div>
    );
};


// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const MainApp: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { isConnected, apiKey, apiSecret, environment } = useAPI();
    
    // Portfolio State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [history, setHistory] = useState<PortfolioHistory>(MOCK_PORTFOLIO_HISTORY);
    const [realizedPnl, setRealizedPnl] = useState(0);

    // AI & Bot State
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    const [isBotSimulating, setIsBotSimulating] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState({ suggestion: '', isLoading: false, error: null as string | null });
    const botStartedRef = useRef(false);

    const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        const icons = {
            success: <CheckCircleIcon className="h-6 w-6" />,
            error: <ExclamationTriangleIcon className="h-6 w-6" />,
            info: <InfoIcon className="h-6 w-6" />,
        };
        const newNotification: Notification = { id: Date.now(), message, type, icon: icons[type] };
        setNotifications(prev => [...prev, newNotification]);
    }, []);

    const dismissNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const addActivityLog = useCallback((message: string, type: ActivityLogEntry['type']) => {
        setActivityLog(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
    }, []);

    const fetchPortfolioData = useCallback(async () => {
        if (!isConnected) return;
        try {
            const [fetchedAssets, fetchedPositions] = await Promise.all([
                verifyAndFetchBalances(apiKey, apiSecret, environment),
                fetchPositions(apiKey, apiSecret, environment)
            ]);
            setAssets(fetchedAssets);
            setPositions(fetchedPositions);
        } catch (error: any) {
            addNotification(`Failed to fetch portfolio: ${error.message}`, 'error');
        }
    }, [isConnected, apiKey, apiSecret, environment, addNotification]);

    useEffect(() => {
        if (isConnected) {
            addActivityLog('Connected to exchange. Fetching data...', 'info');
            fetchPortfolioData();
            const interval = setInterval(fetchPortfolioData, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        } else {
            setAssets([]);
            setPositions([]);
        }
    }, [isConnected, fetchPortfolioData]);

    // Bot Simulation Effect - REFACTORED FOR CORRECTNESS
    useEffect(() => {
        if (!isBotSimulating) {
            if (botStartedRef.current) {
                addActivityLog('AI strategy deployment simulation stopped.', 'info');
                botStartedRef.current = false;
            }
            return;
        }

        addActivityLog('AI strategy deployment simulation started.', 'info');
        botStartedRef.current = true;
        
        const intervalId: number = window.setInterval(() => {
            const isLong = Math.random() > 0.5;
            const pnl = (Math.random() - 0.45) * 50;
            const newTrade: Position = {
                id: `sim-${Date.now()}`,
                asset: 'BTC/USD',
                direction: isLong ? 'LONG' : 'SHORT',
                entryPrice: 69000 + (Math.random() - 0.5) * 500,
                size: 0.01,
                pnl: pnl,
                pnlPercent: (pnl / (69000 * 0.01 / 10)) * 100, // Assuming 10x leverage
                openTimestamp: new Date().toISOString(),
            };
            addActivityLog(`Simulated Trade: New ${newTrade.direction} ${newTrade.asset} position opened.`, 'trade');
            setPositions(prev => [...prev, newTrade]);
            
            // Simulate closing a position using a functional update to get the latest state
            setPositions(prevPositions => {
                if (prevPositions.length > 0 && Math.random() > 0.7) {
                    const posToClose = prevPositions[0];
                    setRealizedPnl(prevPnl => prevPnl + posToClose.pnl);
                    addActivityLog(`Simulated Trade: Closed ${posToClose.direction} position for a PnL of $${posToClose.pnl.toFixed(2)}.`, posToClose.pnl >= 0 ? 'profit' : 'loss');
                    return prevPositions.slice(1);
                }
                return prevPositions;
            });
        }, 8000);
        
        return () => {
            clearInterval(intervalId);
        };
    }, [isBotSimulating, addActivityLog]);


    const handleExecuteTrade = async (details: { asset: string, direction: 'LONG' | 'SHORT', amountUSD: number, orderType: 'Market' | 'Limit', limitPrice?: string }) => {
        if (!isConnected) {
            addNotification('Cannot execute trade. Not connected to an exchange.', 'error');
            return;
        }
        try {
            await executeLiveTrade(details, apiKey, apiSecret, environment);
            addNotification(`${details.direction} order for ${details.asset} placed successfully!`, 'success');
            addActivityLog(`Manual Trade: Placed ${details.direction} order for ${details.amountUSD} USD of ${details.asset}.`, 'trade');
            setTimeout(fetchPortfolioData, 2000); // Refresh data after a short delay
        } catch (error: any) {
            addNotification(`Trade failed: ${error.message}`, 'error');
        }
    };
    
    const handleManualClosePosition = async (position: Position) => {
        if (!isConnected) {
            addNotification('Cannot close position. Not connected to an exchange.', 'error');
            return;
        }
        try {
            await closeLivePosition(position, apiKey, apiSecret, environment);
            addNotification(`Close order for ${position.asset} placed successfully!`, 'success');
            addActivityLog(`Manual Close: Placed market close order for ${position.asset}.`, 'trade');
            setTimeout(fetchPortfolioData, 2000);
        } catch (error: any) {
            addNotification(`Failed to close position: ${error.message}`, 'error');
        }
    };

    const handleGetSuggestion = async () => {
        setAiSuggestion({ suggestion: '', isLoading: true, error: null });
        try {
            const context = `Current unrealized PnL: $${positions.reduce((acc, p) => acc + p.pnl, 0).toFixed(2)}. Open positions: ${positions.length}. Total portfolio value: $${(assets.find(a=>a.name === 'USDT')?.usdValue ?? 0).toFixed(2)}.`;
            const suggestion = await getTradingSuggestion(context);
            setAiSuggestion({ suggestion, isLoading: false, error: null });
            addActivityLog(`AI Suggestion: ${suggestion}`, 'info');
        } catch (error: any) {
            const errorMsg = `Failed to get AI suggestion: ${error.message}`;
            setAiSuggestion({ suggestion: '', isLoading: false, error: errorMsg });
            addNotification(errorMsg, 'error');
        }
    };

    const NavItem: React.FC<{ view: string; icon: React.ReactElement; label: string; }> = ({ view, icon, label }) => (
        <button
            onClick={() => setCurrentView(view)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === view ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        >
            {icon}
            <span className="font-semibold">{label}</span>
        </button>
    );

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardView history={history} positions={positions} realizedPnl={realizedPnl} assets={assets} onManualClosePosition={handleManualClosePosition} activityLog={activityLog} onGetSuggestion={handleGetSuggestion} aiSuggestion={aiSuggestion} />;
            case 'trade':
                return <TradeView data={MOCK_TRADE_VIEW_DATA} onExecuteTrade={handleExecuteTrade} isConnected={isConnected} />;
            case 'strategy':
                return <StrategyView isBotSimulating={isBotSimulating} onToggleBot={setIsBotSimulating} onAddNotification={addNotification} />;
            case 'settings':
                return <SettingsView onAddNotification={addNotification} />;
            default:
                return <DashboardView history={history} positions={positions} realizedPnl={realizedPnl} assets={assets} onManualClosePosition={handleManualClosePosition} activityLog={activityLog} onGetSuggestion={handleGetSuggestion} aiSuggestion={aiSuggestion} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-gray-800/50 p-4 flex flex-col">
                <div className="flex items-center space-x-2 px-2 mb-8">
                    <SparklesIcon className="h-8 w-8 text-cyan-400" />
                    <h1 className="text-2xl font-bold text-white">Xamanix</h1>
                </div>
                <nav className="space-y-2">
                    <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                    <NavItem view="trade" icon={<TradeIcon />} label="Trade" />
                    <NavItem view="strategy" icon={<RocketIcon className="h-6 w-6"/>} label="Strategy" />
                    <NavItem view="settings" icon={<SettingsIcon />} label="Settings" />
                </nav>
                <div className="mt-auto p-4 bg-gray-700/30 rounded-lg text-center">
                    <p className="text-sm font-semibold text-white">AI-Powered Trading</p>
                    <p className="text-xs text-gray-400 mt-1">Enhance, backtest, and deploy your strategies with Gemini.</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader currentView={currentView} isConnected={isConnected} isBotSimulating={isBotSimulating} />
                <div className="flex-1 overflow-y-auto bg-gray-900">
                    {renderView()}
                </div>
            </main>
            
            {/* Notifications */}
            <div className="fixed bottom-0 right-0 p-4 space-y-2">
                 {notifications.map(n => <NotificationPopup key={n.id} notification={n} onDismiss={dismissNotification} />)}
            </div>
        </div>
    );
}

// Wrap main app component in provider and rename for clarity
const App = () => (
    <APIProvider>
        <MainApp />
    </APIProvider>
);

export default App;
