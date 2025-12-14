import axios, { AxiosInstance } from 'axios';
import { 
    ApiResponse, 
    ActivateRequest, 
    ActivateResponse, 
    RefreshRequest, 
    RefreshResponse,
    QuotaKeyData,
    AnnouncementsResponse,
    ConvertKeyRequest,
    ConvertKeyResponse
} from '../types/api';
import { API_CONFIG } from '../config/api';

export class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            timeout: API_CONFIG.TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Use API base URL from config
                if (!config.url?.startsWith('http')) {
                    config.baseURL = API_CONFIG.BASE_URL;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => {
                return response;
            },
            (error) => {
                console.error('API Error:', error);
                return Promise.reject(error);
            }
        );
    }

    private async makeRequest<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<T> {
        try {
            const response = await this.axiosInstance.request({
                url,
                method,
                data
            });
            return response.data;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('API request failed: Unknown error');
        }
    }

    // Activate quota key (对应后端 /api/account/validate-key)
    async activate(request: ActivateRequest): Promise<ActivateResponse> {
        return this.makeRequest<ActivateResponse>('/api/account/validate-key', 'POST', {
            key_code: request.activationCode,
            device_id: request.deviceId
        });
    }

    // Refresh quota key (对应后端 /api/account/activate-refresh)
    async refresh(request: RefreshRequest): Promise<RefreshResponse> {
        const response = await this.makeRequest<RefreshResponse>('/api/account/activate-refresh', 'POST', {
            key_code: request.activationCode,
            device_id: request.deviceId
        });
        
        // 直接解析account字段中的JSON数据并返回明文
        if (response.data.account) {
            try {
                const accountData = JSON.parse(response.data.account);
                
                // 直接将账户数据添加到响应中（不进行解密）
                response.data.metadata = accountData.metadata;
                response.data.timestamp = accountData.timestamp;
            } catch (error) {
                console.warn('解析账户数据失败:', error);
            }
        }
        
        return response;
    }

    // Release device (if needed)
    async releaseDevice(activationCode: string, deviceId: string): Promise<ApiResponse> {
        return this.makeRequest<ApiResponse>('/release', 'POST', {
            activationCode,
            deviceId
        });
    }

    // Get quota key status (对应后端 /quota/api/key-usage)
    async getStatus(activationCode: string, deviceId: string): Promise<ApiResponse> {
        return this.makeRequest<ApiResponse>('/quota/api/key-usage', 'POST', {
            quota_key: activationCode,
            device_id: deviceId
        });
    }

    // Get announcements (对应后端 /api/announcements)
    async getAnnouncements(): Promise<AnnouncementsResponse> {
        return this.makeRequest<AnnouncementsResponse>('/api/announcements', 'GET');
    }

    // Convert Cursor key to Windsurf key (对应后端 /api/key/convert)
    async convertKey(request: ConvertKeyRequest): Promise<ConvertKeyResponse> {
        return this.makeRequest<ConvertKeyResponse>('/api/key/convert', 'POST', {
            key_code: request.key_code
        });
    }

}
