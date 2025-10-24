

import type { PortfolioHistory, Asset, Position, TradeViewData, PriceData, Order, Candle } from './types';

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

const generateCandleData = (basePrice: number, points: number, volatility: number, minutesInterval: number): PriceData => {
    const candles: Candle[] = [];
    let lastClose = basePrice;
    const now = Date.now();

    for (let i = 0; i < points; i++) {
        const open = lastClose;
        const change = (Math.random() - 0.49) * open * volatility;
        const close = open + change;
        
        const highWick = Math.abs(change) * Math.random() * 0.5;
        const lowWick = Math.abs(change) * Math.random() * 0.5;

        const high = Math.max(open, close) + highWick;
        const low = Math.min(open, close) - lowWick;

        candles.unshift({
            time: new Date(now - i * minutesInterval * 60 * 1000).toISOString(),
            open: parseFloat(open.toFixed(4)),
            high: parseFloat(high.toFixed(4)),
            low: parseFloat(low.toFixed(4)),
            close: parseFloat(close.toFixed(4)),
        });

        lastClose = close;
    }
    return candles;
};


export const MOCK_TRADE_VIEW_DATA: TradeViewData = {
    'BTC/USD': {
        '5m': generateCandleData(69123.45, 288, 0.001, 5), // 24 hours of 5m candles
        '15m': generateCandleData(69123.45, 96, 0.002, 15), // 24 hours of 15m candles
        '1h': generateCandleData(69123.45, 72, 0.004, 60), // 3 days of 1h candles
        '4h': generateCandleData(69123.45, 60, 0.008, 240), // 10 days of 4h candles
    },
    'ETH/USD': {
        '5m': generateCandleData(3690.12, 288, 0.0012, 5),
        '15m': generateCandleData(3690.12, 96, 0.0025, 15),
        '1h': generateCandleData(3690.12, 72, 0.005, 60),
        '4h': generateCandleData(3690.12, 60, 0.01, 240),
    },
    'SOL/USD': {
        '5m': generateCandleData(162.40, 288, 0.0015, 5),
        '15m': generateCandleData(162.40, 96, 0.003, 15),
        '1h': generateCandleData(162.40, 72, 0.006, 60),
        '4h': generateCandleData(162.40, 60, 0.012, 240),
    },
    'NGN/USD': {
        '5m': generateCandleData(0.00067, 288, 0.0018, 5),
        '15m': generateCandleData(0.00067, 96, 0.0035, 15),
        '1h': generateCandleData(0.00067, 72, 0.007, 60),
        '4h': generateCandleData(0.00067, 60, 0.015, 240),
    },
};

export const MOCK_INITIAL_ORDERBOOK: { bids: Order[], asks: Order[] } = {
    bids: [],
    asks: []
};


