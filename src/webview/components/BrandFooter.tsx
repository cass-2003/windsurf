import React from 'react';
import { useExtensionState } from '../hooks/useExtensionState';

export const BrandHeader: React.FC = () => {
    const { state } = useExtensionState();
    
    return (
        <div className="brand-header">
            <div className="brand-section">
                {state?.logoUri && (
                    <img src={state.logoUri} alt="XG-Windsurf Logo" className="brand-logo" />
                )}
                <div className="brand-text">
                    <h1 className="brand-title">XG-Windsurf</h1>
                    <p className="brand-subtitle">Windsurf 激活管理工具</p>
                </div>
            </div>
        </div>
    );
};
