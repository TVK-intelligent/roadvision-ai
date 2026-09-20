import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import {
  Wrench,
  Hammer,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Upload,
  AlertCircle,
  FileCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const StaffTasksPage: React.FC = () => {
  const toast = useToast();
  const [tasks, setTasks] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('ALL');

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal nộp nghiệm thu
  const [selectedTask, setSelectedTask] = useState<Incident | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState<string>('Đã cắt mép, vệ sinh hố sụt, quét nhũ tương và đầm nén bê tông nhựa C9.5.');
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTasks = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    incidentApi
      .getAssignedToMe(targetPage, targetSize)
      .then((res) => {
        if (res.data?.content) {
          setTasks(res.data.content);
          setTotalPages(res.data.totalPages || 0);
          setTotalElements(res.data.totalElements || 0);
        }
      })
      .catch((err) => {
        console.warn('Lỗi lấy danh sách nhiệm vụ kỹ thuật:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks(page, pageSize);
  }, [page, pageSize]);

  const handleStartWork = async (taskId: number) => {
    try {
      await incidentApi.updateStatus(taskId, 'IN_PROGRESS');
      toast.info('Đã chuyển trạng thái sang Đang thi công!', 'Bắt Đầu Xử Lý');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'IN_PROGRESS' as IncidentStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái', 'Lỗi');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !proofFile) {
      toast.warning('Vui lòng chọn ảnh chụp hiện trường đã sửa chữa');
      setErrorMessage('Vui lòng chọn ảnh chụp hiện trường đã sửa chữa');
      return;
    }

    setIsSubmittingProof(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('proofImage', proofFile);
    formData.append('notes', proofNotes);

    try {
      await incidentApi.resolveIncident(selectedTask.id, formData);
      toast.success(`Đã nộp ảnh nghiệm thu sự cố #${selectedTask.ticketCode}!`, 'Nghiệm Thu Thành Công');
      setSelectedTask(null);
      setProofFile(null);
      fetchTasks(page, pageSize);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi nộp ảnh nghiệm thu';
      setErrorMessage(msg);
      toast.error(msg, 'Lỗi Nghiệm Thu');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ASSIGNED') return t.status === 'ASSIGNED';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'DONE') return t.status === 'RESOLVED' || t.status === 'CLOSED';
    return true;
  });

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-secondary font-mono text-xs font-bold uppercase tracking-wider">
            <Wrench className="w-4 h-4" />
            FIELD CREW WORKSPACE • PHA 4 TRIỂN KHAI THI CÔNG
          </div>
          <h1 className="font-display text-2xl font-black text-on-surface mt-1">
            Nhiệm Vụ Kỹ Thuật Hiện Trường
          </h1>
          <p className="text-xs text-on-surface-variant">
            Danh sách sự cố được Ban Điều Phối chỉ định cho đội kỹ thuật xử lý và nghiệm thu số.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-surface-container border border-outline-variant/30 flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-mono">Tổng nhiệm vụ:</span>
            <span className="font-display text-base font-black text-primary">{totalElements}</span>
          </div>
        </div>
      </div>

      {/* Thanh Lọc Trạng Thái Phân Việc */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Tất cả nhiệm vụ', count: tasks.length },
          { id: 'ASSIGNED', label: 'Được giao mới', count: tasks.filter((t) => t.status === 'ASSIGNED').length },
          { id: 'IN_PROGRESS', label: 'Đang thi công', count: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
          { id: 'DONE', label: 'Đã hoàn thành', count: tasks.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              filter === tab.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Danh Sách Thẻ Nhiệm Vụ */}
      {loading ? (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mb-2"></div>
          <div className="text-xs font-medium">Đang tải danh sách nhiệm vụ được giao...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 px-4 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500/60" />
          <h3 className="font-bold text-base text-on-surface">Không có nhiệm vụ nào trong mục này</h3>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Tất cả sự cố được giao đã được xử lý hoặc chưa có sự cố mới nào được phân công.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all hover:border-outline-variant/60"
              >
                <div className="flex gap-4">
                  <img
                    src={task.imageUrl}
                    alt={task.title}
                    className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-outline-variant/20 shadow-xs"
                  />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary">{task.ticketCode}</span>
                      <StatusBadge status={task.status} />
                    </div>
                    <h3 className="font-bold text-sm text-on-surface line-clamp-1">{task.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span>{task.address || `${task.latitude?.toFixed(4)}, ${task.longitude?.toFixed(4)}`}</span>
                    </div>
                    {task.aiDetection?.confidence && (
                      <div className="text-[11px] text-on-surface-variant font-mono">
                        AI Tin Cậy: <strong className="text-primary font-bold">{(task.aiDetection.confidence * 100).toFixed(1)}%</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chân Thẻ & Thao Tác Trạng Thái */}
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15 text-xs">
                  <Link
                    to={`/incidents/${task.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span>Xem hồ sơ</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    {task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartWork(task.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs hover:bg-primary-container flex items-center gap-1.5 transition-colors"
                      >
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Đến Hiện Trường</span>
                      </button>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setErrorMessage(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-secondary text-on-primary font-bold text-xs shadow-xs hover:bg-secondary/90 flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Nộp Nghiệm Thu</span>
                      </button>
                    )}

                    {(task.status === 'RESOLVED' || task.status === 'CLOSED') && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đã Hoàn Thành</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Phân Trang */}
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
        </>
      )}

      {/* Modal Nộp Nghiệm Thu (Proof of Work) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-3xl border border-outline-variant/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <FileCheck className="w-5 h-5" />
                <span>Nộp Bằng Chứng Nghiệm Thu (Proof of Work)</span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-7 h-7 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 flex flex-col gap-4">
              <div className="bg-surface-container-low p-3.5 rounded-2xl text-xs flex flex-col gap-1 border border-outline-variant/20">
                <div className="font-bold text-on-surface">
                  {selectedTask.ticketCode} - {selectedTask.title}
                </div>
                <div className="text-on-surface-variant">{selectedTask.address}</div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-error-container text-error text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Ảnh Chụp Sau Khi Sửa Chữa Hiện Trường *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary/90 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Biên Bản Kỹ Thuật & Vật Liệu Sử Dụng
                </label>
                <textarea
                  rows={3}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:border-primary font-medium"
                  placeholder="Ghi chú quy trình đầm nén, loại nhựa, độ chặt..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProof}
                  className="px-5 py-2.5 rounded-xl bg-secondary text-on-primary text-xs font-bold shadow-xs hover:bg-secondary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {isSubmittingProof ? 'Đang tải lên...' : 'Xác Nhận Nghiệm Thu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
