import { QuotaKey, OEMConfig, KeyInfo } from './api';

// 历史账号数据结构
export interface HistoricalAccount {
    id: string; // 唯一标识，使用 mail_timestamp 或 UUID
    mail: string; // 邮箱账号
    activationCode: string; // 激活码
    keyInfo?: KeyInfo; // 密钥信息
    oemConfig?: OEMConfig; // OEM配置
    decryptedMetadata?: any; // 解密后的元数据（包含 apiKey, apiServerUrl 等）
    quotaUsed?: number; // 已用额度
    quotaTotal?: number; // 总额度
    quotaRemaining?: number; // 剩余额度
    lastUsed: string; // 最后使用时间
    savedAt: string; // 保存时间
}

// Extension State Types
export interface ExtensionState {
    isActivated: boolean;
    deviceId: string;
    activationCode?: string;
    mail?: string;
    quotaKeys: QuotaKey[];
    keyInfo?: KeyInfo;
    oemConfig?: OEMConfig;
    lastRefresh?: string;
    hasToken: boolean;
    decryptedMetadata?: any;
    // Windsurf 自动登录相关字段
    windsurfApiKey?: string;
    windsurfMail?: string;
    windsurfApiServerUrl?: string;
    // 激活响应的额度信息
    quotaUsed?: number;
    quotaTotal?: number;
    quotaRemaining?: number;
    activatedAt?: string;
    expiredAt?: string;
    // Logo URI for webview
    logoUri?: string;
    // 历史账号列表
    historicalAccounts?: HistoricalAccount[];
}

// Webview Message Types
export interface WebviewMessage {
    command: string;
    requestId: string;
    payload?: any;
}

export interface WebviewResponse {
    command: string;
    requestId: string;
    payload?: any;
    error?: string;
}

// Storage Keys
export enum StorageKeys {
    DEVICE_ID = 'deviceId',
    ACTIVATION_CODE = 'activationCode',
    MAIL = 'mail',
    QUOTA_KEYS = 'quotaKeys',
    KEY_INFO = 'keyInfo',
    OEM_CONFIG = 'oemConfig',
    LAST_REFRESH = 'lastRefresh',
    DECRYPTED_METADATA = 'decryptedMetadata',
    QUOTA_USED = 'quotaUsed',
    QUOTA_TOTAL = 'quotaTotal',
    QUOTA_REMAINING = 'quotaRemaining',
    ACTIVATED_AT = 'activatedAt',
    EXPIRED_AT = 'expiredAt',
    HISTORICAL_ACCOUNTS = 'historicalAccounts'
}

// Secret Storage Keys
export enum SecretKeys {
    ACCESS_TOKEN = 'accessToken'
}
