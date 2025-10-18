
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Menu, X, LogOut, TrendingUp, DollarSign, AlertCircle, CheckCircle, Send, Download, Bell, Play, Pause, Trash2, Mail, MessageSquare, BarChart2 } from 'lucide-react';

const Toggle = ({ enabled, onChange }) => (
  <button onClick={onChange} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${enabled ? 'bg-cyan-500' : 'bg-slate-600'}`}>
    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default function XamanixTradingBot() {
  const [user, setUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backtestConfig, setBacktestConfig] = useState({
    symbol: 'BTC/USDT',
    period: '1y',
    interval: '1h',
    capital: 500000,
    macdFast: 12,
    macdSlow: 26,
    atrPeriod: 14,
    atrMultiplier: 2.0,
    riskRewardRatio: 2.0,
  });
  const [backtestResults, setBacktestResults] = useState(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [liveTrading, setLiveTrading] = useState(false);
  const [paperTrading, setPaperTrading] = useState(false);
  const [watchlist, setWatchlist] = useState([
    { symbol: 'BTC/USDT', price: 42500, change: 2.5 },
    { symbol: 'ETH/USDT', price: 2250, change: -1.2 },
    { symbol: 'SOL/USDT', price: 98.5, change: 3.8 },
  ]);
  const [newAsset, setNewAsset] = useState('');
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'trade', message: 'BTC/USDT LONG signal triggered', time: '2 min ago', read: false },
    { id: 2, type: 'profit', message: 'Trade closed with +$2,450 profit', time: '15 min ago', read: false },
    { id: 3, type: 'warning', message: 'Drawdown approaching limit (18%)', time: '1 hour ago', read: true },
  ]);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    telegram: true,
    email: true,
    dailyReports: false,
  });
  const [securitySettings, setSecuritySettings] = useState({
    '2fa': false,
  });


  const generateBacktestResults = () => {
    setIsBacktesting(true);
    setTimeout(() => {
      const trades = [];
      let balance = backtestConfig.capital;
      const equityCurve = [{ date: 'Day 1', equity: balance }];
      let peakEquity = balance;
      let maxDrawdown = 0;
      let grossProfit = 0;
      let grossLoss = 0;

      for (let i = 0; i < 150; i++) {
        const pnl = (Math.random() - 0.48) * (balance * 0.02);
        balance += pnl;
        trades.push({
          id: i + 1,
          date: new Date(Date.now() - (150 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          type: pnl > 0 ? 'LONG' : 'SHORT',
          entry: 40000 + Math.random() * 5000,
          exit: 40000 + Math.random() * 5000,
          pnl: pnl.toFixed(2),
        });
        equityCurve.push({ date: `Day ${i + 2}`, equity: balance });
        
        peakEquity = Math.max(peakEquity, balance);
        const drawdown = (peakEquity - balance) / peakEquity;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        if (pnl > 0) {
          grossProfit += pnl;
        } else {
          grossLoss += Math.abs(pnl);
        }
      }

      const winTrades = trades.filter(t => parseFloat(t.pnl) > 0).length;
      const totalReturn = ((balance - backtestConfig.capital) / backtestConfig.capital) * 100;
      const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : Infinity;

      setBacktestResults({
        finalEquity: balance.toFixed(2),
        initialCapital: backtestConfig.capital,
        totalReturn: totalReturn.toFixed(2),
        winRate: ((winTrades / trades.length) * 100).toFixed(1),
        totalTrades: trades.length,
        winTrades: winTrades,
        maxDrawdown: (maxDrawdown * 100).toFixed(1),
        profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
        sharpeRatio: (1.9).toFixed(2),
        sortinoRatio: (2.5).toFixed(2),
        trades: trades,
        equityCurve: equityCurve
      });
      setIsBacktesting(false);
      addAlert('backtest', `Backtest completed: ${trades.length} trades`);
    }, 2000);
  };

  const addAlert = (type, message) => {
    const newAlert = {
      id: alerts.length + 1,
      type,
      message,
      time: 'now',
      read: false
    };
    setAlerts([newAlert, ...alerts.slice(0, 4)]);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      setUser({
        name: loginEmail.split('@')[0],
        email: loginEmail,
        accountBalance: 500000
      });
      setIsLoginOpen(false);
      setCurrentPage('dashboard');
      setLoginEmail('');
      setLoginPassword('');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('home');
    setMobileMenuOpen(false);
  };

  const handleFooterLink = (page) => {
    const protectedPages = ['dashboard', 'backtest', 'strategies', 'live', 'paper', 'watchlist', 'alerts', 'settings'];
    
    if (!user && protectedPages.includes(page)) {
      setIsLoginOpen(true);
    } else {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  const downloadReport = () => {
    if (!backtestResults) return;
    const csv = 'Date,Type,Entry,Exit,P&L\n' + 
      backtestResults.trades.map(t => `${t.date},${t.type},${t.entry},${t.exit},${t.pnl}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backtest-report.csv';
    a.click();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <header className="border-b border-slate-700 bg-slate-950/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-600"></div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Xamanix</span>
            </div>
            <nav className="hidden md:flex gap-8">
              <button onClick={() => setCurrentPage('home')} className="text-slate-300 hover:text-cyan-400">Home</button>
              <button onClick={() => setCurrentPage('about')} className="text-slate-300 hover:text-cyan-400">About</button>
              <button onClick={() => setCurrentPage('contact')} className="text-slate-300 hover:text-cyan-400">Contact</button>
              <button onClick={() => setIsLoginOpen(true)} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold rounded-lg">Login</button>
            </nav>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-700 p-4 space-y-3">
            <button onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} className="block text-left text-slate-300 hover:text-cyan-400">Home</button>
            <button onClick={() => { setCurrentPage('about'); setMobileMenuOpen(false); }} className="block text-left text-slate-300 hover:text-cyan-400">About</button>
            <button onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }} className="block text-left text-slate-300 hover:text-cyan-400">Contact</button>
            <button onClick={() => { setIsLoginOpen(true); setMobileMenuOpen(false); }} className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold rounded-lg">Login</button>
          </div>
        )}

        {currentPage === 'home' && (
          <main className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Automated Trading Intelligence
            </h1>
            <p className="text-xl text-slate-300 mb-8">Professional-grade backtesting with $500,000+ assets</p>
            <button onClick={() => setIsLoginOpen(true)} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-bold text-lg rounded-lg">
              Get Started
            </button>
          </main>
        )}

        {currentPage === 'about' && (
          <main className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-8 text-cyan-400">About Xamanix</h1>
            <div className="space-y-6 text-slate-300">
              <p>Xamanix is a professional algorithmic trading platform with advanced backtesting capabilities designed for both novice and experienced traders. Our mission is to provide powerful, institutional-grade tools in an accessible and user-friendly interface.</p>
              <h2 className="text-2xl font-bold text-cyan-400 mt-8">Features</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Advanced Strategy Backtesting (MACD, RSI, Bollinger Bands and more)</li>
                <li>Backtesting with up to $500,000 in virtual capital</li>
                <li>Live and Paper Trading on major exchanges (Bybit, Binance, Coinbase)</li>
                <li>Support for over 500+ crypto and traditional assets</li>
                <li>Real-time alerts via Telegram & Email</li>
                <li>Comprehensive risk management tools</li>
                <li>Detailed performance analytics and reporting</li>
              </ul>
            </div>
          </main>
        )}

        {currentPage === 'contact' && (
          <main className="max-w-2xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-8 text-cyan-400">Contact Us</h1>
            <form onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); setContactForm({ name: '', email: '', subject: '', message: '' }); }} className="space-y-4">
              <input type="text" placeholder="Your Name" value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-cyan-400 outline-none text-white" required />
              <input type="email" placeholder="Your Email" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-cyan-400 outline-none text-white" required />
              <input type="text" placeholder="Subject" value={contactForm.subject} onChange={(e) => setContactForm({...contactForm, subject: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-cyan-400 outline-none text-white" required />
              {/* FIX: Changed rows="6" to rows={6} to pass a number instead of a string, resolving the TypeScript type error. */}
              <textarea placeholder="Message" value={contactForm.message} onChange={(e) => setContactForm({...contactForm, message: e.target.value})} rows={6} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-cyan-400 outline-none text-white" required></textarea>
              <button type="submit" className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-2">
                <Send size={20} /> Send Message
              </button>
            </form>
          </main>
        )}

        {isLoginOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Account Login</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded focus:border-cyan-400 outline-none text-white" required />
                <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded focus:border-cyan-400 outline-none text-white" required />
                <button type="submit" className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded">
                  Login
                </button>
                <button type="button" onClick={() => setIsLoginOpen(false)} className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">
                  Cancel
                </button>
              </form>
              <p className="text-slate-400 text-sm mt-4">Demo: any email/password</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <header className="border-b border-slate-700 bg-slate-950/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-600"></div>
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Xamanix</span>
          </div>
          
          <nav className="hidden md:flex gap-2 text-sm flex-wrap">
            {['dashboard', 'backtest', 'strategies', 'live', 'paper', 'watchlist', 'alerts', 'settings'].map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`capitalize px-3 py-2 rounded-md transition-colors ${currentPage === page ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400'}`}>
                {page}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-full">
              <LogOut size={20} />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-slate-800 rounded-full">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
           <div className="md:hidden bg-slate-900 border-b border-slate-700 p-4 space-y-2">
             {['dashboard', 'backtest', 'strategies', 'live', 'paper', 'watchlist', 'alerts', 'settings'].map(page => (
                <button key={page} onClick={() => { setCurrentPage(page); setMobileMenuOpen(false); }} className={`capitalize block w-full text-left px-3 py-2 rounded ${currentPage === page ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300'}`}>
                  {page}
                </button>
              ))}
           </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentPage === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 transition-transform duration-200 hover:-translate-y-1">
                <p className="text-slate-400 text-sm flex items-center gap-2"><DollarSign size={16}/> Account Balance</p>
                <p className="text-3xl font-bold text-cyan-400">${user.accountBalance.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 transition-transform duration-200 hover:-translate-y-1">
                <p className="text-slate-400 text-sm flex items-center gap-2"><TrendingUp size={16}/> Total Return</p>
                <p className="text-3xl font-bold text-green-400">+24.8%</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 transition-transform duration-200 hover:-translate-y-1">
                <p className="text-slate-400 text-sm flex items-center gap-2"><CheckCircle size={16}/> Win Rate</p>
                <p className="text-3xl font-bold text-blue-400">68.5%</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 transition-transform duration-200 hover:-translate-y-1">
                <p className="text-slate-400 text-sm flex items-center gap-2"><AlertCircle size={16}/> Active Trades</p>
                <p className="text-3xl font-bold text-purple-400">3</p>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">7-Day Performance</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  {date: 'Mon', equity: 500000},
                  {date: 'Tue', equity: 512450},
                  {date: 'Wed', equity: 508920},
                  {date: 'Thu', equity: 524680},
                  {date: 'Fri', equity: 535420},
                  {date: 'Sat', equity: 541200},
                  {date: 'Sun', equity: 545280},
                ]}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569'}} formatter={(value) => `$${Number(value).toLocaleString()}`}/>
                  <Area type="monotone" dataKey="equity" stroke="#06b6d4" fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {currentPage === 'backtest' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Backtest Configuration</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="text-sm text-slate-400">Symbol</label>
                  <input type="text" value={backtestConfig.symbol} onChange={(e) => setBacktestConfig({...backtestConfig, symbol: e.target.value})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded focus:border-cyan-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Period</label>
                  <select value={backtestConfig.period} onChange={(e) => setBacktestConfig({...backtestConfig, period: e.target.value})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded">
                    <option>1m</option><option>3m</option><option>6m</option><option>1y</option><option>5y</option>
                  </select>
                </div>
                 <div>
                  <label className="text-sm text-slate-400">Interval</label>
                  <select value={backtestConfig.interval} onChange={(e) => setBacktestConfig({...backtestConfig, interval: e.target.value})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded">
                    <option>1m</option><option>5m</option><option>15m</option><option>1h</option><option>4h</option><option>1d</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Capital ($)</label>
                  <input type="number" value={backtestConfig.capital} onChange={(e) => setBacktestConfig({...backtestConfig, capital: parseFloat(e.target.value)})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-4 text-cyan-400/80">Strategy Parameters</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="text-sm text-slate-400">MACD Fast</label>
                  <input type="number" value={backtestConfig.macdFast} onChange={(e) => setBacktestConfig({...backtestConfig, macdFast: parseInt(e.target.value)})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded" />
                </div>
                 <div>
                  <label className="text-sm text-slate-400">MACD Slow</label>
                  <input type="number" value={backtestConfig.macdSlow} onChange={(e) => setBacktestConfig({...backtestConfig, macdSlow: parseInt(e.target.value)})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded" />
                </div>
                 <div>
                  <label className="text-sm text-slate-400">ATR Period</label>
                  <input type="number" value={backtestConfig.atrPeriod} onChange={(e) => setBacktestConfig({...backtestConfig, atrPeriod: parseInt(e.target.value)})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded" />
                </div>
                 <div>
                  <label className="text-sm text-slate-400">ATR Multiplier</label>
                  <input type="number" step="0.1" value={backtestConfig.atrMultiplier} onChange={(e) => setBacktestConfig({...backtestConfig, atrMultiplier: parseFloat(e.target.value)})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded" />
                </div>
                 <div>
                  <label className="text-sm text-slate-400">R/R Ratio</label>
                  <input type="number" step="0.1" value={backtestConfig.riskRewardRatio} onChange={(e) => setBacktestConfig({...backtestConfig, riskRewardRatio: parseFloat(e.target.value)})} className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded" />
                </div>
              </div>

              <button onClick={generateBacktestResults} disabled={isBacktesting} className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-slate-950 font-bold rounded-lg">
                {isBacktesting ? 'Running Backtest...' : 'Run Backtest'}
              </button>
            </div>

            {isBacktesting && <div className="text-center p-8">Running simulation...</div>}

            {backtestResults && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Final Equity</p>
                    <p className="text-2xl font-bold text-cyan-400">${parseFloat(backtestResults.finalEquity).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Total Return</p>
                    <p className={`text-2xl font-bold ${backtestResults.totalReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>{backtestResults.totalReturn > 0 ? '+' : ''}{backtestResults.totalReturn}%</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Win Rate</p>
                    <p className="text-2xl font-bold text-blue-400">{backtestResults.winRate}%</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Profit Factor</p>
                    <p className="text-2xl font-bold text-purple-400">{backtestResults.profitFactor}</p>
                  </div>
                   <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Max Drawdown</p>
                    <p className="text-2xl font-bold text-orange-400">{backtestResults.maxDrawdown}%</p>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-cyan-400">Equity Curve</h3>
                    <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded">
                      <Download size={18} /> Export CSV
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={backtestResults.equityCurve}>
                      <defs>
                        <linearGradient id="colorEquity2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b'}} formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Area type="monotone" dataKey="equity" stroke="#06b6d4" fill="url(#colorEquity2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-cyan-400">Trade History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left p-3 text-slate-400">#</th>
                          <th className="text-left p-3 text-slate-400">Date</th>
                          <th className="text-left p-3 text-slate-400">Type</th>
                          <th className="text-right p-3 text-slate-400">Entry</th>
                          <th className="text-right p-3 text-slate-400">Exit</th>
                          <th className="text-right p-3 text-slate-400">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResults.trades.slice(-15).map((trade) => (
                          <tr key={trade.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                            <td className="p-3">{trade.id}</td>
                            <td className="p-3 text-slate-400">{trade.date}</td>
                            <td className={`p-3 font-bold ${trade.type === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{trade.type}</td>
                            <td className="p-3 text-right">${trade.entry.toFixed(2)}</td>
                            <td className="p-3 text-right">${trade.exit.toFixed(2)}</td>
                            <td className={`p-3 font-bold text-right ${parseFloat(trade.pnl) > 0 ? 'text-green-400' : 'text-red-400'}`}>${parseFloat(trade.pnl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentPage === 'strategies' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-cyan-400">Strategy Library</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'MACD Crossover', desc: 'Moving Average Convergence Divergence' },
                { name: 'RSI Oscillator', desc: 'Relative Strength Index momentum' },
                { name: 'Bollinger Bands', desc: 'Mean reversion strategy' },
                { name: 'Stochastic', desc: 'Overbought/Oversold detection' },
                { name: 'EMA Ribbon', desc: 'Multi-timeframe exponential moving average' },
                { name: 'Volume Profile', desc: 'Volume-weighted levels' },
              ].map((strat, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 flex flex-col transition-transform duration-200 hover:-translate-y-1">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2">{strat.name}</h3>
                  <p className="text-slate-300 mb-4 flex-grow">{strat.desc}</p>
                  <button className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded">Select</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'live' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Live Trading</h2>
                <button onClick={() => { setLiveTrading(!liveTrading); addAlert('live', liveTrading ? 'Live Trading Stopped' : 'Live Trading Started'); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold ${liveTrading ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  {liveTrading ? <Pause size={20} /> : <Play size={20} />}
                  {liveTrading ? 'Stop Trading' : 'Start Trading'}
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Status</p>
                  <p className={`text-2xl font-bold ${liveTrading ? 'text-green-400 animate-pulse' : 'text-red-400'}`}>{liveTrading ? 'LIVE' : 'OFFLINE'}</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Exchange</p>
                  <p className="text-2xl font-bold text-cyan-400">Bybit</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Active Positions</p>
                  <p className="text-2xl font-bold text-blue-400">3</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'paper' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Paper Trading</h2>
                <button onClick={() => { setPaperTrading(!paperTrading); addAlert('paper', paperTrading ? 'Paper Trading Stopped' : 'Paper Trading Started'); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold ${paperTrading ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  {paperTrading ? <Pause size={20} /> : <Play size={20} />}
                  {paperTrading ? 'Stop Simulation' : 'Start Simulation'}
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Paper Balance</p>
                  <p className="text-2xl font-bold text-cyan-400">$545,280</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Simulated P&L</p>
                  <p className="text-2xl font-bold text-green-400">+$45,280</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Drawdown</p>
                  <p className="text-2xl font-bold text-orange-400">8.2%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'watchlist' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Market Watchlist</h2>
              <form onSubmit={(e) => {
                  e.preventDefault();
                  if (newAsset) {
                    const newWatchItem = { symbol: newAsset.toUpperCase(), price: Math.random() * 50000, change: (Math.random() - 0.5) * 5 };
                    setWatchlist([...watchlist, newWatchItem]);
                    setNewAsset('');
                  }
                }} className="flex gap-2 mb-6">
                <input type="text" placeholder="Add symbol (e.g., ADA/USDT)" value={newAsset} onChange={(e) => setNewAsset(e.target.value)} className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:border-cyan-400 outline-none" />
                <button type="submit" className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded">Add</button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-4 text-slate-400">Symbol</th>
                      <th className="text-right p-4 text-slate-400">Price</th>
                      <th className="text-right p-4 text-slate-400">24h Change</th>
                      <th className="text-right p-4 text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((asset, i) => (
                      <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4 font-semibold text-cyan-400">{asset.symbol}</td>
                        <td className="p-4 text-right">${asset.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className={`p-4 text-right font-bold ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setWatchlist(watchlist.filter((_, idx) => idx !== i)); addAlert('watchlist', `Removed ${asset.symbol}`); }} className="text-red-400 hover:text-red-300">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'alerts' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Notification Center</h2>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-lg border ${alert.read ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-700/50 border-cyan-500/30'}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.type === 'trade' ? 'bg-blue-500/20 text-blue-400' :
                      alert.type === 'profit' ? 'bg-green-500/20 text-green-400' :
                      alert.type === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      <Bell size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200">{alert.message}</p>
                      <p className="text-slate-500 text-sm mt-1">{alert.time}</p>
                    </div>
                    <button onClick={() => { setAlerts(alerts.filter(a => a.id !== alert.id)); }} className="p-2 hover:bg-slate-600 rounded">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">Email</label>
                  <input type="email" value={user.email} disabled className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Account Balance</label>
                  <input type="text" value={`$${user.accountBalance.toLocaleString()}`} disabled className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-cyan-400" />
                    <span className="font-medium text-slate-200">Telegram Bot</span>
                  </div>
                  <Toggle enabled={notificationSettings.telegram} onChange={() => setNotificationSettings(s => ({...s, telegram: !s.telegram}))} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail size={20} className="text-cyan-400" />
                    <span className="font-medium text-slate-200">Email Service</span>
                  </div>
                  <Toggle enabled={notificationSettings.email} onChange={() => setNotificationSettings(s => ({...s, email: !s.email}))} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart2 size={20} className="text-cyan-400" />
                    <span className="font-medium text-slate-200">Daily Reports</span>
                  </div>
                  <Toggle enabled={notificationSettings.dailyReports} onChange={() => setNotificationSettings(s => ({...s, dailyReports: !s.dailyReports}))} />
                </div>
              </div>
            </div>

             <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Security</h2>
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg mb-6">
                <span className="font-medium text-slate-200">Two-Factor Authentication (2FA)</span>
                <Toggle enabled={securitySettings['2fa']} onChange={() => setSecuritySettings(s => ({...s, '2fa': !s['2fa']}))} />
              </div>
              <div className="space-y-4">
                  <h3 className="text-lg font-bold text-cyan-400/80">Change Password</h3>
                  <div>
                      <label className="text-sm text-slate-400">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:border-cyan-400 outline-none" />
                  </div>
                  <div>
                      <label className="text-sm text-slate-400">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:border-cyan-400 outline-none" />
                  </div>
                  <button className="w-full px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded">
                    Update Password
                  </button>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">API Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">Exchange API Key</label>
                  <input type="password" placeholder="Enter API key" className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:border-cyan-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Exchange API Secret</label>
                  <input type="password" placeholder="Enter API secret" className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:border-cyan-400 outline-none" />
                </div>
                <button className="w-full px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded">
                  Save Configuration
                </button>
              </div>
            </div>

            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-red-400">Danger Zone</h2>
              <button onClick={handleLogout} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded">
                Logout
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-700 bg-slate-950/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-cyan-400 font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => handleFooterLink('strategies')} className="hover:text-cyan-400">Strategies</button></li>
                <li><button onClick={() => handleFooterLink('backtest')} className="hover:text-cyan-400">Backtesting</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-cyan-400 font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => handleFooterLink('about')} className="hover:text-cyan-400">About</button></li>
                <li><button onClick={() => handleFooterLink('contact')} className="hover:text-cyan-400">Contact</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-cyan-400 font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-cyan-400">Privacy Policy</button></li>
                <li><button className="hover:text-cyan-400">Terms of Service</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-cyan-400 font-bold mb-4">Connect</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400">Twitter</a></li>
                <li><a href="#" className="hover:text-cyan-400">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2024 Xamanix Trading Bot. All rights reserved.</p>
            <p className="mt-2">Trading involves substantial risk and is not for every investor. An investor could potentially lose all or more than the initial investment.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
