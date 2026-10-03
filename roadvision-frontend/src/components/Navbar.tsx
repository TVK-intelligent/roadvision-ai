import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
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
  Video,
  BarChart3,
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
          label: 'Quản trị viên',
          className: 'bg-rose-50 text-rose-700 border border-rose-200',
        };
      case 'ROLE_STAFF':
        return {
          label: 'Kỹ thuật viên',
          className: 'bg-amber-50 text-amber-700 border border-amber-200',
        };
      case 'ROLE_CITIZEN':
        return {
          label: 'Người dân',
          className: 'bg-blue-50 text-blue-700 border border-blue-200',
        };
      default:
        return {
          label: 'Khách',
          className: 'bg-slate-100 text-slate-600 border border-slate-200',
        };
    }
  };

  const closeMobile = () => setIsMobileMenuOpen(false);

  const navLinkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
      isActive(path)
        ? 'bg-slate-100 text-slate-900 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between">
        {/* 1. Logo & Thương hiệu */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base text-slate-900 leading-tight">
                RoadVision
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Quản lý Hạ tầng Giao thông
              </span>
            </div>
          </Link>

          {/* 2. Menu Điều Hướng chuyên nghiệp, đồng bộ màu sắc */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass('/')}>
              Tổng quan
            </Link>

            <Link to="/report" className={navLinkClass('/report')}>
              <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Báo sự cố</span>
            </Link>

            <Link to="/map" className={navLinkClass('/map')}>
              <Map className="w-3.5 h-3.5 text-slate-500" />
              <span>Bản đồ GIS</span>
            </Link>

            <Link to="/patrol" className={navLinkClass('/patrol')}>
              <Video className="w-3.5 h-3.5 text-slate-500" />
              <span>Tuần tra</span>
            </Link>

            {/* Phân quyền người dân / admin */}
            {(user?.role === 'ROLE_CITIZEN' || user?.role === 'ROLE_ADMIN') && (
              <Link to="/my-reports" className={navLinkClass('/my-reports')}>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>{user?.role === 'ROLE_ADMIN' ? 'Hồ sơ phản ánh' : 'Lịch sử phản ánh'}</span>
              </Link>
            )}

            {/* Phân quyền kỹ thuật viên / admin */}
            {(user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN') && (
              <Link to="/tasks" className={navLinkClass('/tasks')}>
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span>Nhiệm vụ kỹ thuật</span>
              </Link>
            )}

            {/* Phân quyền Admin duy nhất */}
            {user?.role === 'ROLE_ADMIN' && (
              <>
                <Link to="/dispatch" className={navLinkClass('/dispatch')}>
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  <span>Điều phối</span>
                </Link>
                <Link
                  to="/analytics"
                  className={navLinkClass('/analytics')}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Báo cáo KPI</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* 3. Khối Bên Phải: Tài khoản */}
        <div className="flex items-center gap-3">
          {/* Hồ Sơ Tài Khoản */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 text-left p-1 rounded-md hover:bg-slate-100 transition-colors"
                title="Thông tin tài khoản"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserCircle className="w-4 h-4" />}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-medium text-slate-900 leading-tight truncate max-w-[130px]">
                    {user.fullName || 'Người dùng'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${getRoleBadge(user.role).className}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Đăng xuất khỏi hệ thống"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Nút Hamburger Mở Mobile Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Mở menu điều hướng"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 transition-opacity"
            onClick={closeMobile}
          ></div>

          <div className="relative ml-auto w-4/5 max-w-sm bg-white h-full shadow-xl p-5 flex flex-col justify-between z-50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">RoadVision</span>
                </div>
                <button onClick={closeMobile} className="p-1 rounded-md text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {user && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">{user.fullName}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded w-fit mt-0.5 ${getRoleBadge(user.role).className}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1">
                <Link
                  to="/"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                    isActive('/') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Tổng quan</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/report"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                    isActive('/report') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-slate-500" />
                    <span>Báo sự cố</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/map"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                    isActive('/map') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-slate-500" />
                    <span>Bản đồ GIS</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/patrol"
                  onClick={closeMobile}
                  className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                    isActive('/patrol') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-slate-500" />
                    <span>Tuần tra video</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {(user?.role === 'ROLE_CITIZEN' || user?.role === 'ROLE_ADMIN') && (
                  <Link
                    to="/my-reports"
                    onClick={closeMobile}
                    className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                      isActive('/my-reports') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>{user?.role === 'ROLE_ADMIN' ? 'Hồ sơ phản ánh' : 'Lịch sử phản ánh'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {(user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN') && (
                  <Link
                    to="/tasks"
                    onClick={closeMobile}
                    className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                      isActive('/tasks') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-slate-500" />
                      <span>Nhiệm vụ kỹ thuật</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {user?.role === 'ROLE_ADMIN' && (
                  <>
                    <Link
                      to="/dispatch"
                      onClick={closeMobile}
                      className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                        isActive('/dispatch') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-slate-500" />
                        <span>Điều phối hiện trường</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      to="/analytics"
                      onClick={closeMobile}
                      className={`flex items-center justify-between p-2.5 rounded-md text-xs font-medium ${
                        isActive('/analytics') || isActive('/admin/analytics') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-slate-500" />
                        <span>Báo cáo KPI</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </>
                )}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-200">
              {user ? (
                <button
                  onClick={() => {
                    closeMobile();
                    logout();
                  }}
                  className="w-full py-2 px-3 rounded-md border border-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    closeMobile();
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-md bg-blue-600 text-white font-medium text-xs flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
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
