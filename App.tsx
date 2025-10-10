import React, { useState, useEffect, useRef } from 'react';
import type { PortfolioHistory, Asset, Position, TradeViewData, AnalysisResult, BacktestResult, ClosedTrade } from './types';
import { MOCK_PORTFOLIO_HISTORY, MOCK_ASSETS, MOCK_POSITIONS, MOCK_TRADE_VIEW_DATA, DEFAULT_SCRIPT } from './constants';
import { DashboardIcon, WalletIcon, SettingsIcon, TradeIcon, UserIcon, SunIcon, CheckCircleIcon, ArrowTrendingUpIcon, ChartBarIcon, SparklesIcon, LoadingIcon, RocketIcon, CloseIcon, LightBulbIcon, InfoIcon, ProfitIcon, LossIcon, HistoryIcon } from './components/icons';
import RecommendationsPanel from './components/RecommendationsPanel';
import BacktestResults from './components/BacktestResults';
import CodeViewer from './components/CodeViewer';
import { analyzeCode, runBacktest, generateEnhancedCode, getTradingSuggestion } from './services/geminiService';

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

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary'; className?: string; disabled?: boolean; }> = ({ children, onClick, variant = 'secondary', className = '', disabled = false }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variant === 'primary'
    ? 'bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-500'
    : 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500';
  return <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses} ${className}`}>{children}</button>;
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

const Input: React.FC<{ label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string, leadingAddon?: string }> = ({ label, type = "text", value, onChange, placeholder, leadingAddon }) => (
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
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-gray-700 border border-gray-600 rounded-md py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${leadingAddon ? 'pl-7' : 'px-3'}`}
            />
        </div>
    </div>
);


// View Components
const DashboardView: React.FC<{ history: PortfolioHistory; positions: Position[], realizedPnl: number, assets: Asset[] }> = ({ history, positions, realizedPnl, assets }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);

    const usdBalance = assets.find(a => a.name === 'USD')?.total ?? 0;
    const openPnl = positions.reduce((acc, pos) => acc + pos.pnl, 0);
    const totalValue = usdBalance + openPnl + realizedPnl;
    const yesterdaysValue = history.equity[history.equity.length - 2] ?? totalValue;
    const todaysChange = totalValue - yesterdaysValue;
    const todaysChangePct = todaysChange / yesterdaysValue * 100;

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
                    {positions.map(pos => (
                        <div key={pos.id} className="p-4 flex justify-between items-center hover:bg-gray-800 transition-colors">
                            <div>
                                <p className="font-bold">{pos.asset} <span className="text-xs font-normal text-gray-500">{pos.direction}</span></p>
                                <p className="text-sm text-gray-400">Entry: ${pos.entryPrice.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {pos.pnl >= 0 ? '+' : '-'}${Math.abs(pos.pnl).toFixed(2)} ({pos.pnlPercent.toFixed(2)}%)
                                </p>
                                <p className="text-sm text-gray-400">Size: {pos.size}</p>
                            </div>
                        </div>
                    ))}
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
}

