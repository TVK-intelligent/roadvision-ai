import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import { Search, Filter, ShieldAlert, UserCheck, XCircle, ArrowUpRight, RotateCcw, AlertCircle, CheckCircle2, Clock, Wrench } from 'lucide-react';

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
          <div className="flex items-center gap-2 text-rose-600 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            ADMIN DISPATCH COMMAND • HÀNG ĐỢI ĐIỀU PHỐI TRUNG TÂM
          </div>
          <h1 className="font-display text-2xl font-black text-on-surface mt-1">
            Điều Phối Hiện Trường & Phân Quyền Xử Lý
          </h1>
          <p className="text-xs text-on-surface-variant">
            Thẩm định hồ sơ sự cố AI quét, phân công nhân viên kỹ thuật hiện trường và kiểm soát tiến độ SLA.
          </p>
        </div>

        {/* Tổng số sự cố */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-surface-container border border-outline-variant/30 flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Tổng số sự cố</span>
              <span className="font-display text-lg font-black text-primary leading-tight">{totalElements}</span>
            </div>
          </div>
        </div>
      </div>

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
              <option value="COMPLEX_DAMAGE">Hư hại phức hợp (Complex)</option>
              <option value="OTHER">Hư hại khác (Other)</option>
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
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-surface-container-low/40 transition-colors">
                    {/* Mã Ticket */}
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {incident.ticketCode}
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
                          <span className="text-[11px] text-on-surface-variant line-clamp-1 max-w-[220px]">
                            {incident.address || `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}`}
                          </span>
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
                      <StatusBadge status={incident.status} />
                    </td>

                    {/* Nút Thao Tác Điều Phối */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {['SUBMITTED', 'AI_ANALYZED'].includes(incident.status) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedIncident(incident);
                                setIsAssignModalOpen(true);
                              }}
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
                      </div>
                    </td>
                  </tr>
                ))
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
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
                      <option value={2}>Nguyễn Văn Kỹ Thuật (staff.nguyen@roadcare.gov.vn)</option>
                      <option value={3}>Trần Văn Hiện Trường (staff.tran@roadcare.gov.vn)</option>
                    </>
                  )}
                </select>
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
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
