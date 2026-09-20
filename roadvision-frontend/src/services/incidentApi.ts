import axiosClient from './axiosClient';
import { Incident, IncidentStatus, Category } from '../types';

export interface IncidentFilterParams {
  status?: IncidentStatus;
  category?: Category;
  search?: string;
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export const incidentApi = {
  // Pha 1 & 2: Nộp phản ánh & chạy AI
  createIncident: (formData: FormData) => {
    return axiosClient.post<Incident>('/incidents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Pha 1.5: Quét thử AI trực tiếp từ ảnh xem trước (có hỗ trợ ngưỡng trượt)
  analyzeImage: (formData: FormData, threshold?: number) => {
    return axiosClient.post<{
      className: string;
      confidence: number;
      bboxX: number;
      bboxY: number;
      bboxWidth: number;
      bboxHeight: number;
      count?: number;
      classCounts?: Record<string, number>;
      boxes?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
        className: string;
      }>;
      estimatedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      footprintPercent?: number;
      activeThreshold?: number;
      imageWidth?: number;
      imageHeight?: number;
      inferenceMs: number;
    }>(`/incidents/analyze${threshold !== undefined ? `?threshold=${threshold}` : ''}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Pha 3: Danh sách sự cố cho Dispatch Queue
  getIncidents: (params?: IncidentFilterParams) => {
    return axiosClient.get<PageResponse<Incident>>('/incidents', { params });
  },

  // Xem chi tiết hồ sơ sự cố (Dossier)
  getIncidentById: (id: number | string) => {
    return axiosClient.get<Incident>(`/incidents/${id}`);
  },

  // Lấy phản ánh của công dân hiện tại
  getMyReports: (page = 0, size = 10) => {
    return axiosClient.get<PageResponse<Incident>>('/incidents/my', {
      params: { page, size },
    });
  },

  // Lấy nhiệm vụ được giao cho kỹ thuật viên hiện tại
  getAssignedToMe: (page = 0, size = 10) => {
    return axiosClient.get<PageResponse<Incident>>('/incidents/assigned-to-me', {
      params: { page, size },
    });
  },

  // Pha 3: Phân công kỹ thuật viên
  assignIncident: (id: number | string, data: { staffId: number; verifiedCategory?: string; priority?: string; notes?: string }) => {
    return axiosClient.patch<Incident>(`/incidents/${id}/assign`, data);
  },

  // Pha 3: Từ chối sự cố
  rejectIncident: (id: number | string, data: { rejectionReason: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/reject`, data);
  },

  // Pha 4: Chuyển trạng thái sang IN_PROGRESS
  updateStatus: (id: number | string, status: IncidentStatus) => {
    return axiosClient.patch<Incident>(`/incidents/${id}/status`, { status });
  },

  // Pha 4: Nộp ảnh bằng chứng nghiệm thu (Proof of Work)
  resolveIncident: (id: number | string, formData: FormData) => {
    return axiosClient.post<Incident>(`/incidents/${id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Pha 5: Đánh giá sao và đóng sự cố
  closeIncident: (id: number | string, data: { rating: number; comments?: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/close`, data);
  },

  // Danh sách kỹ thuật viên
  getStaffList: () => {
    return axiosClient.get<any[]>('/incidents/staff-list');
  },

  // Số liệu công khai
  getPublicStats: () => {
    return axiosClient.get<Record<string, any>>('/incidents/public-stats');
  },

  // Danh sách sự cố hiển thị bản đồ số GIS công khai
  getPublicMapIncidents: () => {
    return axiosClient.get<Incident[]>('/incidents/public-map');
  },
};
