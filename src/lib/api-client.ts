import axios, { AxiosInstance } from 'axios';
import { AuthResponse, ScanRequest, ScanResponse, UserProfile } from '../types';
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

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
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
