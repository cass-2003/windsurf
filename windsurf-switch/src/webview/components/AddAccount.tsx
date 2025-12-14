import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';

export const AddAccount: React.FC = () => {
    const { addAccount, getCurrentCredentials, loading } = useAppState();
    const [mail, setMail] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiServerUrl, setApiServerUrl] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [fetching, setFetching] = useState(false);

    const handleSubmit = async () => {
        if (!mail || !apiKey || !apiServerUrl) {
            return;
        }

        try {
            await addAccount(mail, apiKey, apiServerUrl);
            // 清空表单
            setMail('');
            setApiKey('');
            setApiServerUrl('');
            setExpanded(false);
        } catch (err) {
            // 错误已在 hook 中处理
        }
    };

    const handleFetchCredentials = async () => {
        setFetching(true);
        try {
            const credentials = await getCurrentCredentials();
            if (credentials) {
                setMail(credentials.mail);
                setApiKey(credentials.apiKey);
                setApiServerUrl(credentials.apiServerUrl);
            }
        } finally {
            setFetching(false);
        }
    };

    if (!expanded) {
        return (
            <div className="card add-account">
                <h3>添加账号</h3>
                <button className="add-btn" onClick={() => setExpanded(true)}>
                    + 添加账号
                </button>
            </div>
        );
    }

    return (
        <div className="card add-account">
            <h3>添加账号</h3>
            
            <button
                className="add-btn fetch-btn"
                onClick={handleFetchCredentials}
                disabled={fetching}
                style={{ marginBottom: '12px', backgroundColor: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)' }}
            >
                {fetching ? '获取中...' : '📥 从当前登录获取'}
            </button>
            
            <div className="form-group">
                <label>邮箱</label>
                <input
                    type="email"
                    placeholder="输入账号邮箱"
                    value={mail}
                    onChange={(e) => setMail(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>API Key</label>
                <input
                    type="text"
                    placeholder="输入 API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>API Server URL</label>
                <input
                    type="text"
                    placeholder="输入 API 服务器地址"
                    value={apiServerUrl}
                    onChange={(e) => setApiServerUrl(e.target.value)}
                />
            </div>
            <button
                className="add-btn"
                onClick={handleSubmit}
                disabled={loading || !mail || !apiKey || !apiServerUrl}
            >
                {loading ? '添加中...' : '确认添加'}
            </button>
            <button
                className="add-btn"
                style={{ marginTop: '8px', backgroundColor: 'transparent', border: '1px solid var(--vscode-button-background)' }}
                onClick={() => setExpanded(false)}
            >
                取消
            </button>
        </div>
    );
};
