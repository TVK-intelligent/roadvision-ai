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
  X,
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
  const [proofNotes, setProofNotes] = useState<string>('');
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
      toast.info('Đã chuyển trạng thái sang Đang thi công!', 'Bắt đầu xử lý');
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
      const res = await incidentApi.resolveIncident(selectedTask.id, formData);
      const updated = res.data;
      if (updated.resolution?.aiVerificationStatus === 'AI_VERIFIED_CLEAN') {
        toast.success(
          `AI đã thẩm định đạt chuẩn: Mặt đường đã được hoàn trả phẳng phiu!`,
          'Nghiệm thu đạt chuẩn'
        );
      } else if (updated.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS') {
        toast.warning(
          updated.resolution.aiVerificationNotes || 'Cảnh báo: Phát hiện dấu hiệu hư hỏng còn sót lại!',
          'Cảnh báo kiểm định'
        );
      } else {
        toast.success(`Đã nộp báo cáo nghiệm thu cho sự cố #${selectedTask.ticketCode}!`, 'Thành công');
      }

      fetchTasks(page, pageSize);
      setSelectedTask(null);
      setProofFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi báo cáo nghiệm thu', 'Lỗi');
      setErrorMessage(err.response?.data?.message || 'Có lỗi xảy ra khi nộp hồ sơ');
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
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>Nhiệm vụ kỹ thuật hiện trường</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Quản lý nhiệm vụ thi công
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách các sự cố mặt đường được phân công trực tiếp cho tổ kỹ thuật tiếp nhận, thi công và nghiệm thu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-md bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="text-xs text-slate-500">Tổng nhiệm vụ:</span>
            <span className="text-sm font-bold text-slate-900 leading-none">{totalElements}</span>
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
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              filter === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Danh Sách Thẻ Nhiệm Vụ */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
          <div className="text-xs font-medium">Đang tải danh sách nhiệm vụ được giao...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-lg border border-slate-200 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-900">Không có nhiệm vụ nào trong mục này</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Tất cả sự cố được giao đã được xử lý hoặc chưa có nhiệm vụ mới nào phát sinh.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex gap-4">
                  <img
                    src={task.imageUrl}
                    alt={task.title}
                    className="w-20 h-20 rounded-md object-cover shrink-0 border border-slate-200"
                  />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-blue-700">{task.ticketCode}</span>
                      <StatusBadge status={task.status} />
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{task.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{task.address || `${task.latitude?.toFixed(4)}, ${task.longitude?.toFixed(4)}`}</span>
                    </div>
                  </div>
                </div>

                {/* Cảnh báo yêu cầu thi công lại nếu có */}
                {task.reworkCount && task.reworkCount > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-md text-xs flex flex-col gap-1">
                    <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Yêu cầu thi công lại (Lần #{task.reworkCount})</span>
                    </div>
                    {task.reworkReason && (
                      <p className="text-slate-600 italic">"{task.reworkReason}"</p>
                    )}
                  </div>
                )}

                {/* Thao tác kỹ thuật */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('vi-VN') : 'Mới giao'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartWork(task.id)}
                        className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Bắt đầu thi công</span>
                      </button>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Nộp nghiệm thu</span>
                      </button>
                    )}

                    <Link
                      to={`/incidents/${task.id}`}
                      className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      title="Xem chi tiết hồ sơ"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Phân trang */}
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

      {/* Modal Nộp Nghiệm Thu */}
      {selectedTask && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Nộp báo cáo nghiệm thu hiện trường</span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-md flex flex-col gap-1 border border-slate-200">
                <div className="font-semibold text-slate-900">
                  {selectedTask.ticketCode} - {selectedTask.title}
                </div>
                <div className="text-slate-500">{selectedTask.address}</div>
              </div>

              {selectedTask.reworkReason && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Lệnh tái thi công:</span>
                  </div>
                  <p className="italic">"{selectedTask.reworkReason}"</p>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Ảnh chụp sau khi hoàn tất sửa chữa *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Biên bản kỹ thuật & vật liệu sử dụng
                </label>
                <textarea
                  rows={3}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-900"
                  placeholder="Ghi chú quy trình thi công, vật liệu hoàn trả..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProof}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isSubmittingProof ? 'Đang gửi...' : 'Xác nhận nghiệm thu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
