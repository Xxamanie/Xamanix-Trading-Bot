import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PortfolioHistory, Asset, Position, TradeViewData, AnalysisResult, BacktestResult, ClosedTrade, UserSubmission, Notification, Order } from './types';
import { MOCK_PORTFOLIO_HISTORY, MOCK_TRADE_VIEW_DATA, DEFAULT_SCRIPT } from './constants';
import { DashboardIcon, WalletIcon, SettingsIcon, TradeIcon, UserIcon, SunIcon, CheckCircleIcon, ArrowTrendingUpIcon, ChartBarIcon, SparklesIcon, LoadingIcon, RocketIcon, CloseIcon, LightBulbIcon, InfoIcon, ProfitIcon, LossIcon, HistoryIcon, AboutIcon, ContactIcon, AdminIcon, ExclamationTriangleIcon, BellIcon, ExternalLinkIcon, ShieldCheckIcon } from './components/icons';
import RecommendationsPanel from './components/RecommendationsPanel';
import BacktestResults from './components/BacktestResults';
import CodeViewer from './components/CodeViewer';
import { analyzeCode, runBacktest, generateEnhancedCode, getTradingSuggestion, generateLiveBotScript } from './services/geminiService';
import { APIProvider, useAPI } from './contexts/APIContext';
import { verifyAndFetchBalances, fetchPositions, executeLiveTrade, closeLivePosition } from './services/bybitService';
import { LinkIcon } from './components/icons';


// @ts-ignore - Chart is loaded from a script tag in index.html
const Chart = window.Chart;

// Custom Type for this file
export interface ActivityLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'profit' | 'loss' | 'trade';
}

// Reusable UI Components
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

const Input: React.FC<{ label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string, leadingAddon?: string; disabled?: boolean; name?: string; }> = ({ label, type = "text", value, onChange, placeholder, leadingAddon, disabled = false, name }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <div className="relative">
             {leadingAddon && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-400 sm:text-sm">{leadingAddon}</span>
                </div>
            )}
            <input
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

const Textarea: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; rows?: number; name?: string; }> = ({ label, value, onChange, placeholder, rows = 4, name }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
        />
    </div>
);

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
                 <p className="text-xs text-gray-400">The panel below tracks manual trades and AI suggestions. Export a full AI bot from the 'Strategy' tab.</p>
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

// View Components
interface DashboardViewProps {
    history: PortfolioHistory;
    positions: Position[];
    realizedPnl: number;
    assets: Asset[];
    onManualClosePosition: (position: Position) => void;
    // Props for AIStatusPanel
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
    const yesterdaysValue = history.equity[history.equity.length - 2] ?? totalValue;
    const todaysChange = totalValue - yesterdaysValue;
    const todaysChangePct = yesterdaysValue !== 0 ? (todaysChange / yesterdaysValue) * 100 : 0;

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
            {/* Left Column */}
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

