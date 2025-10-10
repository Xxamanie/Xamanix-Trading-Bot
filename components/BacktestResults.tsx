import React, { useEffect, useRef } from 'react';
import type { BacktestResult } from '../types';
import { LoadingIcon, ChartBarIcon } from './icons';

// @ts-ignore - Chart is loaded from a script tag in index.html
const Chart = window.Chart;

interface BacktestResultsProps {
    results: BacktestResult | null;
    isLoading: boolean;
    error: string | null;
}

const formatMetric = (key: string, value: number): string => {
    if (typeof value !== 'number' || !isFinite(value)) return 'N/A';

    if (key.includes('_pct') || key === 'win_rate') {
        return `${(value * 100).toFixed(2)}%`;
    }
    if (key === 'max_drawdown') {
        return `${(value * 100).toFixed(2)}%`;
    }
    if (Number.isInteger(value)) {
        return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatLabel = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function BacktestResults({ results, isLoading, error }: BacktestResultsProps): React.ReactElement {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any | null>(null);

    useEffect(() => {
        if (typeof Chart === 'undefined' || !chartRef.current || !results?.equity_curve_csv) return;
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        const rows = results.equity_curve_csv.trim().replace(/\\r/g, '').split('\n').slice(1);
        const labels = rows.map(row => new Date(row.split(',')[0]).toLocaleDateString());
        const data = rows.map(row => parseFloat(row.split(',')[1]));

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Equity',
                    data,
                    borderColor: 'rgb(34, 211, 238)',
                    backgroundColor: 'rgba(34, 211, 238, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#d1d5db' } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { ticks: { color: '#9ca3af', callback: (value: any) => `$${Number(value).toLocaleString()}` }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [results]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <LoadingIcon />
                    <p className="mt-4 text-lg font-semibold text-cyan-400">Running backtest...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-full p-4">
                    <p className="text-red-400 text-center">
                        <strong className="font-bold">Backtest Failed:</strong> {error}
                    </p>
                </div>
            );
        }

        if (!results) {
            return (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Run backtest to see results.</p>
                </div>
            );
        }
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 h-full">
                <div className="md:col-span-2 relative min-h-[200px] md:h-auto">
                     <canvas ref={chartRef}></canvas>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-64 md:max-h-full pr-2">
                    {Object.entries(results.summary).map(([key, value]) => (
                        <div key={key} className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center text-sm">
                            <p className="text-gray-300">{formatLabel(key)}</p>
                            <p className="font-mono text-white font-semibold">{formatMetric(key, value)}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg h-full flex flex-col">
             <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white flex items-center">
                    <ChartBarIcon />
                    <span className="ml-2">Backtest Results</span>
                </h2>
             </div>
             <div className="flex-grow h-full min-h-0">
                {renderContent()}
             </div>
        </div>
    );
}
