import * as vscode from 'vscode';
import * as path from 'path';
import { StorageService } from '../services/storageService';
import { ApiService } from '../services/apiService';
import { WindsurfAutoLoginService } from '../services/windsurfAutoLoginService';
import { WindsurfPatchService } from '../services/windsurfPatchService';
import { WebviewMessage, WebviewResponse } from '../types/state';
import { ApiResponse } from '../types/api';
import { API_CONFIG } from '../config/api';

// 辅助函数：获取API响应的错误消息（兼容msg和message字段）
function getErrorMessage(response: ApiResponse, defaultMsg: string): string {
    return response.message || response.msg || defaultMsg;
}

import { RefreshResponse } from '../types/api';

export class QuotaKeyManagerViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'xg-windsurf.view';
    private _view?: vscode.WebviewView;
    private readonly windsurfAutoLoginService: WindsurfAutoLoginService;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly storageService: StorageService,
        private readonly apiService: ApiService
    ) {
        this.windsurfAutoLoginService = new WindsurfAutoLoginService(context);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            const { command, requestId, payload } = message;

            try {
                switch (command) {
                    case 'GET_STATE':
                        await this.handleGetState(webviewView.webview, requestId);
                        break;
                    
                    case 'ACTIVATE':
                        await this.handleActivate(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'REFRESH':
                        await this.handleRefresh(webviewView.webview, requestId);
                        break;
                    
                    case 'CLEAR_DATA':
                        await this.handleClearData(webviewView.webview, requestId);
                        break;
                    
                    case 'RELEASE_DEVICE':
                        await this.handleReleaseDevice(webviewView.webview, requestId);
                        break;
                    
                    case 'SIMULATE_REFRESH':
                        await this.handleSimulateRefresh(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'SHOW_ERROR':
                        await this.handleShowError(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'SHOW_INFO':
                        await this.handleShowInfo(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'SHOW_CONFIRM':
                        await this.handleShowConfirm(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'CONVERT_KEY':
                        await this.handleConvertKey(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'SWITCH_HISTORICAL_ACCOUNT':
                        await this.handleSwitchHistoricalAccount(webviewView.webview, requestId, payload);
                        break;
                    
                    case 'DELETE_HISTORICAL_ACCOUNT':
                        await this.handleDeleteHistoricalAccount(webviewView.webview, requestId, payload);
                        break;
                    
                    default:
                        webviewView.webview.postMessage({
                            command,
                            requestId,
                            error: `未知命令: ${command}`
                        } as WebviewResponse);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                vscode.window.showErrorMessage(errorMessage);
                webviewView.webview.postMessage({
                    command,
                    requestId,
                    error: errorMessage
                } as WebviewResponse);
            }
        }, undefined, this.context.subscriptions);
    }

    private async handleGetState(webview: vscode.Webview, requestId: string) {
        const state = await this.storageService.getCurrentState();
        
        // Add logo URI for webview
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'logo.jpg')
        ).toString();
        
        webview.postMessage({
            command: 'GET_STATE',
            requestId,
            payload: {
                ...state,
                logoUri
            }
        } as WebviewResponse);
    }

    private async handleActivate(webview: vscode.Webview, requestId: string, payload: { activationCode: string }) {
        const { activationCode } = payload;

        if (!activationCode || activationCode.trim() === '') {
            throw new Error('需要激活码');
        }

        const deviceId = await this.storageService.getDeviceId();
        const response = await this.apiService.activate({
            activationCode: activationCode.trim(),
            deviceId
        });

        if (response.code !== 0) {
            throw new Error(getErrorMessage(response, '激活失败'));
        }

        // Save activation data
        await this.storageService.setActivationCode(activationCode.trim());
        
        if (response.data) {
            // 保存激活响应返回的额度信息
            console.log('Activation response:', response.data);
            
            if (response.data.quota_used !== undefined) {
                await this.storageService.setQuotaUsed(response.data.quota_used);
            }
            if (response.data.quota_total !== undefined) {
                await this.storageService.setQuotaTotal(response.data.quota_total);
            }
            if (response.data.quota_remaining !== undefined) {
                await this.storageService.setQuotaRemaining(response.data.quota_remaining);
            }
            if (response.data.activated_at) {
                await this.storageService.setActivatedAt(response.data.activated_at);
            }
            if (response.data.expired_at !== undefined) {
                await this.storageService.setExpiredAt(response.data.expired_at);
            }
        }

        await this.storageService.setLastRefresh(new Date().toISOString());

        vscode.window.showInformationMessage('激活成功！');
        await this.handleGetState(webview, requestId);
    }

    private async handleRefresh(webview: vscode.Webview, requestId: string) {
        // 1. 检查并应用补丁（如果需要）
        console.log('🌊 [handleRefresh] 开始检查 Windsurf 补丁...');
        const patchResult = await WindsurfPatchService.checkAndApplyPatch();
        
        if (patchResult.needsRestart) {
            // 需要重启 Windsurf
            console.log('🔄 [handleRefresh] 补丁已应用，准备重启 Windsurf...');
            vscode.window.showInformationMessage("补丁已应用，Windsurf 将在 8 秒后重启。重启完成后请再次点击【切换账号】按钮。");
            
            // 延迟8秒后重启窗口
            setTimeout(() => {
                console.log('🔄 [handleRefresh] 执行窗口重启命令...');
                vscode.commands.executeCommand("workbench.action.reloadWindow");
            }, 8000);
            
            return;
        }
        
        if (patchResult.error) {
            console.error('❌ [handleRefresh] 补丁检查/应用失败:', patchResult.error);
            throw new Error(patchResult.error);
        }

        console.log('✅ [handleRefresh] 补丁检查完成，开始执行刷新流程...');

        const deviceId = await this.storageService.getDeviceId();
        const activationCode = await this.storageService.getActivationCode();

        if (!activationCode) {
            throw new Error('刷新需要激活码');
        }

        const response = await this.apiService.refresh({
            activationCode,
            deviceId,
            oldToken: await this.storageService.getToken()
        });

        if (response.code !== 0) {
            throw new Error(getErrorMessage(response, '刷新失败'));
        }

        // Update stored data
        if (response.data) {
            // 新的refresh API返回不同的数据结构
            if (response.data.mail) {
                await this.storageService.setMail(response.data.mail);
            }
            if (response.data.key_info) {
                await this.storageService.setKeyInfo(response.data.key_info);
                
                // 同时更新额度信息，这样切换账号后额度会自动更新
                const { quota_key_max_quota, quota_key_used_quota } = response.data.key_info;
                if (quota_key_max_quota !== undefined && quota_key_used_quota !== undefined) {
                    const quotaRemaining = quota_key_max_quota - quota_key_used_quota;
                    await this.storageService.setQuotaTotal(quota_key_max_quota);
                    await this.storageService.setQuotaUsed(quota_key_used_quota);
                    await this.storageService.setQuotaRemaining(quotaRemaining);
                }
            }
            if (response.data.oem_info) {
                await this.storageService.setOEMConfig(response.data.oem_info);
            }

            // 处理解密后的 metadata
            if (response.data.decryptedMetadata) {
                await this.storageService.setDecryptedMetadata(response.data.decryptedMetadata);
                
                // 提取 Windsurf 自动登录所需的参数
                const { apiKey, mail, apiServerUrl } = response.data.decryptedMetadata;
                
                if (apiKey && mail && apiServerUrl) {
                    try {
                        // 执行 Windsurf 自动登录
                        const loginResult = await this.windsurfAutoLoginService.injectSession(apiKey, mail, apiServerUrl);
                        
                        if (loginResult.needsRestart) {
                            // 需要重启，不继续执行后续逻辑
                            return;
                        } else if (loginResult.success) {
                            vscode.window.showInformationMessage('令牌刷新成功！Windsurf 自动登录完成。');
                        } else {
                            vscode.window.showErrorMessage(`令牌刷新成功，但自动登录失败: ${loginResult.error}`);
                        }
                    } catch (autoLoginError) {
                        console.error('自动登录失败:', autoLoginError);
                        vscode.window.showErrorMessage(`令牌刷新成功，但自动登录失败: ${autoLoginError instanceof Error ? autoLoginError.message : '未知错误'}`);
                    }
                } else {
                    vscode.window.showInformationMessage('令牌刷新成功！');
                }
            } else {
                vscode.window.showInformationMessage('令牌刷新成功！');
            }
        }

        await this.storageService.setLastRefresh(new Date().toISOString());
        
        // 保存当前账号到历史记录
        await this.storageService.saveCurrentAccountToHistory();
        
        await this.handleGetState(webview, requestId);
    }


    private async handleClearData(webview: vscode.Webview, requestId: string) {
        await this.storageService.clearAllData();
        vscode.window.showInformationMessage('所有数据清除成功！');
        await this.handleGetState(webview, requestId);
    }

    private async handleReleaseDevice(webview: vscode.Webview, requestId: string) {
        const deviceId = await this.storageService.getDeviceId();
        const activationCode = await this.storageService.getActivationCode();

        if (!activationCode) {
            throw new Error('解绑设备需要激活码');
        }

        const confirmText = '确定解绑';
        const result = await vscode.window.showWarningMessage(
            '确定要解绑此设备吗？解绑后需要重新激活。',
            { modal: true },
            confirmText
        );

        if (result !== confirmText) {
            webview.postMessage({
                command: 'RELEASE_DEVICE',
                requestId,
                payload: { cancelled: true }
            } as WebviewResponse);
            return;
        }

        const response = await this.apiService.releaseDevice(activationCode, deviceId);

        if (response.code !== 0) {
            throw new Error(getErrorMessage(response, '设备解绑失败'));
        }

        await this.storageService.clearAllData();
        vscode.window.showInformationMessage('设备解绑成功！');
        await this.handleGetState(webview, requestId);
    }

    private async handleSimulateRefresh(webview: vscode.Webview, requestId: string, payload: { responseData: string }) {
        const { responseData } = payload;

        if (!responseData || responseData.trim() === '') {
            throw new Error('模拟需要响应数据');
        }

        try {
            // 解析输入的响应数据
            const response: RefreshResponse = JSON.parse(responseData.trim());
            
            console.log('🔧 模拟 Refresh 响应:', response);

            if (response.code !== 0) {
                throw new Error(getErrorMessage(response, '模拟刷新失败'));
            }

            // 简单记录响应数据，不进行复杂的模拟处理
            console.log('🔧 模拟 Refresh 数据已解析:', response.data);
            vscode.window.showInformationMessage('🔧 [模拟] 刷新响应解析成功！');

            await this.storageService.setLastRefresh(new Date().toISOString());
            
            webview.postMessage({
                command: 'SIMULATE_REFRESH',
                requestId,
                payload: { success: true, message: '模拟完成成功' }
            } as WebviewResponse);
            
            await this.handleGetState(webview, requestId);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '模拟失败';
            console.error('Simulation error:', error);
            
            webview.postMessage({
                command: 'SIMULATE_REFRESH',
                requestId,
                error: errorMessage
            } as WebviewResponse);
        }
    }

    private async handleShowError(webview: vscode.Webview, requestId: string, payload: { message: string }) {
        const { message } = payload;
        vscode.window.showErrorMessage(message);
        
        webview.postMessage({
            command: 'SHOW_ERROR',
            requestId,
            payload: { success: true }
        } as WebviewResponse);
    }

    private async handleShowInfo(webview: vscode.Webview, requestId: string, payload: { message: string }) {
        const { message } = payload;
        vscode.window.showInformationMessage(message);
        
        webview.postMessage({
            command: 'SHOW_INFO',
            requestId,
            payload: { success: true }
        } as WebviewResponse);
    }

    private async handleShowConfirm(webview: vscode.Webview, requestId: string, payload: { message: string; detail?: string }) {
        const { message, detail } = payload;
        const result = await vscode.window.showWarningMessage(
            message,
            { modal: true, detail },
            '确定',
            '取消'
        );
        
        webview.postMessage({
            command: 'SHOW_CONFIRM',
            requestId,
            payload: { confirmed: result === '确定' }
        } as WebviewResponse);
    }

    private async handleConvertKey(webview: vscode.Webview, requestId: string, payload: { keyCode: string }) {
        const { keyCode } = payload;
        
        try {
            const response = await this.apiService.convertKey({ key_code: keyCode });
            
            if (response.code === 200) {
                webview.postMessage({
                    command: 'CONVERT_KEY',
                    requestId,
                    payload: {
                        success: true,
                        newKey: response.data.new_key,
                        newQuota: response.data.new_quota,
                        newExpiredAt: response.data.new_expired_at,
                        originalQuotaRemaining: response.data.original_quota_remaining
                    }
                } as WebviewResponse);
            } else {
                throw new Error(response.message || '转换失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '转换失败';
            webview.postMessage({
                command: 'CONVERT_KEY',
                requestId,
                error: errorMessage
            } as WebviewResponse);
        }
    }

    private async handleSwitchHistoricalAccount(webview: vscode.Webview, requestId: string, payload: { accountId: string }) {
        const { accountId } = payload;
        
        try {
            // 切换到历史账号
            const success = await this.storageService.switchToHistoricalAccount(accountId);
            
            if (!success) {
                throw new Error('切换历史账号失败：未找到指定账号');
            }

            // 获取切换后的账号信息
            const mail = await this.storageService.getMail();
            const decryptedMetadata = await this.storageService.getDecryptedMetadata();

            // 如果有解密后的元数据，执行 Windsurf 自动登录
            if (decryptedMetadata?.apiKey && decryptedMetadata?.mail && decryptedMetadata?.apiServerUrl) {
                try {
                    const loginResult = await this.windsurfAutoLoginService.injectSession(
                        decryptedMetadata.apiKey,
                        decryptedMetadata.mail,
                        decryptedMetadata.apiServerUrl
                    );
                    
                    if (loginResult.needsRestart) {
                        // 需要重启，不继续执行后续逻辑
                        return;
                    } else if (loginResult.success) {
                        vscode.window.showInformationMessage(`已切换到账号: ${mail}`);
                    } else {
                        vscode.window.showWarningMessage(`已切换到账号: ${mail}，但自动登录失败`);
                    }
                } catch (autoLoginError) {
                    console.error('自动登录失败:', autoLoginError);
                    vscode.window.showWarningMessage(`已切换到账号: ${mail}，但自动登录失败`);
                }
            } else {
                vscode.window.showInformationMessage(`已切换到账号: ${mail}`);
            }

            await this.handleGetState(webview, requestId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '切换历史账号失败';
            webview.postMessage({
                command: 'SWITCH_HISTORICAL_ACCOUNT',
                requestId,
                error: errorMessage
            } as WebviewResponse);
        }
    }

    private async handleDeleteHistoricalAccount(webview: vscode.Webview, requestId: string, payload: { accountId: string }) {
        const { accountId } = payload;
        
        try {
            const success = await this.storageService.deleteHistoricalAccount(accountId);
            
            if (!success) {
                throw new Error('删除历史账号失败：未找到指定账号');
            }

            vscode.window.showInformationMessage('历史账号已删除');
            await this.handleGetState(webview, requestId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除历史账号失败';
            webview.postMessage({
                command: 'DELETE_HISTORICAL_ACCOUNT',
                requestId,
                error: errorMessage
            } as WebviewResponse);
        }
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this.getWebviewContent(this._view.webview);
        }
    }

    private getWebviewContent(webview: vscode.Webview): string {
        let scriptSources: string[] = [];
        const isProduction = this.context.extensionMode === vscode.ExtensionMode.Production;

        if (isProduction) {
            // Production: Load from dist
            const manifestUri = webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'manifest.json')
            );
            scriptSources = [
                webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'react-vendor.bundle.js')).toString(),
                webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'vendors.bundle.js')).toString(),
                webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.bundle.js')).toString()
            ];
        } else {
            // Development: Load from dev server
            scriptSources = [
                'http://localhost:9000/react-vendor.bundle.js',
                'http://localhost:9000/vendors.bundle.js',
                'http://localhost:9000/main.bundle.js'
            ];
        }

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
                script-src ${isProduction ? `'nonce-${nonce}'` : 'http://localhost:9000 \'unsafe-eval\''} 'unsafe-inline'; 
                style-src ${webview.cspSource} 'unsafe-inline' ${isProduction ? '' : 'http://localhost:9000'}; 
                img-src ${webview.cspSource} https: data:; 
                connect-src ${isProduction ? API_CONFIG.BASE_URL : `ws://localhost:9000 http://localhost:9000 ${API_CONFIG.BASE_URL}`} https:;">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>XG-Windsurf</title>
        </head>
        <body>
            <div id="root"></div>
            ${scriptSources.map(src => `<script ${isProduction ? `nonce="${nonce}"` : ''} src="${src}"></script>`).join('\n            ')}
        </body>
        </html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
