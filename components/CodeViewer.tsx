import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import { CopyIcon, CheckIcon, LoadingIcon, PlayIcon, RocketIcon, WandSparklesIcon } from './icons';

// Prism is loaded globally from index.html
declare const Prism: any;

interface CodeViewerProps {
  title: string;
  code: string;
  onCodeChange?: (newCode: string) => void;
  readOnly?: boolean;
  isLoading?: boolean;
  isBacktestRunning?: boolean;
  onRunBacktest?: () => void;
  onExportScript?: () => void;
  isExporting?: boolean;
  onFormatCode?: () => void;
  isFormatting?: boolean;
}

export default function CodeViewer({ 
  title, 
  code, 
  isLoading = false, 
  isBacktestRunning = false, 
  onRunBacktest, 
  onExportScript, 
  isExporting = false,
  onCodeChange,
  readOnly = false,
  onFormatCode,
  isFormatting = false,
}: CodeViewerProps): React.ReactElement {
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
           {onFormatCode && (
             <button
                onClick={onFormatCode}
                disabled={isFormatting || !code || isLoading || isBacktestRunning || isExporting}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors"
             >
                {isFormatting ? <LoadingIcon /> : <WandSparklesIcon />}
                <span className="ml-2">{isFormatting ? 'Formatting...' : 'Format'}</span>
             </button>
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
           {onExportScript && (
             <div className="relative group">
                <button
                  onClick={onExportScript}
                  disabled={isExporting || !code}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600/50 disabled:text-gray-400 disabled:cursor-not-allowed text-white`}
                >
                    {isExporting ? <LoadingIcon /> : <RocketIcon />}
                    <span className="ml-2">{isExporting ? 'Exporting...' : 'Export Script'}</span>
                </button>
                {!code && (
                    <div className="absolute bottom-full mb-2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Generate script to enable export.
                    </div>
                )}
             </div>
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
      <div className="overflow-auto flex-grow relative min-h-0 editor-container">
        {isLoading ? (
            <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-10">
                <LoadingIcon />
                <p className="mt-4 text-lg font-semibold text-cyan-400">Generating enhanced script...</p>
            </div>
        ) : code ? (
          <div className="relative h-full w-full bg-gray-900 rounded-b-lg overflow-auto flex">
            <pre className="line-numbers" aria-hidden="true">
                {code.split('\n').map((_, i) => i + 1).join('\n')}
            </pre>
            <Editor
                value={code}
                onValueChange={onCodeChange || (() => {})}
                highlight={(code) => Prism.highlight(code, Prism.languages.python, 'python')}
                padding={10}
                readOnly={readOnly || !onCodeChange}
                className="editor flex-grow"
                textareaClassName="outline-none"
                style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 14,
                    lineHeight: '21px',
                }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-gray-500">Generate script to view and export.</p>
          </div>
        )}
      </div>
    </div>
  );
}