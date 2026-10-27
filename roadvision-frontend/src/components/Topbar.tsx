import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Menu,
  Search,
  Bell,
  UserCircle,
  LogIn,
  LogOut,
  ChevronDown,
  Sparkles,
  Loader2,
  X,
  ArrowUpRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  MapPin,
  Star,
  Radio,
  Clock,
  Calendar,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleSidebar,
  onOpenMobileSidebar,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, isConnected, emergencyBroadcast, triggerEmergencyBroadcast, markAsRead, markAllAsRead } = useNotifications();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isNotiOpen, setIsNotiOpen] = useState<boolean>(false);

  // Trạng thái tìm kiếm toàn hệ thống
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Incident[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Thời gian thực hệ thống
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCurrentTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayOfWeek = daysOfWeek[date.getDay()];

    return {
      time: `${hours}:${minutes}:${seconds}`,
      date: `${dayOfWeek}, ${day}/${month}/${year}`,
    };
  };

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Tổng quan hệ thống';
    if (pathname.startsWith('/map')) return 'Bản đồ không gian GIS';
    if (pathname.startsWith('/report')) return 'Báo cáo sự cố mặt đường';
    if (pathname.startsWith('/patrol')) return 'Tuần tra video trực tuyến';
    if (pathname.startsWith('/inspection-tasks')) return 'Khảo sát hiện trường (Giai đoạn 4)';
    if (pathname.startsWith('/construction-tasks')) return 'Thi công & Nghiệm thu (Giai đoạn 6)';
    if (pathname.startsWith('/dispatch')) return 'Hàng đợi điều phối nhiệm vụ';
    if (pathname.startsWith('/analytics')) return 'Báo cáo KPI & Phân tích chất lượng';
    if (pathname.startsWith('/admin/teams')) return 'Quản lý Tổ đội & Nhân sự';
    if (pathname.startsWith('/my-reports')) return 'Lịch sử phản ánh của tôi';
    if (pathname.startsWith('/incidents/')) return 'Hồ sơ sự cố chi tiết';
    return 'Hạ tầng giao thông';
  };

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

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  // Tự động tìm kiếm tức thì với Debounce 250ms
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      incidentApi
        .getIncidents({ search: trimmed, page: 0, size: 6 })
        .then((res) => {
          setSearchResults(res.data?.content || []);
          setIsSearchOpen(true);
        })
        .catch((err) => {
          console.warn('Lỗi tra cứu sự cố:', err);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectIncident = (incidentId: number) => {
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
    navigate(`/incidents/${incidentId}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectIncident(searchResults[0].id);
    } else if (searchQuery.trim()) {
      setIsSearchOpen(false);
      setIsMobileSearchOpen(false);
      navigate(`/my-reports?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* BANNER BÁO ĐỘNG KHẨN CẤP TOÀN MẠNG LƯỚI ĐÔ THỊ */}
      {emergencyBroadcast?.active && (
        <div className="bg-rose-600 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-md border-b border-rose-700 animate-pulse sticky top-0 z-40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Radio className="w-4 h-4 text-white shrink-0 animate-ping" />
            <span className="font-bold tracking-wide uppercase text-[10px] bg-rose-800 px-2 py-0.5 rounded shrink-0">
              {emergencyBroadcast.title || 'LỆNH BÁO ĐỘNG KHẨN CẤP'}
            </span>
            <span className="truncate">
              {emergencyBroadcast.message || 'Ban Quản Lý yêu cầu các tổ tuần kiểm và thi công ưu tiên xử lý khẩn các sự cố sụt lún, ngập úng nguy hiểm!'}
            </span>
          </div>
          {user?.role === 'ROLE_ADMIN' && (
            <button
              onClick={() => triggerEmergencyBroadcast(false)}
              className="ml-3 px-2.5 py-1 bg-white text-rose-700 text-[11px] font-bold rounded-lg hover:bg-rose-50 transition shadow-xs shrink-0 cursor-pointer"
            >
              Hạ Cảnh Báo
            </button>
          )}
        </div>
      )}

      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between shadow-xs">
        {/* 1. Bên Trái: Nút Toggle & Tìm kiếm & Breadcrumb */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-xl">
          {/* Nút Hamburger Desktop & Mobile */}
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                onOpenMobileSidebar();
              } else {
                onToggleSidebar();
              }
            }}
            className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Đóng / mở menu bên trái"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Tiêu đề trang trên Desktop */}
          <div className="hidden sm:flex flex-col justify-center">
            <h1 className="text-base font-semibold text-slate-800 leading-tight">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          {/* Ô tìm kiếm nhanh kiểu SaaS với Dropdown kết quả tức thì */}
          <div ref={searchContainerRef} className="relative w-full max-w-sm hidden lg:block ml-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) setIsSearchOpen(true);
                  }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sự cố, mã phiếu, vị trí... (nhập từ 2 ký tự)"
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                />
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </form>

            {/* Menu Popover kết quả tìm kiếm */}
            {isSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden z-50 text-xs animate-in fade-in max-h-96 flex flex-col">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Kết quả tra cứu ({searchResults.length})</span>
                  {searchQuery && <span className="font-mono text-blue-600">"{searchQuery}"</span>}
                </div>

                <div className="overflow-y-auto p-1.5 divide-y divide-slate-100 max-h-80">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectIncident(item.id)}
                        className="p-2.5 rounded-md hover:bg-blue-50/50 cursor-pointer transition-colors flex items-start gap-2.5 group"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded object-cover bg-slate-100 shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-semibold text-blue-700 text-[11px]">
                              {item.ticketCode}
                            </span>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="font-medium text-slate-800 text-xs truncate mt-0.5 group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </p>
                          {item.address && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.address}</span>
                            </p>
                          )}
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0 mt-1" />
                      </div>
                    ))
                  ) : !isSearching && searchQuery.trim().length >= 2 ? (
                    <div className="p-6 text-center text-slate-500">
                      <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                      <p className="font-medium text-slate-700">Không tìm thấy sự cố nào</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Thử tìm bằng mã phiếu (ví dụ: INC-...), tên đường hoặc địa chỉ.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-[11px]">
                      Nhập ít nhất 2 ký tự để tìm kiếm sự cố...
                    </div>
                  )}
                </div>

                <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Nhấn Enter để mở hồ sơ đầu tiên</span>
                  <span className="font-mono">ESC để đóng</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Bên Phải: Nút Tìm Mobile, Trạng thái trực tuyến, Thông báo, Tài khoản */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Nút tìm kiếm trên Mobile */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
            title="Tìm kiếm sự cố"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Đồng hồ Ngày Giờ Hệ Thống Thời Gian Thực */}
          {(() => {
            const formatted = formatCurrentTime(currentTime);
            return (
              <div
                className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs"
                title="Thời gian thực hệ thống RoadVision AI"
              >
                <div className="flex items-center gap-1.5 text-blue-700 font-mono font-bold tracking-tight">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{formatted.time}</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{formatted.date}</span>
                </div>
              </div>
            );
          })()}

          {/* Chuông thông báo Real-time WebSocket */}
          <div className="relative">
            <button
              onClick={() => setIsNotiOpen(!isNotiOpen)}
              className="relative w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
              title="Thông báo hệ thống thời gian thực"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Danh sách thông báo */}
            {isNotiOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsNotiOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden animate-in fade-in flex flex-col max-h-[500px]">
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-slate-900">Thông báo</h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                          {unreadCount} mới
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium" title="Đã kết nối máy chủ WebSocket">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Trực tuyến
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium" title="Đang thử kết nối lại">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Ngoại tuyến
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium ml-1 cursor-pointer"
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body - Danh sách thông báo */}
                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Bell className="w-8 h-8 opacity-40 text-slate-300" />
                        <span className="text-xs">Chưa có thông báo nào</span>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!item.read) markAsRead(item.id);
                            if (item.incidentId) {
                              navigate(`/incidents/${item.incidentId}`);
                              setIsNotiOpen(false);
                            }
                          }}
                          className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer text-left ${
                            !item.read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            {item.type === 'URGENT' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                            {item.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                            {item.type === 'INFO' && <Info className="w-4 h-4 text-blue-600" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <h4 className={`text-xs font-semibold truncate ${!item.read ? 'text-slate-900' : 'text-slate-700'}`}>
                                {item.title}
                              </h4>
                              {!item.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Chưa đọc" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                              {item.message}
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                              <span>{formatTimeAgo(item.createdAt)}</span>
                              {item.ticketCode && (
                                <span className="text-blue-600 font-semibold">{item.ticketCode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Khối người dùng */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.fullName}
                    </span>
                    {user.role === 'ROLE_CITIZEN' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Điểm uy tín người dân">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        {user.reputationScore ?? 50}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded w-fit mt-0.5 ${getRoleBadge(user.role).className}`}>
                    {getRoleBadge(user.role).label}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Menu thả xuống của User */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-40 text-xs animate-in fade-in">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{user.fullName}</p>
                      <p className="text-slate-500 text-[11px] font-mono truncate">{user.phone || user.email}</p>
                      {user.role === 'ROLE_CITIZEN' && (
                        <div className="mt-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-md border border-amber-200/60 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-amber-900 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            Điểm uy tín
                          </span>
                          <span className="text-xs font-bold text-amber-700 bg-white/80 px-2 py-0.5 rounded shadow-xs">
                            {user.reputationScore ?? 50} / 100
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <UserCircle className="w-4 h-4 text-slate-400" />
                      <span>Thông tin tài khoản</span>
                    </button>
                    {(user.role === 'ROLE_CITIZEN' || user.role === 'ROLE_ADMIN') && (
                      <Link
                        to="/my-reports"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-slate-400" />
                        <span>Phản ánh của tôi</span>
                      </Link>
                    )}
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      {/* Thanh tìm kiếm mở rộng trên Mobile */}
      {isMobileSearchOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 p-3 shadow-md animate-in slide-in-from-top-2 z-20">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mã phiếu, địa chỉ, sự cố..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          {searchResults.length > 0 && (
            <div className="mt-2 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectIncident(item.id)}
                  className="py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 px-1 rounded"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-mono font-semibold text-blue-600">{item.ticketCode}</span>
                    <p className="truncate text-slate-800 font-medium">{item.title}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal đăng nhập / đăng ký / đổi mật khẩu */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};