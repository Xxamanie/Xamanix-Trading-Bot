
import React, { useState } from 'react';
import { CopyIcon, CheckIcon, LoadingIcon, PlayIcon, RocketIcon } from './icons';

interface CodeViewerProps {
  title: string;
  code: string;
  isLoading?: boolean;
  isBacktestRunning?: boolean;
  onRunBacktest?: () => void;
  onExportScript?: () => void;
  isExporting?: boolean;
}

export default function CodeViewer({ title, code, isLoading = false, isBacktestRunning = false, onRunBacktest, onExportScript, isExporting = false }: CodeViewerProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex items-center space-x-2">
           {onExportScript && (
             <div className="relative group">
                <button
                  onClick={onExportScript}
                  disabled={isExporting || !code}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600/50 disabled:text-gray-400 disabled:cursor-not-allowed text-white`}
                >
                    {isExporting ? <LoadingIcon /> : <RocketIcon />}
                    <span className="ml-2">{isExporting ? 'Exporting...' : 'Export Live Bot Script'}</span>
                </button>
                {!code && (
                    <div className="absolute bottom-full mb-2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Generate the enhanced script to enable export.
                    </div>
                )}
             </div>
           )}
          {onRunBacktest && (
            <button
              onClick={onRunBacktest}
              disabled={!code || isBacktestRunning || isLoading}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors"
            >
              {isBacktestRunning ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <PlayIcon />
              )}
              <span className="ml-2">{isBacktestRunning ? 'Running...' : 'Run Backtest'}</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            disabled={!code || isLoading}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="p-4 overflow-auto flex-grow relative min-h-0">
        {isLoading ? (
            <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center">
                <LoadingIcon />
                <p className="mt-4 text-lg font-semibold text-cyan-400">Generating enhanced script...</p>
            </div>
        ) : code ? (
          <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Generate script to view and export.</p>
          </div>
        )}
      </div>
    </div>
  );
}
