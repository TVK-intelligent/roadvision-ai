import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { MapPicker } from '../components/MapPicker';
import { ImageCanvasWithBBox } from '../components/ImageCanvasWithBBox';
import { Category, NearbyIncidentCheckResponse } from '../types';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { preprocessImage } from '../utils/imagePreprocess';
import { extractGpsFromExif } from '../utils/exifGps';
import { Upload, MapPin, CheckCircle2, AlertCircle, Loader2, Crosshair, Search, Sliders, ShieldAlert, Zap, Layers, Image as ImageIcon, ThumbsUp, LogIn, ChevronDown, Truck, CircleAlert, GitBranch, Waves, Construction, AlertTriangle } from 'lucide-react';

interface AiPreviewResult {
  className: string;
  confidence: number;
  bboxX: number;
  bboxY: number;
  bboxWidth: number;
  bboxHeight: number;
  count?: number;
  classCounts?: Record<string, number>;
  boxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    className: string;
  }>;
  estimatedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  footprintPercent?: number;
  activeThreshold?: number;
  imageWidth?: number;
  imageHeight?: number;
  inferenceMs: number;
}

export const ReportIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiPreviewResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [enableEnhance, setEnableEnhance] = useState<boolean>(true);
  const [optimizationStats, setOptimizationStats] = useState<{ origKB: number; optKB: number } | null>(null);
  const [showAdvancedAi, setShowAdvancedAi] = useState<boolean>(false);

  // Ngưỡng phát hiện AI tùy chỉnh (Confidence Threshold Slider: 0.15 -> 0.85, mặc định 0.20 để bắt trọn các vật cản/hư hại ngoài thực tế)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.20);

  // Phân loại sự cố (Hỗ trợ đa lựa chọn / Multi-select khi hiện trường có nhiều loại hư hại)
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['ROAD_OBSTACLE']);
  const [category, setCategory] = useState<Category>('ROAD_OBSTACLE');

  // Vị trí GPS mặc định (Hà Nam / Thanh Liêm theo yêu cầu thực tế của người dùng)
  const [latitude, setLatitude] = useState<number>(20.436036);
  const [longitude, setLongitude] = useState<number>(105.904596);
  const [address, setAddress] = useState<string>('Thanh Liêm, Hà Nam');

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Xác định Khu Quản Lý Đường Bộ Toàn Quốc (Cục Đường Bộ VN - 63 Tỉnh Thành)
  const getCorridorInfo = (lat: number, lng: number, addr: string) => {
    const norm = (addr || '').toLowerCase();

    // 1. Phân vùng Miền Nam (Khu QLĐB IV: TP.HCM & 18 tỉnh ĐBSCL/Đông Nam Bộ)
    const southKeywords = [
      'hồ chí minh', 'hcm', 'sài gòn', 'thủ đức', 'bình chánh', 'cần giờ', 'củ chi', 'hóc môn',
      'cần thơ', 'ninh kiều', 'bình dương', 'thủ dầu một', 'dĩ an', 'thuận an',
      'đồng nai', 'biên hòa', 'vũng tàu', 'bà rịa', 'tây ninh', 'bình phước',
      'long an', 'tiền giang', 'mỹ tho', 'bến tre', 'vĩnh long', 'trà vinh',
      'hậu giang', 'sóc trăng', 'đồng tháp', 'cao lãnh', 'an giang', 'kiên giang',
      'phú quốc', 'bạc liêu', 'cà mau'
    ];
    for (const kw of southKeywords) {
      if (norm.includes(kw)) {
        return {
          corridor: 'KHU_4',
          zoneName: 'Khu Quản lý Đường bộ IV (Miền Nam - TP.HCM & ĐBSCL)',
          team: 'Đội Cơ Động Phản Ứng Nhanh Miền Nam',
          badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300',
          slaMinutes: 30,
          contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 4 - Miền Nam)'
        };
      }
    }

    // 2. Phân vùng Miền Trung & Tây Nguyên (Khu QLĐB III: Đà Nẵng & 12 tỉnh Duyên hải / Tây Nguyên)
    const centralKeywords = [
      'đà nẵng', 'hải châu', 'sơn trà', 'ngũ hành sơn', 'liên chiểu', 'hòa vang',
      'quảng nam', 'hội an', 'tam kỳ', 'quảng ngãi', 'bình định', 'quy nhơn',
      'phú yên', 'tuy hòa', 'khánh hòa', 'nha trang', 'cam ranh',
      'ninh thuận', 'phan rang', 'bình thuận', 'phan thiết',
      'kon tum', 'gia lai', 'pleiku', 'đắk lắk', 'dak lak', 'buôn ma thuột',
      'đắk nông', 'lâm đồng', 'đà lạt'
    ];
    for (const kw of centralKeywords) {
      if (norm.includes(kw)) {
        return {
          corridor: 'KHU_3',
          zoneName: 'Khu Quản lý Đường bộ III (Miền Trung & Tây Nguyên - Trụ sở Đà Nẵng)',
          team: 'Đội Cơ Động Tuần Kiểm Miền Trung & Tây Nguyên',
          badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          slaMinutes: 35,
          contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 3 - Miền Trung)'
        };
      }
    }

    // 3. Phân vùng Bắc Trung Bộ (Khu QLĐB II: 6 tỉnh từ Thanh Hóa đến Thừa Thiên Huế)
    const northCentralKeywords = [
      'thanh hóa', 'sầm sơn', 'bỉm sơn', 'nghệ an', 'vinh', 'cửa lò',
      'hà tĩnh', 'kỳ anh', 'quảng bình', 'đồng hới', 'quảng trị', 'đông hà',
      'thừa thiên huế', 'huế'
    ];
    for (const kw of northCentralKeywords) {
      if (norm.includes(kw)) {
        return {
          corridor: 'KHU_2',
          zoneName: 'Khu Quản lý Đường bộ II (Bắc Trung Bộ - Trụ sở Nghệ An)',
          team: 'Đội Cơ Động Khắc Phục Khẩn Cấp Bắc Trung Bộ',
          badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          slaMinutes: 40,
          contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 2 - Bắc Trung Bộ)'
        };
      }
    }

    // 4. Phân vùng Miền Bắc (Khu QLĐB I: Hà Nội, Hải Phòng & 23 tỉnh phía Bắc)
    const northKeywords = [
      'hà nội', 'hoàn kiếm', 'cầu giấy', 'ba đình', 'đống đa', 'hai bà trưng', 'hoàng mai', 'thanh xuân', 'hà đông',
      'hải phòng', 'quảng ninh', 'hạ long', 'bắc ninh', 'hà nam', 'phủ lý', 'thanh liêm', 'kim bảng',
      'hải dương', 'hưng yên', 'nam định', 'ninh bình', 'thái bình', 'vĩnh phúc', 'phú thọ',
      'bắc giang', 'bắc kạn', 'cao bằng', 'hà giang', 'lạng sơn', 'thái nguyên', 'tuyên quang',
      'yên bái', 'lào cai', 'hòa bình', 'sơn la', 'điện biên', 'lai châu'
    ];
    for (const kw of northKeywords) {
      if (norm.includes(kw)) {
        return {
          corridor: 'KHU_1',
          zoneName: 'Khu Quản lý Đường bộ I (Miền Bắc - Trụ sở Hà Nội)',
          team: 'Đội Cơ Động Phản Ứng Nhanh Miền Bắc',
          badgeColor: 'border-primary/40 bg-primary/10 text-primary',
          slaMinutes: 25,
          contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 1 - Miền Bắc)'
        };
      }
    }

    // 5. Phân giải bảo hiểm bằng vĩ độ GPS (Spatial Latitudinal Bounding)
    if (lat < 11.5) {
      return {
        corridor: 'KHU_4',
        zoneName: 'Khu Quản lý Đường bộ IV (Miền Nam - TP.HCM & ĐBSCL)',
        team: 'Đội Cơ Động Phản Ứng Nhanh Miền Nam',
        badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300',
        slaMinutes: 30,
        contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 4 - Miền Nam)'
      };
    }
    if (lat < 16.5) {
      return {
        corridor: 'KHU_3',
        zoneName: 'Khu Quản lý Đường bộ III (Miền Trung & Tây Nguyên - Trụ sở Đà Nẵng)',
        team: 'Đội Cơ Động Tuần Kiểm Miền Trung & Tây Nguyên',
        badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        slaMinutes: 35,
        contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 3 - Miền Trung)'
      };
    }
    if (lat < 20.0) {
      return {
        corridor: 'KHU_2',
        zoneName: 'Khu Quản lý Đường bộ II (Bắc Trung Bộ - Trụ sở Nghệ An)',
        team: 'Đội Cơ Động Khắc Phục Khẩn Cấp Bắc Trung Bộ',
        badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        slaMinutes: 40,
        contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 2 - Bắc Trung Bộ)'
      };
    }

    return {
      corridor: 'KHU_1',
      zoneName: 'Khu Quản lý Đường bộ I (Miền Bắc - Trụ sở Hà Nội)',
      team: 'Đội Cơ Động Phản Ứng Nhanh Miền Bắc',
      badgeColor: 'border-primary/40 bg-primary/10 text-primary',
      slaMinutes: 25,
      contact: 'Hotline Cục QLĐB: 1900 54 55 77 (Nhánh 1 - Miền Bắc)'
    };
  };

  // Trạng thái kiểm tra trùng lặp không gian (Spatial Deduplication)
  const [nearbyDuplicate, setNearbyDuplicate] = useState<NearbyIncidentCheckResponse | null>(null);
  const [isCheckingNearby, setIsCheckingNearby] = useState<boolean>(false);
  const [dismissDuplicate, setDismissDuplicate] = useState<boolean>(false);

  const checkNearby = async (lat: number, lng: number) => {
    try {
      setIsCheckingNearby(true);
      const res = await incidentApi.checkNearbyDuplicate({
        latitude: lat,
        longitude: lng,
        category: selectedCategories[0],
        radius: 25,
      });
      if (res.data.hasNearbyDuplicate && res.data.existingIncident) {
        setNearbyDuplicate(res.data);
        setDismissDuplicate(false);
      } else {
        setNearbyDuplicate(null);
      }
    } catch {
      // Ignored
    } finally {
      setIsCheckingNearby(false);
    }
  };

  useEffect(() => {
    checkNearby(latitude, longitude);
  }, []);

  // Tự động định vị địa chỉ ngược khi thay đổi tọa độ từ bản đồ
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (err) {
      console.warn('Lỗi reverse geocode:', err);
    }
  };

  // Tra cứu tọa độ khi người dùng nhập địa chỉ chữ
  const handleSearchAddress = async () => {
    if (!address.trim()) return;
    setIsLocating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'Accept-Language': 'vi' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setLatitude(lat);
        setLongitude(lon);
        checkNearby(lat, lon);
        if (data[0].display_name) {
          setAddress(data[0].display_name);
        }
        toast.success(`Đã định vị thành công: ${address.split(',')[0]}`, 'Bản Đồ Không Gian');
      } else {
        toast.warning('Không tìm thấy tọa độ cho địa chỉ này. Bạn hãy nhấp trực tiếp vào bản đồ bên dưới để chọn.');
      }
    } catch (err) {
      console.warn('Lỗi forward geocode:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Lấy vị trí GPS hiện tại từ thiết bị (có thông báo rõ ràng nếu lấy từ IP mạng máy tính)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Trình duyệt của bạn không hỗ trợ định vị Geolocation');
      return;
    }
    setIsLocating(true);

    const applyPosition = (pos: GeolocationPosition, isFallback = false) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      setLatitude(lat);
      setLongitude(lng);
      reverseGeocode(lat, lng);
      checkNearby(lat, lng);
      setIsLocating(false);

      if (acc > 2500) {
        toast.info(
          `Vị trí ước lượng từ trạm mạng Internet (sai số ~${Math.round(acc / 1000)}km do máy tính không có chip GPS vệ tinh). Bạn có thể nhấp trực tiếp lên bản đồ hoặc bấm nút vị trí nhanh để đặt chuẩn xác.`,
          'Lưu Ý Định Vị PC'
        );
      } else {
        toast.success(isFallback ? 'Đã định vị vị trí qua mạng Internet!' : 'Đã xác định vị trí GPS hiện tại!');
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(pos, false),
      (err) => {
        // Nếu lỗi do Timeout hoặc không có chip GPS (thường gặp trên PC máy bàn), thử chế độ IP/Network
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => applyPosition(fallbackPos, true),
            () => {
              setIsLocating(false);
              toast.info('Không thể lấy GPS tự động (máy tính không có phần cứng GPS). Vui lòng nhấp trực tiếp lên bản đồ bên dưới.');
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          setIsLocating(false);
          toast.info('Trình duyệt bị từ chối quyền truy cập vị trí. Bạn có thể chọn trực tiếp trên bản đồ.');
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  // Khi người dùng nhấp hoặc kéo marker trên bản đồ
  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    reverseGeocode(lat, lng);
    checkNearby(lat, lng);
  };

  // Hàm thực hiện quét AI từ tệp ảnh và ngưỡng tin cậy
  const runAiAnalysis = async (file: File, thresh: number) => {
    setIsScanning(true);
    const scanFormData = new FormData();
    scanFormData.append('image', file);

    try {
      const res = await incidentApi.analyzeImage(scanFormData, thresh);
      const data = res.data;
      setAiResult(data);

      // Tự động gợi ý loại sự cố & tiêu đề dựa trên kết quả phát hiện AI
      if (data.boxes && data.boxes.length > 0) {
        const counts: Record<string, number> = data.classCounts || {};
        if (!data.classCounts) {
          for (const b of data.boxes) {
            counts[b.className] = (counts[b.className] || 0) + 1;
          }
        }
        const detectedCats: Category[] = [];
        if (counts['POTHOLE']) detectedCats.push('POTHOLE');
        if (counts['ROAD_CRACK']) detectedCats.push('ROAD_CRACK');
        if (counts['ROAD_FLOODING']) detectedCats.push('ROAD_FLOODING');
        if (counts['ROAD_OBSTACLE']) detectedCats.push('ROAD_OBSTACLE');

        const totalCount = data.count || data.boxes.length;
        const loc = address.split(',')[0] || 'hiện trường';

        if (detectedCats.length > 1) {
          // ĐA SỰ CỐ: TỰ ĐỘNG TÍCH CHỌN TẤT CẢ CÁC LOẠI PHÁT HIỆN ĐƯỢC
          setSelectedCategories(detectedCats);
          setCategory('COMPLEX_DAMAGE');

          const labelParts: string[] = [];
          if (counts['POTHOLE']) labelParts.push(`${counts['POTHOLE']} ổ gà`);
          if (counts['ROAD_CRACK']) labelParts.push(`${counts['ROAD_CRACK']} vết nứt`);
          if (counts['ROAD_FLOODING']) labelParts.push(`${counts['ROAD_FLOODING']} điểm ngập`);
          if (counts['ROAD_OBSTACLE']) labelParts.push(`${counts['ROAD_OBSTACLE']} vật cản`);
          const labelStr = labelParts.join(', ');

          setTitle(`Phát hiện ${labelStr} mặt đường tại ${loc}`);
          setDescription(
            `AI phát hiện ${totalCount} vị trí sự cố gồm: ${labelStr} (độ tin cậy ${(data.confidence * 100).toFixed(1)}%, chiếm ${(data.footprintPercent || 0).toFixed(1)}% diện tích ảnh). Đề nghị đội thi công ưu tiên khảo sát và xử lý đồng bộ.`
          );
          toast.info(
            `AI phát hiện ĐA SỰ CỐ: ${labelStr} (${(data.confidence * 100).toFixed(1)}%)`,
            'Thị Giác YOLOv8'
          );
        } else {
          const singleCat = detectedCats[0] || (data.boxes[0].className as Category) || 'POTHOLE';
          setSelectedCategories([singleCat]);
          setCategory(singleCat);
          const count = counts[singleCat] || totalCount;

          if (singleCat === 'POTHOLE') {
            setTitle(`Phát hiện ${count} ổ gà mặt đường tại ${loc}`);
            setDescription(
              `AI phát hiện ${count} ổ gà mặt đường (độ tin cậy ${(data.confidence * 100).toFixed(1)}%, chiếm ${(data.footprintPercent || 0).toFixed(1)}% diện tích ảnh). Đề nghị tổ duy tu xử lý vá đường tránh tai nạn cho người tham gia giao thông.`
            );
          } else if (singleCat === 'ROAD_CRACK') {
            setTitle(`Phát hiện ${count} vết nứt rạn mặt đường tại ${loc}`);
            setDescription(
              `AI phát hiện ${count} vết nứt rạn mặt đường nhựa (độ tin cậy ${(data.confidence * 100).toFixed(1)}%, chiếm ${(data.footprintPercent || 0).toFixed(1)}% diện tích ảnh). Cần xử lý chống thấm sụt lún.`
            );
          } else if (singleCat === 'ROAD_FLOODING') {
            setTitle(`Phát hiện ${count} điểm ngập úng mặt đường tại ${loc}`);
            setDescription(
              `AI phát hiện ${count} điểm ứ đọng ngập nước trên mặt đường (độ tin cậy ${(data.confidence * 100).toFixed(1)}%, chiếm ${(data.footprintPercent || 0).toFixed(1)}% diện tích ảnh). Cần nạo vét khơi thông dòng chảy thoát nước.`
            );
          } else {
            setTitle(`Phát hiện ${count} vật cản trên mặt đường tại ${loc}`);
            setDescription(
              `AI phát hiện ${count} vật cản trở an toàn giao thông trên mặt đường (độ tin cậy ${(data.confidence * 100).toFixed(1)}%, chiếm ${(data.footprintPercent || 0).toFixed(1)}% diện tích ảnh). Đề nghị cử kỹ thuật viên xử lý và thu dọn hiện trường.`
            );
          }
          toast.info(
            `AI phát hiện ${count} ${
              singleCat === 'POTHOLE' ? 'ổ gà' :
              singleCat === 'ROAD_CRACK' ? 'vết nứt' :
              singleCat === 'ROAD_FLOODING' ? 'điểm ngập' : 'vật cản'
            } (${(data.confidence * 100).toFixed(1)}%)`,
            'Thị Giác YOLOv8'
          );
        }
      } else {
        setSelectedCategories(['ROAD_OBSTACLE']);
        setCategory('ROAD_OBSTACLE');
        setTitle(`Phản ánh hạ tầng giao thông tại ${address.split(',')[0] || 'hiện trường'}`);
        if (!description) {
          setDescription(`Mặt đường có dấu hiệu xuống cấp hoặc chướng ngại vật cần cơ quan chức năng kiểm tra.`);
        }
        toast.info('AI quét hoàn tất: Chưa phát hiện hư hại rõ ràng ở ngưỡng này', 'Thị Giác YOLOv8');
      }
    } catch (err: any) {
      console.warn('Lỗi khi gọi API phân tích AI:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể kết nối máy chủ AI Vision';
      setErrorMsg(`Lỗi phân tích AI: ${msg}`);
      toast.error(msg, 'Lỗi Quét AI');
    } finally {
      setIsScanning(false);
    }
  };

  // Tiền xử lý ảnh (tự động xoay EXIF, resize 1600px, tăng tương phản) trước khi gửi AI
  const processAndAnalyze = async (file: File, thresh: number, enhance: boolean) => {
    setRawFile(file);
    setIsScanning(true);
    let finalFile = file;
    let finalPreviewUrl = '';

    try {
      const opt = await preprocessImage(file, {
        maxDimension: 1600,
        enhanceContrast: enhance,
      });
      finalFile = opt.file;
      finalPreviewUrl = opt.previewUrl;
      setOptimizationStats({
        origKB: Math.round(opt.originalSize / 1024),
        optKB: Math.round(opt.optimizedSize / 1024),
      });
    } catch (err) {
      console.warn('Lỗi khi tiền xử lý ảnh:', err);
      finalPreviewUrl = URL.createObjectURL(file);
    }

    setSelectedFile(finalFile);
    setPreviewUrl(finalPreviewUrl);
    setErrorMsg(null);
    setAiResult(null);

    // Tự động kiểm tra và trích xuất tọa độ GPS từ thẻ EXIF của ảnh chụp hiện trường
    try {
      const exifCoord = await extractGpsFromExif(file);
      if (exifCoord) {
        setLatitude(exifCoord.latitude);
        setLongitude(exifCoord.longitude);
        reverseGeocode(exifCoord.latitude, exifCoord.longitude);
        checkNearby(exifCoord.latitude, exifCoord.longitude);
        toast.success(
          `Đã tự động lấy tọa độ GPS từ ảnh chụp hiện trường (${exifCoord.latitude.toFixed(5)}, ${exifCoord.longitude.toFixed(5)})!`,
          'Định Vị EXIF Thành Công'
        );
      }
    } catch {
      // Bỏ qua nếu ảnh không có thẻ EXIF GPS
    }

    await runAiAnalysis(finalFile, thresh);
  };

  // Drag & drop xử lý tệp ảnh
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 25 * 1024 * 1024) {
        toast.error('Dung lượng tệp vượt quá 25MB cho phép');
        return;
      }
      await processAndAnalyze(file, confidenceThreshold, enableEnhance);
    }
  };

  // Khi chọn ảnh: Tải preview và gửi ngay qua API /analyze để AI quét trực tiếp
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        toast.error('Dung lượng tệp vượt quá 25MB cho phép');
        return;
      }
      await processAndAnalyze(file, confidenceThreshold, enableEnhance);
    }
  };

  // Khi bật/tắt chế độ tăng cường tương phản AI
  const handleToggleEnhance = async (checked: boolean) => {
    setEnableEnhance(checked);
    if (rawFile) {
      await processAndAnalyze(rawFile, confidenceThreshold, checked);
      toast.info(
        checked
          ? 'Đã bật tăng cường tương phản AI cho Vết nứt & Ổ gà'
          : 'Đã tắt chế độ tăng tương phản',
        'Tiền Xử Lý Ảnh'
      );
    }
  };

  // Khi người dùng thay đổi Slider ngưỡng tin cậy
  const handleThresholdChange = (newThresh: number) => {
    setConfidenceThreshold(newThresh);
    if (selectedFile) {
      runAiAnalysis(selectedFile, newThresh);
    }
  };

  // Xử lý khi người dùng bấm tích / bỏ chọn loại sự cố (hỗ trợ tích chọn đồng thời nhiều loại)
  const handleToggleCategory = (cat: Category) => {
    let next: Category[];
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        next = selectedCategories.filter((c) => c !== cat);
      } else {
        // Luôn giữ ít nhất 1 loại được chọn
        return;
      }
    } else {
      next = [...selectedCategories, cat];
    }
    setSelectedCategories(next);
    const primaryCat = next.length > 1 ? 'COMPLEX_DAMAGE' : next[0];
    setCategory(primaryCat);

    // Cập nhật tiêu đề & mô tả gợi ý
    const loc = address.split(',')[0] || 'hiện trường';
    const catLabels = next.map((c) =>
      c === 'POTHOLE' ? 'Ổ gà' :
      c === 'ROAD_CRACK' ? 'Vết nứt' :
      c === 'ROAD_FLOODING' ? 'Ngập úng' :
      c === 'ROAD_OBSTACLE' ? 'Vật cản' : 'Hư hại'
    );
    if (next.length > 1) {
      setTitle(`Phát hiện ${catLabels.join(' & ')} tại ${loc}`);
      if (!description || description.startsWith('AI phát hiện') || description.startsWith('Hiện trường')) {
        setDescription(`Hiện trường ghi nhận đồng thời nhiều loại sự cố gồm: ${catLabels.join(', ')}. Đề nghị cơ quan chức năng kiểm tra và xử lý liên hoàn.`);
      }
    } else {
      const c = next[0];
      if (c === 'POTHOLE') setTitle(`Ổ gà mặt đường tại ${loc}`);
      else if (c === 'ROAD_CRACK') setTitle(`Vết nứt vỡ mặt đường tại ${loc}`);
      else if (c === 'ROAD_FLOODING') setTitle(`Ngập úng cản trở giao thông tại ${loc}`);
      else setTitle(`Chướng ngại vật / vật cản tại ${loc}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      setIsAuthModalOpen(true);
      toast.warning('Vui lòng đăng nhập tài khoản Công Dân để nộp báo cáo chính thức.');
      return;
    }

    if (!selectedFile) {
      toast.warning('Vui lòng chọn hoặc chụp ảnh mặt đường hư hại');
      setErrorMsg('Vui lòng chọn hoặc chụp ảnh mặt đường hư hại');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const effectiveCategory = selectedCategories.length > 1 ? 'COMPLEX_DAMAGE' : (selectedCategories[0] || 'ROAD_OBSTACLE');

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('title', title || 'Phản ánh sự cố mặt đường');
    formData.append('description', description);
    formData.append('address', address);
    formData.append('category', effectiveCategory);
    formData.append('categories', selectedCategories.join(','));
    formData.append('threshold', confidenceThreshold.toString());

    try {
      const res = await incidentApi.createIncident(formData);
      toast.success('Báo cáo sự cố đã được gửi thành công!', 'Tiếp Nhận Thành Công');
      navigate(`/incidents/${res.data.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tạo phản ánh, vui lòng thử lại.';
      setErrorMsg(msg);
      toast.error(msg, 'Lỗi Tiếp Nhận');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 py-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium self-start border border-slate-200">
          <span>Biểu mẫu tiếp nhận sự cố hạ tầng</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Báo cáo sự cố mặt đường</h1>
        <p className="text-xs text-slate-500 max-w-2xl">
          Tải lên ảnh chụp hiện trường mặt đường hư hại và vị trí GPS để cơ quan quản lý tiếp nhận, thẩm định và điều phối đội duy tu xử lý.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-100 text-amber-700 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-amber-900">Bạn đang ở chế độ khách (chưa đăng nhập)</div>
              <div className="text-amber-700">
                Để nộp báo cáo hoặc đồng tình (+1 Upvote) sự cố, vui lòng đăng nhập tài khoản công dân.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-md shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập nhanh</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bố cục 2 Cột */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Cột Trái: Upload & Khung AI Vision Real-time (5 cột) */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Ảnh hiện trường & Phân tích tự động</span>
              <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium border border-blue-100">
                Nhận diện tự động
              </span>
            </div>

            {/* Khung thả ảnh hoặc hiển thị Bounding Box sau khi AI phân tích */}
            {previewUrl ? (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <ImageCanvasWithBBox
                    imageUrl={previewUrl}
                    aiDetection={
                      aiResult
                        ? {
                            className: aiResult.className,
                            confidence: aiResult.confidence,
                            bboxX: aiResult.bboxX,
                            bboxY: aiResult.bboxY,
                            bboxWidth: aiResult.bboxWidth,
                            bboxHeight: aiResult.bboxHeight,
                            count: aiResult.count,
                            boxes: aiResult.boxes || [],
                            inferenceMs: aiResult.inferenceMs,
                            activeThreshold: aiResult.activeThreshold,
                          }
                        : undefined
                    }
                    className="h-72 w-full"
                  />

                  {isScanning && (
                    <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-xl">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="font-mono text-xs font-bold text-primary">
                        Đang phân tích hình ảnh...
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Chọn ảnh khác
                  </button>
                  {aiResult && (
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Thời gian suy luận: <strong className="text-primary">{aiResult.inferenceMs}ms</strong>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative aspect-square w-full rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex flex-col items-center gap-3 p-6 text-center text-slate-500">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-800">Kéo thả ảnh hoặc nhấn để chọn tệp</span>
                    <span className="text-xs text-slate-500">Hỗ trợ nhận diện tự động: Ổ gà, Nứt mặt đường, Ngập úng, Vật cản</span>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                    JPG, PNG, WEBP (Tối đa 25MB)
                  </span>
                </div>
              </div>
            )}

            {/* Hướng dẫn góc chụp thực địa */}
            {!previewUrl && (
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-800">Hướng dẫn chụp ảnh hiện trường:</span>
                  <span className="text-[11px] leading-relaxed text-slate-500">
                    Nghiêng camera góc <strong>45° – 60°</strong> hướng về mặt đường, khoảng cách <strong>1 – 2m</strong>, để hư hại chiếm tối thiểu <strong>50%</strong> khung hình.
                  </span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* BẢNG ĐIỀU KHIỂN & ĐO LƯỜNG NÂNG CAO */}
            {previewUrl && (
              <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedAi(!showAdvancedAi)}
                  className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors w-full text-left"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tùy chỉnh phân tích hình ảnh nâng cao</span>
                    <span className="text-[10px] font-mono font-medium text-blue-700 px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200">
                      {(confidenceThreshold * 100).toFixed(0)}%
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showAdvancedAi ? 'rotate-180' : ''}`} />
                </button>

                {showAdvancedAi && (
                  <div className="p-3.5 border-t border-slate-200 flex flex-col gap-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">Ngưỡng lọc tin cậy:</span>
                      <span className="font-mono text-xs font-semibold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {(confidenceThreshold * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-400">5%</span>
                      <input
                        type="range"
                        min="0.05"
                        max="0.85"
                        step="0.01"
                        value={confidenceThreshold}
                        onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                        className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-slate-400">85%</span>
                    </div>

                    {/* Tùy chọn Tăng cường tương phản */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <label className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-medium text-slate-700">
                          Tăng cường tương phản (Làm rõ vết nứt & ổ gà)
                        </span>
                        <input
                          type="checkbox"
                          checked={enableEnhance}
                          onChange={(e) => handleToggleEnhance(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                        />
                      </label>

                      {optimizationStats && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
                          <span>Đã tối ưu dung lượng: <strong className="text-slate-700">{optimizationStats.optKB} KB</strong></span>
                          <span className="text-slate-400 line-through">Gốc: {optimizationStats.origKB} KB</span>
                        </div>
                      )}
                    </div>

                    {/* Telemetry HUD metrics */}
                    {aiResult && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30 text-center">
                        <div className="p-1.5 rounded-lg bg-surface-container-lowest flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">Số lượng phát hiện</span>
                          <span className="text-xs font-extrabold text-primary font-mono">
                            {aiResult.count || 0} vị trí
                          </span>
                        </div>

                        <div className="p-1.5 rounded-lg bg-surface-container-lowest flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">Chiếm mặt đường</span>
                          <span className="text-xs font-extrabold text-on-surface font-mono">
                            {aiResult.footprintPercent || 0}%
                          </span>
                        </div>

                        <div className="p-1.5 rounded-lg bg-surface-container-lowest flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">Cấp độ đề xuất</span>
                          <span className={`text-[11px] font-extrabold font-mono uppercase px-1 rounded ${
                            aiResult.estimatedSeverity === 'CRITICAL' ? 'text-error bg-error/10' :
                            aiResult.estimatedSeverity === 'HIGH' ? 'text-amber-600 bg-amber-500/10' :
                            aiResult.estimatedSeverity === 'MEDIUM' ? 'text-primary bg-primary/10' :
                            'text-secondary bg-secondary/10'
                          }`}>
                            {aiResult.estimatedSeverity || 'LOW'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Thông báo kết quả nhận diện rõ ràng cho người dùng */}
            {aiResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-3 transition-all ${
                  aiResult.className !== 'NONE' && (aiResult.count || 0) > 0
                    ? 'bg-blue-50/80 text-blue-900 border border-blue-200/80 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {aiResult.className !== 'NONE' && (aiResult.count || 0) > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="font-bold text-blue-950 flex items-center justify-between flex-wrap gap-1">
                        <span>
                          {(() => {
                            const counts: Record<string, number> = aiResult.classCounts || {};
                            if (!aiResult.classCounts && aiResult.boxes) {
                              for (const b of aiResult.boxes) {
                                counts[b.className] = (counts[b.className] || 0) + 1;
                              }
                            }
                            const parts: string[] = [];
                            if (counts['POTHOLE']) parts.push(`${counts['POTHOLE']} Ổ GÀ`);
                            if (counts['ROAD_CRACK']) parts.push(`${counts['ROAD_CRACK']} VẾT NỨT`);
                            if (counts['ROAD_FLOODING']) parts.push(`${counts['ROAD_FLOODING']} ĐIỂM NGẬP ÚNG`);
                            if (counts['ROAD_OBSTACLE']) parts.push(`${counts['ROAD_OBSTACLE']} CHƯỚNG NGẠI VẬT`);

                            if (parts.length > 1) {
                              return `AI Phát Hiện Đa Sự Cố: ${parts.join(' & ')}`;
                            } else if (parts.length === 1) {
                              return `AI Phát Hiện: ${parts[0]}`;
                            } else {
                              return `AI Phát Hiện: ${
                                aiResult.className === 'POTHOLE'
                                  ? (aiResult.count && aiResult.count > 1 ? `${aiResult.count} Ổ GÀ MẶT ĐƯỜNG` : 'Ổ GÀ MẶT ĐƯỜNG')
                                  : aiResult.className === 'ROAD_CRACK'
                                  ? (aiResult.count && aiResult.count > 1 ? `${aiResult.count} VẾT NỨT MẶT ĐƯỜNG` : 'VẾT NỨT MẶT ĐƯỜNG')
                                  : aiResult.className === 'ROAD_FLOODING'
                                  ? (aiResult.count && aiResult.count > 1 ? `${aiResult.count} ĐIỂM NGẬP ÚNG` : 'ĐIỂM NGẬP ÚNG')
                                  : (aiResult.count && aiResult.count > 1 ? `${aiResult.count} CHƯỚNG NGẠI VẬT` : 'CHƯỚNG NGẠI VẬT')
                              }`;
                            }
                          })()}
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {(aiResult.confidence * 100).toFixed(1)}% tin cậy
                        </span>
                      </div>
                      <p className="text-blue-800 text-[11px] leading-relaxed">
                        Đã đánh dấu {aiResult.count || 1} vị trí Bounding Box • Đề xuất mức ưu tiên: <strong className="uppercase">{aiResult.estimatedSeverity || 'TRUNG BÌNH'}</strong>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">AI Quét Xong: Không phát hiện hư hỏng với ngưỡng &ge; {(confidenceThreshold * 100).toFixed(0)}%</span>
                      <span className="text-[11px] text-slate-600">Bạn có thể chọn mục <strong>Tùy chỉnh phân tích AI</strong> để giảm ngưỡng hoặc tiếp tục nộp để thẩm định thủ công.</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Bản đồ GIS Tương Tác & Chi tiết vị trí (7 cột) */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Vị trí và thông tin hiện trường</h2>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors disabled:opacity-60"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Đang lấy GPS...' : 'Lấy vị trí GPS'}</span>
              </button>
            </div>

            {/* Ô nhập Địa chỉ + Nút tìm kiếm */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Địa chỉ số nhà / Tên đường / Khu vực
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
                    placeholder="Ví dụ: Thanh Liêm, Hà Nam hoặc 120 Nguyễn Trãi..."
                    className="w-full pl-9 pr-3 py-2 rounded-md bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isLocating}
                  className="px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-300"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Định vị</span>
                </button>
              </div>

              {/* Gợi ý vị trí nhanh khu vực trọng điểm */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                <span className="text-[11px] text-slate-500 font-medium">Chọn nhanh:</span>
                {[
                  { label: 'Hà Nội (Khu I)', lat: 21.0285, lng: 105.8542, addr: 'Quận Hoàn Kiếm, TP. Hà Nội' },
                  { label: 'TP. Hồ Chí Minh (Khu IV)', lat: 10.7769, lng: 106.7009, addr: 'Quận 1, TP. Hồ Chí Minh' },
                  { label: 'Đà Nẵng (Khu III)', lat: 16.0678, lng: 108.2208, addr: 'Quận Hải Châu, TP. Đà Nẵng' },
                  { label: 'Cần Thơ (Khu IV)', lat: 10.0333, lng: 105.7833, addr: 'Quận Ninh Kiều, TP. Cần Thơ' },
                  { label: 'Nghệ An (Khu II)', lat: 18.6738, lng: 105.6813, addr: 'TP. Vinh, Tỉnh Nghệ An' },
                  { label: 'Hà Nam (Khu I)', lat: 20.436036, lng: 105.904596, addr: 'Thanh Liêm, Tỉnh Hà Nam' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setLatitude(preset.lat);
                      setLongitude(preset.lng);
                      setAddress(preset.addr);
                      checkNearby(preset.lat, preset.lng);
                      toast.info(`Đã ghim bản đồ tới: ${preset.label}`);
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CẢNH BÁO TRÙNG LẶP KHÔNG GIAN (SPATIAL DEDUPLICATION & UPVOTE) */}
            {nearbyDuplicate?.hasNearbyDuplicate && nearbyDuplicate.existingIncident && !dismissDuplicate && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-amber-900 uppercase tracking-wide">
                          Khu vực này đã có phản ánh cách {nearbyDuplicate.distanceMeters?.toFixed(1)}m
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-medium border border-amber-200">
                          {nearbyDuplicate.existingIncident.ticketCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Sự cố "{nearbyDuplicate.existingIncident.title}" đã được ghi nhận với {nearbyDuplicate.existingIncident.upvoteCount || 1} lượt đồng tình. Bạn có thể nhấn <strong>Đồng tình (+1 Upvote)</strong> để tăng mức độ khẩn cấp xử lý mà không cần gửi phản ánh mới.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissDuplicate(true)}
                    className="text-slate-500 hover:text-slate-800 text-xs font-medium px-1.5 py-0.5 rounded"
                  >
                    Bỏ qua
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80">
                  <div className="text-[11px] text-slate-600 font-mono">
                    {nearbyDuplicate.existingIncident.address || 'Hiện trường lân cận'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!isAuthenticated || !user) {
                          setIsAuthModalOpen(true);
                          toast.warning('Vui lòng đăng nhập để đồng tình phản ánh này.');
                          return;
                        }
                        try {
                          await incidentApi.upvoteIncident(nearbyDuplicate.existingIncident!.id);
                          toast.success('Đã gửi +1 Đồng tình thành công! Mức độ khẩn cấp của sự cố đã được tăng.', 'Cộng Đồng Đồng Tình');
                          navigate(`/incidents/${nearbyDuplicate.existingIncident!.id}`);
                        } catch (err: any) {
                          toast.info(err.response?.data?.message || 'Bạn đã đồng tình với phản ánh này trước đó rồi.');
                          navigate(`/incidents/${nearbyDuplicate.existingIncident!.id}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Đồng tình (+1 Upvote)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissDuplicate(true)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      Vẫn nộp báo cáo mới
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BẢN ĐỒ TƯƠNG TÁC LEAFLET / OPENSTREETMAP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Bản đồ không gian (Nhấp hoặc kéo ghim để chọn tọa độ)
                </label>
                <span className="font-mono text-[11px] text-slate-500">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={handleLocationChange}
                className="h-56 w-full rounded-md border border-slate-200 overflow-hidden"
              />
            </div>

            {/* THÔNG TIN HẠT QUẢN LÝ ĐƯỜNG BỘ & ĐỘI DUY TU TIẾP NHẬN TRỰC TIẾP */}
            {(() => {
              const info = getCorridorInfo(latitude, longitude, address);
              return (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800">Đơn vị quản lý tuyến phụ trách:</span>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${info.badgeColor} font-mono`}>
                      {info.corridor} • {info.team}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Khu vực: <strong>{info.zoneName}</strong> • Phân bổ tiếp nhận tự động theo Thông tư 37/2018/TT-BGTVT. SLA dự kiến tiếp cận: <strong>~{info.slaMinutes} phút</strong> ({info.contact}).
                  </p>
                </div>
              );
            })()}

            {/* Phân loại Sự cố (Hỗ trợ tích chọn đồng thời nhiều loại) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Loại sự cố mặt đường (Có thể chọn nhiều loại)
                </label>
                {selectedCategories.length > 1 && (
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                    Đã chọn {selectedCategories.length} loại
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: 'POTHOLE', label: 'Ổ gà / Hố sụt', icon: CircleAlert, iconColor: 'text-rose-600' },
                  { value: 'ROAD_CRACK', label: 'Vết nứt mặt đường', icon: GitBranch, iconColor: 'text-amber-600' },
                  { value: 'ROAD_FLOODING', label: 'Điểm ngập úng', icon: Waves, iconColor: 'text-blue-600' },
                  { value: 'ROAD_OBSTACLE', label: 'Vật cản / Chướng ngại', icon: Construction, iconColor: 'text-slate-600' },
                  { value: 'OTHER', label: 'Hư hại khác', icon: AlertTriangle, iconColor: 'text-purple-600' },
                ].map((item) => {
                  const isChecked = selectedCategories.includes(item.value as Category);
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleToggleCategory(item.value as Category)}
                      className={`px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between border transition-colors text-left ${
                        isChecked
                          ? 'bg-blue-50 text-blue-900 border-blue-600 ring-1 ring-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconComp className={`w-4 h-4 shrink-0 ${item.iconColor}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold border transition-colors ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tiêu đề phản ánh */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tiêu đề phản ánh</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Ổ gà lớn nguy hiểm tại ngã ba..."
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            {/* Ghi chú mô tả */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Ghi chú chi tiết cho đội thi công</label>
                {aiResult && (aiResult.count || 0) > 0 && (
                  <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    AI đã tự động đếm & điền số lượng
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả hiện trạng: Độ sâu hố, vật cản, mép nứt hoặc ảnh hưởng giao thông..."
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              ></textarea>
              {aiResult && (aiResult.count || 0) > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Chi tiết số lượng phát hiện:</span>
                  {(() => {
                    const counts: Record<string, number> = aiResult.classCounts || {};
                    if (!aiResult.classCounts && aiResult.boxes) {
                      for (const b of aiResult.boxes) {
                        counts[b.className] = (counts[b.className] || 0) + 1;
                      }
                    }
                    return (
                      <>
                        {counts['POTHOLE'] && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                            🕳️ {counts['POTHOLE']} ổ gà
                          </span>
                        )}
                        {counts['ROAD_CRACK'] && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 font-mono text-[10px] font-bold">
                            ⚡ {counts['ROAD_CRACK']} vết nứt
                          </span>
                        )}
                        {counts['ROAD_FLOODING'] && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold">
                            🌊 {counts['ROAD_FLOODING']} điểm ngập
                          </span>
                        )}
                        {counts['ROAD_OBSTACLE'] && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-mono text-[10px] font-bold">
                            🚧 {counts['ROAD_OBSTACLE']} vật cản
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang ghi nhận vào cơ sở dữ liệu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận gửi phản ánh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Modal đăng nhập nhanh nếu người dùng thao tác ở chế độ khách */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
