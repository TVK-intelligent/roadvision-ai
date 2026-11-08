import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Incident, IncidentStatus, Category, Team, Priority } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import {
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  RotateCcw,
  AlertCircle,
  Clock,
  Wrench,
  AlertTriangle,
  BarChart3,
  Truck,
  CheckCircle2,
  ThumbsUp,
  MapPin,
  X,
  Check,
  ShieldCheck,
  ClipboardList,
  HardHat,
  Star,
  Globe,
  Users,
  Zap,
  Navigation,
  Car,
  ChevronDown,
  Send,
  Compass,
  Eye,
} from 'lucide-react';
import { routingService, RouteResult } from '../services/routingService';

export const DispatchQueuePage: React.FC = () => {
  const toast = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Phân trang chuẩn Spring Data
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [dispatchDropdownIncidentId, setDispatchDropdownIncidentId] = useState<number | null>(null);

  // Teams & Staff
  const [teams, setTeams] = useState<Team[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modal Giao Khảo Sát (Giai đoạn 3)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isAssignInspectionModalOpen, setIsAssignInspectionModalOpen] = useState<boolean>(false);
  const [inspectionTeamId, setInspectionTeamId] = useState<number>(1);
  const [inspectionPriority, setInspectionPriority] = useState<Priority>('HIGH');
  const [inspectionNotes, setInspectionNotes] = useState<string>('Khảo sát đo đạc hiện trường trong 60 phút');

  // Modal Giao Thi Công (Giai đoạn 5)
  const [isAssignConstructionModalOpen, setIsAssignConstructionModalOpen] = useState<boolean>(false);
  const [constructionTeamId, setConstructionTeamId] = useState<number>(2);
  const [constructionPriority, setConstructionPriority] = useState<Priority>('HIGH');
  const [workPlan, setWorkPlan] = useState<string>('Cào bóc 4cm, thảm BTN C12.5 đầm lèn đạt K98');
  const [plannedDeadline, setPlannedDeadline] = useState<string>('');
  const [safetyNotes, setSafetyNotes] = useState<string>('Bố trí rào chắn cọc tiêu và đèn cảnh báo ban đêm');

  // Modal Từ chối
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('Ảnh chụp không rõ ràng hoặc nằm ngoài quyền hạn quản lý');

  // Modal Yêu cầu khảo sát lại (Giai đoạn 5)
  const [isRejectInspectionModalOpen, setIsRejectInspectionModalOpen] = useState<boolean>(false);
  const [inspectionRevisionReason, setInspectionRevisionReason] = useState<string>('');
  const [isSubmittingInspectionRevision, setIsSubmittingInspectionRevision] = useState<boolean>(false);

  // Modal Yêu cầu thi công lại (Giai đoạn 7)
  const [isReworkModalOpen, setIsReworkModalOpen] = useState<boolean>(false);
  const [reworkInstructions, setReworkInstructions] = useState<string>('');
  const [isSubmittingRework, setIsSubmittingRework] = useState<boolean>(false);

  // Lộ trình OSRM thời gian thực
  const [routeDetails, setRouteDetails] = useState<Record<number, RouteResult>>({});

  const fetchIncidents = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    incidentApi
      .getIncidents({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as IncidentStatus),
        category: categoryFilter === 'ALL' ? undefined : (categoryFilter as Category),
        search: search.trim() || undefined,
        page: targetPage,
        size: targetSize,
      })
      .then((res) => {
        setIncidents(res.data?.content || []);
        setTotalPages(res.data?.totalPages || 0);
        setTotalElements(res.data?.totalElements || 0);
      })
      .catch(() => {
        setIncidents([]);
        setTotalPages(0);
        setTotalElements(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncidents(page, pageSize);
  }, [page, pageSize, statusFilter, categoryFilter]);

  useEffect(() => {
    incidentApi
      .getStaffList()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setStaffList(res.data);
        }
      })
      .catch(() => {});

    incidentApi
      .getTeams()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTeams(res.data);
          const insp = res.data.find((t) => t.teamType === 'INSPECTION') || res.data[0];
          setInspectionTeamId(insp.id);
          const constr = res.data.find((t) => t.teamType === 'CONSTRUCTION' || t.teamType === 'EMERGENCY') || res.data[0];
          setConstructionTeamId(constr.id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchIncidents(0, pageSize);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPage(0);
  };

  // Helper tính cự ly địa lý (Haversine Formula - Đơn vị: km)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Bán kính Trái Đất (km)
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

  // Helper ước tính thời gian di chuyển (vận tốc nội đô ~22km/h + 3 phút chuẩn bị xuất phát)
  const getEstimatedTravelMinutes = (distanceKm: number): number => {
    return Math.max(5, Math.round((distanceKm / 22) * 60) + 3);
  };

  // Helper kiểm tra địa bàn phụ trách (Quận / Hành lang tuyến)
  const checkZoneMatch = (
    incidentAddress?: string,
    teamZone?: string,
    teamCorridor?: string
  ): { isMatch: boolean; districtLabel: string } => {
    if (!incidentAddress) {
      return { isMatch: false, districtLabel: 'Chưa rõ địa bàn' };
    }
    const addr = incidentAddress.toLowerCase();

    // Đội cơ động khẩn cấp 24/7 trực thuộc toàn thành phố
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

    // 1. So khớp theo hành lang tuyến đường
    if (teamCorridor) {
      const corridors = teamCorridor.toLowerCase().split(/[&,+/()]/).map((s) => s.trim()).filter((s) => s.length > 3);
      for (const c of corridors) {
        if (c && addr.includes(c)) {
          return { isMatch: true, districtLabel: 'Cùng tuyến đường phụ trách' };
        }
      }
    }

    // 2. So khớp theo quận huyện địa bàn
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

  // Helper xác định tọa độ sự cố
  const getIncidentCoordinates = (inc: Incident | null) => {
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

  // Helper xác định tọa độ trụ sở tổ đội
  const getTeamCoordinates = (team: Team) => {
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

  // Nạp định tuyến đường bộ thực tế qua OSRM API
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

  // Helper tính khoảng cách GPS, thời gian ETA, đối soát khu vực và chấm điểm phù hợp
  const getTeamDistanceAndEta = (team: Team, incident: Incident | null) => {
    const incPos = getIncidentCoordinates(incident);
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
    const zoneResult = checkZoneMatch(incident?.address, team.zoneName, team.corridor);

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
    const rawScore = baseScore + (isMatch * 10) + (isAvailable * 10) - (distKm * 8) - (tasks * 10) - overloadPenalty;
    const score = Math.min(100, Math.max(10, Math.round(rawScore)));

    return { distKm, etaMinutes, zoneResult, isDrivingRoute, polyline, teamPos, incPos, score };
  };

  // Helper sắp xếp tổ đội thông minh theo điểm phù hợp (Từ cao xuống thấp)
  const getSortedTeamsForSelection = (candidateTeams: Team[], incident: Incident | null) => {
    return [...candidateTeams].sort((a, b) => {
      const infoA = getTeamDistanceAndEta(a, incident);
      const infoB = getTeamDistanceAndEta(b, incident);
      return infoB.score - infoA.score;
    });
  };

  const handleOpenAssignInspectionModal = (incident: Incident) => {
    setSelectedIncident(incident);
    const defaultPriority: Priority = incident.severity === 'CRITICAL' ? 'CRITICAL' : incident.severity === 'HIGH' ? 'HIGH' : 'NORMAL';
    setInspectionPriority(defaultPriority);
    const candidateTeams = teams.filter((t) => t.teamType === 'INSPECTION' || t.teamType === 'EMERGENCY');
    const sorted = getSortedTeamsForSelection(candidateTeams.length > 0 ? candidateTeams : teams, incident);
    if (sorted.length > 0) {
      setInspectionTeamId(sorted[0].id);
    }
    fetchDrivingRoutes(candidateTeams.length > 0 ? candidateTeams : teams, incident);
    setIsAssignInspectionModalOpen(true);
  };

  const handleAssignInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      await incidentApi.assignInspection(selectedIncident.id, {
        teamId: inspectionTeamId,
        priority: inspectionPriority,
        notes: inspectionNotes,
      });
      toast.success(`Đã giao khảo sát ${selectedIncident.ticketCode} cho Tổ Khảo sát!`, 'Giao việc thành công');
      fetchIncidents(page, pageSize);
      setIsAssignInspectionModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể giao khảo sát', 'Lỗi điều phối');
    }
  };

  const handleOpenAssignConstructionModal = (incident: Incident) => {
    setSelectedIncident(incident);
    const slaHours = incident.severity === 'CRITICAL' ? 4 : incident.severity === 'HIGH' ? 24 : incident.severity === 'MEDIUM' ? 72 : 168;
    const defaultPriority: Priority = incident.severity === 'CRITICAL' ? 'CRITICAL' : incident.severity === 'HIGH' ? 'HIGH' : 'NORMAL';
    setConstructionPriority(defaultPriority);
    const date = incident.plannedDeadline
      ? new Date(incident.plannedDeadline)
      : new Date(Date.now() + slaHours * 3600 * 1000);
    setPlannedDeadline(date.toISOString().slice(0, 16));
    const candidateTeams = teams.filter((t) => t.teamType === 'CONSTRUCTION' || t.teamType === 'EMERGENCY');
    const sorted = getSortedTeamsForSelection(candidateTeams.length > 0 ? candidateTeams : teams, incident);
    if (sorted.length > 0) {
      setConstructionTeamId(sorted[0].id);
    }
    fetchDrivingRoutes(candidateTeams.length > 0 ? candidateTeams : teams, incident);
    setIsAssignConstructionModalOpen(true);
  };

  const handleAssignConstructionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

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

    try {
      await incidentApi.assignConstruction(selectedIncident.id, {
        teamId: constructionTeamId,
        priority: constructionPriority,
        workPlan: workPlan.trim(),
        plannedDeadline: plannedDeadline ? new Date(plannedDeadline).toISOString() : undefined,
        safetyNotes: safetyNotes ? safetyNotes.trim() : undefined,
      });
      toast.success(`Đã giao thi công ${selectedIncident.ticketCode} cho Tổ Thi công!`, 'Giao việc thành công');
      fetchIncidents(page, pageSize);
      setIsAssignConstructionModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể giao thi công', 'Lỗi điều phối');
    }
  };

  const handleVerifyIncident = async (incidentId: number) => {
    try {
      await incidentApi.verifyIncident(incidentId);
      toast.success('Đã thẩm định và xác nhận sự cố hợp lệ!', 'Xác nhận hồ sơ');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xác nhận sự cố', 'Lỗi');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.warning('Lý do từ chối phản ánh phải cụ thể tối thiểu 10 ký tự!', 'Lý do chưa đủ');
      return;
    }

    try {
      await incidentApi.rejectIncident(selectedIncident.id, { rejectionReason: rejectionReason.trim() });
      toast.warning(`Đã từ chối xử lý sự cố ${selectedIncident.ticketCode}`, 'Từ chối tiếp nhận');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Không thể từ chối sự cố', 'Lỗi');
    }

    setIncidents((prev) =>
      prev.map((item) =>
        item.id === selectedIncident.id ? { ...item, status: 'REJECTED' as IncidentStatus } : item
      )
    );
    setIsRejectModalOpen(false);
  };

  const handleRejectInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!inspectionRevisionReason || inspectionRevisionReason.trim().length < 5) {
      toast.warning('Vui lòng ghi rõ lý do yêu cầu khảo sát lại (tối thiểu 5 ký tự)!', 'Thiếu lý do');
      return;
    }
    setIsSubmittingInspectionRevision(true);
    try {
      await incidentApi.rejectInspectionReport(selectedIncident.id, { reason: inspectionRevisionReason.trim() });
      toast.info(`Đã gửi lệnh yêu cầu Tổ khảo sát đo đạc lại cho ${selectedIncident.ticketCode}`, 'Yêu cầu khảo sát lại');
      setIsRejectInspectionModalOpen(false);
      setInspectionRevisionReason('');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu khảo sát lại', 'Lỗi');
    } finally {
      setIsSubmittingInspectionRevision(false);
    }
  };

  const handleReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!reworkInstructions || reworkInstructions.trim().length < 5) {
      toast.warning('Vui lòng chỉ đạo rõ nội dung cần thi công lại (tối thiểu 5 ký tự)!', 'Thiếu nội dung');
      return;
    }
    setIsSubmittingRework(true);
    try {
      await incidentApi.reviewAcceptance(selectedIncident.id, {
        approved: false,
        reworkReason: reworkInstructions.trim(),
        notes: 'Yêu cầu thi công lại từ Bàn cờ Điều phối',
      });
      toast.info(`Đã ban hành lệnh yêu cầu Tổ thi công làm lại cho ${selectedIncident.ticketCode}`, 'Yêu cầu thi công lại');
      setIsReworkModalOpen(false);
      setReworkInstructions('');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi lệnh thi công lại', 'Lỗi');
    } finally {
      setIsSubmittingRework(false);
    }
  };

  const handleQuickApproveAcceptance = async (incidentId: number) => {
    try {
      await incidentApi.reviewAcceptance(incidentId, {
        approved: true,
        notes: 'Phê duyệt nghiệm thu đạt chuẩn từ Bàn cờ Điều phối',
      });
      toast.success('Đã phê duyệt nghiệm thu công trình đạt chuẩn (RESOLVED)!', 'Nghiệm thu thành công');
      fetchIncidents(page, pageSize);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể phê duyệt nghiệm thu', 'Lỗi');
    }
  };

  const aiIncidents = incidents.filter(
    (i) => i.aiDetection?.confidence !== undefined && i.aiDetection?.confidence !== null
  );
  const avgConfidence =
    aiIncidents.length > 0
      ? (
          (aiIncidents.reduce((acc, curr) => acc + Number(curr.aiDetection?.confidence || 0), 0) /
            aiIncidents.length) *
          100
        ).toFixed(1) + '%'
      : '---';

  const resolvedList = incidents.filter(
    (i) => (i.status === 'RESOLVED' || i.status === 'CLOSED') && i.resolvedAt && i.createdAt
  );
  const avgHours =
    resolvedList.length > 0
      ? (
          resolvedList.reduce((acc, curr) => {
            const diffMs = new Date(curr.resolvedAt!).getTime() - new Date(curr.createdAt).getTime();
            return acc + diffMs / (1000 * 60 * 60);
          }, 0) / resolvedList.length
        ).toFixed(1) + ' giờ'
      : (incidents.length > 0 ? '< 4.0 giờ' : '---');

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Điều phối & Phân công hiện trường</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Hàng đợi điều phối sự cố
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẩm định hồ sơ sự cố, phân công nhân viên kỹ thuật và kiểm soát tiến độ xử lý theo cam kết SLA.
          </p>
        </div>

        {/* Nút sang Trung Tâm Phân Tích KPI */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/analytics"
            className="px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 font-medium text-xs transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>Báo cáo KPI</span>
          </Link>
          <div className="px-3.5 py-2 rounded-md bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="text-xs text-slate-500">Tổng sự cố:</span>
            <span className="text-sm font-bold text-slate-900 leading-none">{totalElements}</span>
          </div>
        </div>
      </div>

      {/* 4 Thẻ KPI vắn tắt */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical SLA At Risk */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Nguy cơ trễ hạn (SLA)</div>
            <div className="text-xl font-bold text-rose-600 mt-0.5">
              {incidents.filter((i) => i.severity === 'CRITICAL' || i.flag === 'DISPUTED').length} vé cảnh báo
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cần xử lý trong 24h</div>
          </div>
          <div className="p-2 rounded-md bg-rose-50 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: AI Confidence Median */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Độ tin cậy nhận diện</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{avgConfidence}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Phân loại tự động</div>
          </div>
          <div className="p-2 rounded-md bg-blue-50 text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Active Crew Dispatches */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổ duy tu trực chiến</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {staffList.length > 0 ? staffList.length : 4} tổ đội
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">4 Khu QLĐB phụ trách</div>
          </div>
          <div className="p-2 rounded-md bg-slate-100 text-slate-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Mean Resolution Speed */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Thời gian xử lý trung bình</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{avgHours}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Đạt chuẩn cam kết</div>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Cảnh báo khiếu nại chất lượng */}
      {incidents.some((i) => i.flag === 'DISPUTED') && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-rose-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-rose-800 flex items-center gap-2">
                <span>Cảnh báo: Có sự cố đang bị khiếu nại sau nghiệm thu</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-medium">
                  {incidents.filter((i) => i.flag === 'DISPUTED').length} sự cố
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Người dân phản ánh chất lượng sau khi sửa chữa chưa đạt yêu cầu. Ban Quản Lý vui lòng kiểm tra và yêu cầu làm lại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('DISPUTED');
              setPage(0);
              fetchIncidents(0, pageSize);
            }}
            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc vé khiếu nại</span>
          </button>
        </div>
      )}

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Input Tìm kiếm */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã vé (#RC-...), tên đường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-900"
            />
          </div>

          {/* Lọc Thể Loại */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo danh mục sự cố"
              className="w-full px-3 py-2 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục sự cố</option>
              <option value="POTHOLE">Ổ gà / Hố sụt</option>
              <option value="ROAD_CRACK">Vết nứt mặt đường</option>
              <option value="ROAD_FLOODING">Điểm ngập úng</option>
              <option value="ROAD_OBSTACLE">Chướng ngại vật</option>
            </select>
          </div>

          {/* Lọc Trạng Thái */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo trạng thái xử lý"
              className="w-full px-3 py-2 rounded-md bg-white text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái xử lý</option>
              <option value="SUBMITTED">1. Mới tiếp nhận (SUBMITTED)</option>
              <option value="AI_ANALYZED">2. Đã phân tích AI (AI_ANALYZED)</option>
              <option value="VERIFIED">2. Đã xác nhận hợp lệ (VERIFIED)</option>
              <option value="INSPECTION_ASSIGNED">3. Đã giao khảo sát (INSPECTION_ASSIGNED)</option>
              <option value="INSPECTING">4. Đang khảo sát (INSPECTING)</option>
              <option value="INSPECTED">4. Đã khảo sát xong (INSPECTED)</option>
              <option value="ASSIGNED">5. Đã giao thi công (ASSIGNED)</option>
              <option value="IN_PROGRESS">6. Đang thi công (IN_PROGRESS)</option>
              <option value="PENDING_ACCEPTANCE">6. Chờ nghiệm thu (PENDING_ACCEPTANCE)</option>
              <option value="RESOLVED">7. Đã nghiệm thu (RESOLVED)</option>
              <option value="REWORK_REQUIRED">Yêu cầu sửa lại (REWORK_REQUIRED)</option>
              <option value="CLOSED">Đã hoàn tất & Đóng (CLOSED)</option>
              <option value="REJECTED">Đã từ chối (REJECTED)</option>
            </select>
          </div>

          {/* Nút Tìm kiếm & Đặt lại */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
              className="p-2 rounded-md border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Hàng Đợi Sự Cố */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-visible">
        <div className="overflow-x-auto min-h-[340px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wide border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã sự cố</th>
                <th className="py-3 px-4">Ảnh & Vị trí</th>
                <th className="py-3 px-4">Loại sự cố</th>
                <th className="py-3 px-4">Độ tin cậy</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right min-w-[210px] whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2"></div>
                    <div>Đang tải dữ liệu hàng đợi điều phối...</div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="font-medium">Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.</p>
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const isDisputed = incident.flag === 'DISPUTED';
                  return (
                    <tr
                      key={incident.id}
                      className={`transition-colors ${
                        isDisputed
                          ? 'bg-rose-50/60 border-l-4 border-l-rose-600 hover:bg-rose-50'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Mã Ticket */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start whitespace-nowrap">
                          <Link
                            to={`/incidents/${incident.id}`}
                            className="font-mono font-bold text-blue-700 hover:text-blue-800 hover:underline"
                          >
                            #{incident.ticketCode}
                          </Link>
                          {isDisputed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold whitespace-nowrap">
                              <AlertTriangle className="w-2.5 h-2.5" /> Bị khiếu nại
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thumbnail & Địa chỉ */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <img
                            src={incident.imageUrl}
                            alt={incident.title}
                            className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 line-clamp-1 max-w-[220px]">
                              {incident.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[160px]">
                                {incident.address || `${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}`}
                              </span>
                              {incident.routeCorridor && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  title={incident.zoneName || incident.routeCorridor}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                  {incident.routeCorridor.replace('KHU_', 'Khu ')}
                                </span>
                              )}
                              {incident.flag === 'POTENTIAL_DUPLICATE' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-semibold" title="Phát hiện có sự cố khác cùng vị trí lân cận (<25m)">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> Trùng lặp vị trí
                                </span>
                              )}
                              {incident.upvoteCount != null && incident.upvoteCount > 1 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium" title="Lượt công dân đồng tình">
                                  <ThumbsUp className="w-2.5 h-2.5" /> {incident.upvoteCount}
                                </span>
                              )}
                            </div>
                            {isDisputed && incident.reworkReason && (
                              <span className="text-[11px] text-rose-700 font-medium italic mt-1 line-clamp-1 max-w-[240px]" title={incident.reworkReason}>
                                Ý kiến dân: "{incident.reworkReason}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phân loại */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {incident.category === 'POTHOLE' && 'Ổ gà'}
                          {incident.category === 'ROAD_CRACK' && 'Vết nứt mặt đường'}
                          {incident.category === 'ROAD_FLOODING' && 'Điểm ngập úng'}
                          {incident.category === 'ROAD_OBSTACLE' && 'Chướng ngại vật'}
                          {incident.category === 'COMPLEX_DAMAGE' && 'Đa sự cố'}
                          {!['POTHOLE', 'ROAD_CRACK', 'ROAD_FLOODING', 'ROAD_OBSTACLE', 'COMPLEX_DAMAGE'].includes(incident.category) && incident.category}
                        </span>
                      </td>

                      {/* AI Confidence */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        {incident.aiDetection?.confidence ? (
                          <div className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px] font-medium">
                            {(incident.aiDetection.confidence * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px] px-2">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap min-w-[130px]">
                        <div className="inline-flex flex-col gap-1 items-start whitespace-nowrap">
                          <StatusBadge status={incident.status} />
                          {isDisputed && (
                            <span className="text-[10px] font-semibold text-rose-600 whitespace-nowrap">
                              Chờ điều phối lại
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {isDisputed ? (
                            <>
                              <Link
                                to={`/incidents/${incident.id}`}
                                className="h-7.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Xử lý khiếu nại</span>
                              </Link>
                              <Link
                                to={`/incidents/${incident.id}`}
                                title="Xem hồ sơ chi tiết sự cố"
                                className="w-7.5 h-7.5 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors shrink-0 shadow-2xs"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </>
                          ) : (
                            <>
                              {/* Giai đoạn 3: Phản ánh mới -> Nút Điều phối thông minh */}
                              {['SUBMITTED', 'AI_ANALYZED', 'VERIFIED'].includes(incident.status) && (
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDispatchDropdownIncidentId(dispatchDropdownIncidentId === incident.id ? null : incident.id);
                                    }}
                                    className="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                                    title="Chọn phương án điều phối công việc"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Điều phối</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${dispatchDropdownIncidentId === incident.id ? 'rotate-180' : ''}`} />
                                  </button>

                                  {dispatchDropdownIncidentId === incident.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setDispatchDropdownIncidentId(null)}
                                      />
                                      <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                          Chọn luồng xử lý sự cố
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDispatchDropdownIncidentId(null);
                                            handleOpenAssignInspectionModal(incident);
                                          }}
                                          className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-start gap-2.5 transition-colors cursor-pointer group"
                                        >
                                          <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">1. Giao tổ khảo sát</div>
                                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">Xác minh hiện trường & đo đạc kỹ thuật</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDispatchDropdownIncidentId(null);
                                            handleOpenAssignConstructionModal(incident);
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

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDispatchDropdownIncidentId(null);
                                            setSelectedIncident(incident);
                                            setIsRejectModalOpen(true);
                                          }}
                                          className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-start gap-2.5 transition-colors cursor-pointer group border-t border-slate-100"
                                        >
                                          <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-semibold text-slate-800 group-hover:text-rose-700">3. Từ chối tiếp nhận</div>
                                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">Không thuộc thẩm quyền hoặc thông tin sai</div>
                                          </div>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Giai đoạn 5: Đã khảo sát -> Giao thi công (Chính) & Khảo sát lại (Phụ) */}
                              {incident.status === 'INSPECTED' && (
                                <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => handleOpenAssignConstructionModal(incident)}
                                    title="Duyệt kết quả khảo sát và giao tổ thi công"
                                    className="h-7.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                                  >
                                    <HardHat className="w-3.5 h-3.5 shrink-0" />
                                    <span>Giao thi công</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedIncident(incident);
                                      setInspectionRevisionReason('');
                                      setIsRejectInspectionModalOpen(true);
                                    }}
                                    title="Yêu cầu tổ khảo sát đo đạc lại hoặc bổ sung số liệu"
                                    className="h-7.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium transition-colors text-xs inline-flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Khảo sát lại</span>
                                  </button>
                                </div>
                              )}

                              {/* Giai đoạn 7: Chờ nghiệm thu -> Duyệt nghiệm thu (Chính) & Thi công lại (Phụ) */}
                              {['PENDING_ACCEPTANCE', 'PENDING_INSPECTION'].includes(incident.status) && (
                                <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => handleQuickApproveAcceptance(incident.id)}
                                    title="Phê duyệt nghiệm thu đạt chuẩn kỹ thuật (RESOLVED)"
                                    className="h-7.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>Duyệt nghiệm thu</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedIncident(incident);
                                      setReworkInstructions('');
                                      setIsReworkModalOpen(true);
                                    }}
                                    title="Từ chối nghiệm thu, bắt tổ thi công xử lý lại hiện trường"
                                    className="h-7.5 px-2.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-medium transition-colors text-xs inline-flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>Thi công lại</span>
                                  </button>
                                </div>
                              )}

                              {/* Nút icon xem hồ sơ chi tiết sự cố thống nhất */}
                              <Link
                                to={`/incidents/${incident.id}`}
                                title="Xem hồ sơ chi tiết sự cố"
                                className="w-7.5 h-7.5 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors shrink-0 shadow-2xs"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="p-3 border-t border-slate-200">
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
        </div>
      </div>

      {/* Modal Giao Khảo Sát Hiện Trường (Giai đoạn 3) */}
      {isAssignInspectionModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Giao nhiệm vụ khảo sát hiện trường</h3>
                  <span className="font-mono text-xs text-blue-700 font-medium">{selectedIncident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAssignInspectionModalOpen(false)}
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
                selectedIncident
              );
              const currentTeam = teams.find((t) => t.id === inspectionTeamId) || candidateTeams[0];
              const isZoneMatch = currentTeam ? checkZoneMatch(selectedIncident.address, currentTeam.zoneName, currentTeam.corridor).isMatch : false;
              const isBusy = (currentTeam?.activeTaskCount || 0) > 0;

              return (
                <form onSubmit={handleAssignInspectionSubmit} className="flex flex-col gap-3.5 text-xs overflow-y-auto pr-1 -mr-1">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-slate-900 text-sm">{selectedIncident.title}</span>
                    <span className="text-slate-600 line-clamp-1">📍 {selectedIncident.address || 'Không rõ địa chỉ'}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-semibold text-slate-800 text-xs">Chọn Tổ Khảo Sát tiếp nhận *</label>
                      <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{candidateTeams.length} tổ đội ứng viên</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                      {candidateTeams.map((team, idx) => {
                        const isSelected = inspectionTeamId === team.id;
                        const { distKm, etaMinutes, zoneResult, isDrivingRoute, score } = getTeamDistanceAndEta(team, selectedIncident);
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
                          Tổ đội phụ trách <strong>{currentTeam.zoneName || 'Khu vực khác'}</strong>, sự cố tại <strong>{selectedIncident.address}</strong>. Bạn đang điều động chéo địa bàn.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block font-semibold mb-1 text-slate-700">Mức độ ưu tiên phản ứng</label>
                      <select
                        value={inspectionPriority}
                        onChange={(e) => setInspectionPriority(e.target.value as Priority)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
                      >
                        <option value="CRITICAL">Khẩn cấp</option>
                        <option value="HIGH">Cao</option>
                        <option value="NORMAL">Bình thường</option>
                        <option value="LOW">Thấp</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1 text-slate-700">Ghi chú & Chỉ đạo khảo sát</label>
                      <textarea
                        rows={2}
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="Yêu cầu khảo sát hiện trường, kiểm tra kích thước hư hỏng..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAssignInspectionModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Xác nhận giao khảo sát
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Giao Thi Công Chuyên Trách (Giai đoạn 5) */}
      {isAssignConstructionModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Giao nhiệm vụ thi công sửa chữa</h3>
                  <span className="font-mono text-xs text-emerald-700 font-medium">{selectedIncident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsAssignConstructionModalOpen(false)}
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
                selectedIncident
              );
              const currentTeam = teams.find((t) => t.id === constructionTeamId) || candidateTeams[0];
              const isZoneMatch = currentTeam ? checkZoneMatch(selectedIncident.address, currentTeam.zoneName, currentTeam.corridor).isMatch : false;
              const isBusy = (currentTeam?.activeTaskCount || 0) > 0;

              return (
                <form onSubmit={handleAssignConstructionSubmit} className="flex flex-col gap-3 text-xs overflow-y-auto pr-1 -mr-1">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-slate-900 text-sm">{selectedIncident.title}</span>
                    <span className="text-slate-600 line-clamp-1">📍 {selectedIncident.address || 'Không rõ địa chỉ'}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-semibold text-slate-800 text-xs">Chọn Tổ Thi Công chuyên trách *</label>
                      <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{candidateTeams.length} tổ đội ứng viên</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                      {candidateTeams.map((team, idx) => {
                        const isSelected = constructionTeamId === team.id;
                        const { distKm, etaMinutes, zoneResult, isDrivingRoute, score } = getTeamDistanceAndEta(team, selectedIncident);
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
                          Tổ đội phụ trách <strong>{currentTeam.zoneName || 'Khu vực khác'}</strong>, sự cố tại <strong>{selectedIncident.address}</strong>. Bạn đang điều động chéo địa bàn.
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Phương án thi công đã phê duyệt *</label>
                    <textarea
                      rows={2}
                      value={workPlan}
                      required
                      onChange={(e) => setWorkPlan(e.target.value)}
                      placeholder="Ví dụ: Cào bóc 4cm, tưới nhựa dính bám 0.5kg/m2, thảm BTN C12.5 dày 5cm..."
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700">Hạn hoàn thành (Deadline)</label>
                      <input
                        type="datetime-local"
                        value={plannedDeadline}
                        onChange={(e) => setPlannedDeadline(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700">Mức độ ưu tiên</label>
                      <select
                        value={constructionPriority}
                        onChange={(e) => setConstructionPriority(e.target.value as Priority)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent cursor-pointer"
                      >
                        <option value="CRITICAL">Khẩn cấp</option>
                        <option value="HIGH">Cao</option>
                        <option value="NORMAL">Bình thường</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Lưu ý an toàn giao thông & vật tư</label>
                    <textarea
                      rows={2}
                      value={safetyNotes}
                      onChange={(e) => setSafetyNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAssignConstructionModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Xác nhận giao thi công
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Từ Chối Tiếp Nhận */}
      {isRejectModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-rose-700">Từ chối tiếp nhận hồ sơ</h3>
                <span className="font-mono text-xs text-slate-500">{selectedIncident.ticketCode}</span>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-700">Lý do từ chối phản ánh *</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="Nhập lý do cụ thể gửi thông báo tới người dân..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:border-transparent text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Yêu Cầu Khảo Sát Lại (Giai đoạn 5) */}
      {isRejectInspectionModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">Yêu cầu Khảo sát lại</h3>
                  <span className="font-mono text-xs text-slate-500">{selectedIncident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsRejectInspectionModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectInspectionSubmit} className="flex flex-col gap-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-slate-700">
                <p className="font-medium text-amber-900 mb-0.5">Lệnh yêu cầu đo đạc lại hoặc bổ sung số liệu</p>
                <p className="text-[11px] text-slate-600">Sự cố sẽ được chuyển về trạng thái <strong>INSPECTING</strong> và thông báo khẩn tới Tổ khảo sát.</p>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Nội dung chỉ đạo / lý do yêu cầu khảo sát lại *</label>
                <textarea
                  rows={3}
                  value={inspectionRevisionReason}
                  onChange={(e) => setInspectionRevisionReason(e.target.value)}
                  required
                  placeholder="Ví dụ: Kích thước độ sâu chưa chuẩn xác, yêu cầu kiểm tra lại bề rộng rãnh nứt..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRejectInspectionModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInspectionRevision}
                  className="px-4 py-1.5 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInspectionRevision ? 'Đang gửi...' : 'Gửi yêu cầu đo lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Yêu Cầu Thi Công Lại (Giai đoạn 7) */}
      {isReworkModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-rose-800">Yêu cầu Thi công lại</h3>
                  <span className="font-mono text-xs text-slate-500">{selectedIncident.ticketCode}</span>
                </div>
              </div>
              <button
                onClick={() => setIsReworkModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReworkSubmit} className="flex flex-col gap-3 text-xs">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-slate-700">
                <p className="font-medium text-rose-900 mb-0.5">Từ chối nghiệm thu chất lượng mặt đường</p>
                <p className="text-[11px] text-slate-600">Sự cố sẽ chuyển về trạng thái <strong>REWORK_REQUIRED</strong> yêu cầu Tổ thi công ra xử lý lại dứt điểm.</p>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700">Chỉ đạo thi công khắc phục cho Tổ thi công *</label>
                <textarea
                  rows={3}
                  value={reworkInstructions}
                  onChange={(e) => setReworkInstructions(e.target.value)}
                  required
                  placeholder="Ví dụ: Mặt đường vá nhựa chưa êm thuận, vẫn còn lún võng nguy hiểm. Bù thêm nhựa và đầm lèn lại..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:border-transparent text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReworkModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRework}
                  className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRework ? 'Đang gửi...' : 'Ban hành lệnh làm lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
