import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { QuotaKey, OEMConfig, KeyInfo } from '../types/api';
import { StorageKeys, SecretKeys, HistoricalAccount } from '../types/state';

export class StorageService {
    constructor(private context: vscode.ExtensionContext) {}

    // Device ID Management
    async getDeviceId(): Promise<string> {
        let deviceId = this.context.globalState.get<string>(StorageKeys.DEVICE_ID);
        if (!deviceId) {
            deviceId = uuidv4();
            await this.context.globalState.update(StorageKeys.DEVICE_ID, deviceId);
        }
        return deviceId;
    }

    // Activation Code Management
    async getActivationCode(): Promise<string | undefined> {
        return this.context.globalState.get<string>(StorageKeys.ACTIVATION_CODE);
    }

    async setActivationCode(code: string): Promise<void> {
        await this.context.globalState.update(StorageKeys.ACTIVATION_CODE, code);
    }

    // Mail Management
    async getMail(): Promise<string | undefined> {
        return this.context.globalState.get<string>(StorageKeys.MAIL);
    }

    async setMail(mail: string): Promise<void> {
        await this.context.globalState.update(StorageKeys.MAIL, mail);
    }

    // Quota Keys Management
    async getQuotaKeys(): Promise<QuotaKey[]> {
        return this.context.globalState.get<QuotaKey[]>(StorageKeys.QUOTA_KEYS) || [];
    }

    async setQuotaKeys(keys: QuotaKey[]): Promise<void> {
        await this.context.globalState.update(StorageKeys.QUOTA_KEYS, keys);
    }

    // Key Info Management
    async getKeyInfo(): Promise<KeyInfo | undefined> {
        return this.context.globalState.get<KeyInfo>(StorageKeys.KEY_INFO);
    }

    async setKeyInfo(keyInfo: KeyInfo): Promise<void> {
        await this.context.globalState.update(StorageKeys.KEY_INFO, keyInfo);
    }

    // OEM Config Management
    async getOEMConfig(): Promise<OEMConfig | undefined> {
        return this.context.globalState.get<OEMConfig>(StorageKeys.OEM_CONFIG);
    }

    async setOEMConfig(config: OEMConfig): Promise<void> {
        await this.context.globalState.update(StorageKeys.OEM_CONFIG, config);
    }

    // Last Refresh Management
    async getLastRefresh(): Promise<string | undefined> {
        return this.context.globalState.get<string>(StorageKeys.LAST_REFRESH);
    }

    async setLastRefresh(timestamp: string): Promise<void> {
        await this.context.globalState.update(StorageKeys.LAST_REFRESH, timestamp);
    }

    // Token Management (Encrypted)
    async getToken(): Promise<string | undefined> {
        return await this.context.secrets.get(SecretKeys.ACCESS_TOKEN);
    }

    async setToken(token: string): Promise<void> {
        await this.context.secrets.store(SecretKeys.ACCESS_TOKEN, token);
    }

    async clearToken(): Promise<void> {
        await this.context.secrets.delete(SecretKeys.ACCESS_TOKEN);
    }

    // Clear All Data
    async clearAllData(): Promise<void> {
        // Clear global state
        const keys = Object.values(StorageKeys);
        for (const key of keys) {
            if (key !== StorageKeys.DEVICE_ID) { // Keep device ID
                await this.context.globalState.update(key, undefined);
            }
        }

        // Clear secrets
        await this.clearToken();
    }

    // Decrypted Metadata Management
    async getDecryptedMetadata(): Promise<any | undefined> {
        return this.context.globalState.get<any>(StorageKeys.DECRYPTED_METADATA);
    }

    async setDecryptedMetadata(metadata: any): Promise<void> {
        await this.context.globalState.update(StorageKeys.DECRYPTED_METADATA, metadata);
    }

    async clearDecryptedMetadata(): Promise<void> {
        await this.context.globalState.update(StorageKeys.DECRYPTED_METADATA, undefined);
    }

