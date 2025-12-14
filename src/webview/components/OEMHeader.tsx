import React from 'react';
import { useExtensionState } from '../hooks/useExtensionState';

export const OEMHeader: React.FC = () => {
    const { state } = useExtensionState();

    if (!state?.oemConfig) {
        return null;
    }

    const { shopIcon, shopName, documentationUrl, shopUrl } = state.oemConfig;

    return (
        <div className="oem-header">
            {shopIcon && (
                <div className="oem-icon">
                    <img src={shopIcon} alt={shopName || 'Shop'} />
                </div>
            )}
            
            {shopName && (
                <div className="oem-name">
                    <h2>{shopName}</h2>
                </div>
            )}
            
            <div className="oem-links">
                {documentationUrl && (
                    <a 
                        href={documentationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="oem-link documentation"
                    >
                        📖 文档
                    </a>
                )}
                
                {shopUrl && (
                    <a 
                        href={shopUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="oem-link shop"
                    >
                        🛒 商店
                    </a>
                )}
            </div>
        </div>
    );
};
