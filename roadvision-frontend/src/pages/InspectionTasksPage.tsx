import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category, Severity } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import {
  Compass,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileCheck,
  MapPin,
  X,
  Send,
  Navigation,
  AlertCircle,
  Calculator,
  Eye,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  FileText,
  Check,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

export const InspectionTasksPage: React.FC = () => {
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

  // Modal Báo cáo khảo sát hiện trường (Giai đoạn 4 - Dành cho Staff)
  const [selectedSurveyTask, setSelectedSurveyTask] = useState<Incident | null>(null);
  const [surveyLatitude, setSurveyLatitude] = useState<number>(21.0285);
  const [surveyLongitude, setSurveyLongitude] = useState<number>(105.8542);
  const [confirmedCategory, setConfirmedCategory] = useState<Category>('POTHOLE');
  const [actualSeverity, setActualSeverity] = useState<Severity>('HIGH');
  const [estimatedLengthM, setEstimatedLengthM] = useState<number>(1.2);
  const [estimatedWidthM, setEstimatedWidthM] = useState<number>(0.8);
  const [estimatedDepthCm, setEstimatedDepthCm] = useState<number>(6.0);
  const [trafficImpact, setTrafficImpact] = useState<string>('HIGH');
  const [proposedSolution, setProposedSolution] = useState<string>('Cào bóc 4cm, thảm bù BTN C12.5 đầm lèn K98');
  const [surveyNotes, setSurveyNotes] = useState<string>('Mặt đường lún võng nguy hiểm cho xe máy');
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(3.5);
  const [surveyPhotos, setSurveyPhotos] = useState<File[]>([]);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState<boolean>(false);

  // Modal Thẩm định & Duyệt phương án Khảo sát (Dành cho Admin)
  const [reviewTask, setReviewTask] = useState<Incident | null>(null);
  const [revisionNotes, setRevisionNotes] = useState<string>('');
  const [isRejectingSurvey, setIsRejectingSurvey] = useState<boolean>(false);
  const [isApprovingSurvey, setIsApprovingSurvey] = useState<boolean>(false);
  const [isRevisionMode, setIsRevisionMode] = useState<boolean>(false);

  const fetchTasks = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    if (isAdmin) {
      // Admin: Giám sát toàn bộ các sự cố trong quy trình khảo sát
      incidentApi
        .getIncidents({
          size: 100,
        })
        .then((res) => {
          if (res.data?.content) {
            const inspectionOnly = res.data.content.filter((i) =>
              ['INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED'].includes(i.status) || i.inspectionTeamName
            );
            setTasks(inspectionOnly);
            setTotalPages(Math.ceil(inspectionOnly.length / pageSize) || 1);
            setTotalElements(inspectionOnly.length);
          }
        })
        .catch((err) => {
          console.warn('Lỗi lấy danh sách khảo sát Admin:', err);
        })
        .finally(() => setLoading(false));
    } else {
      // Staff: Chỉ lấy nhiệm vụ được phân công cho mình
      incidentApi
        .getAssignedToMe(0, 100)
        .then((res) => {
          if (res.data?.content) {
            const inspectionOnly = res.data.content.filter((i) =>
              ['INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED'].includes(i.status) || i.inspectionTeamName
            );
            setTasks(inspectionOnly);
            setTotalPages(Math.ceil(inspectionOnly.length / pageSize) || 1);
            setTotalElements(inspectionOnly.length);
          }
        })
        .catch((err) => {
          console.warn('Lỗi lấy danh sách khảo sát Staff:', err);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchTasks(page, pageSize);
  }, [page, pageSize, isAdmin]);

  // Admin duyệt phương án khảo sát
  const handleAdminApproveInspection = async (taskId: number) => {
    setIsApprovingSurvey(true);
    try {
      await incidentApi.approveInspection(taskId);
      toast.success('Đã phê duyệt phương án khảo sát! Hồ sơ sẵn sàng để Giao thi công.', 'Phê duyệt thành công');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? {
          ...t,
          status: 'INSPECTED' as IncidentStatus,
          inspection: t.inspection ? { ...t.inspection, inspectionStatus: 'APPROVED' } : undefined
        } : t))
      );
      setReviewTask(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể phê duyệt phương án', 'Lỗi phê duyệt');
    } finally {
      setIsApprovingSurvey(false);
    }
  };

  // Admin yêu cầu khảo sát lại / bổ sung
  const handleAdminRejectInspection = async (taskId: number) => {
    if (!revisionNotes || revisionNotes.trim().length < 5) {
      toast.warning('Vui lòng ghi rõ lý do yêu cầu khảo sát lại hoặc nội dung cần bổ sung (tối thiểu 5 ký tự)!', 'Thiếu lý do');
      return;
    }
    setIsRejectingSurvey(true);
    try {
      await incidentApi.rejectInspectionReport(taskId, { reason: revisionNotes.trim() });
      toast.info('Đã gửi yêu cầu khảo sát lại / bổ sung số liệu đến Tổ khảo sát!', 'Đã gửi yêu cầu');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? {
          ...t,
          status: 'INSPECTING' as IncidentStatus,
          rejectionReason: revisionNotes.trim(),
          inspection: t.inspection ? { ...t.inspection, inspectionStatus: 'REVISE_REQUESTED', revisionReason: revisionNotes.trim() } : undefined
        } : t))
      );
      setReviewTask(null);
      setRevisionNotes('');
      setIsRevisionMode(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu khảo sát lại', 'Lỗi');
    } finally {
      setIsRejectingSurvey(false);
    }
  };

  // Bắt đầu khảo sát
  const handleStartInspection = async (taskId: number) => {
    try {
      await incidentApi.startInspection(taskId);
      toast.info('Đã xác nhận có mặt tại hiện trường và bắt đầu đo đạc khảo sát!', 'Bắt đầu khảo sát');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'INSPECTING' as IncidentStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể bắt đầu khảo sát', 'Lỗi');
    }
  };

  // Mở modal lập biên bản
  const handleOpenSurveyModal = (task: Incident) => {
    setSelectedSurveyTask(task);
    setSurveyLatitude(task.latitude || 21.0285);
    setSurveyLongitude(task.longitude || 105.8542);
    setConfirmedCategory(task.category || 'POTHOLE');
    setActualSeverity(task.severity || 'HIGH');
    setSurveyPhotos([]);
  };

  const handleGetLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSurveyLatitude(pos.coords.latitude);
          setSurveyLongitude(pos.coords.longitude);
          if (pos.coords.accuracy) {
            setGpsAccuracy(Math.round(pos.coords.accuracy * 10) / 10);
          }
          toast.success(`Đã lấy tọa độ GPS thực tế (Độ chính xác: ±${Math.round(pos.coords.accuracy || 3)}m)!`, 'Định vị GPS');
        },
        () => {
          toast.warning('Không thể truy cập GPS từ trình duyệt.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Submit báo cáo khảo sát (Hỗ trợ nộp chính thức hoặc Lưu nháp)
  const handleSubmitSurvey = async (e?: React.FormEvent, submissionStatus: 'DRAFT' | 'SUBMITTED' = 'SUBMITTED') => {
    if (e) e.preventDefault();
    if (!selectedSurveyTask) return;

    if (submissionStatus === 'SUBMITTED') {
      // 1. Kiểm tra ảnh hiện trạng (Bắt buộc)
      if (!surveyPhotos || surveyPhotos.length === 0) {
        toast.warning('Bắt buộc phải tải lên ít nhất 1 ảnh chụp hiện trạng khảo sát thực tế tại hiện trường!', 'Thiếu ảnh hiện trường');
        return;
      }

      // 2. Kiểm tra kích thước đo đạc
      if (!estimatedLengthM || estimatedLengthM <= 0) {
        toast.warning('Vui lòng nhập chiều dài hư hỏng (m) lớn hơn 0!', 'Kích thước không hợp lệ');
        return;
      }
      if (!estimatedWidthM || estimatedWidthM <= 0) {
        toast.warning('Vui lòng nhập chiều rộng hư hỏng (m) lớn hơn 0!', 'Kích thước không hợp lệ');
        return;
      }
      if (estimatedDepthCm === undefined || estimatedDepthCm < 0) {
        toast.warning('Độ sâu (cm) không được để trống hoặc âm!', 'Kích thước không hợp lệ');
        return;
      }

      // 3. Kiểm tra đề xuất phương án
      if (!proposedSolution || proposedSolution.trim().length < 10) {
        toast.warning('Đề xuất phương án kỹ thuật phải cụ thể tối thiểu 10 ký tự (ví dụ: cào bóc, tưới dính bám, thảm bù BTN...)!', 'Thiếu nội dung phương án');
        return;
      }
    }

    // Kiểm tra tọa độ GPS
    if (!surveyLatitude || !surveyLongitude || isNaN(surveyLatitude) || isNaN(surveyLongitude)) {
      toast.warning('Tọa độ GPS khảo sát không hợp lệ!', 'Lỗi GPS');
      return;
    }
    if (surveyLatitude < 8.0 || surveyLatitude > 24.0 || surveyLongitude < 102.0 || surveyLongitude > 110.0) {
      toast.warning('Tọa độ GPS khảo sát nằm ngoài phạm vi lãnh thổ quản lý hợp lệ!', 'Lỗi GPS ngoài phạm vi');
      return;
    }

    setIsSubmittingSurvey(true);
    try {
      const area = estimatedLengthM * estimatedWidthM;
      const volume = area * (estimatedDepthCm / 100);
      const asphaltTons = volume * 2.4;
      const formattedEstimatedSize = `${estimatedLengthM}m x ${estimatedWidthM}m x ${estimatedDepthCm}cm (S = ${area.toFixed(2)} m², V = ${volume.toFixed(2)} m³ ~ ${asphaltTons.toFixed(2)} tấn BTN)`;

      const dataPayload = {
        actualLatitude: surveyLatitude,
        actualLongitude: surveyLongitude,
        confirmedCategory,
        actualSeverity,
        estimatedSize: formattedEstimatedSize,
        estimatedLengthM,
        estimatedWidthM,
        estimatedDepthCm,
        trafficImpact: trafficImpact || 'Ảnh hưởng một phần làn xe',
        proposedSolution: proposedSolution.trim(),
        notes: surveyNotes ? surveyNotes.trim() : '',
        gpsAccuracy,
        inspectionStatus: submissionStatus,
      };

      const fd = new FormData();
      fd.append('data', new Blob([JSON.stringify(dataPayload)], { type: 'application/json' }));
      surveyPhotos.forEach((file) => {
        fd.append('photos', file);
      });

      await incidentApi.submitInspectionReport(selectedSurveyTask.id, fd);
      if (submissionStatus === 'DRAFT') {
        toast.info('Đã lưu bản nháp biên bản khảo sát thành công!', 'Lưu nháp');
      } else {
        toast.success('Đã gửi biên bản khảo sát hiện trường! Hồ sơ chuyển sang Admin duyệt phương án thi công.', 'Khảo sát thành công');
      }
      fetchTasks(page, pageSize);
      setSelectedSurveyTask(null);
      setSurveyPhotos([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi báo cáo khảo sát', 'Lỗi');
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'INSPECTION_ASSIGNED') return t.status === 'INSPECTION_ASSIGNED';
    if (filter === 'INSPECTING') return t.status === 'INSPECTING';
    if (filter === 'INSPECTED') return t.status === 'INSPECTED';
    return true;
  });

  const paginatedTasks = filteredTasks.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 text-xs font-semibold uppercase tracking-wide">
            <Compass className="w-4 h-4 text-sky-600" />
            <span>{isAdmin ? 'Chế độ Giám sát toàn diện • Quản trị viên (Admin)' : 'Giai đoạn 4 • Tổ Khảo sát Hiện trường'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            {isAdmin ? 'Giám sát Khảo sát Hiện trường' : 'Nhiệm vụ Khảo sát Thực địa'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Theo dõi toàn bộ các nhiệm vụ khảo sát thực địa của các tổ đội trên toàn địa bàn, thẩm định biên bản kỹ thuật và chuyển tiếp phê duyệt phương án thi công.'
              : 'Tiếp cận vị trí phản ánh, xác nhận tọa độ GPS thực tế, chụp ảnh hiện trạng, đo đạc kích thước và lập biên bản kỹ thuật đề xuất phương án xử lý.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-md bg-sky-50 border border-sky-200 flex items-center gap-2">
            <span className="text-xs text-sky-800">{isAdmin ? 'Tổng nhiệm vụ khảo sát:' : 'Khảo sát cần thực hiện:'}</span>
            <span className="text-sm font-bold text-sky-900 leading-none">{totalElements}</span>
          </div>
        </div>
      </div>

      {/* Bộ Lọc Trạng Thái Khảo Sát */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Tất cả nhiệm vụ khảo sát', count: tasks.length },
          { id: 'INSPECTION_ASSIGNED', label: 'Chờ tiếp cận hiện trường', count: tasks.filter((t) => t.status === 'INSPECTION_ASSIGNED').length },
          { id: 'INSPECTING', label: 'Đang đo đạc & khảo sát', count: tasks.filter((t) => t.status === 'INSPECTING').length },
          { id: 'INSPECTED', label: 'Đã hoàn tất báo cáo', count: tasks.filter((t) => t.status === 'INSPECTED').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setPage(0);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              filter === tab.id
                ? 'bg-sky-600 text-white shadow-xs'
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

      {/* Danh Sách Nhiệm Vụ Khảo Sát */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-sky-600 border-t-transparent mb-2"></div>
          <div className="text-xs font-medium">Đang tải danh sách nhiệm vụ khảo sát...</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-lg border border-slate-200 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-900">Không có nhiệm vụ khảo sát nào</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Hiện tại không có sự cố nào cần khảo sát trong mục này hoặc tất cả đã được lập biên bản.
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
                      <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                        Tổ: {task.inspectionTeamName || task.inspection?.inspectionTeamName || 'Tổ Khảo sát'}
                      </span>
                      {isAdmin && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Cán bộ: {task.inspection?.inspectorName || task.assignment?.assignedToStaffName || 'Đang điều động'}
                        </span>
                      )}
                      {task.aiDetection?.confidence && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          AI: {(task.aiDetection.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cảnh báo nếu Admin yêu cầu khảo sát lại / bổ sung số liệu */}
                {(task.inspection?.inspectionStatus === 'REVISE_REQUESTED' || (task.rejectionReason && task.status === 'INSPECTING')) && (
                  <div className="p-2.5 rounded-md bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Admin yêu cầu bổ sung / khảo sát lại:</span>
                    </div>
                    <p className="italic text-[11px] text-amber-900 font-medium">
                      "{task.inspection?.revisionReason || task.rejectionReason}"
                    </p>
                  </div>
                )}

                {/* Kết quả khảo sát đã có nếu trạng thái INSPECTED */}
                {task.inspection && task.inspection.inspectionStatus !== 'REVISE_REQUESTED' && (
                  <div className="p-3 rounded-md bg-teal-50/50 border border-teal-200 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-semibold text-teal-900">
                      <span>Biên bản hiện trường: {task.inspection.confirmedCategory}</span>
                      <span className="font-mono text-[10px] text-teal-700">{task.inspection.actualSeverity}</span>
                    </div>
                    {task.inspection.estimatedSize && (
                      <div className="text-[11px] font-mono text-blue-900 bg-white/80 p-1 rounded border border-teal-100">
                        {task.inspection.estimatedSize}
                      </div>
                    )}
                    <p className="text-teal-950 text-[11px] line-clamp-2">
                      {task.inspection.proposedSolution || 'Đã ghi nhận hiện trạng và đề xuất xử lý.'}
                    </p>
                  </div>
                )}

                {/* Thao tác khảo sát */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('vi-VN') : 'Mới giao'}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Hành động dành riêng cho ADMIN */}
                    {isAdmin ? (
                      <>
                        {task.status === 'INSPECTED' && (
                          <button
                            onClick={() => {
                              setReviewTask(task);
                              setIsRevisionMode(false);
                              setRevisionNotes('');
                            }}
                            className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem biên bản & Thẩm định</span>
                          </button>
                        )}
                        {task.status === 'INSPECTING' && (
                          <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Đang đo đạc thực địa
                          </span>
                        )}
                        {task.status === 'INSPECTION_ASSIGNED' && (
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Chờ tổ tiếp cận
                          </span>
                        )}
                      </>
                    ) : (
                      /* Hành động dành cho Kỹ thuật viên hiện trường (STAFF) */
                      <>
                        {task.status === 'INSPECTION_ASSIGNED' && (
                          <button
                            onClick={() => handleStartInspection(task.id)}
                            className="px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>Bắt đầu khảo sát</span>
                          </button>
                        )}

                        {task.status === 'INSPECTING' && (
                          <button
                            onClick={() => handleOpenSurveyModal(task)}
                            className={`px-3.5 py-1.5 rounded-md text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs ${
                              task.inspection?.inspectionStatus === 'REVISE_REQUESTED' || task.rejectionReason
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-teal-600 hover:bg-teal-700'
                            }`}
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>{task.inspection?.inspectionStatus === 'REVISE_REQUESTED' || task.rejectionReason ? 'Chỉnh sửa & Nộp lại' : 'Lập biên bản khảo sát'}</span>
                          </button>
                        )}

                        {task.status === 'INSPECTED' && (
                          <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                            Đã nộp biên bản • Chờ duyệt
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

      {/* MODAL: BÁO CÁO KHẢO SÁT HIỆN TRƯỜNG */}
      {selectedSurveyTask && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Biên bản khảo sát hiện trường kỹ thuật</span>
                <span className="font-mono text-xs text-blue-700 font-medium">{selectedSurveyTask.ticketCode?.startsWith('#') ? selectedSurveyTask.ticketCode : `#${selectedSurveyTask.ticketCode}`}</span>
              </div>
              <button
                onClick={() => setSelectedSurveyTask(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSurvey} className="p-6 flex flex-col gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Tọa độ GPS xác thực hiện trường:
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLiveLocation}
                    className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    Lấy vị trí GPS hiện tại
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Vĩ độ (Latitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={surveyLatitude}
                      onChange={(e) => setSurveyLatitude(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Kinh độ (Longitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={surveyLongitude}
                      onChange={(e) => setSurveyLongitude(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-slate-700">Xác nhận loại hư hỏng *</label>
                  <select
                    value={confirmedCategory}
                    onChange={(e) => setConfirmedCategory(e.target.value as Category)}
                    className="w-full px-2.5 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                  >
                    <option value="POTHOLE">Ổ gà / Hố sụt</option>
                    <option value="ROAD_CRACK">Vết nứt mặt đường</option>
                    <option value="ROAD_FLOODING">Điểm ngập úng</option>
                    <option value="ROAD_OBSTACLE">Chướng ngại vật</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-700">Mức độ nguy hiểm thực tế *</label>
                  <select
                    value={actualSeverity}
                    onChange={(e) => setActualSeverity(e.target.value as Severity)}
                    className="w-full px-2.5 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                  >
                    <option value="HIGH">Cao (Nguy hiểm lớn)</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="LOW">Thấp (Chưa khẩn)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-2">Thông số đo đạc kích thước hiện trường:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Chiều dài (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedLengthM}
                      onChange={(e) => setEstimatedLengthM(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Chiều rộng (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedWidthM}
                      onChange={(e) => setEstimatedWidthM(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Độ sâu (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={estimatedDepthCm}
                      onChange={(e) => setEstimatedDepthCm(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-medium"
                    />
                  </div>
                </div>

                {/* Tự động tính toán diện tích & khối lượng vật tư dự toán */}
                {estimatedLengthM > 0 && estimatedWidthM > 0 && (
                  <div className="mt-3 p-2.5 bg-blue-50/80 rounded-md border border-blue-200 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 mb-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-600" />
                      <span>Dự toán diện tích & vật tư tự động (BoQ Real-time):</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Diện tích cào bóc (S)</span>
                        <span className="text-xs font-bold text-blue-700 font-mono">
                          {(estimatedLengthM * estimatedWidthM).toFixed(2)} m²
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Thể tích đào bù (V)</span>
                        <span className="text-xs font-bold text-indigo-700 font-mono">
                          {((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(3)} m³
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">BTN dự kiến (tấn)</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          ~ {(((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)) * 2.4).toFixed(2)} tấn
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 italic block mt-1.5 text-center">
                      * Công thức quy chuẩn: S = Dài × Rộng; V = S × (Sâu / 100); BTN ≈ V × 2.4 tấn/m³
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Đề xuất phương án xử lý kỹ thuật *</label>
                  <span className={`text-[10px] font-mono ${proposedSolution.trim().length >= 10 ? 'text-emerald-600 font-semibold' : 'text-rose-500'}`}>
                    {proposedSolution.trim().length}/10 ký tự tối thiểu
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={proposedSolution}
                  required
                  minLength={10}
                  onChange={(e) => setProposedSolution(e.target.value)}
                  placeholder="Ví dụ: Cào bóc 4cm, tưới nhựa dính bám 0.5kg/m2, thảm bù BTN C12.5 đầm lèn K98..."
                  className={`w-full px-3 py-2 rounded-md bg-white border font-medium text-slate-900 ${
                    proposedSolution.trim().length > 0 && proposedSolution.trim().length < 10
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">
                    Ảnh chụp hiện trạng tại hiện trường * <span className="text-teal-600 font-semibold">(Bắt buộc ít nhất 1 ảnh)</span>
                  </label>
                  <span className={`text-[10px] font-semibold ${surveyPhotos.length > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {surveyPhotos.length > 0 ? `Đã chọn ${surveyPhotos.length} ảnh` : 'Chưa có ảnh'}
                  </span>
                </div>
                <input
                  type="file"
                  multiple
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSurveyPhotos(Array.from(e.target.files));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
                {surveyPhotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {surveyPhotos.map((file, idx) => (
                      <div key={idx} className="relative group px-2 py-1 rounded bg-teal-50 border border-teal-200 text-[11px] text-teal-800 flex items-center gap-1.5">
                        <span className="truncate max-w-[140px] font-mono">{file.name}</span>
                        <span className="text-[10px] text-teal-600 font-sans">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Nhận xét & Ghi chú thêm (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={surveyNotes}
                  onChange={(e) => setSurveyNotes(e.target.value)}
                  placeholder="Ghi chú thêm về thời tiết, mật độ phương tiện qua lại, chướng ngại vật phụ cận..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedSurveyTask(null)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingSurvey}
                  onClick={() => handleSubmitSurvey(undefined, 'DRAFT')}
                  className="px-3.5 py-1.5 rounded-md border border-teal-300 bg-teal-50 text-teal-800 font-medium hover:bg-teal-100 transition-colors disabled:opacity-50"
                  title="Lưu tạm thời để tiếp tục bổ sung số liệu sau"
                >
                  Lưu nháp (Draft)
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSurvey}
                  className="px-4 py-1.5 rounded-md bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingSurvey ? 'Đang gửi...' : 'Nộp biên bản chính thức'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thẩm định & Duyệt phương án Khảo sát (Dành cho Admin) */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Biên bản Khảo sát Hiện trường #{reviewTask.ticketCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thẩm định số liệu đo đạc kỹ thuật & Phê duyệt phương án thi công
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewTask(null);
                  setIsRevisionMode(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              {/* Thông tin đơn vị khảo sát */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px] block">Đơn vị khảo sát:</span>
                  <span className="font-semibold text-slate-900">
                    {reviewTask.inspectionTeamName || reviewTask.inspection?.inspectionTeamName || 'Tổ Khảo Sát Hiện Trường'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Cán bộ lập biên bản:</span>
                  <span className="font-semibold text-slate-900">
                    {reviewTask.inspection?.inspectorName || reviewTask.assignment?.assignedToStaffName || 'Cán bộ khảo sát'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Thời gian nộp biên bản:</span>
                  <span className="font-mono text-slate-800">
                    {reviewTask.inspection?.inspectedAt ? new Date(reviewTask.inspection.inspectedAt).toLocaleString('vi-VN') : 'Vừa xong'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Tọa độ GPS thực tế:</span>
                  <span className="font-mono text-slate-800">
                    {reviewTask.inspection?.actualLatitude ? `${Number(reviewTask.inspection.actualLatitude).toFixed(4)}, ${Number(reviewTask.inspection.actualLongitude).toFixed(4)}` : `${Number(reviewTask.latitude).toFixed(4)}, ${Number(reviewTask.longitude).toFixed(4)}`} (±{reviewTask.inspection?.gpsAccuracy || 3.5}m)
                  </span>
                </div>
              </div>

              {/* Kích thước & Khối lượng vật tư BoQ */}
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                <div className="flex items-center gap-1.5 font-semibold text-blue-900 mb-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Số đo & Khối lượng vật tư dự toán (BoQ):</span>
                </div>
                <div className="font-mono text-xs font-bold text-blue-950 mb-1">
                  {reviewTask.inspection?.estimatedSize || 'Chưa có quy cách đo'}
                </div>
                <div className="text-[11px] text-slate-600">
                  Phân loại xác nhận: <strong className="text-slate-900">{reviewTask.inspection?.confirmedCategory || reviewTask.category}</strong> • Mức độ: <strong className="text-slate-900">{reviewTask.inspection?.actualSeverity || reviewTask.severity}</strong>
                </div>
              </div>

              {/* Đề xuất giải pháp kỹ thuật */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-1">Phương án kỹ thuật đề xuất từ Tổ khảo sát:</span>
                <p className="text-slate-700 leading-relaxed italic">
                  "{reviewTask.inspection?.proposedSolution || 'Cào bóc lớp hư hỏng, tưới dính bám và thảm bù bê tông nhựa hoàn trả mặt đường.'}"
                </p>
                {reviewTask.inspection?.notes && (
                  <div className="mt-2 text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                    <strong>Ghi chú an toàn:</strong> {reviewTask.inspection.notes}
                  </div>
                )}
              </div>

              {/* Thư viện ảnh hiện trường tổ khảo sát nộp */}
              {reviewTask.inspection?.inspectionPhotos && reviewTask.inspection.inspectionPhotos.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-800 block mb-2">Ảnh chụp đo đạc hiện trường ({reviewTask.inspection.inspectionPhotos.length} ảnh):</span>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {reviewTask.inspection.inspectionPhotos.map((photo, idx) => (
                      <a key={idx} href={photo} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={photo} alt={`Ảnh khảo sát ${idx + 1}`} className="w-24 h-24 object-cover rounded-md border border-slate-200 hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Chế độ yêu cầu khảo sát lại */}
              {isRevisionMode && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Nội dung yêu cầu Tổ khảo sát đo đạc lại hoặc bổ sung:</span>
                  </div>
                  <textarea
                    rows={2}
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Ví dụ: Kích thước độ sâu chưa chuẩn xác, yêu cầu kiểm tra lại bề rộng rãnh nứt..."
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-amber-300 text-xs text-slate-800 focus:outline-hidden"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRevisionMode(false)}
                      className="px-3 py-1 rounded text-slate-600 hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={isRejectingSurvey}
                      onClick={() => handleAdminRejectInspection(reviewTask.id)}
                      className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                    >
                      {isRejectingSurvey ? 'Đang gửi...' : 'Xác nhận gửi yêu cầu'}
                    </button>
                  </div>
                </div>
              )}

              {/* Các nút hành động của Admin */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <Link
                  to={`/incidents/${reviewTask.id}`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem hồ sơ gốc đầy đủ</span>
                </Link>

                <div className="flex items-center gap-2">
                  {!isRevisionMode && (
                    <button
                      type="button"
                      onClick={() => setIsRevisionMode(true)}
                      className="px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-xs flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Yêu cầu khảo sát lại</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isApprovingSurvey}
                    onClick={() => handleAdminApproveInspection(reviewTask.id)}
                    className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isApprovingSurvey ? 'Đang duyệt...' : 'Phê duyệt phương án'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
