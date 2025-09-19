// Port kontrol sistemi için TypeScript type tanımları

export interface PortConfig {
  id: string;
  host: string;
  port: number;
  name?: string;
  description?: string;
  timeout: number; // milliseconds
  interval: number; // milliseconds
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortCheckResult {
  id: string;
  portConfigId: string;
  host: string;
  port: number;
  status: PortStatus;
  responseTime?: number; // milliseconds
  error?: string;
  timestamp: Date;
}

export enum PortStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  TIMEOUT = 'timeout',
  ERROR = 'error'
}

export interface PortMonitorConfig {
  defaultTimeout: number;
  defaultInterval: number;
  maxConcurrentChecks: number;
  retryAttempts: number;
  retryDelay: number;
  alertThreshold: number; // consecutive failures before alert
}

export interface AlertConfig {
  id: string;
  portConfigId: string;
  type: AlertType;
  enabled: boolean;
  threshold: number;
  recipients: string[];
  message?: string;
  createdAt: Date;
}

export enum AlertType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  LOG = 'log',
  CONSOLE = 'console'
}

export interface Alert {
  id: string;
  alertConfigId: string;
  portConfigId: string;
  type: AlertType;
  message: string;
  status: AlertStatus;
  sentAt?: Date;
  error?: string;
  createdAt: Date;
}

export enum AlertStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed'
}

export interface PortMonitorStats {
  totalPorts: number;
  onlinePorts: number;
  offlinePorts: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptime: number; // percentage
}

export interface PortCheckOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface SchedulerJob {
  id: string;
  portConfigId: string;
  nextRun: Date;
  lastRun?: Date;
  isRunning: boolean;
  consecutiveFailures: number;
}

export interface PortMonitorEvent {
  type: EventType;
  portConfigId: string;
  data: any;
  timestamp: Date;
}

export enum EventType {
  PORT_ONLINE = 'port_online',
  PORT_OFFLINE = 'port_offline',
  PORT_TIMEOUT = 'port_timeout',
  PORT_ERROR = 'port_error',
  ALERT_SENT = 'alert_sent',
  ALERT_FAILED = 'alert_failed',
  MONITOR_STARTED = 'monitor_started',
  MONITOR_STOPPED = 'monitor_stopped'
}

export interface PortMonitorReport {
  portConfigId: string;
  portConfig: PortConfig;
  period: {
    start: Date;
    end: Date;
  };
  stats: {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    averageResponseTime: number;
    uptime: number;
    downtimeEvents: PortCheckResult[];
  };
  alerts: Alert[];
}

export interface PortMonitorDashboard {
  overview: PortMonitorStats;
  recentChecks: PortCheckResult[];
  activeAlerts: Alert[];
  portStatuses: Array<{
    config: PortConfig;
    lastCheck: PortCheckResult;
    isOnline: boolean;
  }>;
}

// API Request/Response types
export interface CreatePortConfigRequest {
  host: string;
  port: number;
  name?: string;
  description?: string;
  timeout?: number;
  interval?: number;
}

export interface UpdatePortConfigRequest {
  host?: string;
  port?: number;
  name?: string;
  description?: string;
  timeout?: number;
  interval?: number;
  enabled?: boolean;
}

export interface PortCheckRequest {
  host: string;
  port: number;
  timeout?: number;
}

export interface PortCheckResponse {
  success: boolean;
  result?: PortCheckResult;
  error?: string;
}

export interface PortListResponse {
  ports: PortConfig[];
  total: number;
  page: number;
  limit: number;
}

export interface PortStatsResponse {
  stats: PortMonitorStats;
  period: {
    start: Date;
    end: Date;
  };
}