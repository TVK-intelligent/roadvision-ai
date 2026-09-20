import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { MapPicker } from '../components/MapPicker';
import { ImageCanvasWithBBox } from '../components/ImageCanvasWithBBox';
import { Category } from '../types';
import { useToast } from '../components/Toast';
import { preprocessImage } from '../utils/imagePreprocess';
import { Upload, MapPin, Sparkles, CheckCircle2, AlertCircle, Loader2, Crosshair, Search, Sliders, ShieldAlert, Zap, Layers, Image as ImageIcon } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiPreviewResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [enableEnhance, setEnableEnhance] = useState<boolean>(true);
  const [optimizationStats, setOptimizationStats] = useState<{ origKB: number; optKB: number } | null>(null);

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
        if (data[0].display_name) {
          setAddress(data[0].display_name);
        }
      } else {
        setErrorMsg('Không tìm thấy tọa độ trên bản đồ cho địa chỉ này, bạn có thể nhấp trực tiếp vào bản đồ bên dưới.');
      }
    } catch (err) {
      console.warn('Lỗi forward geocode:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Lấy vị trí GPS hiện tại từ thiết bị
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Trình duyệt không hỗ trợ Geolocation');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Không thể lấy GPS trực tiếp', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Khi người dùng nhấp hoặc kéo marker trên bản đồ
  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    reverseGeocode(lat, lng);
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
          if (counts['POTHOLE']) labelParts.push(`${counts['POTHOLE']} Ổ gà`);
          if (counts['ROAD_CRACK']) labelParts.push(`${counts['ROAD_CRACK']} Vết nứt`);
          if (counts['ROAD_FLOODING']) labelParts.push(`${counts['ROAD_FLOODING']} Điểm ngập`);
          if (counts['ROAD_OBSTACLE']) labelParts.push(`${counts['ROAD_OBSTACLE']} Vật cản`);
          const labelStr = labelParts.join(' & ');

          setTitle(`Phát hiện ${labelStr} mặt đường tại ${loc}`);
          setDescription(
            `AI phát hiện đồng thời nhiều loại sự cố gồm ${labelStr} (tổng ${totalCount} vị trí, độ tin cậy ${(data.confidence * 100).toFixed(1)}%). Đề nghị ưu tiên khảo sát liên hoàn vá đường và chống thấm nứt nẻ.`
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
            setTitle(`Phát hiện ${count > 1 ? count + ' ' : ''}Ổ gà mặt đường tại ${loc}`);
            setDescription(`AI phát hiện ${count} vị trí ổ gà mặt đường (độ tin cậy ${(data.confidence * 100).toFixed(1)}%). Đề nghị ưu tiên vá đường tránh tai nạn.`);
          } else if (singleCat === 'ROAD_CRACK') {
            setTitle(`Phát hiện ${count > 1 ? count + ' ' : ''}Vết nứt rạn mặt đường tại ${loc}`);
            setDescription(`AI phát hiện vết nứt mặt đường nhựa (${count} vị trí, độ tin cậy ${(data.confidence * 100).toFixed(1)}%). Cần xử lý chống thấm sụt lún.`);
          } else if (singleCat === 'ROAD_FLOODING') {
            setTitle(`Cảnh báo ngập úng mặt đường tại ${loc}`);
            setDescription(`AI phát hiện điểm ứ đọng ngập nước trên mặt đường (${(data.footprintPercent || 0).toFixed(1)}% diện tích ảnh). Cần nạo vét khơi thông dòng chảy.`);
          } else {
            setTitle(`Chướng ngại vật / vật cản tại ${loc}`);
            setDescription(`AI phát hiện vật cản trở an toàn giao thông. Đề nghị cử kỹ thuật viên xử lý.`);
          }
          toast.info(
            `AI phát hiện ${count} vị trí ${
              singleCat === 'POTHOLE' ? 'Ổ gà' :
              singleCat === 'ROAD_CRACK' ? 'Vết nứt' :
              singleCat === 'ROAD_FLOODING' ? 'Ngập úng' : 'Vật cản'
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
        <div className="flex items-center gap-2 text-secondary font-mono text-xs font-semibold uppercase">
          <Sparkles className="w-4 h-4" />
          CIVIC INTAKE PIPELINE • PHA 1 & 2
        </div>
        <h1 className="font-display text-3xl font-extrabold text-on-surface">Báo Cáo Sự Cố Giao Thông</h1>
        <p className="text-sm text-on-surface-variant max-w-2xl">
          Tải lên ảnh chụp sự cố mặt đường. Mô hình AI YOLOv8 ONNX sẽ quét nhận diện và đồng bộ vị trí GPS theo bản đồ không gian tương tác.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-error flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bố cục 2 Cột */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Cột Trái: Upload & Khung AI Vision Real-time (5 cột) */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-on-surface">Khung Quét AI Vision</span>
              <span className="font-mono text-[10px] text-primary bg-primary-fixed/50 px-2 py-0.5 rounded font-semibold">
                YOLOv8 ONNX IN-PROCESS
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
                        ĐANG QUÉT MẠNG NƠ-RON YOLOv8...
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
                className={`relative aspect-square w-full rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden group ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-outline-variant/60 hover:border-primary bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex flex-col items-center gap-3 p-6 text-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-on-surface">Kéo thả ảnh hoặc Nhấn để tải lên</span>
                    <span className="text-xs text-on-surface-variant">Tự động nhận diện 4 lớp: Ổ gà, Nứt, Ngập, Vật cản</span>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant/70 bg-surface-container px-2.5 py-1 rounded-full">
                    JPG, PNG, WEBP (Tự động xoay & tối ưu Full HD)
                  </span>
                </div>
              </div>
            )}

            {/* Hướng dẫn góc chụp chuẩn thực địa cho AI */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-on-surface-variant">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-on-surface">Mẹo chụp để AI phát hiện chuẩn nhất:</span>
                <span className="text-[11px] leading-relaxed">
                  Cúi camera góc <strong>45° – 60°</strong> hướng xuống mặt đường, cự ly <strong>1 – 2m</strong>, để mặt đường chiếm trên <strong>70%</strong> khung hình.
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* BẢNG ĐIỀU KHIỂN & ĐO LƯỜNG AI TELEMETRY (Dành cho kiểm thử & demo đồ án) */}
            {previewUrl && (
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Ngưỡng Tin Cậy (Confidence Gate):</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-on-surface-variant">5%</span>
                  <input
                    type="range"
                    min="0.05"
                    max="0.85"
                    step="0.01"
                    value={confidenceThreshold}
                    onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-on-surface-variant">85%</span>
                </div>

                {/* Tùy chọn Tăng cường tương phản AI & Thống kê nén ảnh */}
                <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 cursor-pointer hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-on-surface">
                        Tăng cường tương phản AI (Làm rõ Nứt & Ổ gà)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableEnhance}
                      onChange={(e) => handleToggleEnhance(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                  </label>

                  {optimizationStats && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant px-1">
                      <span>⚡ Đã xoay chuẩn EXIF & tối ưu: <strong className="text-primary">{optimizationStats.optKB} KB</strong></span>
                      <span className="text-outline line-through">Gốc: {optimizationStats.origKB} KB</span>
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

            {/* Thông báo kết quả nhận diện rõ ràng cho người dùng */}
            {aiResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  aiResult.className !== 'NONE' && (aiResult.count || 0) > 0
                    ? 'bg-primary-fixed/40 text-primary border border-primary/30'
                    : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40'
                }`}
              >
                {aiResult.className !== 'NONE' && (aiResult.count || 0) > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {(() => {
                          const counts: Record<string, number> = aiResult.classCounts || {};
                          if (!aiResult.classCounts && aiResult.boxes) {
                            for (const b of aiResult.boxes) {
                              counts[b.className] = (counts[b.className] || 0) + 1;
                            }
                          }
                          const parts: string[] = [];
                          if (counts['POTHOLE']) parts.push(`${counts['POTHOLE']} Ổ GÀ`);
                          if (counts['ROAD_CRACK']) parts.push(`${counts['ROAD_CRACK']} VẾT NỨT MẶT ĐƯỜNG`);
                          if (counts['ROAD_FLOODING']) parts.push(`${counts['ROAD_FLOODING']} ĐIỂM NGẬP ÚNG`);
                          if (counts['ROAD_OBSTACLE']) parts.push(`${counts['ROAD_OBSTACLE']} CHƯỚNG NGẠI VẬT`);

                          if (parts.length > 1) {
                            return `AI Nhận Diện Đa Sự Cố: ${parts.join(' & ')}`;
                          } else if (parts.length === 1) {
                            return `AI Nhận Diện: ${parts[0]}`;
                          } else {
                            return `AI Nhận Diện: ${
                              aiResult.className === 'POTHOLE'
                                ? (aiResult.count && aiResult.count > 1 ? `${aiResult.count} Ổ GÀ TRÊN MẶT ĐƯỜNG` : 'Ổ GÀ MẶT ĐƯỜNG')
                                : aiResult.className === 'ROAD_CRACK'
                                ? (aiResult.count && aiResult.count > 1 ? `${aiResult.count} VẾT NỨT MẶT ĐƯỜNG` : 'VẾT NỨT MẶT ĐƯỜNG')
                                : aiResult.className === 'ROAD_FLOODING'
                                ? (aiResult.count && aiResult.count > 1 ? `${aiResult.count} ĐIỂM NGẬP ÚNG MẶT ĐƯỜNG` : 'ĐIỂM NGẬP ÚNG MẶT ĐƯỜNG')
                                : (aiResult.count && aiResult.count > 1 ? `${aiResult.count} CHƯỚNG NGẠI VẬT MẶT ĐƯỜNG` : 'CHƯỚNG NGẠI VẬT MẶT ĐƯỜNG')
                            }`;
                          }
                        })()}
                      </span>
                      <span>
                        Độ tin cậy cao nhất: {(aiResult.confidence * 100).toFixed(1)}% • Đã đánh dấu {aiResult.count || 1} hộp bao Bounding Box. Mức độ ưu tiên đề xuất: <strong>{aiResult.estimatedSeverity}</strong>.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">AI Quét Xong: Không phát hiện hư hỏng với ngưỡng &ge; {(confidenceThreshold * 100).toFixed(0)}%</span>
                      <span>Bạn có thể <strong>kéo giảm thanh trượt ngưỡng</strong> bên trên hoặc chuyển sang thẩm định thủ công.</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Bản đồ GIS Tương Tác & Chi tiết vị trí (7 cột) */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-on-surface">Chi Tiết Vị Trí & Mô Tả Hiện Trường</h2>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-xs font-semibold text-primary transition-colors disabled:opacity-60"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Đang lấy GPS...' : 'GPS hiện tại'}</span>
              </button>
            </div>

            {/* Ô nhập Địa chỉ + Nút tìm kiếm */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Địa chỉ số nhà / Tên đường / Khu vực
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-primary absolute left-3 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
                    placeholder="Ví dụ: Thanh Liêm, Hà Nam hoặc 120 Nguyễn Trãi..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isLocating}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Định vị</span>
                </button>
              </div>
            </div>

            {/* BẢN ĐỒ TƯƠNG TÁC LEAFLET / OPENSTREETMAP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Bản đồ không gian (Nhấp hoặc kéo ghim để chọn tọa độ)
                </label>
                <span className="font-mono text-[10px] text-secondary">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={handleLocationChange}
                className="h-56 w-full"
              />
            </div>

            {/* Phân loại Sự cố (Hỗ trợ tích chọn đồng thời nhiều loại) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-on-surface-variant">
                  Loại sự cố mặt đường (Có thể tích chọn nhiều loại cùng lúc)
                </label>
                {selectedCategories.length > 1 && (
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-mono">
                    Đã tích chọn {selectedCategories.length} loại
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: 'POTHOLE', label: 'Ổ gà / Hố sụt', icon: '🕳️' },
                  { value: 'ROAD_CRACK', label: 'Vết nứt mặt đường', icon: '⚡' },
                  { value: 'ROAD_FLOODING', label: 'Điểm ngập úng', icon: '🌊' },
                  { value: 'ROAD_OBSTACLE', label: 'Vật cản / Chướng ngại', icon: '🚧' },
                  { value: 'OTHER', label: 'Hư hại khác', icon: '⚠️' },
                ].map((item) => {
                  const isChecked = selectedCategories.includes(item.value as Category);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleToggleCategory(item.value as Category)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all text-left ${
                        isChecked
                          ? 'bg-primary text-on-primary border-primary shadow-sm ring-1 ring-primary'
                          : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold border transition-colors ${
                          isChecked
                            ? 'bg-white text-primary border-white'
                            : 'border-outline-variant/60 bg-transparent text-transparent'
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
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tiêu đề phản ánh</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Ổ gà lớn nguy hiểm tại ngã ba..."
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:border-primary"
                required
              />
            </div>

            {/* Ghi chú mô tả */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Ghi chú chi tiết cho đội thi công</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả hiện trạng: Độ sâu hố, vật cản, mép nứt hoặc ảnh hưởng giao thông..."
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:border-primary"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full py-3 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang ghi nhận vào cơ sở dữ liệu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Xác Nhận Nộp Sự Cố</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
