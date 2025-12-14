import * as vscode from 'vscode';

export interface WindsurfCredentials {
    apiKey: string;
    mail: string;
    apiServerUrl: string;
}

export class CredentialService {
    private static readonly WINDSURF_SESSIONS_KEY = 'windsurf.auth.sessions';
    private static readonly WINDSURF_API_SERVER_KEY = 'apiServerUrl';

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * 从当前 Windsurf 登录中获取凭据
     */
    async getCurrentCredentials(): Promise<WindsurfCredentials | null> {
        try {
            // 尝试获取 Windsurf 的 session
            const sessions = await vscode.authentication.getSession('windsurf', [], { silent: true });
            
            if (sessions) {
                console.log('📋 [CredentialService] 找到 Windsurf session');
                
                // 从 session 中提取信息
                const apiKey = sessions.accessToken;
                const mail = sessions.account.label;
                
                // 尝试获取 apiServerUrl
                // Windsurf 存储在 globalState 中
                const apiServerUrl = await this.getApiServerUrl();
                
                if (apiKey && mail) {
                    return {
                        apiKey,
                        mail,
                        apiServerUrl: apiServerUrl || 'https://api.codeium.com'
                    };
                }
            }

            console.log('⚠️ [CredentialService] 未找到 Windsurf session，尝试其他方式...');
            
            // 尝试从扩展的 secrets 读取
            return await this.getCredentialsFromSecrets();

        } catch (error) {
            console.error('❌ [CredentialService] 获取凭据失败:', error);
            return null;
        }
    }

    /**
     * 尝试从 Windsurf 扩展的 globalState 获取 apiServerUrl
     */
    private async getApiServerUrl(): Promise<string | undefined> {
        try {
            // Windsurf 主扩展存储 apiServerUrl 在 globalState
            // 我们尝试通过命令或者直接访问
            const windsurfExt = vscode.extensions.getExtension('codeium.windsurf');
            if (windsurfExt) {
                // 扩展存在，但我们无法直接访问其 globalState
                // 返回默认值
                return 'https://api.codeium.com';
            }
        } catch (error) {
            console.warn('获取 apiServerUrl 失败:', error);
        }
        return undefined;
    }

    /**
     * 尝试从 secrets 获取凭据
     */
    private async getCredentialsFromSecrets(): Promise<WindsurfCredentials | null> {
        try {
            // 读取本扩展存储的 sessions（如果有的话）
            const storedSessions = await this.context.secrets.get(CredentialService.WINDSURF_SESSIONS_KEY);
            
            if (storedSessions) {
                const sessions = JSON.parse(storedSessions);
                if (sessions && sessions.length > 0) {
                    const session = sessions[0];
                    return {
                        apiKey: session.accessToken,
                        mail: session.account?.label || session.account?.id || '',
                        apiServerUrl: 'https://api.codeium.com'
                    };
                }
            }
        } catch (error) {
            console.error('从 secrets 获取凭据失败:', error);
        }
        return null;
    }
}
