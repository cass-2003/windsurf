import * as vscode from 'vscode';
import { StorageService } from './services/storageService';
import { ApiService } from './services/apiService';
import { QuotaKeyManagerViewProvider } from './webview/provider';

let storageService: StorageService;
let apiService: ApiService;

export function activate(context: vscode.ExtensionContext) {
    console.log('XG-Windsurf is now active!');

    // Initialize services
    storageService = new StorageService(context);
    apiService = new ApiService();

    // Register webview provider
    const provider = new QuotaKeyManagerViewProvider(context, storageService, apiService);
    
    vscode.window.registerWebviewViewProvider(
        'xg-windsurf.view',
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );

    // Register commands
    const disposables = [
        vscode.commands.registerCommand('xg-windsurf.refresh', () => {
            provider.refresh();
        }),
        
        vscode.commands.registerCommand('xg-windsurf.clearData', async () => {
            await storageService.clearAllData();
            provider.refresh();
            vscode.window.showInformationMessage('所有数据清除成功！');
        })
    ];

    context.subscriptions.push(...disposables);
}

export function deactivate() {
    console.log('XG-Windsurf is now deactivated!');
}
