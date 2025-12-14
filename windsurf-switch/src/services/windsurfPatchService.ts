import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PatchResult {
    success: boolean;
    needsRestart?: boolean;
    error?: string;
}

export class WindsurfPatchService {
    // 补丁标记
    private static readonly PATCH_MARKER = 'handleAuthTokenWithShit';

    // 原始的 handleAuthToken 函数
    private static readonly ORIGINAL_HANDLE_AUTH_TOKEN = 'async handleAuthToken(A){const e=await(0,Q.registerUser)(A),{apiKey:t,name:i}=e,o=(0,B.getApiServerUrl)(e.apiServerUrl);if(!t)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty api_key");if(!i)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty name");const r={id:(0,g.v4)(),accessToken:t,account:{label:i,id:i},scopes:[]};return await this.context.secrets.store(u.sessionsSecretKey,JSON.stringify([r])),await this.context.globalState.update("apiServerUrl",o),(0,n.isString)(o)&&!(0,n.isEmpty)(o)&&o!==I.LanguageServerClient.getInstance().apiServerUrl&&await I.LanguageServerClient.getInstance().restart(o),this._sessionChangeEmitter.fire({added:[r],removed:[],changed:[]}),r}';

    // 新的 handleAuthTokenWithShit 函数
    private static readonly NEW_HANDLE_AUTH_TOKEN_WITH_SHIT = 'async handleAuthTokenWithShit(A){const{apiKey:t,name:i}=A,o=(0,B.getApiServerUrl)(A.apiServerUrl);if(!t)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty api_key");if(!i)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty name");const r={id:(0,g.v4)(),accessToken:t,account:{label:i,id:i},scopes:[]};return await this.context.secrets.store(u.sessionsSecretKey,JSON.stringify([r])),await this.context.globalState.update("apiServerUrl",o),(0,n.isString)(o)&&!(0,n.isEmpty)(o)&&o!==I.LanguageServerClient.getInstance().apiServerUrl&&await I.LanguageServerClient.getInstance().restart(o),this._sessionChangeEmitter.fire({added:[r],removed:[],changed:[]}),r}';

    // 原始的命令注册
    private static readonly ORIGINAL_COMMAND_REGISTRATION = "A.subscriptions.push(s.commands.registerCommand(t.PROVIDE_AUTH_TOKEN_TO_AUTH_PROVIDER,async A=>{try{return{session:await e.handleAuthToken(A),error:void 0}}catch(A){return A instanceof a.WindsurfError?{error:A.errorMetadata}:{error:C.WindsurfExtensionMetadata.getInstance().errorCodes.GENERIC_ERROR}}}),s.commands.registerCommand(t.LOGIN_WITH_REDIRECT,async(A,e)=>await(0,m.getAuthSession)({promptLoginIfNone:!0,shouldRegisterNewUser:A,fromOnboarding:e})),s.commands.registerCommand(t.LOGIN_WITH_AUTH_TOKEN,()=>{e.provideAuthToken()}),s.commands.registerCommand(t.CANCEL_LOGIN,()=>{w.WindsurfAuthProvider.getInstance().forceCancellation()}),s.commands.registerCommand(t.LOGOUT,async()=>{const A=w.WindsurfAuthProvider.getInstance(),e=await A.getSessions();e.length>0&&await A.removeSession(e[0].id)})),";

    // 新的命令注册
    private static readonly NEW_COMMAND_REGISTRATION = 'A.subscriptions.push(s.commands.registerCommand("windsurf.provideAuthTokenToAuthProviderWithShit",async A=>{try{return{session:await e.handleAuthTokenWithShit(A),error:void 0}}catch(A){return A instanceof a.WindsurfError?{error:A.errorMetadata}:{error:C.WindsurfExtensionMetadata.getInstance().errorCodes.GENERIC_ERROR}}})),';

    /**
     * 获取 Windsurf 扩展路径
     */
    static getExtensionPath(): string | null {
        const appRoot = vscode.env.appRoot;
        const extensionPath = path.join(appRoot, 'extensions', 'windsurf-main', 'dist', 'extension.js');
        
        if (fs.existsSync(extensionPath)) {
            return extensionPath;
        }
        return null;
    }

    /**
     * 检查补丁是否已应用
     */
    static async isPatchApplied(): Promise<boolean> {
        const extensionPath = this.getExtensionPath();
        if (!extensionPath) {
            return false;
        }

        try {
            const content = fs.readFileSync(extensionPath, 'utf-8');
            return content.includes(this.PATCH_MARKER);
        } catch (error) {
            console.error('检查补丁状态失败:', error);
            return false;
        }
    }

    /**
     * 检查并应用补丁
     */
    static async checkAndApplyPatch(): Promise<PatchResult> {
        console.log('🔍 [WindsurfPatchService] 开始检查补丁状态...');

        // 检查补丁是否已应用
        const isApplied = await this.isPatchApplied();
        if (isApplied) {
            console.log('✅ [WindsurfPatchService] 补丁已应用');
            return { success: true };
        }

        console.log('⚠️ [WindsurfPatchService] 补丁未应用，准备应用...');

        // 获取扩展路径
        const extensionPath = this.getExtensionPath();
        if (!extensionPath) {
            return {
                success: false,
                error: '未找到 Windsurf 扩展文件，请确保在 Windsurf 中运行此插件'
            };
        }

        try {
            // 创建备份
            const backupPath = extensionPath + '.backup';
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(extensionPath, backupPath);
                console.log('📦 [WindsurfPatchService] 已创建备份');
            }

            // 读取文件内容
            let fileContent = fs.readFileSync(extensionPath, 'utf-8');
            console.log(`📊 [WindsurfPatchService] 文件大小: ${fileContent.length} 字符`);

            // 1. 添加新的 handleAuthTokenWithShit 函数
            const handleAuthTokenIndex = fileContent.indexOf(this.ORIGINAL_HANDLE_AUTH_TOKEN);
            if (handleAuthTokenIndex === -1) {
                return {
                    success: false,
                    error: '未找到 handleAuthToken 函数，Windsurf 版本可能不兼容'
                };
            }

            const insertPosition1 = handleAuthTokenIndex + this.ORIGINAL_HANDLE_AUTH_TOKEN.length;
            fileContent = fileContent.substring(0, insertPosition1) + 
                         this.NEW_HANDLE_AUTH_TOKEN_WITH_SHIT + 
                         fileContent.substring(insertPosition1);

            // 2. 添加新的命令注册
            const commandRegistrationIndex = fileContent.indexOf(this.ORIGINAL_COMMAND_REGISTRATION);
            if (commandRegistrationIndex === -1) {
                return {
                    success: false,
                    error: '未找到命令注册，Windsurf 版本可能不兼容'
                };
            }

            const insertPosition2 = commandRegistrationIndex + this.ORIGINAL_COMMAND_REGISTRATION.length;
            fileContent = fileContent.substring(0, insertPosition2) + 
                         this.NEW_COMMAND_REGISTRATION + 
                         fileContent.substring(insertPosition2);

            // 写入修改后的文件
            fs.writeFileSync(extensionPath, fileContent, 'utf-8');
            console.log('✅ [WindsurfPatchService] 补丁应用成功');

            return {
                success: true,
                needsRestart: true
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            console.error('❌ [WindsurfPatchService] 应用补丁失败:', error);
            return {
                success: false,
                error: `应用补丁失败: ${errorMessage}`
            };
        }
    }
}
