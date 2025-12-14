import React from 'react';
import { useAppState } from '../hooks/useAppState';

export const AccountList: React.FC = () => {
    const { state, loading, switchAccount, deleteAccount } = useAppState();

    const accounts = state?.accounts || [];
    const currentAccountId = state?.currentAccount?.id;

    const handleSwitch = async (accountId: string) => {
        try {
            await switchAccount(accountId);
        } catch (err) {
            // 错误已在 hook 中处理
        }
    };

    const handleDelete = async (accountId: string, mail: string) => {
        if (window.confirm(`确定要删除账号 ${mail} 吗？`)) {
            try {
                await deleteAccount(accountId);
            } catch (err) {
                // 错误已在 hook 中处理
            }
        }
    };

    return (
        <div className="card account-list">
            <h3>账号列表 ({accounts.length})</h3>
            
            {accounts.length === 0 ? (
                <div className="empty-list">暂无账号，请先添加</div>
            ) : (
                <div className="accounts-container">
                    {accounts.map((account) => {
                        const isCurrent = account.id === currentAccountId;
                        
                        return (
                            <div
                                key={account.id}
                                className={`account-item ${isCurrent ? 'current' : ''}`}
                            >
                                <div className="account-info">
                                    <span className="email">
                                        {account.mail}
                                        {isCurrent && <span className="current-tag">当前</span>}
                                    </span>
                                </div>
                                <div className="account-actions">
                                    {!isCurrent && (
                                        <button
                                            className="switch-btn"
                                            onClick={() => handleSwitch(account.id)}
                                            disabled={loading}
                                        >
                                            {loading ? '切换中...' : '切换'}
                                        </button>
                                    )}
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(account.id, account.mail)}
                                        disabled={loading}
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
