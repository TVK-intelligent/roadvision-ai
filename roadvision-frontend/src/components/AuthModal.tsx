import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { Shield, Lock, Mail, User, Phone, AlertCircle, X } from 'lucide-react';
import { Role } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, switchRoleWithCredentials } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState<boolean>(true);

  // Form Đăng nhập
  const [email, setEmail] = useState<string>('admin@roadcare.gov.vn');
  const [password, setPassword] = useState<string>('12345678');

  // Form Đăng ký
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.login({ email, password });
      login(res.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Email hoặc mật khẩu không chính xác'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.register({
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        phone: regPhone,
        role: 'ROLE_CITIZEN',
      });
      login(res.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: Role) => {
    setLoading(true);
    try {
      await switchRoleWithCredentials(role);
      onClose();
    } catch (err) {
      setErrorMessage('Không thể chuyển đổi tài khoản mẫu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Xác thực hệ thống RoadVision</h2>
              <p className="text-xs text-slate-500">Đăng nhập tài khoản nội bộ hoặc công dân</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Đăng nhập / Đăng ký */}
        <div className="grid grid-cols-2 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => {
              setIsLoginTab(true);
              setErrorMessage(null);
            }}
            className={`py-2.5 text-center transition-colors ${
              isLoginTab
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-50'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setIsLoginTab(false);
              setErrorMessage(null);
            }}
            className={`py-2.5 text-center transition-colors ${
              !isLoginTab
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-50'
            }`}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoginTab ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="name@roadcare.gov.vn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>

              {/* Nút đăng nhập mẫu 1-click */}
              <div className="mt-2 pt-3 border-t border-slate-200 flex flex-col gap-2">
                <span className="text-[11px] font-medium text-slate-500">
                  Tài khoản kiểm thử nhanh theo phân quyền:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ROLE_ADMIN')}
                    className="px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Quản trị viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ROLE_STAFF')}
                    className="px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Kỹ thuật viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ROLE_CITIZEN')}
                    className="px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Người dân
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Họ và tên *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="nguyenvana@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="0912345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mật khẩu *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
