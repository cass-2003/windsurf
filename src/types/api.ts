// API Response Types
export interface ApiResponse<T = any> {
    code: number;
    msg?: string;        // 兼容旧版本
    message?: string;    // 兼容新版本后端
    data?: T;
}

// Quota Key Types
export interface QuotaKey {
    quota_key: string;
    quota_key_max_quota: number;
    reseller_id: number | null;
    quota_key_remark: string | null;
    quota_key_period_hour: number | null;
}

export interface QuotaKeyData {
    total: number;
    keys: QuotaKey[];
}

// API Request Types
export interface ActivateRequest {
    activationCode: string;
    deviceId: string;
}

export interface RefreshRequest {
    activationCode: string;
    deviceId: string;
    oldToken?: string;
}

// API Response Types
export interface ActivateResponse extends ApiResponse {
    data: {
        valid: boolean;
        key_code: string;
        device_id: string;
        checked_at: string;
        quota_used: number;
        quota_total: number;
        quota_remaining: number;
        activated_at?: string;
        expired_at?: string;
        config?: string;
        reason?: string;
    };
}

export interface RefreshResponse extends ApiResponse {
    data: {
        mail: string;
        oem_info: {
            reseller_name: string;
            app_name: string;
            app_icon: string;
            app_links: string;
            reseller_status: number;
        };
        key_info: {
            key_status: number;
            activated_at: string;
            expired_at: string;
            quota_key_max_quota: number;
            quota_key_used_quota: number;
        };
        account: string; // JSON字符串格式的账户数据
        metadata?: string; // Base64 encoded encrypted metadata
        timestamp?: string; // Timestamp for decryption
        decryptedMetadata?: any; // Decrypted metadata object
    };
}

// OEM Configuration
export interface OEMConfig {
    reseller_name: string;
    app_name: string;
    app_icon: string;
    app_links: string;
    reseller_status: number;
    shopIcon?: string;
    shopName?: string;
    documentationUrl?: string;
    shopUrl?: string;
}

// Key Information
export interface KeyInfo {
    key_status: number;
    activated_at: string;
    expired_at: string;
    quota_key_max_quota: number;
    quota_key_used_quota: number;
    validFrom?: string;
    validUntil?: string;
    plan?: string;
    username?: string;
    email?: string;
}

// Account Information
export interface AccountInfo {
    username?: string;
    email?: string;
    plan?: string;
    [key: string]: any;
}

// Announcement Types
export interface Announcement {
    id: number;
    title: string;
    content: string;
    type: 'info' | 'success' | 'warning' | 'error';
    priority: number;
    created_at: string;
    start_time: string | null;
    end_time: string | null;
}

export interface AnnouncementsResponse extends ApiResponse {
    data: {
        announcements: Announcement[];
        total: number;
    };
}

// Cursor Key Convert Types
export interface ConvertKeyRequest {
    key_code: string;
}

export interface ConvertKeyResponse {
    code: number;
    message: string;
    data: {
        original_key: string;
        original_quota_remaining: number;
        new_key: string;
        new_quota: number;
        new_expired_at: string;
        validity_months: number;
        valid: boolean;
        deleted: boolean;
        checked_at: string;
    };
}
