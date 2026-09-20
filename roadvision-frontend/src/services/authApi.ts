import axiosClient from './axiosClient';
import { AuthResponse } from '../types';

export const authApi = {
  login: (data: { email: string; password: string }) => {
    return axiosClient.post<AuthResponse>('/auth/login', data);
  },
  register: (data: { email: string; password: string; fullName: string; phone?: string; role?: string }) => {
    return axiosClient.post<AuthResponse>('/auth/register', data);
  },
};
