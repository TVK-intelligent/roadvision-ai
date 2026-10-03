import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { Timeline } from '../components/Timeline';
import { StatusBadge } from '../components/StatusBadge';
import { ImageCanvasWithBBox } from '../components/ImageCanvasWithBBox';
import { LeafletMap } from '../components/LeafletMap';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { useToast } from '../components/Toast';
import { ArrowLeft, CheckCircle2, Star, Upload, Hammer, ThumbsUp, AlertCircle, ShieldCheck, Eye, EyeOff, RotateCcw, AlertTriangle, ShieldAlert, Info, Clock } from 'lucide-react';

export const IncidentDossierPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpvoting, setIsUpvoting] = useState<boolean>(false);

  // Trạng thái Khiếu nại (Citizen) & Lệnh thi công lại (Admin)
  const [adminDecision, setAdminDecision] = useState<'APPROVE' | 'REWORK'>('APPROVE');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [reworkInstructions, setReworkInstructions] = useState<string>('');
  const [isSubmittingRework, setIsSubmittingRework] = useState<boolean>(false);
  const [showDefectBoxes, setShowDefectBoxes] = useState<boolean>(false);

  const fetchDossier = () => {
    if (!id) return;
    setLoading(true);
    incidentApi.getIncidentById(id)
      .then((res) => {
        setIncident(res.data);
      })
      .catch(() => {
        setIncident(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDossier();
  }, [id]);

  const handleUpvote = async () => {
    if (!incident) return;
    if (!isAuthenticated || !user) {
      setIsAuthModalOpen(true);
      toast.warning('Vui lòng đăng nhập tài khoản Công Dân để đồng tình sự cố này.');
      return;
    }
    setIsUpvoting(true);
    try {
      const res = await incidentApi.upvoteIncident(incident.id);
      setIncident(res.data);
      toast.success('Đã gửi lượt đồng tình (+1 Upvote)! Mức độ ưu tiên đã được cập nhật.', 'Cộng Đồng Đồng Tình');
    } catch (e: any) {
      toast.info(e.response?.data?.message || 'Bạn đã đồng tình với phản ánh này rồi.');
    } finally {
      setIsUpvoting(false);
    }
  };

  // Staff chuyển sang IN_PROGRESS
  const handleStartRepair = async () => {
    if (!incident) return;
    try {
      await incidentApi.updateStatus(incident.id, 'IN_PROGRESS');
      toast.info('Đã chuyển trạng thái sang Đang thi công!', 'Bắt Đầu Xử Lý');
    } catch (e: any) {
      toast.error('Lỗi khi cập nhật trạng thái', 'Lỗi');
    }
    setIncident({ ...incident, status: 'IN_PROGRESS' });
  };

  // Staff nộp ảnh nghiệm thu (Proof of Work)
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !proofFile) {
      toast.warning('Vui lòng chọn ảnh chụp hiện trường hoàn thiện');
      return;
    }

    const formData = new FormData();
    formData.append('proofImage', proofFile);
    formData.append('notes', proofNotes);

    try {
      const res = await incidentApi.resolveIncident(incident.id, formData);
      const updated = res.data;
      if (updated.resolution?.aiVerificationStatus === 'AI_VERIFIED_CLEAN') {
        toast.success('AI đã thẩm định đạt chuẩn: Mặt đường đã được hoàn trả phẳng phiu!', 'AI Thẩm Định Đạt Chuẩn');
      } else if (updated.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS') {
        toast.warning(updated.resolution.aiVerificationNotes || 'Cảnh báo AI: Phát hiện dấu hiệu hư hỏng còn sót lại!', 'Cảnh Báo Kiểm Định AI');
      } else {
        toast.success('Đã nộp ảnh nghiệm thu hoàn tất!', 'Nghiệm Thu Thành Công');
      }
      setIncident(updated);
    } catch (e: any) {
      toast.error('Lỗi khi nộp ảnh nghiệm thu', 'Lỗi');
    }
  };

  // Citizen / Admin chấm điểm và đóng phiếu
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;

    try {
      const res = await incidentApi.closeIncident(incident.id, { rating, comments: feedbackComments });
      toast.success('Cảm ơn bạn đã đánh giá! Hồ sơ sự cố đã được đóng và lưu trữ hoàn tất.', 'Hoàn Tất');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi gửi đánh giá hoặc bạn không có quyền đóng sự cố này', 'Lỗi');
    }
  };

  // Citizen gửi khiếu nại (Dispute)
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    if (!disputeReason.trim()) {
      toast.warning('Vui lòng nhập lý do khiếu nại chưa đạt chuẩn');
      return;
    }

    setIsSubmittingDispute(true);
    try {
      const res = await incidentApi.disputeIncident(incident.id, { reason: disputeReason, rating });
      toast.success('Đã gửi khiếu nại lên Ban Quản Lý! Sự cố đang chờ thẩm định để yêu cầu thi công lại.', 'Khiếu Nại Đã Gửi');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi gửi khiếu nại', 'Lỗi');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Admin ra lệnh thi công lại (Rework)
  const handleReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    if (!reworkInstructions.trim()) {
      toast.warning('Vui lòng nhập chỉ đạo thi công bổ sung');
      return;
    }

    setIsSubmittingRework(true);
    try {
      const res = await incidentApi.reworkIncident(incident.id, { instructions: reworkInstructions, priority: 'HIGH' });
      toast.success('Đã phát lệnh yêu cầu kỹ thuật viên thi công lại! Trạng thái đã chuyển về IN_PROGRESS.', 'Lệnh Tái Thi Công');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi phát lệnh thi công lại', 'Lỗi');
    } finally {
      setIsSubmittingRework(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-on-surface-variant font-medium">Đang nạp hồ sơ sự cố...</div>;
  }

  if (!incident) {
    return (
      <div className="p-8 max-w-md mx-auto my-12 bg-white rounded-lg border border-slate-200 text-center flex flex-col items-center gap-3 shadow-xs">
        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg border border-rose-200">✕</div>
        <div>
          <h2 className="font-semibold text-base text-slate-900">Không tìm thấy hồ sơ sự cố</h2>
          <p className="text-xs text-slate-500 mt-1">Sự cố này không tồn tại trong hệ thống hoặc đã được dọn dẹp sạch sẽ.</p>
        </div>
        <Link
          to="/report"
          className="mt-2 px-4 py-2 rounded-md bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs"
        >
          Tạo báo cáo mới
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-3">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/my-reports"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách sự cố</span>
        </Link>
        <span className="font-mono text-xs text-slate-500">
          Mã phản ánh: #{incident.ticketCode}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge status={incident.status} />
            <span className="font-mono text-xs font-semibold text-slate-700">TICKET: {incident.ticketCode}</span>
            <span className="text-xs text-slate-500 font-mono">
              Báo cáo: {new Date(incident.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{incident.title}</h1>
          <p className="text-xs text-slate-600">{incident.address}</p>
        </div>

        {/* Nút & Huy Hiệu Đồng Tình (Upvote) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleUpvote}
            disabled={isUpvoting || incident.status === 'RESOLVED' || incident.status === 'CLOSED'}
            className="px-3.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60 shadow-xs"
            title="Bấm đồng tình để tăng cấp độ khẩn cấp xử lý"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{incident.upvoteCount || 1} Đồng tình</span>
          </button>
        </div>
      </div>

      {/* Stepper Tiến Độ 5 Pha Chuẩn */}
      <Timeline
        status={incident.status}
        isRework={Boolean(incident.reworkReason || (incident.reworkCount && incident.reworkCount > 0))}
        reworkCount={incident.reworkCount}
        isDisputed={incident.flag === 'DISPUTED'}
      />

      {/* Bố cục 2 Cột Đối Chiếu */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Cột Trái: Ảnh AI và Bounding Box (6 Cột) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Hiện trường sự cố & Hộp bao AI</span>
              <span className="font-mono text-xs font-medium text-blue-700">
                {incident.aiDetection && incident.aiDetection.className !== 'NONE'
                  ? (() => {
                      const boxes = incident.aiDetection.boxes || [];
                      const counts: Record<string, number> = {};
                      for (const b of boxes) {
                        counts[b.className] = (counts[b.className] || 0) + 1;
                      }
                      const parts: string[] = [];
                      if (counts['POTHOLE']) parts.push(`${counts['POTHOLE']} Ổ gà`);
                      if (counts['ROAD_CRACK']) parts.push(`${counts['ROAD_CRACK']} Vết nứt`);
                      if (counts['ROAD_FLOODING']) parts.push(`${counts['ROAD_FLOODING']} Ngập úng`);
                      if (counts['ROAD_OBSTACLE']) parts.push(`${counts['ROAD_OBSTACLE']} Vật cản`);

                      if (parts.length > 1) {
                        return `YOLOv8 Đa sự cố: ${parts.join(' & ')} (${(incident.aiDetection.confidence * 100).toFixed(1)}%)`;
                      }
                      const singleName = incident.aiDetection.className === 'POTHOLE' ? 'Ổ gà' :
                        incident.aiDetection.className === 'ROAD_CRACK' ? 'Vết nứt' :
                        incident.aiDetection.className === 'ROAD_FLOODING' ? 'Ngập úng' :
                        incident.aiDetection.className === 'ROAD_OBSTACLE' ? 'Vật cản' : incident.aiDetection.className;
                      return `YOLOv8: ${boxes.length > 1 ? `${boxes.length} vị trí ` : ''}${singleName} (${(incident.aiDetection.confidence * 100).toFixed(1)}%)`;
                    })()
                  : 'YOLOv8: Không phát hiện hư hại'}
              </span>
            </div>

            <ImageCanvasWithBBox
              imageUrl={incident.imageUrl}
              aiDetection={incident.aiDetection}
              className="min-h-[360px] md:h-[420px] w-full rounded-md overflow-hidden border border-slate-200"
            />

            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100">
              <span className="font-semibold text-slate-800">Mô tả: </span>
              {incident.description}
            </div>
          </div>
        </div>

        {/* Cột Phải: Bản đồ GIS và Vị trí (6 Cột) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Bản đồ không gian hiện trường</span>
              <span className="font-mono text-xs text-slate-500 font-medium">OpenStreetMap</span>
            </div>

            <LeafletMap
              latitude={Number(incident.latitude)}
              longitude={Number(incident.longitude)}
              popupTitle={incident.ticketCode}
              className="h-72 w-full rounded-md border border-slate-200 overflow-hidden"
            />

            <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100">
              <span>Người báo cáo: {incident.reporterName || 'Ẩn danh'}</span>
              <span>SĐT: {incident.reporterPhone || 'Chưa cung cấp'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực Hành Động Nghiệp Vụ Theo Vai Trò */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-slate-900">Hành động khắc phục và nghiệm thu</h3>

        {/* PHA 4.1: TRẠNG THÁI ASSIGNED */}
        {incident.status === 'ASSIGNED' && (
          user?.role === 'ROLE_STAFF' ? (
            <div className="flex items-center justify-between bg-blue-50 p-3.5 rounded-lg border border-blue-200">
              <div>
                <div className="font-semibold text-xs text-blue-900">Nhiệm vụ đã được phân công cho bạn</div>
                <div className="text-xs text-slate-600 mt-0.5">Xác nhận khi bạn đã có mặt tại hiện trường để bắt đầu</div>
              </div>
              <button
                onClick={handleStartRepair}
                className="px-3.5 py-1.5 rounded-md bg-blue-600 text-white font-medium text-xs shadow-xs hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Bắt đầu xử lý</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div className="font-medium text-xs text-slate-800">
                    Đã điều phối cho kỹ thuật viên: <span className="text-blue-700 font-semibold">{incident.assignment?.assignedToStaffName || 'Đội kỹ thuật'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống đang chờ kỹ thuật viên di chuyển đến hiện trường và kích hoạt trạng thái thi công.
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                CHỜ CÓ MẶT
              </span>
            </div>
          )
        )}

        {/* PHA 4.2: TRẠNG THÁI IN_PROGRESS */}
        {incident.status === 'IN_PROGRESS' && (
          <div className="flex flex-col gap-4">
            {/* ĐỐI CHIẾU SONG SONG ẢNH A VÀ ẢNH B KHI ĐANG TÁI THI CÔNG (REWORK) */}
            {incident.resolution?.proofImageUrl && (
              <div className="flex flex-col gap-3 p-4 rounded-lg bg-rose-50/50 border border-rose-200 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Hồ sơ tái thi công: Đối chiếu hiện trạng gốc và lần sửa chưa đạt</span>
                  </div>
                  {incident.reworkCount && (
                    <span className="text-[11px] font-mono text-rose-700 font-medium bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                      Tái thi công lần #{incident.reworkCount}
                    </span>
                  )}
                </div>

                {/* Khung 2 ảnh song song Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Cột 1: Ảnh A - Người dân chụp ban đầu kèm Bounding Box AI */}
                  <div className="flex flex-col gap-2 p-3 rounded-md bg-white border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">A</span>
                        Ảnh gốc ban đầu (Phản ánh)
                      </span>
                      {incident.aiDetection?.confidence ? (
                        <span className="text-[10px] font-mono text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          AI: {(incident.aiDetection.confidence * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">Hiện trạng gốc</span>
                      )}
                    </div>

                    <div className="relative rounded overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                      <ImageCanvasWithBBox
                        imageUrl={incident.imageUrl}
                        aiDetection={incident.aiDetection}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 italic">
                      Hộp bao AI ban đầu xác định vị trí và quy mô hư hỏng gốc.
                    </span>
                  </div>

                  {/* Cột 2: Ảnh B - Ảnh thợ đã sửa nhưng bị bắt lỗi */}
                  <div className="flex flex-col gap-2 p-3 rounded-md bg-white border border-rose-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-rose-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">B</span>
                        Ảnh nghiệm thu vừa qua (Chưa đạt)
                      </span>
                      <span className="text-[10px] font-mono text-rose-700 font-medium bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        AI CẢNH BÁO
                      </span>
                    </div>

                    <div className="relative rounded overflow-hidden border border-rose-200 bg-slate-100 aspect-video">
                      <ImageCanvasWithBBox
                        imageUrl={incident.resolution.proofImageUrl}
                        aiDetection={{
                          className: 'DEFECT_REMAINS',
                          confidence: Number(incident.resolution.aiVerificationConfidence) || 0.85,
                          bboxX: 0,
                          bboxY: 0,
                          bboxWidth: 0,
                          bboxHeight: 0,
                          inferenceMs: 0,
                          boxes: incident.resolution.verificationBoxes || (incident.resolution.aiVerificationDetectionsJson ? JSON.parse(incident.resolution.aiVerificationDetectionsJson) : [])
                        }}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[11px] text-rose-700 font-medium">
                      {incident.resolution.aiVerificationNotes || 'Khung viền màu đánh dấu các vị trí hư hỏng còn sót lại cần xử lý dứt điểm.'}
                    </span>
                  </div>
                </div>

                {/* Lời chỉ đạo của Admin */}
                {incident.reworkReason && (
                  <div className="p-2.5 rounded-md bg-rose-100/60 border border-rose-200 text-rose-900 text-xs leading-relaxed">
                    <strong>Chỉ đạo thi công từ Ban Quản lý:</strong> "{incident.reworkReason}"
                  </div>
                )}
              </div>
            )}

            {/* FORM HOẶC THẺ TIẾN ĐỘ TÙY THEO VAI TRÒ */}
            {user?.role === 'ROLE_STAFF' ? (
              <form onSubmit={handleResolveSubmit} className="flex flex-col gap-3.5 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                <div className="font-semibold text-xs text-blue-900 flex items-center gap-2">
                  <Hammer className="w-4 h-4 text-blue-700" />
                  <span>
                    {incident.reworkCount && incident.reworkCount > 0
                      ? `Nộp ảnh nghiệm thu mới sau khi đã khắc phục lại (Lần ${incident.reworkCount + 1})`
                      : 'Nộp ảnh nghiệm thu hiện trường hoàn thiện'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ảnh chụp sau khi hoàn tất sửa chữa</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-white file:text-slate-700 hover:file:bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ghi chú vật liệu & biện pháp khắc phục</label>
                    <input
                      type="text"
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      placeholder="Ví dụ: Đã trám phẳng bằng bê tông nhựa nguội, lu lèn chặt..."
                      className="w-full px-3 py-1.5 text-xs rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="self-end px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận nghiệm thu</span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                    <span className="font-semibold text-xs text-slate-900">
                      Đội kỹ thuật đang thi công xử lý hiện trường
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    Phụ trách: {incident.assignment?.assignedToStaffName || incident.resolution?.staffName || 'Đội kỹ thuật'}
                  </span>
                </div>

                {incident.reworkReason && (
                  <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <strong>Đang thi công lại theo chỉ đạo:</strong> "{incident.reworkReason}"
                    {incident.reworkCount && (
                      <span className="ml-2 font-mono text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        Lần {incident.reworkCount}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">
                  Kỹ thuật viên đang có mặt tại hiện trường để san phẳng và khắc phục triệt để các hư hỏng mặt đường. Sau khi hoàn thành, ảnh nghiệm thu mới sẽ được tải lên để AI và Quản trị viên thẩm định.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Người dân (Citizen) đối chiếu ảnh Trước/Sau & Đóng sự cố hoặc Khiếu nại */}
        {incident.status === 'RESOLVED' && (
          <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đối chiếu tương tác Trước & Sau thi công
              </span>
              <span className="text-xs font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                Kỹ thuật viên: {incident.resolution?.staffName || 'Đội kỹ thuật'}
              </span>
            </div>

            {/* Thông báo cờ tranh chấp nếu đang có khiếu nại */}
            {incident.flag === 'DISPUTED' && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-xs uppercase tracking-wide text-rose-800">
                    Sự cố đang bị khiếu nại chất lượng nghiệm thu
                  </div>
                  <p className="text-xs text-rose-900 mt-1">
                    <strong>Nội dung:</strong> "{incident.reworkReason || 'Mặt đường chưa khắc phục triệt để.'}"
                  </p>
                  <div className="text-[11px] text-slate-600 mt-0.5 italic">
                    Hồ sơ đang chờ Ban Quản lý thẩm định để chỉ đạo thi công lại nếu cần.
                  </div>
                </div>
              </div>
            )}

            {/* Thẻ Kết QuẢ Kiểm Định Chất Lượng AI (AI Quality Verification) */}
            {incident.resolution?.aiVerificationStatus && (
              <div
                className={`p-3.5 rounded-lg border flex items-start gap-2.5 transition-colors ${
                  incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs">
                      {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Thẩm định nghiệm thu AI: Đạt chuẩn hoàn trả mặt đường'
                        : 'Cảnh báo kiểm định AI: Phát hiện dấu hiệu hư hỏng còn sót lại'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-medium border ${
                        incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {incident.resolution.aiVerificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {incident.resolution.aiVerificationNotes ||
                      (incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Mặt đường sau thi công đã được trám phẳng, không còn hố sụt hoặc vết nứt kết cấu.'
                        : 'AI phát hiện các đường rãnh hoặc điểm lún còn sót trên ảnh chụp nghiệm thu.')}
                  </p>

                  {/* Nút bật/tắt hiển thị khung lỗi AI */}
                  {incident.resolution.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS' && (
                    <button
                      type="button"
                      onClick={() => setShowDefectBoxes(!showDefectBoxes)}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-medium border border-amber-200 transition-colors"
                    >
                      {showDefectBoxes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showDefectBoxes ? 'Ẩn khung lỗi AI' : 'Xem chi tiết khung phát hiện AI'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hiển thị lớp phủ Bounding Box AI hoặc Khung thanh trượt Before & After */}
            {showDefectBoxes && incident.resolution?.proofImageUrl ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-mono text-slate-600 flex items-center justify-between">
                  <span className="font-semibold text-amber-700">Vị trí cần xử lý lại phát hiện bởi AI:</span>
                  <span>Mô hình: YOLOv8-RoadCare Active</span>
                </div>
                <ImageCanvasWithBBox
                  imageUrl={incident.resolution.proofImageUrl}
                  aiDetection={{
                    className: 'DEFECT_REMAINS',
                    confidence: Number(incident.resolution.aiVerificationConfidence) || 0.85,
                    bboxX: 0,
                    bboxY: 0,
                    bboxWidth: 0,
                    bboxHeight: 0,
                    inferenceMs: 0,
                    boxes: incident.resolution.verificationBoxes || (incident.resolution.aiVerificationDetectionsJson ? JSON.parse(incident.resolution.aiVerificationDetectionsJson) : [])
                  }}
                  className="min-h-[400px] w-full rounded-md border border-slate-200 overflow-hidden"
                />
              </div>
            ) : incident.resolution?.proofImageUrl ? (
              <BeforeAfterSlider
                beforeImageUrl={incident.imageUrl}
                afterImageUrl={incident.resolution.proofImageUrl}
                className="min-h-[420px] w-full"
              />
            ) : (
              <div className="min-h-[220px] w-full rounded-md border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Clock className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Chưa có ảnh nghiệm thu hoàn thiện</span>
                <span className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Đang chờ tổ kỹ thuật viên hiện trường thi công và nộp ảnh đối chứng sau xử lý.
                </span>
              </div>
            )}

            {/* PHÂN QUYỀN VÀ THẨM QUYỀN ĐÁNH GIÁ NGHIỆM THU (RESOLVED) */}

            {/* 1. NẾU LÀ KỸ THUẬT VIÊN (STAFF) - KHÔNG ĐƯỢC TỰ ĐÁNH GIÁ SẢN PHẨM CỦA MÌNH */}
            {user?.role === 'ROLE_STAFF' ? (
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex items-start gap-3 shadow-xs">
                <div className="p-2 rounded-md bg-blue-50 text-blue-600 shrink-0 mt-0.5 border border-blue-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                    <span>Đã hoàn thành thi công và chờ nghiệm thu độc lập</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-medium border border-slate-200">Kỹ thuật viên</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Bạn đang đăng nhập với tài khoản <span className="font-medium text-slate-800">Kỹ thuật viên thi công</span>. Theo nguyên tắc khách quan, kỹ thuật viên không tự chấm điểm hoặc tự đóng hồ sơ của chính mình.
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Hồ sơ đang chờ người dân tạo phản ánh (<b>{incident.reporterName || 'Người dân'}</b>) hoặc Quản trị viên Ban Quản lý xác nhận hoàn tất.</span>
                  </div>
                </div>
              </div>
            ) : (user?.role === 'ROLE_ADMIN' || (user?.role === 'ROLE_CITIZEN' && incident.citizenId === user?.id)) ? (
              /* 2. NẾU LÀ QUẢN TRỊ VIÊN HOẶC CHÍNH CÔNG DÂN TẠO BÁO CÁO */
              <div className="flex flex-col gap-3">
                {user?.role === 'ROLE_ADMIN' ? (
                  /* BẢNG THẨM ĐỊNH NGHIỆM THU ĐIỀU PHỐI (ADMIN REVIEW PANEL) */
                  <div className="p-4 rounded-lg bg-white border border-slate-200 flex flex-col gap-3.5 shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-xs text-slate-900">Thẩm quyền Quản trị viên: Quyết định nghiệm thu</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Admin Dispatcher
                      </span>
                    </div>

                    {/* Bộ chuyển đổi quyết định trực quan (Segmented Toggle) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-md border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setAdminDecision('APPROVE')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs transition-colors ${
                          adminDecision === 'APPROVE'
                            ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>1. Nghiệm thu đạt và đóng sự cố</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminDecision('REWORK')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs transition-colors ${
                          adminDecision === 'REWORK'
                            ? 'bg-white text-rose-700 font-semibold shadow-xs border border-rose-200'
                            : 'text-slate-600 hover:text-rose-700 font-medium'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>2. Chưa đạt - Yêu cầu thi công lại</span>
                      </button>
                    </div>

                    {/* Nội dung form theo quyết định */}
                    {adminDecision === 'APPROVE' ? (
                      /* KỊCH BẢN 1: DUYỆT ĐẠT CHUẨN & ĐÓNG PHIẾU */
                      <form onSubmit={handleCloseSubmit} className="flex flex-col gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-700">Đánh giá chất lượng hoàn trả:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setRating(star)}
                              className={`p-0.5 transition-transform hover:scale-110 ${rating >= star ? 'text-amber-500' : 'text-slate-300'}`}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          ))}
                          <span className="text-xs font-mono font-medium ml-1 text-amber-600">({rating} sao)</span>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Ghi chú thẩm định hoàn tất mặt đường:
                          </label>
                          <textarea
                            rows={2}
                            value={feedbackComments}
                            onChange={(e) => setFeedbackComments(e.target.value)}
                            placeholder="Nhập ghi chú thẩm định của Quản trị viên..."
                            className="w-full px-3 py-2 text-xs rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-100">
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            Mặt đường hoàn trả đạt chuẩn kỹ thuật. Xác nhận lưu trữ hồ sơ.
                          </span>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Xác nhận nghiệm thu và đóng sự cố</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* KỊCH BẢN 2: BÁC BỎ & YÊU CẦU THI CÔNG LẠI */
                      <div className="flex flex-col gap-3 pt-1">
                        <div className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-md border border-rose-200 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            Quản trị viên từ chối nghiệm thu. Sự cố sẽ được chuyển về <b>IN_PROGRESS</b> để Kỹ thuật viên khẩn trương xử lý lại hiện trường.
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Chỉ đạo thi công khắc phục cho kỹ thuật viên:
                          </label>
                          <textarea
                            rows={2}
                            value={reworkInstructions}
                            onChange={(e) => setReworkInstructions(e.target.value)}
                            placeholder="Mô tả cụ thể các điểm chưa đạt cần xử lý lại dứt điểm..."
                            className="w-full px-3 py-2 text-xs rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>

                        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={isSubmittingRework}
                            onClick={handleReworkSubmit}
                            className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>{isSubmittingRework ? 'Đang gửi...' : 'Yêu cầu thi công lại'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* KHU VỰC ĐÁNH GIÁ & KHIẾU NẠI CỦA CÔNG DÂN TẠO PHẢN ÁNH */
                  <form onSubmit={handleCloseSubmit} className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">Chấm điểm chất lượng hoàn trả:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            className={`p-0.5 transition-transform hover:scale-110 ${rating >= star ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        ))}
                        <span className="text-xs font-mono font-medium ml-1 text-amber-600">({rating} sao)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {rating <= 3 || incident.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS'
                          ? 'Nội dung phản ánh / Lý do khiếu nại chưa đạt chuẩn:'
                          : 'Cảm nhận đóng góp ý kiến:'}
                      </label>
                      <textarea
                        rows={2}
                        value={feedbackComments}
                        onChange={(e) => {
                          setFeedbackComments(e.target.value);
                          setDisputeReason(e.target.value);
                        }}
                        placeholder={
                          rating <= 3 || incident.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS'
                            ? 'Mô tả rõ lý do chưa đạt chuẩn (vẫn còn ổ gà, nước đọng, mặt đường gồ ghề...)'
                            : 'Chia sẻ cảm nhận của bạn về chất lượng thi công...'
                        }
                        className="w-full px-3 py-2 text-xs rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {/* Nút hành động cho công dân */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      {rating <= 3 || incident.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS' ? (
                        <>
                          <div className="text-xs text-amber-700 flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                            <span>Hiện trường chưa đạt hoặc AI cảnh báo: Bạn có quyền gửi khiếu nại để yêu cầu xử lý lại.</span>
                          </div>
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              type="button"
                              disabled={isSubmittingDispute}
                              onClick={handleDisputeSubmit}
                              className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>{isSubmittingDispute ? 'Đang gửi...' : 'Không đạt - Gửi khiếu nại'}</span>
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors border border-slate-300"
                            >
                              Đồng ý đóng sự cố
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>Mặt đường hoàn thiện đạt chuẩn. Bạn có hài lòng để đóng hồ sơ sự cố?</span>
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors self-end"
                          >
                            Đánh giá và đóng sự cố
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* 3. NẾU CHƯA ĐĂNG NHẬP HOẶC LÀ CÔNG DÂN KHÁC */
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-slate-600">
                  {!isAuthenticated ? (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span>Vui lòng đăng nhập tài khoản người dân đã báo cáo (<b>{incident.reporterName || 'Người dân'}</b>) hoặc Quản trị viên để chấm điểm và đóng hồ sơ.</span>
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        Đăng nhập
                      </button>
                    </div>
                  ) : (
                    <span>Hồ sơ sự cố này được tạo bởi người dân <b>{incident.reporterName || 'Người dân'}</b>. Chỉ người tạo phản ánh hoặc Quản trị viên Ban Quản lý mới có thẩm quyền đánh giá và đóng hồ sơ.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Đã đóng phiếu hoàn tất */}
        {incident.status === 'CLOSED' && (
          <div className="flex flex-col gap-4">
            {/* Thẻ Kết Quả Kiểm Định Chất Lượng AI (AI Quality Verification) */}
            {incident.resolution?.aiVerificationStatus && (
              <div
                className={`p-3.5 rounded-lg border flex items-start gap-2.5 transition-colors ${
                  incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs">
                      {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Thẩm định nghiệm thu AI: Đạt chuẩn hoàn trả (0 Khuyết tật)'
                        : 'Cảnh báo kiểm định AI: Phát hiện dấu hiệu hư hỏng còn sót lại'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-medium border ${
                        incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {incident.resolution.aiVerificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {incident.resolution.aiVerificationNotes ||
                      (incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Mặt đường sau thi công đã được trám phẳng, không còn hố sụt hoặc vết nứt kết cấu.'
                        : 'AI phát hiện các đường rãnh hoặc điểm lún còn sót trên ảnh chụp nghiệm thu.')}
                  </p>
                </div>
              </div>
            )}

            {incident.resolution?.proofImageUrl ? (
              <BeforeAfterSlider
                beforeImageUrl={incident.imageUrl}
                afterImageUrl={incident.resolution.proofImageUrl}
                className="h-80 w-full"
              />
            ) : (
              <div className="h-64 w-full rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center p-4">
                <img src={incident.imageUrl} alt="Hiện trường sự cố" className="max-h-full rounded object-contain" />
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sự cố đã được đóng và lưu trữ hoàn tất
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Đánh giá của công dân: {incident.feedback?.rating || 5} Sao • "{incident.feedback?.comments || 'Rất hài lòng'}"
                </div>
              </div>
              <span className="font-mono text-xs font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded shadow-xs">
                HOÀN TẤT VÒNG ĐỜI
              </span>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
