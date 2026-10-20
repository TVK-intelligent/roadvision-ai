import React, { useState, useEffect, useMemo } from 'react';
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
  Unlock,
  UserPlus
} from 'lucide-react';

export const AdminTeamsPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'STAFF'>('TEAMS');
  const [teams, setTeams] = useState<Team[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for Teams tab
  const [teamTypeFilter, setTeamTypeFilter] = useState<string>('ALL');
  const [teamSearch, setTeamSearch] = useState<string>('');

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
  });

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
      const query = teamSearch.toLowerCase().trim();
      const matchesQuery =
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.corridor && t.corridor.toLowerCase().includes(query)) ||
        (t.zoneName && t.zoneName.toLowerCase().includes(query)) ||
        (t.leaderName && t.leaderName.toLowerCase().includes(query));
      return matchesType && matchesQuery;
    });
  }, [teams, teamTypeFilter, teamSearch]);

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
    const inspectionTeams = teams.filter((t) => t.teamType === 'INSPECTION').length;
    const constructionTeams = teams.filter((t) => t.teamType === 'CONSTRUCTION').length;
    const emergencyTeams = teams.filter((t) => t.teamType === 'EMERGENCY').length;
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter((s) => s.isActive).length;
    const assignedStaff = staffList.filter((s) => s.teamId).length;
    return {
      totalTeams,
      inspectionTeams,
      constructionTeams,
      emergencyTeams,
      totalStaff,
      activeStaff,
      assignedStaff,
    };
  }, [teams, staffList]);

  // Helper for Team Type badges
  const renderTeamTypeBadge = (type: TeamType) => {
    switch (type) {
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
    });
    setIsTeamModalOpen(true);
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

      {/* 2. CÁC THẺ KPI TỔNG QUAN (4 THẺ NỀN TRẮNG CHUẨN) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tổng số đội */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tổng số tổ đội</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.totalTeams} đội</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {kpiStats.assignedStaff}/{kpiStats.totalStaff} nhân sự đã vào đội
            </div>
          </div>
          <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Đội Khảo sát */}
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

        {/* Card 3: Đội Thi công */}
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

        {/* Card 4: Cơ động khẩn cấp */}
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
              {(['ALL', 'INSPECTION', 'CONSTRUCTION', 'EMERGENCY'] as const).map((type) => (
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

          {/* Grid hiển thị thẻ Tổ Đội */}
          {filteredTeams.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-xs">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">Không tìm thấy tổ đội nào</div>
              <p className="text-xs text-slate-500 mt-1">Vui lòng thay đổi từ khóa tìm kiếm hoặc bấm thêm tổ đội mới.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    {/* Header thẻ: Loại đội + Trạng thái + Thao tác */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderTeamTypeBadge(team.teamType)}
                        {team.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Tạm ngừng
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTeam(team)}
                          title="Sửa thông tin tổ đội"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          title="Giải thể tổ đội"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tên Tổ Đội */}
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {team.name}
                    </h3>

                    {/* Khu vực & Tuyến đường */}
                    <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                      {team.zoneName && (
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{team.zoneName}</span>
                        </div>
                      )}
                      {team.corridor && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium text-blue-800 truncate">{team.corridor}</span>
                        </div>
                      )}
                    </div>

                    {/* Mô tả nhiệm vụ */}
                    {team.description && (
                      <p className="mt-2.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 leading-relaxed">
                        {team.description}
                      </p>
                    )}

                    {/* Khối Tổ Trưởng */}
                    <div className="mt-3.5 p-3 rounded-md bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <Crown className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {team.leaderName || 'Chưa chỉ định tổ trưởng'}
                          </div>
                          {team.leaderPhone && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{team.leaderPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wide">
                        Tổ trưởng
                      </span>
                    </div>

                    {/* Danh sách thành viên */}
                    <div className="mt-3.5">
                      <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center justify-between">
                        <span>Thành viên trong đội:</span>
                        <span className="font-semibold text-slate-700">{team.members?.length || 0} người</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {team.members && team.members.length > 0 ? (
                          team.members.map((member) => (
                            <span
                              key={member.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border border-slate-200"
                              title={`${member.fullName} (${member.email})`}
                            >
                              {member.isTeamLeader ? (
                                <Crown className="w-3 h-3 text-amber-600" />
                              ) : (
                                <UserCheck className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{member.fullName}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có thành viên nào gán vào đội này.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer thẻ: Nhiệm vụ đang thực hiện */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      Công việc đang triển khai:
                    </span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {team.activeTaskCount || 0} nhiệm vụ
                    </span>
                  </div>
                </div>
              ))}
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
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg border border-slate-200 shadow-xl p-6 flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {editingTeam ? 'Cập Nhật Tổ Đội Chuyên Trách' : 'Thêm Tổ Đội Chuyên Trách Mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTeam} className="flex flex-col gap-3.5 text-xs">
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
                    <option value="INSPECTION">Khảo sát hiện trường (Giai đoạn 4)</option>
                    <option value="CONSTRUCTION">Thi công sửa chữa (Giai đoạn 5 & 6)</option>
                    <option value="EMERGENCY">Cơ động khẩn cấp 24/7</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Chỉ định Tổ Trưởng
                  </label>
                  <select
                    value={teamFormData.leaderId || ''}
                    onChange={(e) =>
                      setTeamFormData({
                        ...teamFormData,
                        leaderId: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Mô tả nhiệm vụ & phương tiện máy móc
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả phạm vi ứng trực, trang thiết bị chuyên dùng..."
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors flex items-center gap-1.5"
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
    </div>
  );
};
