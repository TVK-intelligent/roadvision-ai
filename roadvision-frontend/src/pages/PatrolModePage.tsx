import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { patrolApi, PatrolSession } from '../services/patrolApi';
import { PatrolInspectionReportModal } from '../components/PatrolInspectionReportModal';
import { reverseGeocodeAddress, getIpLocationFallback } from '../utils/geoAddress';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { LeafletMap } from '../components/LeafletMap';
import { PatrolRouteMap } from '../components/PatrolRouteMap';
import {
  SAMPLE_ROUTE_1,
  SAMPLE_ROUTE_2,
  SAMPLE_ROUTE_3,
  interpolatePosition,
  getTraveledPath,
  calculateRouteDistanceKm,
  parseGpxOrGeoJson,
  type PatrolPin,
} from '../utils/patrolRoutes';
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
  Target,
  RotateCcw,
  FastForward,
  Rewind,
  Repeat,
  TrendingUp,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Printer,
  History,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Navigation,
} from 'lucide-react';

interface RepresentativeSnapshot {
  blob: Blob;
  snapshotUrl: string;
  confidence: number;
  boxesCount: number;
  timestamp: string;
  score: number;
}

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
  REALTIME: { label: 'Siêu Tốc (0.12s)', interval: 120, desc: 'Tần số quét cao nhất, bám sát từng frame video' },
  BALANCED: { label: 'Tiêu Chuẩn (0.25s)', interval: 250, desc: 'Cân bằng mượt mà' },
  ECONOMY: { label: 'Tiết Kiệm (0.5s)', interval: 500, desc: 'Giảm tải CPU' },
};

interface ActiveTrack {
  incidentId: string;
  category: string;
  box: { x: number; y: number; width: number; height: number };
  lastSeenTime: number;
  maxConfidence: number;
  hitCount: number;
  committed: boolean;
  prevCenterY?: number;
}

interface LinePulseEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  label: string;
}

