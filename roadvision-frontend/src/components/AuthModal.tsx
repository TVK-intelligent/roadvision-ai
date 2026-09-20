import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { Shield, Lock, Mail, User, Phone, AlertCircle, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-primary to-primary-container text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base">Cổng Định Danh RoadVision</h2>
              <span className="text-[10px] text-white/80 font-mono">Xác thực chuẩn JWT & RBAC</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Đăng nhập / Đăng ký */}
        <div className="grid grid-cols-2 border-b border-outline-variant/30 text-xs font-bold">
          <button
            onClick={() => {
              setIsLoginTab(true);
              setErrorMessage(null);
            }}
            className={`py-3 text-center transition-colors ${
              isLoginTab
                ? 'border-b-2 border-primary text-primary bg-primary-fixed/10'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => {
              setIsLoginTab(false);
              setErrorMessage(null);
            }}
            className={`py-3 text-center transition-colors ${
              !isLoginTab
                ? 'border-b-2 border-primary text-primary bg-primary-fixed/10'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Đăng Ký Tài Khoản Dân
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-error-container text-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoginTab ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary"
                    placeholder="name@roadcare.gov.vn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-primary-container disabled:opacity-50"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
              </button>

              {/* Nút đăng nhập mẫu 1-click */}
              <div className="mt-3 pt-3 border-t border-outline-variant/30 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Đăng nhập nhanh tài khoản mẫu kiểm thử:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ROLE_ADMIN')}
                    className="px-2 py-1.5 rounded-lg bg-surface-container text-xs font-bold text-primary hover:bg-surface-container-high transition-colors"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ROLE_STAFF')}
                    className="px-2 py-1.5 rounded-lg bg-surface-container text-xs font-bold text-secondary hover:bg-surface-container-high transition-colors"
                  >
                    Staff Kỹ Thuật
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ROLE_CITIZEN')}
                    className="px-2 py-1.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Công Dân
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Họ và Tên *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary"
                    placeholder="nguyenvana@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Số Điện Thoại</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary"
                    placeholder="0912345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Mật khẩu *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-primary-container disabled:opacity-50"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Công Dân'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
