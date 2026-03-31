import axios, { AxiosInstance } from 'axios';
import { ScanRequest, ScanResponse, UserProfile } from '../types';
import { ConfigManager } from './config';

/** Default 4h — large enhanced scans (many files + deps/AI) often need 30m+. Use GITGUARD_SCAN_TIMEOUT_MS=0 for no limit. */
const DEFAULT_CLI_POLL_TIMEOUT_MS = 4 * 60 * 60 * 1000;

function resolveCliPollTimeoutMs(): { finite: boolean; ms: number } {
  const raw = process.env.GITGUARD_SCAN_TIMEOUT_MS;
  if (raw === undefined || raw === '') {
    return { finite: true, ms: DEFAULT_CLI_POLL_TIMEOUT_MS };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { finite: true, ms: DEFAULT_CLI_POLL_TIMEOUT_MS };
  }
  if (n === 0) {
    return { finite: false, ms: 0 };
  }
  return { finite: true, ms: n };
}

function normalizeScanResponse(data: any): ScanResponse {
  const vulnerabilities = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];
  const summary =
    data?.summary && typeof data.summary === 'object'
      ? data.summary
      : { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  return { ...data, vulnerabilities, summary } as ScanResponse;
}

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
    const pollLimit = resolveCliPollTimeoutMs();
    const uploadTimeoutMs = Number(process.env.GITGUARD_UPLOAD_TIMEOUT_MS || '1800000');

    const pollUntilComplete = async (scanId: string): Promise<ScanResponse> => {
      options?.onPollingStart?.();
      const started = Date.now();
      const maxPollRetries = 5;
      while (!pollLimit.finite || Date.now() - started < pollLimit.ms) {
        for (let attempt = 0; attempt < maxPollRetries; attempt++) {
          try {
            const statusResponse = await this.client.get<ScanResponse & { status?: string; message?: string }>(
              `/scan/${scanId}`,
              { timeout: 60000 }
            );
            const data = statusResponse.data;
            if (data.status === 'completed') {
              return normalizeScanResponse(data);
            }
            if (data.status === 'failed') {
              throw new Error(data.message || 'Scan failed');
            }
            break;
          } catch (err: any) {
            const code = err?.code || err?.cause?.code;
            const status = err?.response?.status;
            const isRetryable =
              code === 'ECONNRESET' ||
              code === 'ETIMEDOUT' ||
              code === 'ECONNABORTED' ||
              code === 'ENOTFOUND' ||
              status === 404 ||
              status === 408 ||
              status === 429 ||
              status >= 500;
            if (isRetryable && attempt < maxPollRetries - 1) {
              await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
              continue;
            }
            throw err;
          }
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
      const waitedMin = Math.round((Date.now() - started) / 60000);
      throw new Error(
        `Scan timed out after ${waitedMin}m (limit ${Math.round(pollLimit.ms / 60000)}m). ` +
          'Large monorepos can exceed this. Set GITGUARD_SCAN_TIMEOUT_MS=0 to wait with no limit, ' +
          'or set a higher value in milliseconds. You can still open the dashboard for results.'
      );
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
          { timeout: uploadTimeoutMs, validateStatus: (s) => s === 202 }
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

    return normalizeScanResponse(response.data ?? {});
  }

  async getScanStatus(scanId: string): Promise<ScanResponse> {
    const response = await this.client.get<ScanResponse>(`/scan/${scanId}`);
    return normalizeScanResponse(response.data ?? {});
  }
}
