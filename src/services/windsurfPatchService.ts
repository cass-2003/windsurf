import * as fs from 'fs';
import { WindsurfPathService } from './windsurfPathService';

export interface PatchResult {
    success: boolean;
    error?: string;
}

export interface PatchCheckResult {
    needsRestart: boolean;
    error?: string;
}

export interface PermissionCheckResult {
    hasPermission: boolean;
    error?: string;
}

export class WindsurfPatchService {
    // 检测关键字 - 用于验证补丁是否已应用
    private static readonly PATCH_KEYWORD_1 = "windsurf.provideAuthTokenToAuthProviderWithShit";
    private static readonly PATCH_KEYWORD_2 = "handleAuthTokenWithShit";

    // 原始的 handleAuthToken 函数
    private static readonly ORIGINAL_HANDLE_AUTH_TOKEN = 'async handleAuthToken(A){const e=await(0,Q.registerUser)(A),{apiKey:t,name:i}=e,o=(0,B.getApiServerUrl)(e.apiServerUrl);if(!t)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty api_key");if(!i)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty name");const r={id:(0,g.v4)(),accessToken:t,account:{label:i,id:i},scopes:[]};return await this.context.secrets.store(u.sessionsSecretKey,JSON.stringify([r])),await this.context.globalState.update("apiServerUrl",o),(0,n.isString)(o)&&!(0,n.isEmpty)(o)&&o!==I.LanguageServerClient.getInstance().apiServerUrl&&await I.LanguageServerClient.getInstance().restart(o),this._sessionChangeEmitter.fire({added:[r],removed:[],changed:[]}),r}';

    // 新的 handleAuthTokenWithShit 函数
    private static readonly NEW_HANDLE_AUTH_TOKEN_WITH_SHIT = 'async handleAuthTokenWithShit(A){const{apiKey:t,name:i}=A,o=(0,B.getApiServerUrl)(A.apiServerUrl);if(!t)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty api_key");if(!i)throw new s.AuthMalformedLanguageServerResponseError("Auth login failure: empty name");const r={id:(0,g.v4)(),accessToken:t,account:{label:i,id:i},scopes:[]};return await this.context.secrets.store(u.sessionsSecretKey,JSON.stringify([r])),await this.context.globalState.update("apiServerUrl",o),(0,n.isString)(o)&&!(0,n.isEmpty)(o)&&o!==I.LanguageServerClient.getInstance().apiServerUrl&&await I.LanguageServerClient.getInstance().restart(o),this._sessionChangeEmitter.fire({added:[r],removed:[],changed:[]}),r}';

    // 原始的命令注册
    private static readonly ORIGINAL_COMMAND_REGISTRATION = "A.subscriptions.push(s.commands.registerCommand(t.PROVIDE_AUTH_TOKEN_TO_AUTH_PROVIDER,async A=>{try{return{session:await e.handleAuthToken(A),error:void 0}}catch(A){return A instanceof a.WindsurfError?{error:A.errorMetadata}:{error:C.WindsurfExtensionMetadata.getInstance().errorCodes.GENERIC_ERROR}}}),s.commands.registerCommand(t.LOGIN_WITH_REDIRECT,async(A,e)=>await(0,m.getAuthSession)({promptLoginIfNone:!0,shouldRegisterNewUser:A,fromOnboarding:e})),s.commands.registerCommand(t.LOGIN_WITH_AUTH_TOKEN,()=>{e.provideAuthToken()}),s.commands.registerCommand(t.CANCEL_LOGIN,()=>{w.WindsurfAuthProvider.getInstance().forceCancellation()}),s.commands.registerCommand(t.LOGOUT,async()=>{const A=w.WindsurfAuthProvider.getInstance(),e=await A.getSessions();e.length>0&&await A.removeSession(e[0].id)})),";

    // 新的命令注册
    private static readonly NEW_COMMAND_REGISTRATION = 'A.subscriptions.push(s.commands.registerCommand("windsurf.provideAuthTokenToAuthProviderWithShit",async A=>{try{return{session:await e.handleAuthTokenWithShit(A),error:void 0}}catch(A){return A instanceof a.WindsurfError?{error:A.errorMetadata}:{error:C.WindsurfExtensionMetadata.getInstance().errorCodes.GENERIC_ERROR}}})),';

