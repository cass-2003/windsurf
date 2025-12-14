// 账号数据结构
export interface Account {
    id: string;
    mail: string;
    apiKey: string;
    apiServerUrl: string;
    createdAt: string;
    lastUsed?: string;
}

// 插件状态
export interface ExtensionState {
    currentAccount?: Account;
    accounts: Account[];
    refreshAfterSwitch: boolean;
}

// Webview 消息类型
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

// 存储键名
export enum StorageKeys {
    ACCOUNTS = 'accounts',
    CURRENT_ACCOUNT_ID = 'currentAccountId',
    REFRESH_AFTER_SWITCH = 'refreshAfterSwitch'
}
