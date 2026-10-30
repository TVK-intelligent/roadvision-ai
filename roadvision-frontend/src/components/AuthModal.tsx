import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { Shield, ShieldCheck, Lock, Mail, User, Phone, AlertCircle, X, Compass, HardHat, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DemoAccount {
  id: string;
  label: string;
  roleBadge: string;
  fullName: string;
  email: string;
  icon: React.ReactNode;
  badgeClass: string;
  cardClass: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'ADMIN',
    label: '1. Quản trị viên (Admin)',
    roleBadge: 'Admin Ban QL',
    fullName: 'KS. Nguyễn Thị Phương Mai',
    email: 'admin@roadcare.gov.vn',
    icon: <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    cardClass: 'hover:border-rose-400 hover:bg-rose-50/50 border-rose-200/80 bg-rose-50/20',
    description: 'Điều hành toàn diện, duyệt thẩm định & giao việc',
  },
  {
    id: 'INSPECTION',
    label: '2. Cán bộ Khảo sát',
    roleBadge: 'Tổ Khảo sát',
    fullName: 'Nguyễn Văn Kỹ Thuật (Khu QLĐB I)',
    email: 'staff.khu1@roadcare.gov.vn',
    icon: <Compass className="w-4 h-4 text-sky-600 shrink-0" />,
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    cardClass: 'hover:border-sky-400 hover:bg-sky-50/50 border-sky-200/80 bg-sky-50/20',
    description: 'Tiếp cận hiện trường, đo đạc & lập biên bản BoQ',
  },
  {
    id: 'CONSTRUCTION',
    label: '3. Đội trưởng Thi công',
    roleBadge: 'Tổ Thi công',
    fullName: 'Phạm Văn Phương Nam (Khu QLĐB IV)',
    email: 'staff.khu4@roadcare.gov.vn',
    icon: <HardHat className="w-4 h-4 text-amber-600 shrink-0" />,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    cardClass: 'hover:border-amber-400 hover:bg-amber-50/50 border-amber-200/80 bg-amber-50/20',
    description: 'Cơ giới cào bóc, lu lèn thảm nhựa & nghiệm thu',
  },
  {
    id: 'CITIZEN',
    label: '4. Người dân (Công dân)',
    roleBadge: 'Người dân',
    fullName: 'Lê Hoàng An',
    email: 'citizen.an@gmail.com',
    icon: <User className="w-4 h-4 text-emerald-600 shrink-0" />,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cardClass: 'hover:border-emerald-400 hover:bg-emerald-50/50 border-emerald-200/80 bg-emerald-50/20',
    description: 'Gửi ảnh phản ánh, Upvote & đánh giá chất lượng',
  },
];

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

  const handleQuickLogin = async (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword('12345678');
    setLoading(true);
    setErrorMessage(null);
    try {
      await switchRoleWithCredentials(acc.email);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Không thể chuyển đổi tài khoản mẫu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                    Chọn nhanh tài khoản kiểm thử:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Mật khẩu chung: 12345678</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin(acc)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer group shadow-2xs ${acc.cardClass}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 group-hover:text-blue-700">
                          {acc.icon}
                          <span className="truncate">{acc.label}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${acc.badgeClass}`}>
                          {acc.roleBadge}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-700 font-medium truncate">
                        {acc.fullName}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/60 mt-0.5">
                        <span className="truncate max-w-[140px]">{acc.email}</span>
                        <span className="text-blue-600 font-sans font-semibold group-hover:underline flex items-center gap-0.5">
                          1-Click <ArrowRight className="w-2.5 h-2.5 inline" />
                        </span>
                      </div>
                    </button>
                  ))}
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