// Đối tượng theo dõi trực quan mượt mà 60 FPS (Quán tính chuyển động & nội suy mềm)
interface TrackedVisualObject {
  id: string;
  numericId: number;
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
  history: { x: number; y: number }[];
  hasCrossedLine: boolean;
  spawnY?: number;
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
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.22);
  const [autoDispatch, setAutoDispatch] = useState<boolean>(false);
  const autoDispatchRef = useRef<boolean>(autoDispatch);
  useEffect(() => {
    autoDispatchRef.current = autoDispatch;
  }, [autoDispatch]);

  // Điều khiển Phát & Dòng Thời Gian Video (Timeline, Scrubbing & Looping)
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [currentVideoName, setCurrentVideoName] = useState<string>('Video tuần tra đường bộ');
  const isUserSeekingRef = useRef<boolean>(false);
  const lastVideoCurrentTimeRef = useRef<number>(0);

  // Chế độ trích xuất frame thích ứng (Adaptive Sampling) - Mặc định SIÊU TỐC 0.2s để bám sát video
  const [samplingMode, setSamplingMode] = useState<SamplingMode>('REALTIME');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Hệ Thống Vạch Đếm Vật Thể AI (Object Counting Line & Zone)
  const [showCountingLine, setShowCountingLine] = useState<boolean>(true);
  const [countingLineY, setCountingLineY] = useState<number>(0.62); // Vị trí 62% khung hình video
  const [counterStats, setCounterStats] = useState<{
    total: number;
    byCategory: Record<string, number>;
  }>({
    total: 0,
    byCategory: { POTHOLE: 0, ROAD_CRACK: 0, ROAD_FLOODING: 0, ROAD_OBSTACLE: 0 },
  });

  const nextTrackNumericIdRef = useRef<number>(1);
  const lineFlashUntilRef = useRef<number>(0);
  const pulseEffectsRef = useRef<LinePulseEffect[]>([]);
  const showCountingLineRef = useRef<boolean>(true);
  const countingLineYRef = useRef<number>(0.62);
  const recentCountedLocationsRef = useRef<{ x: number; y: number; time: number }[]>([]);

  useEffect(() => {
    showCountingLineRef.current = showCountingLine;
  }, [showCountingLine]);

  useEffect(() => {
    countingLineYRef.current = countingLineY;
  }, [countingLineY]);

  const handleResetCounter = () => {
    setCounterStats({
      total: 0,
      byCategory: { POTHOLE: 0, ROAD_CRACK: 0, ROAD_FLOODING: 0, ROAD_OBSTACLE: 0 },
    });
    nextTrackNumericIdRef.current = 1;
    recentCountedLocationsRef.current = [];
    for (const t of visualTracksRef.current) {
      t.hasCrossedLine = false;
    }
    toast.info('Đã thiết lập lại Bộ Đếm Vật Thể về 0!', 'Bộ Đếm AI');
  };

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
    lat: 20.437269,
    lng: 105.903159,
    address: 'Tuyến ĐH.08, Xã Thanh Lâm, Phố Cà, Thanh Liêm, Hà Nam',
  });
  const patrolLocationRef = useRef(patrolLocation);
  useEffect(() => {
    patrolLocationRef.current = patrolLocation;
  }, [patrolLocation]);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Lộ trình GPS tuần tra và đồng bộ thời gian thực theo video
  const [routePoints, setRoutePoints] = useState<[number, number][]>(SAMPLE_ROUTE_1);
  const routePointsRef = useRef<[number, number][]>(SAMPLE_ROUTE_1);
  const [currentCarPosition, setCurrentCarPosition] = useState<[number, number]>(SAMPLE_ROUTE_1[0]);
  const currentCarPositionRef = useRef<[number, number]>(SAMPLE_ROUTE_1[0]);
  const [incidentPins, setIncidentPins] = useState<PatrolPin[]>([]);
  const gpxFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    routePointsRef.current = routePoints;
  }, [routePoints]);

  // Đồng bộ vị trí xe tuần tra dọc theo đường Polyline theo tiến độ video
  useEffect(() => {
    const progress = videoDuration > 0 ? Math.min(1, Math.max(0, videoCurrentTime / videoDuration)) : 0;
    const pos = interpolatePosition(routePoints, progress);
    setCurrentCarPosition(pos);
    currentCarPositionRef.current = pos;
    setPatrolLocation((prev) => ({
      ...prev,
      lat: pos[0],
      lng: pos[1],
    }));
  }, [videoCurrentTime, videoDuration, routePoints]);

  const traveledRoutePoints = useMemo(() => {
    const progress = videoDuration > 0 ? Math.min(1, Math.max(0, videoCurrentTime / videoDuration)) : 0;
    return getTraveledPath(routePoints, currentCarPosition, progress);
  }, [routePoints, currentCarPosition, videoCurrentTime, videoDuration]);

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

  // Ảnh tiêu biểu nhất của chuyến tuần tra tuyến đường (Tối đa 1-2 ảnh cho toàn bộ video)
  const [bestSnapshot, setBestSnapshot] = useState<RepresentativeSnapshot | null>(null);
  const bestSnapshotRef = useRef<RepresentativeSnapshot | null>(null);
  const [secondarySnapshot, setSecondarySnapshot] = useState<RepresentativeSnapshot | null>(null);
  const secondarySnapshotRef = useRef<RepresentativeSnapshot | null>(null);

  // Trạng thái gửi báo cáo tuần tra tuyến đường tổng hợp (1 phiếu duy nhất)
  const [routeReportStatus, setRouteReportStatus] = useState<'IDLE' | 'SENDING' | 'DISPATCHED'>('IDLE');
  const [dispatchedIncidentId, setDispatchedIncidentId] = useState<string | null>(null);
  const [lastCreatedSession, setLastCreatedSession] = useState<PatrolSession | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Tab & Lịch sử phiên tuần tra
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'HISTORY'>('CAMERA');
  const [patrolSessions, setPatrolSessions] = useState<PatrolSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [selectedSessionForReport, setSelectedSessionForReport] = useState<PatrolSession | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Lấy tọa độ GPS thực tế của thiết bị (có fallback IP mạng cực mạnh khi chạy trên desktop/PC không có GPS)
  const handleGetCurrentLocation = () => {
    setIsLocating(true);

    const applyPos = async (lat: number, lng: number, isIpFallback = false) => {
      const addr = await reverseGeocodeAddress(lat, lng);
      setPatrolLocation({ lat, lng, address: addr });
      setIsLocating(false);
      toast.success(
        isIpFallback
          ? `Đã lấy vị trí qua mạng Internet (${addr.split(',')[0]})!`
          : 'Đã cập nhật vị trí tuần tra từ GPS thiết bị'
      );
    };

    if (!navigator.geolocation) {
      getIpLocationFallback().then((ipPos) => {
        if (ipPos) {
          applyPos(ipPos.lat, ipPos.lng, true);
        } else {
          setIsLocating(false);
          toast.warning('Trình duyệt không hỗ trợ Geolocation. Bạn có thể chỉnh tọa độ theo bản đồ.');
        }
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => applyPos(pos.coords.latitude, pos.coords.longitude, false),
      async (err) => {
        console.warn('Patrol geolocation error, falling back to IP:', err.message);
        const ipPos = await getIpLocationFallback();
        if (ipPos) {
          applyPos(ipPos.lat, ipPos.lng, true);
        } else {
          setIsLocating(false);
          toast.info('Không thể lấy GPS tự động (máy tính không có GPS vệ tinh). Bạn có thể chỉnh tọa độ theo bản đồ.');
        }
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
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
      if (bestSnapshotRef.current) {
        URL.revokeObjectURL(bestSnapshotRef.current.snapshotUrl);
      }
      if (secondarySnapshotRef.current) {
        URL.revokeObjectURL(secondarySnapshotRef.current.snapshotUrl);
      }
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  // Nạp lịch sử các phiên tuần tra của người dùng
  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingSessions(true);
    try {
      const data = await patrolApi.getMySessions({ size: 30 });
      setPatrolSessions(data.content || []);
    } catch (err: any) {
      console.error('Lỗi nạp lịch sử phiên tuần tra:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'HISTORY' || isAuthenticated) {
      loadHistory();
    }
  }, [activeTab, isAuthenticated, loadHistory]);

  // Thiết lập lại toàn bộ phiên tuần tra
  const resetPatrolSession = useCallback(() => {
    if (bestSnapshotRef.current) {
      URL.revokeObjectURL(bestSnapshotRef.current.snapshotUrl);
      bestSnapshotRef.current = null;
      setBestSnapshot(null);
    }
    if (secondarySnapshotRef.current) {
      URL.revokeObjectURL(secondarySnapshotRef.current.snapshotUrl);
      secondarySnapshotRef.current = null;
      setSecondarySnapshot(null);
    }
    capturedList.forEach((item) => URL.revokeObjectURL(item.snapshotUrl));
    setCapturedList([]);
    setCounterStats({
      total: 0,
      byCategory: { POTHOLE: 0, ROAD_CRACK: 0, ROAD_FLOODING: 0, ROAD_OBSTACLE: 0 },
    });
    setRouteReportStatus('IDLE');
    setDispatchedIncidentId(null);
    setLastCreatedSession(null);
    nextTrackNumericIdRef.current = 1;
    recentCountedLocationsRef.current = [];
    visualTracksRef.current = [];
    activeTracksRef.current = [];
    setIncidentPins([]);
    toast.info('Đã làm mới dữ liệu phiên tuần tra', 'Tuần Tra AI');
  }, [capturedList]);

  // Xử lý gửi 1 Báo Cáo Tuần Tra Tuyến Đường Tổng Hợp (Lưu vào PatrolSession và tạo Incident điều phối)
  const handleDispatchRouteReport = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsAuthModalOpen(true);
      toast.warning('Vui lòng đăng nhập để gửi báo cáo tuần tra vào hệ thống.');
      return;
    }
    const snap = bestSnapshotRef.current;
    if (!snap) {
      toast.warning('Chưa có ảnh tiêu biểu nào được ghi nhận để tạo báo cáo.');
      return;
    }

    setRouteReportStatus('SENDING');
    try {
      const potholeCount = counterStats.byCategory.POTHOLE || 0;
      const crackCount = counterStats.byCategory.ROAD_CRACK || 0;
      const floodCount = counterStats.byCategory.ROAD_FLOODING || 0;
      const obstacleCount = counterStats.byCategory.ROAD_OBSTACLE || 0;
      const totalCount = counterStats.total || (potholeCount + crackCount + floodCount + obstacleCount);

      const severity: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
        totalCount >= 5 || potholeCount >= 4 ? 'CRITICAL' : totalCount >= 2 ? 'HIGH' : 'MEDIUM';

      const detailsList = [];
      if (potholeCount > 0) detailsList.push(`${potholeCount} ổ gà`);
      if (crackCount > 0) detailsList.push(`${crackCount} vết nứt`);
      if (floodCount > 0) detailsList.push(`${floodCount} điểm ngập`);
      if (obstacleCount > 0) detailsList.push(`${obstacleCount} vật cản`);
      const detailsStr = detailsList.join(', ') || `${totalCount} hư hại`;

      const startLat = routePoints.length > 0 ? routePoints[0][0] : patrolLocation.lat;
      const startLng = routePoints.length > 0 ? routePoints[0][1] : patrolLocation.lng;
      const endLat = routePoints.length > 1 ? routePoints[routePoints.length - 1][0] : startLat;
      const endLng = routePoints.length > 1 ? routePoints[routePoints.length - 1][1] : startLng;
      const totalKm = calculateRouteDistanceKm(routePoints);

      const formData = new FormData();
      formData.append('routeName', patrolLocation.address || 'Tuyến đường tuần tra');
      formData.append('keyframe1', snap.blob, 'patrol_keyframe_1.jpg');
      if (secondarySnapshotRef.current?.blob) {
        formData.append('keyframe2', secondarySnapshotRef.current.blob, 'patrol_keyframe_2.jpg');
      }
      formData.append('startLatitude', startLat.toString());
      formData.append('startLongitude', startLng.toString());
      formData.append('endLatitude', endLat.toString());
      formData.append('endLongitude', endLng.toString());
      formData.append('totalDistanceKm', (totalKm > 0 ? totalKm : 1.2).toString());
      formData.append('gpsPathJson', JSON.stringify(routePoints));
      formData.append('totalPotholesDetected', totalCount.toString());
      formData.append('routeHealthRating', severity);
      formData.append('videoName', currentVideoName || 'Video tuần tra đường bộ');
      formData.append('notes', `Lộ trình ${routePoints.length} mốc GPS (${(totalKm > 0 ? totalKm : 1.2)} km). Phát hiện: ${detailsStr}. Mức độ đánh giá: ${severity}`);

      const session = await patrolApi.createSession(formData);
      setRouteReportStatus('DISPATCHED');
      setDispatchedIncidentId(session.sessionCode);
      setLastCreatedSession(session);

      if (session.hasNearbyDuplicate) {
        toast.warning(
          `Cảnh báo đối chiếu: Đã có phản ánh [${session.duplicateTicketCode}] lân cận (${session.duplicateDistanceMeters}m). Hệ thống đã tự động liên kết!`,
          'Chống Trùng Lặp PostGIS'
        );
      } else {
        toast.success(
          `Đã tạo thành công Phiên Tuần Tra [${session.sessionCode}] & Hồ sơ điều phối [${session.incidentTicketCode}]!`,
          'Tuần Tra AI'
        );
      }

      loadHistory();
    } catch (e: any) {
      setRouteReportStatus('IDLE');
      toast.error('Lỗi khi gửi báo cáo tuần tra: ' + (e.response?.data?.message || e.message));
    }
  }, [isAuthenticated, user, patrolLocation, counterStats, currentVideoName, routePoints, loadHistory]);

  // Xử lý gửi sự cố tuần tra riêng lẻ vào hệ thống trung tâm
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
  }, [isAuthenticated, user]);

  const handleDispatchIncidentRef = useRef(handleDispatchIncident);
  useEffect(() => {
    handleDispatchIncidentRef.current = handleDispatchIncident;
  }, [handleDispatchIncident]);

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

            // 1. Vẽ Vạch Đếm & Vùng Kiểm Soát AI (AI Counting Gate & Scanning Zone)
            if (showCountingLineRef.current) {
              const lineYRatio = countingLineYRef.current;
              const linePixelY = offsetY + lineYRatio * renderedH;
              const lineStartX = offsetX;
              const lineEndX = offsetX + renderedW;

              const isFlashing = now < lineFlashUntilRef.current;
              const lineGlowColor = isFlashing ? '#22c55e' : '#06b6d4';
              const lineStrokeColor = isFlashing ? 'rgba(34, 197, 94, 0.98)' : 'rgba(6, 182, 212, 0.90)';

              ctx.save();

              // A. Dải sáng kiểm soát quét đếm (Counting Beam Zone)
              const zoneHalfH = Math.max(14, renderedH * 0.04);
              const zoneGrad = ctx.createLinearGradient(0, linePixelY - zoneHalfH, 0, linePixelY + zoneHalfH);
              zoneGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
              zoneGrad.addColorStop(0.5, isFlashing ? 'rgba(34, 197, 94, 0.28)' : 'rgba(6, 182, 212, 0.14)');
              zoneGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
              ctx.fillStyle = zoneGrad;
              ctx.fillRect(lineStartX, linePixelY - zoneHalfH, renderedW, zoneHalfH * 2);

              // B. Trụ cảm biến laser 2 bên mép đường (Gate Sensors)
              ctx.fillStyle = isFlashing ? '#22c55e' : '#06b6d4';
              ctx.shadowColor = lineGlowColor;
              ctx.shadowBlur = isFlashing ? 18 : 10;
              ctx.fillRect(lineStartX, linePixelY - 16, 8, 32);
              ctx.fillRect(lineEndX - 8, linePixelY - 16, 8, 32);

              // C. Đường laser nét đứt công nghệ cao
              ctx.strokeStyle = lineStrokeColor;
              ctx.lineWidth = isFlashing ? 4.0 : 2.5;
              ctx.beginPath();
              ctx.setLineDash([14, 6]);
              ctx.moveTo(lineStartX, linePixelY);
              ctx.lineTo(lineEndX, linePixelY);
              ctx.stroke();
              ctx.setLineDash([]);

              // D. Nhãn Cổng Đếm AI Trung Tâm
              const lineBadgeText = isFlashing
                ? `⚡ KÍCH HOẠT VẠCH ĐẾM AI (${Math.round(lineYRatio * 100)}%)`
                : `VẠCH ĐẾM AI TẬP TRUNG (${Math.round(lineYRatio * 100)}%)`;
              ctx.font = 'bold 10px monospace';
              const lMetrics = ctx.measureText(lineBadgeText);
              const lBadgeW = lMetrics.width + 18;
              const lBadgeH = 22;

              ctx.fillStyle = isFlashing ? 'rgba(34, 197, 94, 0.98)' : 'rgba(6, 182, 212, 0.92)';
              ctx.shadowBlur = 0;
              if (ctx.roundRect) {
                ctx.roundRect(lineStartX + 16, linePixelY - lBadgeH / 2, lBadgeW, lBadgeH, 5);
              } else {
                ctx.rect(lineStartX + 16, linePixelY - lBadgeH / 2, lBadgeW, lBadgeH);
              }
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.textBaseline = 'middle';
              ctx.fillText(lineBadgeText, lineStartX + 25, linePixelY);

              // Mũi tên chỉ hướng quét đếm theo chiều tiến xe
              const numArrows = 6;
              const arrowSpacing = renderedW / (numArrows + 1);
              ctx.fillStyle = lineStrokeColor;
              for (let i = 1; i <= numArrows; i++) {
                const ax = lineStartX + i * arrowSpacing;
                const ay = linePixelY + 5;
                ctx.beginPath();
                ctx.moveTo(ax - 5, ay);
                ctx.lineTo(ax, ay + 7);
                ctx.lineTo(ax + 5, ay);
                ctx.closePath();
                ctx.fill();
              }
              ctx.restore();
            }

            const tracks = visualTracksRef.current;
            const updatedTracks: TrackedVisualObject[] = [];

            for (const track of tracks) {
              const timeSinceSeen = now - track.lastSeenTime;
              const prevCenterY = track.y + track.h / 2;

              // Nội suy mượt mà LERP bám sát 100% tọa độ chuẩn xác của mô hình AI
              const lerpFactor = Math.min(1.0, 16 * dt);
              track.x += (track.targetX - track.x) * lerpFactor;
              track.y += (track.targetY - track.y) * lerpFactor;
              track.w += (track.targetW - track.w) * lerpFactor;
              track.h += (track.targetH - track.h) * lerpFactor;

              const currCenterX = track.x + track.w / 2;
              const currCenterY = track.y + track.h / 2;
              const boxTop = track.y;
              const boxBottom = track.y + track.h;

              // Lưu vết lịch sử chuyển động (Trajectory Trail) - Chống nhảy chéo
              if (!track.history) track.history = [];
              const lastPt = track.history[track.history.length - 1];
              if (!lastPt) {
                track.history.push({ x: currCenterX, y: currCenterY });
              } else {
                const jumpDist = Math.hypot(currCenterX - lastPt.x, currCenterY - lastPt.y);
                // Nếu khoảng cách nhảy vọt bất thường (> 0.16) -> reset trajectory, không vẽ đường nối chéo màn hình
                if (jumpDist > 0.16) {
                  track.history = [{ x: currCenterX, y: currCenterY }];
                } else if (jumpDist > 0.002) {
                  track.history.push({ x: currCenterX, y: currCenterY });
                  if (track.history.length > 30) track.history.shift(); // Lưu 30 điểm để vệt đuôi dài và rõ nét như video mẫu Ultralytics
                }
              }

              // KIỂM TRA CHÍNH XÁC: ĐẾM ĐA ĐIỂM ĐỒNG THỜI (SIMULTANEOUS MULTI-OBJECT COUNTING)
              const lineY = countingLineYRef.current;
              const touchesLine = (boxTop <= lineY && boxBottom >= lineY);
              const centroidCrossed = (prevCenterY < lineY && currCenterY >= lineY);
              const passedLine = (currCenterY >= lineY || boxBottom >= lineY);
              // Bắt trọn 100% các ổ gà đi qua vạch (kể cả ổ gà nhỏ hoặc frame nhảy nhanh), không để sót
              const isCrossingAction = centroidCrossed || touchesLine || (passedLine && (track.spawnY === undefined || track.spawnY <= lineY + 0.14));

              if (showCountingLineRef.current && !track.hasCrossedLine && isCrossingAction) {
                // Khóa chống đếm trùng siêu nhạy (Local Fast Debounce):
                // - Chỉ chặn nếu 2 box gần như đè khít lên nhau trong cùng 1 frame hoặc < 180ms (dx < 0.03 && dy < 0.03).
                // - Sau 180ms: Xe đã chạy qua vị trí mới, toàn bộ các ổ gà liên tiếp chạy ngay phía sau ĐỀU ĐƯỢC ĐẾM ĐẦY ĐỦ!
                const recent = recentCountedLocationsRef.current;
                const isDuplicate = recent.some(c => {
                  const dt = now - c.time;
                  if (dt >= 180) return false;
                  const dx = Math.abs(c.x - currCenterX);
                  const dy = Math.abs(c.y - currCenterY);
                  return dx < 0.03 && dy < 0.03;
                });

                if (!isDuplicate) {
                  track.hasCrossedLine = true;
                  recentCountedLocationsRef.current.push({ x: currCenterX, y: currCenterY, time: now });
                  recentCountedLocationsRef.current = recentCountedLocationsRef.current.filter(c => now - c.time < 1200);

                  lineFlashUntilRef.current = now + 400;

                  const catKey = track.category.includes('POTHOLE')
                    ? 'POTHOLE'
                    : track.category.includes('CRACK')
                    ? 'ROAD_CRACK'
                    : track.category.includes('FLOOD')
                    ? 'ROAD_FLOODING'
                    : 'ROAD_OBSTACLE';

                  setCounterStats((prev) => ({
                    total: prev.total + 1,
                    byCategory: {
                      ...prev.byCategory,
                      [catKey]: (prev.byCategory[catKey] || 0) + 1,
                    },
                  }));

                  // Tự động ghim điểm sự cố thời gian thực lên bản đồ Polyline
                  const vTime = videoRef.current?.currentTime || 0;
                  const currentPos = currentCarPositionRef.current;
                  const minStr = Math.floor(vTime / 60).toString().padStart(2, '0');
                  const secStr = Math.floor(vTime % 60).toString().padStart(2, '0');
                  const labelType = catKey === 'POTHOLE' ? 'Ổ gà' : catKey === 'ROAD_CRACK' ? 'Vết nứt' : 'Sự cố';

                  setIncidentPins((prev) => [
                    ...prev,
                    {
                      id: `pin_${now}_${track.numericId || prev.length + 1}`,
                      lat: currentPos[0],
                      lng: currentPos[1],
                      label: `${labelType} #${track.numericId || prev.length + 1}`,
                      category: catKey,
                      timestampSec: vTime,
                      timeStr: `${minStr}:${secStr}`,
                    },
                  ]);

                  pulseEffectsRef.current.push({
                    id: `${now}_${Math.random()}`,
                    x: currCenterX,
                    y: lineY,
                    radius: 6,
                    maxRadius: 44,
                    alpha: 1.0,
                    color: '#22c55e',
                    label: '+1 ĐÃ QUA VẠCH',
                  });
                }
              }

              // Quản lý độ trong suốt (Fade In / Fade Out)
              if (timeSinceSeen > 450 || track.y > 0.96) {
                track.alpha = Math.max(0, track.alpha - dt * 4.0);
              } else {
                track.alpha = Math.min(1.0, track.alpha + dt * 6.0);
              }

              if (track.alpha > 0.02 && timeSinceSeen < 1200) {
                updatedTracks.push(track);

                // Tọa độ vẽ canvas theo chuẩn letterbox
                const bx = offsetX + track.x * renderedW;
                const by = offsetY + track.y * renderedH;
                const bw = track.w * renderedW;
                const bh = track.h * renderedH;

                if (bw > 6 && bh > 6 && track.alpha > 0.05) {
                  const isCrack = track.category.includes('CRACK');
                  const isFlood = track.category.includes('FLOOD');
                  const isObstacle = track.category.includes('OBSTACLE');

                  // MÀU SẮC ĐỒNG BỘ NỔI BẬT THEO VẠCH ĐẾM:
                  // 1. Nếu đã đếm qua vạch -> Xanh lá dạ quang rực rỡ
                  // 2. Nếu đang chạm ngay vạch -> Vàng laser chói lọi
                  // 3. Nếu chưa đến vạch -> Màu nhận diện tiêu chuẩn
                  let strokeColor: string;
                  let fillColor: string;
                  let badgeBg: string;

                  if (track.hasCrossedLine) {
                    strokeColor = `rgba(34, 197, 94, ${track.alpha})`;
                    fillColor = `rgba(34, 197, 94, ${track.alpha * 0.22})`;
                    badgeBg = `rgba(22, 163, 74, ${track.alpha * 0.95})`;
                  } else if (touchesLine) {
                    strokeColor = `rgba(250, 204, 21, ${track.alpha})`;
                    fillColor = `rgba(250, 204, 21, ${track.alpha * 0.25})`;
                    badgeBg = `rgba(202, 138, 4, ${track.alpha * 0.95})`;
                  } else {
                    strokeColor = isCrack
                      ? `rgba(245, 158, 11, ${track.alpha})`
                      : isFlood
                      ? `rgba(6, 182, 212, ${track.alpha})`
                      : isObstacle
                      ? `rgba(244, 63, 94, ${track.alpha})`
                      : `rgba(236, 72, 153, ${track.alpha})`; // Hồng cánh sen rực rỡ đặc trưng Ultralytics YOLO!

                    fillColor = isCrack
                      ? `rgba(245, 158, 11, ${track.alpha * 0.14})`
                      : isFlood
                      ? `rgba(6, 182, 212, ${track.alpha * 0.14})`
                      : isObstacle
                      ? `rgba(244, 63, 94, ${track.alpha * 0.14})`
                      : `rgba(236, 72, 153, ${track.alpha * 0.14})`;

                    badgeBg = isCrack
                      ? `rgba(217, 119, 6, ${track.alpha * 0.95})`
                      : isFlood
                      ? `rgba(8, 145, 178, ${track.alpha * 0.95})`
                      : isObstacle
                      ? `rgba(225, 29, 72, ${track.alpha * 0.95})`
                      : `rgba(219, 39, 119, ${track.alpha * 0.95})`; // Badge hồng sen nổi bật
                  }

                  const labelTitle = isCrack
                    ? 'Vết nứt'
                    : isFlood
                    ? 'Ngập úng'
                    : isObstacle
                    ? 'Vật cản'
                    : 'Ổ gà';

                  // 2. Vẽ Vết Quỹ Đạo Chuyển Động (Vệt đuôi vàng dạ quang chuẩn Ultralytics YOLO Tracking)
                  if (track.history && track.history.length > 1 && track.alpha > 0.08) {
                    ctx.save();
                    ctx.strokeStyle = '#facc15'; // Màu vàng tươi rực rỡ bám dính đuôi đối tượng
                    ctx.shadowColor = 'rgba(234, 179, 8, 0.9)';
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = 2.8;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    for (let i = 0; i < track.history.length; i++) {
                      const hx = offsetX + track.history[i].x * renderedW;
                      const hy = offsetY + track.history[i].y * renderedH;
                      if (i === 0) ctx.moveTo(hx, hy);
                      else ctx.lineTo(hx, hy);
                    }
                    ctx.stroke();
                    ctx.restore();
                  }

                  // 3. Vẽ Chấm Tâm Đối Tượng (Centroid Dot) màu vàng dạ quang
                  const cx = offsetX + currCenterX * renderedW;
                  const cy = offsetY + currCenterY * renderedH;
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(cx, cy, 4.5, 0, 2 * Math.PI);
                  ctx.fillStyle = '#facc15';
                  ctx.shadowColor = 'rgba(234, 179, 8, 0.9)';
                  ctx.shadowBlur = 8;
                  ctx.fill();
                  ctx.restore();

                  // 4. Nền bán trong suốt và khung viền bo góc
                  ctx.fillStyle = fillColor;
                  ctx.strokeStyle = strokeColor;
                  ctx.lineWidth = track.hasCrossedLine || touchesLine ? 3.0 : 2.5;
                  const radius = Math.min(8, bw / 4, bh / 4);

                  ctx.beginPath();
                  if (ctx.roundRect) {
                    ctx.roundRect(bx, by, bw, bh, radius);
                  } else {
                    ctx.rect(bx, by, bw, bh);
                  }
                  ctx.fill();
                  ctx.stroke();

                  // 5. 4 góc định vị Reticle Corners phong cách xe tuần tra AI
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

                  // 6. Nhãn Badge nổi bật trên đỉnh kèm trạng thái Vạch Đếm
                  let statusPrefix = '';
                  if (track.hasCrossedLine) {
                    statusPrefix = '✓ ĐÃ ĐẾM ';
                  } else if (touchesLine) {
                    statusPrefix = '⚡ CHẠM VẠCH ';
                  }

                  const labelText = `${statusPrefix}#${track.numericId || 1} ${labelTitle} (${(track.confidence * 100).toFixed(0)}%)`;
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

            // 7. Hiệu ứng Sóng Xung Kích khi Vật Thể Cắt Qua Vạch (Pulse Effects)
            const pulses = pulseEffectsRef.current;
            const activePulses: LinePulseEffect[] = [];
            for (const p of pulses) {
              p.radius += 55 * dt;
              p.alpha = Math.max(0, p.alpha - 2.2 * dt);
              if (p.alpha > 0.02 && p.radius <= p.maxRadius) {
                activePulses.push(p);

                const px = offsetX + p.x * renderedW;
                const py = offsetY + p.y * renderedH;

                ctx.save();
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2.5;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(px, py, p.radius, 0, 2 * Math.PI);
                ctx.stroke();

                // Nhãn nổi +1 ĐÃ ĐẾM
                ctx.font = 'bold 11px monospace';
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.textAlign = 'center';
                ctx.fillText(p.label, px, py - p.radius - 6);
                ctx.restore();
              }
            }
            pulseEffectsRef.current = activePulses;

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
          timerId = setTimeout(processFrame, 30);
        }
        return;
      }

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 360;

      // Giới hạn độ phân giải gửi đi chuẩn 640px (Native YOLOv8) để giảm payload xuống ~35KB, triệt tiêu độ trễ mạng
      const maxDim = 640;
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

              // Chuẩn hóa tọa độ theo [0, 1] và áp dụng Bộ Lọc Hình Học Phối Cảnh & Đường Chân Trời (Perspective Filter)
              // 1. Loại bỏ các box nằm ở đỉnh khung hình (normCenterY < 0.18): Bầu trời, tán cây, phương tiện phía trước
              // 2. Loại bỏ box nằm sát mép dưới capo xe (normCenterY > 0.96)
              // 3. Khử tỷ lệ cạnh dị biệt đối với ổ gà (aspect ratio > 3.8): Vệt sơn, rãnh phân cách
              // 4. Khử bóng râm khổng lồ của cầu vượt, bóng nhà (area > 35%)
              const normalizedBoxes = finalBoxes
                .map((b: any) => ({
                  ...b,
                  normX: b.x / targetW,
                  normY: b.y / targetH,
                  normW: b.width / targetW,
                  normH: b.height / targetH,
                }))
                .filter((b: any) => {
                  const centerY = b.normY + b.normH / 2;
                  if (centerY < 0.18 || centerY > 0.96) return false;
                  const aspect = Math.max(b.normW, b.normH) / Math.max(0.001, Math.min(b.normW, b.normH));
                  if (b.className === 'POTHOLE' && aspect > 3.8) return false;
                  const areaRatio = b.normW * b.normH;
                  if (b.className === 'POTHOLE' && areaRatio > 0.35) return false;
                  return true;
                });

              // Tự động chọn lọc 1–2 ảnh hiện trường tiêu biểu nhất cho toàn bộ chuyến tuần tra video
              if (normalizedBoxes.length > 0) {
                const boxCount = normalizedBoxes.length;
                const maxConf = Math.max(...normalizedBoxes.map((b: any) => b.confidence || 0));
                const totalBoxArea = normalizedBoxes.reduce((acc: number, b: any) => acc + (b.width * b.height), 0) / Math.max(1, (targetW * targetH));
                const frameScore = (boxCount * 3.0) + (maxConf * 2.5) + (totalBoxArea * 4.0);

                if (!bestSnapshotRef.current || frameScore > (bestSnapshotRef.current.score || 0)) {
                  if (bestSnapshotRef.current) {
                    if (secondarySnapshotRef.current) {
                      URL.revokeObjectURL(secondarySnapshotRef.current.snapshotUrl);
                    }
                    secondarySnapshotRef.current = bestSnapshotRef.current;
                    setSecondarySnapshot(bestSnapshotRef.current);
                  }
                  const snapUrl = URL.createObjectURL(blob);
                  const newBest: RepresentativeSnapshot = {
                    blob,
                    snapshotUrl: snapUrl,
                    confidence: maxConf,
                    boxesCount: boxCount,
                    timestamp: new Date().toLocaleTimeString('vi-VN'),
                    score: frameScore,
                  };
                  bestSnapshotRef.current = newBest;
                  setBestSnapshot(newBest);
                }
              }

              // BỘ THEO DÕI ĐA MỤC TIÊU BYTETRACK (2-STAGE MULTI-OBJECT ASSOCIATION)
              // Giải quyết triệt để tình trạng nhấp nháy (flickering) và nhảy cóc vị trí/ID!
              const vNow = performance.now();
              const curVisuals = visualTracksRef.current;

              // Tách 2 tầng theo chuẩn thuật toán ByteTrack:
              const highConfBoxes = normalizedBoxes.filter((b: any) => (b.confidence || 0) >= 0.20);
              const lowConfBoxes = normalizedBoxes.filter((b: any) => (b.confidence || 0) < 0.20);

              const matchedVisualIds = new Set<string>();

              // Giai đoạn 1: Liên kết các box có độ tin cậy cao
              for (const box of highConfBoxes) {
                const boxCat = box.className || data.className || 'POTHOLE';
                const boxConf = box.confidence || 0.85;

                let bestTrack: TrackedVisualObject | null = null;
                let bestScore = 0;

                for (const tr of curVisuals) {
                  if (matchedVisualIds.has(tr.id) || tr.category !== boxCat) continue;
                  const iou = calculateIoU(
                    { x: tr.targetX, y: tr.targetY, width: tr.targetW, height: tr.targetH },
                    { x: box.normX, y: box.normY, width: box.normW, height: box.normH }
                  );
                  const distRatio = centerDistanceRatio(
                    { x: tr.targetX, y: tr.targetY, width: tr.targetW, height: tr.targetH },
                    { x: box.normX, y: box.normY, width: box.normW, height: box.normH },
                    1, 1
                  );
                  const dy = box.normY - tr.targetY;
                  const dx = Math.abs(box.normX - tr.targetX);
                  const isTrackForward = dy >= -0.05 && dy <= 0.28 && dx <= 0.12;

                  if (iou >= 0.12 || (distRatio <= 0.22 && dx <= 0.12) || (isTrackForward && (iou >= 0.04 || distRatio <= 0.28))) {
                    const score = iou * 3.0 + (1.0 - Math.min(1.0, distRatio * 2)) + (isTrackForward ? 0.8 : 0);
                    if (score > bestScore) {
                      bestScore = score;
                      bestTrack = tr;
                    }
                  }
                }

                if (bestTrack) {
                  matchedVisualIds.add(bestTrack.id);
                  bestTrack.targetX = box.normX;
                  bestTrack.targetY = box.normY;
                  bestTrack.targetW = box.normW;
                  bestTrack.targetH = box.normH;
                  bestTrack.confidence = Math.max(bestTrack.confidence, boxConf);
                  bestTrack.lastSeenTime = vNow;
                  bestTrack.hitCount += 1;
                } else {
                  // Khởi tạo track trực quan mới ôm sát ngay tại vị trí phát hiện
                  const assignedNumId = nextTrackNumericIdRef.current++;
                  curVisuals.push({
                    id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    numericId: assignedNumId,
                    category: boxCat,
                    confidence: boxConf,
                    x: box.normX,
                    y: box.normY,
                    w: box.normW,
                    h: box.normH,
                    targetX: box.normX,
                    targetY: box.normY,
                    targetW: box.normW,
                    targetH: box.normH,
                    vx: 0,
                    vy: 0,
                    vw: 0,
                    vh: 0,
                    lastSeenTime: vNow,
                    hitCount: 1,
                    committed: false,
                    alpha: 1.0,
                    history: [{ x: box.normX + box.normW / 2, y: box.normY + box.normH / 2 }],
                    hasCrossedLine: false,
                    spawnY: box.normY + box.normH / 2,
                  });
                }
              }

              // Giai đoạn 2 (ByteTrack Stage 2): Cứu vãn các Track hiện hữu chưa được khớp bằng Low-Confidence Boxes
              // Khi xe rung lắc hoặc motion blur làm confidence sụt giảm nhẹ, ByteTrack vẫn giữ nguyên ID và không ngắt quãng track!
              for (const box of lowConfBoxes) {
                const boxCat = box.className || data.className || 'POTHOLE';
                let bestTrack: TrackedVisualObject | null = null;
                let bestScore = 0;

                for (const tr of curVisuals) {
                  if (matchedVisualIds.has(tr.id) || tr.category !== boxCat) continue;
                  const iou = calculateIoU(
                    { x: tr.targetX, y: tr.targetY, width: tr.targetW, height: tr.targetH },
                    { x: box.normX, y: box.normY, width: box.normW, height: box.normH }
                  );
                  const distRatio = centerDistanceRatio(
                    { x: tr.targetX, y: tr.targetY, width: tr.targetW, height: tr.targetH },
                    { x: box.normX, y: box.normY, width: box.normW, height: box.normH },
                    1, 1
                  );
                  const dy = box.normY - tr.targetY;
                  const dx = Math.abs(box.normX - tr.targetX);
                  const isTrackForward = dy >= -0.05 && dy <= 0.28 && dx <= 0.12;

                  if (iou >= 0.14 || (distRatio <= 0.20 && isTrackForward)) {
                    const score = iou * 2.0 + (1.0 - distRatio);
                    if (score > bestScore) {
                      bestScore = score;
                      bestTrack = tr;
                    }
                  }
                }

                if (bestTrack) {
                  matchedVisualIds.add(bestTrack.id);
                  bestTrack.targetX = box.normX;
                  bestTrack.targetY = box.normY;
                  bestTrack.targetW = box.normW;
                  bestTrack.targetH = box.normH;
                  bestTrack.lastSeenTime = vNow;
                  bestTrack.hitCount += 1;
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

              // Xử lý các hư hại xuất hiện trong frame với bộ lọc thông minh đa mục tiêu
              const detectedBoxes = normalizedBoxes.slice(0, 15);

              for (const box of detectedBoxes) {
                const boxCat = box.className || data.className || 'POTHOLE';
                const boxConf = box.confidence || data.confidence || 0.85;

                const normBoxObj = { x: box.normX, y: box.normY, width: box.normW, height: box.normH };
                const isSmallFarObject = (box.normW * box.normH) < 0.04;
                const maxAllowedDist = isSmallFarObject ? 0.35 : 0.28;

                const matchedTrack = activeTracksRef.current.find((track) => {
                  if (track.category !== boxCat) return false;
                  const iou = calculateIoU(track.box, normBoxObj);
                  const distRatio = centerDistanceRatio(track.box, normBoxObj, 1, 1);
                  const trDy = normBoxObj.y - track.box.y;
                  const trDx = Math.abs(normBoxObj.x - track.box.x);
                  const isTrackForward = trDy >= -0.05 && trDy <= 0.28 && trDx <= 0.12;
                  return iou >= 0.12 || (distRatio <= 0.22 && trDx <= 0.12) || (isTrackForward && (iou >= 0.04 || distRatio <= 0.28));
                });

                if (matchedTrack) {
                  const prevCenterY = matchedTrack.prevCenterY ?? (matchedTrack.box.y + matchedTrack.box.height / 2);
                  const currCenterY = normBoxObj.y + normBoxObj.height / 2;
                  matchedTrack.prevCenterY = currCenterY;
                  matchedTrack.lastSeenTime = now;
                  matchedTrack.box = normBoxObj;
                  matchedTrack.hitCount = (matchedTrack.hitCount || 1) + 1;
                  matchedTrack.maxConfidence = Math.max(matchedTrack.maxConfidence, boxConf);

                  // Xác nhận hư hại thật: TẬP TRUNG CHÍNH XÁC KHI ĐỐI TƯỢNG ĐẾN/CẮT VẠCH ĐẾM AI
                  const lineY = countingLineYRef.current;
                  const boxTop = normBoxObj.y;
                  const boxBottom = normBoxObj.y + normBoxObj.height;
                  const touchesLine = (boxTop <= lineY && boxBottom >= lineY - 0.04);
                  const crossedLine = (prevCenterY <= lineY && currCenterY >= lineY);
                  const passedLine = (boxBottom >= lineY);
                  const touchesOrCrossesLine = touchesLine || crossedLine || passedLine;

                  // Điều kiện commit chống sót & chống bắt nhầm:
                  // 1. Phải được xác thực qua ít nhất 2 frame quét (hitCount >= 2) khi qua vạch
                  // 2. HOẶC đối tượng có độ tin cậy vượt trội (>= 0.55) khi chạm vạch
                  // 3. HOẶC đối tượng bền vững xuất hiện liên tiếp (hitCount >= 3)
                  const isHighConfidenceHit = boxConf >= 0.55 || matchedTrack.maxConfidence >= 0.55;
                  const canCommit = !matchedTrack.committed && (
                    (matchedTrack.hitCount >= 2 && touchesOrCrossesLine) ||
                    (isHighConfidenceHit && touchesOrCrossesLine) ||
                    matchedTrack.hitCount >= 3
                  );

                  if (canCommit) {
                    matchedTrack.committed = true;
                    const snapshotUrl = URL.createObjectURL(blob);

                    const newIncident: CapturedIncident = {
                      id: matchedTrack.incidentId,
                      timestamp: new Date().toLocaleTimeString('vi-VN'),
                      category: boxCat,
                      confidence: Math.max(boxConf, matchedTrack.maxConfidence),
                      latitude: patrolLocationRef.current.lat,
                      longitude: patrolLocationRef.current.lng,
                      address: patrolLocationRef.current.address,
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

                    if (autoDispatchRef.current) {
                      handleDispatchIncidentRef.current(newIncident, true);
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
                  // Track mới xuất hiện: chỉ khởi tạo theo dõi, tập trung commit khi đối tượng đến Vạch Đếm AI
                  const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
                  const lineY = countingLineYRef.current;
                  const currCenterY = normBoxObj.y + normBoxObj.height / 2;
                  const isTouchingLineNow = (normBoxObj.y <= lineY && normBoxObj.y + normBoxObj.height >= lineY);

                  // Chống bắt nhầm: Chỉ commit ngay nếu độ tin cậy RẤT CAO (>= 0.60) VÀ đang đè trực tiếp lên vạch.
                  // Ngược lại, bắt buộc phải chờ frame tiếp theo (hitCount >= 2) để lọc bỏ 100% bóng râm / vệt sáng chớp tắt 1 frame!
                  const canImmediateCommit = isTouchingLineNow && boxConf >= 0.60;

                  if (canImmediateCommit) {
                    const snapshotUrl = URL.createObjectURL(blob);
                    const newIncident: CapturedIncident = {
                      id: newId,
                      timestamp: new Date().toLocaleTimeString('vi-VN'),
                      category: boxCat,
                      confidence: boxConf,
                      latitude: patrolLocationRef.current.lat,
                      longitude: patrolLocationRef.current.lng,
                      address: patrolLocationRef.current.address,
                      snapshotUrl,
                      blob,
                      status: 'PENDING',
                      framesCount: 1,
                      bestFrameOptimized: false,
                    };

                    setCapturedList((prev) => {
                      if (prev.length >= 20) {
                        URL.revokeObjectURL(prev[prev.length - 1].snapshotUrl);
                      }
                      return [newIncident, ...prev.slice(0, 19)];
                    });

                    if (autoDispatchRef.current) {
                      handleDispatchIncidentRef.current(newIncident, true);
                    }
                  }

                  activeTracksRef.current.push({
                    incidentId: newId,
                    category: boxCat,
                    box: normBoxObj,
                    lastSeenTime: now,
                    maxConfidence: boxConf,
                    hitCount: 1,
                    committed: canImmediateCommit,
                    prevCenterY: currCenterY,
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
  }, [isPlaying, samplingMode, confidenceThreshold]);

  // Đồng bộ thời lượng video khi video được nạp
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const updateMeta = () => {
      if (v.duration && !isNaN(v.duration)) {
        setVideoDuration(v.duration);
      }
      setVideoCurrentTime(v.currentTime || 0);
    };
    v.addEventListener('loadedmetadata', updateMeta);
    v.addEventListener('durationchange', updateMeta);
    if (v.duration && !isNaN(v.duration)) {
      setVideoDuration(v.duration);
      setVideoCurrentTime(v.currentTime || 0);
    }
    return () => {
      v.removeEventListener('loadedmetadata', updateMeta);
      v.removeEventListener('durationchange', updateMeta);
    };
  }, [videoUrl]);

  // Định dạng thời gian mm:ss
  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Xử lý tua trực tiếp bằng thanh trượt thời gian
  const handleSeek = (newTime: number) => {
    const v = videoRef.current;
    if (!v) return;
    const maxDur = v.duration || videoDuration || 0;
    const clampedTime = Math.max(0, Math.min(newTime, maxDur > 0 ? maxDur : newTime));
    v.currentTime = clampedTime;
    setVideoCurrentTime(clampedTime);

    // Khi tua ngược về trước, reset cache dấu vết để AI bắt đầu quét lại chính xác đoạn đó
    if (clampedTime < lastVideoCurrentTimeRef.current) {
      visualTracksRef.current = [];
      recentCountedLocationsRef.current = [];
    }
    lastVideoCurrentTimeRef.current = clampedTime;
  };

  // Xử lý nhảy thời gian (-5s hoặc +5s)
  const handleSkip = (deltaSeconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    handleSeek(v.currentTime + deltaSeconds);
  };

  // Tua về đầu video (0:00) và tiếp tục phát
  const handleRestartVideo = () => {
    handleSeek(0);
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Lắng nghe cập nhật thời gian từ video element
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.duration && !isNaN(v.duration)) {
      setVideoDuration(v.duration);
    }
    setVideoCurrentTime(v.currentTime || 0);
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isUserSeekingRef.current) {
      const v = e.currentTarget;
      setVideoCurrentTime(v.currentTime || 0);
      lastVideoCurrentTimeRef.current = v.currentTime || 0;
    }
  };

  // Xử lý khi video phát hết
  const handleVideoEnded = () => {
    if (isLooping) {
      visualTracksRef.current = [];
      recentCountedLocationsRef.current = [];
      return;
    }
    setIsPlaying(false);
    toast.info('Đã hoàn tất quét toàn bộ video tuần tra!', 'Tuần Tra AI');
    if (autoDispatch && bestSnapshotRef.current && routeReportStatus !== 'DISPATCHED') {
      handleDispatchRouteReport();
    }
  };

  // Xử lý nạp tệp video hành trình
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      resetPatrolSession();
      setVideoDuration(0);
      setVideoCurrentTime(0);
      setCurrentVideoName(file.name);
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
    resetPatrolSession();
    setVideoDuration(0);
    setVideoCurrentTime(0);
    setCurrentVideoName(label);
    setIncidentPins([]);

    if (samplePath.includes('video_tuan_tra_o_ga')) {
      setRoutePoints(SAMPLE_ROUTE_1);
      setPatrolLocation({
        lat: SAMPLE_ROUTE_1[0][0],
        lng: SAMPLE_ROUTE_1[0][1],
        address: 'Tuyến ĐH.08, Xã Thanh Lâm, Phố Cà, Thanh Liêm, Hà Nam',
      });
    } else if (samplePath.includes('pothole_tracker_test')) {
      setRoutePoints(SAMPLE_ROUTE_2);
      setPatrolLocation({
        lat: SAMPLE_ROUTE_2[0][0],
        lng: SAMPLE_ROUTE_2[0][1],
        address: 'Quốc Lộ 1A (Kiện Khê - Phố Cà), Thanh Liêm, Hà Nam',
      });
    } else if (samplePath.includes('test_road2')) {
      setRoutePoints(SAMPLE_ROUTE_3);
      setPatrolLocation({
        lat: SAMPLE_ROUTE_3[0][0],
        lng: SAMPLE_ROUTE_3[0][1],
        address: 'Đường Tỉnh ĐT.494, Thanh Liêm, Hà Nam',
      });
    }

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

  // Nạp tệp GPX hoặc GeoJSON tùy chỉnh từ camera hành trình / thiết bị đo
  const handleGpxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const points = parseGpxOrGeoJson(content);
      if (points.length >= 2) {
        setRoutePoints(points);
        setIncidentPins([]);
        setPatrolLocation({
          lat: points[0][0],
          lng: points[0][1],
          address: `Lộ trình GPS: ${file.name}`,
        });
        toast.success(`Đã nạp thành công ${points.length} mốc tọa độ GPS từ ${file.name}!`, 'Đồng Bộ GPS');
      } else {
        toast.warning('Tệp GPS không chứa đủ mốc tọa độ hợp lệ (tối thiểu 2 điểm).', 'Lỗi định dạng');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      </div>

      {/* Tab Điều Hướng Nghiệp Vụ: Tuần Tra Trực Tiếp vs Lịch Sử Phiên Tuần Tra */}
      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CAMERA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'CAMERA'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Thực Hiện Tuần Tra (AI Video)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Phiên Tuần Tra Của Tôi</span>
          {patrolSessions.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] font-mono font-bold text-on-surface">
              {patrolSessions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'CAMERA' ? (
        /* Bố Cục Chính: Màn hình Video bên trái (7 cột) & Bản đồ + Feed bắt lỗi bên phải (5 cột) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CỘT TRÁI: MÀN HÌNH VIDEO & ĐIỀU KHIỂN (7 CỘT) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video w-full rounded-3xl bg-slate-950 border border-outline-variant/30 overflow-hidden shadow-md flex items-center justify-center">
            {/* Thẻ Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              loop={isLooping}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
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

          {/* THANH ĐIỀU KHIỂN & DÒNG THỜI GIAN VIDEO (TIMELINE & SCRUBBER BAR) */}
          {sourceMode === 'UPLOAD' && (
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col gap-3">
              {/* Tiêu đề & Thông số thời gian */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="font-bold text-on-surface truncate max-w-[280px]" title={currentVideoName}>
                    {currentVideoName || 'Video Tuần Tra'}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1 font-bold bg-surface-container-low px-2.5 py-1 rounded-xl border border-outline-variant/30">
                    <span className="text-primary font-mono">{formatVideoTime(videoCurrentTime)}</span>
                    <span className="text-on-surface-variant/50">/</span>
                    <span className="text-on-surface-variant font-mono">{formatVideoTime(videoDuration)}</span>
                  </div>
                  {videoDuration > 0 && (
                    <span className="text-[11px] text-on-surface-variant font-semibold">
                      ({Math.round((videoCurrentTime / videoDuration) * 100)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Thanh trượt tua thời gian (Scrubber Bar) */}
              <div className="relative flex items-center group w-full py-0.5">
                <input
                  type="range"
                  min={0}
                  max={videoDuration > 0 ? videoDuration : 100}
                  step={0.05}
                  value={videoCurrentTime}
                  disabled={!videoUrl || videoDuration === 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    handleSeek(val);
                  }}
                  onMouseDown={() => {
                    isUserSeekingRef.current = true;
                  }}
                  onMouseUp={() => {
                    isUserSeekingRef.current = false;
                  }}
                  onTouchStart={() => {
                    isUserSeekingRef.current = true;
                  }}
                  onTouchEnd={() => {
                    isUserSeekingRef.current = false;
                  }}
                  className="w-full h-2.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary hover:bg-surface-container-high transition-all disabled:opacity-40"
                  title="Kéo hoặc nhấp để tua nhanh/chậm đến bất kỳ giây nào của video"
                />
              </div>

              {/* Hàng nút điều khiển Tua & Chế độ Lặp lại */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/20">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Nút Tua về đầu 0:00 */}
                  <button
                    type="button"
                    onClick={handleRestartVideo}
                    disabled={!videoUrl}
                    title="Tua về đầu video (0:00) và bắt đầu phát lại"
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-primary" />
                    <span>0:00</span>
                  </button>

                  {/* Nút Tua lùi -5s */}
                  <button
                    type="button"
                    onClick={() => handleSkip(-5)}
                    disabled={!videoUrl || videoCurrentTime <= 0}
                    title="Tua lùi lại 5 giây"
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Rewind className="w-3.5 h-3.5 text-primary" />
                    <span>-5s</span>
                  </button>

                  {/* Nút Play / Pause */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!videoUrl}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-40 cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        : 'bg-primary hover:bg-primary/90 text-on-primary'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Tạm Dừng' : 'Phát Tiếp'}</span>
                  </button>

                  {/* Nút Tua tới +5s */}
                  <button
                    type="button"
                    onClick={() => handleSkip(5)}
                    disabled={!videoUrl || (videoDuration > 0 && videoCurrentTime >= videoDuration)}
                    title="Tua tới trước 5 giây"
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <span>+5s</span>
                    <FastForward className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Bật / Tắt Tự Động Lặp Lại Video (Loop Toggle) */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isLooping;
                      setIsLooping(next);
                      toast.info(next ? 'Đã BẬT lặp lại video tự động' : 'Đã TẮT lặp lại video (Dừng khi kết thúc)');
                    }}
                    title={isLooping ? 'Bấm để TẮT tự động lặp lại (dừng khi phát hết)' : 'Bấm để BẬT tự động lặp lại video'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isLooping
                        ? 'bg-primary/15 text-primary border-primary/30 shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:text-on-surface'
                    }`}
                  >
                    <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'text-primary' : 'text-on-surface-variant'}`} />
                    <span>Lặp lại: {isLooping ? 'BẬT' : 'TẮT'}</span>
                  </button>

                  {/* Nút Đặt lại Bộ Đếm về 0 */}
                  <button
                    type="button"
                    onClick={handleResetCounter}
                    title="Đặt lại số lượng ổ gà đã đếm về 0"
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-rose-500/15 hover:text-rose-600 text-on-surface-variant text-xs font-medium flex items-center gap-1 transition-all border border-outline-variant/30 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-rose-500" />
                    <span>Đếm lại</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BẢNG ĐIỀU KHIỂN & THAM SỐ TUẦN TRA (CLEAN & COMPACT DESIGN) */}
          <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col gap-3">
            {/* HÀNG 1: CHỌN NGUỒN VIDEO & AUTO-DISPATCH */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Nguồn Video: Tải Video vs Video Mẫu vs Camera */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs flex-wrap">
                <label
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    sourceMode === 'UPLOAD' && !videoUrl?.includes('sample-videos')
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải Video</span>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={() => handleLoadSampleVideo('/sample-videos/video_tuan_tra_o_ga.mp4', 'Mẫu 1 - Ổ gà đường phố')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    videoUrl === '/sample-videos/video_tuan_tra_o_ga.mp4'
                      ? 'bg-surface-container-lowest text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-on-surface-variant hover:text-amber-500'
                  }`}
                  title="Nạp video tuần tra thực tế có ổ gà để kiểm thử nhanh"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mẫu 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSampleVideo('/sample-videos/pothole_tracker_test.mp4', 'Mẫu 2 - Tuyến đường ổ gà liên tiếp')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    videoUrl === '/sample-videos/pothole_tracker_test.mp4'
                      ? 'bg-surface-container-lowest text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-on-surface-variant hover:text-emerald-500'
                  }`}
                  title="Nạp video tuần tra ô tô qua đoạn đường nhiều ổ gà liên tiếp"
                >
                  <span>Mẫu 2 (Liên tiếp)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSampleVideo('/sample-videos/test_road2.mp4', 'Mẫu 3 - Vết nứt & Ổ gà đan xen')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    videoUrl === '/sample-videos/test_road2.mp4'
                      ? 'bg-surface-container-lowest text-cyan-600 dark:text-cyan-400 shadow-xs'
                      : 'text-on-surface-variant hover:text-cyan-500'
                  }`}
                  title="Nạp video tuần tra mặt đường có cả nứt và ổ gà"
                >
                  <span>Mẫu 3 (Hỗn hợp)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode('WEBCAM')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    sourceMode === 'WEBCAM'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera Trực Tiếp</span>
                </button>

                {/* Nạp Lộ Trình GPS tùy chỉnh (GPX / GeoJSON) */}
                <button
                  type="button"
                  onClick={() => gpxFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-on-surface-variant hover:text-primary cursor-pointer border-l border-outline-variant/30 pl-2.5 ml-1"
                  title="Nạp tệp nhật ký GPS (.gpx, .geojson) từ camera hành trình để vẽ Polyline tuyến đường"
                >
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  <span>Nạp Tệp GPS</span>
                </button>
                <input
                  type="file"
                  ref={gpxFileInputRef}
                  accept=".gpx,.geojson,.json"
                  onChange={handleGpxUpload}
                  className="hidden"
                />
              </div>

              {/* Tùy chọn Tự Động Gửi Báo Cáo */}
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 cursor-pointer text-xs transition-all">
                <input
                  type="checkbox"
                  checked={autoDispatch}
                  onChange={(e) => setAutoDispatch(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="font-semibold text-on-surface text-[11px] select-none">
                  Tự động gửi báo cáo khi hết video
                </span>
              </label>
            </div>

            {/* HÀNG 2: BỐ TRÍ THAM SỐ 2 CỘT HIỆN ĐẠI (AI CONFIDENCE & SAMPLING vs VẠCH ĐẾM & TỐC ĐỘ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 border-t border-outline-variant/20 text-xs">
              {/* CỘT TRÁI: ĐỘ NHẠY & TẦN SUẤT AI */}
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5">
                {/* Ngưỡng Tin Cậy AI (Confidence Gate) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-on-surface">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Ngưỡng Tin Cậy AI:</span>
                  </div>
                  <span className="font-mono text-primary font-bold text-xs px-2 py-0.5 rounded-lg bg-primary/10">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.80"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg cursor-pointer accent-primary"
                  title="Kéo để lọc bỏ các phát hiện dưới ngưỡng tin cậy"
                />

                {/* Tần suất quét (Sampling) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/15">
                  <span className="font-bold text-on-surface flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tần suất quét:</span>
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    {(['REALTIME', 'BALANCED', 'ECONOMY'] as SamplingMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSamplingMode(mode)}
                        title={SAMPLING_CONFIG[mode].desc}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          samplingMode === mode
                            ? 'bg-surface-container-lowest text-primary shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {mode === 'REALTIME' ? '0.12s' : mode === 'BALANCED' ? '0.25s' : '0.5s'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: VẠCH ĐẾM AI & TỐC ĐỘ PHÁT */}
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5">
                {/* Vạch đếm AI & Cao độ */}
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 font-bold text-on-surface cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showCountingLine}
                      onChange={(e) => setShowCountingLine(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                    />
                    <Target className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Vạch Đếm AI:</span>
                  </label>
                  {showCountingLine && (
                    <span className="font-mono text-cyan-500 font-bold text-xs px-2 py-0.5 rounded-lg bg-cyan-500/10">
                      Y: {Math.round(countingLineY * 100)}%
                    </span>
                  )}
                </div>

                {showCountingLine ? (
                  <input
                    type="range"
                    min="0.35"
                    max="0.85"
                    step="0.01"
                    value={countingLineY}
                    onChange={(e) => setCountingLineY(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-high rounded-lg cursor-pointer accent-cyan-500"
                    title="Kéo để điều chỉnh cao độ vạch đếm AI trên khung hình"
                  />
                ) : (
                  <div className="h-1.5 bg-surface-container-high/30 rounded-lg" />
                )}

                {/* Tốc độ phát video */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/15">
                  <span className="font-bold text-on-surface flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tốc độ video:</span>
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    {[0.5, 0.75, 1.0].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
              </div>
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

            {/* Hiển thị Tọa độ GPS & Tuyến Tuần Tra */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-mono">
              <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>GPS xe:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-on-surface-variant font-sans">
                  {calculateRouteDistanceKm(routePoints)} km ({routePoints.length} mốc)
                </span>
                <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                  {currentCarPosition[0].toFixed(6)}, {currentCarPosition[1].toFixed(6)}
                </span>
              </div>
            </div>

            <div className="h-64 w-full rounded-2xl overflow-hidden border border-outline-variant/20">
              <PatrolRouteMap
                routePoints={routePoints}
                currentPosition={currentCarPosition}
                traveledPoints={traveledRoutePoints}
                incidentPins={incidentPins}
                routeName={patrolLocation.address}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* BÁO CÁO TUẦN TRA TUYẾN ĐƯỜNG TỔNG HỢP (GOM TOÀN BỘ VIDEO THÀNH 1 BÁO CÁO DUY NHẤT) */}
          <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex-1 flex flex-col gap-3.5 min-h-[400px]">
            {/* Tiêu đề Báo Cáo */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Báo Cáo Tuyến Đường Tuần Tra</h3>
                  <p className="text-[11px] text-on-surface-variant line-clamp-1 max-w-[240px]">
                    {patrolLocation.address}
                  </p>
                </div>
              </div>

              {counterStats.total > 0 && (
                <button
                  type="button"
                  onClick={resetPatrolSession}
                  className="text-[11px] text-error hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  title="Xóa dữ liệu tuần tra hiện tại và bắt đầu lại"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Làm mới</span>
                </button>
              )}
            </div>

            {/* Nội dung báo cáo */}
            {counterStats.total === 0 && !bestSnapshot ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant gap-2.5">
                <Video className="w-8 h-8 text-outline animate-pulse" />
                <span className="text-xs font-semibold text-on-surface">Đang quét luồng video tuần tra...</span>
                <span className="text-[11px] text-on-surface-variant/70 max-w-[280px]">
                  Hệ thống AI sẽ tự động đếm số lượng ổ gà, vết nứt và chọn lọc 1–2 ảnh tiêu biểu nhất của toàn tuyến đường tại đây.
                </span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3.5">
                {/* 1. Thẻ tóm tắt mức độ nghiêm trọng & số lượng */}
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface-variant">Đánh giá toàn tuyến:</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      counterStats.total >= 5 || (counterStats.byCategory.POTHOLE >= 4)
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : counterStats.total >= 2
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {counterStats.total >= 5 || (counterStats.byCategory.POTHOLE >= 4)
                        ? 'CRITICAL • Xuống cấp nặng'
                        : counterStats.total >= 2
                        ? 'HIGH • Cần duy tu sớm'
                        : 'MEDIUM • Cần theo dõi'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between">
                      <span className="text-on-surface-variant flex items-center gap-1.5">
                        <span>🕳️</span> Ổ gà:
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {counterStats.byCategory.POTHOLE}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between">
                      <span className="text-on-surface-variant flex items-center gap-1.5">
                        <span>⚡</span> Vết nứt:
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {counterStats.byCategory.ROAD_CRACK}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between">
                      <span className="text-on-surface-variant flex items-center gap-1.5">
                        <span>🚧</span> Vật cản:
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {counterStats.byCategory.ROAD_OBSTACLE}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between">
                      <span className="text-on-surface-variant flex items-center gap-1.5">
                        <span>🌊</span> Ngập úng:
                      </span>
                      <span className="font-mono font-bold text-on-surface">
                        {counterStats.byCategory.ROAD_FLOODING}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Ảnh tiêu biểu đại diện của toàn bộ video */}
                {bestSnapshot && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-on-surface-variant">
                      Ảnh hiện trường tiêu biểu nhất (AI tự động chọn lọc):
                    </span>
                    <div className="flex gap-2">
                      <div className="relative flex-1 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-xs aspect-video bg-black/40">
                        <img
                          src={bestSnapshot.snapshotUrl}
                          alt="Ảnh tiêu biểu"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          Ảnh chính • {(bestSnapshot.confidence * 100).toFixed(0)}%
                        </div>
                      </div>

                      {secondarySnapshot && (
                        <div className="relative w-28 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-xs aspect-video bg-black/40 shrink-0">
                          <img
                            src={secondarySnapshot.snapshotUrl}
                            alt="Ảnh phụ"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 rounded bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono">
                            Ảnh phụ
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Nút Gửi Báo Cáo Duy Nhất */}
                <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
                  {routeReportStatus === 'DISPATCHED' ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="w-full p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đã Tạo Phiên Tuần Tra {dispatchedIncidentId} Thành Công!</span>
                      </div>

                      {lastCreatedSession?.hasNearbyDuplicate && (
                        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Cơ chế Chống trùng lặp PostGIS:</strong> Phát hiện phản ánh trùng lặp <strong>[{lastCreatedSession.duplicateTicketCode}]</strong> trong bán kính {lastCreatedSession.duplicateDistanceMeters}m. Hệ thống đã tự động liên kết vào hồ sơ!
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (lastCreatedSession) {
                              setSelectedSessionForReport(lastCreatedSession);
                              setIsReportModalOpen(true);
                            }
                          }}
                          className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Xuất Biên Bản PDF</span>
                        </button>

                        {lastCreatedSession?.incidentId ? (
                          <Link
                            to={`/incidents/${lastCreatedSession.incidentId}`}
                            className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Hồ Sơ Điều Phối</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('HISTORY')}
                            className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Xem Lịch Sử</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={routeReportStatus === 'SENDING' || !bestSnapshot}
                      onClick={handleDispatchRouteReport}
                      className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {routeReportStatus === 'SENDING' ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>Đang Tạo Hồ Sơ Điều Phối...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Gửi Báo Cáo Tuần Tra Tuyến Đường (1 Phiếu Duy Nhất)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 4. Chi tiết các điểm phát hiện (Thu gọn) */}
                {capturedList.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                      className="w-full text-left text-[11px] font-semibold text-on-surface-variant hover:text-on-surface flex items-center justify-between py-1 cursor-pointer"
                    >
                      <span>Xem chi tiết các mốc phát hiện ({capturedList.length})</span>
                      {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isDetailsOpen && (
                      <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {capturedList.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between text-[11px]"
                          >
                            <span className="font-medium text-on-surface">
                              #{idx + 1} {item.category === 'POTHOLE' ? 'Ổ gà' : item.category} ({(item.confidence * 100).toFixed(0)}%)
                            </span>
                            <span className="font-mono text-[10px] text-on-surface-variant">
                              {item.timestamp}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        /* GIAO DIỆN TAB LỊCH SỬ PHIÊN TUẦN TRA ĐƯỜNG BỘ */
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Nhật Ký & Hồ Sơ Các Phiên Tuần Tra Đường Bộ</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Danh sách các chuyến tuần tra xe AI đã thực hiện và lưu vào cơ sở dữ liệu quốc gia
              </p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingSessions}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-all border border-outline-variant/30 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              <span>Làm mới danh sách</span>
            </button>
          </div>

          {isLoadingSessions ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></span>
              <span className="text-xs font-semibold">Đang tải lịch sử phiên tuần tra...</span>
            </div>
          ) : patrolSessions.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
                <FileText className="w-7 h-7" />
              </div>
              <div className="max-w-sm">
                <h3 className="font-bold text-sm text-on-surface">Chưa có phiên tuần tra nào</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Hãy thực hiện một chuyến tuần tra video bằng AI và nhấn nút &quot;Gửi Báo Cáo Tuần Tra Tuyến Đường&quot; để lưu hồ sơ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('CAMERA')}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer hover:bg-primary/90 transition-all"
              >
                Quay lại Màn hình Tuần tra
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Mã Phiên</th>
                    <th className="py-3 px-4">Tuyến Đường & Địa Chỉ</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4 text-center">Số Hư Hại</th>
                    <th className="py-3 px-4">Đánh Giá</th>
                    <th className="py-3 px-4">Ảnh Chụp (Keyframe)</th>
                    <th className="py-3 px-4">Mã Điều Phối</th>
                    <th className="py-3 px-4 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {patrolSessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">
                        {session.sessionCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-on-surface line-clamp-1 max-w-[220px]">
                          {session.routeName}
                        </div>
                        {session.hasNearbyDuplicate && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            Trùng [{session.duplicateTicketCode}] ({session.duplicateDistanceMeters}m)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-on-surface-variant">
                        {session.createdAt ? new Date(session.createdAt).toLocaleString('vi-VN') : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-base text-rose-500">
                        {session.totalPotholesDetected}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            session.routeHealthRating === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : session.routeHealthRating === 'HIGH'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {session.routeHealthRating === 'CRITICAL'
                            ? 'CRITICAL'
                            : session.routeHealthRating === 'HIGH'
                            ? 'HIGH'
                            : 'MEDIUM'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {session.keyframeUrl1 ? (
                          <div className="w-16 h-10 rounded-lg overflow-hidden border border-outline-variant/30 bg-black/40">
                            <img
                              src={session.keyframeUrl1}
                              alt="Keyframe"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant/50">Không có</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {session.incidentTicketCode ? (
                          <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {session.incidentTicketCode}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/60 text-[10px]">Đang tạo</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSessionForReport(session);
                              setIsReportModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                            title="In hoặc lưu PDF Biên bản kiểm tra kỹ thuật"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Biên Bản PDF</span>
                          </button>

                          {session.incidentId && (
                            <Link
                              to={`/incidents/${session.incidentId}`}
                              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface transition-all"
                              title="Xem hồ sơ điều phối sự cố"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Biên Bản Kỹ Thuật Kiểm Tra Tuyến Đường (Chuẩn In & PDF) */}
      <PatrolInspectionReportModal
        session={selectedSessionForReport}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
