import axios, { AxiosInstance } from 'axios';
import { ScanRequest, ScanResponse, UserProfile } from '../types';
import { ConfigManager } from './config';

export interface ScanOptions {
  onPollingStart?: () => void;
}

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

  async scan(request: ScanRequest, options?: ScanOptions): Promise<ScanResponse> {
    const { files, repository, options: reqOptions = {} } = request;
    const pollIntervalMs = 3000;
    const pollTimeoutMs = 600000;

    const pollUntilComplete = async (scanId: string): Promise<ScanResponse> => {
      options?.onPollingStart?.();
      const started = Date.now();
      while (Date.now() - started < pollTimeoutMs) {
        const statusResponse = await this.client.get<ScanResponse & { status?: string; message?: string }>(`/scan/${scanId}`, { timeout: 15000 });
        const data = statusResponse.data;
        if (data.status === 'completed') {
          return data as ScanResponse;
        }
        if (data.status === 'failed') {
          throw new Error(data.message || 'Scan failed');
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
      throw new Error('Scan timed out. Check the dashboard for results.');
    };

    try {
      const startResponse = await this.client.post<{ scanId?: string; status?: string }>(
        '/scan/start',
        { repository, options: reqOptions },
        { timeout: 15000, validateStatus: (s) => s === 201 || s === 200 }
      );
      const scanId = startResponse.data?.scanId;
      if (scanId) {
        const uploadResponse = await this.client.post<{ status?: string; scanId?: string }>(
          `/scan/${scanId}/files`,
          { files, options: reqOptions },
          { timeout: 300000, validateStatus: (s) => s === 202 }
        );
        if (uploadResponse.status === 202 && uploadResponse.data?.scanId) {
          return pollUntilComplete(uploadResponse.data.scanId);
        }
      }
    } catch {
      // Fallback: single-request flow (legacy or when start/files not available)
    }

    type ScanPostResponse = ScanResponse | { status: 'pending'; scanId: string; message?: string };
    const response = await this.client.post<ScanPostResponse>('/scan', request, {
      timeout: 120000,
      validateStatus: (status) => status === 200 || status === 202,
      headers: {
        'X-GitGuard-Async': 'true',
      },
    });

    const data = response.data as ScanPostResponse;
    if (response.status === 202 && data?.scanId && data?.status === 'pending') {
      return pollUntilComplete(data.scanId);
    }

    return response.data as ScanResponse;
  }

  async getScanStatus(scanId: string): Promise<ScanResponse> {
    const response = await this.client.get<ScanResponse>(`/scan/${scanId}`);
    return response.data;
  }
}
