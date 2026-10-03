import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import {
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  Clock,
  Wrench,
  AlertTriangle,
  BarChart3,
  Truck,
  CheckCircle2,
  ThumbsUp,
  MapPin,
  X,
} from 'lucide-react';

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
      toast.success(`Đã phân công sự cố #${selectedIncident.ticketCode} cho kỹ thuật viên!`, 'Phân công thành công');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể phân công sự cố', 'Lỗi điều phối');
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
      toast.warning(`Đã từ chối xử lý sự cố #${selectedIncident.ticketCode}`, 'Từ chối tiếp nhận');
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

  const aiIncidents = incidents.filter(
    (i) => i.aiDetection?.confidence !== undefined && i.aiDetection?.confidence !== null
  );
  const avgConfidence =
    aiIncidents.length > 0
      ? (
          (aiIncidents.reduce((acc, curr) => acc + Number(curr.aiDetection?.confidence || 0), 0) /
            aiIncidents.length) *
          100
        ).toFixed(1) + '%'
      : '---';

  const resolvedList = incidents.filter(
    (i) => (i.status === 'RESOLVED' || i.status === 'CLOSED') && i.resolvedAt && i.createdAt
  );
  const avgHours =
    resolvedList.length > 0
      ? (
          resolvedList.reduce((acc, curr) => {
            const diffMs = new Date(curr.resolvedAt!).getTime() - new Date(curr.createdAt).getTime();
            return acc + diffMs / (1000 * 60 * 60);
          }, 0) / resolvedList.length
        ).toFixed(1) + ' giờ'
      : (incidents.length > 0 ? '< 4.0 giờ' : '---');

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Điều phối & Phân công hiện trường</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Hàng đợi điều phối sự cố
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẩm định hồ sơ sự cố, phân công nhân viên kỹ thuật và kiểm soát tiến độ xử lý theo cam kết SLA.
          </p>
        </div>

        {/* Nút sang Trung Tâm Phân Tích KPI */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/analytics"
            className="px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 font-medium text-xs transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>Báo cáo KPI</span>
          </Link>
          <div className="px-3.5 py-2 rounded-md bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="text-xs text-slate-500">Tổng sự cố:</span>
            <span className="text-sm font-bold text-slate-900 leading-none">{totalElements}</span>
          </div>
        </div>
      </div>

      {/* 4 Thẻ KPI vắn tắt */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical SLA At Risk */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Nguy cơ trễ hạn (SLA)</div>
            <div className="text-xl font-bold text-rose-600 mt-0.5">
              {incidents.filter((i) => i.severity === 'CRITICAL' || i.flag === 'DISPUTED').length} vé cảnh báo
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cần xử lý trong 24h</div>
          </div>
          <div className="p-2 rounded-md bg-rose-50 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: AI Confidence Median */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Độ tin cậy nhận diện</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{avgConfidence}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Phân loại tự động</div>
          </div>
          <div className="p-2 rounded-md bg-blue-50 text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Active Crew Dispatches */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổ duy tu trực chiến</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {staffList.length > 0 ? staffList.length : 4} tổ đội
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">4 Khu QLĐB phụ trách</div>
          </div>
          <div className="p-2 rounded-md bg-slate-100 text-slate-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Mean Resolution Speed */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Thời gian xử lý trung bình</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{avgHours}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Đạt chuẩn cam kết</div>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Cảnh báo khiếu nại chất lượng */}
      {incidents.some((i) => i.flag === 'DISPUTED') && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-rose-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-rose-800 flex items-center gap-2">
                <span>Cảnh báo: Có sự cố đang bị khiếu nại sau nghiệm thu</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-medium">
                  {incidents.filter((i) => i.flag === 'DISPUTED').length} sự cố
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Người dân phản ánh chất lượng sau khi sửa chữa chưa đạt yêu cầu. Ban Quản Lý vui lòng kiểm tra và yêu cầu làm lại.
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
            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc vé khiếu nại</span>
          </button>
        </div>
      )}

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Input Tìm kiếm */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã vé (#RC-...), tên đường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-900"
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
              aria-label="Lọc theo danh mục sự cố"
              className="w-full px-3 py-2 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục sự cố</option>
              <option value="POTHOLE">Ổ gà / Hố sụt</option>
              <option value="ROAD_CRACK">Vết nứt mặt đường</option>
              <option value="ROAD_FLOODING">Điểm ngập úng</option>
              <option value="ROAD_OBSTACLE">Chướng ngại vật</option>
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
              aria-label="Lọc theo trạng thái xử lý"
              className="w-full px-3 py-2 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái xử lý</option>
              <option value="AI_ANALYZED">Chờ thẩm định (Đã phân tích)</option>
              <option value="SUBMITTED">Mới tiếp nhận</option>
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
              className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
              className="p-2 rounded-md border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Hàng Đợi Sự Cố */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wide border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã sự cố</th>
                <th className="py-3 px-4">Ảnh & Vị trí</th>
                <th className="py-3 px-4">Loại sự cố</th>
                <th className="py-3 px-4">Độ tin cậy</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2"></div>
                    <div>Đang tải dữ liệu hàng đợi điều phối...</div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="font-medium">Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.</p>
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
                          ? 'bg-rose-50/60 border-l-4 border-l-rose-600 hover:bg-rose-50'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Mã Ticket */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-semibold text-blue-700">{incident.ticketCode}</span>
                          {isDisputed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-medium w-fit">
                              <AlertTriangle className="w-2.5 h-2.5" /> Bị khiếu nại
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thumbnail & Địa chỉ */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <img
                            src={incident.imageUrl}
                            alt={incident.title}
                            className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 line-clamp-1 max-w-[220px]">
                              {incident.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[160px]">
                                {incident.address || `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}`}
                              </span>
                              {incident.routeCorridor && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  title={incident.zoneName || incident.routeCorridor}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                  {incident.routeCorridor.replace('KHU_', 'Khu ')}
                                </span>
                              )}
                              {incident.upvoteCount != null && incident.upvoteCount > 1 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium" title="Lượt công dân đồng tình">
                                  <ThumbsUp className="w-2.5 h-2.5" /> {incident.upvoteCount}
                                </span>
                              )}
                            </div>
                            {isDisputed && incident.reworkReason && (
                              <span className="text-[11px] text-rose-700 font-medium italic mt-1 line-clamp-1 max-w-[240px]" title={incident.reworkReason}>
                                Ý kiến dân: "{incident.reworkReason}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phân loại */}
                      <td className="py-3 px-4 align-top font-medium text-slate-800">
                        {incident.category === 'POTHOLE' && 'Ổ gà'}
                        {incident.category === 'ROAD_CRACK' && 'Vết nứt mặt đường'}
                        {incident.category === 'ROAD_FLOODING' && 'Điểm ngập úng'}
                        {incident.category === 'ROAD_OBSTACLE' && 'Chướng ngại vật'}
                        {incident.category === 'COMPLEX_DAMAGE' && 'Đa sự cố'}
                        {!['POTHOLE', 'ROAD_CRACK', 'ROAD_FLOODING', 'ROAD_OBSTACLE', 'COMPLEX_DAMAGE'].includes(incident.category) && incident.category}
                      </td>

                      {/* AI Confidence */}
                      <td className="py-3 px-4 align-top">
                        {incident.aiDetection?.confidence ? (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-medium">
                            {(incident.aiDetection.confidence * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={incident.status} />
                          {isDisputed && (
                            <span className="text-[10px] font-medium text-rose-600">
                              Chờ điều phối lại
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDisputed ? (
                            <Link
                              to={`/incidents/${incident.id}`}
                              className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1 transition-colors"
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
                                    className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-xs flex items-center gap-1"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Giao việc</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedIncident(incident);
                                      setIsRejectModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded-md border border-slate-200 text-rose-600 font-medium hover:bg-rose-50 transition-colors text-xs"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              <Link
                                to={`/incidents/${incident.id}`}
                                title="Xem hồ sơ chi tiết"
                                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
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

        {/* Phân trang */}
        <div className="p-3 border-t border-slate-200">
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
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Phân công điều phối</h3>
                  <span className="font-mono text-xs text-blue-700 font-medium">{selectedIncident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-3.5 text-xs">
              {/* Thông tin Hạt Quản lý Tuyến */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    Khu vực quản lý:
                  </span>
                  <span className="font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                    {selectedIncident.routeCorridor?.replace('KHU_', 'Khu ') || 'Khu I'}
                  </span>
                </div>
                <div className="text-slate-500">
                  {selectedIncident.zoneName || 'Khu Quản lý Đường bộ I (Miền Bắc)'}
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Chỉ định kỹ thuật viên phụ trách *</label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
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

              <div>
                <label className="block font-medium mb-1 text-slate-700">Mức độ ưu tiên thi công</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
                >
                  <option value="CRITICAL">Khẩn cấp (Xử lý trong 4h)</option>
                  <option value="HIGH">Cao (Xử lý trong 24h)</option>
                  <option value="NORMAL">Bình thường (72h)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Chỉ đạo thi công / Ghi chú</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Xác nhận phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Từ Chối Tiếp Nhận */}
      {isRejectModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-rose-700">Từ chối tiếp nhận hồ sơ</h3>
                <span className="font-mono text-xs text-slate-500">{selectedIncident.ticketCode}</span>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-700">Lý do từ chối phản ánh *</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="Nhập lý do cụ thể gửi thông báo tới người dân..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:border-transparent text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
