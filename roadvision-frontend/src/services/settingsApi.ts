import axiosClient from './axiosClient';

export interface SystemSettings {
  // AI Vision
  aiConfidenceThreshold: number;
  duplicateRadiusMeters: number;
  autoSeverityClassification: boolean;
  aiModelVision: string;
  blurFaceAndLicensePlates: boolean;
  autoAiAnalysisOnSubmit: boolean;
  iouThreshold: number;

  // Dispatch & SLA
  slaCriticalHours: number;
  slaNormalHours: number;
  autoSuggestNearestTeam: boolean;
  allowDirectConstruction: boolean;
  maxReworkAttempts: number;
  requireInspectionReportAttachment: boolean;
  autoEscalateUnassignedHours?: number;

  // Notification & Alert
  enableRealtimeWebsocket: boolean;
  emailCitizenOnResolved: boolean;
  emergencyWeatherAlerts: boolean;
  supportHotline: string;
  notificationEmailSender: string;
  notifyLeaderOnCritical?: boolean;

  // Security & Authentication
  maintenanceMode: boolean;
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  enableRateLimitReport?: boolean;
  requireCitizenPhoneVerification?: boolean;

  // System & Logs
  organizationName: string;
  systemEnvironment: string;
  autoBackupSchedule: string;
  enableAuditLog: boolean;
  logRetentionDays?: number;
  mapDefaultCenter: string;
  mapDefaultZoom: number;

  // Incident Categories Config
  incidentCategoriesConfig?: {
    code: string;
    name: string;
    enabled: boolean;
    defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    color: string;
    estimatedHours: number;
    description: string;
  }[];

  // Metadata
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

export interface SystemHealth {
  status: 'UP' | 'DEGRADED' | 'MAINTENANCE';
  uptime: string;
  uptimeSeconds: number;
  jvmVersion: string;
  jvmFreeMemoryMb: number;
  jvmTotalMemoryMb: number;
  jvmMaxMemoryMb: number;
  databaseStatus: string;
  aiInferenceEngine: string;
  aiModelLoaded: boolean;
  totalIncidentsCount: number;
  pendingDispatchCount: number;
  activeTeamsCount: number;
  serverTimestamp: string;
  additionalMetrics?: Record<string, any>;
}

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const res = await axiosClient.get<SystemSettings>('/admin/settings');
    return res.data;
  },

  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await axiosClient.put<SystemSettings>('/admin/settings', settings);
    return res.data;
  },

  resetToDefaults: async (): Promise<SystemSettings> => {
    const res = await axiosClient.post<SystemSettings>('/admin/settings/reset');
    return res.data;
  },

  getSystemHealth: async (): Promise<SystemHealth> => {
    const res = await axiosClient.get<SystemHealth>('/admin/settings/health');
    return res.data;
  },
};
