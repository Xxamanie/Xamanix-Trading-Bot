

import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import { ChevronDownIcon, ChevronUpIcon, CodeIcon, LightBulbIcon, SparklesIcon, LoadingIcon } from './icons';

interface RecommendationsPanelProps {
  analysis: AnalysisResult;
  appliedRecommendations: Set<string>;
  onToggleRecommendation: (title: string) => void;
  onGenerateScript: () => void;
  isGenerating: boolean;
}

const RecommendationCard: React.FC<{
    rec: AnalysisResult['recommendations'][0];
    isChecked: boolean;
    onToggle: () => void;
}> = ({ rec, isChecked, onToggle }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Guard against null or undefined recommendation objects
    if (!rec) {
        return null;
    }

    return (
        <div className="bg-gray-700/50 rounded-lg overflow-hidden transition-all duration-300">
            <div className="p-4 flex items-start">
                <div className="flex items-center h-6">
                    <input
                        id={rec.title}
                        name={rec.title}
                        type="checkbox"
                        checked={isChecked}
                        onChange={onToggle}
                        className="h-5 w-5 rounded-md border-gray-500 bg-gray-600 text-cyan-500 focus:ring-cyan-600 cursor-pointer"
                    />
                </div>
                <div className="ml-4 text-sm flex-grow">
                    <label htmlFor={rec.title} className="font-bold text-white cursor-pointer select-none">
                        {rec.title}
                    </label>
                    <p className="text-gray-400 mt-1">{isExpanded ? (rec.description || '') : `${(rec.description || '').substring(0, 100)}...`}</p>
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 p-1 text-gray-400 hover:text-white">
                    {isExpanded ? <ChevronUpIcon/> : <ChevronDownIcon/>}
                </button>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 bg-black/20">
                    <p className="text-sm text-gray-300 mt-2">{rec.description || 'No description available.'}</p>
                    <div className="mt-4 bg-gray-900 rounded-md p-3">
                        <div className="flex items-center text-xs text-cyan-400 font-mono mb-2">
                           <CodeIcon/> <span className="ml-2">Python Code Snippet</span>
                        </div>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words overflow-x-auto">
                            <code>{rec.pythonCodeSnippet || '# No code snippet provided.'}</code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};


export default function RecommendationsPanel({ analysis, appliedRecommendations, onToggleRecommendation, onGenerateScript, isGenerating }: RecommendationsPanelProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'parameters'>('recommendations');

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">AI Analysis & Enhancements</h2>
        </div>

        <div className="border-b border-gray-700">
            <nav className="-mb-px flex px-4" aria-label="Tabs">
                <button onClick={() => setActiveTab('recommendations')} className={`${activeTab === 'recommendations' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                    <LightBulbIcon/> <span className="ml-2">Recommendations</span>
                </button>
                <button onClick={() => setActiveTab('parameters')} className={`${activeTab === 'parameters' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} ml-8 flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                    <CodeIcon/> <span className="ml-2">Parameters</span>
                </button>
            </nav>
        </div>

        <div className="p-4 overflow-y-auto flex-grow">
            {activeTab === 'recommendations' && (
                 <div className="space-y-4">
                     {(analysis?.recommendations || []).map((rec, index) => (
                        <RecommendationCard
                            key={rec?.title || `rec-${index}`}
                            rec={rec}
                            isChecked={!!rec?.title && appliedRecommendations.has(rec.title)}
                            onToggle={() => rec?.title && onToggleRecommendation(rec.title)}
                        />
                     ))}
                 </div>
            )}
            {activeTab === 'parameters' && (
                 <div className="space-y-3">
                     {(analysis?.parameters || []).map((param, index) => (
                         <div key={param?.name || `param-${index}`} className="bg-gray-700/50 p-3 rounded-md">
                             <div className="flex justify-between items-center">
                                 <p className="font-mono text-cyan-400 text-sm">{param?.name || 'N/A'}</p>
                                 <p className="font-mono text-white bg-gray-600 px-2 py-0.5 rounded text-sm">{param?.value || 'N/A'}</p>
                             </div>
                             <p className="text-gray-400 text-sm mt-1.5">{param?.description || ''}</p>
                         </div>
                     ))}
                 </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-700 mt-auto">
            <button
                onClick={onGenerateScript}
                disabled={isGenerating || appliedRecommendations.size === 0}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors shadow-lg"
            >
                {isGenerating ? (
                    <>
                        <LoadingIcon /> <span className="ml-2">Generating...</span>
                    </>
                ) : (
                    <>
                        <SparklesIcon /> <span className="ml-2">Generate Enhanced Script</span>
                    </>
                )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
                {appliedRecommendations.size} recommendation(s) selected.
            </p>
        </div>
    </div>
  );
}