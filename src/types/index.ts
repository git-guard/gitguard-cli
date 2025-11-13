export interface Config {
  apiUrl: string;
  apiToken?: string;
  email?: string;
  subscription?: 'free' | 'pro' | 'premier';
  preferences?: {
    aiScanEnabled?: boolean;
    dependencyScanEnabled?: boolean;
    secretScanEnabled?: boolean;
  };
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    subscription: 'free' | 'pro' | 'premier';
  };
}

export interface ScanRequest {
  files: Record<string, string>;
  repository?: string;
  options?: {
    includeAI?: boolean;
    includeDependencies?: boolean;
    includeSecrets?: boolean;
  };
}

export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  file: string;
  line: number;
  code?: string;
  description: string;
  remediation?: string;
  aiRemediation?: string;
}

export interface ScanResponse {
  scanId: string;
  status: 'completed' | 'failed' | 'processing';
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  filesScanned: number;
  duration: number;
}

export interface UserProfile {
  id: string;
  email: string;
  subscription: 'free' | 'pro' | 'premier';
  limits: {
    dailyScans: number;
    scansRemaining: number;
    resetsAt: string;
  };
  preferences: {
    aiScanEnabled: boolean;
    dependencyScanEnabled: boolean;
    secretScanEnabled: boolean;
  };
}
