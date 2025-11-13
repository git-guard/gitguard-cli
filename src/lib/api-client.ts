import axios, { AxiosInstance } from 'axios';
import { ScanRequest, ScanResponse, UserProfile } from '../types';
import { ConfigManager } from './config';

export class APIClient {
  private client: AxiosInstance;
  private config: ConfigManager;

  constructor(config: ConfigManager) {
    this.config = config;
    const apiUrl = config.get().apiUrl;

    this.client = axios.create({
      baseURL: `${apiUrl}/api/v1/cli`,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = this.config.getApiToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async requestAuth(): Promise<{ requestCode: string; authUrl: string; expiresIn: number }> {
    const response = await this.client.post('/auth/request');
    return response.data.data;
  }

  async pollAuth(requestCode: string): Promise<{ status: string; token?: string }> {
    const response = await this.client.get(`/auth/poll/${requestCode}`);
    return response.data;
  }

  async revokeToken(): Promise<void> {
    await this.client.post('/auth/revoke');
  }

  async getProfile(): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>('/profile');
    return response.data;
  }

  async scan(request: ScanRequest): Promise<ScanResponse> {
    const response = await this.client.post<ScanResponse>('/scan', request);
    return response.data;
  }

  async getScanStatus(scanId: string): Promise<ScanResponse> {
    const response = await this.client.get<ScanResponse>(`/scan/${scanId}`);
    return response.data;
  }
}
