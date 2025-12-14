import React from 'react';
import { useExtensionState } from '../hooks/useExtensionState';

export const HistoricalAccounts: React.FC = () => {
    const { state, loading, switchHistoricalAccount, deleteHistoricalAccount } = useExtensionState();

    if (!state) {
        return null;
    }

    const { historicalAccounts, mail: currentMail } = state;

    if (!historicalAccounts || historicalAccounts.length === 0) {
        return null;
    }

    const handleSwitchAccount = async (accountId: string) => {
        try {
            await switchHistoricalAccount(accountId);
        } catch (error) {
            console.error('切换账号失败:', error);
        }
    };

    const handleDeleteAccount = async (accountId: string, accountMail: string) => {
        if (window.confirm(`确定要删除历史账号 ${accountMail} 吗？`)) {
            try {
                await deleteHistoricalAccount(accountId);
            } catch (error) {
                console.error('删除账号失败:', error);
            }
        }
    };

    return (
        <div className="historical-accounts card">
            <h3>历史账号 ({historicalAccounts.length})</h3>
            
            <div className="accounts-list">
                {historicalAccounts.map((account) => {
                    const isCurrentAccount = account.mail === currentMail;
                    
                    return (
                        <div 
                            key={account.id} 
                            className={`account-item ${isCurrentAccount ? 'current-account' : ''}`}
                        >
                            <div className="account-info">
                                <span className="account-email">
                                    {account.mail}
                                    {isCurrentAccount && <span className="current-badge">当前</span>}
                                </span>
                            </div>
                            
                            <div className="account-actions">
                                {!isCurrentAccount && (
                                    <button
                                        className="switch-btn"
                                        onClick={() => handleSwitchAccount(account.id)}
                                        disabled={loading}
                                    >
                                        {loading ? '切换中...' : '切换'}
                                    </button>
                                )}
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDeleteAccount(account.id, account.mail)}
                                    disabled={loading}
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <style>{`
                .historical-accounts {
                    margin-top: 16px;
                }

                .accounts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 12px;
                }

                .account-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .account-item:hover {
                    border-color: var(--vscode-focusBorder);
                    background-color: var(--vscode-list-hoverBackground);
                }

                .account-item.current-account {
                    border-color: var(--vscode-focusBorder);
                    background-color: var(--vscode-list-activeSelectionBackground);
                }

                .account-info {
                    flex: 1;
                    min-width: 0;
                }

                .account-email {
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                }

                .current-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    font-size: 10px;
                    border-radius: 10px;
                    font-weight: normal;
                }

                .account-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .switch-btn, .delete-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .switch-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                .switch-btn:hover:not(:disabled) {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .switch-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .delete-btn {
                    background-color: var(--vscode-errorForeground);
                    color: white;
                    opacity: 0.8;
                }

                .delete-btn:hover:not(:disabled) {
                    opacity: 1;
                }

                .delete-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};