            {/* Right Column */}
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


const PillButton: React.FC<{ onClick: () => void, isActive: boolean, children: React.ReactNode }> = ({ onClick, isActive, children }) => (
    <button onClick={onClick} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${isActive ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        {children}
    </button>
);

const OrderBook: React.FC<{ bids: Order[]; asks: Order[]; }> = ({ bids, asks }) => {
    const allTotals = [...bids.map(o => o.total), ...asks.map(o => o.total)];
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
                            style={{ width: `${maxTotal > 0 ? (order.total / maxTotal) * 100 : 0}%` }}
                        />
                        <span className={type === 'bid' ? 'text-green-400' : 'text-red-400'}>{order.price.toFixed(2)}</span>
                        <span className="text-gray-300">{order.quantity.toFixed(4)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
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

interface TradeViewProps {
  data: TradeViewData;
  onExecuteTrade: (details: { asset: string, direction: 'LONG' | 'SHORT', amountUSD: number }) => void;
  isConnected: boolean;
}

const TradeView: React.FC<TradeViewProps> = (props) => {
    const { data, onExecuteTrade, isConnected } = props;
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);
    const [market, setMarket] = useState(Object.keys(data)[0]);
    const [orderBook, setOrderBook] = useState<{bids: Order[], asks: Order[]}>({ bids: [], asks: [] });

    const candleFrequencies = ['5m', '15m', '1h', '4h'];
    const [candleFrequency, setCandleFrequency] = useState(candleFrequencies[1]);

    const marketData = data[market]?.[candleFrequency];

    const [stopLoss, setStopLoss] = useState('2.0');
    const [tradeAmount, setTradeAmount] = useState('100');
    const [isTrading, setIsTrading] = useState(false);

    useEffect(() => {
        if (!chartRef.current || !marketData) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const movingAveragePeriod = 20; // Define period for Exponential Moving Average

        const calculateEMA = (data: number[], period: number): (number | null)[] => {
            if (data.length < period) return Array(data.length).fill(null);
        
            const multiplier = 2 / (period + 1);
            const ema: (number | null)[] = Array(period - 1).fill(null);
            
            // Start with an SMA for the first value
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
            setOrderBook(generateOrderBookData(initialPrices[initialPrices.length - 1], market));
        }

        chartInstance.current = new Chart(ctx, {
            data: {
                labels: marketData.timestamps.map(t => new Date(t).toLocaleTimeString()),
                datasets: [{
                    type: 'line',
                    label: `${market} Price (${candleFrequency})`,
                    data: initialPrices, 
                    borderColor: '#22d3ee',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                    order: 1
                }, {
                    type: 'line',
                    label: `EMA (${movingAveragePeriod})`,
                    data: initialEmaData,
                    borderColor: '#ef4444', // Red color
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    order: 1
                }, {
                    type: 'bubble',
                    label: 'Buy Trades',
                    data: [],
                    backgroundColor: 'rgba(16, 185, 129, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 1)',
                    borderWidth: 1.5,
                    radius: 5,
                    order: 0,
                }, {
                    type: 'bubble',
                    label: 'Sell Trades',
                    data: [],
                    backgroundColor: 'rgba(220, 38, 38, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 1)',
                    borderWidth: 1.5,
                    radius: 5,
                    order: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        labels: { 
                            color: '#d1d5db',
                            filter: (item) => !item.text.includes('Trades'),
                        } 
                    } 
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { ticks: { color: '#9ca3af', callback: (value: any) => `$${Number(value).toLocaleString()}` }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });

        const intervalId = setInterval(() => {
            if (!chartInstance.current) return;
            
            const datasets = chartInstance.current.data.datasets;
            const priceDataset = datasets[0];
            const maDataset = datasets[1];
            const buyDataset = datasets[2];
            const sellDataset = datasets[3];
            
            const lastPrice = priceDataset.data[priceDataset.data.length - 1];

            let volatility = 0.0001;
            if (market.includes('SOL')) volatility = 0.0005;
            else if (market.includes('ETH')) volatility = 0.0002;
            
            const newPrice = lastPrice * (1 + (Math.random() - 0.5) * volatility);
            const newTimestamp = new Date().toLocaleTimeString();
            
            setOrderBook(generateOrderBookData(newPrice, market));

            // Update labels
            chartInstance.current.data.labels.push(newTimestamp);
            chartInstance.current.data.labels.shift();

            // Update price data
            priceDataset.data.push(newPrice);
            priceDataset.data.shift();
            
            // Update EMA data
            const lastEma = maDataset.data[maDataset.data.length - 1];
            let newEmaValue = null;
            if (lastEma !== null) {
                const multiplier = 2 / (movingAveragePeriod + 1);
                newEmaValue = (newPrice - lastEma) * multiplier + lastEma;
            } else {
                // Fallback: if EMA somehow becomes null, re-seed with SMA
                const currentPrices = priceDataset.data.filter((p: any) => p !== null);
                if (currentPrices.length >= movingAveragePeriod) {
                    const sum = currentPrices.slice(-movingAveragePeriod).reduce((acc: number, val: number) => acc + val, 0);
                    newEmaValue = sum / movingAveragePeriod;
                }
            }
            maDataset.data.push(newEmaValue);
            maDataset.data.shift();

            // Update trade marker positions
            buyDataset.data.forEach((p: {x:number}) => { if(p) p.x-- });
            sellDataset.data.forEach((p: {x:number}) => { if(p) p.x-- });
            buyDataset.data = buyDataset.data.filter((p: {x:number}) => p && p.x >= 0);
            sellDataset.data = sellDataset.data.filter((p: {x:number}) => p && p.x >= 0);

            chartInstance.current.update('quiet');
        }, 1500);

        return () => {
            clearInterval(intervalId);
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };

    }, [marketData, market, candleFrequency]);
    
    const handleTrade = async (direction: 'LONG' | 'SHORT') => {
        const amount = parseFloat(tradeAmount);
        if (isNaN(amount) || amount <= 0) {
            console.error("Invalid trade amount");
            return;
        }
        
        setIsTrading(true);

        if (chartInstance.current) {
            const priceDataset = chartInstance.current.data.datasets[0];
            const buyDataset = chartInstance.current.data.datasets[2];
            const sellDataset = chartInstance.current.data.datasets[3];
            
            const tradeIndex = priceDataset.data.length - 1;
            const tradePrice = priceDataset.data[tradeIndex];

            const newPoint = { x: tradeIndex, y: tradePrice, r: 6 };
            
            if (direction === 'LONG') {
                buyDataset.data.push(newPoint);
            } else {
                sellDataset.data.push(newPoint);
            }
            chartInstance.current.update('quiet');
        }

        try {
            await onExecuteTrade({
                asset: market,
                direction: direction,
                amountUSD: amount
            });
        } finally {
             setIsTrading(false);
        }
    };


    return (
        <div className="p-6 h-full flex gap-6">
            <div className="w-2/3 flex flex-col gap-6">
                 <div className="flex-shrink-0 flex justify-between items-center">
                    <select onChange={(e) => setMarket(e.target.value)} value={market} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        {Object.keys(data).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="flex items-center space-x-2 bg-gray-800 p-1 rounded-full">
                        {candleFrequencies.map(freq => (
                            <PillButton key={freq} onClick={() => setCandleFrequency(freq)} isActive={candleFrequency === freq}>
                                {freq}
                            </PillButton>
                        ))}
                    </div>
                </div>
                <div className="flex-grow min-h-0">
                    <Card className="h-full p-2">
                        <canvas ref={chartRef}></canvas>
                    </Card>
                </div>
            </div>
            <div className="w-1/3 flex flex-col gap-6">
                <Card className="p-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-white mb-4">Manual Trade</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Trade Amount" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} leadingAddon="$" />
                        <Input label="Stop Loss (%)" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                            <div className="relative group flex space-x-3 w-full">
                            <Button 
                                onClick={() => handleTrade('LONG')} 
                                variant="primary" 
                                className="!bg-green-600 !hover:bg-green-700 !focus:ring-green-500 px-6 py-2.5 w-full"
                                disabled={isTrading || !isConnected}
                            >
                                {isTrading ? <LoadingIcon /> : 'Buy / Long'}
                            </Button>
                            <Button 
                                onClick={() => handleTrade('SHORT')} 
                                variant="primary" 
                                className="!bg-red-600 !hover:bg-red-700 !focus:ring-red-500 px-6 py-2.5 w-full"
                                disabled={isTrading || !isConnected}
                            >
                               {isTrading ? <LoadingIcon /> : 'Sell / Short'}
                            </Button>
                                {!isConnected && (
                                <div className="absolute bottom-full mb-2 w-full text-center">
                                <span className="bg-gray-700 text-white text-xs rounded py-1 px-2">
                                        Connect to exchange to trade.
                                </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="flex-grow min-h-0">
                     <OrderBook bids={orderBook.bids} asks={orderBook.asks} />
                </div>
            </div>
        </div>
    );
};

const WalletView: React.FC<{ assets: Asset[], setView: (view: string) => void }> = ({ assets, setView }) => {
    const { isConnected } = useAPI();

    if (!isConnected) {
        return (
            <div className="p-6 flex items-center justify-center h-full text-center">
                <Card className="p-8 max-w-md">
                    <WalletIcon />
                    <h3 className="text-xl font-bold text-white mt-4">Connect Your Exchange</h3>
                    <p className="text-gray-400 mt-2 mb-6">
                        To view your live wallet balances, please connect your Bybit API keys in the Settings page.
                    </p>
                    <Button variant="primary" onClick={() => setView('settings')}>
                        Go to Settings
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Card>
                <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700">Wallet Balances</h3>
                 {assets.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                        <LoadingIcon className="w-8 h-8 mx-auto" />
                        <p className="mt-2">Loading wallet balances...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3">Asset</th>
                                    <th className="px-6 py-3">Total</th>
                                    <th className="px-6 py-3">Available</th>
                                    <th className="px-6 py-3">In Orders</th>
                                    <th className="px-6 py-3">USD Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map(asset => (
                                    <tr key={asset.name} className="border-b border-gray-700 hover:bg-gray-800/70 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-white">{asset.name}</td>
                                        <td className="px-6 py-4">{asset.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                                        <td className="px-6 py-4">{asset.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                                        <td className="px-6 py-4">{asset.inOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                                        <td className="px-6 py-4">${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};


const SettingsView: React.FC<{ onConnectAttempt: (apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet') => Promise<void>, onDisconnect: () => void, addNotification: (message: string, type: Notification['type']) => void }> = ({ onConnectAttempt, onDisconnect, addNotification }) => {
    const { apiKey, setApiKey, apiSecret, setApiSecret, isConnected, environment, setEnvironment } = useAPI();
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerifyAndConnect = async () => {
        setIsVerifying(true);
        setError(null);
        try {
            await onConnectAttempt(apiKey, apiSecret, environment);
        } catch (e: any) {
            const errorMessage = e.message || "An unknown error occurred.";
            setError(errorMessage);
            addNotification(errorMessage, 'error');
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleDisconnect = () => {
        setApiKey('');
        setApiSecret('');
        onDisconnect();
        addNotification("Disconnected from exchange.", 'info');
    };

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
                <div className="space-y-4 mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Environment</label>
                    <div className="flex space-x-4">
                        <label className="flex items-center">
                            <input type="radio" name="environment" value="testnet" checked={environment === 'testnet'} onChange={() => setEnvironment('testnet')} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" disabled={isConnected} />
                            <span className="ml-2 text-gray-300">Testnet (Paper Trading)</span>
                        </label>
                        <label className="flex items-center">
                            <input type="radio" name="environment" value="mainnet" checked={environment === 'mainnet'} onChange={() => setEnvironment('mainnet')} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" disabled={isConnected} />
                            <span className="ml-2 text-gray-300">Mainnet (Live Trading)</span>
                        </label>
                    </div>
                </div>

                {environment === 'testnet' && (
                    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-yellow-300">You are in Testnet Mode</h4>
                                <p className="text-sm text-yellow-300/80 mt-1">
                                    Testnet uses live market data with play money. This is a critical step for testing strategies without financial risk. Ensure you are using API keys generated from your exchange's Testnet platform.
                                </p>
                                <a href="https://testnet.bybit.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold text-cyan-400 hover:text-cyan-300 mt-2">
                                    Get Bybit Testnet Keys <ExternalLinkIcon className="ml-1.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                 {environment === 'mainnet' && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-red-300">You are in Mainnet Mode</h4>
                                <p className="text-sm text-red-300/80 mt-1">
                                    <strong>EXTREME CAUTION:</strong> You are about to connect to a live trading environment. All actions will be performed with REAL funds from your exchange account. Double-check your strategy and settings before proceeding. The creators of this application are not liable for any financial losses.
                                </p>
                                <a href="https://www.bybit.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold text-cyan-400 hover:text-cyan-300 mt-2">
                                    Go to Bybit Mainnet <ExternalLinkIcon className="ml-1.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                
                <p className="text-sm text-gray-400 mb-6">
                    Enter your {environment.charAt(0).toUpperCase() + environment.slice(1)} API key and secret. Your keys are stored locally and never exposed.
                </p>
                <div className="space-y-4">
                    <Input label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} disabled={isConnected} placeholder={`Enter ${environment.charAt(0).toUpperCase() + environment.slice(1)} API Key`} />
                    <Input label="API Secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} disabled={isConnected} placeholder={`Enter ${environment.charAt(0).toUpperCase() + environment.slice(1)} API Secret`}/>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="pt-2 flex items-center justify-between">
                        {!isConnected ? (
                            <Button onClick={handleVerifyAndConnect} variant="primary" disabled={isVerifying || !apiKey || !apiSecret}>
                                <div className="flex items-center">
                                    {isVerifying ? <LoadingIcon className="w-5 h-5 mr-2" /> : <LinkIcon className="w-5 h-5 mr-2" />}
                                    {isVerifying ? 'Verifying...' : 'Connect & Verify'}
                                </div>
                            </Button>
                        ) : (
                             <div className="flex items-center space-x-4">
                                <div className="flex items-center text-green-400"><CheckCircleIcon className="w-5 h-5 mr-2" /> Connected to {environment}</div>
                                <Button onClick={handleDisconnect} variant="secondary">Disconnect</Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
             <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Bot Settings</h3>
                 <div className="space-y-4">
                     <div className="flex justify-between items-center">
                         <p className="text-gray-300">Maximum Concurrent Trades</p>
                         <input type="number" defaultValue={5} className="w-24 bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white text-center" />
                     </div>
                     <div className="flex justify-between items-center">
                         <p className="text-gray-300">Daily Loss Limit (%)</p>
                         <input type="number" defaultValue={5} className="w-24 bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white text-center" />
                     </div>
                 </div>
            </Card>
        </div>
    );
};

const StrategyView: React.FC<{ addNotification: (message: string, type: Notification['type']) => void }> = ({ addNotification }) => {
    const [originalCode, setOriginalCode] = useState<string>(DEFAULT_SCRIPT);
    const [enhancedCode, setEnhancedCode] = useState<string>('');
  
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
  
    const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
    const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  
    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
    const [isBacktestRunning, setIsBacktestRunning] = useState<boolean>(false);
    const [backtestError, setBacktestError] = useState<string | null>(null);
    const [activeBacktest, setActiveBacktest] = useState<'none' | 'original' | 'enhanced'>('none');
    const [isExporting, setIsExporting] = useState<boolean>(false);

    const handleAnalyze = async () => {
        setIsLoadingAnalysis(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        setAppliedRecommendations(new Set());
        setEnhancedCode('');
        setBacktestResult(null);
        setBacktestError(null);
        setActiveBacktest('none');
        try {
            const result = await analyzeCode(originalCode);
            setAnalysisResult(result);
            const allRecTitles = new Set(result.recommendations.map(r => r.title));
            setAppliedRecommendations(allRecTitles);
        } catch (error) {
            console.error("Analysis failed:", error);
            setAnalysisError("Failed to analyze the script. Please check the console for details.");
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    const handleToggleRecommendation = (title: string) => {
        setAppliedRecommendations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(title)) {
                newSet.delete(title);
            } else {
                newSet.add(title);
            }
            return newSet;
        });
    };

    const handleGenerateScript = async () => {
        if (!analysisResult || appliedRecommendations.size === 0) return;
        setIsGeneratingScript(true);
        setEnhancedCode('');
        try {
            const selectedRecommendations = analysisResult.recommendations.filter(rec => appliedRecommendations.has(rec.title));
            const generatedCode = await generateEnhancedCode(originalCode, selectedRecommendations);
            setEnhancedCode(generatedCode);
        } catch (error) {
            console.error("Script generation failed:", error);
        } finally {
            setIsGeneratingScript(false);
        }
    };
    
    const handleExportScript = async () => {
        const codeToExport = enhancedCode || originalCode;
        if (!codeToExport) return;
        
        setIsExporting(true);
        try {
            const liveBotScript = await generateLiveBotScript(codeToExport);
            
            // Trigger download
            const blob = new Blob([liveBotScript], { type: 'text/x-python' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'live_trading_bot.py';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            addNotification("Live bot script exported successfully!", 'success');

        } catch (error) {
            console.error("Failed to export live bot script:", error);
            addNotification("Failed to export script. See console for details.", 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleRunBacktest = async (codeToRun: 'original' | 'enhanced') => {
        const code = codeToRun === 'original' ? originalCode : enhancedCode;
        if (!code) return;
        
        setActiveBacktest(codeToRun);
        setIsBacktestRunning(true);
        setBacktestResult(null);
        setBacktestError(null);
    
        try {
            const result = await runBacktest(code);
            setBacktestResult(result);
        } catch(e: any) {
            setBacktestError(e.message || 'An unknown error occurred during backtest.');
        } finally {
            setIsBacktestRunning(false);
        }
    };

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
            {!analysisResult && !isLoadingAnalysis && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="max-w-3xl w-full bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-white mb-2">AI Strategy Enhancer</h2>
                        <p className="text-gray-400 mb-6">Paste your Python trading script below to analyze, enhance, and export a standalone bot.</p>
                        <textarea
                            value={originalCode}
                            onChange={(e) => setOriginalCode(e.target.value)}
                            placeholder="Paste your Python script here..."
                            className="w-full h-80 bg-gray-900 border border-gray-600 rounded-md p-4 text-sm font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                        />
                         <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoadingAnalysis || !originalCode.trim()}
                                className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors shadow-lg"
                            >
                                <SparklesIcon /> <span className="ml-2">Analyze Script</span>
                            </button>
                             <button
                                onClick={handleExportScript}
                                disabled={!originalCode.trim() || isExporting}
                                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors shadow-lg"
                            >
                                {isExporting ? <LoadingIcon /> : <RocketIcon />}
                                <span className="ml-2">{isExporting ? 'Exporting...' : 'Export Original as Bot'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {isLoadingAnalysis && (
                <div className="flex flex-col items-center justify-center h-full">
                    <LoadingIcon className="h-10 w-10 animate-spin text-cyan-400" />
                    <p className="mt-4 text-lg font-semibold text-cyan-400">Analyzing script with Gemini...</p>
                    <p className="text-gray-500">This might take a moment.</p>
                </div>
            )}

            {analysisError && (
                 <div className="flex items-center justify-center h-full p-4">
                    <p className="text-red-400 text-center bg-red-900/50 border border-red-700 p-4 rounded-lg">
                        <strong className="font-bold">Analysis Failed:</strong> {analysisError}
                    </p>
                </div>
            )}

            {analysisResult && !isLoadingAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    <div className="space-y-6 flex flex-col min-h-0">
                        <RecommendationsPanel 
                            analysis={analysisResult}
                            appliedRecommendations={appliedRecommendations}
                            onToggleRecommendation={handleToggleRecommendation}
                            onGenerateScript={handleGenerateScript}
                            isGenerating={isGeneratingScript}
                        />
                        <div className="flex-grow">
                             <BacktestResults 
                                results={backtestResult}
                                isLoading={isBacktestRunning}
                                error={backtestError}
                             />
                        </div>
                    </div>
                    <div className="space-y-6 flex flex-col min-h-0">
                        <CodeViewer
                            title="Original Script"
                            code={originalCode}
                            isBacktestRunning={isBacktestRunning && activeBacktest === 'original'}
                            onRunBacktest={() => handleRunBacktest('original')}
                        />
                        <CodeViewer
                            title="Enhanced Script"
                            code={enhancedCode}
                            isLoading={isGeneratingScript}
                            isBacktestRunning={isBacktestRunning && activeBacktest === 'enhanced'}
                            onRunBacktest={() => handleRunBacktest('enhanced')}
                            onExportScript={handleExportScript}
                            isExporting={isExporting}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const HistoryView: React.FC<{ trades: ClosedTrade[], positions: Position[] }> = ({ trades, positions }) => {
    const totalTrades = trades.length;
    const tradesWon = trades.filter(t => t.pnl > 0).length;
    const tradesLost = totalTrades - tradesWon;
    const totalWon = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLost = trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0);
    const netProfit = totalWon + totalLost;
    const winRate = totalTrades > 0 ? (tradesWon / totalTrades) * 100 : 0;

    const stats = [
        { label: 'Total Closed', value: totalTrades },
        { label: 'Trades Won', value: tradesWon },
        { label: 'Trades Lost', value: tradesLost },
        { label: 'Win Rate', value: `${winRate.toFixed(2)}%` },
        { label: 'Total Won', value: `$${totalWon.toFixed(2)}`, color: 'text-green-400' },
        { label: 'Total Lost', value: `$${Math.abs(totalLost).toFixed(2)}`, color: 'text-red-400' },
        { label: 'Net Profit', value: `${netProfit >= 0 ? '+' : '-'}$${Math.abs(netProfit).toFixed(2)}`, color: netProfit >= 0 ? 'text-green-400' : 'text-red-400' },
    ];

    const allTradeItems = [
        ...positions.map(p => ({
            id: p.id,
            asset: p.asset,
            direction: p.direction,
            entryPrice: p.entryPrice,
            exitPrice: null,
            size: p.size,
            pnl: p.pnl,
            openTimestamp: p.openTimestamp,
            closeTimestamp: null,
            status: 'Open',
        })),
        ...trades.map(t => ({
            ...t,
            status: 'Closed',
        }))
    ].sort((a, b) => new Date(b.openTimestamp).getTime() - new Date(a.openTimestamp).getTime());
    
    return (
        <div className="p-6 space-y-6">
            <Card>
                <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Performance Summary (Closed Trades)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {stats.map(stat => (
                            <div key={stat.label} className="bg-gray-900/70 p-4 rounded-lg text-center">
                                <p className="text-sm text-gray-400">{stat.label}</p>
                                <p className={`text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-white p-4">Trade Log (All Trades)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3">Asset</th>
                                    <th className="px-6 py-3">Direction</th>
                                    <th className="px-6 py-3">Size</th>
                                    <th className="px-6 py-3">Entry Price</th>
                                    <th className="px-6 py-3">Exit Price</th>
                                    <th className="px-6 py-3">PnL</th>
                                    <th className="px-6 py-3">Opened</th>
                                    <th className="px-6 py-3">Closed</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTradeItems.length > 0 ? allTradeItems.map(trade => (
                                    <tr key={trade.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800/70 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-white">{trade.asset}</td>
                                        <td className={`px-6 py-4 font-semibold ${trade.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{trade.direction}</td>
                                        <td className="px-6 py-4">{trade.size.toFixed(6)}</td>
                                        <td className="px-6 py-4">${trade.entryPrice.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            {trade.exitPrice ? `$${trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-gray-500">--</span>}
                                        </td>
                                        <td className={`px-6 py-4 font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(trade.openTimestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {trade.closeTimestamp ? new Date(trade.closeTimestamp).toLocaleString() : <span className="text-gray-500">--</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block text-center min-w-[64px] px-2 py-1 text-xs font-semibold rounded-full ${
                                                trade.status === 'Open' 
                                                ? 'bg-cyan-500/20 text-cyan-300' 
                                                : (trade.pnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')
                                            }`}>
                                                {trade.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-gray-500">No trades yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const AboutView: React.FC = () => (
    <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8">
            <div className="text-center mb-8">
                 <ArrowTrendingUpIcon className="w-12 h-12 mx-auto text-cyan-400"/>
                 <h2 className="text-3xl font-bold text-white mt-4">About Xamanix Trading Bot</h2>
                 <p className="text-lg text-gray-400 mt-2">Your AI-Powered Partner in Algorithmic Trading</p>
            </div>

            <div className="space-y-6 text-gray-300">
                <p>
                    Xamanix is a sophisticated, AI-driven platform designed to empower both novice and experienced traders by transforming their Python trading scripts into more robust, efficient, and profitable strategies. We bridge the gap between a great idea and a market-ready trading bot.
                </p>
                <p>
                    By harnessing the advanced analytical capabilities of Google's Gemini API, Xamanix provides a suite of tools to dissect, refine, and validate your trading logic. Our platform automates the tedious process of code review and enhancement, allowing you to focus on what truly matters: crafting winning strategies.
                </p>

                <div className="pt-4">
                    <h3 className="text-xl font-semibold text-white mb-4">Key Features</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-inside">
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>AI Script Analysis:</strong> Get deep insights into your strategy's parameters and logic.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Intelligent Recommendations:</strong> Receive actionable suggestions for improving risk management, signal confirmation, and more.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>One-Click Backtesting:</strong> Instantly run detailed backtests on both original and AI-enhanced scripts.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Export Standalone Bots:</strong> Generate complete, live-ready Python bots to run on your own hardware.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Real-Time Monitoring:</strong> Keep track of your manual trades, open positions, and PnL through an intuitive dashboard.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Live Exchange Integration:</strong> Connect securely to your Bybit account to manage your portfolio and execute manual trades.</span></li>
                    </ul>
                </div>
            </div>
        </Card>
    </div>
);

const ContactView: React.FC<{ onFormSubmit: (submission: Omit<UserSubmission, 'id' | 'timestamp' | 'read'>) => void }> = ({ onFormSubmit }) => {
    const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
    const [type, setType] = useState<'comment' | 'complaint'>('comment');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFormSubmit({ ...formState, type });
        setFormState({ name: '', email: '', subject: '', message: '' });
        setType('comment');
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="p-6 flex items-center justify-center h-full text-center">
                <Card className="p-8 max-w-md">
                    <CheckCircleIcon className="w-12 h-12 mx-auto text-green-400" />
                    <h3 className="text-xl font-bold text-white mt-4">Thank You!</h3>
                    <p className="text-gray-400 mt-2 mb-6">
                        Your message has been sent successfully. Our team will get back to you as soon as possible.
                    </p>
                    <Button onClick={() => setIsSubmitted(false)}>
                        Send Another Message
                    </Button>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Card className="p-8">
                <h2 className="text-2xl font-bold text-white mb-2">Contact Us</h2>
                <p className="text-gray-400 mb-6">
                    Have a question, feedback, or need support? Fill out the form below and we'll get back to you.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-400">Message Type</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input type="radio" name="type" value="comment" checked={type === 'comment'} onChange={() => setType('comment')} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" />
                                <span className="ml-2 text-gray-300">General Comment</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="type" value="complaint" checked={type === 'complaint'} onChange={() => setType('complaint')} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" />
                                <span className="ml-2 text-gray-300">Private Complaint</span>
                            </label>
                        </div>
                    </div>
                    <Input label="Your Name" name="name" value={formState.name} onChange={handleChange} placeholder="John Doe" />
                    <Input label="Your Email" name="email" type="email" value={formState.email} onChange={handleChange} placeholder="you@example.com" />
                    <Input label="Subject" name="subject" value={formState.subject} onChange={handleChange} placeholder="Regarding my strategy..." />
                    <Textarea label="Message" name="message" value={formState.message} onChange={handleChange} placeholder="Your message here..." />
                    <div className="pt-2">
                        <Button type="submit" variant="primary" className="w-full">
                            Send Message
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const AdminView: React.FC<{ submissions: UserSubmission[], onMarkAsRead: (id: string) => void }> = ({ submissions, onMarkAsRead }) => {
    const [activeTab, setActiveTab] = useState<'complaint' | 'comment'>('complaint');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filteredSubmissions = submissions.filter(s => s.type === activeTab);

    const handleToggleExpand = (id: string) => {
        const submission = submissions.find(s => s.id === id);
        if (submission && !submission.read) {
            onMarkAsRead(id);
        }
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Card>
                 <div className="p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                    <p className="text-gray-400">View user feedback and complaints.</p>
                 </div>
                 <div className="border-b border-gray-700">
                    <nav className="-mb-px flex px-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('complaint')} className={`${activeTab === 'complaint' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            Complaints
                        </button>
                        <button onClick={() => setActiveTab('comment')} className={`${activeTab === 'comment' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} ml-8 capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            Comments
                        </button>
                    </nav>
                </div>
                 <div className="divide-y divide-gray-700">
                    {filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => (
                         <div key={sub.id}>
                            <div onClick={() => handleToggleExpand(sub.id)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors">
                                <div className="flex items-center">
                                     <div className={`w-2.5 h-2.5 rounded-full mr-4 ${!sub.read ? 'bg-cyan-400' : 'bg-transparent'}`}></div>
                                     <div>
                                        <p className={`font-semibold text-white ${!sub.read ? 'font-bold' : ''}`}>{sub.subject}</p>
                                        <p className="text-sm text-gray-400">From: {sub.name} ({sub.email})</p>
                                     </div>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(sub.timestamp).toLocaleString()}</span>
                            </div>
                            {expandedId === sub.id && (
                                <div className="p-4 bg-gray-900/50">
                                    <p className="text-gray-300 whitespace-pre-wrap">{sub.message}</p>
                                </div>
                            )}
                         </div>
                    )) : (
                        <p className="text-center text-gray-500 py-12">No {activeTab}s yet.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

// Main App Structure
// FIX: Define a type for navigation items to ensure type safety for items with and without badges.
interface NavItemData {
    id: string;
    label: string;
    icon: React.ReactElement;
    badge?: number;
}

const NavItem: React.FC<{
    icon: React.ReactElement;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
}> = ({ icon, label, isActive, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
    >
        {icon}
        <span className="font-semibold">{label}</span>
        {badge && badge > 0 ? (
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {badge}
            </span>
        ) : null}
    </button>
);


const Sidebar: React.FC<{
    currentView: string;
    setView: (view: string) => void;
    isAdminVisible: boolean;
    onTitleClick: () => void;
    positionsCount: number;
    unreadSubmissionsCount: number;
}> = ({ currentView, setView, isAdminVisible, onTitleClick, positionsCount, unreadSubmissionsCount }) => {

    const navItems: NavItemData[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, badge: positionsCount },
        { id: 'trade', label: 'Trade', icon: <TradeIcon /> },
        { id: 'strategy', label: 'Strategy', icon: <ArrowTrendingUpIcon /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
        { id: 'wallet', label: 'Wallet', icon: <WalletIcon /> },
    ];

    const secondaryNavItems: NavItemData[] = [
        { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
        { id: 'about', label: 'About', icon: <AboutIcon /> },
        { id: 'contact', label: 'Contact Us', icon: <ContactIcon /> },
    ];
    
     if (isAdminVisible) {
        secondaryNavItems.push({ id: 'admin', label: 'Admin Panel', icon: <AdminIcon />, badge: unreadSubmissionsCount });
    }

    return (
        <div className="w-64 bg-gray-900/80 border-r border-gray-700/50 p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-8 px-2 cursor-pointer" onClick={onTitleClick}>
                <ChartBarIcon className="h-8 w-8 text-cyan-400" />
                <h1 className="text-2xl font-bold text-white">Xamanix</h1>
            </div>
            <nav className="space-y-2 flex-grow">
                {navItems.map(item => (
                    <NavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentView === item.id}
                        onClick={() => setView(item.id)}
                        badge={item.badge}
                    />
                ))}
            </nav>
            <div className="space-y-2 border-t border-gray-700 pt-4">
                 {secondaryNavItems.map(item => (
                    <NavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentView === item.id}
                        onClick={() => setView(item.id)}
                        // FIX: Removed @ts-ignore as the type is now correct.
                        badge={item.badge}
                    />
                ))}
            </div>
        </div>
    );
};

const StatusIndicator: React.FC<{ label: string; status: 'positive' | 'neutral' | 'negative'; text: string; tooltip?: string; }> = ({ label, status, text, tooltip }) => {
    const colorClasses = {
        positive: 'bg-green-500',
        neutral: 'bg-gray-500',
        negative: 'bg-red-500',
    };
    return (
        <div className="relative group flex items-center space-x-2">
            <span className="text-sm text-gray-400">{label}:</span>
            <div className="flex items-center space-x-1.5">
                <div className={`w-2 h-2 rounded-full ${colorClasses[status]}`}></div>
                <span className="text-sm font-semibold text-white">{text}</span>
            </div>
            {tooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {tooltip}
                </div>
            )}
        </div>
    );
};

const DashboardHeader: React.FC<{
    currentView: string;
    isConnected: boolean;
    isLiveBotActive: boolean;
}> = ({ currentView, isConnected, isLiveBotActive }) => {
    const { environment } = useAPI();
    const title = currentView.charAt(0).toUpperCase() + currentView.slice(1);

    const environmentDetails = {
        testnet: { text: 'Testnet', status: 'positive' as const },
        mainnet: { text: 'Mainnet', status: 'negative' as const }
    };

    const currentEnvDetails = environmentDetails[environment];
    
    return (
        <div className="h-16 flex-shrink-0 bg-gray-800/30 border-b border-gray-700 flex items-center justify-between px-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <div className="flex items-center space-x-6">
                 <StatusIndicator 
                    label="Live Bot Status"
                    status={isLiveBotActive ? 'positive' : 'negative'}
                    text={isLiveBotActive ? 'Active' : 'Inactive'}
                    tooltip="Export a bot from the 'Strategy' tab and run it on your computer to activate."
                />
                 <StatusIndicator 
                    label="Environment"
                    status={isConnected ? currentEnvDetails.status : 'neutral'}
                    text={isConnected ? currentEnvDetails.text : 'N/A'}
                />
                <StatusIndicator 
                    label="Exchange"
                    status={isConnected ? 'positive' : 'negative'}
                    text={isConnected ? 'Connected' : 'Disconnected'}
                />
            </div>
        </div>
    );
};

const NotificationToast: React.FC<{ notification: Notification; onDismiss: () => void }> = ({ notification, onDismiss }) => {
    const typeClasses = {
        success: 'bg-green-800/80 border-green-600',
        error: 'bg-red-800/80 border-red-600',
        info: 'bg-blue-800/80 border-blue-600',
    };

    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`w-80 rounded-lg shadow-2xl p-4 border text-white backdrop-blur-md ${typeClasses[notification.type]}`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">{notification.icon}</div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={onDismiss} className="inline-flex text-gray-300 hover:text-white">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationContainer: React.FC<{ notifications: Notification[]; onDismiss: (id: number) => void }> = ({ notifications, onDismiss }) => (
    <div className="fixed top-4 right-4 z-50 space-y-3">
        {notifications.map(n => (
            <NotificationToast key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
        ))}
    </div>
);

const LiveTradingWarningModal: React.FC<{ onAccept: () => void; onCancel: () => void; environment: 'testnet' | 'mainnet'; }> = ({ onAccept, onCancel, environment }) => {
    
    const details = {
        testnet: {
            title: 'Connect to Testnet?',
            subtitle: 'You are connecting to a live paper trading environment.',
            color: 'border-yellow-500/50',
            icon: <ExclamationTriangleIcon className="w-10 h-10 text-yellow-400 mr-4 flex-shrink-0" />,
            points: [
                'Trades are executed against live market data.',
                'All funds used are play money provided by the exchange\'s Testnet.',
                'This is a crucial step for testing strategies without financial risk.'
            ],
             buttonClass: '!bg-yellow-600 hover:!bg-yellow-700 !focus:ring-yellow-500 text-white'
        },
        mainnet: {
            title: 'WARNING: Connect to Mainnet?',
            subtitle: 'You are about to execute trades with REAL FUNDS.',
            color: 'border-red-500/50',
            icon: <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mr-4 flex-shrink-0" />,
            points: [
                'This action connects to your live exchange account.',
                'All trades executed by the AI or manually will use your REAL account balance.',
                'Financial losses are possible and are your sole responsibility.',
                'Ensure you understand the risks and have thoroughly tested your strategy.'
            ],
            buttonClass: '!bg-red-600 hover:!bg-red-700 !focus:ring-red-500 text-white'
        }
    };
    
    const currentDetails = details[environment];
    
    return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className={`max-w-lg p-8 ${currentDetails.color}`}>
            <div className="flex items-center">
                {currentDetails.icon}
                <div>
                    <h2 className="text-2xl font-bold text-white">{currentDetails.title}</h2>
                    <p className="text-yellow-200 mt-1">{currentDetails.subtitle}</p>
                </div>
            </div>
            <div className="mt-6 text-gray-300 space-y-3">
                <p>By proceeding, you acknowledge and agree to the following:</p>
                <ul className="list-disc list-inside space-y-2 text-sm pl-2">
                    {currentDetails.points.map((point, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: point.replace(/REAL/g, '<strong class="text-white">REAL</strong>') }} />
                    ))}
                     <li>The creators of this application are not liable for any data discrepancies or financial losses.</li>
                </ul>
                <p>Please trade responsibly.</p>
            </div>
            <div className="mt-8 flex justify-end space-x-4">
                <Button onClick={onCancel} variant="secondary">Cancel</Button>
                <Button onClick={onAccept} className={currentDetails.buttonClass}>
                    I Understand and Accept the Risks
                </Button>
            </div>
        </Card>
    </div>
)};

const WelcomeModal: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="max-w-xl p-8 border-cyan-500/30">
                <div className="text-center">
                    <RocketIcon className="w-12 h-12 mx-auto text-cyan-400"/>
                    <h2 className="text-2xl font-bold text-white mt-4">Welcome to Xamanix</h2>
                    <p className="text-lg text-gray-300 mt-1">Your Professional Trading Bot Factory</p>
                </div>
                <div className="mt-6 text-gray-300/90 space-y-4 text-left">
                    <p className="flex items-start">
                        <ShieldCheckIcon className="w-6 h-6 mr-3 mt-0.5 text-green-400 flex-shrink-0" />
                        <span>
                            <strong>For Your Security & Reliability:</strong> This app helps you create and backtest strategies. For 24/7 trading, you will export a standalone Python script to run on your own secure computer or server.
                        </span>
                    </p>
                    <p className="flex items-start">
                        <ExclamationTriangleIcon className="w-6 h-6 mr-3 mt-0.5 text-yellow-400 flex-shrink-0" />
                         <span>
                             <strong>Important Note:</strong> This application does not run trades in the background of your device. Closing this app or your browser will stop all in-app activity. Only an exported bot running on your hardware can trade continuously.
                         </span>
                    </p>
                </div>
                <div className="mt-8 flex justify-center">
                    <Button onClick={onAccept} variant="primary" className="!px-8 !py-3 !text-lg">
                        I Understand, Let's Get Started!
                    </Button>
                </div>
            </Card>
        </div>
    );
};

const LiveBanner: React.FC = () => (
    <div className="bg-red-600 text-white text-center py-1 text-sm font-bold flex items-center justify-center flex-shrink-0">
        <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
        LIVE TRADING ACTIVE. REAL FUNDS ARE AT RISK.
    </div>
);


function AppContent() {
    const [view, setView] = useState('dashboard');
    const [positions, setPositions] = useState<Position[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [realizedPnl, setRealizedPnl] = useState(0);
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
    const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
    const [isAdminVisible, setIsAdminVisible] = useState(false);
    const [titleClickCount, setTitleClickCount] = useState(0);
    const titleClickTimer = useRef<number | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { isConnected, setIsConnected, apiKey, apiSecret, environment } = useAPI();
    const [aiSuggestion, setAiSuggestion] = useState({ suggestion: '', isLoading: false, error: null as string | null });
    const [showLiveTradingWarning, setShowLiveTradingWarning] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<{ apiKey: string; apiSecret: string, environment: 'testnet' | 'mainnet' } | null>(null);
    const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
    const [isLiveBotActive, setIsLiveBotActive] = useState<boolean>(false);

    useEffect(() => {
        const welcomeSeen = localStorage.getItem('xamanix-welcome-seen');
        if (!welcomeSeen) {
            setShowWelcomeModal(true);
        }
    }, []);

    const handleAcceptWelcome = () => {
        localStorage.setItem('xamanix-welcome-seen', 'true');
        setShowWelcomeModal(false);
    };

    const getIconForType = (type: Notification['type']): React.ReactElement => {
        switch (type) {
            case 'success': return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
            case 'error': return <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />;
            case 'info':
            default: return <BellIcon className="w-6 h-6 text-blue-400" />;
        }
    };

    const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
        const id = Date.now();
        const icon = getIconForType(type);
        setNotifications(prev => [...prev, { id, message, type, icon }]);
    }, []);
    
    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const logActivity = (message: string, type: ActivityLogEntry['type']) => {
        setActivityLog(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
    };
    
    const refreshAllData = useCallback(async () => {
        if (!isConnected || !apiKey || !apiSecret) return;
        try {
            const [fetchedAssets, fetchedPositions] = await Promise.all([
                verifyAndFetchBalances(apiKey, apiSecret, environment),
                fetchPositions(apiKey, apiSecret, environment)
            ]);
            setAssets(fetchedAssets);
            setPositions(fetchedPositions);
        } catch (e: any) {
            console.error("Failed to refresh data:", e.message);
            addNotification(`Failed to refresh data: ${e.message}`, 'error');
            if (e.message.includes('Invalid API')) {
                setIsConnected(false);
            }
        }
    }, [isConnected, apiKey, apiSecret, environment, addNotification, setIsConnected]);


    // Effect to re-verify connection on app load and periodically refresh data
    useEffect(() => {
        const validateAndFetchOnLoad = async () => {
            if (isConnected && apiKey && apiSecret) {
                logActivity(`Attempting to reconnect to ${environment}...`, 'info');
                await refreshAllData();
            }
        };
        validateAndFetchOnLoad();

        const intervalId = setInterval(() => {
            if (isConnected) {
                refreshAllData();
            }
        }, 15000); // Refresh every 15 seconds

        return () => clearInterval(intervalId);
    }, [isConnected, apiKey, apiSecret, environment, refreshAllData]);
    
    const handleConnectAttempt = async (apiKey: string, apiSecret: string, environment: 'testnet' | 'mainnet') => {
        setPendingConnection({ apiKey, apiSecret, environment });
        setShowLiveTradingWarning(true);
    };

    const handleConfirmLiveTrading = async () => {
        if (!pendingConnection) return;
        try {
            const { apiKey, apiSecret, environment } = pendingConnection;
            const fetchedAssets = await verifyAndFetchBalances(apiKey, apiSecret, environment);
            setAssets(fetchedAssets);
            setIsConnected(true);
            await refreshAllData();
            addNotification(`Successfully connected to ${environment} environment!`, 'success');
        } catch(e: any) {
             throw e; // Re-throw to be caught in SettingsView
        } finally {
            setShowLiveTradingWarning(false);
            setPendingConnection(null);
        }
    };

    const handleCancelLiveTrading = () => {
        setShowLiveTradingWarning(false);
        setPendingConnection(null);
    };
    
    const handleDisconnect = () => {
        setAssets([]);
        setPositions([]);
        setIsConnected(false);
    };
    
    const handleExecuteTrade = async (details: { asset: string; direction: 'LONG' | 'SHORT'; amountUSD: number; }) => {
        if (!isConnected) {
            addNotification("Cannot execute trade. Not connected to exchange.", 'error');
            return;
        }
        try {
            logActivity(`Executing trade: ${details.direction} ${details.amountUSD} USD of ${details.asset}.`, 'trade');
            await executeLiveTrade(details, apiKey, apiSecret, environment);
            addNotification(`Trade executed: ${details.direction} ${details.asset}`, 'success');
            setTimeout(refreshAllData, 2000); // Refresh data after a short delay
        } catch (error: any) {
            logActivity(`Trade failed: ${error.message}`, 'loss');
            addNotification(`Trade failed: ${error.message}`, 'error');
            throw error;
        }
    };
    
    const handleClosePosition = async (positionToClose: Position) => {
         if (!isConnected) {
            addNotification("Cannot close position. Not connected to exchange.", 'error');
            return;
        }
        try {
            logActivity(`Closing ${positionToClose.direction} position for ${positionToClose.asset}.`, 'trade');
            await closeLivePosition(positionToClose, apiKey, apiSecret, environment);
            // PnL calculation now happens based on fetched data, not locally
            addNotification(`Close order sent for ${positionToClose.asset}.`, 'info');
            setTimeout(refreshAllData, 2000); // Refresh data after a short delay
        } catch (error: any) {
            logActivity(`Failed to close position: ${error.message}`, 'loss');
            addNotification(`Failed to close position: ${error.message}`, 'error');
        }
    };
    
    const handleFormSubmit = (submission: Omit<UserSubmission, 'id' | 'timestamp' | 'read'>) => {
        const newSubmission: UserSubmission = {
            ...submission,
            id: `sub-${Date.now()}`,
            timestamp: new Date().toISOString(),
            read: false,
        };
        setSubmissions(prev => [...prev, newSubmission]);
        addNotification("Your message has been sent!", 'success');
    };
    
    const handleMarkSubmissionAsRead = (id: string) => {
        setSubmissions(submissions.map(s => s.id === id ? { ...s, read: true } : s));
    };

    const handleTitleClick = () => {
        if (titleClickTimer.current) {
            clearTimeout(titleClickTimer.current);
        }

        const newCount = titleClickCount + 1;
        setTitleClickCount(newCount);

        if (newCount === 5) {
            setIsAdminVisible(!isAdminVisible);
            setTitleClickCount(0);
            addNotification(`Admin mode ${!isAdminVisible ? 'enabled' : 'disabled'}.`, 'info');
        }

        titleClickTimer.current = window.setTimeout(() => {
            setTitleClickCount(0);
        }, 1000); // Reset after 1 second
    };

    useEffect(() => {
        const markPositionsAsSeen = () => {
            setPositions(prevPositions => {
                if (prevPositions.some(p => !p.seen)) {
                    return prevPositions.map(p => ({ ...p, seen: true }));
                }
                return prevPositions;
            });
        };

        const markSubmissionsAsRead = () => {
            setSubmissions(prevSubmissions => {
                if (prevSubmissions.some(s => !s.read)) {
                    return prevSubmissions.map(s => ({ ...s, read: true }));
                }
                return prevSubmissions;
            });
        };

        if (view === 'dashboard') {
            setTimeout(markPositionsAsSeen, 500);
        } else if (view === 'admin') {
            setTimeout(markSubmissionsAsRead, 500);
        }
    }, [view]);

    // Admin View Security
    if (view === 'admin' && !isAdminVisible) {
        setView('dashboard');
        return null;
    }
    
     const getTradingSuggestionHandler = async () => {
        setAiSuggestion({ suggestion: '', isLoading: true, error: null });
        try {
            const context = `Current PnL: $${realizedPnl.toFixed(2)}. Open Positions: ${positions.length}.`;
            const suggestion = await getTradingSuggestion(context);
            setAiSuggestion({ suggestion, isLoading: false, error: null });
        } catch (e: any) {
            setAiSuggestion({ suggestion: '', isLoading: false, error: "Couldn't get a suggestion right now." });
             addNotification("Failed to get AI suggestion.", 'error');
        }
    };

    const unseenPositionsCount = positions.filter(p => !p.seen).length;
    const unreadSubmissionsCount = submissions.filter(s => !s.read && s.type === 'complaint').length;

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <DashboardView 
                            history={MOCK_PORTFOLIO_HISTORY} 
                            positions={positions} 
                            realizedPnl={realizedPnl} 
                            assets={assets} 
                            onManualClosePosition={handleClosePosition}
                            activityLog={activityLog}
                            onGetSuggestion={getTradingSuggestionHandler}
                            aiSuggestion={aiSuggestion}
                        />;
            case 'trade':
                return <TradeView 
                            data={MOCK_TRADE_VIEW_DATA} 
                            onExecuteTrade={handleExecuteTrade} 
                            isConnected={isConnected} 
                        />;
            case 'wallet':
                return <WalletView assets={assets} setView={setView} />;
            case 'settings':
                return <SettingsView onConnectAttempt={handleConnectAttempt} onDisconnect={handleDisconnect} addNotification={addNotification} />;
            case 'strategy':
                return <StrategyView addNotification={addNotification} />;
            case 'history':
                return <HistoryView trades={closedTrades} positions={positions} />;
            case 'about':
                return <AboutView />;
            case 'contact':
                return <ContactView onFormSubmit={handleFormSubmit} />;
            case 'admin':
                return isAdminVisible ? <AdminView submissions={submissions} onMarkAsRead={handleMarkSubmissionAsRead} /> : null;
            default:
                return <div>Not Found</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100">
            {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}
            {showLiveTradingWarning && pendingConnection && (
                <LiveTradingWarningModal
                    onAccept={handleConfirmLiveTrading}
                    onCancel={handleCancelLiveTrading}
                    environment={pendingConnection.environment}
                />
            )}
            <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
            <Sidebar 
                currentView={view} 
                setView={setView} 
                isAdminVisible={isAdminVisible} 
                onTitleClick={handleTitleClick}
                positionsCount={unseenPositionsCount}
                unreadSubmissionsCount={unreadSubmissionsCount}
            />
            <main className="flex-1 flex flex-col overflow-hidden">
                {isConnected && environment === 'mainnet' && <LiveBanner />}
                <DashboardHeader
                    currentView={view}
                    isConnected={isConnected}
                    isLiveBotActive={isLiveBotActive}
                />
                <div className="flex-1 overflow-y-auto bg-black/20">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <APIProvider>
            <AppContent />
        </APIProvider>
    );
}