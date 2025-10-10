
import React, { useState, useEffect, useRef } from 'react';
import type { PortfolioHistory, Asset, Position, TradeViewData, AnalysisResult, BacktestResult, ClosedTrade, UserSubmission, Notification } from './types';
import { MOCK_PORTFOLIO_HISTORY, MOCK_ASSETS, MOCK_POSITIONS, MOCK_TRADE_VIEW_DATA, DEFAULT_SCRIPT } from './constants';
import { DashboardIcon, WalletIcon, SettingsIcon, TradeIcon, UserIcon, SunIcon, CheckCircleIcon, ArrowTrendingUpIcon, ChartBarIcon, SparklesIcon, LoadingIcon, RocketIcon, CloseIcon, LightBulbIcon, InfoIcon, ProfitIcon, LossIcon, HistoryIcon, AboutIcon, ContactIcon, AdminIcon, ExclamationTriangleIcon, BellIcon } from './components/icons';
import RecommendationsPanel from './components/RecommendationsPanel';
import BacktestResults from './components/BacktestResults';
import CodeViewer from './components/CodeViewer';
import { analyzeCode, runBacktest, generateEnhancedCode, getTradingSuggestion } from './services/geminiService';
import { APIProvider, useAPI } from './contexts/APIContext';

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

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void; isDisabled?: boolean; }> = ({ isEnabled, onToggle, isDisabled = false }) => (
  <button
    onClick={onToggle}
    disabled={isDisabled}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-600'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    aria-label="Toggle Bot Status"
  >
    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

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


// View Components
const DashboardView: React.FC<{ history: PortfolioHistory; positions: Position[], realizedPnl: number, assets: Asset[], onManualClosePosition: (positionId: string) => void }> = ({ history, positions, realizedPnl, assets, onManualClosePosition }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);

    const totalAssetsValue = assets.reduce((sum, asset) => sum + asset.usdValue, 0);
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
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 md:col-span-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-400">Total Portfolio Value</p>
                            <p className="text-4xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`text-right ${todaysChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            <p className="font-semibold">{todaysChange >= 0 ? '+' : ''}{todaysChange.toFixed(2)} ({todaysChangePct.toFixed(2)}%)</p>
                            <p className="text-sm">Today</p>
                        </div>
                    </div>
                    <div className="h-48 mt-4">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </Card>
                 <Card className="p-6 flex flex-col justify-center">
                    <p className="text-sm text-gray-400">Total Realized PnL</p>
                    <p className={`text-4xl font-bold ${realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {realizedPnl >= 0 ? '+' : '-'}${Math.abs(realizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Cumulative profit/loss from all closed bot trades.</p>
                </Card>
            </div>


            <Card>
                <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700">Open Positions</h3>
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
                                        {pos.pnl >= 0 ? '+' : '-'}${Math.abs(pos.pnl).toFixed(2)} ({pos.pnlPercent.toFixed(2)}%)
                                    </p>
                                </div>
                                <div className="text-right">
                                    <Button onClick={() => onManualClosePosition(pos.id)} className="!py-1.5 !px-3 text-sm">Close</Button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-8">No open positions.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

interface AIStatusPanelProps {
    isBotRunning: boolean;
    onToggleBot: () => void;
    isDeployable: boolean;
    realizedPnl: number;
    activityLog: ActivityLogEntry[];
    onWithdrawProfits: () => void;
    onGetSuggestion: () => Promise<void>;
    aiSuggestion: { suggestion: string, isLoading: boolean, error: string | null };
    isAdminVisible: boolean;
}

const AIStatusPanel: React.FC<AIStatusPanelProps> = ({ isBotRunning, onToggleBot, isDeployable, realizedPnl, activityLog, onWithdrawProfits, onGetSuggestion, aiSuggestion, isAdminVisible }) => {
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
            <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700 flex-shrink-0">AI Strategy Status</h3>
            <div className="p-4 space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div className="relative group">
                        <div className="flex items-center">
                            <label className="font-medium text-gray-300 mr-3">Use AI Strategy</label>
                            <ToggleSwitch isEnabled={isBotRunning} onToggle={onToggleBot} isDisabled={!isDeployable} />
                        </div>
                        {!isDeployable && (
                            <div className="absolute top-full mt-2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                Deploy a strategy from the 'Strategy' view to enable the bot.
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Live Segregated PnL</p>
                    <p className={`text-2xl font-bold ${realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                         {realizedPnl >= 0 ? '+' : '-'}${Math.abs(realizedPnl).toFixed(2)}
                    </p>
                </div>
                <Button onClick={onWithdrawProfits} disabled={!isAdminVisible && realizedPnl <= 0} className="w-full">
                     {isAdminVisible 
                        ? (realizedPnl > 0 ? 'Withdraw via API (Admin)' : 'Reset PnL to Zero') 
                        : 'Withdraw Profits to Main Capital'
                    }
                </Button>
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
                    )) : <p className="text-center text-sm text-gray-500 pt-8">Bot is idle. Start the AI Strategy to see live activity.</p>}
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

