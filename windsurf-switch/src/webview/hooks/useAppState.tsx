import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Account, ExtensionState, WebviewMessage, WebviewResponse } from '../../types/account';

declare const acquireVsCodeApi: () => {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

const vscode = acquireVsCodeApi();

interface Credentials {
    mail: string;
    apiKey: string;
    apiServerUrl: string;
}

interface AppContextType {
    state: ExtensionState | null;
    loading: boolean;
    error: string | null;
    addAccount: (mail: string, apiKey: string, apiServerUrl: string) => Promise<void>;
    deleteAccount: (accountId: string) => Promise<void>;
    switchAccount: (accountId: string) => Promise<void>;
    setRefreshAfterSwitch: (value: boolean) => Promise<void>;
    getCurrentCredentials: () => Promise<Credentials | null>;
    reload: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppState = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppState must be used within a StateProvider');
    }
    return context;
};

interface StateProviderProps {
    children: ReactNode;
}

export const StateProvider: React.FC<StateProviderProps> = ({ children }) => {
    const [state, setState] = useState<ExtensionState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<Map<string, (response: WebviewResponse) => void>>(new Map());

    // 发送消息到扩展
    const sendMessage = useCallback((command: string, payload?: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const handler = (response: WebviewResponse) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.payload);
                }
            };

            setPendingRequests(prev => new Map(prev).set(requestId, handler));

            vscode.postMessage({
                command,
                requestId,
                payload
            } as WebviewMessage);

            // 超时处理
            setTimeout(() => {
                setPendingRequests(prev => {
                    const newMap = new Map(prev);
                    if (newMap.has(requestId)) {
                        newMap.delete(requestId);
                        reject(new Error('请求超时'));
                    }
                    return newMap;
                });
            }, 30000);
        });
    }, []);

    // 监听来自扩展的消息
    useEffect(() => {
        const handleMessage = (event: MessageEvent<WebviewResponse>) => {
            const response = event.data;
            const { requestId } = response;

            const handler = pendingRequests.get(requestId);
            if (handler) {
                handler(response);
                setPendingRequests(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(requestId);
                    return newMap;
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [pendingRequests]);

    // 初始化加载状态
    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载失败');
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    useEffect(() => {
        reload();
    }, [reload]);

    // 添加账号
    const addAccount = useCallback(async (mail: string, apiKey: string, apiServerUrl: string) => {
        try {
            setLoading(true);
            setError(null);
            const newState = await sendMessage('ADD_ACCOUNT', { mail, apiKey, apiServerUrl });
            setState(newState);
        } catch (err) {
            setError(err instanceof Error ? err.message : '添加失败');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    // 删除账号
    const deleteAccount = useCallback(async (accountId: string) => {
        try {
            setLoading(true);
            setError(null);
            const newState = await sendMessage('DELETE_ACCOUNT', { accountId });
            setState(newState);
        } catch (err) {
            setError(err instanceof Error ? err.message : '删除失败');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    // 切换账号
    const switchAccount = useCallback(async (accountId: string) => {
        try {
            setLoading(true);
            setError(null);
            const newState = await sendMessage('SWITCH_ACCOUNT', { accountId });
            setState(newState);
        } catch (err) {
            setError(err instanceof Error ? err.message : '切换失败');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    // 设置切换后刷新
    const setRefreshAfterSwitch = useCallback(async (value: boolean) => {
        try {
            const newState = await sendMessage('SET_REFRESH_SETTING', { value });
            setState(newState);
        } catch (err) {
            setError(err instanceof Error ? err.message : '设置失败');
        }
    }, [sendMessage]);

    // 获取当前登录凭据
    const getCurrentCredentials = useCallback(async (): Promise<Credentials | null> => {
        try {
            const credentials = await sendMessage('GET_CURRENT_CREDENTIALS');
            return credentials;
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取凭据失败');
            return null;
        }
    }, [sendMessage]);

    const value: AppContextType = {
        state,
        loading,
        error,
        addAccount,
        deleteAccount,
        switchAccount,
        setRefreshAfterSwitch,
        getCurrentCredentials,
        reload
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
