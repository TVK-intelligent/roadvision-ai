import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incidentApi } from '../services/incidentApi';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
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
  Zap,
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
  framesCount?: number;
  bestFrameOptimized?: boolean;
}

type SamplingMode = 'REALTIME' | 'BALANCED' | 'ECONOMY';

const SAMPLING_CONFIG: Record<SamplingMode, { label: string; interval: number; desc: string }> = {
  REALTIME: { label: 'Siêu Tốc (0.2s)', interval: 200, desc: 'Tần số quét cao nhất, bám sát từng frame video' },
  BALANCED: { label: 'Tiêu Chuẩn (0.4s)', interval: 400, desc: 'Cân bằng mượt mà' },
  ECONOMY: { label: 'Tiết Kiệm (0.8s)', interval: 800, desc: 'Giảm tải CPU' },
};

interface ActiveTrack {
  incidentId: string;
  category: string;
  box: { x: number; y: number; width: number; height: number };
  lastSeenTime: number;
  maxConfidence: number;
  hitCount: number;
  committed: boolean;
}

// Đối tượng theo dõi trực quan mượt mà 60 FPS (Quán tính chuyển động & nội suy mềm)
interface TrackedVisualObject {
  id: string;
  category: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  targetX: number;
  targetY: number;
  targetW: number;
  targetH: number;
  vx: number;
  vy: number;
  vw: number;
  vh: number;
  lastSeenTime: number;
  hitCount: number;
  committed: boolean;
  alpha: number;
}

// Hàm tính chỉ số Intersection over Union (IoU) giữa 2 Bounding Box
const calculateIoU = (
  b1: { x: number; y: number; width: number; height: number },
  b2: { x: number; y: number; width: number; height: number }
): number => {
  const xA = Math.max(b1.x, b2.x);
  const yA = Math.max(b1.y, b2.y);
  const xB = Math.min(b1.x + b1.width, b2.x + b2.width);
  const yB = Math.min(b1.y + b1.height, b2.y + b2.height);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const b1Area = Math.max(0, b1.width * b1.height);
  const b2Area = Math.max(0, b2.width * b2.height);
  const unionArea = b1Area + b2Area - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
};

// Hàm tính khoảng cách tương đối giữa tâm 2 Bounding Box theo kích thước khung hình
const centerDistanceRatio = (
  b1: { x: number; y: number; width: number; height: number },
  b2: { x: number; y: number; width: number; height: number },
  videoW: number,
  videoH: number
): number => {
  const c1x = b1.x + b1.width / 2;
  const c1y = b1.y + b1.height / 2;
  const c2x = b2.x + b2.width / 2;
  const c2y = b2.y + b2.height / 2;
  const dist = Math.hypot(c1x - c2x, c1y - c2y);
  const diag = Math.hypot(videoW, videoH) || 1;
  return dist / diag;
};

