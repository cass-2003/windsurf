import React, { useState } from 'react';
import { useExtensionState } from '../hooks/useExtensionState';

export const CursorKeyConverter: React.FC = () => {
    const [cursorKey, setCursorKey] = useState('');
    const [converting, setConverting] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const { sendMessage } = useExtensionState();

    const handleConvert = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedKey = cursorKey.trim();
        
        if (!trimmedKey) {
            return;
        }

        // 验证卡密格式
        if (!trimmedKey.startsWith('XG')) {
            try {
                await sendMessage('SHOW_ERROR', { 
                    message: '卡密格式错误' 
                });
            } catch (err) {
                console.error('显示错误消息失败:', err);
            }
            return;
        }

        if (trimmedKey.length <= 10) {
            try {
                await sendMessage('SHOW_ERROR', { 
                    message: '卡密格式错误' 
                });
            } catch (err) {
                console.error('显示错误消息失败:', err);
            }
            return;
        }

        // 确认转换
        try {
            const result = await sendMessage('SHOW_CONFIRM', {
                message: `确认转换卡密？\n\n转换后将删除此 Cursor 卡密，此操作不可撤销！`,
                
            });

            if (!result?.confirmed) {
                return;
            }
        } catch (err) {
            console.error('显示确认对话框失败:', err);
            return;
        }

        setConverting(true);
        try {
            // 调用转换API
            const result = await sendMessage('CONVERT_KEY', { keyCode: trimmedKey });
            
            if (result?.success && result?.newKey) {
                // 转换成功，显示新卡密
                setNewKey(result.newKey);
                setCursorKey('');
                
                await sendMessage('SHOW_INFO', { 
                    message: '转换成功！Cursor 卡密已删除。' 
                });
            } else {
                throw new Error('转换失败');
            }
        } catch (error) {
            console.error('转换失败:', error);
            const errorMsg = error instanceof Error ? error.message : '转换失败，请重试';
            try {
                await sendMessage('SHOW_ERROR', { 
                    message: errorMsg
                });
            } catch (err) {
                console.error('显示错误消息失败:', err);
            }
        } finally {
            setConverting(false);
        }
    };

    return (
        <div className="cursor-converter card">
            <div className="converter-header">
                <h3>Cursor卡密转换</h3>
            </div>

            <form onSubmit={handleConvert} className="converter-form">
                <div className="input-group">
                    <input
                        type="text"
                        value={cursorKey}
                        onChange={(e) => setCursorKey(e.target.value)}
                        placeholder="请输入Cursor卡密"
                        className="activation-input"
                        disabled={converting}
                    />
                    <button 
                        type="submit" 
                        className="convert-btn"
                        disabled={converting || !cursorKey.trim()}
                    >
                        {converting ? '转换中...' : '转换'}
                    </button>
                </div>
            </form>

            <div className="converter-hint">
                <span className="hint-text">将Cursor卡密转换为Windsurf激活码</span>
            </div>

            {newKey && (
                <div className="converted-result">
                    <div className="result-header">
                        <span className="result-label">转换成功！请务必保存好新激活码</span>
                    </div>
                    <div className="result-key">
                        <code className="new-key-code">{newKey}</code>
                        <button
                            className="copy-key-btn"
                            onClick={() => {
                                navigator.clipboard.writeText(newKey);
                                sendMessage('SHOW_INFO', { message: '激活码已复制到剪贴板' });
                            }}
                        >
                            复制
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
