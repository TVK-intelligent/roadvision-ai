import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, EvidenceStage } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import {
  Hammer,
  HardHat,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Upload,
  AlertCircle,
  MapPin,
  X,
  Camera,
  Send,
  Calendar,
  Sparkles,
  ShieldCheck,
  Eye,
  AlertTriangle,
  RotateCcw,
  Check,
  ExternalLink,
  Layers,
  FileCheck,
} from 'lucide-react';

export const ConstructionTasksPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const toast = useToast();
  const [tasks, setTasks] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('ALL');

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal Chụp ảnh tiến độ / nhật ký thi công (BEFORE_WORK, PROGRESS)
  const [selectedEvidenceTask, setSelectedEvidenceTask] = useState<Incident | null>(null);
  const [evidenceStage, setEvidenceStage] = useState<EvidenceStage>('PROGRESS');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState<boolean>(false);

  // Modal Nộp Báo cáo & Ảnh nghiệm thu hoàn thành (Giai đoạn 6c - Kèm quét AI YOLOv8)
  const [selectedAcceptanceTask, setSelectedAcceptanceTask] = useState<Incident | null>(null);
  const [acceptanceFile, setAcceptanceFile] = useState<File | null>(null);
  const [acceptancePreview, setAcceptancePreview] = useState<string | null>(null);
  const [acceptanceNotes, setAcceptanceNotes] = useState<string>('Đã thi công xong theo đúng hồ sơ thiết kế, bề mặt êm thuận và an toàn giao thông.');
  const [isSubmittingAcceptance, setIsSubmittingAcceptance] = useState<boolean>(false);

  // Modal Báo cáo chậm tiến độ (Giai đoạn 6)
  const [selectedDelayTask, setSelectedDelayTask] = useState<Incident | null>(null);
  const [delayReasonText, setDelayReasonText] = useState<string>('');
  const [isSubmittingDelay, setIsSubmittingDelay] = useState<boolean>(false);

  // Modal Thẩm định Nghiệm thu (Admin Review Modal)
  const [reviewAcceptanceTask, setReviewAcceptanceTask] = useState<Incident | null>(null);
  const [adminDecision, setAdminDecision] = useState<'APPROVE' | 'REWORK'>('APPROVE');
  const [reworkInstructions, setReworkInstructions] = useState<string>('');
  const [acceptanceNotesAdmin, setAcceptanceNotesAdmin] = useState<string>('Nghiệm thu đạt yêu cầu kỹ thuật và an toàn giao thông.');
  const [isSubmittingAdminReview, setIsSubmittingAdminReview] = useState<boolean>(false);

  // Modal Thư viện ảnh / Bằng chứng công trường (Gallery Modal)
  const [galleryTask, setGalleryTask] = useState<Incident | null>(null);

  const handleAdminReviewAcceptance = async () => {
    if (!reviewAcceptanceTask) return;
    if (adminDecision === 'REWORK' && (!reworkInstructions || reworkInstructions.trim().length < 5)) {
      toast.warning('Vui lòng chỉ rõ hạng mục cần thi công lại (tối thiểu 5 ký tự)!', 'Thiếu chỉ dẫn sửa chữa');
      return;
    }

    setIsSubmittingAdminReview(true);
    try {
      await incidentApi.reviewAcceptance(reviewAcceptanceTask.id, {
        approved: adminDecision === 'APPROVE',
        reworkReason: adminDecision === 'REWORK' ? reworkInstructions.trim() : undefined,
        notes: acceptanceNotesAdmin.trim(),
      });

      if (adminDecision === 'APPROVE') {
        toast.success('Đã nghiệm thu đạt chuẩn! Hồ sơ sự cố được đóng hoàn tất (CLOSED).', 'Nghiệm thu thành công');
      } else {
        toast.info('Đã ban hành lệnh yêu cầu thi công lại (REWORK_REQUIRED) cho Đội thi công.', 'Yêu cầu làm lại');
      }

      setReviewAcceptanceTask(null);
      setReworkInstructions('');
      fetchTasks(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi thẩm định nghiệm thu', 'Lỗi thẩm định');
    } finally {
      setIsSubmittingAdminReview(false);
    }
  };

  const handleDelaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelayTask) return;
    if (!delayReasonText || delayReasonText.trim().length < 10) {
      toast.warning('Lý do giải trình chậm tiến độ phải cụ thể tối thiểu 10 ký tự!');
      return;
    }
    setIsSubmittingDelay(true);
    try {
      await incidentApi.reportDelayReason(selectedDelayTask.id, { delayReason: delayReasonText.trim() });
      toast.success('Đã gửi báo cáo giải trình chậm tiến độ cho Ban Quản lý!', 'Báo cáo chậm tiến độ');
      setSelectedDelayTask(null);
      setDelayReasonText('');
      fetchTasks(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi giải trình', 'Lỗi');
    } finally {
      setIsSubmittingDelay(false);
    }
  };

  const handleCloseAcceptanceModal = () => {
    setSelectedAcceptanceTask(null);
    setAcceptanceFile(null);
    if (acceptancePreview) URL.revokeObjectURL(acceptancePreview);
    setAcceptancePreview(null);
  };

  const fetchTasks = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    if (isAdmin) {
      // Admin: Lấy toàn bộ các công trình thi công trên hệ thống
      incidentApi
        .getIncidents({
          size: 100,
        })
        .then((res) => {
          if (res.data?.content) {
            const constructionOnly = res.data.content.filter((i) =>
              ['ASSIGNED', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'PENDING_INSPECTION', 'REWORK_REQUIRED', 'RESOLVED', 'CLOSED'].includes(i.status) ||
              i.assignedTeamName
            );
            setTasks(constructionOnly);
            setTotalPages(Math.ceil(constructionOnly.length / pageSize) || 1);
            setTotalElements(constructionOnly.length);
          }
        })
        .catch((err) => {
          console.warn('Lỗi lấy danh sách thi công Admin:', err);
        })
        .finally(() => setLoading(false));
    } else {
      // Staff: Chỉ lấy các nhiệm vụ được giao cho chính mình
      incidentApi
        .getAssignedToMe(0, 100)
        .then((res) => {
          if (res.data?.content) {
            const constructionOnly = res.data.content.filter((i) =>
              ['ASSIGNED', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'PENDING_INSPECTION', 'REWORK_REQUIRED', 'RESOLVED', 'CLOSED'].includes(i.status) ||
              i.assignedTeamName
            );
            setTasks(constructionOnly);
            setTotalPages(Math.ceil(constructionOnly.length / pageSize) || 1);
            setTotalElements(constructionOnly.length);
          }
        })
        .catch((err) => {
          console.warn('Lỗi lấy danh sách thi công Staff:', err);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchTasks(page, pageSize);
  }, [page, pageSize, isAdmin]);

  // Bắt đầu thi công
  const handleStartConstruction = async (taskId: number) => {
    try {
      await incidentApi.startConstruction(taskId);
      toast.info('Đã chuyển trạng thái sang Đang thi công tại hiện trường!', 'Bắt đầu thi công');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'IN_PROGRESS' as IncidentStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể bắt đầu thi công', 'Lỗi');
    }
  };

  // Nộp ảnh bằng chứng
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidenceTask) return;
    if (!evidenceFile) {
      toast.warning('Vui lòng chọn ảnh chụp hiện trường!', 'Thiếu tệp ảnh');
      return;
    }
    if (evidenceFile.size > 15 * 1024 * 1024) {
      toast.warning('Dung lượng tệp ảnh không được vượt quá 15MB!', 'Tệp quá lớn');
      return;
    }
    if (evidenceNotes && evidenceNotes.trim().length > 0 && evidenceNotes.trim().length < 5) {
      toast.warning('Ghi chú mô tả công việc phải có ít nhất 5 ký tự!', 'Ghi chú quá ngắn');
      return;
    }

    setIsSubmittingEvidence(true);
    try {
      const fd = new FormData();
      fd.append('stage', evidenceStage);
      fd.append('file', evidenceFile);
      if (evidenceNotes) fd.append('notes', evidenceNotes.trim());
      if (selectedEvidenceTask.latitude) fd.append('latitude', selectedEvidenceTask.latitude.toString());
      if (selectedEvidenceTask.longitude) fd.append('longitude', selectedEvidenceTask.longitude.toString());

      await incidentApi.uploadEvidence(selectedEvidenceTask.id, fd);
      toast.success(`Đã lưu ảnh bằng chứng mốc [${evidenceStage}]!`, 'Tải lên thành công');
      setSelectedEvidenceTask(null);
      setEvidenceFile(null);
      setEvidenceNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải lên ảnh bằng chứng', 'Lỗi');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Gửi hồ sơ nghiệm thu (kèm ảnh hoàn thành & AI quét)
  const handleSubmitAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcceptanceTask) return;

    if (!acceptanceFile) {
      toast.warning('Bắt buộc phải tải lên ảnh chụp hiện trường sau khi hoàn thành để AI quét nghiệm thu!', 'Thiếu ảnh nghiệm thu');
      return;
    }
    if (acceptanceFile.size > 15 * 1024 * 1024) {
      toast.warning('Dung lượng tệp ảnh không được vượt quá 15MB!', 'Tệp quá lớn');
      return;
    }
    if (!acceptanceNotes || acceptanceNotes.trim().length < 15) {
      toast.warning('Báo cáo hoàn thành & ghi chú nghiệm thu phải chi tiết tối thiểu 15 ký tự (mô tả kết quả xử lý, độ êm thuận...)!', 'Nội dung chưa đủ');
      return;
    }

    setIsSubmittingAcceptance(true);
    try {
      const fd = new FormData();
      fd.append('file', acceptanceFile);
      fd.append('notes', acceptanceNotes.trim());
      if (selectedAcceptanceTask.latitude) fd.append('latitude', selectedAcceptanceTask.latitude.toString());
      if (selectedAcceptanceTask.longitude) fd.append('longitude', selectedAcceptanceTask.longitude.toString());

      const res = await incidentApi.submitAcceptance(selectedAcceptanceTask.id, fd);
      const updated = res.data;

      if (updated.resolution?.aiVerificationStatus === 'AI_VERIFIED_CLEAN') {
        toast.success('✨ AI Thẩm định: Bề mặt hoàn thiện đạt chuẩn! Không phát hiện khuyết tật nào còn sót lại.', 'AI Thẩm định Đạt Chuẩn');
      } else if (updated.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS') {
        toast.warning(updated.resolution.aiVerificationNotes || '⚠️ Cảnh báo AI: Phát hiện dấu hiệu khuyết tật chưa được khắc phục triệt để!', 'Cảnh Báo Kiểm Định AI');
      } else {
        toast.success('Đã nộp hồ sơ nghiệm thu thành công! Chờ Quản trị viên duyệt đóng phiếu.', 'Nộp Nghiệm Thu Thành Công');
      }

      fetchTasks(page, pageSize);
      handleCloseAcceptanceModal();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi hồ sơ nghiệm thu', 'Lỗi');
    } finally {
      setIsSubmittingAcceptance(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'IN_PROGRESS') return ['ASSIGNED', 'IN_PROGRESS'].includes(t.status);
    if (filter === 'OVERDUE') return Boolean(t.plannedDeadline && new Date() > new Date(t.plannedDeadline) && ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(t.status));
    if (filter === 'REWORK_REQUIRED') return t.status === 'REWORK_REQUIRED';
    if (filter === 'PENDING_ACCEPTANCE') return ['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(t.status);
    if (filter === 'DONE') return ['RESOLVED', 'CLOSED'].includes(t.status);
    return true;
  });

  const paginatedTasks = filteredTasks.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-wide">
            <HardHat className="w-4 h-4 text-amber-600" />
            <span>{isAdmin ? 'Chế độ Giám sát toàn diện • Quản trị viên (Admin)' : 'Giai đoạn 6 • Tổ Đội Thi Công Sửa Chữa'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            {isAdmin ? 'Giám sát Thi công sửa chữa & Tiến độ công trình' : 'Nhiệm vụ Thi công Hiện trường'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Theo dõi toàn bộ các công trình sửa chữa đang thi công, kiểm soát tiến độ SLA, xử lý công trình quá hạn và thẩm định nghiệm thu hoàn công.'
              : 'Tiếp nhận nhiệm vụ thi công, tuân thủ phương án kỹ thuật đã phê duyệt, đảm bảo an toàn giao thông, nộp bằng chứng đa mốc và gửi nghiệm thu.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2">
            <span className="text-xs text-amber-800">{isAdmin ? 'Tổng số công trình:' : 'Công trình cần thực hiện:'}</span>
            <span className="text-sm font-bold text-amber-900 leading-none">{totalElements}</span>
          </div>
        </div>
      </div>

      {/* Bộ Lọc Trạng Thái Thi Công */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Tất cả công trình', count: tasks.length },
          { id: 'IN_PROGRESS', label: 'Đang thi công', count: tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length },
          { id: 'OVERDUE', label: 'Quá hạn SLA', count: tasks.filter((t) => Boolean(t.plannedDeadline && new Date() > new Date(t.plannedDeadline) && ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(t.status))).length },
          { id: 'PENDING_ACCEPTANCE', label: 'Chờ nghiệm thu', count: tasks.filter((t) => ['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(t.status)).length },
          { id: 'REWORK_REQUIRED', label: 'Yêu cầu làm lại', count: tasks.filter((t) => t.status === 'REWORK_REQUIRED').length },
          { id: 'DONE', label: 'Đã hoàn tất', count: tasks.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setPage(0);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              filter === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
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

      {/* Danh Sách Thẻ Nhiệm Vụ Thi Công */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent mb-2"></div>
          <div className="text-xs font-medium">Đang tải danh sách nhiệm vụ thi công...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-lg border border-slate-200 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-900">Không có công trình nào trong mục này</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Tất cả công trình thi công đã hoàn thành hoặc chưa có nhiệm vụ mới được giao.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex gap-4">
                  <img
                    src={task.imageUrl}
                    alt={task.title}
                    className="w-24 h-24 rounded-md object-cover shrink-0 border border-slate-200"
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

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        Đội: {task.assignedTeamName || task.assignment?.assignedToStaffName || 'Đội Thi công'}
                      </span>
                      {isAdmin && task.assignment?.assignedToStaffName && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Phụ trách: {task.assignment.assignedToStaffName}
                        </span>
                      )}
                      {task.plannedDeadline && (
                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 font-mono ${
                          new Date() > new Date(task.plannedDeadline) && ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(task.status)
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <Calendar className="w-3 h-3 text-slate-500" />
                          Hạn: {new Date(task.plannedDeadline).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kích thước đo đạc khảo sát thực địa */}
                {task.inspection?.estimatedSize && (
                  <div className="text-xs text-blue-900 bg-blue-50/70 p-2.5 rounded-md border border-blue-200 flex items-center justify-between flex-wrap gap-2">
                    <span>Khối lượng khảo sát: <strong>{task.inspection.estimatedSize}</strong></span>
                    {task.inspection.trafficImpact && (
                      <span className="text-[11px] text-blue-700">Mức ảnh hưởng: {task.inspection.trafficImpact}</span>
                    )}
                  </div>
                )}

                {/* Phương án thi công đã duyệt */}
                {task.workPlan && (
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800">Phương án thi công: </span>
                    <span className="text-slate-600">{task.workPlan}</span>
                  </div>
                )}

                {/* Lưu ý an toàn giao thông */}
                {task.safetyNotes && (
                  <div className="p-2 rounded-md bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                    <span className="font-semibold">Lưu ý ATGT: </span>
                    <span>{task.safetyNotes}</span>
                  </div>
                )}

                {/* Cảnh báo quá hạn thi công (SLA Overdue) */}
                {task.plannedDeadline && new Date() > new Date(task.plannedDeadline) && ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(task.status) && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-md text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Đã quá hạn thi công ({new Date(task.plannedDeadline).toLocaleDateString('vi-VN')})</span>
                    </div>
                    {!task.delayReason && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDelayTask(task);
                          setDelayReasonText('');
                        }}
                        className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-medium hover:bg-rose-700 transition-colors shadow-xs"
                      >
                        Giải trình chậm
                      </button>
                    )}
                  </div>
                )}

                {/* Hiển thị lý do giải trình chậm tiến độ */}
                {task.delayReason && (
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-md text-[11px] text-slate-700">
                    <strong>Giải trình chậm tiến độ:</strong> "{task.delayReason}"
                  </div>
                )}

                {/* Cảnh báo yêu cầu thi công lại nếu có */}
                {Boolean(task.reworkCount && task.reworkCount > 0) && (
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

                {/* Thao tác thi công */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('vi-VN') : 'Mới giao'}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Hành động dành riêng cho ADMIN */}
                    {isAdmin ? (
                      <>
                        {['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(task.status) && (
                          <button
                            onClick={() => {
                              setReviewAcceptanceTask(task);
                              setAdminDecision('APPROVE');
                              setReworkInstructions('');
                              setAcceptanceNotesAdmin('Nghiệm thu đạt yêu cầu kỹ thuật và an toàn giao thông.');
                            }}
                            className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Thẩm định nghiệm thu</span>
                          </button>
                        )}

                        <button
                          onClick={() => setGalleryTask(task)}
                          className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1 transition-colors"
                          title="Xem toàn bộ ảnh Before, Progress, After của công trình"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-600" />
                          <span>Xem bằng chứng</span>
                        </button>
                      </>
                    ) : (
                      /* Hành động dành cho Kỹ thuật viên (STAFF) */
                      <>
                        {task.status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStartConstruction(task.id)}
                            className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Hammer className="w-3.5 h-3.5" />
                            <span>Bắt đầu thi công</span>
                          </button>
                        )}

                        {['IN_PROGRESS', 'REWORK_REQUIRED'].includes(task.status) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEvidenceTask(task);
                                setEvidenceStage('PROGRESS');
                              }}
                              className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1 transition-colors"
                              title="Chụp ảnh lưu vết nhật ký thi công lúc chuẩn bị hoặc đang làm"
                            >
                              <Camera className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ảnh tiến độ</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAcceptanceTask(task);
                                setAcceptanceNotes('Đã thi công xong theo đúng hồ sơ thiết kế, bề mặt êm thuận và an toàn giao thông.');
                              }}
                              className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Nộp nghiệm thu & Quét AI</span>
                            </button>
                          </>
                        )}

                        {['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(task.status) && (
                          <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                            Chờ Admin thẩm định
                          </span>
                        )}

                        {['RESOLVED', 'CLOSED'].includes(task.status) && (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            Đã đóng phiếu
                          </span>
                        )}
                      </>
                    )}

                    <Link
                      to={`/incidents/${task.id}`}
                      className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      title="Xem chi tiết toàn văn hồ sơ"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filteredTasks.length / pageSize) || 1}
            totalElements={filteredTasks.length}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </>
      )}

      {/* MODAL 1: CHỤP ẢNH TIẾN ĐỘ / NHẬT KÝ THI CÔNG (BEFORE_WORK, PROGRESS) */}
      {selectedEvidenceTask && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Chụp ảnh tiến độ / Nhật ký thi công</span>
              </div>
              <button
                onClick={() => setSelectedEvidenceTask(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="p-6 flex flex-col gap-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-slate-600">
                Lưu vết hình ảnh phục vụ nhật ký công trường. Nếu đã hoàn thành toàn bộ và muốn nộp nghiệm thu, vui lòng dùng nút <strong>"Nộp nghiệm thu & Quét AI"</strong>.
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Giai đoạn nhật ký *</label>
                <select
                  value={evidenceStage}
                  onChange={(e) => setEvidenceStage(e.target.value as EvidenceStage)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                >
                  <option value="BEFORE_WORK">1. BEFORE_WORK - Trước thi công (Hiện trạng ban đầu, rào chắn)</option>
                  <option value="PROGRESS">2. PROGRESS - Đang thi công (Cào bóc móng, lu lèn đá base, nhũ tương)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Tệp ảnh chụp hiện trường *</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setEvidenceFile(e.target.files[0]);
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Ghi chú nhật ký (Tối thiểu 5 ký tự)</label>
                  {evidenceNotes.trim().length > 0 && (
                    <span className={`text-[10px] font-mono ${evidenceNotes.trim().length >= 5 ? 'text-emerald-600 font-semibold' : 'text-rose-500'}`}>
                      {evidenceNotes.trim().length}/5 ký tự
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Mô tả công việc tại mốc này (ví dụ: Đã tưới dính bám 0.5kg/m2, chuẩn bị thảm bê tông nhựa)..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceTask(null)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvidence}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmittingEvidence ? 'Đang tải lên...' : 'Lưu nhật ký'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NỘP HỒ SƠ NGHIỆM THU & QUÉT AI YOLOV8 */}
      {selectedAcceptanceTask && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Nộp Nghiệm Thu Công Trình & Quét Thẩm Định AI</span>
              </div>
              <button
                onClick={handleCloseAcceptanceModal}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAcceptance} className="p-6 flex flex-col gap-4 text-xs">
              <div className="p-3 bg-emerald-50/80 rounded-md border border-emerald-200 flex items-start gap-2.5 text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <strong>Thẩm định tự động bằng AI YOLOv8:</strong> Khi nộp, mô hình AI sẽ quét lập tức ảnh chụp hiện trường để kiểm tra xem vết nứt hoặc ổ gà đã được khắc phục triệt để chưa (0 khuyết tật sót lại) trước khi chuyển Quản trị viên duyệt.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col gap-1">
                <span className="font-semibold text-slate-800">Sự cố: {selectedAcceptanceTask.title}</span>
                <span className="text-slate-500 font-mono text-[11px]">Mã phiếu: {selectedAcceptanceTask.ticketCode}</span>
                {selectedAcceptanceTask.assignedTeamName && (
                  <span className="text-slate-600 text-[11px]">Tổ đội phụ trách: {selectedAcceptanceTask.assignedTeamName}</span>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">
                  Ảnh hiện trường sau khi thi công hoàn thành * <span className="text-emerald-600 font-semibold">(Bắt buộc để AI quét)</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const f = e.target.files[0];
                      setAcceptanceFile(f);
                      if (acceptancePreview) URL.revokeObjectURL(acceptancePreview);
                      setAcceptancePreview(URL.createObjectURL(f));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />

                {acceptancePreview && (
                  <div className="mt-2.5 relative rounded-md overflow-hidden border border-slate-200 bg-slate-100 aspect-video max-h-48 flex items-center justify-center">
                    <img src={acceptancePreview} alt="Xem trước ảnh nghiệm thu" className="max-h-full max-w-full object-contain" />
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                      Ảnh hoàn thiện chờ AI quét
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Báo cáo kết quả xử lý & Ghi chú nghiệm thu *</label>
                  <span className={`text-[10px] font-mono ${acceptanceNotes.trim().length >= 15 ? 'text-emerald-600 font-semibold' : 'text-rose-500'}`}>
                    {acceptanceNotes.trim().length}/15 ký tự tối thiểu
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={acceptanceNotes}
                  required
                  minLength={15}
                  onChange={(e) => setAcceptanceNotes(e.target.value)}
                  placeholder="Xác nhận hoàn thành các hạng mục, bề mặt êm thuận, an toàn giao thông..."
                  className={`w-full px-3 py-2 rounded-md bg-white border font-medium text-slate-900 ${
                    acceptanceNotes.trim().length > 0 && acceptanceNotes.trim().length < 15
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseAcceptanceModal}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAcceptance}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmittingAcceptance ? 'AI Đang quét & Nộp hồ sơ...' : 'Quét AI & Gửi Nghiệm Thu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Báo Cáo Chậm Tiến Độ (Overdue SLA) */}
      {selectedDelayTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full p-5 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <Clock className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Báo cáo lý do chậm tiến độ thi công</h3>
              </div>
              <button
                onClick={() => setSelectedDelayTask(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDelaySubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-rose-50 rounded-md border border-rose-200 text-rose-900 text-xs">
                Công trình đã vượt quá hạn chót hoàn thành theo kế hoạch đã duyệt. Vui lòng giải trình nguyên nhân khách quan để Ban Quản lý nắm bắt và hỗ trợ điều phối.
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Nguyên nhân chậm tiến độ * (Tối thiểu 10 ký tự)</label>
                <textarea
                  value={delayReasonText}
                  onChange={(e) => setDelayReasonText(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent leading-relaxed text-slate-900 font-medium"
                  placeholder="Ví dụ: Hiện trường mưa lớn kéo dài không thể thảm nhựa nóng, hoặc vướng công trình ngầm cấp thoát nước..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedDelayTask(null)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelay}
                  className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingDelay ? 'Đang gửi...' : 'Gửi báo cáo giải trình'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thẩm định Nghiệm thu Hoàn công (Dành cho Admin) */}
      {reviewAcceptanceTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Thẩm định Nghiệm thu Công trình #{reviewAcceptanceTask.ticketCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đối chiếu hiện trạng Trước / Sau thi công & Quyết định đóng hồ sơ hoặc thi công lại
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewAcceptanceTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              {/* So sánh ảnh Trước vs Sau */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700">Ảnh hiện trường ban đầu (Before):</span>
                  <img
                    src={reviewAcceptanceTask.imageUrl}
                    alt="Hiện trường ban đầu"
                    className="w-full h-44 object-cover rounded-lg border border-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700">Ảnh nghiệm thu hoàn thành (After):</span>
                  <img
                    src={reviewAcceptanceTask.resolution?.proofImageUrl || reviewAcceptanceTask.imageUrl}
                    alt="Nghiệm thu hoàn thành"
                    className="w-full h-44 object-cover rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {/* Thông tin thi công & Ghi chú từ đội thi công */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Đội thi công: <strong className="text-slate-900">{reviewAcceptanceTask.assignedTeamName || 'Đội Thi công'}</strong></span>
                  <span>Phụ trách: <strong className="text-slate-900">{reviewAcceptanceTask.assignment?.assignedToStaffName || 'Kỹ thuật viên'}</strong></span>
                </div>
                {reviewAcceptanceTask.resolution?.aiVerificationStatus && (
                  <div className={`p-2 rounded font-medium flex items-center gap-1.5 ${
                    reviewAcceptanceTask.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Kiểm định AI YOLOv8: {reviewAcceptanceTask.resolution.aiVerificationNotes || reviewAcceptanceTask.resolution.aiVerificationStatus}</span>
                  </div>
                )}
                <div className="text-slate-700 mt-1">
                  <strong>Ghi chú hoàn thành từ đội thi công:</strong>
                  <p className="italic mt-0.5">"{reviewAcceptanceTask.resolution?.notes || 'Đã thi công hoàn thành đạt chuẩn mặt đường.'}"</p>
                </div>
              </div>

              {/* Lựa chọn quyết định của Admin */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-800">Quyết định thẩm định của Quản trị viên:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdminDecision('APPROVE')}
                    className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all text-left ${
                      adminDecision === 'APPROVE'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${adminDecision === 'APPROVE' ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>
                      {adminDecision === 'APPROVE' && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-bold block text-xs">Đạt nghiệm thu</span>
                      <span className="text-[10px] text-slate-500">Đóng hồ sơ hoàn tất (CLOSED)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminDecision('REWORK')}
                    className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all text-left ${
                      adminDecision === 'REWORK'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${adminDecision === 'REWORK' ? 'bg-rose-600 text-white' : 'border border-slate-300'}`}>
                      {adminDecision === 'REWORK' && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-bold block text-xs">Yêu cầu thi công lại</span>
                      <span className="text-[10px] text-slate-500">Bắt buộc sửa chữa (REWORK)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Chỉ dẫn làm lại nếu REWORK */}
              {adminDecision === 'REWORK' && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-300 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Chỉ dẫn khắc phục & Lý do yêu cầu thi công lại *:</span>
                  </div>
                  <textarea
                    rows={2}
                    value={reworkInstructions}
                    onChange={(e) => setReworkInstructions(e.target.value)}
                    placeholder="Ví dụ: Mép vá chưa phẳng êm thuận, nhựa đường đầm lèn chưa đủ độ chặt K98..."
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-rose-300 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Ý kiến thẩm định */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">Ghi chú kết luận thẩm định:</label>
                <input
                  type="text"
                  value={acceptanceNotesAdmin}
                  onChange={(e) => setAcceptanceNotesAdmin(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <Link
                  to={`/incidents/${reviewAcceptanceTask.id}`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem chi tiết hồ sơ gốc</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAcceptanceTask(null)}
                    className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingAdminReview}
                    onClick={handleAdminReviewAcceptance}
                    className={`px-4 py-1.5 rounded-md text-white font-medium text-xs shadow-xs flex items-center gap-1.5 ${
                      adminDecision === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isSubmittingAdminReview ? 'Đang xử lý...' : adminDecision === 'APPROVE' ? 'Xác nhận Nghiệm thu Đạt' : 'Xác nhận Bắt làm lại'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thư viện Bằng chứng ảnh & Tiến độ công trình (Gallery) */}
      {galleryTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Thư viện Bằng chứng Hiện trường #{galleryTask.ticketCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Theo dõi đầy đủ chuỗi ảnh hiện trạng Before, Progress, After và Rework
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGalleryTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              {/* Ảnh người dân ban đầu */}
              <div>
                <span className="font-semibold text-slate-800 block mb-1.5">1. Ảnh người dân phản ánh ban đầu:</span>
                <a href={galleryTask.imageUrl} target="_blank" rel="noreferrer" className="inline-block">
                  <img src={galleryTask.imageUrl} alt="Ảnh người dân" className="w-44 h-32 object-cover rounded-lg border border-slate-200 hover:opacity-90" />
                </a>
              </div>

              {/* Ảnh khảo sát nếu có */}
              {galleryTask.inspection?.inspectionPhotos && galleryTask.inspection.inspectionPhotos.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-800 block mb-1.5">
                    2. Ảnh đo đạc thực tế của Tổ Khảo sát ({galleryTask.inspection.inspectionPhotos.length} ảnh):
                  </span>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {galleryTask.inspection.inspectionPhotos.map((photo, idx) => (
                      <a key={idx} href={photo} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={photo} alt={`Ảnh khảo sát ${idx + 1}`} className="w-32 h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Ảnh hoàn thành nghiệm thu */}
              {galleryTask.resolution?.proofImageUrl && (
                <div>
                  <span className="font-semibold text-slate-800 block mb-1.5">3. Ảnh nghiệm thu hoàn thành (After):</span>
                  <a href={galleryTask.resolution.proofImageUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <img
                      src={galleryTask.resolution.proofImageUrl}
                      alt="Ảnh nghiệm thu"
                      className="w-44 h-32 object-cover rounded-lg border border-emerald-300 hover:opacity-90"
                    />
                  </a>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setGalleryTask(null)}
                  className="px-4 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
