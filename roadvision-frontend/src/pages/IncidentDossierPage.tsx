import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { routingService, RouteResult } from '../services/routingService';
import { Incident, Team, Priority } from '../types';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { Timeline } from '../components/Timeline';
import { StatusBadge } from '../components/StatusBadge';
import { ImageCanvasWithBBox } from '../components/ImageCanvasWithBBox';
import { LeafletMap } from '../components/LeafletMap';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { useToast } from '../components/Toast';
import { ArrowLeft, CheckCircle2, Star, Hammer, ThumbsUp, AlertCircle, ShieldCheck, Eye, EyeOff, RotateCcw, AlertTriangle, ShieldAlert, Info, Clock, Compass, HardHat, Camera, FileCheck, X, Send, Ruler, Calendar, MapPin, Calculator, Globe, Navigation, Car, ChevronDown } from 'lucide-react';

const parseBoQFromEstimatedSize = (sizeStr?: string) => {
  if (!sizeStr) return null;
  const match = sizeStr.match(/([\d.]+)\s*m\s*[xX*]\s*([\d.]+)\s*m\s*[xX*]\s*([\d.]+)\s*cm/);
  if (match) {
    const l = parseFloat(match[1]);
    const w = parseFloat(match[2]);
    const d = parseFloat(match[3]);
    const area = l * w;
    const volume = area * (d / 100);
    const asphalt = volume * 2.4;
    return {
      length: l,
      width: w,
      depth: d,
      area: area.toFixed(2),
      volume: volume.toFixed(3),
      asphaltTons: asphalt.toFixed(2),
    };
  }
  return null;
};

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
  const [previewInspectionPhoto, setPreviewInspectionPhoto] = useState<string | null>(null);

  // Trạng thái Khiếu nại (Citizen) & Lệnh thi công lại (Admin)
  const [adminDecision, setAdminDecision] = useState<'APPROVE' | 'REWORK'>('APPROVE');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [reworkInstructions, setReworkInstructions] = useState<string>('');
  const [isSubmittingRework, setIsSubmittingRework] = useState<boolean>(false);
  const [showDefectBoxes, setShowDefectBoxes] = useState<boolean>(false);

  // Modals Điều phối & Từ chối dành cho Admin (Bỏ bước xác nhận trung gian)
  const [teams, setTeams] = useState<Team[]>([]);
  const [isAssignInspectionOpen, setIsAssignInspectionOpen] = useState<boolean>(false);
  const [isAssignConstructionOpen, setIsAssignConstructionOpen] = useState<boolean>(false);
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [isDispatchMenuOpen, setIsDispatchMenuOpen] = useState<boolean>(false);
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);
  const [routeDetails, setRouteDetails] = useState<Record<number, RouteResult>>({});
  const [showRouteMap, setShowRouteMap] = useState<boolean>(false);

  // Form giao khảo sát
  const [inspectionTeamId, setInspectionTeamId] = useState<number>(1);
  const [inspectionPriority, setInspectionPriority] = useState<Priority>('NORMAL');
  const [inspectionNotes, setInspectionNotes] = useState<string>('Khẩn trương đến hiện trường kiểm tra độ sụt lún và đo đạc kích thước thực tế.');

  // Form giao thi công
  const [constructionTeamId, setConstructionTeamId] = useState<number>(2);
  const [constructionPriority, setConstructionPriority] = useState<Priority>('HIGH');
  const [workPlan, setWorkPlan] = useState<string>('Tiến hành cào bóc, tưới nhựa dính bám và thảm bù BTN hoàn trả mặt đường an toàn.');
  const [plannedDeadline, setPlannedDeadline] = useState<string>('');
  const [isRejectInspectionOpen, setIsRejectInspectionOpen] = useState<boolean>(false);
  const [inspectionRevisionReason, setInspectionRevisionReason] = useState<string>('');
  const [isDelayModalOpen, setIsDelayModalOpen] = useState<boolean>(false);
  const [delayReasonInput, setDelayReasonInput] = useState<string>('');
  const [safetyNotes, setSafetyNotes] = useState<string>('Bố trí cọc tiêu, biển báo công trường và đèn chớp cảnh báo phương tiện.');

  // Xem lộ trình OSRM trên bản đồ mini trong Modal
  const [showRouteMapInspection, setShowRouteMapInspection] = useState<boolean>(false);
  const [showRouteMapConstruction, setShowRouteMapConstruction] = useState<boolean>(false);

  // Form từ chối
  const [rejectionReason, setRejectionReason] = useState<string>('');

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

  // Citizen / Admin đóng phiếu (RESOLVED -> CLOSED)
  const handleCloseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!incident) return;

    try {
      const res = await incidentApi.closeIncident(incident.id, feedbackComments ? { rating, comments: feedbackComments } : undefined);
      toast.success('Hồ sơ sự cố đã được chính thức đóng và lưu trữ (CLOSED).', 'Hoàn Tất');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi đóng sự cố', 'Lỗi');
    }
  };

  // Citizen gửi đánh giá độc lập sau khi sự cố hoàn thành/đóng
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;

    try {
      const res = await incidentApi.submitFeedback(incident.id, { rating, comments: feedbackComments });
      toast.success('Cảm ơn bạn đã gửi đánh giá chất lượng phục vụ!', 'Đánh Giá Thành Công');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi gửi đánh giá', 'Lỗi');
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
    if (!reworkInstructions || reworkInstructions.trim().length < 10) {
      toast.warning('Chỉ đạo yêu cầu thi công lại phải chi tiết tối thiểu 10 ký tự để tổ đội khắc phục!');
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

  // Admin duyệt nghiệm thu (chuyển PENDING_INSPECTION -> RESOLVED)
  const handleApproveInspection = async () => {
    if (!incident) return;
    try {
      const res = await incidentApi.approveInspection(incident.id, { notes: feedbackComments });
      toast.success('Đã phê duyệt nghiệm thu mặt đường đạt chuẩn!', 'Nghiệm Thu Thành Công');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi phê duyệt nghiệm thu', 'Lỗi');
    }
  };

  // Helper tính cự ly địa lý (Haversine Formula - Đơn vị: km)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const getEstimatedTravelMinutes = (distanceKm: number): number => {
    return Math.max(5, Math.round((distanceKm / 22) * 60) + 3);
  };

  const checkZoneMatch = (
    incidentAddress?: string,
    teamZone?: string,
    teamCorridor?: string
  ): { isMatch: boolean; districtLabel: string } => {
    if (!incidentAddress) {
      return { isMatch: false, districtLabel: 'Chưa rõ địa bàn' };
    }
    const addr = incidentAddress.toLowerCase();

    if (teamZone && (teamZone.toLowerCase().includes('khẩn cấp') || teamZone.toLowerCase().includes('toàn thành phố') || teamZone.toLowerCase().includes('24/7'))) {
      return { isMatch: true, districtLabel: 'Toàn TP Hà Nội (Khẩn cấp 24/7)' };
    }

    const districts = [
      { key: 'cầu giấy', name: 'Quận Cầu Giấy' },
      { key: 'đống đa', name: 'Quận Đống Đa' },
      { key: 'thanh xuân', name: 'Quận Thanh Xuân' },
      { key: 'ba đình', name: 'Quận Ba Đình' },
      { key: 'hoàn kiếm', name: 'Quận Hoàn Kiếm' },
      { key: 'hai bà trưng', name: 'Quận Hai Bà Trưng' },
      { key: 'tây hồ', name: 'Quận Tây Hồ' },
      { key: 'hà đông', name: 'Quận Hà Đông' },
      { key: 'nam từ liêm', name: 'Quận Nam Từ Liêm' },
      { key: 'bắc từ liêm', name: 'Quận Bắc Từ Liêm' },
      { key: 'hoàng mai', name: 'Quận Hoàng Mai' },
      { key: 'long biên', name: 'Quận Long Biên' },
    ];

    if (teamCorridor) {
      const corridors = teamCorridor.toLowerCase().split(/[&,+/()]/).map((s) => s.trim()).filter((s) => s.length > 3);
      for (const c of corridors) {
        if (c && addr.includes(c)) {
          return { isMatch: true, districtLabel: 'Cùng tuyến đường phụ trách' };
        }
      }
    }

    if (teamZone) {
      const zone = teamZone.toLowerCase();
      for (const d of districts) {
        if (zone.includes(d.key) && addr.includes(d.key)) {
          return { isMatch: true, districtLabel: d.name };
        }
      }
    }

    let teamDistrict = 'Quận khác';
    if (teamZone) {
      for (const d of districts) {
        if (teamZone.toLowerCase().includes(d.key)) {
          teamDistrict = d.name;
          break;
        }
      }
    }

    return { isMatch: false, districtLabel: teamDistrict };
  };

  // Helper lấy tọa độ sự cố (có fallback tâm quận Hà Nội nếu chưa có GPS)
  const getIncidentCoordinates = (inc: Incident | null): { lat: number; lon: number } => {
    let lat = inc?.latitude;
    let lon = inc?.longitude;

    if ((!lat || !lon) && inc?.address) {
      const addr = inc.address.toLowerCase();
      if (addr.includes('cầu giấy')) { lat = 21.0333; lon = 105.7939; }
      else if (addr.includes('đống đa')) { lat = 21.0181; lon = 105.8272; }
      else if (addr.includes('thanh xuân')) { lat = 20.9980; lon = 105.8083; }
      else if (addr.includes('ba đình')) { lat = 21.0341; lon = 105.8239; }
      else { lat = 21.0285; lon = 105.8048; }
    }
    return { lat: lat || 21.0285, lon: lon || 105.8048 };
  };

  const getTeamCoordinates = (team: Team): { lat: number; lon: number } => {
    let baseLat = team.baseLatitude;
    let baseLon = team.baseLongitude;
    if (!baseLat || !baseLon) {
      const zone = (team.zoneName || '').toLowerCase();
      if (zone.includes('cầu giấy')) { baseLat = 21.0333; baseLon = 105.7939; }
      else if (zone.includes('đống đa')) { baseLat = 21.0181; baseLon = 105.8272; }
      else if (zone.includes('thanh xuân')) { baseLat = 20.9980; baseLon = 105.8083; }
      else if (zone.includes('ba đình')) { baseLat = 21.0341; baseLon = 105.8239; }
      else { baseLat = 21.0022; baseLon = 105.7895; }
    }
    return { lat: baseLat, lon: baseLon };
  };

  const fetchDrivingRoutes = (candidateTeams: Team[], inc: Incident | null) => {
    if (!inc) return;
    const incPos = getIncidentCoordinates(inc);

    candidateTeams.forEach((team) => {
      const teamPos = getTeamCoordinates(team);
      routingService.getRoute(teamPos.lat, teamPos.lon, incPos.lat, incPos.lon).then((route) => {
        setRouteDetails((prev) => ({
          ...prev,
          [team.id]: route,
        }));
      }).catch(() => {});
    });
  };

  const getTeamDistanceAndEta = (team: Team, inc: Incident | null) => {
    const incPos = getIncidentCoordinates(inc);
    const teamPos = getTeamCoordinates(team);

    const cachedRoute = routeDetails[team.id];
    const distKm = cachedRoute
      ? cachedRoute.distanceKm
      : calculateDistanceKm(incPos.lat, incPos.lon, teamPos.lat, teamPos.lon);

    const etaMinutes = cachedRoute
      ? cachedRoute.durationMinutes
      : getEstimatedTravelMinutes(distKm);

    const isDrivingRoute = cachedRoute?.isDrivingRoute ?? false;
    const polyline = cachedRoute?.polylineCoordinates;
    const zoneResult = checkZoneMatch(inc?.address, team.zoneName, team.corridor);

    // Thuật toán chấm điểm phù hợp chuẩn hóa (Thang 100 điểm, giới hạn nghiêm ngặt [10, 100]):
    // - Điểm cơ sở: 80 điểm (bảo đảm điểm luôn dương và không bị vượt trần 100)
    // - Cùng địa bàn phụ trách: +20 điểm (ưu tiên hành chính tương đương ~2.5 km cự ly)
    // - Trạng thái rảnh việc (0 việc): +10 điểm (ưu tiên phân bổ đều việc)
    // - Cự ly đường bộ OSRM: -8 điểm / km (yếu tố cơ động đô thị)
    // - Số lượng việc dở dang: -10 điểm / việc
    // - Phạt quá tải (>= 3 việc): -20 điểm
    const tasks = team.activeTaskCount || 0;
    const isMatch = zoneResult.isMatch ? 1 : 0;
    const isAvailable = tasks === 0 ? 1 : 0;
    const overloadPenalty = tasks >= 3 ? 20 : 0;

    const baseScore = 80;
    const rawScore = baseScore + (isMatch * 20) + (isAvailable * 10) - (distKm * 8) - (tasks * 10) - overloadPenalty;
    const score = Math.min(100, Math.max(10, Math.round(rawScore)));

    return { distKm, etaMinutes, zoneResult, isDrivingRoute, polyline, teamPos, incPos, score };
  };

  // Helper sắp xếp tổ đội thông minh theo điểm phù hợp (Từ cao xuống thấp)
  const getSortedTeamsForSelection = (candidateTeams: Team[], inc: Incident | null) => {
    return [...candidateTeams].sort((a, b) => {
      const infoA = getTeamDistanceAndEta(a, inc);
      const infoB = getTeamDistanceAndEta(b, inc);
      return infoB.score - infoA.score;
    });
  };

  const handleOpenAssignInspectionModal = () => {
    const candidates = teams.filter(t => t.teamType === 'INSPECTION' || t.teamType === 'EMERGENCY');
    const sorted = getSortedTeamsForSelection(candidates.length > 0 ? candidates : teams, incident);
    if (sorted.length > 0) {
      setInspectionTeamId(sorted[0].id);
    }
    const defPri: Priority = incident?.severity === 'CRITICAL' ? 'CRITICAL' : incident?.severity === 'HIGH' ? 'HIGH' : 'NORMAL';
    setInspectionPriority(defPri);
    fetchDrivingRoutes(candidates.length > 0 ? candidates : teams, incident);
    setIsAssignInspectionOpen(true);
  };

  const handleOpenAssignConstructionModal = () => {
    const candidates = teams.filter(t => t.teamType === 'CONSTRUCTION' || t.teamType === 'EMERGENCY');
    const sorted = getSortedTeamsForSelection(candidates.length > 0 ? candidates : teams, incident);
    if (sorted.length > 0) {
      setConstructionTeamId(sorted[0].id);
    }
    const defPri: Priority = incident?.severity === 'CRITICAL' ? 'CRITICAL' : incident?.severity === 'HIGH' ? 'HIGH' : 'NORMAL';
    setConstructionPriority(defPri);
    const slaHours = incident?.severity === 'CRITICAL' ? 4 : incident?.severity === 'HIGH' ? 24 : incident?.severity === 'MEDIUM' ? 72 : 168;
    const date = incident?.plannedDeadline
      ? new Date(incident.plannedDeadline)
      : new Date(Date.now() + slaHours * 3600 * 1000);
    setPlannedDeadline(date.toISOString().slice(0, 16));
    fetchDrivingRoutes(candidates.length > 0 ? candidates : teams, incident);
    setIsAssignConstructionOpen(true);
  };

  useEffect(() => {
    if (user?.role === 'ROLE_ADMIN') {
      incidentApi.getTeams().then((res) => {
        const teamList = res.data || [];
        setTeams(teamList);
        const candidates = teamList.filter((t: any) => t.teamType === 'INSPECTION' || t.teamType === 'EMERGENCY');
        const sorted = getSortedTeamsForSelection(candidates.length > 0 ? candidates : teamList, incident);
        if (sorted.length > 0) setInspectionTeamId(sorted[0].id);

        const constrCandidates = teamList.filter((t: any) => t.teamType === 'CONSTRUCTION' || t.teamType === 'EMERGENCY');
        const sortedConstr = getSortedTeamsForSelection(constrCandidates.length > 0 ? constrCandidates : teamList, incident);
        if (sortedConstr.length > 0) setConstructionTeamId(sortedConstr[0].id);
      }).catch(() => {});
    }
  }, [user, incident]);

  const handleAssignInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setIsSubmittingDispatch(true);
    try {
      await incidentApi.assignInspection(incident.id, {
        teamId: inspectionTeamId,
        priority: inspectionPriority,
        notes: inspectionNotes.trim(),
      });
      toast.success(`Đã giao nhiệm vụ khảo sát ${incident.ticketCode} cho Tổ Khảo sát!`, 'Giao việc thành công');
      setIsAssignInspectionOpen(false);
      fetchDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể giao khảo sát', 'Lỗi điều phối');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const handleAssignConstructionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    if (!constructionTeamId) {
      toast.warning('Vui lòng chọn Tổ Thi Công phụ trách!', 'Thiếu tổ đội');
      return;
    }
    if (!workPlan || workPlan.trim().length < 10) {
      toast.warning('Phương án thi công phải chi tiết tối thiểu 10 ký tự!', 'Phương án chưa đủ chi tiết');
      return;
    }
    if (plannedDeadline) {
      const deadlineDate = new Date(plannedDeadline);
      if (deadlineDate <= new Date()) {
        toast.warning('Hạn hoàn thành thi công (Deadline) phải ở thời điểm tương lai!', 'Hạn hoàn thành không hợp lệ');
        return;
      }
    }
    setIsSubmittingDispatch(true);
    try {
      await incidentApi.assignConstruction(incident.id, {
        teamId: constructionTeamId,
        priority: constructionPriority,
        workPlan: workPlan.trim(),
        plannedDeadline: plannedDeadline ? new Date(plannedDeadline).toISOString() : undefined,
        safetyNotes: safetyNotes ? safetyNotes.trim() : undefined,
      });
      toast.success(`Đã giao nhiệm vụ thi công ${incident.ticketCode} cho Tổ Thi công!`, 'Giao việc thành công');
      setIsAssignConstructionOpen(false);
      fetchDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể giao thi công', 'Lỗi điều phối');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.warning('Lý do từ chối phản ánh phải cụ thể tối thiểu 10 ký tự!', 'Lý do chưa đủ');
      return;
    }
    setIsSubmittingDispatch(true);
    try {
      await incidentApi.rejectIncident(incident.id, { rejectionReason: rejectionReason.trim() });
      toast.warning(`Đã từ chối tiếp nhận sự cố ${incident.ticketCode}`, 'Từ chối tiếp nhận');
      setIsRejectOpen(false);
      fetchDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Không thể từ chối sự cố', 'Lỗi');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Admin thẩm định xác nhận sự cố hợp lệ (chuyển AI_ANALYZED -> VERIFIED)
  const handleRejectInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    if (!inspectionRevisionReason || inspectionRevisionReason.trim().length < 10) {
      toast.warning('Lý do yêu cầu khảo sát lại / bổ sung phương án phải chi tiết tối thiểu 10 ký tự!', 'Lý do chưa đủ');
      return;
    }
    setIsSubmittingDispatch(true);
    try {
      await incidentApi.rejectInspectionReport(incident.id, { reason: inspectionRevisionReason.trim() });
      toast.warning(`Đã yêu cầu tổ khảo sát đo đạc / bổ sung lại phương án cho ${incident.ticketCode}`, 'Yêu cầu khảo sát lại');
      setIsRejectInspectionOpen(false);
      setInspectionRevisionReason('');
      fetchDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi yêu cầu khảo sát lại', 'Lỗi');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const handleDelaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    if (!delayReasonInput || delayReasonInput.trim().length < 10) {
      toast.warning('Lý do giải trình chậm tiến độ phải chi tiết tối thiểu 10 ký tự!', 'Lý do chưa đủ');
      return;
    }
    try {
      await incidentApi.reportDelayReason(incident.id, { delayReason: delayReasonInput.trim() });
      toast.success('Đã gửi báo cáo giải trình chậm tiến độ cho Ban Quản lý!', 'Báo cáo chậm tiến độ');
      setIsDelayModalOpen(false);
      setDelayReasonInput('');
      fetchDossier();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi gửi báo cáo giải trình', 'Lỗi');
    }
  };

  const handleVerifyIncident = async () => {
    if (!incident) return;
    try {
      const res = await incidentApi.verifyIncident(incident.id);
      toast.success('Đã thẩm định và xác nhận sự cố hợp lệ!', 'Xác nhận hồ sơ');
      setIncident(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi xác nhận sự cố', 'Lỗi');
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
          Mã phản ánh: {incident.ticketCode?.startsWith('#') ? incident.ticketCode : `#${incident.ticketCode}`}
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

        {/* Nút & Huy Hiệu Đồng Tình (Upvote) & Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* GIAI ĐOẠN 2 & 3: SUBMITTED / AI_ANALYZED / VERIFIED -> Admin Điều phối linh hoạt (Khảo sát hoặc Thi công trực tiếp) hoặc Từ Chối */}
          {user?.role === 'ROLE_ADMIN' && ['SUBMITTED', 'AI_ANALYZED', 'VERIFIED'].includes(incident.status) && (
            <>
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setIsDispatchMenuOpen(!isDispatchMenuOpen)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Chọn phương án điều phối công việc"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Điều phối xử lý</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isDispatchMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDispatchMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsDispatchMenuOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Chọn luồng xử lý sự cố
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDispatchMenuOpen(false);
                          handleOpenAssignInspectionModal();
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-start gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">1. Giao tổ khảo sát</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">Xác minh hiện trường & đo đạc kỹ thuật</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDispatchMenuOpen(false);
                          handleOpenAssignConstructionModal();
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-start gap-2.5 transition-colors cursor-pointer group border-t border-slate-100"
                      >
                        <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <HardHat className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 flex items-center gap-1.5">
                            <span>2. Giao thi công trực tiếp</span>
                            {incident.severity === 'CRITICAL' && (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">Khẩn</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">Bỏ qua khảo sát, thi công ngay</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsRejectOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Từ chối tiếp nhận nếu là ảnh rác/spam"
              >
                <X className="w-3.5 h-3.5" />
                <span>Từ chối</span>
              </button>
            </>
          )}

          {/* GIAI ĐOẠN 4: Đang trong quá trình khảo sát */}
          {user?.role === 'ROLE_ADMIN' && ['INSPECTION_ASSIGNED', 'INSPECTING'].includes(incident.status) && (
            <div className="px-2.5 py-1.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Đang khảo sát hiện trường</span>
            </div>
          )}

          {/* GIAI ĐOẠN 5: Đã khảo sát xong (INSPECTED) -> Admin duyệt kết quả và Giao thi công */}
          {user?.role === 'ROLE_ADMIN' && incident.status === 'INSPECTED' && (
            <>
              <button
                onClick={handleOpenAssignConstructionModal}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Duyệt phương án kỹ thuật và Giao Tổ Thi Công (Giai đoạn 5)"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Duyệt & Giao Thi công</span>
              </button>

              <button
                onClick={() => setIsRejectInspectionOpen(true)}
                className="px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Từ chối phương án khảo sát, yêu cầu đo đạc lại hoặc bổ sung số liệu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yêu cầu khảo sát lại</span>
              </button>
            </>
          )}

          {/* GIAI ĐOẠN 6: Đang trong quá trình thi công */}
          {user?.role === 'ROLE_ADMIN' && ['ASSIGNED', 'IN_PROGRESS'].includes(incident.status) && (
            <div className="px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5" />
              <span>Đang thi công sửa chữa</span>
            </div>
          )}
          {user?.role === 'ROLE_ADMIN' && (incident.status === 'PENDING_ACCEPTANCE' || incident.status === 'PENDING_INSPECTION') && (
            <button
              onClick={handleApproveInspection}
              className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Duyệt nghiệm thu (RESOLVED)</span>
            </button>
          )}
          {/* Nút Đồng tình chỉ hiển thị cho người dân (ROLE_CITIZEN) hoặc khách vãng lai, ẩn hoàn toàn đối với Quản trị viên và Kỹ thuật viên */}
          {user?.role !== 'ROLE_ADMIN' && user?.role !== 'ROLE_STAFF' && (
            <button
              onClick={handleUpvote}
              disabled={isUpvoting || incident.status === 'RESOLVED' || incident.status === 'CLOSED'}
              className="px-3.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
              title="Bấm đồng tình để tăng cấp độ khẩn cấp xử lý"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{incident.upvoteCount || 1} Đồng tình</span>
            </button>
          )}
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

            <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>Người báo cáo: <b className="text-slate-900 font-sans">{incident.reporterName || 'Ẩn danh'}</b></span>
                {incident.reporterReputationScore !== undefined && incident.reporterReputationScore !== null && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Điểm uy tín công dân theo hệ thống Gamification">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    {incident.reporterReputationScore} điểm uy tín
                  </span>
                )}
              </div>
              <span>SĐT: {incident.reporterPhone || 'Chưa cung cấp'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GIAI ĐOẠN 4: BIÊN BẢN KHẢO SÁT HIỆN TRƯỜNG & ĐO ĐẠC THỰC ĐỊA */}
      {(incident.inspection || ['INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'PENDING_INSPECTION', 'RESOLVED', 'CLOSED'].includes(incident.status)) && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Giai đoạn 4: Biên bản Khảo sát hiện trường & Đo đạc thực tế
                  </h3>
                  {incident.inspection?.version && (
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      Phiên bản #{incident.inspection.version}
                    </span>
                  )}
                  {incident.inspection?.inspectionStatus === 'REVISE_REQUESTED' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                      Yêu cầu khảo sát lại / Bổ sung
                    </span>
                  ) : incident.inspection?.inspectionStatus === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Đã duyệt phương án
                    </span>
                  ) : incident.inspection ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Đã nộp biên bản
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
                      Đang khảo sát hiện trường
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đơn vị khảo sát: <span className="font-medium text-slate-700">{incident.inspection?.inspectionTeamName || incident.inspectionTeamName || 'Tổ Khảo Sát Hiện Trường'}</span>
                  {incident.inspection?.inspectorName && (
                    <span> • Cán bộ: <span className="font-medium text-slate-700">{incident.inspection.inspectorName}</span></span>
                  )}
                  {incident.inspection?.inspectedAt && (
                    <span> • Thời gian: <span className="font-mono text-slate-600">{new Date(incident.inspection.inspectedAt).toLocaleString('vi-VN')}</span></span>
                  )}
                </p>
              </div>
            </div>

            {incident.status === 'INSPECTED' && user?.role === 'ROLE_ADMIN' && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Số liệu sẵn sàng để Giao thi công</span>
              </span>
            )}
          </div>

          {/* Cảnh báo nếu Ban Quản lý đã yêu cầu khảo sát lại / bổ sung số liệu */}
          {(incident.inspection?.inspectionStatus === 'REVISE_REQUESTED' || (incident.rejectionReason && incident.status === 'INSPECTING')) && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold text-amber-900">Ban Quản lý yêu cầu đo đạc lại hoặc bổ sung phương án:</strong>
                <p className="mt-1 italic font-medium text-amber-900">"{incident.inspection?.revisionReason || incident.rejectionReason}"</p>
                <div className="text-[11px] text-amber-700 mt-1">
                  Tổ khảo sát vui lòng kiểm tra lại hiện trường, cập nhật số liệu kích thước chính xác và nộp lại biên bản hoàn chỉnh.
                </div>
              </div>
            </div>
          )}

          {incident.inspection ? (
            <div className="flex flex-col gap-4">
              {/* 4 Thẻ chỉ số kỹ thuật */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Kích thước đo đạc */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Ruler className="w-3.5 h-3.5" />
                    </div>
                    <span>Kích thước (D × R × S)</span>
                  </div>

                  <div>
                    {(() => {
                      const raw = incident.inspection.estimatedSize || '1.2m x 0.8m x 6cm';

                      // Trường hợp 1: Có sẵn phân tách " - " (như Điểm ngập úng hoặc báo cáo mở rộng)
                      if (raw.includes(' - ')) {
                        const [dim, extra] = raw.split(' - ');
                        const cleanDim = dim.replace(/\s*[xX*]\s*/g, ' × ');
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs sm:text-sm font-bold text-blue-900 leading-snug">
                              {cleanDim}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {extra.split(',').map((part, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/70 text-blue-800 font-mono text-[10px] font-semibold">
                                  {part.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Trường hợp 2: Kích thước tiêu chuẩn D x R x S (ví dụ: 1.2m x 0.8m x 6cm)
                      const boq = parseBoQFromEstimatedSize(raw);
                      if (boq) {
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs sm:text-sm font-bold text-blue-900 leading-snug">
                              {boq.length}m × {boq.width}m × {boq.depth}cm
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/70 text-blue-800 font-mono text-[10px] font-semibold">
                                S = {boq.area} m²
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200/70 text-indigo-800 font-mono text-[10px] font-semibold">
                                V = {boq.volume} m³
                              </span>
                              {Number(boq.asphaltTons) > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/70 text-amber-800 font-mono text-[10px] font-semibold">
                                  ~{boq.asphaltTons} tấn BTN
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Trường hợp 3: Chuỗi kích thước tự do khác (chuẩn hóa dấu nhân x -> ×)
                      return (
                        <span className="font-mono text-sm font-bold text-blue-900">
                          {raw.replace(/\s*[xX*]\s*/g, ' × ')}
                        </span>
                      );
                    })()}
                  </div>

                  <span className="text-[10px] text-slate-500">Số đo thực tế tại lòng đường</span>
                </div>

                {/* 2. Phân loại & Mức độ */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>Xác nhận hiện trường</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap my-0.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {incident.inspection.confirmedCategory === 'POTHOLE' && 'Ổ gà'}
                      {incident.inspection.confirmedCategory === 'ROAD_CRACK' && 'Vết nứt mặt đường'}
                      {incident.inspection.confirmedCategory === 'ROAD_FLOODING' && 'Điểm ngập úng'}
                      {incident.inspection.confirmedCategory === 'ROAD_OBSTACLE' && 'Chướng ngại vật'}
                      {incident.inspection.confirmedCategory === 'COMPLEX_DAMAGE' && 'Đa sự cố'}
                      {!['POTHOLE', 'ROAD_CRACK', 'ROAD_FLOODING', 'ROAD_OBSTACLE', 'COMPLEX_DAMAGE'].includes(incident.inspection.confirmedCategory || '') && (incident.inspection.confirmedCategory || incident.category)}
                    </span>

                    {(() => {
                      const sev = incident.inspection.actualSeverity || incident.severity;
                      const sevMap: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
                        CRITICAL: { label: 'Khẩn cấp', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500 animate-pulse' },
                        HIGH: { label: 'Nghiêm trọng', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
                        MEDIUM: { label: 'Trung bình', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
                        LOW: { label: 'Mức độ nhẹ', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                      };
                      const c = sevMap[sev] || { label: sev || 'Bình thường', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
                      return (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          {c.label}
                        </span>
                      );
                    })()}
                  </div>

                  <span className="text-[10px] text-slate-500">Đối chiếu và kiểm chứng AI</span>
                </div>

                {/* 3. Mức độ ảnh hưởng giao thông */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-200 transition-all flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <span>Ảnh hưởng giao thông</span>
                  </div>

                  <div className="my-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs sm:text-sm font-bold ${
                      incident.inspection.trafficImpact === 'CRITICAL' ? 'text-rose-700' :
                      incident.inspection.trafficImpact === 'HIGH' ? 'text-amber-700' : 'text-slate-800'
                    }`}>
                      {incident.inspection.trafficImpact === 'CRITICAL' ? 'Nguy hiểm cao' :
                       incident.inspection.trafficImpact === 'HIGH' ? 'Ùn tắc / Nguy hiểm' :
                       incident.inspection.trafficImpact === 'MEDIUM' ? 'Ảnh hưởng vừa' : 'Ít ảnh hưởng'}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500">Cơ sở ưu tiên vật tư</span>
                </div>

                {/* 4. Tọa độ thực địa & Độ chính xác */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-all flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span>Tọa độ thực địa</span>
                  </div>

                  <div className="my-0.5">
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                      {incident.inspection.actualLatitude ? `${Number(incident.inspection.actualLatitude).toFixed(4)}, ${Number(incident.inspection.actualLongitude).toFixed(4)}` : `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500">
                    Sai số GPS: ±{incident.inspection.gpsAccuracy || incident.gpsAccuracy || 3.5}m
                  </span>
                </div>
              </div>

              {/* Bảng tính diện tích & khối lượng vật tư tự động (BoQ) */}
              {(() => {
                const boq = parseBoQFromEstimatedSize(incident.inspection.estimatedSize);
                if (!boq) return null;
                return (
                  <div className="p-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 rounded-lg border border-blue-200/80 text-xs shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <span>Dự toán khối lượng & vật tư tự động từ biên bản khảo sát (BoQ Estimate):</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono bg-white/80 px-2 py-0.5 rounded border border-blue-100">
                        Kích thước: {boq.length}m (Dài) × {boq.width}m (Rộng) × {boq.depth}cm (Sâu)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                      {incident.category === 'ROAD_OBSTACLE' ? (
                        <>
                          <div className="bg-white p-2.5 rounded-md border border-blue-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Lòng đường chiếm dụng (S)</span>
                            <span className="text-sm font-bold text-blue-700 font-mono">{boq.area} m²</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">S = Dài × Rộng</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-indigo-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Khối lượng giải tỏa ước tính</span>
                            <span className="text-sm font-bold text-indigo-700 font-mono">{boq.volume} m³</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Cưa xẻ & Cẩu dọn</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Phương tiện cứu hộ</span>
                            <span className="text-sm font-bold text-emerald-700 font-mono">Cưa máy + Xe cẩu + Xe ben</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Giải tỏa & Dọn dẹp phế thải</span>
                          </div>
                        </>
                      ) : incident.category === 'ROAD_CRACK' ? (
                        <>
                          <div className="bg-white p-2.5 rounded-md border border-blue-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Chiều dài trám nứt (L)</span>
                            <span className="text-sm font-bold text-blue-700 font-mono">{boq.length} m dài</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Rãnh nứt cần rót matit</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-indigo-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Diện tích vùng rạn (S)</span>
                            <span className="text-sm font-bold text-indigo-700 font-mono">{boq.area} m²</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">S = Dài × Rộng</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Dự toán Matit Polyurethane</span>
                            <span className="text-sm font-bold text-emerald-700 font-mono">~ {(boq.length * 0.25).toFixed(1)} kg</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Định mức chèn khe TCVN</span>
                          </div>
                        </>
                      ) : incident.category === 'ROAD_FLOODING' ? (
                        <>
                          <div className="bg-white p-2.5 rounded-md border border-blue-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Diện tích ngập nước (S)</span>
                            <span className="text-sm font-bold text-blue-700 font-mono">{boq.area} m²</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">S = Dài × Rộng</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-indigo-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Lượng nước ứ đọng (V)</span>
                            <span className="text-sm font-bold text-indigo-700 font-mono">~ {boq.volume} m³</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">V = S × Mực nước sâu</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Biện pháp tiêu úng</span>
                            <span className="text-sm font-bold text-emerald-700 font-mono">Bơm dã chiến + Khơi cống</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Tiêu úng khẩn cấp</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-white p-2.5 rounded-md border border-blue-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Diện tích cào bóc (S)</span>
                            <span className="text-sm font-bold text-blue-700 font-mono">{boq.area} m²</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">S = Dài × Rộng</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-indigo-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Thể tích đào bù hoàn trả (V)</span>
                            <span className="text-sm font-bold text-indigo-700 font-mono">{boq.volume} m³</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">V = S × (Sâu / 100)</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-emerald-100 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block">Dự toán Bê tông nhựa nóng (BTN)</span>
                            <span className="text-sm font-bold text-emerald-700 font-mono">~ {boq.asphaltTons} tấn</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Dung trọng BTN γ ≈ 2.4 tấn/m³</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Giải pháp đề xuất & Ghi chú hiện trường */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-md bg-blue-50/60 border border-blue-100 flex flex-col gap-1">
                  <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-blue-700" />
                    Phương án kỹ thuật đề xuất từ Tổ Khảo sát:
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {incident.inspection.proposedSolution || 'Cào bóc lớp hư hỏng, tưới dính bám và thảm bù bê tông nhựa hoàn trả mặt đường.'}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col gap-1">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-600" />
                    Ghi chú hiện trường & Đánh giá an toàn:
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {incident.inspection.notes || 'Đã kiểm tra hiện trường, các phương tiện đi lại cần giảm tốc độ.'}
                  </p>
                </div>
              </div>

              {/* Thư viện ảnh khảo sát thực tế (Độc lập với ảnh người dân) */}
              {incident.inspection.inspectionPhotos && incident.inspection.inspectionPhotos.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-600" />
                      Ảnh chụp đo đạc và xác minh hiện trường của Tổ Khảo sát ({incident.inspection.inspectionPhotos.length} ảnh):
                    </span>
                    <span className="text-[10px] text-slate-500 italic">Lưu trữ riêng biệt với ảnh người dân ban đầu</span>
                  </div>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {incident.inspection.inspectionPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewInspectionPhoto(photo)}
                        className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer shadow-xs hover:border-blue-500 transition-colors"
                      >
                        <img src={photo} alt={`Khảo sát #${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px]">
                          #{idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-between text-xs text-sky-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600 shrink-0 animate-spin" />
                <span>Tổ khảo sát đang di chuyển đến hiện trường để tiến hành đo đạc kích thước thực tế và chụp ảnh đối chứng...</span>
              </div>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-sky-200 text-sky-700 font-medium">
                SẮP CÓ SỐ LIỆU
              </span>
            </div>
          )}
        </div>
      )}

      {/* GIAI ĐOẠN 5 & 6: KẾ HOẠCH & BIỆN PHÁP THI CÔNG SỬA CHỮA */}
      {(incident.assignedTeamName || incident.workPlan || ['ASSIGNED', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'PENDING_INSPECTION', 'RESOLVED', 'CLOSED'].includes(incident.status)) && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>Giai đoạn 5: Kế hoạch & Biện pháp thi công sửa chữa</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đã duyệt phương án
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đội thi công: <span className="font-medium text-slate-700">{incident.assignedTeamName || incident.assignment?.assignedToStaffName || 'Đội Thi Công Công Trình Giao Thông'}</span>
                  {incident.inspection?.approvedByAdminName && (
                    <span> • Người duyệt: <span className="font-medium text-slate-700">{incident.inspection.approvedByAdminName}</span></span>
                  )}
                </p>
              </div>
            </div>

            {/* Hạn chót thi công (Deadline) */}
            {incident.plannedDeadline && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${
                new Date() > new Date(incident.plannedDeadline) && ['ASSIGNED', 'IN_PROGRESS'].includes(incident.status)
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Hạn chót: <strong className="font-mono">{new Date(incident.plannedDeadline).toLocaleString('vi-VN')}</strong></span>
              </div>
            )}
          </div>

          {/* CẢNH BÁO QUÁ HẠN THI CÔNG (SLA OVERDUE) */}
          {incident.plannedDeadline && new Date() > new Date(incident.plannedDeadline) && ['ASSIGNED', 'IN_PROGRESS'].includes(incident.status) && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-xs text-rose-900 uppercase">Cảnh báo: Đã quá hạn hoàn thành thi công (SLA Overdue)</strong>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Hạn chót là <strong>{new Date(incident.plannedDeadline).toLocaleString('vi-VN')}</strong>. Công trình đang bị chậm tiến độ so với kế hoạch đã duyệt.
                  </p>
                </div>
              </div>
              {user?.role === 'ROLE_STAFF' && !incident.delayReason && (
                <button
                  type="button"
                  onClick={() => setIsDelayModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Báo cáo lý do chậm tiến độ</span>
                </button>
              )}
            </div>
          )}

          {/* HIỂN THỊ GIẢI TRÌNH CHẬM TIẾN ĐỘ NẾU CÓ */}
          {incident.delayReason && (
            <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5 text-slate-900">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Giải trình nguyên nhân chậm tiến độ từ Đội thi công:
                </span>
                <span className="font-mono text-[10px] text-slate-500">Đã gửi Ban Quản lý</span>
              </div>
              <p className="italic text-slate-700 font-medium">"{incident.delayReason}"</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* Phương án thi công */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5 text-emerald-600" />
                Kế hoạch & Biện pháp kỹ thuật thi công:
              </span>
              <p className="text-slate-700 leading-relaxed">
                {incident.workPlan || 'Tiến hành cào bóc phạm vi hư hỏng, vệ sinh lòng hố, tưới nhũ tương dính bám và thảm bù bê tông nhựa hạt mịn hoàn trả êm thuận kết cấu áo đường.'}
              </p>
            </div>

            {/* Phương án an toàn lao động & rào chắn */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Biện pháp an toàn & Điều tiết giao thông:
              </span>
              <p className="text-slate-700 leading-relaxed">
                {incident.safetyNotes || 'Bố trí đầy đủ cọc tiêu chóp nón, biển báo hiệu công trường từ cự ly 50m, mặc áo phản quang và bố trí nhân viên hướng dẫn phân luồng phương tiện.'}
              </p>
            </div>
          </div>
        </div>
      )}

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
                  {Boolean(incident.reworkCount && incident.reworkCount > 0) && (
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
                    {Boolean(incident.reworkCount && incident.reworkCount > 0) && (
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

        {/* Người dân (Citizen) & Quản trị viên đối chiếu ảnh Trước/Sau & Đóng sự cố hoặc Khiếu nại */}
        {['PENDING_INSPECTION', 'PENDING_ACCEPTANCE', 'RESOLVED'].includes(incident.status) && incident.resolution && (
          <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {incident.status === 'PENDING_INSPECTION' && (
              <div className="p-3.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-xs uppercase tracking-wide text-purple-800">
                    Hồ sơ đang chờ Ban Quản trị nghiệm thu hiện trường
                  </div>
                  <p className="text-xs text-purple-900 mt-1">
                    Kỹ thuật viên đã nộp ảnh bằng chứng thi công. AI đã đối chiếu sơ bộ và đưa ra đánh giá bên dưới. Quản trị viên vui lòng xác nhận đạt chuẩn hoặc chỉ đạo khắc phục lại.
                  </p>
                </div>
              </div>
            )}
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
                            Mặt đường hoàn trả đạt chuẩn kỹ thuật.
                          </span>
                          <div className="flex items-center gap-2">
                            {incident.status === 'PENDING_INSPECTION' && (
                              <button
                                type="button"
                                onClick={handleApproveInspection}
                                className="px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span>Phê duyệt nghiệm thu (RESOLVED)</span>
                              </button>
                            )}
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Xác nhận đóng sự cố (CLOSED)</span>
                            </button>
                          </div>
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
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-700">
                              Chỉ đạo thi công khắc phục cho kỹ thuật viên: *
                            </label>
                            <span className={`text-[10px] font-mono ${reworkInstructions.trim().length >= 10 ? 'text-emerald-600 font-semibold' : 'text-rose-500'}`}>
                              {reworkInstructions.trim().length}/10 ký tự tối thiểu
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={reworkInstructions}
                            onChange={(e) => setReworkInstructions(e.target.value)}
                            placeholder="Mô tả cụ thể các điểm chưa đạt cần xử lý lại dứt điểm..."
                            className={`w-full px-3 py-2 text-xs rounded-md bg-white border text-slate-900 focus:outline-none ${
                              reworkInstructions.trim().length > 0 && reworkInstructions.trim().length < 10
                                ? 'border-rose-400 focus:border-rose-500'
                                : 'border-slate-300 focus:border-blue-600'
                            }`}
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
                            <span>Mặt đường hoàn thiện đạt chuẩn. Bạn có thể đóng hồ sơ ngay hoặc gửi kèm đánh giá.</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {incident.status === 'RESOLVED' && (
                              <button
                                type="button"
                                onClick={() => handleCloseSubmit()}
                                className="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
                              >
                                Đóng hồ sơ (CLOSED)
                              </button>
                            )}
                            {incident.status === 'CLOSED' && (
                              <button
                                type="button"
                                onClick={handleFeedbackSubmit}
                                className="px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs transition-colors"
                              >
                                Gửi đánh giá dịch vụ
                              </button>
                            )}
                          </div>
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
          <div className="flex flex-col gap-4 bg-gradient-to-b from-emerald-50/20 via-white to-white p-5 rounded-lg border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đối chiếu tương tác Trước & Sau thi công (Đã nghiệm thu hoàn tất)
              </span>
              <div className="flex items-center gap-2">
                {incident.resolution?.staffName && (
                  <span className="text-xs font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    Kỹ thuật viên: {incident.resolution.staffName}
                  </span>
                )}
                {Boolean(incident.reworkCount && incident.reworkCount > 0) && (
                  <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    Đã khắc phục qua {incident.reworkCount} lần thi công lại
                  </span>
                )}
              </div>
            </div>

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
                className="min-h-[420px] w-full"
              />
            ) : (
              <div className="h-64 w-full rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center p-4">
                <img src={incident.imageUrl} alt="Hiện trường sự cố" className="max-h-full rounded object-contain" />
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sự cố đã được nghiệm thu & đóng lưu trữ thành công
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700">Đánh giá của công dân:</span>
                  <div className="inline-flex items-center text-amber-500">
                    {Array.from({ length: incident.feedback?.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="italic text-slate-600">"{incident.feedback?.comments || 'Mặt đường hoàn trả êm thuận, an toàn.'}"</span>
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1 rounded shadow-2xs">
                ✓ HOÀN TẤT VÒNG ĐỜI
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1. Modal Giao Khảo Sát Hiện Trường */}
      {isAssignInspectionOpen && incident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Giao nhiệm vụ khảo sát hiện trường</h3>
                  <span className="font-mono text-xs text-blue-700 font-medium">{incident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAssignInspectionOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const candidateTeams = getSortedTeamsForSelection(
                teams.filter((t) => t.teamType === 'INSPECTION' || t.teamType === 'EMERGENCY').length > 0
                  ? teams.filter((t) => t.teamType === 'INSPECTION' || t.teamType === 'EMERGENCY')
                  : teams,
                incident
              );
              const currentTeam = teams.find((t) => t.id === inspectionTeamId) || candidateTeams[0];
              const isZoneMatch = currentTeam ? checkZoneMatch(incident.address, currentTeam.zoneName, currentTeam.corridor).isMatch : false;
              const isBusy = (currentTeam?.activeTaskCount || 0) > 0;

              return (
                <form onSubmit={handleAssignInspectionSubmit} className="flex flex-col gap-3.5 text-xs overflow-y-auto pr-1 -mr-1">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-slate-900 text-sm">{incident.title}</span>
                    <span className="text-slate-600 line-clamp-1">📍 {incident.address || 'Không rõ địa chỉ'}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-semibold text-slate-800 text-xs">Chọn Tổ Khảo Sát tiếp nhận *</label>
                      <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{candidateTeams.length} tổ đội ứng viên</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                      {candidateTeams.map((team, idx) => {
                        const isSelected = inspectionTeamId === team.id;
                        const { distKm, etaMinutes, zoneResult, isDrivingRoute, score } = getTeamDistanceAndEta(team, incident);
                        const teamAvailable = (team.activeTaskCount || 0) === 0;
                        const teamOverloaded = (team.activeTaskCount || 0) >= 3;
                        const isBest = idx === 0;
                        const isRunnerUp = idx === 1;

                        return (
                          <div
                            key={team.id}
                            onClick={() => setInspectionTeamId(team.id)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500'
                                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isBest && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                                    <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    🏆 GỢI Ý SỐ 1
                                  </span>
                                )}
                                {isRunnerUp && !isBest && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                                    🥈 Gợi ý số 2
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full" title="Điểm phù hợp tổng hợp (Thang 100)">
                                  🎯 {score} điểm
                                </span>
                                {zoneResult.isMatch ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    <MapPin className="w-3 h-3 text-emerald-600" />
                                    Cùng địa bàn ({zoneResult.districtLabel})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                    <Globe className="w-3 h-3 text-slate-500" />
                                    Lân cận ({zoneResult.districtLabel} - Điều động chéo)
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                                  <Navigation className="w-3 h-3 text-blue-600" />
                                  {isDrivingRoute ? '🚗 Đường bộ: ' : '📍 '}Cách {distKm} km (~{etaMinutes} phút)
                                </span>
                              </div>

                              <div className="shrink-0">
                                {teamAvailable ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Sẵn sàng
                                  </span>
                                ) : teamOverloaded ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Quá tải ({team.activeTaskCount} việc)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Đang làm ({team.activeTaskCount} việc)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="font-bold text-sm text-slate-900 leading-snug">
                              {team.name}
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 gap-3">
                              <span className="truncate flex-1" title={team.baseAddress || team.zoneName}>
                                📍 Trụ sở: <span className="text-slate-700 font-medium">{team.baseAddress || team.zoneName || 'Hà Nội'}</span>
                              </span>
                              <span className="shrink-0 text-slate-600 font-medium">
                                👤 {team.leaderName || 'Chưa có tổ trưởng'} ({team.members?.length || 0} thành viên)
                              </span>
                            </div>

                            {team.currentActiveIncidentTicket && (
                              <div className="mt-2 text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Đang xử lý: <strong className="font-mono">{team.currentActiveIncidentTicket}</strong> ({team.currentActiveIncidentTitle || 'Nhiệm vụ trước'})</span>
                              </div>
                            )}

                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-800">
                                <span className="flex items-center gap-1 font-medium">
                                  <Car className="w-3.5 h-3.5 text-blue-600" />
                                  Lộ trình: <strong>{distKm} km</strong> qua mạng lưới giao thông Hà Nội
                                </span>
                                {isDrivingRoute && (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                                    OSRM Real-Route
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cảnh báo trạng thái & địa bàn */}
                  {isBusy && currentTeam && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Lưu ý: Tổ đội đang có {currentTeam.activeTaskCount} nhiệm vụ</div>
                        <div className="text-slate-700 mt-0.5">
                          Hệ thống vẫn cho phép điều phối. Sự cố sẽ tự động xếp vào <strong>hàng đợi công việc (Job Queue)</strong> của đội để thực hiện kế tiếp.
                        </div>
                      </div>
                    </div>
                  )}

                  {!isZoneMatch && currentTeam && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5 text-xs">
                      <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Điều động chi viện ngoại vùng</div>
                        <div className="text-blue-800 mt-0.5">
                          Tổ đội phụ trách <strong>{currentTeam.zoneName || 'Khu vực khác'}</strong>, sự cố tại <strong>{incident.address}</strong>. Bạn đang điều động chéo địa bàn.
                        </div>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const selectedRouteInfo = currentTeam ? getTeamDistanceAndEta(currentTeam, incident) : null;
                    if (!selectedRouteInfo) return null;
                    return (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRouteMapInspection(!showRouteMapInspection)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer w-fit"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          {showRouteMapInspection ? 'Ẩn bản đồ lộ trình di chuyển' : '🗺️ Xem lộ trình di chuyển OSRM trên bản đồ'}
                        </button>

                        {showRouteMapInspection && (
                          <div className="rounded-xl overflow-hidden border border-blue-200 shadow-xs">
                            <div className="bg-blue-50 px-3 py-1.5 text-xs text-blue-900 font-medium flex items-center justify-between border-b border-blue-200">
                              <span>🗺️ Tuyến đường OSRM: Trụ sở ➔ Hiện trường ({selectedRouteInfo.distKm} km)</span>
                              <span className="text-[11px] text-blue-700">~{selectedRouteInfo.etaMinutes} phút di chuyển</span>
                            </div>
                            <div className="h-44 w-full">
                              <LeafletMap
                                latitude={selectedRouteInfo.incPos.lat}
                                longitude={selectedRouteInfo.incPos.lon}
                                popupTitle={incident.title}
                                routePolyline={selectedRouteInfo.polyline}
                                routeOrigin={{
                                  lat: selectedRouteInfo.teamPos.lat,
                                  lon: selectedRouteInfo.teamPos.lon,
                                  title: currentTeam?.name || 'Trụ sở đội',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block font-semibold mb-1 text-slate-700">Mức độ ưu tiên</label>
                      <select
                        value={inspectionPriority}
                        onChange={(e) => setInspectionPriority(e.target.value as Priority)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
                      >
                        <option value="LOW">Thấp</option>
                        <option value="NORMAL">Bình thường</option>
                        <option value="HIGH">Cao</option>
                        <option value="CRITICAL">Khẩn cấp</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1 text-slate-700">Chỉ dẫn nhiệm vụ kỹ thuật</label>
                      <textarea
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent leading-relaxed"
                        placeholder="Yêu cầu đo đạc chiều dài, rộng, sâu và đề xuất giải pháp cào bóc hay thảm bù..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAssignInspectionOpen(false)}
                      className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors font-medium cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDispatch}
                      className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingDispatch ? 'Đang gửi...' : 'Xác nhận giao khảo sát'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. Modal Giao Thi Công Sửa Chữa */}
      {isAssignConstructionOpen && incident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Giao nhiệm vụ thi công sửa chữa</h3>
                  <span className="font-mono text-xs text-emerald-700 font-medium">{incident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAssignConstructionOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const candidateTeams = getSortedTeamsForSelection(
                teams.filter((t) => t.teamType === 'CONSTRUCTION' || t.teamType === 'EMERGENCY').length > 0
                  ? teams.filter((t) => t.teamType === 'CONSTRUCTION' || t.teamType === 'EMERGENCY')
                  : teams,
                incident
              );
              const currentTeam = teams.find((t) => t.id === constructionTeamId) || candidateTeams[0];
              const isZoneMatch = currentTeam ? checkZoneMatch(incident.address, currentTeam.zoneName, currentTeam.corridor).isMatch : false;
              const isBusy = (currentTeam?.activeTaskCount || 0) > 0;

              return (
                <form onSubmit={handleAssignConstructionSubmit} className="flex flex-col gap-3 text-xs overflow-y-auto pr-1 -mr-1">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-slate-900 text-sm">{incident.title}</span>
                    <span className="text-slate-600 line-clamp-1">📍 {incident.address || 'Không rõ địa chỉ'}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-semibold text-slate-800 text-xs">Chọn Tổ Thi Công chuyên trách *</label>
                      <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{candidateTeams.length} tổ đội ứng viên</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                      {candidateTeams.map((team, idx) => {
                        const isSelected = constructionTeamId === team.id;
                        const { distKm, etaMinutes, zoneResult, isDrivingRoute, score } = getTeamDistanceAndEta(team, incident);
                        const teamAvailable = (team.activeTaskCount || 0) === 0;
                        const teamOverloaded = (team.activeTaskCount || 0) >= 3;
                        const isBest = idx === 0;
                        const isRunnerUp = idx === 1;

                        return (
                          <div
                            key={team.id}
                            onClick={() => setConstructionTeamId(team.id)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-500'
                                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isBest && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                                    <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    🏆 GỢI Ý SỐ 1
                                  </span>
                                )}
                                {isRunnerUp && !isBest && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                                    🥈 Gợi ý số 2
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" title="Điểm phù hợp tổng hợp (Thang 100)">
                                  🎯 {score} điểm
                                </span>
                                {zoneResult.isMatch ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    <MapPin className="w-3 h-3 text-emerald-600" />
                                    Cùng địa bàn ({zoneResult.districtLabel})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                    <Globe className="w-3 h-3 text-slate-500" />
                                    Lân cận ({zoneResult.districtLabel} - Điều động chéo)
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <Navigation className="w-3 h-3 text-emerald-600" />
                                  {isDrivingRoute ? '🚗 Đường bộ: ' : '📍 '}Cách {distKm} km (~{etaMinutes} phút)
                                </span>
                              </div>

                              <div className="shrink-0">
                                {teamAvailable ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Sẵn sàng
                                  </span>
                                ) : teamOverloaded ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Quá tải ({team.activeTaskCount} việc)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Đang làm ({team.activeTaskCount} việc)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="font-bold text-sm text-slate-900 leading-snug">
                              {team.name}
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 gap-3">
                              <span className="truncate flex-1" title={team.baseAddress || team.zoneName}>
                                📍 Trụ sở: <span className="text-slate-700 font-medium">{team.baseAddress || team.zoneName || 'Hà Nội'}</span>
                              </span>
                              <span className="shrink-0 text-slate-600 font-medium">
                                👤 {team.leaderName || 'Chưa có tổ trưởng'} ({team.members?.length || 0} thành viên)
                              </span>
                            </div>

                            {team.currentActiveIncidentTicket && (
                              <div className="mt-2 text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Đang xử lý: <strong className="font-mono">{team.currentActiveIncidentTicket}</strong> ({team.currentActiveIncidentTitle || 'Nhiệm vụ trước'})</span>
                              </div>
                            )}

                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
                                <span className="flex items-center gap-1 font-medium">
                                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                                  Lộ trình: <strong>{distKm} km</strong> qua mạng lưới giao thông Hà Nội
                                </span>
                                {isDrivingRoute && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                                    OSRM Real-Route
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cảnh báo trạng thái & địa bàn */}
                  {isBusy && currentTeam && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Lưu ý: Tổ đội đang bận ({currentTeam.activeTaskCount} nhiệm vụ)</div>
                        <div className="text-slate-700 mt-0.5">
                          Hệ thống vẫn cho phép điều phối. Sự cố sẽ tự động xếp vào <strong>hàng đợi công việc (Job Queue)</strong> của đội để thực hiện kế tiếp.
                        </div>
                      </div>
                    </div>
                  )}

                  {!isZoneMatch && currentTeam && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5 text-xs">
                      <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Điều động chi viện ngoại vùng</div>
                        <div className="text-emerald-800 mt-0.5">
                          Tổ đội phụ trách <strong>{currentTeam.zoneName || 'Khu vực khác'}</strong>, sự cố tại <strong>{incident.address}</strong>. Bạn đang điều động chéo địa bàn.
                        </div>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const selectedRouteInfo = currentTeam ? getTeamDistanceAndEta(currentTeam, incident) : null;
                    if (!selectedRouteInfo) return null;
                    return (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRouteMapConstruction(!showRouteMapConstruction)}
                          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-emerald-200 hover:bg-emerald-50/50 transition-colors cursor-pointer w-fit"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {showRouteMapConstruction ? 'Ẩn bản đồ lộ trình di chuyển' : '🗺️ Xem lộ trình di chuyển OSRM trên bản đồ'}
                        </button>

                        {showRouteMapConstruction && (
                          <div className="rounded-xl overflow-hidden border border-emerald-200 shadow-xs">
                            <div className="bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 font-medium flex items-center justify-between border-b border-emerald-200">
                              <span>🗺️ Tuyến đường OSRM: Trụ sở ➔ Hiện trường ({selectedRouteInfo.distKm} km)</span>
                              <span className="text-[11px] text-emerald-700">~{selectedRouteInfo.etaMinutes} phút di chuyển</span>
                            </div>
                            <div className="h-44 w-full">
                              <LeafletMap
                                latitude={selectedRouteInfo.incPos.lat}
                                longitude={selectedRouteInfo.incPos.lon}
                                popupTitle={incident.title}
                                routePolyline={selectedRouteInfo.polyline}
                                routeOrigin={{
                                  lat: selectedRouteInfo.teamPos.lat,
                                  lon: selectedRouteInfo.teamPos.lon,
                                  title: currentTeam?.name || 'Trụ sở đội',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700">Mức độ ưu tiên</label>
                      <select
                        value={constructionPriority}
                        onChange={(e) => setConstructionPriority(e.target.value as Priority)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent cursor-pointer"
                      >
                        <option value="LOW">Thấp</option>
                        <option value="NORMAL">Bình thường</option>
                        <option value="HIGH">Cao</option>
                        <option value="CRITICAL">Khẩn cấp</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700">Hạn hoàn thành (Deadline) *</label>
                      <input
                        type="datetime-local"
                        value={plannedDeadline}
                        onChange={(e) => setPlannedDeadline(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Phương án thi công sửa chữa * (Tối thiểu 10 ký tự)</label>
                    <textarea
                      value={workPlan}
                      onChange={(e) => setWorkPlan(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent leading-relaxed"
                      placeholder="Ghi rõ biện pháp thi công, cào bóc, tưới nhũ tương, thảm bù BTN C12.5..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Yêu cầu an toàn & phân luồng giao thông</label>
                    <textarea
                      value={safetyNotes}
                      onChange={(e) => setSafetyNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent leading-relaxed"
                      placeholder="Đặt cọc tiêu chóp nón, biển báo công trường, người điều tiết giao thông..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAssignConstructionOpen(false)}
                      className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors font-medium cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDispatch}
                      className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <HardHat className="w-4 h-4" />
                      <span>{isSubmittingDispatch ? 'Đang gửi...' : 'Xác nhận giao thi công'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. Modal Từ Chối Tiếp Nhận */}
      {isRejectOpen && incident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-rose-700">Từ chối tiếp nhận phản ánh</h3>
                  <span className="font-mono text-xs text-slate-500">{incident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsRejectOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-rose-50/60 rounded-md border border-rose-200 text-rose-900 text-xs">
                ⚠️ Lý do từ chối sẽ được thông báo trực tiếp đến tài khoản người dân. Người gửi tin giả hoặc spam liên tục có thể bị trừ điểm uy tín.
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Lý do từ chối cụ thể * (Tối thiểu 10 ký tự)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent leading-relaxed"
                  placeholder="Ví dụ: Ảnh chụp quá mờ không xác định được hiện trường, hoặc vị trí thuộc đường nội bộ dân cư không thuộc quyền quản lý..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispatch}
                  className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isSubmittingDispatch ? 'Đang từ chối...' : 'Xác nhận từ chối'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Admin Yêu Cầu Khảo Sát Lại / Bổ Sung Số Liệu */}
      {isRejectInspectionOpen && incident && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full p-5 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <RotateCcw className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Yêu cầu khảo sát lại / Bổ sung phương án</h3>
              </div>
              <button
                onClick={() => setIsRejectInspectionOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectInspectionSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-amber-900 text-xs">
                Ý kiến chỉ đạo này sẽ được gửi trực tiếp qua chuông thông báo đến Tổ Khảo sát. Trạng thái sự cố sẽ chuyển về <b>INSPECTING</b> để tổ đội tiến hành đo đạc lại hoặc lập phương án điều chỉnh.
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Lý do từ chối & Yêu cầu chỉnh sửa cụ thể * (Tối thiểu 10 ký tự)</label>
                <textarea
                  value={inspectionRevisionReason}
                  onChange={(e) => setInspectionRevisionReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent leading-relaxed"
                  placeholder="Ví dụ: Kích thước đo chưa tính phần sụt lún phụ cận, yêu cầu đo lại độ sâu và chuyển phương án sang thảm bê tông nhựa C12.5..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRejectInspectionOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispatch}
                  className="px-4 py-1.5 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmittingDispatch ? 'Đang gửi...' : 'Gửi yêu cầu khảo sát lại'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Báo Cáo Chậm Tiến Độ (Dành cho Kỹ thuật viên khi Overdue) */}
      {isDelayModalOpen && incident && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full p-5 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <Clock className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Báo cáo lý do chậm tiến độ thi công</h3>
              </div>
              <button
                onClick={() => setIsDelayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDelaySubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-rose-50 rounded-md border border-rose-200 text-rose-900 text-xs">
                Công trình đã vượt quá hạn chót hoàn thành theo kế hoạch đã duyệt. Vui lòng giải trình nguyên nhân khách quan để Ban Quản lý nắm bắt và hỗ trợ điều phối.
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Nguyên nhân chậm tiến độ * (Tối thiểu 10 ký tự)</label>
                <textarea
                  value={delayReasonInput}
                  onChange={(e) => setDelayReasonInput(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent leading-relaxed"
                  placeholder="Ví dụ: Hiện trường mưa lớn kéo dài không thể thảm nhựa nóng, hoặc vướng công trình ngầm cấp thoát nước..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDelayModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi báo cáo giải trình</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Lightbox Xem Ảnh Khảo Sát Phóng To */}
      {previewInspectionPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewInspectionPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewInspectionPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewInspectionPhoto}
              alt="Ảnh phóng to"
              className="max-h-[85vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
