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
  Calculator,
} from 'lucide-react';

const SOLUTION_PRESETS: Record<string, string[]> = {
  POTHOLE: [
    'Cào bóc 4-7cm, tưới nhựa dính bám 0.5kg/m2, thảm bù BTN C12.5 đầm lèn K98 đảm bảo êm thuận',
    'Vá nguội khẩn cấp bằng Carboncor Asphalt đảm bảo an toàn giao thông trước giờ cao điểm',
    'Đào xử lý móng cấp phối đá dăm loại 1, đầm chặt K98 và thảm bù 2 lớp BTN C19 và C12.5'
  ],
  ROAD_CRACK: [
    'Cắt mở rộng rãnh chữ V, làm sạch bằng máy nén khí, quét lớp lót, rót matit chèn khe Polyurethane đạt chuẩn',
    'Dán màng sợi thủy tinh chống nứt phản áp kết hợp cào bóc thảm bù lớp mặt BTN polymer',
    'Tưới nhũ tương nhựa đường thấm bám và rải cát mịn trám kín các khe nứt chân chim diện rộng'
  ],
  ROAD_OBSTACLE: [
    'Huy động máy cưa xẻ phân đoạn thân cành cây ngã, dùng xe cẩu giải phóng lòng đường, chở phế thải dọn sạch',
    'Điều động xe xúc lật và 02 xe ben xúc hót vận chuyển đất đá sạt lở, dùng xe bồn rửa sạch bùn đất mặt đường',
    'Thu gom toàn bộ phế liệu, lốp xe, vật liệu rơi vãi vào lề an toàn, bốc xếp lên xe tải giải tỏa lòng đường',
    'Rải cát khô và mùn cưa thấm hút dầu nhớt loang, dùng dung dịch sinh học tẩy rửa và đặt biển cảnh báo đường trơn'
  ],
  ROAD_FLOODING: [
    'Bố trí rào chắn và biển báo cấm xe ngập sâu, khơi thông rác hố ga thu nước, bơm dã chiến công suất lớn',
    'Nạo vét bùn đất và rác ứ đọng tại rãnh thoát nước dọc tuyến, hoàn trả khả năng tiêu thoát tự nhiên',
    'Lắp đặt máy bơm chìm dã chiến công suất lớn bơm cưỡng bức thoát nước qua lưu vực lân cận'
  ],
  OTHER: [
    'Thay thế nắp gang hố ga chịu lực tải trọng 40 tấn, gia cố cổ hố ga bằng bê tông mác 250',
    'Tháo dỡ tấm đan vỉa hè vỡ, lát lại gạch terrazzo phẳng êm, hoàn trả mỹ quan đô thị',
    'Gia cố khắc phục sạt lở lề đường bằng rọ đá và hoàn trả kết cấu hạ tầng đồng bộ'
  ]
};

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
  const [obstacleSubType, setObstacleSubType] = useState<'TREE' | 'LANDSLIDE' | 'DEBRIS' | 'OIL_SPILL'>('TREE');
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
    const cat = task.category || 'POTHOLE';
    setConfirmedCategory(cat);
    setActualSeverity(task.severity || 'HIGH');
    setSurveyPhotos([]);

    // Tự động khởi tạo thông số đo đạc & phương án kỹ thuật phù hợp với từng loại hư hại
    if (cat === 'ROAD_OBSTACLE') {
      setEstimatedLengthM(4.5);
      setEstimatedWidthM(2.5);
      setEstimatedDepthCm(40.0);
      setProposedSolution(SOLUTION_PRESETS.ROAD_OBSTACLE[0]);
      setSurveyNotes('Cây ngã đổ chiếm một phần lòng đường, cần cưa xẻ và cẩu dọn khẩn cấp');
    } else if (cat === 'ROAD_CRACK') {
      setEstimatedLengthM(6.0);
      setEstimatedWidthM(0.3);
      setEstimatedDepthCm(3.0);
      setProposedSolution(SOLUTION_PRESETS.ROAD_CRACK[0]);
      setSurveyNotes('Vết nứt bề mặt kéo dài, cần trám keo matit ngăn nước mưa ngấm xuống móng');
    } else if (cat === 'ROAD_FLOODING') {
      setEstimatedLengthM(15.0);
      setEstimatedWidthM(6.0);
      setEstimatedDepthCm(35.0);
      setProposedSolution(SOLUTION_PRESETS.ROAD_FLOODING[0]);
      setSurveyNotes('Ngập úng cục bộ lòng đường, rác nghẹt miệng cống thu gom');
    } else if (cat === 'OTHER' || (cat as string) === 'COMPLEX_DAMAGE') {
      setEstimatedLengthM(1.5);
      setEstimatedWidthM(1.0);
      setEstimatedDepthCm(10.0);
      setProposedSolution(SOLUTION_PRESETS.OTHER[0]);
      setSurveyNotes('Hư hỏng kết cấu hạ tầng kỹ thuật đường bộ');
    } else {
      setEstimatedLengthM(1.6);
      setEstimatedWidthM(0.8);
      setEstimatedDepthCm(6.0);
      setProposedSolution(SOLUTION_PRESETS.POTHOLE[0]);
      setSurveyNotes('Mặt đường lún võng nguy hiểm cho xe máy');
    }
  };

  const handleCategoryChange = (newCat: Category) => {
    setConfirmedCategory(newCat);
    const presets = SOLUTION_PRESETS[newCat] || SOLUTION_PRESETS.POTHOLE;
    setProposedSolution(presets[0]);
    if (newCat === 'ROAD_OBSTACLE') {
      setEstimatedLengthM((prev) => (prev < 3 ? 4.5 : prev));
      setEstimatedWidthM((prev) => (prev < 1.5 ? 2.5 : prev));
      setEstimatedDepthCm((prev) => (prev < 20 ? 40 : prev));
    } else if (newCat === 'ROAD_FLOODING') {
      setEstimatedLengthM((prev) => (prev < 5 ? 12.0 : prev));
      setEstimatedWidthM((prev) => (prev < 3 ? 5.0 : prev));
      setEstimatedDepthCm((prev) => (prev < 15 ? 30 : prev));
    } else if (newCat === 'ROAD_CRACK') {
      setEstimatedLengthM((prev) => (prev < 2 ? 5.0 : prev));
      setEstimatedWidthM((prev) => (prev > 1 ? 0.3 : prev));
      setEstimatedDepthCm((prev) => (prev > 10 ? 3 : prev));
    }
  };

  const getCategoryDetails = () => {
    switch (confirmedCategory) {
      case 'ROAD_OBSTACLE':
        if (obstacleSubType === 'LANDSLIDE') {
          return {
            title: 'Quy mô Đất đá sạt lở / Đá tảng tràn lòng đường:',
            lLabel: 'Chiều dài vệt sạt (m)',
            wLabel: 'Bề rộng tràn mặt đường (m)',
            dLabel: 'Độ dày lớp đất đá (cm)',
            card1Title: 'Diện tích tràn mặt đường (S)',
            card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
            card1Sub: 'S = Dài × Rộng',
            card2Title: 'Khối lượng đất đá xúc hốt (V)',
            card2Val: `${((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(2)} m³`,
            card2Sub: 'V = S × Độ dày',
            card3Title: 'Phương tiện huy động',
            card3Val: 'Xe xúc lật + Xe ben + Xe bồn',
            card3Sub: 'Múc đất đá & Rửa mặt đường',
            formula: '* Phương án cứu hộ: Điều động xe xúc lật múc đất đá lên xe ben vận chuyển, xe bồn phun nước rửa sạch bùn đất trơn trượt'
          };
        } else if (obstacleSubType === 'DEBRIS') {
          return {
            title: 'Quy mô Phế liệu / Vật liệu rơi vãi (Lốp xe, thùng hàng, sắt vụn):',
            lLabel: 'Chiều dài phạm vi rơi vãi (m)',
            wLabel: 'Bề rộng chiếm dụng (m)',
            dLabel: 'Chiều cao kiện hàng / Khối vật cản (cm)',
            card1Title: 'Lòng đường chiếm dụng (S)',
            card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
            card1Sub: 'S = Dài × Rộng',
            card2Title: 'Khối lượng phế thải ước tính',
            card2Val: `${((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(2)} m³`,
            card2Sub: 'Cần bốc xếp thu dọn',
            card3Title: 'Phương tiện & Nhân lực',
            card3Val: 'Công nhân + Xe tải thu gom',
            card3Sub: 'Thu gom giải phóng lòng đường',
            formula: '* Phương án cứu hộ: Phân luồng điều tiết giao thông, thu gom toàn bộ vật liệu rơi vãi vào lề an toàn, chở xe tải đi'
          };
        } else if (obstacleSubType === 'OIL_SPILL') {
          return {
            title: 'Phạm vi Vệt dầu nhớt / Hóa chất loang trơn trượt nguy hiểm:',
            lLabel: 'Chiều dài vệt dầu loang (m)',
            wLabel: 'Bề rộng vệt dầu (m)',
            dLabel: 'Mức độ loang trượt (cm)',
            card1Title: 'Diện tích dầu nhớt loang (S)',
            card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
            card1Sub: 'S = Dài × Rộng',
            card2Title: 'Cát khô / mùn cưa thấm hút',
            card2Val: `~ ${(estimatedLengthM * estimatedWidthM * 1.5).toFixed(1)} kg`,
            card2Sub: 'Định mức thấm hút dầu nhớt',
            card3Title: 'Biện pháp xử lý chống trượt',
            card3Val: 'Rải cát + Tẩy rửa sinh học',
            card3Sub: 'Khử trơn trượt bề mặt đường',
            formula: '* Phương án xử lý: Đặt biển cảnh báo trơn trượt từ xa, rải cát/mùn cưa thấm hút váng dầu, phun dung dịch tẩy rửa và rửa sạch'
          };
        } else {
          return {
            title: 'Quy mô Cây xanh ngã đổ / Cành cây gãy chắn đường:',
            lLabel: 'Chiều dài thân cây / cành (m)',
            wLabel: 'Bề rộng làn bị chắn (m)',
            dLabel: 'Đường kính thân cây (cm)',
            card1Title: 'Lòng đường chiếm dụng (S)',
            card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
            card1Sub: 'S = Dài × Rộng',
            card2Title: 'Khối lượng cưa cắt giải tỏa',
            card2Val: `${((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(2)} m³`,
            card2Sub: 'Cưa xẻ & Cẩu dọn',
            card3Title: 'Phương tiện & Biện pháp',
            card3Val: 'Cưa máy + Xe cẩu + Xe ben',
            card3Sub: 'Giải phóng & Chở phế thải',
            formula: '* Phương án cứu hộ: Cưa xẻ phân đoạn thân cành, cẩu giải tỏa khỏi lòng đường, xe ben chở phế thải hoàn trả mặt đường sạch sẽ'
          };
        }
      case 'ROAD_CRACK':
        return {
          title: 'Thông số đo đạc vết nứt rạn mặt đường:',
          lLabel: 'Chiều dài vệt nứt (m)',
          wLabel: 'Bề rộng rạn nứt (m)',
          dLabel: 'Độ sâu khe nứt (cm)',
          card1Title: 'Chiều dài trám nứt (L)',
          card1Val: `${estimatedLengthM.toFixed(1)} m dài`,
          card1Sub: 'Khe nứt cần rót keo',
          card2Title: 'Diện tích vùng rạn (S)',
          card2Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
          card2Sub: 'S = Dài × Rộng',
          card3Title: 'Matit chèn khe Polyurethane',
          card3Val: `~ ${(estimatedLengthM * 0.25).toFixed(1)} kg`,
          card3Sub: 'Định mức trám nứt TCVN',
          formula: '* Quy chuẩn xử lý nứt: Cắt rãnh theo vết nứt, làm sạch bằng máy nén khí, rót matit chèn khe đàn hồi chuyên dụng'
        };
      case 'ROAD_FLOODING':
        return {
          title: 'Phạm vi ngập úng & Mực nước ngập sâu:',
          lLabel: 'Chiều dài đoạn ngập (m)',
          wLabel: 'Bề rộng vùng ngập (m)',
          dLabel: 'Mực nước ngập sâu (cm)',
          card1Title: 'Diện tích ngập nước (S)',
          card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
          card1Sub: 'S = Dài × Rộng',
          card2Title: 'Lượng nước ứ đọng',
          card2Val: `~ ${((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(1)} m³`,
          card2Sub: 'V = S × Mực nước sâu',
          card3Title: 'Biện pháp tiêu úng',
          card3Val: 'Bơm dã chiến + Khơi cống',
          card3Sub: 'Hút xả nước cưỡng bức',
          formula: '* Phương án tiêu úng: Đặt biển cảnh báo ngập sâu, khơi thông rác hố ga thu gom, vận hành máy bơm dã chiến giải tỏa úng ngập'
        };
      case 'OTHER':
      default:
        if (confirmedCategory === 'OTHER' || (confirmedCategory as string) === 'COMPLEX_DAMAGE') {
          return {
            title: 'Thông số đo đạc hư hỏng kết cấu hạ tầng:',
            lLabel: 'Chiều dài (m)',
            wLabel: 'Chiều rộng (m)',
            dLabel: 'Độ sâu / Chiều cao (cm)',
            card1Title: 'Diện tích xử lý (S)',
            card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
            card1Sub: 'S = Dài × Rộng',
            card2Title: 'Thể tích ước tính (V)',
            card2Val: `${((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(3)} m³`,
            card2Sub: 'V = S × Sâu / 100',
            card3Title: 'Hạng mục vật tư',
            card3Val: 'Kết cấu chuyên ngành',
            card3Sub: 'Thay thế & Sửa chữa',
            formula: '* Phương án: Xử lý theo hồ sơ thiết kế kỹ thuật định hình hoặc thay thế vật tư phụ kiện đồng bộ'
          };
        }
        return {
          title: 'Thông số đo đạc kích thước hiện trường (Ổ gà / Hố sụt):',
          lLabel: 'Chiều dài (m)',
          wLabel: 'Chiều rộng (m)',
          dLabel: 'Độ sâu (cm)',
          card1Title: 'Diện tích cào bóc (S)',
          card1Val: `${(estimatedLengthM * estimatedWidthM).toFixed(2)} m²`,
          card1Sub: 'S = Dài × Rộng',
          card2Title: 'Thể tích đào bù (V)',
          card2Val: `${((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)).toFixed(3)} m³`,
          card2Sub: 'V = S × (Sâu / 100)',
          card3Title: 'BTN dự kiến (tấn)',
          card3Val: `~ ${(((estimatedLengthM * estimatedWidthM) * (estimatedDepthCm / 100)) * 2.4).toFixed(2)} tấn`,
          card3Sub: 'γ ≈ 2.4 tấn/m³',
          formula: '* Công thức quy chuẩn: S = Dài × Rộng; V = S × (Sâu / 100); BTN ≈ V × 2.4 tấn/m³'
        };
    }
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
                    onChange={(e) => handleCategoryChange(e.target.value as Category)}
                    className="w-full px-2.5 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900 cursor-pointer"
                  >
                    <option value="POTHOLE">Ổ gà / Hố sụt lún</option>
                    <option value="ROAD_CRACK">Vết nứt mặt đường</option>
                    <option value="ROAD_OBSTACLE">Chướng ngại vật / Vật cản</option>
                    <option value="ROAD_FLOODING">Điểm ngập úng</option>
                    <option value="OTHER">Hư hỏng kết cấu khác</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-700">Mức độ nguy hiểm thực tế *</label>
                  <select
                    value={actualSeverity}
                    onChange={(e) => setActualSeverity(e.target.value as Severity)}
                    className="w-full px-2.5 py-2 rounded-md bg-white border border-slate-300 font-medium text-slate-900 cursor-pointer"
                  >
                    <option value="CRITICAL">Khẩn cấp</option>
                    <option value="HIGH">Cao</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="LOW">Thấp</option>
                  </select>
                </div>
              </div>

              {/* Phân loại vật cản cụ thể khi là ROAD_OBSTACLE */}
              {confirmedCategory === 'ROAD_OBSTACLE' && (
                <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-900 block mb-1.5">
                    Phân loại vật cản cụ thể ngoài hiện trường:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'TREE', label: '🌲 Cây ngã / cành đổ', solutionIdx: 0, l: 4.5, w: 2.5, d: 40 },
                      { id: 'LANDSLIDE', label: '🪨 Đất đá sạt trượt', solutionIdx: 1, l: 8.0, w: 3.5, d: 25 },
                      { id: 'DEBRIS', label: '📦 Phế liệu / Hàng rơi', solutionIdx: 2, l: 3.0, w: 1.8, d: 30 },
                      { id: 'OIL_SPILL', label: '🛢️ Vệt dầu loang trượt', solutionIdx: 3, l: 15.0, w: 2.0, d: 2 },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setObstacleSubType(item.id as any);
                          setProposedSolution(SOLUTION_PRESETS.ROAD_OBSTACLE[item.solutionIdx]);
                          setEstimatedLengthM(item.l);
                          setEstimatedWidthM(item.w);
                          setEstimatedDepthCm(item.d);
                        }}
                        className={`px-2 py-1.5 rounded text-xs font-medium border text-center transition-colors cursor-pointer truncate ${
                          obstacleSubType === item.id
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Đo đạc kích thước thực tế */}
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-2">{getCategoryDetails().title}</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">{getCategoryDetails().lLabel}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedLengthM}
                      onChange={(e) => setEstimatedLengthM(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-medium text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">{getCategoryDetails().wLabel}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedWidthM}
                      onChange={(e) => setEstimatedWidthM(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-medium text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">{getCategoryDetails().dLabel}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={estimatedDepthCm}
                      onChange={(e) => setEstimatedDepthCm(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-medium text-slate-900"
                    />
                  </div>
                </div>

                {/* Tự động tính toán diện tích & khối lượng vật tư dự toán */}
                {estimatedLengthM > 0 && estimatedWidthM > 0 && (
                  <div className="mt-3 p-2.5 bg-blue-50/80 rounded-md border border-blue-200 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 mb-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-600" />
                      <span>Dự toán diện tích, khối lượng & phương án (BoQ Real-time):</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block truncate">{getCategoryDetails().card1Title}</span>
                        <span className="text-xs font-bold text-blue-700 font-mono">
                          {getCategoryDetails().card1Val}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{getCategoryDetails().card1Sub}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block truncate">{getCategoryDetails().card2Title}</span>
                        <span className="text-xs font-bold text-indigo-700 font-mono">
                          {getCategoryDetails().card2Val}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{getCategoryDetails().card2Sub}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block truncate">{getCategoryDetails().card3Title}</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          {getCategoryDetails().card3Val}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{getCategoryDetails().card3Sub}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 italic block mt-1.5 text-center">
                      {getCategoryDetails().formula}
                    </span>
                  </div>
                )}
              </div>

              {/* Đề xuất phương án */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Đề xuất phương án xử lý kỹ thuật *</label>
                  <span className={`text-[10px] font-mono ${proposedSolution.trim().length >= 10 ? 'text-emerald-600 font-semibold' : 'text-rose-500'}`}>
                    {proposedSolution.trim().length}/10 ký tự tối thiểu
                  </span>
                </div>

                {/* Gợi ý phương án nhanh 1-Click theo từng loại hư hỏng */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                    Gợi ý mẫu:
                  </span>
                  {(SOLUTION_PRESETS[confirmedCategory] || SOLUTION_PRESETS.POTHOLE).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProposedSolution(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 transition-colors truncate max-w-[240px] text-left cursor-pointer"
                      title={preset}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={proposedSolution}
                  required
                  minLength={10}
                  onChange={(e) => setProposedSolution(e.target.value)}
                  placeholder="Ghi rõ giải pháp kỹ thuật cụ thể..."
                  className={`w-full px-3 py-2 rounded-md bg-white border font-medium text-slate-900 ${
                    proposedSolution.trim().length > 0 && proposedSolution.trim().length < 10
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300'
                  }`}
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
