import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incidentApi } from '../services/incidentApi';
import { useToast } from '../components/Toast';
import { LeafletMap } from '../components/LeafletMap';
import {
  Video,
  Camera,
  Play,
  Pause,
  Upload,
  CheckCircle2,
  Send,
  MapPin,
  Sliders,
  Sparkles,
  Crosshair,
  Layers,
  FileVideo,
  Trash2,
  Activity,
  Gauge,
  Scan,
  ShieldAlert,
} from 'lucide-react';

interface CapturedIncident {
  id: string;
  timestamp: string;
  category: string;
  confidence: number;
  latitude: number;
  longitude: number;
  address: string;
  snapshotUrl: string;
  blob: Blob;
  status: 'PENDING' | 'DISPATCHED';
}

export const PatrolModePage: React.FC = () => {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isAnalyzingRef = useRef<boolean>(false);

  // Chế độ nguồn video: 'UPLOAD' (Tệp video hành trình) | 'WEBCAM' (Camera trực tiếp)
  const [sourceMode, setSourceMode] = useState<'UPLOAD' | 'WEBCAM'>('UPLOAD');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.20);
  const [autoDispatch, setAutoDispatch] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [focusRoadROI, setFocusRoadROI] = useState<boolean>(true);
  const [showROIGuide, setShowROIGuide] = useState<boolean>(true); // Mặc định hiện lưới để người dùng thấy rõ
  const [hoodCutoff, setHoodCutoff] = useState<number>(46); // Bỏ 46% phía dưới (nắp capo xe)
  const [skyCutoff, setSkyCutoff] = useState<number>(15);  // Bỏ 15% phía trên (bầu trời / chân trời)

  // Vị trí tuần tra thực tế (ưu tiên GPS thiết bị)
  const [patrolLocation, setPatrolLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  }>({
    lat: 20.436036,
    lng: 105.904596,
    address: 'Khu vực tuần tra, Thanh Liêm, Hà Nam',
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Telemetry thực tế từ mô hình AI
  const [activeBoxes, setActiveBoxes] = useState<any[]>([]);
  const [inferenceLatency, setInferenceLatency] = useState<number>(0);
  const [processedFrames, setProcessedFrames] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Danh sách các hư hại đã bắt được từ luồng video
  const [capturedList, setCapturedList] = useState<CapturedIncident[]>([]);

  // Lấy tọa độ GPS thực tế của thiết bị
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Trình duyệt không hỗ trợ Geolocation');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'vi' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            addr = data.display_name;
          }
        } catch {
          // Bỏ qua lỗi reverse geocode
        }
        setPatrolLocation({ lat, lng, address: addr });
        setIsLocating(false);
        toast.success('Đã cập nhật vị trí tuần tra từ GPS thiết bị');
      },
      (err) => {
        console.warn('Lỗi lấy GPS:', err);
        setIsLocating(false);
        toast.warning('Không thể lấy GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Quản lý luồng Camera trực tiếp
  useEffect(() => {
    if (sourceMode === 'WEBCAM') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        })
        .catch((err) => {
          toast.error('Không thể mở Camera: ' + err.message);
          setSourceMode('UPLOAD');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [sourceMode]);

  // Giải phóng bộ nhớ Blob URLs khi unmount
  useEffect(() => {
    return () => {
      capturedList.forEach((item) => {
        URL.revokeObjectURL(item.snapshotUrl);
      });
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  // Xử lý gửi sự cố tuần tra vào hệ thống trung tâm
  const handleDispatchIncident = useCallback(async (incident: CapturedIncident, isAuto = false) => {
    try {
      const formData = new FormData();
      formData.append('image', incident.blob, 'patrol_detected.jpg');
      formData.append('latitude', incident.latitude.toString());
      formData.append('longitude', incident.longitude.toString());

      const catLabel =
        incident.category === 'POTHOLE'
          ? 'Ổ gà mặt đường'
          : incident.category === 'ROAD_CRACK'
          ? 'Vết nứt kết cấu'
          : incident.category === 'ROAD_FLOODING'
          ? 'Điểm ngập úng'
          : 'Vật cản giao thông';

      formData.append('title', `[Tuần Tra AI] Phát hiện ${catLabel}`);
      formData.append(
        'description',
        `Phát hiện tự động qua luồng Video hành trình xe tuần tra (Độ tin cậy: ${(
          incident.confidence * 100
        ).toFixed(1)}%). Đề nghị trung tâm điều phối xử lý theo quy trình.`
      );
      formData.append('address', incident.address);
      formData.append('category', incident.category);

      await incidentApi.createIncident(formData);

      setCapturedList((prev) =>
        prev.map((item) => (item.id === incident.id ? { ...item, status: 'DISPATCHED' } : item))
      );

      toast.success(
        `${isAuto ? '[Tự Động] ' : ''}Đã chuyển sự cố #${incident.id.slice(-4)} vào Hàng Đợi Điều Phối!`,
        'Bắt Lỗi Tuần Tra'
      );
    } catch (e: any) {
      toast.error('Lỗi khi gửi sự cố: ' + (e.response?.data?.message || e.message));
    }
  }, []);

  // Vòng lặp AI trích xuất frame định kỳ (mỗi 1000ms có lock chống chồng lấn)
  useEffect(() => {
    if (!isPlaying) {
      setActiveBoxes([]);
      return;
    }

    const scanInterval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || isAnalyzingRef.current) return;

      const rawW = video.videoWidth || 640;
      const rawH = video.videoHeight || 360;

      // Giới hạn độ phân giải gửi AI tối đa 1280px (đặc biệt tối ưu cho video 4K UHD / 2K)
      // vừa giữ trọn độ nét chi tiết cho mô hình YOLO 800x800, vừa giảm 85% tải GPU/mạng và tăng tốc FPS mượt mà
      const maxTargetW = 1280;
      const scaleDown = rawW > maxTargetW ? maxTargetW / rawW : 1.0;
      const targetW = Math.round(rawW * scaleDown);

      // Trích xuất tiêu điểm mặt đường: Cắt bỏ bầu trời phía trên và nắp capo xe phía dưới
      const cropY = focusRoadROI ? Math.floor(rawH * (skyCutoff / 100)) : 0;
      const cropH = focusRoadROI ? Math.max(80, Math.floor(rawH * ((100 - skyCutoff - hoodCutoff) / 100))) : rawH;
      const targetH = Math.round(cropH * scaleDown);

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.filter = 'contrast(1.22) brightness(1.02)';
      // Chỉ vẽ đúng dải mặt đường vào canvas - NẮP CAPO VÀ BẦU TRỜI HOÀN TOÀN BỊ LOẠI TRỪ
      ctx.drawImage(video, 0, cropY, rawW, cropH, 0, 0, targetW, targetH);
      ctx.filter = 'none';

      isAnalyzingRef.current = true;
      setIsScanning(true);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            isAnalyzingRef.current = false;
            setIsScanning(false);
            return;
          }

          const startTime = performance.now();

          try {
            const formData = new FormData();
            formData.append('image', blob, 'patrol_frame.jpg');

            const res = await incidentApi.analyzeImage(formData, confidenceThreshold);
            const data = res.data;
            const latency = Math.round(performance.now() - startTime);
            setInferenceLatency(latency);
            setProcessedFrames((prev) => prev + 1);

            if (data.boxes && data.boxes.length > 0) {
              // Map toạ độ từ canvas nén về toạ độ gốc của video (hỗ trợ cả 4K UHD, Full HD, 720p)
              const scaleBack = 1.0 / scaleDown;
              const mappedBoxes = data.boxes.map((b: any) => ({
                ...b,
                x: Math.round(b.x * scaleBack),
                y: Math.round(b.y * scaleBack + cropY),
                width: Math.round(b.width * scaleBack),
                height: Math.round(b.height * scaleBack),
              }));

              setActiveBoxes(mappedBoxes);

              const topBox = mappedBoxes[0];
              const snapshotUrl = URL.createObjectURL(blob);

              const newIncident: CapturedIncident = {
                id: `${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('vi-VN'),
                category: topBox.className || data.className || 'POTHOLE',
                confidence: topBox.confidence || data.confidence,
                latitude: patrolLocation.lat,
                longitude: patrolLocation.lng,
                address: patrolLocation.address,
                snapshotUrl,
                blob,
                status: 'PENDING',
              };

              setCapturedList((prev) => {
                if (prev.length >= 15) {
                  URL.revokeObjectURL(prev[prev.length - 1].snapshotUrl);
                }
                return [newIncident, ...prev.slice(0, 14)];
              });

              if (autoDispatch) {
                handleDispatchIncident(newIncident, true);
              }
            } else {
              setActiveBoxes([]);
            }
          } catch (err) {
            // Lỗi quét frame
          } finally {
            isAnalyzingRef.current = false;
            setIsScanning(false);
          }
        },
        'image/jpeg',
        0.85
      );
    }, 333); // 3 frames mỗi giây (~333ms)

    return () => clearInterval(scanInterval);
  }, [isPlaying, confidenceThreshold, patrolLocation, autoDispatch, handleDispatchIncident, focusRoadROI, skyCutoff, hoodCutoff]);

  // Điều chỉnh tốc độ phát video (Làm chậm để AI soi kỹ hoặc bình thường)
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    toast.info(`Tốc độ phát: ${speed}x ${speed < 1 ? '(Làm chậm để AI quét kỹ)' : speed === 1 ? '(Chuẩn)' : ''}`);
  };

  // Xử lý nạp tệp video hành trình
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setSourceMode('UPLOAD');
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.playbackRate = playbackSpeed;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      toast.info(`Đã nạp video hành trình: ${file.name}`, 'Tuần Tra AI');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleClearCaptured = () => {
    capturedList.forEach((item) => URL.revokeObjectURL(item.snapshotUrl));
    setCapturedList([]);
    toast.info('Đã dọn sạch danh sách hư hại đã ghi nhận');
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Hidden Canvas trích xuất frame */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Chuyên Nghiệp: Hệ Thống Video Tuần Tra */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-primary font-bold uppercase tracking-wider">
                VIDEO DASHCAM PIPELINE • MÔ HÌNH NHẬN DIỆN THỜI GIAN THỰC
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ĐANG QUÉT
                </span>
              )}
            </div>
            <h1 className="font-display text-xl font-black text-on-surface mt-0.5">
              Giám Sát & Tuần Tra Mặt Đường Qua Video Hành Trình
            </h1>
          </div>
        </div>

        {/* Chỉ số Telemetry thực tế từ hệ thống AI */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-on-surface-variant text-[11px]">TẦN SUẤT:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">3 FPS (333ms)</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-on-surface-variant text-[11px]">ĐỘ TRỄ AI:</span>
            <strong className="text-primary font-bold">{inferenceLatency > 0 ? `${inferenceLatency}ms` : '--'}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-2">
            <Layers className="w-4 h-4 text-secondary" />
            <span className="text-on-surface-variant text-[11px]">ĐÃ XỬ LÝ:</span>
            <strong className="text-on-surface font-bold">{processedFrames} frames</strong>
          </div>
        </div>
      </div>

      {/* Bố Cục Chính: Màn hình Video bên trái (7 cột) & Bản đồ + Feed bắt lỗi bên phải (5 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CỘT TRÁI: MÀN HÌNH VIDEO & ĐIỀU KHIỂN (7 CỘT) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video w-full rounded-3xl bg-slate-950 border border-outline-variant/30 overflow-hidden shadow-md flex items-center justify-center">
            {/* Thẻ Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              loop
              className="w-full h-full object-contain"
            />

            {/* Lưới Hướng Dẫn Tiêu Điểm Mặt Đường (Road ROI Guide) */}
            {focusRoadROI && showROIGuide && (
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
                {/* Vùng Bầu Trời / Horizon Cutoff */}
                <div
                  style={{ height: `${skyCutoff}%` }}
                  className="w-full bg-slate-950/50 border-b-2 border-dashed border-amber-400/70 flex items-center justify-center transition-all"
                >
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-400/50 shadow-sm">
                    NGOẠI CẢNH / BẦU TRỜI ({skyCutoff}% ĐÃ LỌC BỎ)
                  </span>
                </div>

                {/* Vùng Tiêu Điểm Mặt Đường (Road Surface Area) */}
                <div
                  style={{ height: `${100 - skyCutoff - hoodCutoff}%` }}
                  className="w-[96%] mx-auto border-2 border-dashed border-emerald-400/80 rounded-2xl flex items-start justify-end p-2 bg-emerald-500/5 transition-all relative"
                >
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-emerald-400/60 shadow-sm flex items-center gap-1.5">
                    <Scan className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    TIÊU ĐIỂM MẶT ĐƯỜNG ({100 - skyCutoff - hoodCutoff}% CHIỀU CAO)
                  </span>
                </div>

                {/* Vùng Nắp Capo Xe */}
                <div
                  style={{ height: `${hoodCutoff}%` }}
                  className="w-full bg-slate-950/60 border-t-2 border-dashed border-rose-400/70 flex items-center justify-center transition-all"
                >
                  <span className="text-[10px] font-mono font-bold text-rose-300 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-rose-400/50 shadow-sm flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    NẮP CAPO XE ({hoodCutoff}% ĐÃ LOẠI TRỪ - KHÔNG SOI CAPO)
                  </span>
                </div>
              </div>
            )}

            {/* Badge tốc độ phát chậm nếu < 1x */}
            {isPlaying && playbackSpeed < 1 && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-amber-500/90 text-slate-950 font-mono text-[11px] font-black flex items-center gap-1.5 shadow-md z-20">
                <Gauge className="w-3.5 h-3.5" />
                <span>CHẬM {playbackSpeed}x (SOI CHI TIẾT)</span>
              </div>
            )}

            {/* Bounding Box AI vẽ chính xác theo tỷ lệ frame */}
            {activeBoxes.map((box, idx) => {
              const videoW = videoRef.current?.videoWidth || 640;
              const videoH = videoRef.current?.videoHeight || 360;

              const leftPct = (box.x / videoW) * 100;
              const topPct = (box.y / videoH) * 100;
              const widthPct = (box.width / videoW) * 100;
              const heightPct = (box.height / videoH) * 100;

              const isCrack = box.className?.includes('CRACK');
              const isFlood = box.className?.includes('FLOOD');
              const isObstacle = box.className?.includes('OBSTACLE');

              const colorBorder = isCrack
                ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                : isFlood
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                : isObstacle
                ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                : 'border-blue-400 bg-blue-500/20 text-blue-300';

              return (
                <div
                  key={idx}
                  className={`absolute border-2 rounded pointer-events-none transition-all ${colorBorder}`}
                  style={{
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                >
                  <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-slate-900/90 font-mono text-[10px] font-bold border border-current flex items-center gap-1 shadow-sm whitespace-nowrap">
                    <span>
                      {isCrack ? '⚡ Vết nứt' : isFlood ? '🌊 Ngập úng' : isObstacle ? '🚧 Vật cản' : '🕳️ Ổ gà'}
                    </span>
                    <span>({((box.confidence || 0.85) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}

            {/* Trạng thái quét frame hiển thị góc dưới màn hình */}
            {isPlaying && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white font-mono text-[11px] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                <span>{isScanning ? 'AI Đang Trích Xuất & Phân Tích...' : 'Sẵn Sàng Quét Frame Kế'}</span>
              </div>
            )}

            {/* Màn hình chờ khi chưa chọn video */}
            {!videoUrl && sourceMode === 'UPLOAD' && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center gap-3">
                <FileVideo className="w-12 h-12 text-slate-500" />
                <div className="max-w-md">
                  <h3 className="font-bold text-white text-base">Chưa Nạp Video Hành Trình</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Vui lòng tải lên tệp video (.mp4, .mov, .webm) hoặc chuyển sang Camera trực tiếp để AI bắt đầu kiểm định mặt đường.
                  </p>
                </div>
                <label className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer hover:bg-primary/90 transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Chọn Tệp Video Hành Trình</span>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* BẢNG ĐIỀU KHIỂN & THAM SỐ TUẦN TRA */}
          <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Nút Play/Pause & Chuyển Nguồn */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  disabled={!videoUrl && sourceMode === 'UPLOAD'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      : 'bg-primary hover:bg-primary/90 text-on-primary'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Tạm Dừng Tuần Tra' : 'Bắt Đầu Tuần Tra'}</span>
                </button>

                {/* Chọn Nguồn: Tải Video vs Camera */}
                <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs">
                  <label
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      sourceMode === 'UPLOAD'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải Video</span>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>

                  <button
                    onClick={() => setSourceMode('WEBCAM')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      sourceMode === 'WEBCAM'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera Trực Tiếp</span>
                  </button>
                </div>
              </div>

              {/* Tùy chọn Tự Động Đẩy Sự Cố */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={autoDispatch}
                    onChange={(e) => setAutoDispatch(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <span>Tự động đẩy sự cố lên máy chủ (Auto-Dispatch)</span>
                </label>
              </div>
            </div>

            {/* HÀNG ĐIỀU KHIỂN: TỐC ĐỘ PHÁT VIDEO (LÀM CHẬM) & FOCUS TIÊU ĐIỂM MẶT ĐƯỜNG */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20 text-xs">
              {/* Chọn tốc độ video (Làm chậm để AI soi kỹ) */}
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-secondary" />
                <span className="font-semibold text-on-surface">Tốc độ phát:</span>
                <div className="flex items-center bg-surface-container-low p-0.5 rounded-xl border border-outline-variant/30 font-mono">
                  {[0.25, 0.5, 0.75, 1.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        playbackSpeed === rate
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {rate === 1.0 ? '1.0x (Chuẩn)' : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tiêu điểm mặt đường (Road ROI Focus) */}
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={focusRoadROI}
                    onChange={(e) => setFocusRoadROI(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span>Focus Mặt Đường (Road ROI)</span>
                </label>
                {focusRoadROI && (
                  <button
                    type="button"
                    onClick={() => setShowROIGuide(!showROIGuide)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                      showROIGuide
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="Hiển thị đường lưới ranh giới tiêu điểm mặt đường trên video"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>{showROIGuide ? 'Ẩn Lưới ROI' : 'Hiện Lưới ROI'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* HÀNG TINH CHỈNH VÙNG NẮP CAPO XE (CAR HOOD CUTOFF) */}
            {focusRoadROI && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20 text-xs bg-rose-500/5 p-3 rounded-2xl border border-rose-500/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold text-on-surface">Vùng Nắp Ca-pô Ô tô (Cắt bỏ phía dưới):</span>
                  <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold text-[13px]">
                    {hoodCutoff}%
                  </strong>
                </div>

                {/* Presets nắp capo */}
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant text-[11px]">Mẫu camera:</span>
                  <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30 font-mono text-[11px]">
                    {[
                      { label: 'Không Capo (0%)', val: 0 },
                      { label: 'Góc Vừa (25%)', val: 25 },
                      { label: 'Capo Lớn (46%)', val: 46 },
                      { label: 'Rất Lớn (55%)', val: 55 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setHoodCutoff(preset.val)}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          hoodCutoff === preset.val
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="65"
                    step="1"
                    value={hoodCutoff}
                    onChange={(e) => setHoodCutoff(parseInt(e.target.value, 10))}
                    className="w-28 h-1.5 bg-surface-container-high rounded-lg cursor-pointer accent-rose-500"
                    title="Kéo thanh trượt để che đúng phần nắp capo xe ô tô"
                  />
                </div>
              </div>
            )}

            {/* Slider Ngưỡng Tin Cậy Bắt Lỗi */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-outline-variant/20 text-xs">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span className="font-semibold text-on-surface">Ngưỡng Tin Cậy AI (Confidence Gate):</span>
                <strong className="font-mono text-primary font-bold">
                  {(confidenceThreshold * 100).toFixed(0)}%
                </strong>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.80"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-48 h-1.5 bg-surface-container-high rounded-lg cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: BẢN ĐỒ VỊ TRÍ TUẦN TRA & FEED SỰ CỐ (5 CỘT) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* VỊ TRÍ TUẦN TRA THỰC TẾ & BẢN ĐỒ GIS */}
          <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Vị Trí & Tuyến Đường Tuần Tra</span>
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Đang lấy GPS...' : 'Lấy GPS thiết bị'}</span>
              </button>
            </div>

            {/* Ô nhập/hiển thị địa chỉ tuyến đường */}
            <input
              type="text"
              value={patrolLocation.address}
              onChange={(e) =>
                setPatrolLocation((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Nhập tên đường hoặc khu vực tuần tra..."
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
            />

            <div className="h-52 w-full rounded-2xl overflow-hidden border border-outline-variant/20">
              <LeafletMap
                latitude={patrolLocation.lat}
                longitude={patrolLocation.lng}
                popupTitle="Vị trí ghi nhận tuần tra mặt đường"
                className="h-full w-full"
              />
            </div>
          </div>

          {/* DANH SÁCH HƯ HẠI ĐÃ PHÁT HIỆN QUA VIDEO */}
          <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex-1 flex flex-col gap-3 min-h-[360px]">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-on-surface">Hư Hại Bắt Được Tự Động</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600">
                  {capturedList.length}
                </span>
              </div>
              {capturedList.length > 0 && (
                <button
                  onClick={handleClearCaptured}
                  className="text-[11px] text-error hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa danh sách</span>
                </button>
              )}
            </div>

            {capturedList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant gap-2">
                <Video className="w-8 h-8 text-outline" />
                <span className="text-xs font-semibold">Đang lắng nghe luồng video tuần tra...</span>
                <span className="text-[11px] text-on-surface-variant/70 max-w-[260px]">
                  Khi phát hiện ổ gà, vết nứt hoặc vật cản trên video, ảnh chụp snapshot sẽ tự động xuất hiện tại đây.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[340px] pr-1">
                {capturedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex gap-3 items-center justify-between hover:bg-surface-container transition-colors"
                  >
                    <img
                      src={item.snapshotUrl}
                      alt={item.category}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-outline-variant/30 shadow-xs"
                    />

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-on-surface truncate">
                          {item.category === 'POTHOLE'
                            ? '🕳️ Ổ Gà Mặt Đường'
                            : item.category === 'ROAD_CRACK'
                            ? '⚡ Vết Nứt Kết Cấu'
                            : item.category === 'ROAD_FLOODING'
                            ? '🌊 Điểm Ngập Úng'
                            : '🚧 Vật Cản Trở'}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary shrink-0">
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant truncate">
                        {item.address}
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant/70">
                        {item.timestamp}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {item.status === 'DISPATCHED' ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã Gửi</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDispatchIncident(item)}
                          className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                        >
                          <Send className="w-3 h-3" />
                          <span>Gửi Đi</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
