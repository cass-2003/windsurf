import React, { useState } from 'react';
import { useExtensionState } from '../hooks/useExtensionState';
import { ApiService } from '../../services/apiService';

export const DeviceInfo: React.FC = () => {
    const { state, loading, refresh, clearData, releaseDevice } = useExtensionState();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [quotaInfo, setQuotaInfo] = useState<any>(null);
    const apiService = new ApiService();

    // 如果state为null，显示加载状态
    if (!state) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3>账号信息</h3>
                </div>
                <div className="device-info">
                    <div className="info-row">
                        <span className="label">当前账号:</span>
                        <span className="value">加载中...</span>
                    </div>
                    <div className="info-row">
                        <span className="label">剩余额度:</span>
                        <span className="value">加载中...</span>
                    </div>
                </div>
            </div>
        );
    }

    // 获取当前使用的账号信息
    const getCurrentAccount = () => {
        if (state.mail) {
            return state.mail;
        }
        return '未登录';
    };

    // 刷新额度信息
    const refreshQuota = async () => {
        if (!state.activationCode || !state.deviceId) {
            console.warn('缺少激活码或设备ID，无法刷新额度');
            return;
        }

        setIsRefreshing(true);
        try {
            const response = await apiService.getStatus(state.activationCode, state.deviceId);
            if (response.code === 200 && response.data) {
                setQuotaInfo(response.data);
                console.log('额度刷新成功:', response.data);
            } else {
                console.warn('刷新额度失败:', response.message || response.msg || '未知错误');
                // 对于新用户或无效激活码，保持当前状态
            }
        } catch (error) {
            console.error('刷新额度失败:', error);
            // 网络错误或其他异常，不清空现有数据
        } finally {
            setIsRefreshing(false);
        }
    };

    // 获取剩余额度信息
    const getRemainingQuota = () => {
        // 第一优先级：使用激活响应中的 quota_remaining
        if (state.quotaRemaining !== undefined) {
            return `${state.quotaRemaining.toLocaleString()} 次`;
        }
        
        // 第二优先级：使用独立查询API的额度信息
        if (quotaInfo) {
            const remaining = quotaInfo.quota_key_max_quota - quotaInfo.quota_key_used_quota;
            return `${remaining.toLocaleString()} 次`;
        }
        
        // 第三优先级：回退到原有逻辑
        if (state.quotaKeys && state.quotaKeys.length > 0) {
            const activeKey = state.quotaKeys.find(key => key.quota_key === state.activationCode);
            if (activeKey && activeKey.quota_key_max_quota !== undefined) {
                return `${activeKey.quota_key_max_quota.toLocaleString()} 次`;
            }
        }
        
        // 处理新用户或激活码不存在的情况
        if (state.activationCode && !quotaInfo) {
            return '点击刷新获取额度';
        }
        
        return '暂无数据';
    };

    // 切换账号处理
    const handleSwitchAccount = async () => {
        try {
            await refresh();
        } catch (error) {
            // Error is handled by the context
        }
    };

    // 清除数据处理
    const handleClearData = async () => {
        try {
            await clearData();
        } catch (error) {
            // Error is handled by the context
        }
    };

    // 解绑设备处理
    const handleReleaseDevice = async () => {
        try {
            await releaseDevice();
        } catch (error) {
            // Error is handled by the context
        }
    };

    const isActivated = state?.isActivated && state?.activationCode;

    return (
        <div className="device-info card">
            <h3>账号信息</h3>
            
            <div className="info-row">
                <span className="label">当前账号:</span>
                <span className="value account-info">{getCurrentAccount()}</span>
            </div>
            
            <div className="info-row">
                <span className="label">剩余额度:</span>
                <span className="value quota-info">{getRemainingQuota()}</span>
                <button 
                    className="refresh-quota-btn"
                    onClick={refreshQuota}
                    disabled={isRefreshing || !state.activationCode}
                    title="刷新额度信息"
                >
                    {isRefreshing ? '🔄' : '↻'}
                </button>
            </div>

            <div className="action-buttons">
                <button 
                    className="switch-account-btn"
                    onClick={handleSwitchAccount}
                    disabled={loading || !isActivated}
                    title={isActivated ? "切换到新的账号信息" : "请先激活账号"}
                >
                    {loading ? '切换中...' : '切换账号'}
                </button>
                
                {isActivated && (
                    <>
                        <button 
                            className="release-btn"
                            onClick={handleReleaseDevice}
                            disabled={loading}
                        >
                            解绑设备
                        </button>
                        
                        <button 
                            className="clear-btn"
                            onClick={handleClearData}
                            disabled={loading}
                        >
                            退出登入
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