interface TradeViewProps {
  data: TradeViewData;
  onExecuteTrade: (details: { asset: string, direction: 'LONG' | 'SHORT', amountUSD: number }) => void;
  isBotRunning: boolean;
  onToggleBot: () => void;
  isDeployable: boolean;
  realizedPnl: number;
  activityLog: ActivityLogEntry[];
  onWithdrawProfits: () => void;
  onGetSuggestion: () => Promise<void>;
  aiSuggestion: { suggestion: string; isLoading: boolean; error: string | null; };
  isAdminVisible: boolean;
}

const TradeView: React.FC<TradeViewProps> = (props) => {
    const { data, onExecuteTrade, isBotRunning, aiSuggestion, onGetSuggestion } = props;
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);
    const [market, setMarket] = useState(Object.keys(data)[0]);

    const candleFrequencies = ['5m', '15m', '1h', '4h'];
    const [candleFrequency, setCandleFrequency] = useState(candleFrequencies[1]);

    const marketData = data[market]?.[candleFrequency];

    const [risk, setRisk] = useState('1.5');
    const [stopLoss, setStopLoss] = useState('2.0');
    const [takeProfit, setTakeProfit] = useState('3.0');
    const [tradeAmount, setTradeAmount] = useState('100');

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

        const initialPrices = [...marketData.prices];
        const initialEmaData = calculateEMA(initialPrices, movingAveragePeriod);

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: marketData.timestamps.map(t => new Date(t).toLocaleTimeString()),
                datasets: [{
                    label: `${market} Price (${candleFrequency})`,
                    data: initialPrices, 
                    borderColor: '#22d3ee',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                }, {
                    label: `EMA (${movingAveragePeriod})`,
                    data: initialEmaData,
                    borderColor: '#ef4444', // Red color
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { labels: { color: '#d1d5db' } } 
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { ticks: { color: '#9ca3af', callback: (value: any) => `$${Number(value).toLocaleString()}` }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });

        const intervalId = setInterval(() => {
            if (!chartInstance.current) return;
            
            const priceDataset = chartInstance.current.data.datasets[0];
            const maDataset = chartInstance.current.data.datasets[1];
            const lastPrice = priceDataset.data[priceDataset.data.length - 1];

            let volatility = 0.0001;
            if (market.includes('SOL')) volatility = 0.0005;
            else if (market.includes('ETH')) volatility = 0.0002;
            
            const newPrice = lastPrice * (1 + (Math.random() - 0.5) * volatility);
            const newTimestamp = new Date().toLocaleTimeString();

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
    
    const handleTrade = (direction: 'LONG' | 'SHORT') => {
        const amount = parseFloat(tradeAmount);
        if (isNaN(amount) || amount <= 0) {
            console.error("Invalid trade amount");
            return;
        }
        onExecuteTrade({
            asset: market,
            direction: direction,
            amountUSD: amount
        });
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
                <AIStatusPanel
                    isBotRunning={props.isBotRunning}
                    onToggleBot={props.onToggleBot}
                    isDeployable={props.isDeployable}
                    realizedPnl={props.realizedPnl}
                    activityLog={props.activityLog}
                    onWithdrawProfits={props.onWithdrawProfits}
                    onGetSuggestion={onGetSuggestion}
                    aiSuggestion={aiSuggestion}
                    isAdminVisible={props.isAdminVisible}
                />
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
                                disabled={isBotRunning}
                            >
                                Buy / Long
                            </Button>
                            <Button 
                                onClick={() => handleTrade('SHORT')} 
                                variant="primary" 
                                className="!bg-red-600 !hover:bg-red-700 !focus:ring-red-500 px-6 py-2.5 w-full"
                                disabled={isBotRunning}
                            >
                                Sell / Short
                            </Button>
                             {isBotRunning && (
                                <div className="absolute bottom-full mb-2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    Manual trading is disabled while AI Strategy is active.
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
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
            </Card>
        </div>
    );
};


import { verifyAndFetchBalances, transferFunds } from './services/bybitService';
import { LinkIcon } from './components/icons';

const SettingsView: React.FC<{ onConnectSuccess: (assets: Asset[]) => void, onDisconnect: () => void, addNotification: (message: string, type: Notification['type']) => void }> = ({ onConnectSuccess, onDisconnect, addNotification }) => {
    const { apiKey, setApiKey, apiSecret, setApiSecret, isConnected, setIsConnected } = useAPI();
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerifyAndConnect = async () => {
        setIsVerifying(true);
        setError(null);
        try {
            const fetchedAssets = await verifyAndFetchBalances(apiKey, apiSecret);
            onConnectSuccess(fetchedAssets);
            setIsConnected(true);
            addNotification("Successfully connected to exchange!", 'success');
        } catch (e: any) {
            const errorMessage = e.message || "An unknown error occurred.";
            setError(errorMessage);
            setIsConnected(false);
            addNotification(errorMessage, 'error');
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleDisconnect = () => {
        setApiKey('');
        setApiSecret('');
        setIsConnected(false);
        onDisconnect();
        addNotification("Disconnected from exchange.", 'info');
    };

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Enter your Bybit (or other compatible exchange) API key and secret. Your keys are stored securely and never exposed.
                </p>
                <div className="space-y-4">
                    <Input label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} disabled={isConnected} />
                    <Input label="API Secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} disabled={isConnected} />
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
                                <div className="flex items-center text-green-400"><CheckCircleIcon className="w-5 h-5 mr-2" /> Connected</div>
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

const StrategyView: React.FC<{ onDeployScript: (code: string) => void }> = ({ onDeployScript }) => {
    const [originalCode, setOriginalCode] = useState<string>(DEFAULT_SCRIPT);
    const [enhancedCode, setEnhancedCode] = useState<string>('');
  
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
  
    const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
    const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
    const [isDeployed, setIsDeployed] = useState<boolean>(false);
  
    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
    const [isBacktestRunning, setIsBacktestRunning] = useState<boolean>(false);
    const [backtestError, setBacktestError] = useState<string | null>(null);
    const [activeBacktest, setActiveBacktest] = useState<'none' | 'original' | 'enhanced'>('none');

    const handleAnalyze = async () => {
        setIsLoadingAnalysis(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        setAppliedRecommendations(new Set());
        setEnhancedCode('');
        setBacktestResult(null);
        setBacktestError(null);
        setActiveBacktest('none');
        setIsDeployed(false);
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
        setIsDeployed(false);
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
        setIsDeployed(false);
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
    
    const handleDeploy = () => {
        const codeToDeploy = enhancedCode || originalCode;
        if (!codeToDeploy) return;
        onDeployScript(codeToDeploy);
        setIsDeployed(true);
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
                        <p className="text-gray-400 mb-6">Paste your Python trading script below to analyze, enhance, or deploy it directly.</p>
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
                                onClick={handleDeploy}
                                disabled={!originalCode.trim() || isDeployed}
                                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors shadow-lg"
                            >
                                <RocketIcon /> <span className="ml-2">{isDeployed ? 'Deployed' : 'Deploy Original Strategy'}</span>
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
                            onDeployScript={handleDeploy}
                            isDeployed={isDeployed}
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
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Seamless Deployment:</strong> Deploy your optimized strategy to a simulated live environment with a single click.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Real-Time Monitoring:</strong> Keep track of your bot's performance, open positions, and PnL through an intuitive dashboard.</span></li>
                        <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-2 mt-1 text-cyan-400 flex-shrink-0" /><span><strong>Exchange Integration:</strong> Connect securely to your exchange account to manage your portfolio.</span></li>
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

const StatusIndicator: React.FC<{ label: string; status: 'positive' | 'neutral' | 'negative'; text: string; }> = ({ label, status, text }) => {
    const colorClasses = {
        positive: 'bg-green-500',
        neutral: 'bg-gray-500',
        negative: 'bg-red-500',
    };
    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">{label}:</span>
            <div className="flex items-center space-x-1.5">
                <div className={`w-2 h-2 rounded-full ${colorClasses[status]}`}></div>
                <span className="text-sm font-semibold text-white">{text}</span>
            </div>
        </div>
    );
};

const DashboardHeader: React.FC<{
    currentView: string;
    isBotRunning: boolean;
    isDeployable: boolean;
    isConnected: boolean;
}> = ({ currentView, isBotRunning, isDeployable, isConnected }) => {
    const title = currentView.charAt(0).toUpperCase() + currentView.slice(1);

    const botStatus = isDeployable ? (isBotRunning ? 'Active' : 'Idle') : 'Not Deployed';
    const botStatusColor = isDeployable ? (isBotRunning ? 'positive' : 'neutral') : 'negative';
    
    return (
        <div className="h-16 flex-shrink-0 bg-gray-800/30 border-b border-gray-700 flex items-center justify-between px-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <div className="flex items-center space-x-6">
                <StatusIndicator 
                    label="AI Bot"
                    status={botStatusColor}
                    text={botStatus}
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


function AppContent() {
    const [view, setView] = useState('dashboard');
    const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);
    const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
    const [isBotRunning, setIsBotRunning] = useState(false);
    const [isDeployable, setIsDeployable] = useState(false);
    const [realizedPnl, setRealizedPnl] = useState(124.50);
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
    const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
    const [isAdminVisible, setIsAdminVisible] = useState(false);
    const [titleClickCount, setTitleClickCount] = useState(0);
    const titleClickTimer = useRef<number | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { isConnected, setIsConnected, apiKey, apiSecret } = useAPI();
    const [aiSuggestion, setAiSuggestion] = useState({ suggestion: '', isLoading: false, error: null as string | null });

    const getIconForType = (type: Notification['type']): React.ReactElement => {
        switch (type) {
            case 'success': return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
            case 'error': return <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />;
            case 'info':
            default: return <BellIcon className="w-6 h-6 text-blue-400" />;
        }
    };

    const addNotification = (message: string, type: Notification['type'] = 'info') => {
        const id = Date.now();
        const icon = getIconForType(type);
        setNotifications(prev => [...prev, { id, message, type, icon }]);
    };
    
    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const logActivity = (message: string, type: ActivityLogEntry['type']) => {
        setActivityLog(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
    };

    // Effect to re-verify connection on app load
    useEffect(() => {
        const validateAndFetchOnLoad = async () => {
            // Only run if localStorage indicates a connection
            if (isConnected && apiKey && apiSecret) {
                try {
                    const fetchedAssets = await verifyAndFetchBalances(apiKey, apiSecret);
                    setAssets(fetchedAssets);
                    addNotification("Reconnected to exchange successfully.", 'info');
                } catch (e: any) {
                    console.error("Failed to reconnect with stored credentials:", e.message);
                    // If keys are no longer valid, disconnect the session in context and revert data
                    setIsConnected(false); 
                    setAssets(MOCK_ASSETS);
                    addNotification("Failed to reconnect with stored API keys. Please verify.", 'error');
                }
            }
        };

        validateAndFetchOnLoad();
    }, []); // Empty dependency array ensures this runs only once on mount
    
    const handleDeployScript = (code: string) => {
        setIsDeployable(true);
        logActivity(`New strategy deployed. Bot is now ready.`, 'info');
        addNotification("Strategy deployed! Bot is now ready to be activated.", 'success');
    };

    const handleToggleBot = () => {
        setIsBotRunning(!isBotRunning);
        logActivity(`AI Strategy ${!isBotRunning ? 'activated' : 'deactivated'}.`, 'info');
    };

    const handleConnectSuccess = (fetchedAssets: Asset[]) => {
        setAssets(fetchedAssets);
    };
    
    const handleDisconnect = () => {
        setAssets(MOCK_ASSETS); // Revert to mock assets on disconnect
        setIsConnected(false);
    };
    
    const handleExecuteTrade = (details: { asset: string; direction: 'LONG' | 'SHORT'; amountUSD: number; }) => {
        const newPosition: Position = {
            id: `pos-${Date.now()}`,
            asset: details.asset,
            direction: details.direction,
            entryPrice: MOCK_TRADE_VIEW_DATA[details.asset]['15m'].prices.slice(-1)[0],
            size: details.amountUSD / MOCK_TRADE_VIEW_DATA[details.asset]['15m'].prices.slice(-1)[0],
            pnl: 0,
            pnlPercent: 0,
            openTimestamp: new Date().toISOString(),
            seen: false,
        };
        setPositions(prev => [...prev, newPosition]);
        logActivity(`Manual trade executed: ${details.direction} ${newPosition.size.toFixed(4)} ${details.asset}.`, 'trade');
        addNotification(`Trade executed: ${details.direction} ${details.asset}`, 'success');
    };
    
    const handleClosePosition = (positionId: string, source: 'Manual' | 'AI' = 'Manual') => {
        const posToClose = positions.find(p => p.id === positionId);
        if (!posToClose) return;

        const exitPrice = MOCK_TRADE_VIEW_DATA[posToClose.asset]['15m'].prices.slice(-1)[0] * (1 + (Math.random() - 0.5) * 0.002);
        const pnl = (exitPrice - posToClose.entryPrice) * posToClose.size * (posToClose.direction === 'LONG' ? 1 : -1);
        
        const newClosedTrade: ClosedTrade = {
            id: `trade-${Date.now()}`,
            asset: posToClose.asset,
            direction: posToClose.direction,
            entryPrice: posToClose.entryPrice,
            exitPrice: exitPrice,
            size: posToClose.size,
            pnl: pnl,
            openTimestamp: posToClose.openTimestamp,
            closeTimestamp: new Date().toISOString()
        };
        
        setClosedTrades(prev => [...prev, newClosedTrade]);
        setPositions(prev => prev.filter(p => p.id !== positionId));
        setRealizedPnl(prev => prev + pnl);

        const logMessage = source === 'AI' 
            ? `AI closed ${posToClose.asset} position. PnL: $${pnl.toFixed(2)}.`
            : `Position closed for ${posToClose.asset}. PnL: $${pnl.toFixed(2)}.`;
        
        logActivity(logMessage, pnl >= 0 ? 'profit' : 'loss');
        addNotification(`Closed ${posToClose.asset} position for $${pnl.toFixed(2)} PnL.`, 'info');
    };
    
    const handleWithdrawProfits = async () => {
        if (isAdminVisible) {
            if (realizedPnl <= 0) {
                addNotification(`Admin Action: Segregated PnL of $${realizedPnl.toFixed(2)} has been reset.`, 'info');
                logActivity('Admin reset segregated PnL to zero.', 'info');
                setRealizedPnl(0);
            } else {
                if (!isConnected) {
                    addNotification("Cannot withdraw. Please connect to the exchange first.", 'error');
                    return;
                }
                
                const amountToWithdraw = realizedPnl;
                
                try {
                    addNotification(`Initiating transfer of $${amountToWithdraw.toFixed(2)}...`, 'info');
                    await transferFunds(amountToWithdraw, 'USDT');

                    setAssets(prevAssets => {
                        return prevAssets.map(asset => {
                            if (asset.name === 'USDT' || asset.name === 'USD') {
                                return {
                                    ...asset,
                                    total: asset.total + amountToWithdraw,
                                    available: asset.available + amountToWithdraw,
                                    usdValue: asset.usdValue + amountToWithdraw,
                                };
                            }
                            return asset;
                        });
                    });

                    setRealizedPnl(0);

                    logActivity(`Admin simulated API transfer of $${amountToWithdraw.toFixed(2)} to main account.`, 'profit');
                    addNotification(`Successfully transferred $${amountToWithdraw.toFixed(2)} to your main exchange account.`, 'success');

                } catch (error: any) {
                    addNotification(`API Transfer Failed: ${error.message}`, 'error');
                    logActivity('Failed to simulate API profit withdrawal.', 'loss');
                }
            }
        } else {
            if (realizedPnl > 0) {
                addNotification(`$${realizedPnl.toFixed(2)} profits withdrawn to main capital.`, 'success');
                logActivity('Profits withdrawn to main capital.', 'info');
                setRealizedPnl(0);
            }
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
    
    // AI Bot Trading Simulation Logic
    useEffect(() => {
        let botInterval: number | null = null;
    
        const simulateBotAction = () => {
            const shouldClose = Math.random() < 0.3 && positions.length > 0;
            const maxPositions = 5; // As defined in settings view
    
            if (shouldClose) {
                // Close a random existing position
                const posToClose = positions[Math.floor(Math.random() * positions.length)];
                handleClosePosition(posToClose.id, 'AI');
            } else if (positions.length < maxPositions) {
                // Open a new position
                const markets = Object.keys(MOCK_TRADE_VIEW_DATA).filter(m => m !== 'NGN/USD');
                const asset = markets[Math.floor(Math.random() * markets.length)];
                const direction = Math.random() < 0.5 ? 'LONG' : 'SHORT';
                const amountUSD = Math.floor(Math.random() * (500 - 50 + 1)) + 50; // Random amount: $50-$500
    
                const newPosition: Position = {
                    id: `pos-${Date.now()}`,
                    asset: asset,
                    direction: direction,
                    entryPrice: MOCK_TRADE_VIEW_DATA[asset]['15m'].prices.slice(-1)[0],
                    size: amountUSD / MOCK_TRADE_VIEW_DATA[asset]['15m'].prices.slice(-1)[0],
                    pnl: 0,
                    pnlPercent: 0,
                    openTimestamp: new Date().toISOString(),
                    seen: false,
                };
                setPositions(prev => [...prev, newPosition]);
                logActivity(`AI opened ${direction} on ${asset} for $${amountUSD.toFixed(2)}.`, 'trade');
            }
        };
    
        if (isBotRunning) {
            logActivity('AI Bot is scanning for opportunities...', 'info');
            botInterval = window.setInterval(simulateBotAction, 7000); // Act every 7 seconds
        }
    
        return () => {
            if (botInterval) {
                clearInterval(botInterval);
            }
        };
    }, [isBotRunning, positions]);

    // Admin View Security
    if (view === 'admin' && !isAdminVisible) {
        setView('dashboard');
        return null;
    }
    
     const getTradingSuggestionHandler = async () => {
        setAiSuggestion({ suggestion: '', isLoading: true, error: null });
        try {
            const context = `Current PnL: $${realizedPnl.toFixed(2)}. Open Positions: ${positions.length}. Bot Status: ${isBotRunning ? 'Active' : 'Idle'}`;
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
                return <DashboardView history={MOCK_PORTFOLIO_HISTORY} positions={positions} realizedPnl={realizedPnl} assets={assets} onManualClosePosition={handleClosePosition} />;
            case 'trade':
                return <TradeView data={MOCK_TRADE_VIEW_DATA} onExecuteTrade={handleExecuteTrade} isBotRunning={isBotRunning} onToggleBot={handleToggleBot} isDeployable={isDeployable} realizedPnl={realizedPnl} activityLog={activityLog} onWithdrawProfits={handleWithdrawProfits} onGetSuggestion={getTradingSuggestionHandler} aiSuggestion={aiSuggestion} isAdminVisible={isAdminVisible} />;
            case 'wallet':
                return <WalletView assets={assets} setView={setView} />;
            case 'settings':
                return <SettingsView onConnectSuccess={handleConnectSuccess} onDisconnect={handleDisconnect} addNotification={addNotification} />;
            case 'strategy':
                return <StrategyView onDeployScript={handleDeployScript} />;
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
                <DashboardHeader
                    currentView={view}
                    isBotRunning={isBotRunning}
                    isDeployable={isDeployable}
                    isConnected={isConnected}
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
