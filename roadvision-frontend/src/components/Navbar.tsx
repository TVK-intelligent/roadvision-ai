import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Sparkles,
  Map,
  UserCircle,
  LogIn,
  LogOut,
  Wrench,
  ShieldAlert,
  FileText,
  PlusCircle,
  Menu,
  X,
  ChevronRight,
  Radio,
  Video,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isActive = (path: string) => location.pathname === path;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return {
          label: 'Quản Trị Viên',
          className: 'bg-rose-100 text-rose-800 border border-rose-300',
        };
      case 'ROLE_STAFF':
        return {
          label: 'Kỹ Thuật Viên',
          className: 'bg-amber-100 text-amber-900 border border-amber-400',
        };
      case 'ROLE_CITIZEN':
        return {
          label: 'Công Dân',
          className: 'bg-blue-100 text-blue-800 border border-blue-300',
        };
      default:
        return {
          label: 'Khách',
          className: 'bg-slate-100 text-slate-700 border border-slate-300',
        };
    }
  };

  const closeMobile = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-4 lg:px-6 flex items-center justify-between transition-all">
        {/* 1. Logo & Thương hiệu */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                RoadVision
              </span>
              <span className="font-mono text-[9px] text-blue-600 uppercase tracking-wider font-bold">
                AI INFRASTRUCTURE
              </span>
            </div>
          </Link>

          {/* 2. Menu Điều Hướng - Sắp xếp logic theo luồng sử dụng, chỉ highlight khi đang ở trang đó */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Trang Chủ */}
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Trang Chủ
            </Link>

            {/* Báo Cáo Sự Cố: Nằm ngay cạnh Trang Chủ để người dùng thấy ngay */}
            <Link
              to="/report"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/report')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Báo Cáo Sự Cố</span>
            </Link>

            {/* Bản Đồ Số GIS */}
            <Link
              to="/map"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/map')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-blue-600" />
              <span>Bản Đồ Số GIS</span>
            </Link>

            {/* Video Tuần Tra Mặt Đường */}
            <Link
              to="/patrol"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/patrol')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-slate-100'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>Video Tuần Tra</span>
            </Link>

            {/* Mục cho Công Dân & Admin: Xem hồ sơ phản ánh */}
            {(user?.role === 'ROLE_CITIZEN' || user?.role === 'ROLE_ADMIN') && (
              <Link
                to="/my-reports"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive('/my-reports')
                    ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{user?.role === 'ROLE_ADMIN' ? 'Hồ Sơ Phản Ánh' : 'Lịch Sử Của Tôi'}</span>
              </Link>
            )}

            {/* Mục cho Kỹ Thuật Viên & Admin: Nhiệm vụ thi công */}
            {(user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN') && (
              <Link
                to="/tasks"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive('/tasks')
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>Nhiệm Vụ Kỹ Thuật</span>
              </Link>
            )}

            {/* Mục Dành Riêng Cho Quản Trị Viên (Admin): Hàng đợi điều phối trung tâm */}
            {user?.role === 'ROLE_ADMIN' && (
              <Link
                to="/dispatch"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive('/dispatch')
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-rose-700 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Điều Phối Admin</span>
              </Link>
            )}
          </nav>
        </div>

        {/* 3. Khối Bên Phải: Model Badge & Tài khoản */}
        <div className="flex items-center gap-3">
          {/* AI Model Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono text-[11px] font-bold text-slate-700">YOLOv8-RoadCare v2.4</span>
          </div>

          {/* Hồ Sơ Tài Khoản */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 text-left p-1 rounded-xl hover:bg-slate-100 transition-colors"
                title="Xem thông tin tài khoản hoặc chuyển đổi phiên"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                    {user.fullName || 'Người dùng'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getRoleBadge(user.role).className}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Đăng xuất khỏi hệ thống"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-bold transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng Nhập</span>
            </button>
          )}

          {/* Nút Hamburger Mở Mobile Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Mở menu điều hướng"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Menu Trượt Cho Điện Thoại) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
          ></div>

          <div className="relative ml-auto w-4/5 max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col justify-between z-50 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="font-display font-bold text-base text-slate-900">Menu Điều Hướng</span>
                </div>
                <button onClick={closeMobile} className="p-1 rounded-lg text-slate-500 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {user && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{user.fullName}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 ${getRoleBadge(user.role).className}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1.5">
                <Link
                  to="/"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                    isActive('/') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Trang Chủ</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/report"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                    isActive('/report') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <span>Báo Cáo Sự Cố</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/map"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                    isActive('/map') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-blue-600" />
                    <span>Bản Đồ Số GIS</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/patrol"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                    isActive('/patrol') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span>Video Tuần Tra Mặt Đường</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {(user?.role === 'ROLE_CITIZEN' || user?.role === 'ROLE_ADMIN') && (
                  <Link
                    to="/my-reports"
                    onClick={closeMobile}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                      isActive('/my-reports') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{user?.role === 'ROLE_ADMIN' ? 'Hồ Sơ Phản Ánh' : 'Lịch Sử Của Tôi'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {(user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN') && (
                  <Link
                    to="/tasks"
                    onClick={closeMobile}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                      isActive('/tasks') ? 'bg-amber-50 text-amber-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      <span>Nhiệm Vụ Kỹ Thuật</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {user?.role === 'ROLE_ADMIN' && (
                  <Link
                    to="/dispatch"
                    onClick={closeMobile}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                      isActive('/dispatch') ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Hàng Đợi Điều Phối Admin</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => {
                    closeMobile();
                    logout();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng Xuất</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    closeMobile();
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Tài Khoản</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
