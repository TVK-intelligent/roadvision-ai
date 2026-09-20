import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { useAuth } from '../context/AuthContext';
import { Timeline } from '../components/Timeline';
import { StatusBadge } from '../components/StatusBadge';
import { ImageCanvasWithBBox } from '../components/ImageCanvasWithBBox';
import { LeafletMap } from '../components/LeafletMap';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { useToast } from '../components/Toast';
import { ArrowLeft, CheckCircle2, Star, Upload, Hammer } from 'lucide-react';

export const IncidentDossierPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState<string>('Đã trám phẳng bằng bê tông nhựa nguội, lu lèn chặt.');
  const [rating, setRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('Đội thi công làm rất nhanh và phẳng đẹp. Rất hài lòng!');
  const [loading, setLoading] = useState<boolean>(true);

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
      await incidentApi.resolveIncident(incident.id, formData);
      toast.success('Đã nộp ảnh nghiệm thu hoàn tất!', 'Nghiệm Thu Thành Công');
    } catch (e: any) {
      toast.error('Lỗi khi nộp ảnh nghiệm thu', 'Lỗi');
    }

    setIncident({
      ...incident,
      status: 'RESOLVED',
      resolution: {
        staffName: user?.fullName || 'Nguyễn Văn Kỹ Thuật',
        proofImageUrl: URL.createObjectURL(proofFile),
        notes: proofNotes,
        resolvedAt: new Date().toISOString(),
      },
    });
  };

  // Citizen chấm điểm và đóng phiếu
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;

    try {
      await incidentApi.closeIncident(incident.id, { rating, comments: feedbackComments });
      toast.success('Cảm ơn bạn đã đánh giá! Hồ sơ sự cố đã được đóng và lưu trữ hoàn tất.', 'Hoàn Tất');
    } catch (e: any) {
      toast.error('Lỗi khi gửi đánh giá', 'Lỗi');
    }

    setIncident({
      ...incident,
      status: 'CLOSED',
      feedback: {
        rating,
        comments: feedbackComments,
        createdAt: new Date().toISOString(),
      },
    });
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
              className="h-72 w-full"
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

        {/* Người dân (Citizen) đối chiếu ảnh Trước/Sau & Đóng sự cố */}
        {incident.status === 'RESOLVED' && (
          <form onSubmit={handleCloseSubmit} className="flex flex-col gap-4 bg-surface-container-low p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-primary">
                Đối chiếu tương tác Trước vs Sau (Proof of Work) & Đánh giá chất lượng
              </span>
              <span className="text-xs font-mono text-on-surface-variant">Kỹ thuật viên: {incident.resolution?.staffName || 'Đội 4'}</span>
            </div>

            {/* Khung thanh trượt đối chiếu 2 lớp Before & After */}
            <BeforeAfterSlider
              beforeImageUrl={incident.imageUrl}
              afterImageUrl={incident.resolution?.proofImageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800'}
              className="h-80 w-full"
            />

            {/* Chọn số sao */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Chấm điểm chất lượng:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 rounded ${rating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border"
            />

            <button
              type="submit"
              className="self-end px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary-container"
            >
              Hài Lòng & Đóng Sự Cố (CLOSED)
            </button>
          </form>
        )}

        {/* Đã đóng phiếu hoàn tất */}
        {incident.status === 'CLOSED' && (
          <div className="flex flex-col gap-4">
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
    </div>
  );
};