    // Quota Info Management (from activation response)
    async getQuotaUsed(): Promise<number | undefined> {
        return this.context.globalState.get<number>(StorageKeys.QUOTA_USED);
    }

    async setQuotaUsed(quotaUsed: number): Promise<void> {
        await this.context.globalState.update(StorageKeys.QUOTA_USED, quotaUsed);
    }

    async getQuotaTotal(): Promise<number | undefined> {
        return this.context.globalState.get<number>(StorageKeys.QUOTA_TOTAL);
    }

    async setQuotaTotal(quotaTotal: number): Promise<void> {
        await this.context.globalState.update(StorageKeys.QUOTA_TOTAL, quotaTotal);
    }

    async getQuotaRemaining(): Promise<number | undefined> {
        return this.context.globalState.get<number>(StorageKeys.QUOTA_REMAINING);
    }

    async setQuotaRemaining(quotaRemaining: number): Promise<void> {
        await this.context.globalState.update(StorageKeys.QUOTA_REMAINING, quotaRemaining);
    }

    async getActivatedAt(): Promise<string | undefined> {
        return this.context.globalState.get<string>(StorageKeys.ACTIVATED_AT);
    }

    async setActivatedAt(activatedAt: string): Promise<void> {
        await this.context.globalState.update(StorageKeys.ACTIVATED_AT, activatedAt);
    }

    async getExpiredAt(): Promise<string | undefined> {
        return this.context.globalState.get<string>(StorageKeys.EXPIRED_AT);
    }

    async setExpiredAt(expiredAt: string | null): Promise<void> {
        await this.context.globalState.update(StorageKeys.EXPIRED_AT, expiredAt || undefined);
    }

    // Historical Accounts Management
    async getHistoricalAccounts(): Promise<HistoricalAccount[]> {
        return this.context.globalState.get<HistoricalAccount[]>(StorageKeys.HISTORICAL_ACCOUNTS) || [];
    }

    async setHistoricalAccounts(accounts: HistoricalAccount[]): Promise<void> {
        await this.context.globalState.update(StorageKeys.HISTORICAL_ACCOUNTS, accounts);
    }

    /**
     * 保存当前账号到历史记录
     * 如果账号已存在（根据mail判断），则更新该账号信息
     * 如果不存在，则添加新账号
     */
    async saveCurrentAccountToHistory(): Promise<void> {
        const [mail, activationCode, keyInfo, oemConfig, decryptedMetadata, quotaUsed, quotaTotal, quotaRemaining] = await Promise.all([
            this.getMail(),
            this.getActivationCode(),
            this.getKeyInfo(),
            this.getOEMConfig(),
            this.getDecryptedMetadata(),
            this.getQuotaUsed(),
            this.getQuotaTotal(),
            this.getQuotaRemaining()
        ]);

        // 必须有邮箱和激活码才能保存
        if (!mail || !activationCode) {
            console.warn('无法保存历史账号：缺少邮箱或激活码');
            return;
        }

        const accounts = await this.getHistoricalAccounts();
        const now = new Date().toISOString();
        
        // 查找是否已存在该邮箱的账号
        const existingIndex = accounts.findIndex(acc => acc.mail === mail);
        
        const accountData: HistoricalAccount = {
            id: existingIndex >= 0 ? accounts[existingIndex].id : `${mail}_${Date.now()}`,
            mail,
            activationCode,
            keyInfo,
            oemConfig,
            decryptedMetadata,
            quotaUsed,
            quotaTotal,
            quotaRemaining,
            lastUsed: now,
            savedAt: existingIndex >= 0 ? accounts[existingIndex].savedAt : now
        };

        if (existingIndex >= 0) {
            // 更新现有账号
            accounts[existingIndex] = accountData;
            console.log(`✅ 更新历史账号: ${mail}`);
        } else {
            // 添加新账号到列表开头
            accounts.unshift(accountData);
            console.log(`✅ 保存新历史账号: ${mail}`);
        }

        // 限制历史记录数量（最多保留10个）
        const maxAccounts = 10;
        if (accounts.length > maxAccounts) {
            accounts.splice(maxAccounts);
        }

        await this.setHistoricalAccounts(accounts);
    }

