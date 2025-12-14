import React from 'react';
import { useAppState } from '../hooks/useAppState';

export const CurrentAccount: React.FC = () => {
    const { state, loading } = useAppState();

    if (loading && !state) {
        return (
            <div className="card current-account">
                <h3>当前账号</h3>
                <div className="loading">加载中...</div>
            </div>
        );
    }

    const currentAccount = state?.currentAccount;

    return (
        <div className="card current-account">
            <h3>当前账号</h3>
            {currentAccount ? (
                <div>
                    <div className="account-email">{currentAccount.mail}</div>
                    <span className="account-badge">当前使用</span>
                </div>
            ) : (
                <div className="no-account">暂无账号，请添加账号</div>
            )}
        </div>
    );
};
