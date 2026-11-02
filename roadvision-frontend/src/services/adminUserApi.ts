import axiosClient from './axiosClient';
import {
  AdminUser,
  UserStats,
  AdminCreateUserData,
  UpdateUserStatusData,
  UpdateReputationData,
  Role,
} from '../types';

export interface GetUsersParams {
  search?: string;
  role?: Role;
  isActive?: boolean;
}

export const adminUserApi = {
  // Lấy danh sách tất cả người dùng với bộ lọc
  getAllUsers: async (params?: GetUsersParams): Promise<AdminUser[]> => {
    const response = await axiosClient.get('/admin/users', { params });
    return response.data;
  },

  // Lấy thống kê người dùng tổng thể
  getUserStats: async (): Promise<UserStats> => {
    const response = await axiosClient.get('/admin/users/stats');
    return response.data;
  },

  // Lấy chi tiết 1 người dùng
  getUserById: async (id: number): Promise<AdminUser> => {
    const response = await axiosClient.get(`/admin/users/${id}`);
    return response.data;
  },

  // Phân quyền vai trò người dùng (ROLE_CITIZEN, ROLE_STAFF, ROLE_ADMIN)
  updateUserRole: async (id: number, role: Role): Promise<AdminUser> => {
    const response = await axiosClient.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  // Khóa / Mở khóa tài khoản
  updateUserStatus: async (id: number, data: UpdateUserStatusData): Promise<AdminUser> => {
    const response = await axiosClient.put(`/admin/users/${id}/status`, data);
    return response.data;
  },

  // Điều chỉnh điểm uy tín & xóa cảnh cáo spam
  updateReputation: async (id: number, data: UpdateReputationData): Promise<AdminUser> => {
    const response = await axiosClient.put(`/admin/users/${id}/reputation`, data);
    return response.data;
  },

  // Đặt lại mật khẩu
  resetPassword: async (id: number, newPassword: string): Promise<{ message: string }> => {
    const response = await axiosClient.put(`/admin/users/${id}/reset-password`, { newPassword });
    return response.data;
  },

  // Tạo tài khoản mới từ phía Quản trị viên
  createUser: async (data: AdminCreateUserData): Promise<AdminUser> => {
    const response = await axiosClient.post('/admin/users', data);
    return response.data;
  },
};
