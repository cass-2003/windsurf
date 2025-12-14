import * as vscode from 'vscode';
import { StorageService } from '../services/storageService';
import { WindsurfLoginService } from '../services/windsurfLoginService';
import { CredentialService } from '../services/credentialService';
import { WebviewMessage, WebviewResponse, Account } from '../types/account';

export class AccountSwitchViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'windsurf-switch.mainView';

    private _view?: vscode.WebviewView;
    private storageService: StorageService;
    private loginService: WindsurfLoginService;
    private credentialService: CredentialService;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.storageService = new StorageService(context);
        this.loginService = new WindsurfLoginService(context);
        this.credentialService = new CredentialService(context);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // 处理来自 webview 的消息
        webviewView.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                await this.handleMessage(webviewView.webview, message);
            }
        );
    }

    private async handleMessage(webview: vscode.Webview, message: WebviewMessage): Promise<void> {
        const { command, requestId, payload } = message;

        try {
            switch (command) {
                case 'GET_STATE':
                    await this.handleGetState(webview, requestId);
                    break;
                case 'ADD_ACCOUNT':
                    await this.handleAddAccount(webview, requestId, payload);
                    break;
                case 'DELETE_ACCOUNT':
                    await this.handleDeleteAccount(webview, requestId, payload);
                    break;
                case 'SWITCH_ACCOUNT':
                    await this.handleSwitchAccount(webview, requestId, payload);
                    break;
                case 'SET_REFRESH_SETTING':
                    await this.handleSetRefreshSetting(webview, requestId, payload);
                    break;
                case 'GET_CURRENT_CREDENTIALS':
                    await this.handleGetCurrentCredentials(webview, requestId);
                    break;
                default:
                    this.sendError(webview, requestId, command, `未知命令: ${command}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.sendError(webview, requestId, command, errorMessage);
        }
    }

    private async handleGetState(webview: vscode.Webview, requestId: string): Promise<void> {
        const state = await this.storageService.getState();
        this.sendResponse(webview, requestId, 'GET_STATE', state);
    }

    private async handleAddAccount(
        webview: vscode.Webview, 
        requestId: string, 
        payload: { mail: string; apiKey: string; apiServerUrl: string }
    ): Promise<void> {
        const { mail, apiKey, apiServerUrl } = payload;

        if (!mail || !apiKey || !apiServerUrl) {
            throw new Error('请填写完整的账号信息');
        }

        const account = await this.storageService.addAccount({ mail, apiKey, apiServerUrl });
        vscode.window.showInformationMessage(`账号 ${mail} 添加成功`);

        const state = await this.storageService.getState();
        this.sendResponse(webview, requestId, 'ADD_ACCOUNT', state);
    }

    private async handleDeleteAccount(
        webview: vscode.Webview,
        requestId: string,
        payload: { accountId: string }
    ): Promise<void> {
        const { accountId } = payload;
        const success = await this.storageService.deleteAccount(accountId);

        if (!success) {
            throw new Error('删除账号失败：未找到指定账号');
        }

        const state = await this.storageService.getState();
        this.sendResponse(webview, requestId, 'DELETE_ACCOUNT', state);
    }

    private async handleSwitchAccount(
        webview: vscode.Webview,
        requestId: string,
        payload: { accountId: string }
    ): Promise<void> {
        const { accountId } = payload;
        const account = await this.storageService.switchToAccount(accountId);

        if (!account) {
            throw new Error('切换账号失败：未找到指定账号');
        }

        // 执行 Windsurf 登录
        const loginResult = await this.loginService.injectSession(account);

        if (loginResult.needsRestart) {
            return; // 需要重启，不继续
        }

        if (!loginResult.success) {
            vscode.window.showWarningMessage(`已切换到 ${account.mail}，但登录失败: ${loginResult.error}`);
        } else {
            vscode.window.showInformationMessage(`已切换到账号: ${account.mail}`);

            // 检查是否需要刷新窗口
            const refreshAfterSwitch = await this.storageService.getRefreshAfterSwitch();
            if (refreshAfterSwitch) {
                setTimeout(() => {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }, 1000);
            }
        }

        const state = await this.storageService.getState();
        this.sendResponse(webview, requestId, 'SWITCH_ACCOUNT', state);
    }

    private async handleSetRefreshSetting(
        webview: vscode.Webview,
        requestId: string,
        payload: { value: boolean }
    ): Promise<void> {
        await this.storageService.setRefreshAfterSwitch(payload.value);
        const state = await this.storageService.getState();
        this.sendResponse(webview, requestId, 'SET_REFRESH_SETTING', state);
    }

    private async handleGetCurrentCredentials(
        webview: vscode.Webview,
        requestId: string
    ): Promise<void> {
        const credentials = await this.credentialService.getCurrentCredentials();
        
        if (credentials) {
            this.sendResponse(webview, requestId, 'GET_CURRENT_CREDENTIALS', credentials);
        } else {
            this.sendError(webview, requestId, 'GET_CURRENT_CREDENTIALS', 
                '无法获取当前登录凭据。请确保已在 Windsurf 中登录账号。');
        }
    }

    private sendResponse(
        webview: vscode.Webview,
        requestId: string,
        command: string,
        payload: any
    ): void {
        webview.postMessage({
            command,
            requestId,
            payload
        } as WebviewResponse);
    }

    private sendError(
        webview: vscode.Webview,
        requestId: string,
        command: string,
        error: string
    ): void {
        webview.postMessage({
            command,
            requestId,
            error
        } as WebviewResponse);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Windsurf 换号</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
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