    /**
     * 检查补丁是否已应用
     * @returns 是否已应用补丁
     */
    static async isPatchApplied(): Promise<boolean> {
        console.log('🔍 [WindsurfPatchService] 开始检查补丁是否已应用...');
        
        try {
            const extensionPath = WindsurfPathService.getExtensionPath();
            if (!extensionPath) {
                console.warn('⚠️ [WindsurfPatchService] 无法获取 Windsurf 扩展路径，补丁检查失败');
                return false;
            }

            console.log('📖 [WindsurfPatchService] 读取扩展文件内容...');
            const fileContent = fs.readFileSync(extensionPath, 'utf-8');
            console.log(`📊 [WindsurfPatchService] 文件内容长度: ${fileContent.length} 字符`);
            
            console.log(`🔍 [WindsurfPatchService] 检查关键字1: "${this.PATCH_KEYWORD_1}"`);
            const hasKeyword1 = fileContent.includes(this.PATCH_KEYWORD_1);
            console.log(`${hasKeyword1 ? '✅' : '❌'} [WindsurfPatchService] 关键字1 ${hasKeyword1 ? '已找到' : '未找到'}`);
            
            console.log(`🔍 [WindsurfPatchService] 检查关键字2: "${this.PATCH_KEYWORD_2}"`);
            const hasKeyword2 = fileContent.includes(this.PATCH_KEYWORD_2);
            console.log(`${hasKeyword2 ? '✅' : '❌'} [WindsurfPatchService] 关键字2 ${hasKeyword2 ? '已找到' : '未找到'}`);

            const isApplied = hasKeyword1 && hasKeyword2;
            console.log(`${isApplied ? '✅' : '❌'} [WindsurfPatchService] 补丁${isApplied ? '已应用' : '未应用'}`);
            
            return isApplied;
        } catch (error) {
            console.error('❌ [WindsurfPatchService] 检查补丁状态失败:', error);
            return false;
        }
    }