export const DEFAULT_SCRIPT = `
import pandas as pd
import numpy as np
import json
import argparse
import yfinance as yf
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import time
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# ADVANCED CONFIGURATION
# ============================================================================
ADVANCED_CFG = {
    "symbol": "AAPL",
    "capital": 10000.0,
    "fee": 0.001,
    
    # Multi-timeframe setup
    "signal_tf": "1h",      # Generate signals on 1h
    "confirm_tf": "4h",     # Confirm on 4h
    "trade_tf": "15m",      # Enter/exit on 15m
    
    # Ensemble indicators
    "macd_fast": 12,
    "macd_slow": 26,
    "macd_signal": 9,
    "rsi_period": 14,
    "bb_period": 20,
    "bb_std": 2.0,
    "atr_period": 14,
    "adx_period": 14,
    
    # Risk Management
    "max_risk_per_trade": 0.01,
    "risk_reward_ratio": 2.0,
    "max_portfolio_risk": 0.15,
    "position_correlation_limit": 0.7,
    "max_drawdown_allowed": 0.25,
    "max_consecutive_losses": 6,
    
    # ML Regime Settings
    "ml_train_period": "1y",
    "regime_classes": 3,  # ranging, trending, volatile
    "ml_performance_window": 100, # Bars to check accuracy
    "ml_accuracy_threshold": 0.60, # Min accuracy to prevent retraining
    "ml_volatility_change_threshold": 0.40, # % change in vol to trigger retrain
    
    # Adaptive Parameters
    "adaptive_slippage": True,
    "adaptive_atr_multiplier": True,
    "min_signal_quality": 65,
    
    # Paper Trading
    "paper_trading_period": "3mo",
    "min_paper_trades": 30,
}

# ============================================================================
# ML REGIME CLASSIFIER
# ============================================================================
class MarketRegimeMLClassifier:
    """Uses ML to classify market regime in real-time"""
    
    def __init__(self, cfg):
        self.cfg = cfg
        self.model = None
        self.scaler = StandardScaler()
        self.regimes = {0: "ranging", 1: "trending", 2: "volatile"}
        self.last_retrain_bar = 0
        self.needs_retraining = True
        self.prediction_history = []
        self.last_avg_volatility = 0
        
    def extract_features(self, df: pd.DataFrame, lookback: int = 100) -> pd.DataFrame:
        """Extract features for ML classification"""
        if len(df) < lookback + 20:
            return None
            
        df = df.copy()
        features = pd.DataFrame(index=df.index)
        
        # Volatility features
        returns = df['close'].pct_change()
        features['volatility_20'] = returns.rolling(20).std()
        features['volatility_ratio'] = features['volatility_20'] / returns.rolling(100).std()
        features['atr_pct'] = df['atr'] / df['close']
        
        # Trend features
        features['sma_slope_20'] = (df['sma_20'] - df['sma_20'].shift(5)) / df['sma_20']
        features['sma_slope_50'] = (df['sma_50'] - df['sma_50'].shift(5)) / df['sma_50']
        features['price_above_sma'] = (df['close'] - df['sma_50']) / df['sma_50']
        
        # Momentum features
        features['rsi'] = df['rsi']
        features['macd_norm'] = df['macd'] / df['close']
        features['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Volume features
        features['volume_trend'] = df['volume'].rolling(20).mean() / df['volume'].rolling(50).mean()
        
        # ADX (trend strength)
        features['adx'] = df['adx']
        
        return features.dropna()
    
    def generate_labels(self, df: pd.DataFrame, lookback: int = 20) -> np.ndarray:
        """Generate labels for training data"""
        labels = []
        
        for i in range(len(df) - lookback):
            future_returns = df['close'].iloc[i:i+lookback].pct_change().dropna()
            future_volatility = future_returns.std()
            
            # Calculate trend strength
            future_mean = future_returns.mean()
            trend_strength = abs(future_mean) / (future_volatility + 1e-6)
            
            if future_volatility > future_returns.std() * 1.5:
                label = 2  # Volatile
            elif trend_strength > 0.1:
                label = 1  # Trending
            else:
                label = 0  # Ranging
                
            labels.append(label)
        
        # Pad to match features length
        labels.extend([0] * lookback)
        return np.array(labels[:len(df)])
    
    def train(self, df: pd.DataFrame, bar_idx: int):
        """Train ML model on historical data"""
        print(f"🤖 Training ML regime classifier at bar {bar_idx}...")
        
        features = self.extract_features(df)
        if features is None or len(features) < 100:
            print("⚠️  Insufficient data for ML training")
            return False
        
        labels = self.generate_labels(df)
        labels = labels[:len(features)]
        
        # Split and train
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=0.2, random_state=42
        )
        
        self.scaler.fit(X_train)
        X_train_scaled = self.scaler.transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model = RandomForestClassifier(
            n_estimators=50,
            max_depth=8,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_train_scaled, y_train)
        
        accuracy = self.model.score(X_test_scaled, y_test)
        print(f"✅ ML Model trained. Test accuracy: {accuracy:.2%}")
        
        self.needs_retraining = False
        self.last_retrain_bar = bar_idx
        self.prediction_history = [] # Reset history after training
        self.last_avg_volatility = df['atr_pct'].rolling(50).mean().iloc[-1]
        
        return True
    
    def check_retraining_needed(self, df: pd.DataFrame, bar_idx: int, all_labels: np.ndarray) -> bool:
        """Check if the model needs retraining based on performance or volatility"""
        if self.model is None:
            return True # Initial training

        # Fallback: Retrain every 500 bars regardless
        if bar_idx - self.last_retrain_bar > 500:
            print("⏳ Retraining based on fixed interval fallback.")
            return True

        # 1. Volatility Change Check
        current_avg_volatility = df['atr_pct'].rolling(50).mean().iloc[bar_idx]
        if self.last_avg_volatility > 0:
            vol_change = abs(current_avg_volatility - self.last_avg_volatility) / self.last_avg_volatility
            if vol_change > self.cfg['ml_volatility_change_threshold']:
                print(f"Volatility change of {vol_change:.2%} detected. Retraining needed.")
                return True

        # 2. Performance Degradation Check
        window = self.cfg['ml_performance_window']
        if len(self.prediction_history) >= window:
            correct_predictions = 0
            # Evaluate the last 'window' predictions
            eval_preds = self.prediction_history[-window:]
            
            for pred_item in eval_preds:
                p_bar, p_code = pred_item['bar'], pred_item['prediction']
                
                # The label for p_bar is known at p_bar+20, but for backtesting simplicity we use pre-calculated labels
                actual_label = all_labels[p_bar]
                if p_code == actual_label:
                    correct_predictions += 1
            
            accuracy = correct_predictions / window
            if accuracy < self.cfg['ml_accuracy_threshold']:
                print(f"Model accuracy dropped to {accuracy:.2%}. Retraining needed.")
                return True

        return False

    def predict_regime(self, df: pd.DataFrame, bar_idx: int) -> Dict[str, Any]:
        """Predict current market regime"""
        if self.model is None or bar_idx < 100:
            return {
                'regime': 'neutral',
                'regime_code': 0,
                'confidence': 0.5,
                'volatility_bias': 1.0
            }
        
        try:
            features = self.extract_features(df[:bar_idx+1])
            if features is None or len(features) == 0:
                return {'regime': 'neutral', 'regime_code': 0, 'confidence': 0.5, 'volatility_bias': 1.0}
            
            last_features = features.iloc[-1:].values
            last_features_scaled = self.scaler.transform(last_features)
            
            regime_code = self.model.predict(last_features_scaled)[0]
            confidence = self.model.predict_proba(last_features_scaled).max()
            
            regime = self.regimes.get(regime_code, 'neutral')
            
            # Record prediction for performance tracking
            self.prediction_history.append({'bar': bar_idx, 'prediction': regime_code})
            
            # Volatility bias for position sizing
            volatility_bias = df['atr_pct'].iloc[-1] / df['atr_pct'].rolling(50).mean().iloc[-1]
            
            return {
                'regime': regime,
                'regime_code': regime_code,
                'confidence': confidence,
                'volatility_bias': volatility_bias
            }
        except Exception as e:
            print(f"⚠️  Regime prediction error: {e}")
            return {'regime': 'neutral', 'regime_code': 0, 'confidence': 0.5, 'volatility_bias': 1.0}

# ============================================================================
# ENSEMBLE INDICATOR SYSTEM
# ============================================================================
class EnsembleIndicators:
    """Multi-indicator ensemble for robust signals"""
    
    def __init__(self, cfg):
        self.cfg = cfg
        
    def calculate_all(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate all indicators"""
        df = df.copy()
        
        # MACD
        exp1 = df['close'].ewm(span=self.cfg['macd_fast'], adjust=False).mean()
        exp2 = df['close'].ewm(span=self.cfg['macd_slow'], adjust=False).mean()
        df['macd'] = exp1 - exp2
        df['macd_signal'] = df['macd'].ewm(span=self.cfg['macd_signal'], adjust=False).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.cfg['rsi_period']).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.cfg['rsi_period']).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['sma_20'] = df['close'].rolling(self.cfg['bb_period']).mean()
        std = df['close'].rolling(self.cfg['bb_period']).std()
        df['bb_upper'] = df['sma_20'] + (std * self.cfg['bb_std'])
        df['bb_lower'] = df['sma_20'] - (std * self.cfg['bb_std'])
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # ATR
        tr1 = df['high'] - df['low']
        tr2 = abs(df['high'] - df['close'].shift())
        tr3 = abs(df['low'] - df['close'].shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df['atr'] = tr.ewm(span=self.cfg['atr_period'], adjust=False).mean()
        df['atr_pct'] = df['atr'] / df['close']
        
        # ADX (trend strength)
        df['adx'] = self._calculate_adx(df)
        
        # Moving Averages
        df['sma_50'] = df['close'].rolling(50).mean()
        df['sma_200'] = df['close'].rolling(200).mean()
        df['ema_50'] = df['close'].ewm(span=50, adjust=False).mean()
        
        # Stochastic
        low_min = df['low'].rolling(14).min()
        high_max = df['high'].rolling(14).max()
        df['stoch'] = (df['close'] - low_min) / (high_max - low_min) * 100
        
        return df.dropna()
    
    def _calculate_adx(self, df: pd.DataFrame) -> pd.Series:
        """Calculate ADX indicator"""
        plus_dm = df['high'].diff()
        minus_dm = -df['low'].diff()
        
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        
        tr1 = df['high'] - df['low']
        tr2 = abs(df['high'] - df['close'].shift())
        tr3 = abs(df['low'] - df['close'].shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        atr = tr.rolling(14).mean()
        plus_di = 100 * (plus_dm.rolling(14).mean() / atr)
        minus_di = 100 * (minus_dm.rolling(14).mean() / atr)
        di_diff = abs(plus_di - minus_di)
        di_sum = plus_di + minus_di
        
        dx = 100 * (di_diff / di_sum)
        adx = dx.rolling(14).mean()
        
        return adx

# ============================================================================
# MULTI-TIMEFRAME ANALYZER
# ============================================================================
class MultiTimeframeAnalyzer:
    """Analyzes signals across multiple timeframes"""
    
    def __init__(self, cfg, indicators: EnsembleIndicators):
        self.cfg = cfg
        self.indicators = indicators
        self.data_cache = {}
        
    def fetch_multi_timeframe_data(self, symbol: str) -> Dict[str, pd.DataFrame]:
        """Fetch data for all timeframes"""
        print("📊 Fetching multi-timeframe data...")
        
        data = {}
        timeframes = ["15m", "1h", "4h"]
        
        for tf in timeframes:
            try:
                ticker = yf.Ticker(symbol)
                df = ticker.history(period="2y", interval=tf)
                
                if df.empty:
                    print(f"⚠️  No data for {tf}")
                    continue
                
                # Clean data
                df = df.rename(columns={'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
                df.columns = df.columns.str.lower()
                df.index = pd.to_datetime(df.index)
                if df.index.tz is not None:
                    df.index = df.index.tz_localize(None)
                
                df = df[df['volume'] > 0].dropna()
                
                # Calculate indicators
                df = self.indicators.calculate_all(df)
                data[tf] = df
                print(f"✅ {tf}: {len(df)} bars loaded")
                
                time.sleep(1)  # Rate limiting
                
            except Exception as e:
                print(f"❌ Error fetching {tf}: {e}")
        
        return data
    
    def analyze_signal_confluence(self, data_dict: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Analyze signal confluence across timeframes"""
        confluence = {
            "signal_tf_signal": None,
            "confirm_tf_signal": None,
            "trade_tf_signal": None,
            "overall_score": 0,
            "alignment": False
        }
        
        if self.cfg['signal_tf'] not in data_dict or len(data_dict[self.cfg['signal_tf']]) == 0:
            return confluence
        
        # Signal timeframe analysis
        signal_df = data_dict[self.cfg['signal_tf']]
        signal_signal = self._detect_ensemble_signal(signal_df)
        confluence["signal_tf_signal"] = signal_signal
        
        # Confirmation timeframe
        if self.cfg['confirm_tf'] in data_dict:
            confirm_df = data_dict[self.cfg['confirm_tf']]
            confirm_signal = self._detect_ensemble_signal(confirm_df)
            confluence["confirm_tf_signal"] = confirm_signal
        
        # Trade timeframe
        if self.cfg['trade_tf'] in data_dict:
            trade_df = data_dict[self.cfg['trade_tf']]
            trade_signal = self._detect_ensemble_signal(trade_df)
            confluence["trade_tf_signal"] = trade_signal
        
        # Calculate alignment score
        confluence["overall_score"] = self._calculate_confluence_score(confluence)
        confluence["alignment"] = (confluence["signal_tf_signal"] is not None and 
                                   confluence["signal_tf_signal"] == confluence["confirm_tf_signal"])
        
        return confluence
    
    def _detect_ensemble_signal(self, df: pd.DataFrame) -> Optional[str]:
        """Detect signal from ensemble of indicators"""
        if len(df) < 2:
            return None
        
        current = df.iloc[-1]
        previous = df.iloc[-2]
        
        signals = []
        
        # MACD crossover
        if previous['macd'] < previous['macd_signal'] and current['macd'] > current['macd_signal']:
            signals.append(1)
        elif previous['macd'] > previous['macd_signal'] and current['macd'] < current['macd_signal']:
            signals.append(-1)
        
        # RSI
        if current['rsi'] < 30:
            signals.append(1)
        elif current['rsi'] > 70:
            signals.append(-1)
        
        # Bollinger Bands
        if current['close'] < current['bb_lower']:
            signals.append(1)
        elif current['close'] > current['bb_upper']:
            signals.append(-1)
        
        # ADX trend strength
        if current['adx'] > 25:
            if current['close'] > current['sma_50']:
                signals.append(1)
            else:
                signals.append(-1)
        
        # Determine consensus
        if not signals:
            return None
        
        avg_signal = np.mean(signals)
        if avg_signal > 0.5:
            return "LONG"
        elif avg_signal < -0.5:
            return "SHORT"
        else:
            return None
    
    def _calculate_confluence_score(self, confluence: Dict) -> float:
        """Calculate overall confluence score 0-100"""
        score = 50
        
        if confluence['signal_tf_signal'] == confluence['confirm_tf_signal']:
            score += 25
        
        if confluence['signal_tf_signal'] == confluence['trade_tf_signal']:
            score += 15
        
        if confluence['signal_tf_signal'] is not None:
            score += 10
        
        return min(max(score, 0), 100)

# ============================================================================
# POSITION CORRELATION TRACKER
# ============================================================================
class PositionCorrelationTracker:
    """Tracks correlation between open positions"""
    
    def __init__(self, cfg):
        self.cfg = cfg
        self.open_positions = []
        self.price_history = {}
        
    def add_position(self, symbol: str, position_type: str, entry_price: float):
        """Track new position"""
        self.open_positions.append({
            'symbol': symbol,
            'type': position_type,
            'entry_price': entry_price,
            'entry_time': datetime.now(),
            'prices': [entry_price]
        })
        
        if symbol not in self.price_history:
            self.price_history[symbol] = []
    
    def update_prices(self, symbol: str, current_price: float):
        """Update position prices"""
        if symbol not in self.price_history:
            self.price_history[symbol] = []
        
        self.price_history[symbol].append(current_price)
        
        for pos in self.open_positions:
            if pos['symbol'] == symbol:
                pos['prices'].append(current_price)
    
    def get_portfolio_correlation(self) -> float:
        """Calculate correlation between open positions"""
        if len(self.open_positions) < 2:
            return 0.0
        
        try:
            # Convert prices to returns
            returns_dict = {}
            for pos in self.open_positions:
                if len(pos['prices']) > 1:
                    returns = np.diff(pos['prices']) / pos['prices'][:-1]
                    returns_dict[pos['symbol']] = returns
            
            if len(returns_dict) < 2:
                return 0.0
            
            # Calculate correlation matrix
            symbols = list(returns_dict.keys())
            correlations = []
            
            for i in range(len(symbols)):
                for j in range(i+1, len(symbols)):
                    sym1, sym2 = symbols[i], symbols[j]
                    
                    # Align length
                    min_len = min(len(returns_dict[sym1]), len(returns_dict[sym2]))
                    ret1 = returns_dict[sym1][-min_len:]
                    ret2 = returns_dict[sym2][-min_len:]
                    
                    if min_len > 1:
                        corr = np.corrcoef(ret1, ret2)[0, 1]
                        if not np.isnan(corr):
                            correlations.append(corr)
            
            return np.mean(correlations) if correlations else 0.0
        except:
            return 0.0
    
    def can_add_position(self) -> bool:
        """Check if new position would violate correlation limits"""
        correlation = self.get_portfolio_correlation()
        return correlation < self.cfg['position_correlation_limit']
    
    def remove_position(self, symbol: str):
        """Remove closed position"""
        self.open_positions = [p for p in self.open_positions if p['symbol'] != symbol]

# ============================================================================
# ADAPTIVE PARAMETERS
# ============================================================================
class AdaptiveParameters:
    """Adapts strategy parameters based on recent market conditions"""
    
    def __init__(self, cfg):
        self.cfg = cfg
        self.base_atr_multiplier = 2.0
        self.adaptation_history = []
        
    def adapt_parameters(self, df: pd.DataFrame, regime: Dict) -> Dict[str, float]:
        """Adapt parameters based on market regime"""
        params = {}
        
        if len(df) < 50:
            return {'atr_multiplier': self.base_atr_multiplier, 'risk_multiplier': 1.0}
        
        # Recent volatility
        recent_atr_pct = df['atr_pct'].tail(20).mean()
        historical_atr_pct = df['atr_pct'].tail(100).mean()
        
        volatility_ratio = recent_atr_pct / historical_atr_pct if historical_atr_pct > 0 else 1.0
        
        # Adapt ATR multiplier
        if self.cfg['adaptive_atr_multiplier']:
            if volatility_ratio > 1.5:  # High volatility
                params['atr_multiplier'] = self.base_atr_multiplier * 1.5
            elif volatility_ratio < 0.7:  # Low volatility
                params['atr_multiplier'] = self.base_atr_multiplier * 0.7
            else:
                params['atr_multiplier'] = self.base_atr_multiplier
        
        # Adapt risk based on regime
        if regime['regime'] == 'volatile':
            params['risk_multiplier'] = 0.6
        elif regime['regime'] == 'trending':
            params['risk_multiplier'] = 1.2
        else:
            params['risk_multiplier'] = 1.0
        
        # Recent win rate adaptation
        params['recent_performance_bias'] = self._calculate_performance_bias(df)
        
        return params
    
    def _calculate_performance_bias(self, df: pd.DataFrame) -> float:
        """Calculate bias based on recent trades"""
        return 1.0  # Can be extended with actual trade history

# ============================================================================
# ENHANCED TRADING BOT WITH ALL FEATURES
# ============================================================================
class AdvancedTradingBot:
    def __init__(self, cfg):
        self.cfg = cfg
        self.indicators = EnsembleIndicators(cfg)
        self.multi_tf = MultiTimeframeAnalyzer(cfg, self.indicators)
        self.ml_classifier = MarketRegimeMLClassifier(cfg)
        self.correlation_tracker = PositionCorrelationTracker(cfg)
        self.adaptive_params = AdaptiveParameters(cfg)
        
        self.trades = []
        self.equity_curve = [cfg['capital']]
        self.equity_curve_timestamps = []
        self.account_balance = cfg['capital']
        
    def run_full_backtest(self):
        """Run complete backtest with all features"""
        print("🚀 Starting Advanced Trading Bot Backtest")
        print(f"📈 Symbol: {self.cfg['symbol']}")
        # FIX: Corrected invalid Python f-string syntax that was breaking the TS template literal. The '$' was removed.
        print(f"💰 Capital: {self.cfg['capital']:,.2f}")
        print("⏳ This may take a few minutes...\\n")
        
        # Fetch multi-timeframe data
        data_dict = self.multi_tf.fetch_multi_timeframe_data(self.cfg['symbol'])
        
        if not data_dict:
            print("❌ Failed to fetch data")
            return
        
        # Use signal timeframe for backtest
        signal_df = data_dict.get(self.cfg['signal_tf'])
        if signal_df is None or len(signal_df) < 200:
            print("❌ Insufficient data for backtest")
            return
            
        # Pre-calculate all ML labels for performance evaluation
        all_labels = self.ml_classifier.generate_labels(signal_df)
        
        # Initial ML model training
        self.ml_classifier.train(signal_df, 0)
        
        print("\\n" + "="*60)
        print("🎯 RUNNING BACKTEST WITH ADVANCED FEATURES")
        print("="*60 + "\\n")
        
        position = None
        consecutive_losses = 0
        
        test_period = len(signal_df) // 3  # Use last 1/3 for testing
        test_start_idx = len(signal_df) - test_period
        
        self.equity_curve_timestamps.append(signal_df.index[test_start_idx -1])
        
        print(f"📊 Backtesting on {test_period} bars\\n")
        
        for i in range(test_start_idx, len(signal_df)):
            current_price = signal_df['close'].iloc[i]
            current_date = signal_df.index[i]
            
            # Check if ML model needs adaptive retraining
            if self.ml_classifier.check_retraining_needed(signal_df, i, all_labels):
                self.ml_classifier.train(signal_df[:i+1], i)
            
            # Get market regime from ML (which also records the prediction)
            regime = self.ml_classifier.predict_regime(signal_df, i)
            
            # Adapt parameters
            adapted_params = self.adaptive_params.adapt_parameters(signal_df.iloc[:i+1], regime)
            
            # Check safety
            if not self._check_safety(consecutive_losses):
                break
            
            # Manage existing position
            if position:
                updated_position, trade_outcome = self._manage_position_exit(
                    position, current_price, signal_df.iloc[i], adapted_params
                )
                position = updated_position  # Update position state (could be None if closed)
                if trade_outcome == 1:  # Loss
                    consecutive_losses += 1
                elif trade_outcome == -1:  # Win
                    consecutive_losses = 0
            
            # Generate new signals
            if position is None and self.correlation_tracker.can_add_position():
                confluence = self.multi_tf.analyze_signal_confluence(data_dict)
                
                if confluence['alignment'] and confluence['overall_score'] > self.cfg['min_signal_quality']:
                    signal = confluence['signal_tf_signal']
                    
                    if signal in ['LONG', 'SHORT']:
                        entry_result = self._enter_position(
                            signal, current_price, signal_df.iloc[i], adapted_params, regime
                        )
                        
                        if entry_result:
                            position = entry_result
                            self.correlation_tracker.add_position(
                                self.cfg['symbol'], position['type'], position['entry_price']
                            )
            
            # Update tracking
            self.equity_curve.append(self.account_balance)
            self.equity_curve_timestamps.append(current_date)
            if position:
                self.correlation_tracker.update_prices(self.cfg['symbol'], current_price)
        
        # Generate results
        self._generate_results()
    
    def _check_safety(self, consecutive_losses: int) -> bool:
        """Check safety conditions"""
        drawdown = (max(self.equity_curve) - self.account_balance) / max(self.equity_curve)
        
        if drawdown > self.cfg['max_drawdown_allowed']:
            print(f"🛑 Max drawdown exceeded: {drawdown:.2%}")
            return False
        
        if consecutive_losses > self.cfg['max_consecutive_losses']:
            print(f"🛑 Too many consecutive losses: {consecutive_losses}")
            return False
        
        return True
    
    def _enter_position(self, signal: str, price: float, bar: pd.Series, 
                       params: Dict, regime: Dict) -> Optional[Dict]:
        """Enter new position with dynamic sizing and risk management."""
        atr_distance = bar['atr'] * params['atr_multiplier']
        
        if signal == 'LONG':
            stop_loss_price = price - atr_distance
        else: # SHORT
            stop_loss_price = price + atr_distance
            
        price_risk = abs(price - stop_loss_price)
        if price_risk <= 0:
            return None
        
        # Take profit calculation
        reward_distance = price_risk * self.cfg['risk_reward_ratio']
        if signal == 'LONG':
            take_profit_price = price + reward_distance
        else: # SHORT
            take_profit_price = price - reward_distance
            
        # Dynamic, risk-based position sizing
        risk_amount = self.account_balance * self.cfg['max_risk_per_trade'] * params['risk_multiplier']
        position_size = risk_amount / price_risk
        
        # Portfolio risk limit
        max_position_value = self.account_balance * self.cfg['max_portfolio_risk']
        position_size = min(position_size, max_position_value / price)
        
        # FIX: Corrected invalid Python f-string syntax that was breaking the TS template literal. The '$' was removed.
        print(f"📈 ENTER {signal} at {price:.2f} | Size: {position_size:.2f} | SL: {stop_loss_price:.2f} | TP: {take_profit_price:.2f} | Regime: {regime['regime']}")
        
        return {
            "type": signal,
            "entry_price": price,
            "size": position_size,
            "stop_loss": stop_loss_price,
            "take_profit": take_profit_price
        }

    def _manage_position_exit(self, position: Dict, current_price: float, 
                            bar: pd.Series, params: Dict) -> Tuple[Optional[Dict], int]:
        """
        Manage position exit with trailing stop-loss and take-profit.
        Returns a tuple: (updated_position or None, trade_outcome).
        trade_outcome: 1 for loss, -1 for win, 0 for no trade.
        """
        pnl = 0
        exit_reason = None
        atr_distance = bar['atr'] * params['atr_multiplier']

        # --- Trailing Stop-Loss Logic ---
        if position['type'] == 'LONG':
            # Trail the stop loss up
            new_stop_loss = current_price - atr_distance
            if new_stop_loss > position['stop_loss']:
                position['stop_loss'] = new_stop_loss
            
            # Check for exit conditions
            if current_price <= position['stop_loss']:
                exit_reason = "Stop-Loss"
            elif current_price >= position['take_profit']:
                exit_reason = "Take-Profit"
                
        elif position['type'] == 'SHORT':
            # Trail the stop loss down
            new_stop_loss = current_price + atr_distance
            if new_stop_loss < position['stop_loss']:
                position['stop_loss'] = new_stop_loss
                
            # Check for exit conditions
            if current_price >= position['stop_loss']:
                exit_reason = "Stop-Loss"
            elif current_price <= position['take_profit']:
                exit_reason = "Take-Profit"

        # If an exit condition was met, process the trade closure
        if exit_reason:
            if position['type'] == 'LONG':
                pnl = (current_price - position['entry_price']) * position['size']
            else:  # SHORT
                pnl = (position['entry_price'] - current_price) * position['size']
            
            self.account_balance += pnl
            self.trades.append({
                'entry': position['entry_price'],
                'exit': current_price,
                'pnl': pnl,
                'type': position['type']
            })
            
            trade_outcome = -1 if pnl >= 0 else 1  # -1 for win/breakeven, 1 for loss
            
            # FIX: Corrected invalid Python f-string syntax that was breaking the TS template literal. The '$' was removed.
            print(f"📤 CLOSE {position['type']} at {current_price:.2f} ({exit_reason}) | P&L: {pnl:.2f}")
            self.correlation_tracker.remove_position(self.cfg['symbol'])
            
            # Return None to indicate position is closed, and the trade outcome
            return None, trade_outcome
        
        # Position is still open, return it with potentially updated stop-loss
        return position, 0
    
    def _generate_results(self):
        """Generate comprehensive results report"""
        if len(self.equity_curve) < 2 or not self.trades:
            print("---SUMMARY_JSON---")
            print(json.dumps({"error": "No trades were executed during the backtest."}))
            print("---EQUITY_CSV---")
            print("timestamp,equity\\n")
            return

        final_equity = self.account_balance
        total_return = (final_equity / self.cfg['capital']) - 1
        df_trades = pd.DataFrame(self.trades)
        wins = df_trades[df_trades['pnl'] > 0]
        losses = df_trades[df_trades['pnl'] < 0]
        total_trades = len(df_trades)
        win_rate = len(wins) / total_trades if total_trades > 0 else 0
        avg_win = wins['pnl'].mean()
        avg_loss = losses['pnl'].mean()
        profit_factor = abs(wins['pnl'].sum() / losses['pnl'].sum()) if losses['pnl'].sum() != 0 else float('inf')
        
        equity_series = pd.Series(self.equity_curve[1:], index=pd.to_datetime(self.equity_curve_timestamps))
        returns = equity_series.pct_change().dropna()
        max_drawdown = (equity_series.cummax() - equity_series).max() / equity_series.cummax().max()
        sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0

        summary_data = {
            "final_equity": final_equity, "total_return_pct": total_return, "n_trades": total_trades,
            "wins": len(wins), "win_rate": win_rate, "avg_win": avg_win, "avg_loss": avg_loss,
            "profit_factor": profit_factor, "max_consecutive_losses": 0,  # Placeholder
            "max_drawdown": max_drawdown, "sharpe": sharpe,
        }

        # Clean NaNs and Infs for JSON compatibility
        for key, value in summary_data.items():
            if pd.isna(value) or value in [float('inf'), float('-inf')]:
                summary_data[key] = 0
        
        print("---SUMMARY_JSON---")
        print(json.dumps(summary_data))

        print("---EQUITY_CSV---")
        equity_df = pd.DataFrame({'timestamp': self.equity_curve_timestamps, 'equity': self.equity_curve[1:]})
        print(equity_df.to_csv(index=False))

# ============================================================================
# MAIN EXECUTION BLOCK
# ============================================================================
if __name__ == "__main__":
    try:
        bot = AdvancedTradingBot(ADVANCED_CFG)
        bot.run_full_backtest()
    except Exception as e:
        error_summary = {"error": f"An unexpected error occurred: {str(e)}"}
        print("---SUMMARY_JSON---")
        print(json.dumps(error_summary))
        print("---EQUITY_CSV---")
        print("timestamp,equity\\n")
`;