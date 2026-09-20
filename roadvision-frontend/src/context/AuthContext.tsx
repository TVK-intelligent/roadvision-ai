import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, AuthResponse } from '../types';
import { authApi } from '../services/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  hasRole: (roles: Role | Role[]) => boolean;
  switchRoleWithCredentials: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('token');
    return savedToken && savedToken !== 'demo-token' ? savedToken : null;
  });

  const login = (authData: AuthResponse) => {
    setToken(authData.token);
    const userData: User = {
      id: authData.userId,
      email: authData.email,
      fullName: authData.fullName,
      role: authData.role,
    };
    setUser(userData);
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const switchRoleWithCredentials = async (role: Role) => {
    let email = 'admin@roadcare.gov.vn';
    if (role === 'ROLE_STAFF') {
      email = 'staff.nguyen@roadcare.gov.vn';
    } else if (role === 'ROLE_CITIZEN') {
      email = 'citizen.an@gmail.com';
    }

    try {
      const res = await authApi.login({ email, password: '12345678' });
      login(res.data);
    } catch (err) {
      console.error('Đăng nhập nhanh thất bại:', err);
      throw err;
    }
  };

  // Giữ phiên đăng nhập từ localStorage nếu hợp lệ, không ép buộc tự động làm Admin
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!savedToken || !savedUser) {
      // Người dùng ở trạng thái khách (Guest) cho đến khi chủ động đăng nhập
    }
  }, []);

  const hasRole = (roles: Role | Role[]) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        hasRole,
        switchRoleWithCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