    /**
     * 检查写入权限
     * @returns 权限检查结果
     */
    static checkWritePermission(): PermissionCheckResult {
        console.log('🔍 [WindsurfPatchService] 开始检查写入权限...');
        
        try {
            const extensionPath = WindsurfPathService.getExtensionPath();
            
            if (!extensionPath) {
                console.error('❌ [WindsurfPatchService] Windsurf 安装未找到');
                return {
                    hasPermission: false,
                    error: "Windsurf installation not found. Please ensure Windsurf is installed."
                };
            }

            console.log('🔍 [WindsurfPatchService] 检查文件读取权限...');
            if (!WindsurfPathService.isFileAccessible(extensionPath)) {
                console.error('❌ [WindsurfPatchService] 文件不可读');
                return {
                    hasPermission: false,
                    error: `Cannot read Windsurf extension file at: ${extensionPath}`
                };
            }

            console.log('🔍 [WindsurfPatchService] 检查文件写入权限...');
            if (!WindsurfPathService.isFileWritable(extensionPath)) {
                console.error('❌ [WindsurfPatchService] 文件不可写');
                const suggestion = WindsurfPathService.getPermissionFixSuggestion(extensionPath);
                return {
                    hasPermission: false,
                    error: `Insufficient permissions to modify Windsurf extension at: ${extensionPath}\n\n${suggestion}`
                };
            }

            console.log('✅ [WindsurfPatchService] 权限检查通过');
            return {
                hasPermission: true
            };
        } catch (error) {
            console.error('❌ [WindsurfPatchService] 权限检查失败:', error);
            return {
                hasPermission: false,
                error: `权限检查失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }

    /**
     * 应用补丁
     * @returns 补丁应用结果
     */
    static async applyPatch(): Promise<PatchResult> {
        console.log('🔧 [WindsurfPatchService] 开始应用补丁...');
        
        try {
            const extensionPath = WindsurfPathService.getExtensionPath();
            if (!extensionPath) {
                console.error('❌ [WindsurfPatchService] Windsurf 安装未找到');
                return {
                    success: false,
                    error: "Windsurf installation not found"
                };
            }

            // 检查权限
            console.log('🔍 [WindsurfPatchService] 检查权限...');
            const permissionCheck = this.checkWritePermission();
            if (!permissionCheck.hasPermission) {
                console.error('❌ [WindsurfPatchService] 权限不足');
                return {
                    success: false,
                    error: permissionCheck.error
                };
            }

            // 读取原始文件
            console.log('📖 [WindsurfPatchService] 读取原始文件...');
            let fileContent = fs.readFileSync(extensionPath, 'utf-8');
            console.log(`📊 [WindsurfPatchService] 原始文件大小: ${fileContent.length} 字符`);

            // 1. 添加新的 handleAuthTokenWithShit 函数
            console.log('🔍 [WindsurfPatchService] 查找 handleAuthToken 函数...');
            const handleAuthTokenIndex = fileContent.indexOf(this.ORIGINAL_HANDLE_AUTH_TOKEN);
            if (handleAuthTokenIndex === -1) {
                console.error('❌ [WindsurfPatchService] 未找到 handleAuthToken 函数');
                return {
                    success: false,
                    error: "Could not find handleAuthToken function. Windsurf version may be incompatible.\n\nThe expected function signature was not found in extension.js."
                };
            }
            console.log(`✅ [WindsurfPatchService] 找到 handleAuthToken 函数，位置: ${handleAuthTokenIndex}`);

            const insertPosition1 = handleAuthTokenIndex + this.ORIGINAL_HANDLE_AUTH_TOKEN.length;
            console.log('🔧 [WindsurfPatchService] 插入新的 handleAuthTokenWithShit 函数...');
            fileContent = fileContent.substring(0, insertPosition1) + 
                         this.NEW_HANDLE_AUTH_TOKEN_WITH_SHIT + 
                         fileContent.substring(insertPosition1);
            console.log(`📊 [WindsurfPatchService] 插入函数后文件大小: ${fileContent.length} 字符`);

            // 2. 添加新的命令注册
            console.log('🔍 [WindsurfPatchService] 查找命令注册...');
            const commandRegistrationIndex = fileContent.indexOf(this.ORIGINAL_COMMAND_REGISTRATION);
            if (commandRegistrationIndex === -1) {
                console.error('❌ [WindsurfPatchService] 未找到命令注册');
                return {
                    success: false,
                    error: "Could not find PROVIDE_AUTH_TOKEN_TO_AUTH_PROVIDER command registration. Windsurf version may be incompatible.\n\nThe expected command registration was not found in extension.js."
                };
            }
            console.log(`✅ [WindsurfPatchService] 找到命令注册，位置: ${commandRegistrationIndex}`);

            const insertPosition2 = commandRegistrationIndex + this.ORIGINAL_COMMAND_REGISTRATION.length;
            console.log('🔧 [WindsurfPatchService] 插入新的命令注册...');
            fileContent = fileContent.substring(0, insertPosition2) + 
                         this.NEW_COMMAND_REGISTRATION + 
                         fileContent.substring(insertPosition2);
            console.log(`📊 [WindsurfPatchService] 插入命令后文件大小: ${fileContent.length} 字符`);

            // 写入修改后的文件
            console.log('💾 [WindsurfPatchService] 写入修改后的文件...');
            fs.writeFileSync(extensionPath, fileContent, 'utf-8');
            console.log('✅ [WindsurfPatchService] 文件写入完成');

            // 验证补丁是否成功应用
            console.log('🔍 [WindsurfPatchService] 验证补丁是否成功应用...');
            const verificationContent = fs.readFileSync(extensionPath, 'utf-8');
            const hasKeyword1 = verificationContent.includes(this.PATCH_KEYWORD_1);
            const hasKeyword2 = verificationContent.includes(this.PATCH_KEYWORD_2);
            
            console.log(`${hasKeyword1 ? '✅' : '❌'} [WindsurfPatchService] 验证关键字1: ${hasKeyword1 ? '存在' : '不存在'}`);
            console.log(`${hasKeyword2 ? '✅' : '❌'} [WindsurfPatchService] 验证关键字2: ${hasKeyword2 ? '存在' : '不存在'}`);

            if (hasKeyword1 && hasKeyword2) {
                console.log('🎉 [WindsurfPatchService] 补丁应用成功！');
                return {
                    success: true
                };
            } else {
                console.error('❌ [WindsurfPatchService] 补丁验证失败');
                return {
                    success: false,
                    error: "补丁验证失败。补丁应用后未找到关键字。"
                };
            }

        } catch (error) {
            console.error('❌ [WindsurfPatchService] 补丁应用失败:', error);
            return {
                success: false,
                error: `补丁失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }

    /**
     * 检查并应用补丁（如果需要）
     * @returns 检查结果
     */
    static async checkAndApplyPatch(): Promise<PatchCheckResult> {
        console.log('🚀 [WindsurfPatchService] 开始检查并应用补丁流程...');
        
        try {
            // 1. 检查补丁是否已应用
            console.log('📋 [WindsurfPatchService] 步骤1: 检查补丁是否已应用');
            if (await this.isPatchApplied()) {
                console.log('✅ [WindsurfPatchService] 补丁已应用，无需重新应用');
                return {
                    needsRestart: false
                };
            }

            console.log('⚠️ [WindsurfPatchService] 补丁未应用，需要应用补丁');

            // 2. 检查权限
            console.log('📋 [WindsurfPatchService] 步骤2: 检查权限');
            const permissionCheck = this.checkWritePermission();
            if (!permissionCheck.hasPermission) {
                console.error('❌ [WindsurfPatchService] 权限检查失败');
                return {
                    needsRestart: false,
                    error: permissionCheck.error || "Insufficient permissions to apply patch. Please check file permissions."
                };
            }

            console.log('✅ [WindsurfPatchService] 权限检查通过');

            // 3. 应用补丁
            console.log('📋 [WindsurfPatchService] 步骤3: 应用补丁');
            const patchResult = await this.applyPatch();
            if (patchResult.success) {
                console.log('🎉 [WindsurfPatchService] 补丁应用成功，需要重启 Windsurf');
                return {
                    needsRestart: true
                };
            } else {
                console.error('❌ [WindsurfPatchService] 补丁应用失败');
                return {
                    needsRestart: false,
                    error: patchResult.error || "应用 Windsurf 补丁失败"
                };
            }

        } catch (error) {
            console.error('❌ [WindsurfPatchService] 补丁检查/应用流程失败:', error);
            return {
                needsRestart: false,
                error: `补丁检查/应用失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }
}
