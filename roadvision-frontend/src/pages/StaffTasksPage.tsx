import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category, Severity, EvidenceStage } from '../types';
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
  Compass,
  HardHat,
  Camera,
  Layers,
  Send,
  Navigation,
  RefreshCw,
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

  // Modal Báo cáo khảo sát hiện trường (Giai đoạn 4)
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
  const [surveyPhotos, setSurveyPhotos] = useState<File[]>([]);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState<boolean>(false);

  // Modal Tải ảnh bằng chứng thi công (Giai đoạn 6)
  const [selectedEvidenceTask, setSelectedEvidenceTask] = useState<Incident | null>(null);
  const [evidenceStage, setEvidenceStage] = useState<EvidenceStage>('BEFORE_WORK');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState<boolean>(false);

  // Modal Nộp xin nghiệm thu (Giai đoạn 6c)
  const [selectedAcceptanceTask, setSelectedAcceptanceTask] = useState<Incident | null>(null);
  const [acceptanceNotes, setAcceptanceNotes] = useState<string>('Đã thi công xong theo đúng hồ sơ thiết kế và đạt chuẩn độ bằng phẳng');
  const [isSubmittingAcceptance, setIsSubmittingAcceptance] = useState<boolean>(false);

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

  // Giai đoạn 4: Bắt đầu khảo sát
  const handleStartInspection = async (taskId: number) => {
    try {
      await incidentApi.startInspection(taskId);
      toast.info('Đã xác nhận có mặt tại hiện trường và bắt đầu khảo sát!', 'Bắt đầu khảo sát');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'INSPECTING' as IncidentStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể bắt đầu khảo sát', 'Lỗi');
    }
  };

  // Giai đoạn 4: Mở modal nộp báo cáo khảo sát
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
          toast.success('Đã lấy tọa độ GPS chính xác từ thiết bị!', 'Định vị GPS');
        },
        () => {
          toast.warning('Không thể truy cập GPS từ trình duyệt.');
        }
      );
    }
  };

  // Giai đoạn 4: Submit báo cáo khảo sát
  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurveyTask) return;

    setIsSubmittingSurvey(true);
    try {
      const dataPayload = {
        actualLatitude: surveyLatitude,
        actualLongitude: surveyLongitude,
        confirmedCategory,
        actualSeverity,
        estimatedLengthM,
        estimatedWidthM,
        estimatedDepthCm,
        trafficImpact,
        proposedSolution,
        notes: surveyNotes,
      };

      const fd = new FormData();
      fd.append('data', new Blob([JSON.stringify(dataPayload)], { type: 'application/json' }));
      surveyPhotos.forEach((file) => {
        fd.append('photos', file);
      });

      await incidentApi.submitInspectionReport(selectedSurveyTask.id, fd);
      toast.success('Đã nộp biên bản khảo sát hiện trường thành công! Hồ sơ chuyển sang Admin duyệt thi công.', 'Hoàn tất khảo sát');
      fetchTasks(page, pageSize);
      setSelectedSurveyTask(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi báo cáo khảo sát', 'Lỗi');
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  // Giai đoạn 6: Bắt đầu thi công
  const handleStartConstruction = async (taskId: number) => {
    try {
      await incidentApi.startConstruction(taskId);
      toast.info('Đã bắt đầu triển khai thi công tại hiện trường!', 'Bắt đầu thi công');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'IN_PROGRESS' as IncidentStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể bắt đầu thi công', 'Lỗi');
    }
  };

  // Giai đoạn 6b: Submit ảnh bằng chứng
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidenceTask || !evidenceFile) {
      toast.warning('Vui lòng chọn ảnh chụp hiện trường');
      return;
    }

    setIsSubmittingEvidence(true);
    try {
      const fd = new FormData();
      fd.append('stage', evidenceStage);
      fd.append('file', evidenceFile);
      if (evidenceNotes) fd.append('notes', evidenceNotes);
      if (selectedEvidenceTask.latitude) fd.append('latitude', selectedEvidenceTask.latitude.toString());
      if (selectedEvidenceTask.longitude) fd.append('longitude', selectedEvidenceTask.longitude.toString());

      await incidentApi.uploadEvidence(selectedEvidenceTask.id, fd);
      toast.success(`Đã tải lên bằng chứng giai đoạn [${evidenceStage}]!`, 'Tải lên thành công');
      setSelectedEvidenceTask(null);
      setEvidenceFile(null);
      setEvidenceNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải lên ảnh bằng chứng', 'Lỗi');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Giai đoạn 6c: Xin nghiệm thu
  const handleSubmitAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcceptanceTask) return;

    setIsSubmittingAcceptance(true);
    try {
      await incidentApi.submitAcceptance(selectedAcceptanceTask.id, { notes: acceptanceNotes });
      toast.success('Đã gửi hồ sơ nghiệm thu thành công! Chờ Admin thẩm định chất lượng.', 'Chờ nghiệm thu');
      fetchTasks(page, pageSize);
      setSelectedAcceptanceTask(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi hồ sơ nghiệm thu', 'Lỗi');
    } finally {
      setIsSubmittingAcceptance(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'INSPECTION') return ['INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED'].includes(t.status);
    if (filter === 'CONSTRUCTION') return ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(t.status);
    if (filter === 'PENDING_ACCEPTANCE') return ['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(t.status);
    if (filter === 'DONE') return ['RESOLVED', 'CLOSED'].includes(t.status);
    return true;
  });

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>Nhiệm vụ tổ đội & kỹ thuật hiện trường</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Bảng điều hành công tác hiện trường
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các sự cố được phân công: Khảo sát thực trạng, đo đạc thông số, triển khai thi công và nộp bằng chứng nghiệm thu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-md bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="text-xs text-slate-500">Tổng nhiệm vụ được giao:</span>
            <span className="text-sm font-bold text-slate-900 leading-none">{totalElements}</span>
          </div>
        </div>
      </div>

      {/* Thanh Lọc Theo Giai Đoạn */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Tất cả nhiệm vụ', count: tasks.length },
          { id: 'INSPECTION', label: 'Khảo sát hiện trường', count: tasks.filter((t) => ['INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED'].includes(t.status)).length },
          { id: 'CONSTRUCTION', label: 'Thi công sửa chữa', count: tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(t.status)).length },
          { id: 'PENDING_ACCEPTANCE', label: 'Chờ nghiệm thu', count: tasks.filter((t) => ['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(t.status)).length },
          { id: 'DONE', label: 'Đã hoàn tất', count: tasks.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length },
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
                className={`p-5 rounded-lg border shadow-xs flex flex-col justify-between gap-4 transition-colors ${
                  ['RESOLVED', 'CLOSED'].includes(task.status)
                    ? 'bg-linear-to-b from-emerald-50/20 to-white border-emerald-300/80 hover:border-emerald-400'
                    : task.status === 'REWORK_REQUIRED'
                    ? 'bg-linear-to-b from-rose-50/20 to-white border-rose-300 hover:border-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
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

                    {/* Hiển thị Tổ phụ trách */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 mt-1">
                      {task.inspectionTeamName && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                          Khảo sát: {task.inspectionTeamName}
                        </span>
                      )}
                      {task.assignedTeamName && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Thi công: {task.assignedTeamName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phương án thi công đã duyệt nếu có */}
                {task.workPlan && (
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700">Phương án thi công: </span>
                    <span className="text-slate-600">{task.workPlan}</span>
                  </div>
                )}

                {/* Trạng thái yêu cầu thi công lại (Phân biệt rõ: Đang bắt làm lại vs Đang làm vs Đã làm xong đạt chuẩn) */}
                {Boolean(task.reworkCount && task.reworkCount > 0) && (
                  <>
                    {/* TRƯỜNG HỢP 1: Đang bị yêu cầu làm lại khẩn cấp (Chưa đạt) */}
                    {task.status === 'REWORK_REQUIRED' && (
                      <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-md text-xs flex flex-col gap-1.5 shadow-2xs">
                        <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Yêu cầu thi công lại khẩn cấp (Lần #{task.reworkCount})</span>
                        </div>
                        {task.reworkReason && (
                          <p className="text-rose-700 italic font-medium bg-rose-100/60 p-2 rounded border border-rose-200">
                            "{task.reworkReason}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* TRƯỜNG HỢP 2: Đang triển khai khắc phục lại tại hiện trường */}
                    {['ASSIGNED', 'IN_PROGRESS'].includes(task.status) && (
                      <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-md text-xs flex flex-col gap-1.5">
                        <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-spin" />
                          <span>Đang khắc phục thi công lại (Lần #{task.reworkCount})</span>
                        </div>
                        {task.reworkReason && (
                          <p className="text-slate-600 italic">Chỉ đạo: "{task.reworkReason}"</p>
                        )}
                      </div>
                    )}

                    {/* TRƯỜNG HỢP 3: Đã khắc phục và nghiệm thu hoàn thành đạt chuẩn */}
                    {['RESOLVED', 'CLOSED'].includes(task.status) && (
                      <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-md text-xs flex items-start gap-2 text-emerald-900 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                            <span>Đã khắc phục & nghiệm thu đạt chuẩn (Sau lần thi công lại #{task.reworkCount})</span>
                          </div>
                          {task.reworkReason && (
                            <p className="text-slate-600 text-[11px] mt-0.5 italic">
                              Đã xử lý dứt điểm theo chỉ đạo: "{task.reworkReason}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Thao tác kỹ thuật theo từng giai đoạn */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('vi-VN') : 'Mới giao'}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Giai đoạn 4a: Tiếp cận hiện trường */}
                    {task.status === 'INSPECTION_ASSIGNED' && (
                      <button
                        onClick={() => handleStartInspection(task.id)}
                        className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Bắt đầu khảo sát</span>
                      </button>
                    )}

                    {/* Giai đoạn 4b: Nộp biên bản khảo sát */}
                    {task.status === 'INSPECTING' && (
                      <button
                        onClick={() => handleOpenSurveyModal(task)}
                        className="px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Lập biên bản khảo sát</span>
                      </button>
                    )}

                    {/* Giai đoạn 4 -> 5: Đã khảo sát xong, chờ Admin giao thi công */}
                    {task.status === 'INSPECTED' && (
                      <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                        Đã xong khảo sát • Chờ giao thi công
                      </span>
                    )}

                    {/* Giai đoạn 6a: Bắt đầu thi công */}
                    {task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartConstruction(task.id)}
                        className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Bắt đầu thi công</span>
                      </button>
                    )}

                    {/* Giai đoạn 6b & 6c: Tải ảnh bằng chứng & Gửi nghiệm thu */}
                    {['IN_PROGRESS', 'REWORK_REQUIRED'].includes(task.status) && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedEvidenceTask(task);
                            setEvidenceStage(task.status === 'REWORK_REQUIRED' ? 'REWORK' : 'BEFORE_WORK');
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-blue-600" />
                          <span>Nộp ảnh bằng chứng</span>
                        </button>
                        <button
                          onClick={() => setSelectedAcceptanceTask(task)}
                          className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi nghiệm thu</span>
                        </button>
                      </>
                    )}

                    {/* Giai đoạn 7: Đang chờ Admin duyệt */}
                    {['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(task.status) && (
                      <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                        Chờ Admin thẩm định
                      </span>
                    )}

                    {['RESOLVED', 'CLOSED'].includes(task.status) && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã hoàn tất</span>
                      </span>
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

      {/* MODAL 1: BÁO CÁO KHẢO SÁT HIỆN TRƯỜNG (GIAI ĐOẠN 4) */}
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
              {/* Vị trí GPS & Lấy vị trí */}
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

              {/* Loại hư hỏng & Mức độ */}
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

              {/* Đo đạc kích thước thực tế */}
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
              </div>

              {/* Đề xuất phương án */}
              <div>
                <label className="block font-medium mb-1 text-slate-700">Đề xuất phương án xử lý kỹ thuật *</label>
                <textarea
                  rows={2}
                  value={proposedSolution}
                  required
                  onChange={(e) => setProposedSolution(e.target.value)}
                  placeholder="Ví dụ: Cào bóc 4cm, tưới nhựa dính bám 0.5kg/m2, thảm bù BTN C12.5 đầm lèn K98..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                />
              </div>

              {/* Ảnh chụp hiện trường */}
              <div>
                <label className="block font-medium mb-1 text-slate-700">Ảnh chụp hiện trạng tại hiện trường</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSurveyPhotos(Array.from(e.target.files));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-medium mb-1 text-slate-700">Nhận xét & Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={surveyNotes}
                  onChange={(e) => setSurveyNotes(e.target.value)}
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
                  type="submit"
                  disabled={isSubmittingSurvey}
                  className="px-4 py-1.5 rounded-md bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingSurvey ? 'Đang gửi biên bản...' : 'Gửi biên bản khảo sát'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TẢI LÊN ẢNH BẰNG CHỨNG THI CÔNG (GIAI ĐOẠN 6) */}
      {selectedEvidenceTask && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Nộp ảnh bằng chứng thi công</span>
              </div>
              <button
                onClick={() => setSelectedEvidenceTask(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="p-6 flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-700">Mốc thi công tương ứng *</label>
                <select
                  value={evidenceStage}
                  onChange={(e) => setEvidenceStage(e.target.value as EvidenceStage)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                >
                  <option value="BEFORE_WORK">1. BEFORE_WORK - Trước thi công (Hiện trạng cọc tiêu, rào chắn)</option>
                  <option value="PROGRESS">2. PROGRESS - Đang thi công (Cào bóc, lu lèn)</option>
                  <option value="AFTER_WORK">3. AFTER_WORK - Sau hoàn thành (Mặt đường thảm mới)</option>
                  <option value="REWORK">4. REWORK - Bằng chứng sửa lại theo lệnh Admin</option>
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
                <label className="block font-medium mb-1 text-slate-700">Ghi chú bằng chứng</label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Mô tả công việc tại mốc này (ví dụ: Đã tưới dính bám 0.5kg/m2)..."
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
                  <span>{isSubmittingEvidence ? 'Đang tải lên...' : 'Lưu bằng chứng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XIN NGHIỆM THU CÔNG TRÌNH (GIAI ĐOẠN 6c) */}
      {selectedAcceptanceTask && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Gửi hồ sơ nghiệm thu tới Quản trị viên</span>
              </div>
              <button
                onClick={() => setSelectedAcceptanceTask(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAcceptance} className="p-6 flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col gap-1">
                <span className="font-semibold text-slate-800">Sự cố: {selectedAcceptanceTask.title}</span>
                <span className="text-slate-500">Mã phiếu: {selectedAcceptanceTask.ticketCode}</span>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Báo cáo hoàn thành & Ghi chú nghiệm thu *</label>
                <textarea
                  rows={3}
                  value={acceptanceNotes}
                  required
                  onChange={(e) => setAcceptanceNotes(e.target.value)}
                  placeholder="Xác nhận hoàn thành các hạng mục, bề mặt êm thuận, an toàn giao thông..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedAcceptanceTask(null)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAcceptance}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingAcceptance ? 'Đang gửi...' : 'Xác nhận nộp nghiệm thu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
