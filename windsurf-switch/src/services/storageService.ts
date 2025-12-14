import * as vscode from 'vscode';
import { Account, StorageKeys } from '../types/account';

export class StorageService {
    constructor(private context: vscode.ExtensionContext) {}

    // 获取所有账号
    async getAccounts(): Promise<Account[]> {
        const accounts = this.context.globalState.get<Account[]>(StorageKeys.ACCOUNTS);
        return accounts || [];
    }

    // 保存账号列表
    async setAccounts(accounts: Account[]): Promise<void> {
        await this.context.globalState.update(StorageKeys.ACCOUNTS, accounts);
    }

    // 添加账号
    async addAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
        const accounts = await this.getAccounts();
        
        // 检查是否已存在相同邮箱
        const existing = accounts.find(a => a.mail === account.mail);
        if (existing) {
            // 更新现有账号
            existing.apiKey = account.apiKey;
            existing.apiServerUrl = account.apiServerUrl;
            await this.setAccounts(accounts);
            return existing;
        }

        const newAccount: Account = {
            id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            mail: account.mail,
            apiKey: account.apiKey,
            apiServerUrl: account.apiServerUrl,
            createdAt: new Date().toISOString()
        };

        accounts.push(newAccount);
        await this.setAccounts(accounts);
        return newAccount;
    }

    // 删除账号
    async deleteAccount(accountId: string): Promise<boolean> {
        const accounts = await this.getAccounts();
        const index = accounts.findIndex(a => a.id === accountId);
        
        if (index === -1) {
            return false;
        }

        accounts.splice(index, 1);
        await this.setAccounts(accounts);

        // 如果删除的是当前账号，清除当前账号ID
        const currentId = await this.getCurrentAccountId();
        if (currentId === accountId) {
            await this.setCurrentAccountId(undefined);
        }

        return true;
    }

    // 获取当前账号ID
    async getCurrentAccountId(): Promise<string | undefined> {
        return this.context.globalState.get<string>(StorageKeys.CURRENT_ACCOUNT_ID);
    }

    // 设置当前账号ID
    async setCurrentAccountId(accountId: string | undefined): Promise<void> {
        await this.context.globalState.update(StorageKeys.CURRENT_ACCOUNT_ID, accountId);
    }

    // 获取当前账号
    async getCurrentAccount(): Promise<Account | undefined> {
        const currentId = await this.getCurrentAccountId();
        if (!currentId) return undefined;

        const accounts = await this.getAccounts();
        return accounts.find(a => a.id === currentId);
    }

    // 切换到指定账号
    async switchToAccount(accountId: string): Promise<Account | undefined> {
        const accounts = await this.getAccounts();
        const account = accounts.find(a => a.id === accountId);
        
        if (!account) {
            return undefined;
        }

        // 更新最后使用时间
        account.lastUsed = new Date().toISOString();
        await this.setAccounts(accounts);
        await this.setCurrentAccountId(accountId);

        return account;
    }

    // 获取切换后是否刷新设置
    async getRefreshAfterSwitch(): Promise<boolean> {
        const value = this.context.globalState.get<boolean>(StorageKeys.REFRESH_AFTER_SWITCH);
        return value !== false; // 默认为 true
    }

    // 设置切换后是否刷新
    async setRefreshAfterSwitch(value: boolean): Promise<void> {
        await this.context.globalState.update(StorageKeys.REFRESH_AFTER_SWITCH, value);
    }

    // 获取完整状态
    async getState() {
        const [accounts, currentAccount, refreshAfterSwitch] = await Promise.all([
            this.getAccounts(),
            this.getCurrentAccount(),
            this.getRefreshAfterSwitch()
        ]);

        return {
            accounts,
            currentAccount,
            refreshAfterSwitch
        };
    }
}
