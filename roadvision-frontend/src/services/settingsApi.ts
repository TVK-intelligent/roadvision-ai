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

  // Notification & Alert
  enableRealtimeWebsocket: boolean;
  emailCitizenOnResolved: boolean;
  emergencyWeatherAlerts: boolean;
  supportHotline: string;
  notificationEmailSender: string;

  // System & General
  organizationName: string;
  systemEnvironment: string;
  maintenanceMode: boolean;
  autoBackupSchedule: string;
  enableAuditLog: boolean;
  mapDefaultCenter: string;
  mapDefaultZoom: number;

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
