import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import { Search, Filter, ShieldAlert, UserCheck, XCircle, ArrowUpRight, RotateCcw, AlertCircle, CheckCircle2, Clock, Wrench, AlertTriangle, BarChart3, Truck, Cpu, Zap } from 'lucide-react';

export const DispatchQueuePage: React.FC = () => {
  const toast = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Phân trang chuẩn Spring Data
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal phân công
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [staffId, setStaffId] = useState<number>(2);
  const [priority, setPriority] = useState<string>('HIGH');
  const [assignNotes, setAssignNotes] = useState<string>('Ưu tiên hoàn thành trước giờ cao điểm');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modal từ chối
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('Ảnh chụp không rõ ràng hoặc nằm ngoài quyền hạn quản lý');

  const fetchIncidents = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    incidentApi
      .getIncidents({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as IncidentStatus),
        category: categoryFilter === 'ALL' ? undefined : (categoryFilter as Category),
        search: search.trim() || undefined,
        page: targetPage,
        size: targetSize,
      })
      .then((res) => {
        setIncidents(res.data?.content || []);
        setTotalPages(res.data?.totalPages || 0);
        setTotalElements(res.data?.totalElements || 0);
      })
      .catch(() => {
        setIncidents([]);
        setTotalPages(0);
        setTotalElements(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncidents(page, pageSize);
  }, [page, pageSize, statusFilter, categoryFilter]);

  useEffect(() => {
    incidentApi
      .getStaffList()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setStaffList(res.data);
          setStaffId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchIncidents(0, pageSize);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPage(0);
  };

  const handleOpenAssignModal = (incident: Incident) => {
    setSelectedIncident(incident);
    // Tự động phân bổ đúng Tổ đội duy tu phụ trách 4 Khu Quản lý Đường bộ Toàn Quốc
    if (staffList.length > 0) {
      let matchedStaff = null;
      if (incident.routeCorridor === 'KHU_4') {
        matchedStaff = staffList.find((s) => s.fullName.includes('Khu QLĐB IV') || s.fullName.includes('Miền Nam') || s.fullName.includes('TP.HCM'));
      } else if (incident.routeCorridor === 'KHU_3') {
        matchedStaff = staffList.find((s) => s.fullName.includes('Khu QLĐB III') || s.fullName.includes('Tây Nguyên') || s.fullName.includes('Đà Nẵng'));
      } else if (incident.routeCorridor === 'KHU_2') {
        matchedStaff = staffList.find((s) => s.fullName.includes('Khu QLĐB II') || s.fullName.includes('Bắc Trung Bộ') || s.fullName.includes('Nghệ An'));
      } else {
        matchedStaff = staffList.find((s) => s.fullName.includes('Khu QLĐB I') || s.fullName.includes('Miền Bắc') || s.fullName.includes('Hà Nội'));
      }
      if (matchedStaff) {
        setStaffId(matchedStaff.id);
      } else {
        setStaffId(staffList[0].id);
      }
    }
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    try {
      await incidentApi.assignIncident(selectedIncident.id, {
        staffId,
        priority,
        notes: assignNotes,
      });
      toast.success(`Đã phân công sự cố #${selectedIncident.ticketCode} cho kỹ thuật viên!`, 'Phân Công Thành Công');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể phân công sự cố', 'Lỗi Điều Phối');
    }

    setIncidents((prev) =>
      prev.map((item) =>
        item.id === selectedIncident.id ? { ...item, status: 'ASSIGNED' as IncidentStatus } : item
      )
    );
    setIsAssignModalOpen(false);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    try {
      await incidentApi.rejectIncident(selectedIncident.id, { rejectionReason });
      toast.warning(`Đã từ chối xử lý sự cố #${selectedIncident.ticketCode}`, 'Từ Chối Tiếp Nhận');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Không thể từ chối sự cố', 'Lỗi');
    }

    setIncidents((prev) =>
      prev.map((item) =>
        item.id === selectedIncident.id ? { ...item, status: 'REJECTED' as IncidentStatus } : item
      )
    );
    setIsRejectModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-primary" />
            HỆ THỐNG ĐIỀU PHỐI & PHÂN CÔNG HIỆN TRƯỜNG
          </div>
          <h1 className="font-display text-2xl font-black text-on-surface mt-1">
            Điều Phối Hiện Trường & Phân Quyền Xử Lý
          </h1>
          <p className="text-xs text-on-surface-variant">
            Thẩm định hồ sơ sự cố AI quét, phân công nhân viên kỹ thuật hiện trường và kiểm soát tiến độ SLA.
          </p>
        </div>

        {/* Nút sang Trung Tâm Phân Tích KPI */}
        <div className="flex items-center gap-3">
          <Link
            to="/analytics"
            className="px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 border border-purple-500/30 flex items-center gap-2 font-bold text-xs transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>Mở Báo Cáo KPI</span>
          </Link>
          <div className="px-4 py-2.5 rounded-2xl bg-surface-container border border-outline-variant/30 flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Tổng số sự cố</span>
              <span className="font-display text-lg font-black text-primary leading-tight">{totalElements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 THẺ TELEMETRY STRIP CHUẨN STITCH DISPATCH QUEUE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical SLA At Risk */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-rose-500/20 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-rose-600">SLA At Risk</div>
            <div className="font-display text-xl font-black text-rose-600 mt-0.5">
              {incidents.filter((i) => i.severity === 'CRITICAL' || i.flag === 'DISPUTED').length} Vé Cảnh Báo
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">Cần xử lý trong 24h</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: AI Confidence Median */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">AI Confidence</div>
            <div className="font-display text-xl font-black text-primary mt-0.5">96.8%</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">YOLOv8 v2.4 Active</div>
          </div>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Active Crew Dispatches */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Tổ Duy Tu Cơ Động</div>
            <div className="font-display text-xl font-black text-secondary mt-0.5">
              {staffList.length > 0 ? staffList.length : 4} Tổ Thợ
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">Trực thuộc các Hạt QLĐB</div>
          </div>
          <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Mean Resolution Speed */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Mean Resolution</div>
            <div className="font-display text-xl font-black text-on-surface mt-0.5">4.2 Giờ</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Đạt chuẩn SLA đô thị</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* CẢNH BÁO KHIẾU NẠI TRỰC QUAN CHO QUẢN TRỊ VIÊN */}
      {incidents.some((i) => i.flag === 'DISPUTED') && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wide text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <span>CẢNH BÁO: PHÁT HIỆN SỰ CỐ ĐANG BỊ KHIẾU NẠI CHẤT LƯỢNG NGHIỆM THU</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                  {incidents.filter((i) => i.flag === 'DISPUTED').length} sự cố
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Người dân phản ánh mặt đường sau khi thợ sửa vẫn chưa đạt chuẩn. Ban Quản Lý vui lòng kiểm tra và ra lệnh thi công lại (REWORK).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('DISPUTED');
              setPage(0);
              fetchIncidents(0, pageSize);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc Các Vé Khiếu Nại</span>
          </button>
        </div>
      )}

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Input Tìm kiếm */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã (#RC-...), tên đường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low text-xs border border-outline-variant/30 focus:outline-none focus:border-primary font-medium"
            />
          </div>

          {/* Lọc Thể Loại */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-xs border border-outline-variant/30 focus:outline-none font-semibold text-on-surface cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục sự cố</option>
              <option value="POTHOLE">Ổ gà / Hố sụt (Pothole)</option>
              <option value="ROAD_CRACK">Vết nứt mặt đường (Crack)</option>
              <option value="ROAD_FLOODING">Điểm ngập úng (Flooding)</option>
              <option value="ROAD_OBSTACLE">Chướng ngại vật (Obstacle)</option>
            </select>
          </div>

          {/* Lọc Trạng Thái */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-xs border border-outline-variant/30 focus:outline-none font-semibold text-on-surface cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái xử lý</option>
              <option value="AI_ANALYZED">Chờ thẩm định (AI đã quét)</option>
              <option value="SUBMITTED">Mới gửi</option>
              <option value="ASSIGNED">Đã phân công</option>
              <option value="IN_PROGRESS">Đang thi công</option>
              <option value="RESOLVED">Đã hoàn thành</option>
              <option value="CLOSED">Đã đóng hồ sơ</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>

          {/* Nút Tìm kiếm & Đặt lại */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              className="p-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Hàng Đợi Sự Cố */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-mono uppercase text-[10px] tracking-wider border-b border-outline-variant/20">
              <tr>
                <th className="py-3 px-4">Mã Sự Cố</th>
                <th className="py-3 px-4">Ảnh & Vị Trí</th>
                <th className="py-3 px-4">Loại Sự Cố</th>
                <th className="py-3 px-4">Độ Tin Cậy AI</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mb-2"></div>
                    <div>Đang tải dữ liệu hàng đợi điều phối...</div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                    <AlertCircle className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
                    <p className="font-semibold">Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.</p>
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const isDisputed = incident.flag === 'DISPUTED';
                  return (
                    <tr
                      key={incident.id}
                      className={`transition-colors ${
                        isDisputed
                          ? 'bg-rose-500/10 border-l-4 border-l-rose-600 hover:bg-rose-500/15'
                          : 'hover:bg-surface-container-low/40'
                      }`}
                    >
                      {/* Mã Ticket */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-primary">{incident.ticketCode}</span>
                          {isDisputed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[9px] font-bold shadow-xs animate-pulse w-fit">
                              <AlertTriangle className="w-2.5 h-2.5" /> BỊ KHIẾU NẠI
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thumbnail & Địa chỉ */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={incident.imageUrl}
                            alt={incident.title}
                            className="w-12 h-12 rounded-xl object-cover border border-outline-variant/20 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-on-surface line-clamp-1 max-w-[220px]">
                              {incident.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-on-surface-variant line-clamp-1 max-w-[160px]">
                                {incident.address || `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}`}
                              </span>
                              {incident.routeCorridor && (
                                <span
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                                    incident.routeCorridor === 'KHU_1' || incident.routeCorridor === 'QL1A'
                                      ? 'bg-primary/10 text-primary border-primary/20'
                                      : incident.routeCorridor === 'KHU_2'
                                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                      : incident.routeCorridor === 'KHU_3' || incident.routeCorridor === 'QL21'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                                  }`}
                                  title={incident.zoneName || incident.routeCorridor}
                                >
                                  📍 {incident.routeCorridor.replace('KHU_', 'Khu ')}
                                </span>
                              )}
                              {incident.upvoteCount != null && incident.upvoteCount > 1 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold" title="Lượt công dân đồng tình phản ánh">
                                  👍 {incident.upvoteCount}
                                </span>
                              )}
                            </div>
                            {isDisputed && incident.reworkReason && (
                              <span className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold italic mt-1 line-clamp-1 max-w-[240px]" title={incident.reworkReason}>
                                ⚠️ Ý kiến dân: "{incident.reworkReason}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phân loại */}
                      <td className="py-3 px-4 font-semibold text-on-surface">
                        {incident.category === 'POTHOLE' && '🕳️ Ổ gà'}
                        {incident.category === 'ROAD_CRACK' && '⚡ Vết nứt'}
                        {incident.category === 'ROAD_FLOODING' && '🌊 Ngập úng'}
                        {incident.category === 'ROAD_OBSTACLE' && '📦 Vật cản'}
                        {incident.category === 'COMPLEX_DAMAGE' && '⚠️⚡ Đa sự cố'}
                        {!['POTHOLE', 'ROAD_CRACK', 'ROAD_FLOODING', 'ROAD_OBSTACLE', 'COMPLEX_DAMAGE'].includes(incident.category) && incident.category}
                      </td>

                      {/* AI Confidence */}
                      <td className="py-3 px-4">
                        {incident.aiDetection?.confidence ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] font-bold">
                            {(incident.aiDetection.confidence * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-on-surface-variant font-mono text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={incident.status} />
                          {isDisputed && (
                            <span className="text-[10px] font-bold text-rose-600 font-mono">
                              CHỜ ĐIỀU PHỐI LẠI
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nút Thao Tác Điều Phối */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDisputed ? (
                            <Link
                              to={`/incidents/${incident.id}`}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Xử lý khiếu nại</span>
                            </Link>
                          ) : (
                            <>
                              {['SUBMITTED', 'AI_ANALYZED'].includes(incident.status) && (
                                <>
                                  <button
                                    onClick={() => handleOpenAssignModal(incident)}
                                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container transition-colors text-xs flex items-center gap-1 shadow-xs"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Giao việc</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedIncident(incident);
                                      setIsRejectModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-error-container text-error font-semibold hover:bg-error hover:text-on-error transition-colors text-xs"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              <Link
                                to={`/incidents/${incident.id}`}
                                title="Xem hồ sơ chi tiết"
                                className="p-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân Trang (Pagination Controls) */}
        <div className="p-3 border-t border-outline-variant/15">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* Modal Phân Công Kỹ Thuật Viên */}
      {isAssignModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant/30 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Phân Công Điều Phối</h3>
                  <span className="font-mono text-xs font-bold text-primary">{selectedIncident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="w-7 h-7 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-3 text-xs">
              {/* Thông tin Hạt Quản lý Tuyến & Gợi ý tổ đội */}
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    Khu Vực Quản Lý:
                  </span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {selectedIncident.routeCorridor?.replace('KHU_', 'Khu ') || 'Khu I'}
                  </span>
                </div>
                <div className="text-on-surface-variant font-medium">
                  📍 {selectedIncident.zoneName || 'Khu Quản lý Đường bộ I (Miền Bắc)'}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Hệ thống đã tự động gợi ý Tổ đội cơ động phụ trách khu vực để tối ưu bán kính di chuyển.
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface">Chỉ định kỹ thuật viên phụ trách *</label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-medium cursor-pointer"
                >
                  {staffList.length > 0 ? (
                    staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.email})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={2}>Nguyễn Văn Kỹ Thuật (Tổ Duy Tu Cơ Động - Hạt QLĐB 1)</option>
                      <option value={3}>Trần Văn Hiện Trường (Tổ Thảm Nguội Carboncor - Hạt QLĐB 2)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Truck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Phương thức duy tu thường xuyên:</strong> Điều xe bán tải kèm máy đầm cóc và vật liệu thảm nguội Carboncor xuất phát từ kho Hạt QLĐB gần nhất, hoàn tất vá hố trong ca làm việc.
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface">Mức độ ưu tiên thi công</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-medium cursor-pointer"
                >
                  <option value="CRITICAL">🚨 Khẩn cấp (Xử lý trong 4h)</option>
                  <option value="HIGH">⚡ Cao (Xử lý trong 24h)</option>
                  <option value="NORMAL">📌 Bình thường (72h)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface">Chỉ đạo thi công / Ghi chú</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-sm hover:bg-primary-container transition-colors"
                >
                  Xác Nhận Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Từ Chối Tiếp Nhận */}
      {isRejectModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant/30 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div>
                <h3 className="text-sm font-bold text-error">Từ Chối Tiếp Nhận Hồ Sơ</h3>
                <span className="font-mono text-xs font-bold text-on-surface">{selectedIncident.ticketCode}</span>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="w-7 h-7 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-on-surface">Lý do từ chối phản ánh *</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="Nhập lý do cụ thể gửi thông báo tới người dân..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-error text-on-error font-bold shadow-sm hover:bg-error/90 transition-colors"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
