import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ExtensionState } from '../../types/state';

interface ExtensionStateContextType {
    state: ExtensionState | null;
    loading: boolean;
    error: string | null;
    activate: (activationCode: string) => Promise<void>;
    refresh: () => Promise<void>;
    clearData: () => Promise<void>;
    releaseDevice: () => Promise<void>;
    reload: () => Promise<void>;
    sendMessage: (command: string, payload?: any) => Promise<any>;
    switchHistoricalAccount: (accountId: string) => Promise<void>;
    deleteHistoricalAccount: (accountId: string) => Promise<void>;
}

const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined);

declare global {
    interface Window {
        acquireVsCodeApi: () => {
            postMessage: (message: any) => void;
            setState: (state: any) => void;
            getState: () => any;
        };
    }
}

export const ExtensionStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ExtensionState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vscode] = useState(() => window.acquireVsCodeApi());
    const [pendingRequests] = useState(new Map<string, { resolve: (value: any) => void; reject: (error: any) => void }>());
    
    // Use useRef to avoid dependency issues
    const requestIdRef = useRef(0);

    const generateRequestId = useCallback(() => {
        const id = `req_${Date.now()}_${requestIdRef.current}`;
        requestIdRef.current += 1;
        return id;
    }, []);

    const sendMessage = useCallback((command: string, payload?: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const reqId = generateRequestId();
            pendingRequests.set(reqId, { resolve, reject });
            
            vscode.postMessage({
                command,
                requestId: reqId,
                payload
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (pendingRequests.has(reqId)) {
                    pendingRequests.delete(reqId);
                    reject(new Error('请求超时'));
                }
            }, 30000);
        });
    }, [vscode, generateRequestId, pendingRequests]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { command, requestId: reqId, payload, error } = event.data;
            
            if (pendingRequests.has(reqId)) {
                const { resolve, reject } = pendingRequests.get(reqId)!;
                pendingRequests.delete(reqId);
                
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(payload);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [pendingRequests]);

    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '加载状态失败';
            setError(errorMessage);
            console.error('重新加载状态失败:', err);
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    const activate = useCallback(async (activationCode: string) => {
        try {
            setLoading(true);
            setError(null);
            await sendMessage('ACTIVATE', { activationCode });
            // Call reload directly instead of using the callback to avoid dependency issues
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '激活失败';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await sendMessage('REFRESH');
            // Call reload directly instead of using the callback to avoid dependency issues
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '刷新失败';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);


    const clearData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await sendMessage('CLEAR_DATA');
            // Call reload directly instead of using the callback to avoid dependency issues
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '清除数据失败';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    const releaseDevice = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await sendMessage('RELEASE_DEVICE');
            if (!result?.cancelled) {
                // Call reload directly instead of using the callback to avoid dependency issues
                const newState = await sendMessage('GET_STATE');
                setState(newState);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '解绑设备失败';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    const switchHistoricalAccount = useCallback(async (accountId: string) => {
        try {
            setLoading(true);
            setError(null);
            await sendMessage('SWITCH_HISTORICAL_ACCOUNT', { accountId });
            // Call reload directly instead of using the callback to avoid dependency issues
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '切换历史账号失败';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    const deleteHistoricalAccount = useCallback(async (accountId: string) => {
        try {
            setLoading(true);
            setError(null);
            await sendMessage('DELETE_HISTORICAL_ACCOUNT', { accountId });
            // Call reload directly instead of using the callback to avoid dependency issues
            const newState = await sendMessage('GET_STATE');
            setState(newState);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '删除历史账号失败';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [sendMessage]);

    // Load initial state only once on mount
    useEffect(() => {
        const loadInitialState = async () => {
            try {
                setLoading(true);
                setError(null);
                const newState = await sendMessage('GET_STATE');
                setState(newState);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '加载初始状态失败';
                setError(errorMessage);
                console.error('加载初始状态失败:', err);
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialState();
    }, []); // Empty dependency array ensures this only runs once on mount

    const contextValue: ExtensionStateContextType = {
        state,
        loading,
        error,
        activate,
        refresh,
        clearData,
        releaseDevice,
        reload,
        sendMessage,
        switchHistoricalAccount,
        deleteHistoricalAccount
    };

    return (
        <ExtensionStateContext.Provider value={contextValue}>
            {children}
        </ExtensionStateContext.Provider>
    );
};

export const useExtensionState = (): ExtensionStateContextType => {
    const context = useContext(ExtensionStateContext);
    if (context === undefined) {
        throw new Error('useExtensionState must be used within an ExtensionStateProvider');
    }
    return context;
};