    /**
     * 切换到历史账号
     * @param accountId 历史账号ID
     */
    async switchToHistoricalAccount(accountId: string): Promise<boolean> {
        const accounts = await this.getHistoricalAccounts();
        const account = accounts.find(acc => acc.id === accountId);
        
        if (!account) {
            console.error('未找到历史账号:', accountId);
            return false;
        }

        // 先保存当前账号到历史记录
        await this.saveCurrentAccountToHistory();

        // 恢复历史账号数据
        await this.setActivationCode(account.activationCode);
        await this.setMail(account.mail);
        
        if (account.keyInfo) {
            await this.setKeyInfo(account.keyInfo);
        }
        if (account.oemConfig) {
            await this.setOEMConfig(account.oemConfig);
        }
        if (account.decryptedMetadata) {
            await this.setDecryptedMetadata(account.decryptedMetadata);
        }
        if (account.quotaUsed !== undefined) {
            await this.setQuotaUsed(account.quotaUsed);
        }
        if (account.quotaTotal !== undefined) {
            await this.setQuotaTotal(account.quotaTotal);
        }
        if (account.quotaRemaining !== undefined) {
            await this.setQuotaRemaining(account.quotaRemaining);
        }

        // 更新该账号的最后使用时间
        const accountIndex = accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex >= 0) {
            accounts[accountIndex].lastUsed = new Date().toISOString();
            await this.setHistoricalAccounts(accounts);
        }

        console.log(`✅ 已切换到历史账号: ${account.mail}`);
        return true;
    }

    /**
     * 删除历史账号
     * @param accountId 历史账号ID
     */
    async deleteHistoricalAccount(accountId: string): Promise<boolean> {
        const accounts = await this.getHistoricalAccounts();
        const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
        
        if (filteredAccounts.length === accounts.length) {
            console.warn('未找到要删除的历史账号:', accountId);
            return false;
        }

        await this.setHistoricalAccounts(filteredAccounts);
        console.log(`✅ 已删除历史账号: ${accountId}`);
        return true;
    }

    // Get Current State
    async getCurrentState() {
        const [
            deviceId,
            activationCode,
            mail,
            quotaKeys,
            keyInfo,
            oemConfig,
            lastRefresh,
            token,
            decryptedMetadata,
            quotaUsed,
            quotaTotal,
            quotaRemaining,
            activatedAt,
            expiredAt,
            historicalAccounts
        ] = await Promise.all([
            this.getDeviceId(),
            this.getActivationCode(),
            this.getMail(),
            this.getQuotaKeys(),
            this.getKeyInfo(),
            this.getOEMConfig(),
            this.getLastRefresh(),
            this.getToken(),
            this.getDecryptedMetadata(),
            this.getQuotaUsed(),
            this.getQuotaTotal(),
            this.getQuotaRemaining(),
            this.getActivatedAt(),
            this.getExpiredAt(),
            this.getHistoricalAccounts()
        ]);

        return {
            // 激活状态：有激活码且有额度信息（来自激活响应）或有quotaKeys（来自refresh响应）
            isActivated: !!activationCode && (quotaRemaining !== undefined || quotaKeys.length > 0),
            deviceId,
            activationCode,
            mail,
            quotaKeys,
            keyInfo,
            oemConfig,
            lastRefresh,
            hasToken: !!token,
            decryptedMetadata,
            // 从 decryptedMetadata 中提取关键信息
            windsurfApiKey: decryptedMetadata?.apiKey,
            windsurfMail: decryptedMetadata?.mail,
            windsurfApiServerUrl: decryptedMetadata?.apiServerUrl,
            // 激活响应的额度信息
            quotaUsed,
            quotaTotal,
            quotaRemaining,
            activatedAt,
            expiredAt,
            // 历史账号列表
            historicalAccounts
        };
    }
}
