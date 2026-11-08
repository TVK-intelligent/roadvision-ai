import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { Team, Staff, TeamType, TeamRequest, StaffCreateRequest, StaffUpdateRequest } from '../types';
import { useToast } from '../components/Toast';
import {
  Users,
  UserCheck,
  HardHat,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Briefcase,
  Shield,
  Crown,
  ChevronRight,
  Layers,
  Wrench,
  Truck,
  Check,
  X,
  RefreshCw,
  FolderOpen,
  Building2,
  Calendar,
  Lock,
  Video,
  Unlock,
  UserPlus,
  Eye,
  Clock,
  LogOut,
} from 'lucide-react';

// Helper tách tên thực và tên đơn vị phụ trong ngoặc đơn
export const parseStaffName = (rawName?: string) => {
  if (!rawName) return { name: 'Chưa đặt tên', affiliation: null };
  const match = rawName.match(/^([^(]+)(?:\((.*)\))?$/);
  if (match) {
    const name = match[1].trim();
    const affiliation = match[2] ? match[2].trim() : null;
    return { name, affiliation };
  }
  return { name: rawName.trim(), affiliation: null };
};

export const AdminTeamsPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'STAFF'>('TEAMS');
  const [teams, setTeams] = useState<Team[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for Teams tab
  const [teamTypeFilter, setTeamTypeFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'READY' | 'BUSY' | 'OVERLOADED' | 'INACTIVE'>('ALL');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [viewingTasksTeam, setViewingTasksTeam] = useState<Team | null>(null);

  // Filters for Staff tab
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [staffTeamFilter, setStaffTeamFilter] = useState<string>('ALL');
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState<TeamRequest>({
    name: '',
    teamType: 'CONSTRUCTION',
    corridor: '',
    zoneName: '',
    description: '',
    leaderId: undefined,
    memberIds: [],
  });

  // Quản lý thành viên tổ đội Modal
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);
  const [selectedStaffToAdd, setSelectedStaffToAdd] = useState<string>('');
  const [allowTransferFromOtherTeams, setAllowTransferFromOtherTeams] = useState<boolean>(false);
  const [staffToAddInTeamForm, setStaffToAddInTeamForm] = useState<string>('');

  // Danh sách nhân sự kỹ thuật tự do (chưa gán vào tổ đội nào)
  const unassignedStaff = useMemo(() => {
    return staffList.filter((s) => !s.teamId);
  }, [staffList]);

  // Danh sách nhân sự đủ điều kiện làm Tổ trưởng (Chỉ gồm thành viên của tổ đội này + nhân sự tự do, KHÔNG kéo nhân sự tổ khác)
  const eligibleLeaders = useMemo(() => {
    if (editingTeam) {
      // 1. Các thành viên hiện tại của tổ đội
      const currentTeamMembers = (editingTeam.members || []).map((m) => {
        const parsed = parseStaffName(m.fullName);
        return { id: m.id, name: parsed.name, email: m.email, isCurrentMember: true };
      });
      // 2. Các nhân sự tự do (chưa có tổ đội)
      const freeStaff = unassignedStaff
        .filter((s) => !currentTeamMembers.some((m) => m.id === s.id))
        .map((s) => {
          const parsed = parseStaffName(s.fullName);
          return { id: s.id, name: '[Nhân sự tự do] ' + parsed.name, email: s.email, isCurrentMember: false };
        });
      return [...currentTeamMembers, ...freeStaff];
    }
    // Khi tạo mới tổ đội: Chỉ nhân sự tự do mới được chỉ định làm tổ trưởng
    return unassignedStaff.map((s) => {
      const parsed = parseStaffName(s.fullName);
      return { id: s.id, name: parsed.name, email: s.email, isCurrentMember: false };
    });
  }, [editingTeam, unassignedStaff]);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffFormData, setStaffFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    specialization: string;
    teamId?: number;
    isTeamLeader: boolean;
  }>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    teamId: undefined,
    isTeamLeader: false,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, staffRes] = await Promise.all([
        incidentApi.getTeams(),
        incidentApi.getStaffDetailedList(),
      ]);
      setTeams(teamsRes.data || []);
      setStaffList(staffRes.data || []);
    } catch (error) {
      console.error('Failed to load teams & staff data', error);
      toast.error('Không thể tải dữ liệu tổ đội và nhân sự', 'Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchesType = teamTypeFilter === 'ALL' || t.teamType === teamTypeFilter;
      const matchesAvailability =
        availabilityFilter === 'ALL' ||
        (availabilityFilter === 'READY' && t.isActive && (!t.activeTaskCount || t.activeTaskCount === 0)) ||
        (availabilityFilter === 'BUSY' && t.isActive && (t.activeTaskCount || 0) > 0 && (t.activeTaskCount || 0) < 3) ||
        (availabilityFilter === 'OVERLOADED' && t.isActive && (t.activeTaskCount || 0) >= 3) ||
        (availabilityFilter === 'INACTIVE' && !t.isActive);
      const query = teamSearch.toLowerCase().trim();
      const matchesQuery =
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.corridor && t.corridor.toLowerCase().includes(query)) ||
        (t.zoneName && t.zoneName.toLowerCase().includes(query)) ||
        (t.leaderName && t.leaderName.toLowerCase().includes(query));
      return matchesType && matchesAvailability && matchesQuery;
    });
  }, [teams, teamTypeFilter, availabilityFilter, teamSearch]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const query = staffSearch.toLowerCase().trim();
      const matchesQuery =
        !query ||
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.phone && s.phone.includes(query)) ||
        (s.specialization && s.specialization.toLowerCase().includes(query));

      const matchesTeam =
        staffTeamFilter === 'ALL' ||
        (staffTeamFilter === 'UNASSIGNED' ? !s.teamId : s.teamId?.toString() === staffTeamFilter);

      const matchesStatus =
        staffStatusFilter === 'ALL' ||
        (staffStatusFilter === 'ACTIVE' && s.isActive) ||
        (staffStatusFilter === 'INACTIVE' && !s.isActive);

      return matchesQuery && matchesTeam && matchesStatus;
    });
  }, [staffList, staffSearch, staffTeamFilter, staffStatusFilter]);

  // KPI counts
  const kpiStats = useMemo(() => {
    const totalTeams = teams.length;
    const patrolTeams = teams.filter((t) => t.teamType === 'PATROL').length;
    const inspectionTeams = teams.filter((t) => t.teamType === 'INSPECTION').length;
    const constructionTeams = teams.filter((t) => t.teamType === 'CONSTRUCTION').length;
    const emergencyTeams = teams.filter((t) => t.teamType === 'EMERGENCY').length;
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter((s) => s.isActive).length;
    const assignedStaff = staffList.filter((s) => s.teamId).length;
    const unassignedCount = staffList.filter((s) => !s.teamId).length;

    // Năng lực & Trạng thái thời gian thực
    const readyTeams = teams.filter((t) => t.isActive && (!t.activeTaskCount || t.activeTaskCount === 0)).length;
    const busyTeams = teams.filter((t) => t.isActive && (t.activeTaskCount || 0) > 0 && (t.activeTaskCount || 0) < 3).length;
    const overloadedTeams = teams.filter((t) => t.isActive && (t.activeTaskCount || 0) >= 3).length;
    const inactiveTeams = teams.filter((t) => !t.isActive).length;

    return {
      totalTeams,
      patrolTeams,
      inspectionTeams,
      constructionTeams,
      emergencyTeams,
      totalStaff,
      activeStaff,
      assignedStaff,
      unassignedCount,
      readyTeams,
      busyTeams,
      overloadedTeams,
      inactiveTeams,
    };
  }, [teams, staffList]);

  // Helper for Team Type badges
  const renderTeamTypeBadge = (type: TeamType) => {
    switch (type) {
      case 'PATROL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Video className="w-3.5 h-3.5 text-cyan-600" />
            Tuần tra camera AI
          </span>
        );
      case 'INSPECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            Khảo sát hiện trường
          </span>
        );
      case 'CONSTRUCTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <HardHat className="w-3.5 h-3.5 text-amber-600" />
            Thi công sửa chữa
          </span>
        );
      case 'EMERGENCY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Cơ động khẩn cấp
          </span>
        );
    }
  };

  // Open Create Team Modal
  const handleOpenCreateTeam = () => {
    setEditingTeam(null);
    setTeamFormData({
      name: '',
      teamType: 'INSPECTION',
      corridor: '',
      zoneName: '',
      description: '',
      leaderId: undefined,
      memberIds: [],
    });
    setIsTeamModalOpen(true);
  };

  // Open Edit Team Modal
  const handleOpenEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      teamType: team.teamType,
      corridor: team.corridor || '',
      zoneName: team.zoneName || '',
      description: team.description || '',
      leaderId: team.leaderId,
      memberIds: (team.members || []).map((m) => m.id),
    });
    setIsTeamModalOpen(true);
  };

  // Open Member Management Modal
  const handleOpenManageMembers = (team: Team) => {
    const currentTeam = teams.find((t) => t.id === team.id) || team;
    setManagingMembersTeam(currentTeam);
    setSelectedStaffToAdd('');
    setAllowTransferFromOtherTeams(false);
  };

  // Thêm nhân viên vào tổ đội
  const handleAddMemberToTeam = async (staffIdParam?: number) => {
    if (!managingMembersTeam) return;
    const targetStaffId = staffIdParam || (selectedStaffToAdd ? Number(selectedStaffToAdd) : undefined);
    if (!targetStaffId) {
      toast.warning('Vui lòng chọn nhân sự kỹ thuật cần thêm');
      return;
    }

    setSubmitting(true);
    try {
      const res = await incidentApi.addMemberToTeam(managingMembersTeam.id, targetStaffId);
      const updated = res.data;
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setManagingMembersTeam(updated);
      setSelectedStaffToAdd('');
      toast.success(`Đã bổ sung nhân sự vào tổ đội ${updated.name}`);
      const staffRes = await incidentApi.getStaffDetailedList();
      setStaffList(staffRes.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Không thể thêm nhân viên vào tổ đội');
    } finally {
      setSubmitting(false);
    }
  };

  // Gỡ nhân viên ra khỏi tổ đội (trở thành nhân sự tự do)
  const handleRemoveMemberFromTeam = async (staffId: number, staffName: string) => {
    if (!managingMembersTeam) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn đưa nhân viên "${staffName}" ra khỏi tổ đội "${managingMembersTeam.name}"?\nNhân viên sẽ chuyển về trạng thái Tự do (chưa phân đội) và sẵn sàng gán vào tổ khác.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await incidentApi.removeMemberFromTeam(managingMembersTeam.id, staffId);
      const updated = res.data;
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setManagingMembersTeam(updated);
      toast.success(`Đã đưa "${staffName}" ra khỏi tổ đội`);
      const staffRes = await incidentApi.getStaffDetailedList();
      setStaffList(staffRes.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Không thể gỡ nhân viên khỏi tổ đội');
    } finally {
      setSubmitting(false);
    }
  };

  // Chỉ định một thành viên làm Tổ trưởng
  const handleSetTeamLeader = async (staffId: number, staffName: string) => {
    if (!managingMembersTeam) return;
    if (
      !window.confirm(
        `Xác nhận chỉ định nhân sự "${staffName}" làm Tổ trưởng của tổ đội "${managingMembersTeam.name}"?`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await incidentApi.setTeamLeader(managingMembersTeam.id, staffId);
      const updated = res.data;
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setManagingMembersTeam(updated);
      toast.success(`Đã chỉ định "${staffName}" làm Tổ trưởng`);
      const staffRes = await incidentApi.getStaffDetailedList();
      setStaffList(staffRes.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Không thể chỉ định tổ trưởng');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Team Form
  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormData.name.trim()) {
      toast.warning('Vui lòng nhập tên tổ đội');
      return;
    }
    setSubmitting(true);
    try {
      if (editingTeam) {
        await incidentApi.updateTeam(editingTeam.id, teamFormData);
        toast.success(`Đã cập nhật tổ đội: ${teamFormData.name}`);
      } else {
        await incidentApi.createTeam(teamFormData);
        toast.success(`Đã tạo tổ đội mới: ${teamFormData.name}`);
      }
      setIsTeamModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu tổ đội');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Team
  const handleDeleteTeam = async (team: Team) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn giải thể tổ đội "${team.name}"? Các thành viên sẽ được chuyển về trạng thái Chưa phân đội.`
      )
    ) {
      return;
    }
    try {
      await incidentApi.deleteTeam(team.id);
      toast.success(`Đã giải thể tổ đội: ${team.name}`);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Không thể xóa tổ đội');
    }
  };

  // Open Create Staff Modal
  const handleOpenCreateStaff = () => {
    setEditingStaff(null);
    setStaffFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      specialization: '',
      teamId: undefined,
      isTeamLeader: false,
    });
    setIsStaffModalOpen(true);
  };

  // Open Edit Staff Modal
  const handleOpenEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setStaffFormData({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone || '',
      password: '',
      specialization: staff.specialization || '',
      teamId: staff.teamId,
      isTeamLeader: staff.isTeamLeader,
    });
    setIsStaffModalOpen(true);
  };

  // Submit Staff Form
  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.fullName.trim()) {
      toast.warning('Vui lòng nhập họ và tên nhân viên');
      return;
    }
    if (!editingStaff && !staffFormData.email.trim()) {
      toast.warning('Vui lòng nhập email đăng nhập');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const payload: StaffUpdateRequest = {
          fullName: staffFormData.fullName,
          phone: staffFormData.phone,
          specialization: staffFormData.specialization,
          teamId: staffFormData.teamId || undefined,
          isTeamLeader: staffFormData.isTeamLeader,
          ...(staffFormData.password ? { password: staffFormData.password } : {}),
        };
        await incidentApi.updateStaff(editingStaff.id, payload);
        toast.success(`Đã cập nhật nhân viên: ${staffFormData.fullName}`);
      } else {
        const payload: StaffCreateRequest = {
          fullName: staffFormData.fullName,
          email: staffFormData.email,
          phone: staffFormData.phone,
          password: staffFormData.password || '12345678',
          specialization: staffFormData.specialization,
          teamId: staffFormData.teamId || undefined,
          isTeamLeader: staffFormData.isTeamLeader,
        };
        await incidentApi.createStaff(payload);
        toast.success(`Đã tạo nhân viên mới: ${staffFormData.fullName} (Mật khẩu: ${payload.password})`);
      }
      setIsStaffModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Staff status (active/locked)
  const handleToggleStaffStatus = async (staff: Staff) => {
    const actionText = staff.isActive ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${actionText} tài khoản của ${staff.fullName}?`)) {
      return;
    }
    try {
      await incidentApi.toggleStaffStatus(staff.id);
      toast.success(`Đã ${actionText} tài khoản nhân viên thành công`);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error('Không thể thay đổi trạng thái tài khoản');
    }
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* 1. HEADER BANNER CHUẨN ĐỒNG NHẤT VỚI DISPATCH & ANALYTICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Hệ thống Nhân sự & Tổ đội Thực địa</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Quản lý Tổ đội chuyên trách & Nhân viên
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân bổ tổ đội khảo sát, thi công sửa chữa cơ động và điều phối nhân sự theo từng tuyến đường huyết mạch.
          </p>
        </div>

        {/* Nút hành động chuẩn */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            title="Làm mới dữ liệu"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-md border border-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateTeam}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tổ Đội</span>
          </button>

          <button
            onClick={handleOpenCreateStaff}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Nhân Viên</span>
          </button>
        </div>
      </div>

      {/* 2. CÁC THẺ KPI TỔNG QUAN (5 THẺ CHUYÊN MÔN HÓA) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Tổng số đội */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổng số tổ đội</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.totalTeams} đội</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{kpiStats.assignedStaff}/{kpiStats.totalStaff} đã vào đội</span>
              {kpiStats.unassignedCount > 0 && (
                <span className="font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                  {kpiStats.unassignedCount} tự do
                </span>
              )}
            </div>
          </div>
          <div className="w-9 h-9 rounded-md bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Đội Tuần tra */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổ Tuần tra Tuyến (AI)</div>
            <div className="text-xl font-bold text-cyan-600 mt-0.5">{kpiStats.patrolTeams} đội</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Quét Camera AI hành trình</div>
          </div>
          <div className="w-9 h-9 rounded-md bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Đội Khảo sát */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổ Khảo sát hiện trường</div>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{kpiStats.inspectionTeams} đội</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tiếp cận thực địa & đo đạc</div>
          </div>
          <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Đội Thi công */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổ Thi công sửa chữa</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{kpiStats.constructionTeams} đội</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cào bóc & thảm vá mặt đường</div>
          </div>
          <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <HardHat className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Cơ động khẩn cấp */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Cơ động khẩn cấp 24/7</div>
            <div className="text-xl font-bold text-rose-600 mt-0.5">{kpiStats.emergencyTeams} đội</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cứu hộ, vật cản, ngập lụt</div>
          </div>
          <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. TABS CHUYỂN ĐỔI CHUẨN */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-lg border-t border-l border-r">
        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
            activeTab === 'TEAMS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Danh Sách Tổ Đội Chuyên Trách ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
            activeTab === 'STAFF'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Bạ Nhân Viên & Kỹ Thuật ({staffList.length})</span>
        </button>
      </div>

      {/* 4. NỘI DUNG TAB 1: DANH SÁCH TỔ ĐỘI */}
      {activeTab === 'TEAMS' && (
        <div className="flex flex-col gap-4">
          {/* Thanh lọc & tìm kiếm */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Lọc:
              </span>
              {(['ALL', 'PATROL', 'INSPECTION', 'CONSTRUCTION', 'EMERGENCY'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTeamTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    teamTypeFilter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'ALL'
                    ? 'Tất cả tổ đội'
                    : type === 'PATROL'
                    ? 'Tuần tra Camera AI'
                    : type === 'INSPECTION'
                    ? 'Khảo sát hiện trường'
                    : type === 'CONSTRUCTION'
                    ? 'Thi công sửa chữa'
                    : 'Cơ động khẩn cấp'}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên đội, tuyến đường, tổ trưởng..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {teamSearch && (
                <button
                  onClick={() => setTeamSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Thanh hiển thị năng lực trực ban thời gian thực & Bộ lọc nhanh */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Năng lực trực ban thời gian thực:
              </span>
              {availabilityFilter !== 'ALL' && (
                <button
                  onClick={() => setAvailabilityFilter('ALL')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-0.5 ml-1"
                >
                  (Xóa lọc trạng thái)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('ALL')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  availabilityFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả: <strong>{teams.length}</strong>
              </button>

              <button
                type="button"
                onClick={() => setAvailabilityFilter(availabilityFilter === 'READY' ? 'ALL' : 'READY')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  availabilityFilter === 'READY'
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300 shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${availabilityFilter === 'READY' ? 'bg-white' : 'bg-emerald-500'}`} />
                Sẵn sàng: <strong>{kpiStats.readyTeams}</strong>
              </button>

              <button
                type="button"
                onClick={() => setAvailabilityFilter(availabilityFilter === 'BUSY' ? 'ALL' : 'BUSY')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  availabilityFilter === 'BUSY'
                    ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300 shadow-xs'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${availabilityFilter === 'BUSY' ? 'bg-white' : 'bg-amber-500'}`} />
                Đang làm việc: <strong>{kpiStats.busyTeams}</strong>
              </button>

              {kpiStats.overloadedTeams > 0 && (
                <button
                  type="button"
                  onClick={() => setAvailabilityFilter(availabilityFilter === 'OVERLOADED' ? 'ALL' : 'OVERLOADED')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    availabilityFilter === 'OVERLOADED'
                      ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-300 shadow-xs'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${availabilityFilter === 'OVERLOADED' ? 'bg-white animate-none' : 'bg-rose-500 animate-pulse'}`} />
                  Quá tải: <strong>{kpiStats.overloadedTeams}</strong>
                </button>
              )}

              {kpiStats.inactiveTeams > 0 && (
                <button
                  type="button"
                  onClick={() => setAvailabilityFilter(availabilityFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    availabilityFilter === 'INACTIVE'
                      ? 'bg-slate-600 text-white border-slate-700 ring-2 ring-slate-300 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${availabilityFilter === 'INACTIVE' ? 'bg-white' : 'bg-slate-400'}`} />
                  Tạm ngưng: <strong>{kpiStats.inactiveTeams}</strong>
                </button>
              )}
            </div>
          </div>

          {/* Dải mảnh thông báo nhân sự tự do */}
          {unassignedStaff.length > 0 && (
            <div className="py-2 px-3.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-slate-800 shrink-0">
                  {unassignedStaff.length} nhân sự tự do:
                </span>
                <span className="text-slate-600 truncate">
                  {unassignedStaff.map((s) => parseStaffName(s.fullName).name).join(', ')}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 hidden sm:inline ml-3">
                Bấm "Thành viên" trong thẻ để gán vào tổ
              </span>
            </div>
          )}

          {/* Danh Sách Tổ Đội Gom Theo Mục Đích Chuyên Trách */}
          {filteredTeams.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-xs">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">Không tìm thấy tổ đội nào</div>
              <p className="text-xs text-slate-500 mt-1">Vui lòng thay đổi từ khóa tìm kiếm hoặc bấm thêm tổ đội mới.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {[
                {
                  key: 'PATROL' as const,
                  title: '1. NHÓM TỔ TUẦN TRA TUYẾN ĐƯỜNG (CAMERA AI HÀNH TRÌNH)',
                  desc: 'Di chuyển theo tuyến bằng camera hành trình AI, tự động phát hiện sớm ổ gà, rạn nứt, ngập úng và lập Sổ tuần đường điện tử',
                  icon: Video,
                  teams: filteredTeams.filter((t) => t.teamType === 'PATROL'),
                  theme: {
                    border: 'border-l-4 border-l-cyan-600',
                    headerBg: 'bg-cyan-50/70 border-cyan-200',
                    titleColor: 'text-cyan-950',
                    iconBg: 'bg-cyan-100 text-cyan-700 border-cyan-200',
                    pill: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                  },
                },
                {
                  key: 'INSPECTION' as const,
                  title: '2. NHÓM TỔ KHẢO SÁT & ĐÁNH GIÁ KỸ THUẬT',
                  desc: 'Tiếp cận thực địa trong 60 phút, đo đạc kích thước rạn nứt/ổ gà, bay Flycam trắc địa và thẩm định tính xác thực của AI',
                  icon: Compass,
                  teams: filteredTeams.filter((t) => t.teamType === 'INSPECTION'),
                  theme: {
                    border: 'border-l-4 border-l-blue-600',
                    headerBg: 'bg-blue-50/70 border-blue-200',
                    titleColor: 'text-blue-950',
                    iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
                    pill: 'bg-blue-100 text-blue-800 border-blue-300',
                  },
                },
                {
                  key: 'CONSTRUCTION' as const,
                  title: '3. NHÓM TỔ THI CÔNG & DUY TU SỬA CHỮA',
                  desc: 'Trang bị cơ giới cào bóc thảm nhựa nóng polymer, lu lèn đầm nén vá hố sụt triệt để và hoàn thiện êm thuận mặt đường',
                  icon: HardHat,
                  teams: filteredTeams.filter((t) => t.teamType === 'CONSTRUCTION'),
                  theme: {
                    border: 'border-l-4 border-l-amber-600',
                    headerBg: 'bg-amber-50/70 border-amber-200',
                    titleColor: 'text-amber-950',
                    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
                    pill: 'bg-amber-100 text-amber-800 border-amber-300',
                  },
                },
                {
                  key: 'EMERGENCY' as const,
                  title: '4. NHÓM TỔ CƠ ĐỘNG PHẢN ỨNG NHANH 24/7',
                  desc: 'Trực chiến 24/7 giải tỏa cây đổ, chướng ngại vật lòng đường, sạt trượt và ngập úng mùa mưa bão',
                  icon: AlertTriangle,
                  teams: filteredTeams.filter((t) => t.teamType === 'EMERGENCY'),
                  theme: {
                    border: 'border-l-4 border-l-rose-600',
                    headerBg: 'bg-rose-50/70 border-rose-200',
                    titleColor: 'text-rose-950',
                    iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
                    pill: 'bg-rose-100 text-rose-800 border-rose-300',
                  },
                },
              ]
                .filter((cat) => teamTypeFilter === 'ALL' || teamTypeFilter === cat.key)
                .map((cat) => {
                  if (cat.teams.length === 0 && teamTypeFilter === 'ALL') return null;
                  const totalMembers = cat.teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
                  const totalTasks = cat.teams.reduce((acc, t) => acc + (t.activeTaskCount || 0), 0);
                  const IconComp = cat.icon;

                  return (
                    <div key={cat.key} className="flex flex-col gap-3">
                      {/* Tiêu đề nhóm phẳng, tinh gọn, không nền màu chói */}
                      <div className="p-3.5 rounded-lg border border-slate-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                              {cat.title}
                            </h3>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {cat.teams.length} đội
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium self-end sm:self-auto">
                          <span>👥 <strong>{totalMembers}</strong> nhân sự</span>
                          <span>·</span>
                          <span>💼 <strong>{totalTasks}</strong> việc đang chạy</span>
                        </div>
                      </div>

                      {/* Lưới các tổ đội trong nhóm */}
                      {cat.teams.length === 0 ? (
                        <div className="p-5 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          Chưa có tổ đội nào trong nhóm này khớp với từ khóa tìm kiếm.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cat.teams.map((team) => {
                            const leaderParsed = parseStaffName(team.leaderName);
                            const regularMembers = (team.members || []).filter(
                              (m) => !m.isTeamLeader && m.id !== team.leaderId
                            );

                            return (
                              <div
                                key={team.id}
                                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
                              >
                                <div>
                                  {/* Header Card: Tên tổ đội & Trạng thái (trái) + Nút Thành viên & Thao tác (phải) */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold text-slate-900 leading-snug truncate" title={team.name}>
                                          {team.name}
                                        </h3>
                                        {/* Trạng thái dùng chấm nhỏ thay vì cả pill cồng kềnh */}
                                        {!team.isActive ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Tạm ngừng
                                          </span>
                                        ) : team.availabilityStatus === 'OVERLOADED' || (team.activeTaskCount && team.activeTaskCount >= 3) ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Quá tải ({team.activeTaskCount})
                                          </span>
                                        ) : team.availabilityStatus === 'BUSY' || (team.activeTaskCount && team.activeTaskCount > 0) ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Đang bận ({team.activeTaskCount})
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sẵn sàng
                                          </span>
                                        )}
                                      </div>

                                      {/* Tuyến đường / Khu vực: 1 dòng thanh thoát */}
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{team.corridor || team.zoneName || 'Toàn tuyến'}</span>
                                      </div>
                                    </div>

                                    {/* Phía phải header: Nút thành viên + nút sửa/xóa gọn gàng */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenManageMembers(team)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                                        title="Quản lý thành viên tổ đội"
                                      >
                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{team.members?.length || 0}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditTeam(team)}
                                        title="Sửa thông tin tổ đội"
                                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTeam(team)}
                                        title="Giải thể tổ đội"
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* 2. Tổ trưởng & Thành viên: phẳng, KHÔNG lồng viền hộp */}
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                                    {/* Hàng tổ trưởng */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                          <Crown className="w-3 h-3 text-amber-600" />
                                        </div>
                                        <span className="font-semibold text-slate-900 truncate">
                                          {leaderParsed.name || 'Chưa chỉ định'}
                                        </span>
                                        {team.leaderPhone && (
                                          <span className="text-slate-400 text-[11px] truncate">· {team.leaderPhone}</span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                                        Tổ trưởng
                                      </span>
                                    </div>

                                    {/* Dòng thành viên phối thuộc */}
                                    {regularMembers.length === 0 ? (
                                      <div className="text-[11px] text-slate-400 italic">
                                        Chưa có thành viên nào khác ngoài tổ trưởng.
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                                        <span className="text-slate-400 shrink-0">Thành viên ({regularMembers.length}):</span>
                                        <span className="truncate">
                                          {regularMembers.map((m) => parseStaffName(m.fullName).name).join(', ')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 3. Footer: Nhiệm vụ đang chạy + nút xem */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{team.activeTaskCount || 0} việc đang chạy</span>
                                  </div>

                                  {(team.activeTaskCount || 0) > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingTasksTeam(team)}
                                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                                    >
                                      Xem chi tiết →
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Trực ban rảnh việc</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 5. NỘI DUNG TAB 2: DANH BẠ NHÂN VIÊN */}
      {activeTab === 'STAFF' && (
        <div className="flex flex-col gap-4">
          {/* Thanh lọc & tìm kiếm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, email, SĐT, chuyên môn..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {staffSearch && (
                <button
                  onClick={() => setStaffSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Team */}
            <div>
              <select
                value={staffTeamFilter}
                onChange={(e) => setStaffTeamFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="ALL">Tất cả tổ đội</option>
                <option value="UNASSIGNED">Chưa phân đội</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="ALL">Mọi trạng thái tài khoản</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đang bị khóa</option>
              </select>
            </div>
          </div>

          {/* Bảng danh sách nhân viên */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nhân sự</th>
                    <th className="py-3 px-4">Thông tin liên hệ</th>
                    <th className="py-3 px-4">Tổ đội phụ trách</th>
                    <th className="py-3 px-4 text-center">Nhiệm vụ active</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Không có nhân viên nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Avatar & Tên */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                              {staff.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{staff.fullName}</span>
                                {staff.isTeamLeader && (
                                  <span title="Tổ trưởng">
                                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-xs">
                                {staff.specialization || 'Kỹ thuật viên hiện trường'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Liên hệ */}
                        <td className="py-3 px-4 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{staff.email}</span>
                          </div>
                          {staff.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Tổ đội */}
                        <td className="py-3 px-4">
                          {staff.teamName ? (
                            <div className="space-y-1">
                              <div className="font-medium text-slate-800 line-clamp-1">
                                {staff.teamName}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {staff.teamType && renderTeamTypeBadge(staff.teamType)}
                                {staff.isTeamLeader && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Crown className="w-3 h-3 text-amber-600" />
                                    Tổ trưởng
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                              Chưa phân đội
                            </span>
                          )}
                        </td>

                        {/* Nhiệm vụ đang làm */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {staff.activeTasksCount} nhiệm vụ
                          </span>
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3 px-4 text-center">
                          {staff.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Đã khóa
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditStaff(staff)}
                              title="Chỉnh sửa thông tin nhân viên"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStaffStatus(staff)}
                              title={staff.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              className={`p-1 rounded transition-colors ${
                                staff.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {staff.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TẠO / SỬA TỔ ĐỘI (CHÂN NỀN TRẮNG CHUẨN ROADVISION) */}
      {/* ======================================================== */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in">
            {/* Header modal cố định */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingTeam ? 'Cập Nhật Tổ Đội Chuyên Trách' : 'Thêm Tổ Đội Chuyên Trách Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingTeam ? ('Hiệu chỉnh thông tin & phân bổ nhân sự tổ: ' + editingTeam.name) : 'Thiết lập thông tin tổ đội và chỉ định nhân sự'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form nội dung cuộn linh hoạt */}
            <form onSubmit={handleSubmitTeam} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5 text-xs">
                {/* Tên tổ đội */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Tên tổ đội <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tổ Khảo Sát Hiện Trường Miền Bắc (Khu QLĐB I)"
                    value={teamFormData.name}
                    onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Hàng 2: Loại tổ đội & Chỉ định tổ trưởng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Loại tổ đội
                    </label>
                    <select
                      value={teamFormData.teamType}
                      onChange={(e) => setTeamFormData({ ...teamFormData, teamType: e.target.value as TeamType })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="PATROL">Tuần tra camera AI hành trình</option>
                      <option value="INSPECTION">Khảo sát & đánh giá kỹ thuật</option>
                      <option value="CONSTRUCTION">Thi công sửa chữa</option>
                      <option value="EMERGENCY">Cơ động khẩn cấp 24/7</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-medium text-slate-700">
                        Chỉ định Tổ Trưởng
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {editingTeam ? ('Tổ có ' + (editingTeam.members?.length || 0) + ' thành viên') : 'Nhân sự tự do'}
                      </span>
                    </div>
                    <select
                      value={teamFormData.leaderId || ''}
                      onChange={(e) =>
                        setTeamFormData({
                          ...teamFormData,
                          leaderId: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-medium"
                    >
                      <option value="">-- Chưa chỉ định tổ trưởng --</option>
                      {eligibleLeaders.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Hàng 3: Tuyến đường phụ trách & Khu QLĐB phụ trách (Gọn 2 cột) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tuyến đường phụ trách (Corridor)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: QL1A & Cao tốc Hà Nội - Hải Phòng"
                      value={teamFormData.corridor}
                      onChange={(e) => setTeamFormData({ ...teamFormData, corridor: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Đơn vị hành chính / Khu QLĐB phụ trách
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Khu Quản lý Đường bộ I (Miền Bắc)"
                      value={teamFormData.zoneName}
                      onChange={(e) => setTeamFormData({ ...teamFormData, zoneName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Hàng 4: Mô tả nhiệm vụ */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Mô tả nhiệm vụ & phương tiện máy móc
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả phạm vi ứng trực, trang thiết bị chuyên dùng..."
                    value={teamFormData.description}
                    onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Hàng 5: Thành viên tổ đội & Chức năng cho out tổ đội / Thêm nhân sự */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-medium text-slate-700">
                      Thành viên tổ đội ({teamFormData.memberIds?.length || 0} người)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {unassignedStaff.length > 0 ? ('Có ' + unassignedStaff.length + ' nhân sự tự do') : 'Chỉ thành viên thuộc tổ này'}
                    </span>
                  </div>

                  {/* Danh sách thành viên hiện tại của tổ đội */}
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto bg-slate-50/50">
                    {(teamFormData.memberIds || []).length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 italic">
                        Tổ đội chưa có thành viên nào. Hãy chọn nhân sự tự do bên dưới để thêm vào.
                      </div>
                    ) : (
                      (teamFormData.memberIds || []).map((mId) => {
                        const staff = staffList.find((s) => s.id === mId);
                        if (!staff) return null;
                        const parsed = parseStaffName(staff.fullName);
                        const isLeader = teamFormData.leaderId === staff.id;

                        return (
                          <div
                            key={staff.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 bg-white hover:bg-slate-50 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {isLeader ? (
                                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  parsed.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <span className="font-semibold text-slate-900 truncate">{parsed.name}</span>
                              <span className="text-slate-400 text-[11px] truncate hidden sm:inline">({staff.email})</span>
                              {isLeader && (
                                <span className="shrink-0 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Tổ trưởng
                                </span>
                              )}
                            </div>

                            {/* Nút Cho out tổ đội trực tiếp */}
                            <button
                              type="button"
                              onClick={() => {
                                const newIds = (teamFormData.memberIds || []).filter((id) => id !== staff.id);
                                const wasLeader = teamFormData.leaderId === staff.id;
                                setTeamFormData({
                                  ...teamFormData,
                                  memberIds: newIds,
                                  leaderId: wasLeader ? undefined : teamFormData.leaderId,
                                });
                                toast.info('Đã gỡ ' + parsed.name + ' khỏi tổ (bấm Lưu thay đổi để hoàn tất)');
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                              title="Cho thành viên này out tổ đội"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Cho out tổ</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Thanh thêm nhanh nhân sự tự do vào tổ đội */}
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={staffToAddInTeamForm}
                      onChange={(e) => setStaffToAddInTeamForm(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Chọn nhân sự tự do cần bổ sung --</option>
                      {unassignedStaff
                        .filter((s) => !(teamFormData.memberIds || []).includes(s.id))
                        .map((s) => {
                          const parsed = parseStaffName(s.fullName);
                          return (
                            <option key={s.id} value={s.id}>
                              {parsed.name + ' (' + s.email + ')' + (s.specialization ? (' · ' + s.specialization) : '')}
                            </option>
                          );
                        })}
                    </select>

                    <button
                      type="button"
                      disabled={!staffToAddInTeamForm}
                      onClick={() => {
                        if (!staffToAddInTeamForm) return;
                        const sId = Number(staffToAddInTeamForm);
                        const current = teamFormData.memberIds || [];
                        if (!current.includes(sId)) {
                          setTeamFormData({ ...teamFormData, memberIds: [...current, sId] });
                        }
                        setStaffToAddInTeamForm('');
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      + Thêm vào tổ
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer cố định ở đáy, không bao giờ bị tràn/kịch màn hình */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTeam ? 'Lưu thay đổi' : 'Tạo tổ đội'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: QUẢN LÝ THÀNH VIÊN TỔ ĐỘI                         */}
      {/* ======================================================== */}
      {managingMembersTeam && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      Quản lý Thành viên: {managingMembersTeam.name}
                    </h3>
                    {renderTeamTypeBadge(managingMembersTeam.teamType)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {managingMembersTeam.zoneName || 'Đơn vị phụ trách'} • {managingMembersTeam.corridor || 'Tuyến hành lang'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingMembersTeam(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Khối 1: Bổ sung nhân sự vào tổ - Tinh gọn, thanh thoát */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                  Thêm nhân sự vào tổ đội
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowTransferFromOtherTeams}
                    onChange={(e) => setAllowTransferFromOtherTeams(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Hiện cả nhân sự từ tổ khác</span>
                </label>
              </div>

              {/* Dòng chọn nhân viên & nút thêm */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedStaffToAdd}
                  onChange={(e) => setSelectedStaffToAdd(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Chọn nhân sự cần thêm --</option>
                  <optgroup label={`Nhân sự tự do (${unassignedStaff.length})`}>
                    {unassignedStaff.map((s) => {
                      const parsed = parseStaffName(s.fullName);
                      return (
                        <option key={s.id} value={s.id}>
                          {parsed.name} ({s.email}) {s.specialization ? `· ${s.specialization}` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                  {allowTransferFromOtherTeams && (
                    <optgroup label="Điều chuyển từ tổ đội khác">
                      {staffList
                        .filter((s) => s.teamId && s.teamId !== managingMembersTeam.id)
                        .map((s) => {
                          const parsed = parseStaffName(s.fullName);
                          return (
                            <option key={s.id} value={s.id}>
                              {parsed.name} ({s.email}) · Đang ở: {s.teamName}
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                </select>

                <button
                  type="button"
                  disabled={submitting || !selectedStaffToAdd}
                  onClick={() => handleAddMemberToTeam()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-md shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Thêm...' : 'Thêm'}</span>
                </button>
              </div>

              {/* Quick-add chips gọn nhẹ */}
              {unassignedStaff.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                  <span className="text-slate-400">Gợi ý tự do:</span>
                  {unassignedStaff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAddMemberToTeam(s.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      title={`Bổ sung ngay ${s.fullName} vào tổ`}
                    >
                      <Plus className="w-3 h-3 text-slate-400" />
                      <span>{parseStaffName(s.fullName).name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Khối 2: Danh sách thành viên hiện tại */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>
                    Danh sách thành viên hiện tại ({managingMembersTeam.members?.length || 0} người)
                  </span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Tổ trưởng: <strong className="text-slate-800">{managingMembersTeam.leaderName || 'Chưa có'}</strong>
                </span>
              </div>

              {(!managingMembersTeam.members || managingMembersTeam.members.length === 0) ? (
                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  Tổ đội này hiện chưa có thành viên nào. Hãy chọn nhân sự ở trên để thêm vào tổ.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {managingMembersTeam.members.map((member) => {
                    const isLeader = member.id === managingMembersTeam.leaderId || member.isTeamLeader;
                    const { name: cleanName, affiliation } = parseStaffName(member.fullName);

                    return (
                      <div
                        key={member.id}
                        className={`min-h-[56px] py-2.5 px-4 flex items-center justify-between gap-3 transition-colors ${
                          isLeader ? 'bg-amber-50/20' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Cột trái: Avatar + 2 dòng thông tin gọn gàng */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isLeader
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isLeader ? (
                              <Crown className="w-4 h-4 text-amber-600" />
                            ) : (
                              cleanName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(-2)
                                .join('')
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0">
                            {/* Dòng 1: Tên đậm + badge vai trò + tag phụ thuộc nếu có */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-semibold text-xs text-slate-900 truncate max-w-[180px] sm:max-w-[240px]"
                                title={member.fullName}
                              >
                                {cleanName}
                              </span>

                              {isLeader && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                  <Crown className="w-2.5 h-2.5 text-amber-600" /> Tổ trưởng
                                </span>
                              )}

                              {affiliation && (
                                <span
                                  className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded truncate max-w-[160px]"
                                  title={affiliation}
                                >
                                  {affiliation}
                                </span>
                              )}
                            </div>

                            {/* Dòng 2 (phụ, xám nhỏ, không bullet thừa): SĐT · email · chuyên môn */}
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {[member.phone, member.email, member.specialization]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        </div>

                        {/* Cột phải: Thao tác (nhẹ nhàng, không nút khối dày đặc) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isLeader && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleSetTeamLeader(member.id, cleanName)}
                              className="text-[11px] font-medium text-slate-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded transition-colors cursor-pointer"
                              title="Chỉ định nhân sự này làm tổ trưởng"
                            >
                              Làm Tổ trưởng
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleRemoveMemberFromTeam(member.id, cleanName)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Cho nhân sự này out tổ đội (trở về nhân sự tự do)"
                          >
                            <span>🚪 Cho out tổ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                💡 Khi nhân sự rời tổ, họ sẽ ở trạng thái <strong>Tự do</strong> và có thể gán vào bất kỳ tổ đội nào khác.
              </span>
              <button
                type="button"
                onClick={() => setManagingMembersTeam(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TẠO / SỬA NHÂN VIÊN                               */}
      {/* ======================================================== */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {editingStaff ? 'Cập Nhật Hồ Sơ Nhân Viên' : 'Thêm Nhân Viên Kỹ Thuật Mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Họ và tên nhân sự <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: KS. Nguyễn Văn An"
                  value={staffFormData.fullName}
                  onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Email đăng nhập {!editingStaff && <span className="text-rose-600">*</span>}
                  </label>
                  <input
                    type="email"
                    required={!editingStaff}
                    disabled={!!editingStaff}
                    placeholder="staff.name@roadcare.gov.vn"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0909xxxxxx"
                    value={staffFormData.phone}
                    onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {editingStaff ? 'Đổi mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo'}
                </label>
                <input
                  type="password"
                  placeholder={editingStaff ? 'Để trống nếu không đổi mật khẩu' : 'Mặc định: 12345678'}
                  value={staffFormData.password}
                  onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Chuyên môn & Vị trí đảm nhiệm
                </label>
                <input
                  type="text"
                  placeholder="VD: Khảo sát hiện trường, Thảm bê tông nhựa nóng, Bay Flycam..."
                  value={staffFormData.specialization}
                  onChange={(e) => setStaffFormData({ ...staffFormData, specialization: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Gán vào Tổ Đội
                  </label>
                  <select
                    value={staffFormData.teamId || ''}
                    onChange={(e) =>
                      setStaffFormData({
                        ...staffFormData,
                        teamId: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Chưa phân đội --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={staffFormData.isTeamLeader}
                      onChange={(e) => setStaffFormData({ ...staffFormData, isTeamLeader: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1 font-semibold text-slate-900">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      Chỉ định làm Tổ Trưởng
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStaff ? 'Lưu hồ sơ' : 'Tạo nhân viên'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL XEM CHI TIẾT CÁC NHIỆM VỤ ĐANG THỰC HIỆN CỦA TỔ ĐỘI */}
      {viewingTasksTeam && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Hàng đợi nhiệm vụ: {viewingTasksTeam.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>📍 {viewingTasksTeam.zoneName || viewingTasksTeam.corridor || 'Toàn mạng lưới'}</span>
                    <span>•</span>
                    <span>👤 {viewingTasksTeam.leaderName || 'Chưa chỉ định tổ trưởng'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingTasksTeam(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-header status badge */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Trạng thái hiện tại:</span>
                {viewingTasksTeam.availabilityStatus === 'OVERLOADED' ? (
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    🔴 Quá tải ({viewingTasksTeam.activeTaskCount} việc)
                  </span>
                ) : viewingTasksTeam.availabilityStatus === 'BUSY' ? (
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    🟡 Đang thi công / khảo sát ({viewingTasksTeam.activeTaskCount} việc)
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    🟢 Sẵn sàng nhận việc
                  </span>
                )}
              </div>
              <span className="text-slate-500 font-medium">
                Tổng cộng {viewingTasksTeam.activeTasks?.length || viewingTasksTeam.activeTaskCount || 0} công việc
              </span>
            </div>

            {/* Task list container */}
            <div className="overflow-y-auto space-y-2.5 max-h-96 pr-1">
              {viewingTasksTeam.activeTasks && viewingTasksTeam.activeTasks.length > 0 ? (
                viewingTasksTeam.activeTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <Link
                          to={`/incidents/${task.id}`}
                          target="_blank"
                          className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <span>{task.ticketCode}</span>
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {task.category === 'POTHOLE' ? 'Ổ gà / Hố sụt' : task.category === 'ROAD_CRACK' ? 'Nứt mặt đường' : task.category === 'ROAD_FLOODING' ? 'Ngập úng' : 'Chướng ngại vật'}
                        </span>
                        {task.severity && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            task.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : task.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {task.severity}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        {task.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-900">
                      {task.title}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.address || 'Không rõ địa chỉ'}</span>
                      </span>
                      {task.plannedDeadline && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium shrink-0 ml-2">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Hạn: {new Date(task.plannedDeadline).toLocaleString('vi-VN')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : viewingTasksTeam.currentActiveIncidentTicket ? (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-950">
                      {viewingTasksTeam.currentActiveIncidentTicket}
                    </span>
                    <span className="text-[11px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      Đang xử lý tại hiện trường
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-900">
                    {viewingTasksTeam.currentActiveIncidentTitle || 'Nhiệm vụ sửa chữa mặt đường'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Tổ đội hiện tại chưa có nhiệm vụ nào đang xử lý.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                Nhấp vào mã phiếu sự cố để mở toàn bộ hồ sơ kỹ thuật & ảnh hiện trường.
              </span>
              <button
                type="button"
                onClick={() => setViewingTasksTeam(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
