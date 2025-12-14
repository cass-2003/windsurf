import * as vscode from 'vscode';
import { AccountSwitchViewProvider } from './webview/provider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Windsurf Switch 插件已激活');

    // 注册 Webview 视图提供者
    const provider = new AccountSwitchViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            AccountSwitchViewProvider.viewType,
            provider
        )
    );

    // 注册打开面板命令
    context.subscriptions.push(
        vscode.commands.registerCommand('windsurf-switch.openPanel', () => {
            vscode.commands.executeCommand('windsurf-switch.mainView.focus');
        })
    );

    console.log('Windsurf Switch 初始化完成');
}

export function deactivate() {
    console.log('Windsurf Switch 插件已停用');
}
