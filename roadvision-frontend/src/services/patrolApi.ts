import axiosClient from './axiosClient';

export interface PatrolSession {
  id: number;
  sessionCode: string;
  inspectorId: number;
  inspectorName: string;
  inspectorEmail: string;
  routeName: string;
  startTime?: string;
  endTime?: string;
  totalDistanceKm: number;
  totalPotholesDetected: number;
  routeHealthRating: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  videoName?: string;
  keyframeUrl1?: string;
  keyframeUrl2?: string;
  gpsPathJson?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  status: 'SUBMITTED' | 'REVIEWED' | 'DISPATCHED' | 'REJECTED';
  notes?: string;
  incidentId?: number;
  incidentTicketCode?: string;
  hasNearbyDuplicate?: boolean;
  duplicateIncidentId?: number;
  duplicateTicketCode?: string;
  duplicateDistanceMeters?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatrolSessionPageResponse {
  content: PatrolSession[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const patrolApi = {
  createSession: async (formData: FormData): Promise<PatrolSession> => {
    const response = await axiosClient.post<PatrolSession>('/patrol-sessions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAllSessions: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PatrolSessionPageResponse> => {
    const response = await axiosClient.get<PatrolSessionPageResponse>('/patrol-sessions', {
      params,
    });
    return response.data;
  },

  getMySessions: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PatrolSessionPageResponse> => {
    const response = await axiosClient.get<PatrolSessionPageResponse>('/patrol-sessions/my', {
      params,
    });
    return response.data;
  },

  getSessionById: async (id: number): Promise<PatrolSession> => {
    const response = await axiosClient.get<PatrolSession>(`/patrol-sessions/${id}`);
    return response.data;
  },

  updateStatus: async (
    id: number,
    status: 'REVIEWED' | 'DISPATCHED' | 'REJECTED',
    notes?: string
  ): Promise<PatrolSession> => {
    const response = await axiosClient.patch<PatrolSession>(`/patrol-sessions/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  },
};
