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
import { ArrowLeft, CheckCircle2, Star, Upload, Hammer, ThumbsUp, AlertCircle, ShieldCheck, Eye, EyeOff, RotateCcw, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

export const IncidentDossierPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState<string>('Đã trám phẳng bằng bê tông nhựa nguội, lu lèn chặt.');
  const [rating, setRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('Đội thi công làm rất nhanh và phẳng đẹp. Rất hài lòng!');
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpvoting, setIsUpvoting] = useState<boolean>(false);

  // Trạng thái Khiếu nại (Citizen) & Lệnh thi công lại (Admin)
  const [disputeReason, setDisputeReason] = useState<string>('Mặt đường vẫn còn ổ gà nguy hiểm hoặc khuyết tật chưa được xử lý triệt để.');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [reworkInstructions, setReworkInstructions] = useState<string>('Yêu cầu đội kỹ thuật khẩn trương quay lại hiện trường xử lý dứt điểm các khuyết tật còn sót lại theo cảnh báo của AI và phản hồi của người dân.');
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
      <div className="p-12 max-w-lg mx-auto my-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-center flex flex-col items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center font-bold text-xl">✕</div>
        <div>
          <h2 className="font-display font-bold text-lg text-on-surface">Không Tìm Thấy Hồ Sơ Sự Cố</h2>
          <p className="text-xs text-on-surface-variant mt-1">Sự cố này không tồn tại trong hệ thống hoặc đã được dọn dẹp sạch sẽ.</p>
        </div>
        <Link
          to="/report"
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary/90"
        >
          Tạo Báo Cáo Mới
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/my-reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách</span>
        </Link>
        <span className="font-mono text-xs text-on-surface-variant">
          TELEMETRY STREAM: STABLE (42ms)
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
        <div className="flex flex-col gap-2 pl-2">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={incident.status} />
            <span className="font-mono text-xs font-bold text-on-surface">TICKET: {incident.ticketCode}</span>
            <span className="text-xs text-on-surface-variant font-mono">
              Báo cáo: {new Date(incident.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface">{incident.title}</h1>
          <p className="text-xs text-on-surface-variant">{incident.address}</p>
        </div>

        {/* Nút & Huy Hiệu Đồng Tình (Upvote) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleUpvote}
            disabled={isUpvoting || incident.status === 'RESOLVED' || incident.status === 'CLOSED'}
            className="px-4 py-2 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-60 shadow-xs"
            title="Bấm đồng tình để tăng cấp độ khẩn cấp xử lý"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{incident.upvoteCount || 1} Đồng Tình</span>
          </button>
        </div>
      </div>

      {/* Timeline 7 Bước */}
      <Timeline status={incident.status} />

      {/* Bố cục 2 Cột Đối Chiếu */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Cột Trái: Ảnh AI và Bounding Box (6 Cột) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-on-surface">Hiện Trường Sự Cố & Hộp Bao AI</span>
              <span className="font-mono text-xs font-bold text-primary">
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
                        return `YOLOv8 Đa Sự Cố: ${parts.join(' & ')} (${(incident.aiDetection.confidence * 100).toFixed(1)}%)`;
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
              className="min-h-[380px] md:h-[450px] w-full"
            />

            <div className="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl">
              <span className="font-bold text-on-surface">Mô tả: </span>
              {incident.description}
            </div>
          </div>
        </div>

        {/* Cột Phải: Bản đồ GIS và Vị trí (6 Cột) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-on-surface">Bản Đồ Không Gian Tương Tác</span>
              <span className="font-mono text-xs text-secondary font-semibold">OpenStreetMap</span>
            </div>

            <LeafletMap
              latitude={Number(incident.latitude)}
              longitude={Number(incident.longitude)}
              popupTitle={incident.ticketCode}
              className="h-72 w-full"
            />

            <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant bg-surface-container-low p-3 rounded-xl">
              <span>Người báo cáo: {incident.reporterName}</span>
              <span>SĐT: {incident.reporterPhone || '0912345678'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực Hành Động Nghiệp Vụ Theo Vai Trò */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-4">
        <h3 className="text-base font-bold text-on-surface">Hành Động Khắc Phục & Nghiệm Thu</h3>

        {/* Kỹ thuật viên (Staff) bấm bắt đầu thi công */}
        {incident.status === 'ASSIGNED' && (
          <div className="flex items-center justify-between bg-primary-fixed/30 p-4 rounded-xl">
            <div>
              <div className="font-semibold text-sm text-primary">Nhiệm vụ đã được phân công cho đội của bạn</div>
              <div className="text-xs text-on-surface-variant">Nhấn nút bên cạnh khi bạn đã có mặt tại hiện trường</div>
            </div>
            <button
              onClick={handleStartRepair}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary-container flex items-center gap-2"
            >
              <Hammer className="w-4 h-4" />
              <span>Bắt Đầu Xử Lý (IN_PROGRESS)</span>
            </button>
          </div>
        )}

        {/* Kỹ thuật viên (Staff) tải ảnh nghiệm thu hoàn tất */}
        {incident.status === 'IN_PROGRESS' && (
          <form onSubmit={handleResolveSubmit} className="flex flex-col gap-3 bg-secondary-fixed/30 p-4 rounded-xl">
            <div className="font-semibold text-sm text-secondary">
              Nộp ảnh nghiệm thu hiện trường hoàn thiện (Proof of Work)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Chụp ảnh sau khi đã vá phẳng</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Ghi chú vật liệu thi công</label>
                <input
                  type="text"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-lowest border"
                />
              </div>
            </div>
            <button
              type="submit"
              className="self-end px-5 py-2 rounded-xl bg-secondary text-on-primary font-bold text-xs shadow hover:bg-secondary/90 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận Nghiệm Thu (RESOLVED)</span>
            </button>
          </form>
        )}

        {/* Người dân (Citizen) đối chiếu ảnh Trước/Sau & Đóng sự cố hoặc Khiếu nại */}
        {incident.status === 'RESOLVED' && (
          <div className="flex flex-col gap-4 bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-secondary" />
                Đối chiếu tương tác Trước vs Sau (Proof of Work) & Thẩm định nghiệm thu
              </span>
              <span className="text-xs font-mono text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded-lg">
                Kỹ thuật viên: {incident.resolution?.staffName || 'Đội 4'}
              </span>
            </div>

            {/* Thông báo cờ tranh chấp nếu đang có khiếu nại */}
            {incident.flag === 'DISPUTED' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-100 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-xs uppercase tracking-wide text-rose-700 dark:text-rose-400">
                    Sự Cố Đang Bị Khiếu Nại Chất Lượng Nghiệm Thu
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    <strong>Nội dung phản ánh:</strong> "{incident.reworkReason || 'Mặt đường chưa khắc phục triệt để.'}"
                  </p>
                  <div className="text-[11px] text-on-surface-variant mt-1 italic">
                    Hồ sơ đang chờ Ban Quản Lý (Admin) thẩm định để ra lệnh cho Kỹ thuật viên quay lại hiện trường xử lý dứt điểm.
                  </div>
                </div>
              </div>
            )}

            {/* Thẻ Kết Quả Kiểm Định Chất Lượng AI (AI Quality Verification) */}
            {incident.resolution?.aiVerificationStatus && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                  incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                }`}
              >
                {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs uppercase tracking-wide">
                      {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Thẩm Định Nghiệm Thu AI: Đạt Chuẩn Hoàn Trả (0 Khuyết Tật)'
                        : 'Cảnh Báo Kiểm Định AI: Phát Hiện Dấu Hiệu Hư Hỏng Còn Sót Lại'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {incident.resolution.aiVerificationStatus}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 mt-1">
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
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 text-xs font-bold transition-all shadow-xs"
                    >
                      {showDefectBoxes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showDefectBoxes ? 'Ẩn khung lỗi AI (Xem thanh trượt Before/After)' : 'Xem chi tiết khung Bounding Box AI phát hiện trên ảnh After'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hiển thị lớp phủ Bounding Box AI hoặc Khung thanh trượt Before & After */}
            {showDefectBoxes && incident.resolution?.proofImageUrl ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-mono text-on-surface-variant flex items-center justify-between">
                  <span className="font-bold text-amber-600">LỚP PHỦ THỊ GIÁC AI - CÁC ĐIỂM KHUYẾT TẬT CÒN SÓT LẠI TRÊN ẢNH AFTER:</span>
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
                  className="min-h-[420px] w-full"
                />
              </div>
            ) : (
              <BeforeAfterSlider
                beforeImageUrl={incident.imageUrl}
                afterImageUrl={incident.resolution?.proofImageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800'}
                className="min-h-[440px] w-full"
              />
            )}

            {/* PHÂN QUYỀN VÀ THẨM QUYỀN ĐÁNH GIÁ NGHIỆM THU (RESOLVED) */}

            {/* 1. NẾU LÀ KỸ THUẬT VIÊN (STAFF) - KHÔNG ĐƯỢC TỰ ĐÁNH GIÁ SẢN PHẨM CỦA MÌNH */}
            {user?.role === 'ROLE_STAFF' ? (
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-start gap-3.5 shadow-xs">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-on-surface text-sm mb-1 flex items-center gap-2">
                    <span>Đã Hoàn Thành Thi Công & Chờ Nghiệm Thu Độc Lập</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-mono text-[10px] font-bold">Kỹ Thuật Viên</span>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">
                    Bạn đang đăng nhập với tài khoản <span className="font-semibold text-primary">Kỹ thuật viên thi công</span>. Theo nguyên tắc khách quan, kỹ thuật viên không được tự chấm điểm chất lượng hoặc tự nghiệm thu đóng hồ sơ của chính mình.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center gap-2 text-secondary text-[11px] font-medium">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Hồ sơ đang chờ người dân tạo phản ánh (<b>{incident.reporterName || 'Người dân'}</b>) hoặc Quản trị viên Ban Quản Lý kiểm tra hiện trường, chấm điểm chất lượng và xác nhận hoàn tất.</span>
                  </div>
                </div>
              </div>
            ) : (user?.role === 'ROLE_ADMIN' || (user?.role === 'ROLE_CITIZEN' && incident.citizenId === user?.id)) ? (
              /* 2. NẾU LÀ QUẢN TRỊ VIÊN HOẶC CHÍNH CÔNG DÂN TẠO BÁO CÁO */
              <div className="flex flex-col gap-3">
                {/* KHU VỰC THẨM QUYỀN QUẢN TRỊ VIÊN (ADMIN PANEL) */}
                {user?.role === 'ROLE_ADMIN' && (
                  <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant/40 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                        <ShieldAlert className="w-4 h-4 text-primary" />
                        <span>Thẩm Quyền Quản Trị Viên: Quyết Định Tái Thi Công</span>
                      </div>
                      <span className="text-[11px] font-mono text-secondary font-bold">Admin Dispatcher</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Nếu nhận thấy hiện trường chưa đạt chuẩn hoặc AI cảnh báo vi phạm, Quản trị viên ra lệnh bác bỏ nghiệm thu và chỉ đạo Kỹ thuật viên thi công lại (chuyển trạng thái về IN_PROGRESS).
                    </p>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-on-surface">Chỉ đạo thi công bổ sung cho Kỹ thuật viên:</label>
                      <input
                        type="text"
                        value={reworkInstructions}
                        onChange={(e) => setReworkInstructions(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border"
                        placeholder="Nhập nội dung chỉ đạo đội thi công..."
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSubmittingRework}
                        onClick={handleReworkSubmit}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{isSubmittingRework ? 'Đang gửi...' : 'Bác Bỏ Nghiệm Thu & Yêu Cầu Thi Công Lại (REWORK)'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* KHU VỰC ĐÁNH GIÁ & KHIẾU NẠI CỦA NGƯỜI DÂN HOẶC ADMIN */}
                <form onSubmit={handleCloseSubmit} className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        {user?.role === 'ROLE_ADMIN' ? 'Quản trị viên đánh giá chất lượng hoàn trả:' : 'Chấm điểm chất lượng hoàn trả:'}
                      </span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`p-1 rounded transition-transform hover:scale-110 ${rating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                      <span className="text-xs font-mono font-bold ml-1 text-amber-600">({rating} sao)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
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
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border"
                    />
                  </div>

                  {/* Nút hành động phân hóa thông minh */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                    {(rating <= 3 || incident.resolution?.aiVerificationStatus === 'AI_WARNING_DEFECT_REMAINS') ? (
                      <>
                        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Hiện trường chưa đạt hoặc AI cảnh báo: Bạn có quyền khiếu nại lên BQL để yêu cầu thợ làm lại.</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            type="button"
                            disabled={isSubmittingDispute}
                            onClick={handleDisputeSubmit}
                            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>{isSubmittingDispute ? 'Đang gửi...' : 'Không Đạt - Gửi Khiếu Nại (DISPUTE)'}</span>
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-surface-container-highest text-on-surface hover:bg-surface-container-high font-bold text-xs transition-colors"
                          >
                            Vẫn Đồng Ý Đóng Sự Cố
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Mặt đường hoàn thiện đạt chuẩn. Bạn hài lòng để đóng hồ sơ sự cố?</span>
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary-container transition-colors self-end"
                        >
                          Hài Lòng & Đóng Sự Cố (CLOSED)
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              /* 3. NẾU CHƯA ĐĂNG NHẬP HOẶC LÀ CÔNG DÂN KHÁC */
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-on-surface-variant">
                  {!isAuthenticated ? (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span>Vui lòng đăng nhập tài khoản Công Dân đã báo cáo (<b>{incident.reporterName || 'Người dân'}</b>) hoặc Quản trị viên để chấm điểm chất lượng và đóng hồ sơ.</span>
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary-container transition-colors"
                      >
                        Đăng Nhập
                      </button>
                    </div>
                  ) : (
                    <span>Hồ sơ sự cố này được tạo bởi công dân <b>{incident.reporterName || 'Người dân'}</b>. Chỉ người tạo phản ánh hoặc Quản trị viên Ban Quản Lý mới có thẩm quyền đánh giá nghiệm thu và đóng hồ sơ.</span>
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
                className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                  incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                }`}
              >
                {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs uppercase tracking-wide">
                      {incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Thẩm Định Nghiệm Thu AI: Đạt Chuẩn Hoàn Trả (0 Khuyết Tật)'
                        : 'Cảnh Báo Kiểm Định AI: Phát Hiện Dấu Hiệu Hư Hỏng Còn Sót Lại'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {incident.resolution.aiVerificationStatus}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    {incident.resolution.aiVerificationNotes ||
                      (incident.resolution.aiVerificationStatus === 'AI_VERIFIED_CLEAN'
                        ? 'Mặt đường sau thi công đã được trám phẳng, không còn hố sụt hoặc vết nứt kết cấu.'
                        : 'AI phát hiện các đường rãnh hoặc điểm lún còn sót trên ảnh chụp nghiệm thu.')}
                  </p>
                </div>
              </div>
            )}

            <BeforeAfterSlider
              beforeImageUrl={incident.imageUrl}
              afterImageUrl={incident.resolution?.proofImageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800'}
              className="h-80 w-full"
            />

            <div className="p-4 rounded-xl bg-primary-fixed/20 border border-primary/20 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Sự cố đã được đóng và lưu trữ hoàn tất
                </div>
                <div className="text-xs text-on-surface-variant mt-1">
                  Đánh giá của công dân: {incident.feedback?.rating || 5} Sao • "{incident.feedback?.comments || 'Rất hài lòng'}"
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-primary bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm">
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
