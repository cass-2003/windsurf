import React, { useState } from 'react';
import { useExtensionState } from '../hooks/useExtensionState';

export const AuthSection: React.FC = () => {
    const { state, loading, activate } = useExtensionState();
    const [activationCode, setActivationCode] = useState('');

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activationCode.trim()) {
            return;
        }

        try {
            await activate(activationCode.trim());
            setActivationCode('');
        } catch (error) {
            // Error is handled by the context
        }
    };

    const getStatusBadge = () => {
        if (!state) return null;

        if (state.isActivated) {
            return <span className="status-badge active">已激活</span>;
        } else {
            return <span className="status-badge inactive">未激活</span>;
        }
    };

    return (
        <div className="auth-section card">
            <div className="auth-header">
                <h3>授权状态</h3>
                {getStatusBadge()}
            </div>

            {!state?.isActivated && (
                <form onSubmit={handleActivate} className="activation-form">
                    <div className="input-group">
                        <input
                            type="text"
                            value={activationCode}
                            onChange={(e) => setActivationCode(e.target.value)}
                            placeholder="请输入激活码"
                            className="activation-input"
                            disabled={loading}
                        />
                        <button 
                            type="submit" 
                            className="activate-btn"
                            disabled={loading || !activationCode.trim()}
                        >
                            {loading ? '激活中...' : '激活'}
                        </button>
                    </div>
                </form>
            )}

            {state?.activationCode && (
                <div className="current-code">
                    <span className="label">当前激活码:</span>
                    <code className="activation-code">{state.activationCode}</code>
                </div>
            )}
        </div>
    );
};
