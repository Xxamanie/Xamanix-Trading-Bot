
import React from 'react';
import { useAPI } from '../contexts/APIContext';
import { ExclamationTriangleIcon } from './icons';

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
    isBotSimulating: boolean;
}> = ({ currentView, isConnected, isBotSimulating }) => {
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
                    label="AI Deployment"
                    status={isBotSimulating ? 'positive' : 'negative'}
                    text={isBotSimulating ? 'Active' : 'Inactive'}
                    tooltip="Deploy a bot from the 'Strategy' tab."
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

export default DashboardHeader;
