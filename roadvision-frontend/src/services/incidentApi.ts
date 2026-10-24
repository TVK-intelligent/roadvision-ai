import axiosClient from './axiosClient';
import { Incident, IncidentStatus, Category } from '../types';

export interface IncidentFilterParams {
  status?: IncidentStatus;
  statuses?: IncidentStatus[] | string;
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

  // Pha 1.5 - Kênh Video: Quét frame video hành trình tuần tra qua PatrolVideoAiService riêng biệt
  analyzeVideoFrame: (formData: FormData, threshold?: number) => {
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
    }>(`/incidents/analyze-video-frame${threshold !== undefined ? `?threshold=${threshold}` : ''}`, formData, {
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

  // Pha 2.5: Quản trị viên xác nhận sự cố hợp lệ (VERIFIED)
  verifyIncident: (id: number | string) => {
    return axiosClient.post<Incident>(`/incidents/${id}/verify`);
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

  // Pha 4: Nộp ảnh bằng chứng nghiệm thu (Proof of Work) -> PENDING_INSPECTION
  resolveIncident: (id: number | string, formData: FormData) => {
    return axiosClient.post<Incident>(`/incidents/${id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Pha 4.5: Quản trị viên phê duyệt nghiệm thu mặt đường (RESOLVED)
  approveInspection: (id: number | string, data?: { notes?: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/approve-inspection`, data || {});
  },

  // Pha 5: Đóng hồ sơ sự cố (Admin hoặc Citizen sau khi đã RESOLVED)
  closeIncident: (id: number | string, data?: { rating?: number; comments?: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/close`, data || {});
  },

  // Đánh giá của người dân (tùy chọn sau khi sự cố RESOLVED hoặc CLOSED)
  submitFeedback: (id: number | string, data: { rating: number; comments?: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/feedback`, data);
  },

  // Pha 5: Người dân khiếu nại nghiệm thu chưa đạt (Dispute)
  disputeIncident: (id: number | string, data: { reason: string; rating?: number }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/dispute`, data);
  },

  // Pha 5: Quản trị viên bác bỏ nghiệm thu và ra lệnh thi công lại (Rework)
  reworkIncident: (id: number | string, data: { instructions: string; priority?: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/rework`, data);
  },

  // ==========================================
  // LUỒNG 7 GIAI ĐOẠN ĐỒ ÁN ROADVISION
  // ==========================================

  // Giai đoạn 3 -> 4: Admin giao nhiệm vụ khảo sát hiện trường cho Tổ Khảo sát
  assignInspection: (id: number | string, data: import('../types').InspectionAssignRequest) => {
    return axiosClient.post<Incident>(`/incidents/${id}/assign-inspection`, data);
  },

  // Giai đoạn 4: Nhân viên khảo sát xác nhận đã đến vị trí và bắt đầu khảo sát
  startInspection: (id: number | string) => {
    return axiosClient.post<Incident>(`/incidents/${id}/start-inspection`);
  },

  // Giai đoạn 4: Nhân viên nộp báo cáo khảo sát hiện trường + ảnh hiện trạng
  submitInspectionReport: (id: number | string, formData: FormData) => {
    return axiosClient.post<Incident>(`/incidents/${id}/inspection-report`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Giai đoạn 5: Admin duyệt phương án và giao việc cho Tổ Thi công chuyên trách
  assignConstruction: (id: number | string, data: import('../types').ConstructionAssignRequest) => {
    return axiosClient.post<Incident>(`/incidents/${id}/assign-construction`, data);
  },

  // Giai đoạn 5: Admin từ chối phương án khảo sát / yêu cầu đo đạc bổ sung
  rejectInspectionReport: (id: number | string, data: { reason: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/reject-inspection-report`, data);
  },

  // Giai đoạn 6: Kỹ thuật viên báo cáo giải trình lý do chậm tiến độ thi công
  reportDelayReason: (id: number | string, data: { delayReason: string }) => {
    return axiosClient.post<Incident>(`/incidents/${id}/report-delay`, data);
  },

  // Giai đoạn 6: Tổ đội bắt đầu triển khai thi công (IN_PROGRESS)
  startConstruction: (id: number | string) => {
    return axiosClient.post<Incident>(`/incidents/${id}/start-construction`);
  },

  // Giai đoạn 6: Tổ đội tải lên ảnh bằng chứng theo từng mốc (BEFORE_WORK, PROGRESS, AFTER_WORK, REWORK)
  uploadEvidence: (id: number | string, formData: FormData) => {
    return axiosClient.post<import('../types').EvidenceResponse>(`/incidents/${id}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Giai đoạn 6: Tổ đội hoàn tất thi công và gửi hồ sơ nộp nghiệm thu có AI quét (PENDING_ACCEPTANCE)
  submitAcceptance: (id: number | string, data?: FormData | { notes?: string }) => {
    if (data instanceof FormData) {
      return axiosClient.post<Incident>(`/incidents/${id}/submit-acceptance`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axiosClient.post<Incident>(`/incidents/${id}/submit-acceptance`, data || {});
  },

  // Giai đoạn 7: Admin thẩm định nghiệm thu (Đạt -> CLOSED, Không đạt -> REWORK_REQUIRED)
  reviewAcceptance: (id: number | string, data: import('../types').AcceptanceReviewRequest) => {
    return axiosClient.post<Incident>(`/incidents/${id}/review-acceptance`, data);
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

  // Pha 1.8: Kiểm tra trùng lặp không gian lân cận (Spatial Deduplication)
  checkNearbyDuplicate: (params: { latitude: number; longitude: number; category?: string; radius?: number }) => {
    return axiosClient.get<import('../types').NearbyIncidentCheckResponse>('/incidents/check-nearby', { params });
  },

  // Pha 1.9: Đồng tình với phản ánh đã có (+1 Upvote)
  upvoteIncident: (id: number | string) => {
    return axiosClient.post<Incident>(`/incidents/${id}/upvote`);
  },

  // Quản trị viên: Lấy báo cáo phân tích KPI tổng thể (Admin Control Center & Analytics)
  getAdminAnalytics: (params?: { timeframe?: string; district?: string }) => {
    return axiosClient.get<import('../types').AdminAnalyticsResponse>('/admin/analytics', { params });
  },

  // Quản trị viên: Xuất toàn bộ sự cố dưới dạng GIS GeoJSON
  exportGeoJson: () => {
    return axiosClient.get('/admin/export-geojson', { responseType: 'blob' });
  },

  // Giám sát viễn trắc AI Model
  getAiTelemetry: () => {
    return axiosClient.get<Record<string, any>>('/ai/telemetry');
  },

  // Trợ lý AI RoadVision (Gemini Multimodal RAG Assistant)
  chatWithAi: (data: {
    message: string;
    history?: Array<{ role: string; content: string }>;
  }) => {
    return axiosClient.post<{
      reply: string;
      timestamp: string;
      suggestions: string[];
      referencedIncidents?: Array<{
        id: number;
        trackingCode: string;
        title: string;
        status: string;
        address: string;
        category: string;
      }>;
    }>('/ai/chat', data);
  },

  // ==========================================
  // QUẢN LÝ TỔ ĐỘI & NHÂN VIÊN CHUYÊN TRÁCH
  // ==========================================

  // Lấy danh sách toàn bộ tổ đội
  getTeams: () => {
    return axiosClient.get<import('../types').Team[]>('/admin/teams');
  },

  // Lấy chi tiết một tổ đội
  getTeamById: (id: number | string) => {
    return axiosClient.get<import('../types').Team>(`/admin/teams/${id}`);
  },

  // Tạo tổ đội mới
  createTeam: (data: import('../types').TeamRequest) => {
    return axiosClient.post<import('../types').Team>('/admin/teams', data);
  },

  // Cập nhật thông tin tổ đội
  updateTeam: (id: number | string, data: import('../types').TeamRequest) => {
    return axiosClient.put<import('../types').Team>(`/admin/teams/${id}`, data);
  },

  // Xóa / giải thể tổ đội
  deleteTeam: (id: number | string) => {
    return axiosClient.delete<{ message: string }>(`/admin/teams/${id}`);
  },

  // Lấy danh sách nhân viên chi tiết (hỗ trợ lọc theo tổ đội, loại đội, trạng thái)
  getStaffDetailedList: (params?: { teamId?: number; teamType?: string; isActive?: boolean }) => {
    return axiosClient.get<import('../types').Staff[]>('/admin/staff', { params });
  },

  // Tạo tài khoản nhân viên kỹ thuật mới
  createStaff: (data: import('../types').StaffCreateRequest) => {
    return axiosClient.post<import('../types').Staff>('/admin/staff', data);
  },

  // Cập nhật thông tin / tổ đội / vai trò của nhân viên
  updateStaff: (id: number | string, data: import('../types').StaffUpdateRequest) => {
    return axiosClient.put<import('../types').Staff>(`/admin/staff/${id}`, data);
  },

  // Khóa hoặc mở khóa tài khoản nhân viên
  toggleStaffStatus: (id: number | string) => {
    return axiosClient.put<import('../types').Staff>(`/admin/staff/${id}/toggle-status`);
  },

  // --- HỆ THỐNG CHUÔNG THÔNG BÁO REAL-TIME ---
  getNotifications: (page = 0, size = 15) => {
    return axiosClient.get<{ content: import('../types').NotificationItem[]; totalElements: number; totalPages: number }>('/notifications', {
      params: { page, size },
    });
  },

  getUnreadNotificationCount: () => {
    return axiosClient.get<{ unreadCount: number }>('/notifications/unread-count');
  },

  markNotificationRead: (id: number | string) => {
    return axiosClient.put(`/notifications/${id}/read`);
  },

  markAllNotificationsRead: () => {
    return axiosClient.put('/notifications/read-all');
  },

  broadcastEmergency: (data: { active: boolean; title?: string; message?: string }) => {
    return axiosClient.post<import('../types').NotificationItem>('/notifications/broadcast-emergency', data);
  },

  getEmergencyStatus: () => {
    return axiosClient.get<{ active: boolean; title?: string; message?: string; timestamp?: string }>('/notifications/emergency-status');
  },
};