export const PatrolModePage: React.FC = () => {
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualTracksRef = useRef<TrackedVisualObject[]>([]);
  const isAnalyzingRef = useRef<boolean>(false);

  // Chế độ nguồn video: 'UPLOAD' (Tệp video hành trình) | 'WEBCAM' (Camera trực tiếp)
  const [sourceMode, setSourceMode] = useState<'UPLOAD' | 'WEBCAM'>('UPLOAD');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.35);
  const [autoDispatch, setAutoDispatch] = useState<boolean>(false);

  // Chế độ trích xuất frame thích ứng (Adaptive Sampling) - Mặc định SIÊU TỐC 0.2s để bám sát video
  const [samplingMode, setSamplingMode] = useState<SamplingMode>('REALTIME');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

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
  const [isBoxFading, setIsBoxFading] = useState<boolean>(false);
  const boxFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTracksRef = useRef<ActiveTrack[]>([]);

  const [inferenceLatency, setInferenceLatency] = useState<number>(0);
  const [processedFrames, setProcessedFrames] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Danh sách các hư hại đã bắt được từ luồng video
  const [capturedList, setCapturedList] = useState<CapturedIncident[]>([]);

  // Lấy tọa độ GPS thực tế của thiết bị (có fallback mạng khi chạy trên desktop/PC không có GPS)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Trình duyệt không hỗ trợ Geolocation');
      return;
    }
    setIsLocating(true);

    const applyPos = async (pos: GeolocationPosition, isFallback = false) => {
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
      toast.success(isFallback ? 'Đã lấy vị trí qua mạng Internet!' : 'Đã cập nhật vị trí tuần tra từ GPS thiết bị');
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => applyPos(pos, false),
      (err) => {
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => applyPos(fallbackPos, true),
            () => {
              setIsLocating(false);
              toast.info('Không thể lấy GPS tự động (máy tính không có GPS vệ tinh). Bạn có thể chỉnh tọa độ theo bản đồ.');
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          setIsLocating(false);
          toast.info('Quyền truy cập vị trí chưa được cấp.');
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
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
    if (!isAuthenticated || !user) {
      setIsAuthModalOpen(true);
      toast.warning('Vui lòng đăng nhập để gửi sự cố vào Hàng đợi điều phối.');
      return;
    }
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

  // Vòng lặp Render 60 FPS GPU-accelerated Overlay Canvas với thuật toán nội suy & ngoại suy quán tính
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const renderOverlay = (now: number) => {
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const canvas = overlayCanvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const displayW = Math.round(rect.width);
        const displayH = Math.round(rect.height);

        if (displayW > 0 && displayH > 0) {
          if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
            canvas.width = Math.round(displayW * dpr);
            canvas.height = Math.round(displayH * dpr);
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, displayW, displayH);

            const videoW = video.videoWidth || 640;
            const videoH = video.videoHeight || 360;
            const videoAspect = videoW / videoH;
            const containerAspect = displayW / displayH;

            let renderedW = displayW;
            let renderedH = displayH;
            let offsetX = 0;
            let offsetY = 0;

            if (containerAspect > videoAspect) {
              renderedH = displayH;
              renderedW = displayH * videoAspect;
              offsetX = (displayW - renderedW) / 2;
            } else {
              renderedW = displayW;
              renderedH = displayW / videoAspect;
              offsetY = (displayH - renderedH) / 2;
            }

            const isVideoMoving = isPlaying && !video.paused;
            const playRate = video.playbackRate || 1.0;

            const tracks = visualTracksRef.current;
            const updatedTracks: TrackedVisualObject[] = [];

            for (const track of tracks) {
              const timeSinceSeen = now - track.lastSeenTime;

              if (isVideoMoving) {
                // 1. Cả target và curr cùng trôi theo hướng chuyển động của video
                track.targetX += track.vx * dt * playRate;
                track.targetY += track.vy * dt * playRate;
                track.targetW += track.vw * dt * playRate;
                track.targetH += track.vh * dt * playRate;

                // 2. Nội suy mềm (LERP) mượt mà để curr bám khít target
                const lerpFactor = Math.min(1.0, 20 * dt);
                track.x += (track.targetX - track.x) * lerpFactor;
                track.y += (track.targetY - track.y) * lerpFactor;
                track.w += (track.targetW - track.w) * lerpFactor;
                track.h += (track.targetH - track.h) * lerpFactor;
              } else {
                track.x = track.targetX;
                track.y = track.targetY;
                track.w = track.targetW;
                track.h = track.targetH;
              }

              // Quản lý độ trong suốt (Fade In / Fade Out)
              if (timeSinceSeen > 450 || track.y > 0.96) {
                track.alpha = Math.max(0, track.alpha - dt * 4.0);
              } else {
                track.alpha = Math.min(1.0, track.alpha + dt * 6.0);
              }

              if (track.alpha > 0.02 && timeSinceSeen < 1200) {
                updatedTracks.push(track);

                // Vẽ Bounding Box trực tiếp lên Canvas với tọa độ letterbox chuẩn xác
                const bx = offsetX + track.x * renderedW;
                const by = offsetY + track.y * renderedH;
                const bw = track.w * renderedW;
                const bh = track.h * renderedH;

                if (bw > 6 && bh > 6 && track.alpha > 0.05) {
                  const isCrack = track.category.includes('CRACK');
                  const isFlood = track.category.includes('FLOOD');
                  const isObstacle = track.category.includes('OBSTACLE');

                  const strokeColor = isCrack
                    ? `rgba(245, 158, 11, ${track.alpha})`
                    : isFlood
                    ? `rgba(6, 182, 212, ${track.alpha})`
                    : isObstacle
                    ? `rgba(244, 63, 94, ${track.alpha})`
                    : `rgba(59, 130, 246, ${track.alpha})`;

                  const fillColor = isCrack
                    ? `rgba(245, 158, 11, ${track.alpha * 0.16})`
                    : isFlood
                    ? `rgba(6, 182, 212, ${track.alpha * 0.16})`
                    : isObstacle
                    ? `rgba(244, 63, 94, ${track.alpha * 0.16})`
                    : `rgba(59, 130, 246, ${track.alpha * 0.16})`;

                  const badgeBg = isCrack
                    ? `rgba(217, 119, 6, ${track.alpha * 0.95})`
                    : isFlood
                    ? `rgba(8, 145, 178, ${track.alpha * 0.95})`
                    : isObstacle
                    ? `rgba(225, 29, 72, ${track.alpha * 0.95})`
                    : `rgba(37, 99, 235, ${track.alpha * 0.95})`;

                  const labelTitle = isCrack
                    ? 'Vết nứt'
                    : isFlood
                    ? 'Ngập úng'
                    : isObstacle
                    ? 'Vật cản'
                    : 'Ổ gà';

                  // Nền bán trong suốt và khung viền bo góc
                  ctx.fillStyle = fillColor;
                  ctx.strokeStyle = strokeColor;
                  ctx.lineWidth = 2.5;
                  const radius = Math.min(8, bw / 4, bh / 4);

                  ctx.beginPath();
                  if (ctx.roundRect) {
                    ctx.roundRect(bx, by, bw, bh, radius);
                  } else {
                    ctx.rect(bx, by, bw, bh);
                  }
                  ctx.fill();
                  ctx.stroke();

                  // 4 góc định vị Reticle Corners phong cách xe tuần tra AI
                  const cornerLen = Math.min(12, bw / 3, bh / 3);
                  ctx.lineWidth = 3.5;
                  ctx.strokeStyle = strokeColor;

                  // Góc trên trái
                  ctx.beginPath();
                  ctx.moveTo(bx, by + cornerLen);
                  ctx.lineTo(bx, by);
                  ctx.lineTo(bx + cornerLen, by);
                  ctx.stroke();

                  // Góc trên phải
                  ctx.beginPath();
                  ctx.moveTo(bx + bw - cornerLen, by);
                  ctx.lineTo(bx + bw, by);
                  ctx.lineTo(bx + bw, by + cornerLen);
                  ctx.stroke();

                  // Góc dưới trái
                  ctx.beginPath();
                  ctx.moveTo(bx, by + bh - cornerLen);
                  ctx.lineTo(bx, by + bh);
                  ctx.lineTo(bx + cornerLen, by + bh);
                  ctx.stroke();

                  // Góc dưới phải
                  ctx.beginPath();
                  ctx.moveTo(bx + bw - cornerLen, by + bh);
                  ctx.lineTo(bx + bw, by + bh);
                  ctx.lineTo(bx + bw, by + bh - cornerLen);
                  ctx.stroke();

                  // Nhãn Badge nổi bật trên đỉnh
                  const labelText = `${labelTitle} (${(track.confidence * 100).toFixed(0)}%)`;
                  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
                  const textMetrics = ctx.measureText(labelText);
                  const badgeWidth = textMetrics.width + 16;
                  const badgeHeight = 22;
                  const badgeX = bx;
                  const badgeY = Math.max(2, by - badgeHeight - 4);

                  ctx.fillStyle = badgeBg;
                  ctx.beginPath();
                  if (ctx.roundRect) {
                    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 5);
                  } else {
                    ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
                  }
                  ctx.fill();

                  ctx.fillStyle = '#ffffff';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(labelText, badgeX + 8, badgeY + badgeHeight / 2);
                }
              }
            }

            visualTracksRef.current = updatedTracks;
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Vòng lặp AI trích xuất frame liên tục siêu tốc với Adaptive Sampling, Lọc Trùng IoU & Chọn Frame Tối Ưu
  useEffect(() => {
    if (!isPlaying) {
      setActiveBoxes([]);
      setIsBoxFading(false);
      if (boxFadeTimeoutRef.current) {
        clearTimeout(boxFadeTimeoutRef.current);
      }
      activeTracksRef.current = [];
      visualTracksRef.current = [];
      return;
    }

    let isCancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const intervalTime = SAMPLING_CONFIG[samplingMode].interval;

    const processFrame = async () => {
      if (isCancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.paused) {
        if (!isCancelled) {
          timerId = setTimeout(processFrame, 80);
        }
        return;
      }

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 360;

      // Giới hạn độ phân giải gửi đi tối đa 800px theo chuẩn YOLOv8 để giảm payload từ 3MB xuống ~35KB
      const maxDim = 800;
      let targetW = vw;
      let targetH = vh;
      if (vw > maxDim || vh > maxDim) {
        if (vw >= vh) {
          targetW = maxDim;
          targetH = Math.round((vh / vw) * maxDim);
        } else {
          targetH = maxDim;
          targetW = Math.round((vw / vh) * maxDim);
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (!isCancelled) timerId = setTimeout(processFrame, intervalTime);
        return;
      }
      ctx.drawImage(video, 0, 0, targetW, targetH);

      setIsScanning(true);
      const startTime = performance.now();

      canvas.toBlob(
        async (blob) => {
          if (isCancelled) return;
          if (!blob) {
            setIsScanning(false);
            if (!isCancelled) timerId = setTimeout(processFrame, intervalTime);
            return;
          }

          try {
            const formData = new FormData();
            formData.append('image', blob, 'patrol_frame.jpg');

            const res = await incidentApi.analyzeVideoFrame(formData, confidenceThreshold);
            if (isCancelled) return;

            const data = res.data;
            const latency = Math.round(performance.now() - startTime);
            setInferenceLatency(latency);
            setProcessedFrames((prev) => prev + 1);

            if (data.boxes && data.boxes.length > 0) {
              const refinedBoxes = data.boxes;

              // Khử trùng lặp con (Nested Crack Suppression):
              const potholes = refinedBoxes.filter((b: any) => b.className === 'POTHOLE');
              const finalBoxes = refinedBoxes.filter((b: any) => {
                if (b.className === 'ROAD_CRACK') {
                  const isInsidePothole = potholes.some((p: any) => {
                    const xA = Math.max(p.x, b.x);
                    const yA = Math.max(p.y, b.y);
                    const xB = Math.min(p.x + p.width, b.x + b.width);
                    const yB = Math.min(p.y + p.height, b.y + b.height);
                    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
                    const crackArea = b.width * b.height;
                    const iou = calculateIoU(p, b);
                    return (interArea / Math.max(1, crackArea) >= 0.75) && iou >= 0.35;
                  });
                  return !isInsidePothole;
                }
                return true;
              });

              // Chuẩn hóa tọa độ theo [0, 1] để render khớp 100% vào video hiển thị
              const normalizedBoxes = finalBoxes.map((b: any) => ({
                ...b,
                normX: b.x / targetW,
                normY: b.y / targetH,
                normW: b.width / targetW,
                normH: b.height / targetH,
              }));

              // Đồng bộ ngay lập tức vào Bộ Theo Dõi Trực Quan 60 FPS (Visual Motion Tracker)
              const vNow = performance.now();
              const curVisuals = visualTracksRef.current;

              for (const box of normalizedBoxes) {
                const boxCat = box.className || data.className || 'POTHOLE';
                const boxConf = box.confidence || data.confidence || 0.85;

                let bestTrack: TrackedVisualObject | null = null;
                let bestScore = 0;

                for (const tr of curVisuals) {
                  if (tr.category !== boxCat) continue;
                  const iou = calculateIoU(
                    { x: tr.targetX, y: tr.targetY, width: tr.targetW, height: tr.targetH },
                    { x: box.normX, y: box.normY, width: box.normW, height: box.normH }
                  );
                  const distRatio = centerDistanceRatio(
                    { x: tr.targetX, y: tr.targetY, width: tr.targetW, height: tr.targetH },
                    { x: box.normX, y: box.normY, width: box.normW, height: box.normH },
                    1, 1
                  );
                  if (iou >= 0.12 || distRatio <= 0.25) {
                    const score = iou * 2.0 + (1.0 - distRatio);
                    if (score > bestScore) {
                      bestScore = score;
                      bestTrack = tr;
                    }
                  }
                }

                if (bestTrack) {
                  const dtSec = Math.max(0.04, (vNow - bestTrack.lastSeenTime) / 1000);
                  const measuredVy = Math.max(-0.4, Math.min(0.8, (box.normY - bestTrack.targetY) / dtSec));
                  const measuredVx = Math.max(-0.3, Math.min(0.3, (box.normX - bestTrack.targetX) / dtSec));

                  // Lọc mềm vận tốc quán tính (EMA)
                  bestTrack.vy = bestTrack.vy * 0.40 + measuredVy * 0.60;
                  bestTrack.vx = bestTrack.vx * 0.40 + measuredVx * 0.60;
                  bestTrack.vw = 0; // Giữ nguyên kích thước khung đã ôm sát, không tự ý phồng to
                  bestTrack.vh = 0;

                  // Bù trừ độ trễ mạng và thời gian suy luận (Latency Compensation)
                  // Đón trước vị trí video hiện tại thay vì bị tụt lùi ở frame quá khứ
                  const latencySec = (performance.now() - startTime) / 1000;
                  const compY = box.normY + Math.max(0, bestTrack.vy) * latencySec;
                  const compX = box.normX + bestTrack.vx * latencySec;

                  bestTrack.targetX = Math.max(0, Math.min(0.98, compX));
                  bestTrack.targetY = Math.max(0, Math.min(0.98, compY));
                  bestTrack.targetW = box.normW;
                  bestTrack.targetH = box.normH;
                  bestTrack.confidence = Math.max(bestTrack.confidence, boxConf);
                  bestTrack.lastSeenTime = vNow;
                  bestTrack.hitCount += 1;
                } else {
                  // Khởi tạo track trực quan mới ôm sát ngay tại vị trí phát hiện
                  const latencySec = (performance.now() - startTime) / 1000;
                  const initVy = 0.10;
                  const compY = box.normY + initVy * latencySec;

                  curVisuals.push({
                    id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    category: boxCat,
                    confidence: boxConf,
                    x: box.normX,
                    y: compY,
                    w: box.normW,
                    h: box.normH,
                    targetX: box.normX,
                    targetY: compY,
                    targetW: box.normW,
                    targetH: box.normH,
                    vx: 0,
                    vy: initVy,
                    vw: 0,
                    vh: 0,
                    lastSeenTime: vNow,
                    hitCount: 1,
                    committed: false,
                    alpha: 0.2,
                  });
                }
              }

              // Cập nhật trạng thái telemetry
              setActiveBoxes(normalizedBoxes);
              setIsBoxFading(false);
              if (boxFadeTimeoutRef.current) {
                clearTimeout(boxFadeTimeoutRef.current);
              }
              const boxExpireMs = Math.max(260, intervalTime + 80);
              boxFadeTimeoutRef.current = setTimeout(() => {
                setActiveBoxes([]);
              }, boxExpireMs);

              const now = Date.now();
              // Dọn sạch các track đã trôi qua quá 3.0 giây
              activeTracksRef.current = activeTracksRef.current.filter(
                (track) => now - track.lastSeenTime <= 3000
              );

              // Xử lý các hư hại xuất hiện trong frame với bộ lọc xác nhận 2 lần (Temporal Confirmation Filter)
              const detectedBoxes = normalizedBoxes.slice(0, 8);

              for (const box of detectedBoxes) {
                const boxCat = box.className || data.className || 'POTHOLE';
                const boxConf = box.confidence || data.confidence || 0.85;

                const normBoxObj = { x: box.normX, y: box.normY, width: box.normW, height: box.normH };
                const isSmallFarObject = (box.normW * box.normH) < 0.04;
                const maxAllowedDist = isSmallFarObject ? 0.30 : 0.22;

                const matchedTrack = activeTracksRef.current.find((track) => {
                  if (track.category !== boxCat) return false;
                  const iou = calculateIoU(track.box, normBoxObj);
                  const distRatio = centerDistanceRatio(track.box, normBoxObj, 1, 1);
                  return iou >= 0.15 || distRatio <= maxAllowedDist;
                });

                if (matchedTrack) {
                  matchedTrack.lastSeenTime = now;
                  matchedTrack.box = normBoxObj;
                  matchedTrack.hitCount = (matchedTrack.hitCount || 1) + 1;

                  // Khi vật thể xuất hiện đủ 2 frame liên tiếp -> Xác nhận là hư hại thật và đẩy vào danh sách
                  if (matchedTrack.hitCount >= 2 && !matchedTrack.committed) {
                    matchedTrack.committed = true;
                    const snapshotUrl = URL.createObjectURL(blob);

                    const newIncident: CapturedIncident = {
                      id: matchedTrack.incidentId,
                      timestamp: new Date().toLocaleTimeString('vi-VN'),
                      category: boxCat,
                      confidence: Math.max(boxConf, matchedTrack.maxConfidence),
                      latitude: patrolLocation.lat,
                      longitude: patrolLocation.lng,
                      address: patrolLocation.address,
                      snapshotUrl,
                      blob,
                      status: 'PENDING',
                      framesCount: matchedTrack.hitCount,
                      bestFrameOptimized: false,
                    };

                    setCapturedList((prev) => {
                      if (prev.length >= 20) {
                        URL.revokeObjectURL(prev[prev.length - 1].snapshotUrl);
                      }
                      return [newIncident, ...prev.slice(0, 19)];
                    });

                    if (autoDispatch) {
                      handleDispatchIncident(newIncident, true);
                    }
                  } else if (matchedTrack.committed) {
                    // Cập nhật số frame đã track
                    setCapturedList((prev) =>
                      prev.map((item) => {
                        if (item.id === matchedTrack.incidentId) {
                          return {
                            ...item,
                            framesCount: matchedTrack.hitCount,
                            confidence: Math.max(item.confidence, boxConf),
                          };
                        }
                        return item;
                      })
                    );
                  }
                } else {
                  // Track mới xuất hiện ở frame đầu tiên: khởi tạo theo dõi, chưa vội tạo sự cố rác
                  const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
                  activeTracksRef.current.push({
                    incidentId: newId,
                    category: boxCat,
                    box: normBoxObj,
                    lastSeenTime: now,
                    maxConfidence: boxConf,
                    hitCount: 1,
                    committed: false,
                  });
                }
              }
            } else {
              // Frame hiện tại không có hư hại
              if (boxFadeTimeoutRef.current) {
                clearTimeout(boxFadeTimeoutRef.current);
              }
              const boxExpireMs = Math.max(200, intervalTime + 40);
              boxFadeTimeoutRef.current = setTimeout(() => {
                setActiveBoxes([]);
              }, boxExpireMs);
            }
          } catch (err) {
            // Bỏ qua lỗi gián đoạn frame
          } finally {
            setIsScanning(false);
            if (!isCancelled) {
              const elapsed = performance.now() - startTime;
              const nextDelay = Math.max(20, intervalTime - elapsed);
              timerId = setTimeout(processFrame, nextDelay);
            }
          }
        },
        'image/jpeg',
        0.75
      );
    };

    // Bắt đầu chu kỳ quét ngay lập tức
    processFrame();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
      if (boxFadeTimeoutRef.current) {
        clearTimeout(boxFadeTimeoutRef.current);
      }
    };
  }, [isPlaying, samplingMode, confidenceThreshold, patrolLocation, autoDispatch, handleDispatchIncident]);

  // Xử lý nạp tệp video hành trình
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (videoUrl && videoUrl.startsWith('blob:')) {
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

  // Nạp video tuần tra mẫu tích hợp sẵn để kiểm thử nhanh
  const handleLoadSampleVideo = (samplePath = '/sample-videos/video_tuan_tra_o_ga.mp4', label = 'Tuyến đường có ổ gà') => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(samplePath);
    setSourceMode('UPLOAD');
    if (videoRef.current) {
      videoRef.current.src = samplePath;
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    toast.success(`Đã nạp video tuần tra thực tế: ${label}!`, 'Tuần Tra AI');
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
        <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-on-surface-variant text-[11px]">TẦN SUẤT:</span>
            <strong className="text-amber-500 font-bold">{SAMPLING_CONFIG[samplingMode].label.split(' ')[0]} ({SAMPLING_CONFIG[samplingMode].interval / 1000}s)</strong>
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

            {/* Canvas Lớp Phủ Bắt Dính Bounding Box Thời Gian Thực (60 FPS Motion Interpolation & Reticle) */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

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
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <label className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer hover:bg-primary/90 transition-all flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Chọn Tệp Video Của Bạn</span>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleVideo()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Nạp Video Mẫu (Ổ Gà)</span>
                  </button>
                </div>
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

                {/* Chọn Nguồn: Tải Video vs Camera vs Video Mẫu */}
                <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs">
                  <label
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      sourceMode === 'UPLOAD' && videoUrl !== '/sample-videos/video_tuan_tra_o_ga.mp4'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải Video</span>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>

                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => handleLoadSampleVideo('/sample-videos/video_tuan_tra_o_ga.mp4', 'Mẫu 1 - Ổ gà đường phố')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        videoUrl?.includes('sample-videos')
                          ? 'bg-surface-container-lowest text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'text-amber-600 dark:text-amber-400 hover:text-amber-500'
                      }`}
                      title="Nạp video tuần tra thực tế có ổ gà để kiểm thử nhanh"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Video Mẫu #1</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoadSampleVideo('/sample-videos/pothole_tracker_test.mp4', 'Mẫu 2 - Tuyến đường ổ gà liên tiếp')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      videoUrl === '/sample-videos/pothole_tracker_test.mp4'
                        ? 'bg-surface-container-lowest text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
                    }`}
                    title="Nạp video tuần tra ô tô qua đoạn đường nhiều ổ gà liên tiếp"
                  >
                    <span>Mẫu #2 (Liên tiếp)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadSampleVideo('/sample-videos/test_road2.mp4', 'Mẫu 3 - Vết nứt & Ổ gà đan xen')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      videoUrl === '/sample-videos/test_road2.mp4'
                        ? 'bg-surface-container-lowest text-cyan-600 dark:text-cyan-400 shadow-xs'
                        : 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-500'
                    }`}
                    title="Nạp video tuần tra mặt đường có cả nứt và ổ gà"
                  >
                    <span>Mẫu #3 (Hỗn hợp)</span>
                  </button>

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

            {/* Bộ Chọn Tần Suất Trích Xuất Frame (Adaptive Sampling) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-on-surface">Tần Suất Quét (Adaptive Sampling):</span>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  ({SAMPLING_CONFIG[samplingMode].interval}ms / frame)
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                {(['REALTIME', 'BALANCED', 'ECONOMY'] as SamplingMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSamplingMode(mode)}
                    title={SAMPLING_CONFIG[mode].desc}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      samplingMode === mode
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {SAMPLING_CONFIG[mode].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tốc Độ Phát Video (Playback Speed) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20 text-xs">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-on-surface">Tốc Độ Video:</span>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  ({playbackSpeed}x - Tinh chỉnh để quan sát kỹ)
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                {[0.5, 0.75, 1.0].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      playbackSpeed === speed
                        ? 'bg-surface-container-lowest text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

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
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                        {item.bestFrameOptimized && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Frame tối ưu</span>
                          </span>
                        )}
                        {item.framesCount && item.framesCount > 1 ? (
                          <span className="font-mono text-[9px] font-medium px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant shrink-0">
                            Theo dõi {item.framesCount}f
                          </span>
                        ) : null}
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

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