const AIStatusPanel: React.FC<AIStatusPanelProps> = ({ isBotRunning, onToggleBot, isDeployable, realizedPnl, activityLog, onWithdrawProfits, onGetSuggestion, aiSuggestion }) => {
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
                <Button onClick={onWithdrawProfits} disabled={realizedPnl <= 0} className="w-full">
                    Withdraw Profits to Main Capital
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

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: marketData.timestamps.map(t => new Date(t).toLocaleTimeString()),
                datasets: [{
                    label: `${market} Price (${candleFrequency})`,
                    data: [...marketData.prices], 
                    borderColor: '#22d3ee',
                    borderWidth: 2,
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
            
            const currentData = chartInstance.current.data.datasets[0].data;
            const lastPrice = currentData[currentData.length - 1];

            let volatility = 0.0001;
            if (market.includes('SOL')) volatility = 0.0005;
            else if (market.includes('ETH')) volatility = 0.0002;
            
            const newPrice = lastPrice * (1 + (Math.random() - 0.5) * volatility);
            const newTimestamp = new Date().toLocaleTimeString();

            chartInstance.current.data.labels.push(newTimestamp);
            chartInstance.current.data.datasets[0].data.push(newPrice);
            
            chartInstance.current.data.labels.shift();
            chartInstance.current.data.datasets[0].data.shift();

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

const WalletView: React.FC<{ assets: Asset[] }> = ({ assets }) => (
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
                                <td className="px-6 py-4">{asset.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4">{asset.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4">{asset.inOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4">${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    </div>
);


const SettingsView: React.FC = () => {
    const [apiKey, setApiKey] = useState('********************');
    const [apiSecret, setApiSecret] = useState('********************');
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        console.log("Saving API keys (simulated)");
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
                <p className="text-sm text-gray-400 mb-6">Enter your exchange API key and secret. Your keys are stored securely and never exposed.</p>
                <div className="space-y-4">
                    <Input label="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                    <Input label="API Secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} />
                    <div className="pt-2 flex items-center justify-between">
                        <Button onClick={handleSave} variant="primary">Save Changes</Button>
                        {isSaved && <div className="flex items-center text-green-400"><CheckCircleIcon className="w-5 h-5 mr-2" /> API Keys Saved!</div>}
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
        if (!enhancedCode) return;
        onDeployScript(enhancedCode);
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
                                onClick={() => onDeployScript(originalCode)}
                                disabled={!originalCode.trim()}
                                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors shadow-lg"
                            >
                                <RocketIcon /> <span className="ml-2">Deploy Strategy</span>
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

const HistoryView: React.FC<{ trades: ClosedTrade[] }> = ({ trades }) => {
    const totalTrades = trades.length;
    const tradesWon = trades.filter(t => t.pnl > 0).length;
    const tradesLost = totalTrades - tradesWon;
    const totalWon = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLost = trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0);
    const netProfit = totalWon + totalLost;
    const winRate = totalTrades > 0 ? (tradesWon / totalTrades) * 100 : 0;

    const stats = [
        { label: 'Total Trades', value: totalTrades },
        { label: 'Trades Won', value: tradesWon },
        { label: 'Trades Lost', value: tradesLost },
        { label: 'Win Rate', value: `${winRate.toFixed(2)}%` },
        { label: 'Total Won', value: `$${totalWon.toFixed(2)}`, color: 'text-green-400' },
        { label: 'Total Lost', value: `$${Math.abs(totalLost).toFixed(2)}`, color: 'text-red-400' },
        { label: 'Net Profit', value: `${netProfit >= 0 ? '+' : '-'}$${Math.abs(netProfit).toFixed(2)}`, color: netProfit >= 0 ? 'text-green-400' : 'text-red-400' },
    ];
    
    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {stats.map(stat => (
                    <Card key={stat.label} className="p-4 text-center">
                        <p className="text-sm text-gray-400">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                    </Card>
                ))}
            </div>
            <Card>
                <h3 className="text-lg font-semibold text-white p-4 border-b border-gray-700">Trade Log</h3>
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
                            </tr>
                        </thead>
                        <tbody>
                            {trades.length > 0 ? trades.map(trade => (
                                <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-800/70 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-white">{trade.asset}</td>
                                    <td className={`px-6 py-4 font-semibold ${trade.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{trade.direction}</td>
                                    <td className="px-6 py-4">{trade.size.toFixed(6)}</td>
                                    <td className="px-6 py-4">${trade.entryPrice.toLocaleString()}</td>
                                    <td className="px-6 py-4">${trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className={`px-6 py-4 font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(trade.openTimestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(trade.closeTimestamp).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-gray-500">No closed trades yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};


// Main App Structure
const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
  >
    {icon}
    <span className="font-semibold">{label}</span>
  </button>
);

const Sidebar: React.FC<{ currentView: string; setView: (view: string) => void }> = ({ currentView, setView }) => (
  <aside className="w-64 bg-gray-900/70 border-r border-gray-800 p-4 flex flex-col">
    <div className="text-2xl font-bold text-white mb-10 px-2 flex items-center">
      <ArrowTrendingUpIcon className="w-8 h-8 mr-2 text-cyan-400"/>
      Phoenix AI
    </div>
    <nav className="space-y-2">
      <NavItem icon={<DashboardIcon />} label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setView('dashboard')} />
      <NavItem icon={<TradeIcon />} label="Trade" isActive={currentView === 'trade'} onClick={() => setView('trade')} />
      <NavItem icon={<ChartBarIcon />} label="Strategy" isActive={currentView === 'strategy'} onClick={() => setView('strategy')} />
      <NavItem icon={<HistoryIcon />} label="History" isActive={currentView === 'history'} onClick={() => setView('history')} />
      <NavItem icon={<WalletIcon />} label="Wallet" isActive={currentView === 'wallet'} onClick={() => setView('wallet')} />
      <NavItem icon={<SettingsIcon />} label="Settings" isActive={currentView === 'settings'} onClick={() => setView('settings')} />
    </nav>
    <div className="mt-auto">
        <Card className="p-4 text-center">
            <p className="text-sm text-gray-400">Upgrade to Pro for advanced analytics and unlimited strategies.</p>
            <Button variant="primary" className="w-full mt-4">Upgrade Now</Button>
        </Card>
    </div>
  </aside>
);

const Header: React.FC<{ title: string; isBotRunning: boolean; onToggleBot: () => void; isDeployable: boolean; }> = ({ title, isBotRunning, onToggleBot, isDeployable }) => (
    <header className="h-16 flex-shrink-0 bg-gray-900/70 border-b border-gray-800 flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-white capitalize">{title}</h1>
        <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 group relative">
                <span className={`text-sm font-semibold ${isBotRunning ? 'text-green-400' : 'text-gray-500'}`}>
                    Bot Status: {isBotRunning ? 'Running' : 'Stopped'}
                </span>
                <ToggleSwitch isEnabled={isBotRunning} onToggle={onToggleBot} isDisabled={!isDeployable} />
                {!isDeployable && (
                    <div className="absolute bottom-full mb-2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        Deploy a strategy from the 'Strategy' view to enable the bot.
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-4">
                <button className="text-gray-400 hover:text-white"><SunIcon /></button>
                <UserIcon className="w-8 h-8 text-gray-500" />
            </div>
        </div>
    </header>
);

export default function App(): React.ReactElement {
  type View = 'dashboard' | 'trade' | 'wallet' | 'settings' | 'strategy' | 'history';
  const [view, setView] = useState<View>('trade');
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const [showDeploySuccess, setShowDeploySuccess] = useState(false);
  const [showTradeNotification, setShowTradeNotification] = useState<string | null>(null);

  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistory>(MOCK_PORTFOLIO_HISTORY);
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);
  const [tradeViewData] = useState<TradeViewData>(MOCK_TRADE_VIEW_DATA);

  const [realizedPnl, setRealizedPnl] = useState(0);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState({ suggestion: '', isLoading: false, error: null as string | null });
  const [tradeHistory, setTradeHistory] = useState<ClosedTrade[]>([]);
  
  const handleDeployScript = (code: string) => {
    setActiveScript(code);
    if (isBotRunning) {
        setIsBotRunning(false);
    }
    setActivityLog([]);
    setShowDeploySuccess(true);
    setTimeout(() => setShowDeploySuccess(false), 5000);
  };
  
  const handleExecuteTrade = ({ asset, direction, amountUSD }: { asset: string, direction: 'LONG' | 'SHORT', amountUSD: number }) => {
    const usdBalance = assets.find(a => a.name === 'USD')?.available ?? 0;
    if (amountUSD > usdBalance) {
        setShowTradeNotification(`Error: Insufficient funds. Required: $${amountUSD.toFixed(2)}, Available: $${usdBalance.toFixed(2)}`);
        return;
    }

    const marketFrequencies = MOCK_TRADE_VIEW_DATA[asset];
    if (!marketFrequencies) return;
    const frequencyData = marketFrequencies['15m']; 
    const entryPrice = frequencyData.prices[frequencyData.prices.length - 1];
    
    const size = amountUSD / entryPrice;

    const newPosition: Position = {
        id: Date.now().toString(),
        asset: asset,
        direction: direction,
        entryPrice: entryPrice,
        size: parseFloat(size.toFixed(6)),
        pnl: 0,
        pnlPercent: 0,
        openTimestamp: new Date().toISOString(),
    };

    setPositions(prev => [newPosition, ...prev]);
    
    setAssets(prevAssets => prevAssets.map(a => {
        if (a.name === 'USD') {
            return {
                ...a,
                available: a.available - amountUSD,
                inOrders: a.inOrders + amountUSD,
            };
        }
        return a;
    }));
    
    setActivityLog(prev => [{
        timestamp: new Date().toISOString(),
        message: `Manual trade: Opened ${direction} ${asset} position worth $${amountUSD.toFixed(2)}.`,
        type: 'trade',
    }, ...prev]);
    
    const message = `${direction} order for ${size.toFixed(4)} ${asset.split('/')[0]} placed successfully.`;
    setShowTradeNotification(message);
    setTimeout(() => setShowTradeNotification(null), 5000);
  };
  
  const handleWithdrawProfits = () => {
    if (realizedPnl <= 0) return;
    const withdrawnAmount = realizedPnl;
    
    setAssets(prevAssets => prevAssets.map(asset => {
        if (asset.name === 'USD') {
            return {
                ...asset,
                total: asset.total + withdrawnAmount,
                available: asset.available + withdrawnAmount,
            };
        }
        return asset;
    }));
    
    setRealizedPnl(0);

    setShowTradeNotification(`Successfully withdrew $${withdrawnAmount.toFixed(2)} to main capital account.`);
    setTimeout(() => setShowTradeNotification(null), 5000);
    
    setActivityLog(prev => [{
      timestamp: new Date().toISOString(),
      message: `Withdrew $${withdrawnAmount.toFixed(2)} in profits to main capital.`,
      type: 'info',
    }, ...prev]);
  };

  const handleGetSuggestion = async () => {
    setAiSuggestion({ suggestion: '', isLoading: true, error: null });
    try {
        const context = `
            Current Segregated PnL: $${realizedPnl.toFixed(2)}.
            Open Positions: ${positions.length}.
            Recent Activity: ${activityLog.slice(-3).map(l => l.message).join('; ')}
        `;
        const suggestion = await getTradingSuggestion(context);
        setAiSuggestion({ suggestion, isLoading: false, error: null });
    } catch (error: any) {
        setAiSuggestion({ suggestion: '', isLoading: false, error: 'Failed to get suggestion from AI.' });
        console.error(error);
    }
  };

  useEffect(() => {
    const logEntry = activityLog.length > 0 ? activityLog[0].message : '';
    if (isBotRunning && activeScript && !logEntry.startsWith('AI Strategy started')) {
        setActivityLog(prev => [{
            timestamp: new Date().toISOString(),
            message: 'AI Strategy started.',
            type: 'info',
        }, ...prev]);
    } else if (!isBotRunning && activeScript && activityLog.length > 0 && !logEntry.startsWith('AI Strategy stopped')) {
        setActivityLog(prev => [{
            timestamp: new Date().toISOString(),
            message: 'AI Strategy stopped.',
            type: 'info',
        }, ...prev]);
    }
  }, [isBotRunning, activeScript]);


  useEffect(() => {
      let simulationInterval: number | undefined;
      if (isBotRunning && activeScript) {
          simulationInterval = window.setInterval(() => {
              // Part 1: Update PnL on all open positions
              setPositions(prevPositions => prevPositions.map(pos => {
                  const priceChange = (Math.random() - 0.49) * 0.01;
                  const pnlChange = pos.size * pos.entryPrice * priceChange;
                  const newPnl = pos.pnl + pnlChange;
                  return { ...pos, pnl: newPnl, pnlPercent: (newPnl / (pos.size * pos.entryPrice)) * 100 };
              }));

              // Part 2: Decide actions (close, open) based on current state
              const shouldClose = Math.random() > 0.85 && positions.length > 0;
              const shouldOpen = !shouldClose && Math.random() > 0.6 && positions.length < 5;
              
              // Action: Close a position
              if (shouldClose) {
                  const closedIndex = Math.floor(Math.random() * positions.length);
                  const closedPosition = positions[closedIndex];
                  const pnl = closedPosition.pnl;
                  const initialCapital = closedPosition.entryPrice * closedPosition.size;
                  
                  let exitPrice = 0;
                  if (closedPosition.direction === 'LONG') {
                      exitPrice = closedPosition.entryPrice + (pnl / closedPosition.size);
                  } else { // SHORT
                      exitPrice = closedPosition.entryPrice - (pnl / closedPosition.size);
                  }

                  const newClosedTrade: ClosedTrade = {
                      id: closedPosition.id,
                      asset: closedPosition.asset,
                      direction: closedPosition.direction,
                      entryPrice: closedPosition.entryPrice,
                      exitPrice: exitPrice,
                      size: closedPosition.size,
                      pnl: pnl,
                      openTimestamp: closedPosition.openTimestamp,
                      closeTimestamp: new Date().toISOString(),
                  };
                  setTradeHistory(prev => [newClosedTrade, ...prev]);

                  setAssets(prevAssets => prevAssets.map(a => {
                      if (a.name !== 'USD') return a;
                      const newAsset = { ...a, inOrders: a.inOrders - initialCapital };
                      if (pnl < 0) { // Loss comes from capital
                          newAsset.available += (initialCapital + pnl);
                          newAsset.total += pnl;
                      } else { // Profit is segregated
                          newAsset.available += initialCapital; // Only return initial capital
                      }
                      return newAsset;
                  }));

                  if (pnl >= 0) { // Add profit to segregated PnL pool
                      setRealizedPnl(prev => prev + pnl);
                  }

                  setPortfolioHistory(prev => {
                      const newEquity = [...prev.equity];
                      newEquity.push(newEquity[newEquity.length - 1] + pnl);
                      const newTimestamps = [...prev.timestamps, new Date().toISOString()];
                      return { equity: newEquity.slice(1), timestamps: newTimestamps.slice(1) };
                  });
                  
                  setActivityLog(prev => [{
                      timestamp: new Date().toISOString(),
                      message: `AI closed ${closedPosition.asset} for a ${pnl >= 0 ? 'profit' : 'loss'} of $${pnl.toFixed(2)}.`,
                      type: pnl >= 0 ? 'profit' : 'loss'
                  }, ...prev]);

                  setPositions(prev => prev.filter(p => p.id !== closedPosition.id));
              }

              // Action: Open a new position
              if (shouldOpen) {
                  const usdBalance = assets.find(a => a.name === 'USD')?.available ?? 0;
                  const TRADE_SIZE_USD = 500;
                  
                  if (usdBalance >= TRADE_SIZE_USD) {
                      const assetsList = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
                      const asset = assetsList[Math.floor(Math.random() * assetsList.length)];
                      const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
                      const entryPrice = MOCK_TRADE_VIEW_DATA[asset]['15m'].prices[0] * (1 + (Math.random() - 0.5) * 0.001);
                      const size = TRADE_SIZE_USD / entryPrice;

                      const newPosition: Position = {
                          id: Date.now().toString(), asset, direction, entryPrice, size, pnl: 0, pnlPercent: 0, openTimestamp: new Date().toISOString(),
                      };

                      setAssets(prevAssets => prevAssets.map(a => 
                          a.name === 'USD' ? { ...a, available: a.available - TRADE_SIZE_USD, inOrders: a.inOrders + TRADE_SIZE_USD } : a
                      ));

                      setActivityLog(prev => [{
                          timestamp: new Date().toISOString(),
                          message: `AI opened new ${direction} position for ${asset} ($${TRADE_SIZE_USD}).`,
                          type: 'trade'
                      }, ...prev]);
                      
                      setPositions(prev => [...prev, newPosition]);
                  } else {
                      setActivityLog(prev => {
                          if (prev.length > 0 && prev[0].message.startsWith('Insufficient capital')) return prev;
                          return [{
                              timestamp: new Date().toISOString(),
                              message: `Insufficient capital. Required: $${TRADE_SIZE_USD}, Available: $${usdBalance.toFixed(2)}.`,
                              type: 'info'
                          }, ...prev];
                      });
                  }
              }

          }, 3000);
      }
      return () => clearInterval(simulationInterval);
  }, [isBotRunning, activeScript, assets, positions]);


  const renderView = () => {
    const isDeployable = !!activeScript;
    const handleToggleBot = () => {
        if(isDeployable) setIsBotRunning(prev => !prev);
    };

    switch (view) {
      case 'dashboard': return <DashboardView history={portfolioHistory} positions={positions} realizedPnl={realizedPnl} assets={assets} />;
      case 'trade': return <TradeView 
                            data={tradeViewData} 
                            onExecuteTrade={handleExecuteTrade} 
                            isBotRunning={isBotRunning}
                            onToggleBot={handleToggleBot}
                            isDeployable={isDeployable}
                            realizedPnl={realizedPnl}
                            activityLog={activityLog}
                            onWithdrawProfits={handleWithdrawProfits}
                            onGetSuggestion={handleGetSuggestion}
                            aiSuggestion={aiSuggestion}
                          />;
      case 'wallet': return <WalletView assets={assets} />;
      case 'settings': return <SettingsView />;
      case 'strategy': return <StrategyView onDeployScript={handleDeployScript} />;
      case 'history': return <HistoryView trades={tradeHistory} />;
      default: return <DashboardView history={portfolioHistory} positions={positions} realizedPnl={realizedPnl} assets={assets} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <Sidebar currentView={view} setView={setView as (view: string) => void} />
      <div className="flex-1 flex flex-col relative">
        <Header 
            title={view} 
            isBotRunning={isBotRunning} 
            onToggleBot={() => {
                if(activeScript) setIsBotRunning(prev => !prev)
            }}
            isDeployable={!!activeScript}
        />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
        {showDeploySuccess && (
            <div className="absolute top-20 right-6 bg-green-600/90 backdrop-blur-sm border border-green-500 text-white p-4 rounded-lg shadow-2xl flex items-start z-50 animate-fade-in-down">
                <CheckCircleIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0" />
                <div>
                    <p className="font-bold">Strategy Deployed!</p>
                    <p className="text-sm text-green-100">You can now enable the bot in the Trade view or header.</p>
                </div>
                <button onClick={() => setShowDeploySuccess(false)} className="ml-4 -mt-2 -mr-2 p-1 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        )}
         {showTradeNotification && (
            <div className="absolute top-20 right-6 bg-cyan-600/90 backdrop-blur-sm border border-cyan-500 text-white p-4 rounded-lg shadow-2xl flex items-start z-50 animate-fade-in-down">
                <InfoIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0" />
                <div>
                    <p className="font-bold">Notification</p>
                    <p className="text-sm text-cyan-100">{showTradeNotification}</p>
                </div>
                <button onClick={() => setShowTradeNotification(null)} className="ml-4 -mt-2 -mr-2 p-1 rounded-full hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-white">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
