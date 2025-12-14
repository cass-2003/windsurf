import * as vscode from 'vscode';
import { WindsurfPatchService } from './windsurfPatchService';
import { Account } from '../types/account';

export interface LoginResult {
    success: boolean;
    error?: string;
    needsRestart?: boolean;
}

export class WindsurfLoginService {
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * 注入 Windsurf 会话，实现自动登录
     */
    async injectSession(account: Account): Promise<LoginResult> {
        try {
            const { apiKey, mail, apiServerUrl } = account;

            // 验证必需参数
            if (!apiKey || !mail || !apiServerUrl) {
                return {
                    success: false,
                    error: '缺少必要的凭据 (apiKey, mail, 或 apiServerUrl)'
                };
            }

            // 检查并应用补丁
            console.log('🔍 [WindsurfLoginService] 检查补丁状态...');
            const patchResult = await WindsurfPatchService.checkAndApplyPatch();

            if (patchResult.needsRestart) {
                console.log('🔄 [WindsurfLoginService] 补丁已应用，需要重启');
                vscode.window.showInformationMessage('补丁已应用，Windsurf 将在 3 秒后重启。重启完成后请再次切换账号。');

                setTimeout(() => {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }, 3000);

                return {
                    success: false,
                    needsRestart: true,
                    error: '补丁已应用，正在重启'
                };
            }

            if (patchResult.error) {
                return {
                    success: false,
                    error: patchResult.error
                };
            }

            // 先登出现有会话
            console.log('🚪 [WindsurfLoginService] 登出现有会话...');
            try {
                await vscode.commands.executeCommand('windsurf.logout');
            } catch (e) {
                // 忽略登出错误
            }

            // 执行自动登录
            console.log('🔐 [WindsurfLoginService] 执行登录...');
            console.log(`📧 邮箱: ${mail}`);
            console.log(`🔗 服务器: ${apiServerUrl}`);

            await vscode.commands.executeCommand('windsurf.provideAuthTokenToAuthProviderWithShit', {
                apiKey,
                name: mail,
                apiServerUrl
            });

            console.log('🎉 [WindsurfLoginService] 登录成功');
            return { success: true };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            console.error('❌ [WindsurfLoginService] 登录失败:', error);
            return {
                success: false,
                error: `登录失败: ${errorMessage}`
            };
        }
    }

    /**
     * 检查登录命令是否可用
     */
    async isLoginCommandAvailable(): Promise<boolean> {
        try {
            const commands = await vscode.commands.getCommands();
            return commands.includes('windsurf.provideAuthTokenToAuthProviderWithShit');
        } catch {
            return false;
        }
    }
}
