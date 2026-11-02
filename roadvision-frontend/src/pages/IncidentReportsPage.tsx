import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category, Severity } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Video,
  User,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  HardHat,
  Compass,
  Layers,
  ArrowUpRight,
  Copy,
  Calendar,
} from 'lucide-react';

const CATEGORY_NAMES: Record<Category, string> = {
  POTHOLE: 'Ổ gà mặt đường',
  ROAD_CRACK: 'Nứt mặt đường',
  ROAD_OBSTACLE: 'Vật cản giao thông',
  ROAD_FLOODING: 'Điểm ngập úng',
  COMPLEX_DAMAGE: 'Hư hỏng phức tạp',
  OTHER: 'Khác',
};

const SEVERITY_BADGES: Record<Severity, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', text: 'text-rose-400', label: 'Cực kỳ nghiêm trọng' },
  HIGH: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', text: 'text-amber-400', label: 'Nghiêm trọng' },
  MEDIUM: { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', text: 'text-yellow-400', label: 'Trung bình' },
  LOW: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', text: 'text-blue-400', label: 'Nhẹ' },
};

export const IncidentReportsPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'CITIZEN' | 'PATROL_AI'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(8);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  const fetchIncidents = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await incidentApi.getIncidents({
        page: targetPage,
        size: pageSize,
        search: searchTerm.trim() || undefined,
        category: categoryFilter !== 'ALL' ? (categoryFilter as Category) : undefined,
      });

      if (res.data) {
        setIncidents(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách báo cáo sự cố. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, categoryFilter, toast]);

  useEffect(() => {
    fetchIncidents(page);
  }, [page, categoryFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchIncidents(0);
  };

  // Helper determine source
  const isPatrolSource = (inc: Incident) => {
    const rep = (inc.reporterName || '').toLowerCase();
    const flag = (inc.flag || '').toLowerCase();
    const desc = (inc.description || '').toLowerCase();
    return (
      rep.includes('tuần tra') ||
      rep.includes('patrol') ||
      rep.includes('camera') ||
      flag.includes('patrol') ||
      desc.includes('tuần tra') ||
      desc.includes('video')
    );
  };

  // Client-side filtering by Source and Status
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Source filter
      if (sourceFilter === 'CITIZEN' && isPatrolSource(inc)) return false;
      if (sourceFilter === 'PATROL_AI' && !isPatrolSource(inc)) return false;

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'NEW' && !['SUBMITTED', 'AI_ANALYZED'].includes(inc.status)) return false;
        if (statusFilter === 'VERIFIED' && inc.status !== 'VERIFIED') return false;
        if (statusFilter === 'IN_ACTION' && !['INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED', 'ASSIGNED', 'IN_PROGRESS'].includes(inc.status)) return false;
        if (statusFilter === 'RESOLVED' && !['PENDING_ACCEPTANCE', 'RESOLVED', 'CLOSED'].includes(inc.status)) return false;
      }

      return true;
    });
  }, [incidents, sourceFilter, statusFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = totalElements || incidents.length;
    const patrolAiCount = incidents.filter(isPatrolSource).length;
    const citizenCount = Math.max(0, incidents.length - patrolAiCount);
    const resolvedCount = incidents.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status)).length;

    return { total, patrolAiCount, citizenCount, resolvedCount };
  }, [totalElements, incidents]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép: ${text}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner Nghiệp vụ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#192233] via-[#1f2b40] to-[#192233] p-6 rounded-2xl border border-slate-700/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <FileText className="w-4 h-4" />
            <span>Quản Lý Nghiệp Vụ • RoadVision AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Báo Cáo Sự Cố Mặt Đường
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Giám sát toàn bộ phản ánh hiện trường từ <strong className="text-slate-200">Người dân</strong> và <strong className="text-cyan-400">Camera AI Tuần tra hành trình</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchIncidents(page)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600/50 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Làm mới</span>
          </button>
          <Link
            to="/map"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Xem Bản Đồ GIS</span>
          </Link>
        </div>
      </div>

      {/* 2. Thẻ KPI Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#192233] p-4 rounded-xl border border-slate-700/50 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Tổng số sự cố</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-white">{stats.total}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Hồ sơ
            </span>
          </div>
        </div>

        <div className="bg-[#192233] p-4 rounded-xl border border-slate-700/50 flex flex-col">
          <span className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5" /> Camera AI Tuần tra
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-cyan-400">{stats.patrolAiCount}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800 font-mono">
              Tự động
            </span>
          </div>
        </div>

        <div className="bg-[#192233] p-4 rounded-xl border border-slate-700/50 flex flex-col">
          <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Người dân phản ánh
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-blue-400">{stats.citizenCount}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800 font-mono">
              Cộng đồng
            </span>
          </div>
        </div>

        <div className="bg-[#192233] p-4 rounded-xl border border-slate-700/50 flex flex-col">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-400">{stats.resolvedCount}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-mono">
              Nghiệm thu
            </span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Tìm Kiếm & Bộ Lọc Đa Tiêu Chí */}
      <div className="bg-[#192233] p-4 rounded-xl border border-slate-700/60 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Ô Tìm Kiếm */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu (#RC-...), tuyến đường, địa chỉ hoặc người báo cáo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111726] border border-slate-700 text-sm rounded-lg pl-10 pr-20 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Lọc Nguồn (Tất cả / Người dân / Camera AI) */}
          <div className="flex items-center gap-1 bg-[#111726] p-1 rounded-lg border border-slate-700 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSourceFilter('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                sourceFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả nguồn
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('PATROL_AI')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                sourceFilter === 'PATROL_AI'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Camera AI</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('CITIZEN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                sourceFilter === 'CITIZEN'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Người dân</span>
            </button>
          </div>
        </div>

        {/* Hàng lọc Phụ: Loại hư hại & Trạng thái */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Lọc trạng thái:
          </span>
          {[
            { id: 'ALL', label: 'Tất cả trạng thái' },
            { id: 'NEW', label: 'Mới tiếp nhận / AI phân tích' },
            { id: 'VERIFIED', label: 'Đã xác minh' },
            { id: 'IN_ACTION', label: 'Đang khảo sát & thi công' },
            { id: 'RESOLVED', label: 'Đã hoàn thành nghiệm thu' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === st.id
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              {st.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400 font-medium">Loại hư hại:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="bg-[#111726] border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="POTHOLE">Ổ gà mặt đường</option>
              <option value="ROAD_CRACK">Nứt mặt đường</option>
              <option value="ROAD_OBSTACLE">Vật cản giao thông</option>
              <option value="ROAD_FLOODING">Điểm ngập úng</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu Báo Cáo Sự Cố */}
      <div className="bg-[#192233] rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111726] border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Mã Phiếu & Thời Gian</th>
                <th className="py-3 px-4">Hình Ảnh Hiện Trường</th>
                <th className="py-3 px-4">Vị Trí & Tuyến Đường</th>
                <th className="py-3 px-4">Nguồn Tiếp Nhận</th>
                <th className="py-3 px-4">Loại Hư Hại & Mức Độ</th>
                <th className="py-3 px-4">Độ Tin Cậy AI</th>
                <th className="py-3 px-4">Trạng Thái Xử Lý</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCcw className="w-6 h-6 animate-spin text-blue-500" />
                      <span>Đang tải danh sách báo cáo sự cố...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-600" />
                      <span>Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isAiPatrol = isPatrolSource(inc);
                  const sevInfo = SEVERITY_BADGES[inc.severity] || SEVERITY_BADGES.MEDIUM;
                  const confidence = inc.aiDetection?.confidence
                    ? Math.round(inc.aiDetection.confidence * 100)
                    : 85;

                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Cột 1: Mã phiếu & ngày tạo */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                              {inc.ticketCode || `#RC-${inc.id}`}
                            </span>
                            <button
                              onClick={() => copyToClipboard(inc.ticketCode || `#RC-${inc.id}`)}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                              title="Sao chép mã phiếu"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ID #{inc.id}
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Ảnh thumbnail hiện trường */}
                      <td className="py-3.5 px-4">
                        <div className="relative w-16 h-12 rounded-lg bg-slate-950 overflow-hidden border border-slate-700/60 shrink-0">
                          {inc.imageUrl ? (
                            <img
                              src={inc.imageUrl}
                              alt={inc.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                              Không ảnh
                            </div>
                          )}
                          {isAiPatrol && (
                            <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-cyan-900/80 text-[8px] font-mono text-cyan-300">
                              AI
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Vị trí & Tuyến đường */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-200 truncate" title={inc.address}>
                            {inc.address || 'Chưa xác định địa chỉ chi tiết'}
                          </span>
                          {inc.routeCorridor && (
                            <span className="text-[11px] text-cyan-400 font-mono flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {inc.routeCorridor}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 4: Nguồn tiếp nhận (Người dân vs Camera AI) */}
                      <td className="py-3.5 px-4">
                        {isAiPatrol ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 text-[11px] font-medium">
                            <Video className="w-3 h-3 text-cyan-400" />
                            <span>Camera AI Tuần tra</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 text-[11px] font-medium">
                            <User className="w-3 h-3 text-indigo-400" />
                            <span>{inc.reporterName || 'Người dân'}</span>
                            {inc.reporterReputationScore !== undefined && (
                              <span className="text-[9px] px-1 rounded bg-indigo-900 font-mono text-amber-300">
                                {inc.reporterReputationScore}đ
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cột 5: Loại hư hại & Mức độ */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-semibold text-slate-200">
                            {CATEGORY_NAMES[inc.category] || inc.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sevInfo.bg}`}
                          >
                            {sevInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Cột 6: Độ tin cậy AI */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-blue-400">
                            {confidence}%
                          </span>
                        </div>
                      </td>

                      {/* Cột 7: Trạng thái hiện tại */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={inc.status} />
                      </td>

                      {/* Cột 8: Hành động */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all font-semibold text-xs shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
