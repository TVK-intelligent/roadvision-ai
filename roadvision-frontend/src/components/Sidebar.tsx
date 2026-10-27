import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Map,
  PlusCircle,
  Video,
  FileText,
  Compass,
  HardHat,
  ShieldAlert,
  BarChart3,
  Users,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItemClass = (path: string) => `
    flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group relative
    ${
      isActive(path)
        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25'
        : 'text-slate-400 hover:text-slate-100 hover:bg-[#25324d]'
    }
    ${isCollapsed ? 'justify-center px-2' : ''}
  `;

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-40 bg-[#192233] border-r border-[#243048] flex flex-col transition-all duration-200 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* 1. Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#243048]">
          <Link
            to="/"
            onClick={closeMobile}
            className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}
            title="RoadVision - Hệ thống quản lý hạ tầng giao thông"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/30 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide text-white uppercase font-mono">
                  RoadVision
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                  Quản lý Hạ tầng AI
                </span>
              </div>
            )}
          </Link>

          {/* Nút thu gọn / mở rộng (Desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-6 h-6 rounded-md text-slate-400 hover:text-white hover:bg-[#25324d] items-center justify-center transition-colors"
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Menu Navigation Links (Cuộn dọc độc lập) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {/* GROUP 1: MENU CHÍNH */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Tổng quan & Dịch vụ
              </div>
            ) : (
              <div className="h-2" />
            )}
            <nav className="space-y-1">
              <Link to="/" onClick={closeMobile} className={navItemClass('/')} title="Tổng quan hệ thống">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Tổng quan</span>}
              </Link>

              <Link to="/map" onClick={closeMobile} className={navItemClass('/map')} title="Bản đồ không gian GIS">
                <Map className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Bản đồ số GIS</span>}
              </Link>

              <Link to="/report" onClick={closeMobile} className={navItemClass('/report')} title="Báo sự cố hư hỏng đường">
                <PlusCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Báo sự cố</span>}
              </Link>
            </nav>
          </div>

          {/* GROUP 2: TÁC NGHIỆP HIỆN TRƯỜNG & TUẦN TRA (STAFF / ADMIN) */}
          {(user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN') && (
            <div>
              {!isCollapsed ? (
                <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Hiện trường & Tuần tra
                </div>
              ) : (
                <div className="border-t border-[#243048] my-2" />
              )}
              <nav className="space-y-1">
                <Link
                  to="/patrol"
                  onClick={closeMobile}
                  className={navItemClass('/patrol')}
                  title="Tuần tra tuyến đường bằng Camera AI hành trình"
                >
                  <Video className="w-4 h-4 shrink-0 text-cyan-400" />
                  {!isCollapsed && <span>Tuần tra Tuyến đường (AI)</span>}
                </Link>
                <Link
                  to="/inspection-tasks"
                  onClick={closeMobile}
                  className={navItemClass('/inspection-tasks')}
                  title="Khảo sát đo đạc hiện trường (Giai đoạn 4)"
                >
                  <Compass className="w-4 h-4 shrink-0 text-teal-400" />
                  {!isCollapsed && <span>Khảo sát hiện trường</span>}
                </Link>

                <Link
                  to="/construction-tasks"
                  onClick={closeMobile}
                  className={navItemClass('/construction-tasks')}
                  title="Thi công sửa chữa & Nghiệm thu"
                >
                  <HardHat className="w-4 h-4 shrink-0 text-amber-400" />
                  {!isCollapsed && <span>Thi công sửa chữa</span>}
                </Link>
              </nav>
            </div>
          )}

          {/* GROUP 3: QUẢN TRỊ ĐIỀU HÀNH (ADMIN) */}
          {user?.role === 'ROLE_ADMIN' && (
            <div>
              {!isCollapsed ? (
                <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Quản trị hệ thống
                </div>
              ) : (
                <div className="border-t border-[#243048] my-2" />
              )}
              <nav className="space-y-1">
                <Link
                  to="/dispatch"
                  onClick={closeMobile}
                  className={navItemClass('/dispatch')}
                  title="Hàng đợi điều phối & duyệt phương án"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  {!isCollapsed && <span>Điều phối & Phân công</span>}
                </Link>

                <Link
                  to="/analytics"
                  onClick={closeMobile}
                  className={navItemClass('/analytics')}
                  title="Báo cáo phân tích KPI & Hiệu suất"
                >
                  <BarChart3 className="w-4 h-4 shrink-0 text-indigo-400" />
                  {!isCollapsed && <span>Báo cáo KPI & Phân tích</span>}
                </Link>

                <Link
                  to="/admin/teams"
                  onClick={closeMobile}
                  className={navItemClass('/admin/teams')}
                  title="Quản lý tổ đội và lực lượng nhân sự"
                >
                  <Users className="w-4 h-4 shrink-0 text-sky-400" />
                  {!isCollapsed && <span>Tổ đội & Nhân sự</span>}
                </Link>
              </nav>
            </div>
          )}

          {/* GROUP 4: DỊCH VỤ CÔNG DÂN (CITIZEN & ADMIN) */}
          {(user?.role === 'ROLE_CITIZEN' || user?.role === 'ROLE_ADMIN') && (
            <div>
              {!isCollapsed ? (
                <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Hồ sơ cá nhân
                </div>
              ) : (
                <div className="border-t border-[#243048] my-2" />
              )}
              <nav className="space-y-1">
                <Link
                  to="/my-reports"
                  onClick={closeMobile}
                  className={navItemClass('/my-reports')}
                  title="Lịch sử phản ánh của tôi"
                >
                  <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!isCollapsed && (
                    <span>{user?.role === 'ROLE_ADMIN' ? 'Hồ sơ phản ánh' : 'Lịch sử phản ánh'}</span>
                  )}
                </Link>
              </nav>
            </div>
          )}
        </div>

        {/* 3. Footer của Sidebar (Trạng thái AI Engine) */}
        {!isCollapsed ? (
          <div className="p-3 border-t border-[#243048] bg-[#141c2b]/60">
            <div className="p-2.5 rounded-lg bg-[#1f2b40] border border-[#2d3d5a] flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-semibold text-slate-200 truncate">YOLOv8 Inference</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate">Model RoadCare 800px</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-[#243048] flex justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="AI Engine đang trực tuyến" />
          </div>
        )}
      </aside>
    </>
  );
};