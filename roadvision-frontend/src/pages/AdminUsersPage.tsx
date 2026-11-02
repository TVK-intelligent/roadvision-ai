import React, { useState, useEffect, useMemo } from 'react';
import { adminUserApi } from '../services/adminUserApi';
import { incidentApi } from '../services/incidentApi';
import { AdminUser, UserStats, Role, Team, AdminCreateUserData } from '../types';
import { useToast } from '../components/Toast';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  HardHat,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  KeyRound,
  Star,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
  Sliders,
  Check,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const toast = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [newRole, setNewRole] = useState<Role>('ROLE_CITIZEN');

  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [suspendReason, setSuspendReason] = useState<string>('');

  const [isReputationModalOpen, setIsReputationModalOpen] = useState<boolean>(false);
  const [newReputation, setNewReputation] = useState<number>(50);
  const [resetStrikes, setResetStrikes] = useState<boolean>(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createFormData, setCreateFormData] = useState<AdminCreateUserData>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'ROLE_STAFF',
    teamId: undefined,
    specialization: '',
    isTeamLeader: false,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, teamsRes] = await Promise.all([
        adminUserApi.getAllUsers(),
        adminUserApi.getUserStats(),
        incidentApi.getTeams().then((r) => r.data).catch(() => []),
      ]);
      setUsers(usersRes);
      setStats(statsRes);
      setTeams(teamsRes);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      toast.error('Không thể nạp danh sách người dùng hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === 'ACTIVE' && u.isActive === false) return false;
      if (statusFilter === 'LOCKED' && u.isActive !== false) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.fullName?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.phone?.includes(q);
        const matchSpec = u.specialization?.toLowerCase().includes(q);
        const matchTeam = u.teamName?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchSpec && !matchTeam) return false;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Handle Role Change
  const handleOpenRoleModal = (u: AdminUser) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const updated = await adminUserApi.updateUserRole(selectedUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      // Update stats
      const newStats = await adminUserApi.getUserStats();
      setStats(newStats);
      toast.success(`Đã chuyển vai trò của "${updated.fullName}" thành ${getRoleName(updated.role)}`);
      setIsRoleModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Cập nhật vai trò thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Status (Lock / Unlock)
  const handleOpenStatusModal = (u: AdminUser) => {
    setSelectedUser(u);
    setSuspendReason(u.suspendReason || '');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async (targetActive: boolean) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const updated = await adminUserApi.updateUserStatus(selectedUser.id, {
        isActive: targetActive,
        suspendReason: targetActive ? undefined : (suspendReason.trim() || 'Tạm khóa bởi Quản trị viên'),
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      const newStats = await adminUserApi.getUserStats();
      setStats(newStats);
      toast.success(
        targetActive
          ? `Đã kích hoạt mở khóa tài khoản "${updated.fullName}"`
          : `Đã tạm khóa tài khoản "${updated.fullName}"`
      );
      setIsStatusModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Cập nhật trạng thái người dùng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reputation Score Update
  const handleOpenReputationModal = (u: AdminUser) => {
    setSelectedUser(u);
    setNewReputation(u.reputationScore ?? 50);
    setResetStrikes(false);
    setIsReputationModalOpen(true);
  };

  const handleSaveReputation = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const updated = await adminUserApi.updateReputation(selectedUser.id, {
        reputationScore: newReputation,
        resetStrikes,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Đã cập nhật điểm uy tín của "${updated.fullName}" thành ${updated.reputationScore}`);
      setIsReputationModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Cập nhật điểm uy tín thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Password Reset
  const handleOpenPasswordModal = (u: AdminUser) => {
    setSelectedUser(u);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleSavePassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      await adminUserApi.resetPassword(selectedUser.id, newPassword);
      toast.success(`Đã đặt lại mật khẩu thành công cho "${selectedUser.fullName}"`);
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Đặt lại mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.email || !createFormData.fullName || !createFormData.password) {
      toast.error('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu');
      return;
    }
    if (createFormData.password.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }

    setSubmitting(true);
    try {
      const created = await adminUserApi.createUser(createFormData);
      setUsers((prev) => [created, ...prev]);
      const newStats = await adminUserApi.getUserStats();
      setStats(newStats);
      toast.success(`Đã tạo thành công tài khoản "${created.fullName}" (${getRoleName(created.role)})`);
      setIsCreateModalOpen(false);
      setCreateFormData({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        role: 'ROLE_STAFF',
        teamId: undefined,
        specialization: '',
        isTeamLeader: false,
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Tạo tài khoản thất bại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleName = (role: Role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Quản trị viên';
      case 'ROLE_STAFF':
        return 'Cán bộ Kỹ thuật';
      case 'ROLE_CITIZEN':
        return 'Công dân';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ROLE_STAFF':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'ROLE_CITIZEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />;
      case 'ROLE_STAFF':
        return <HardHat className="w-3.5 h-3.5 text-sky-600" />;
      case 'ROLE_CITIZEN':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Quản lý Người Dùng & Phân Quyền Hệ Thống
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kiểm soát tài khoản, cấp phát quyền truy cập Role-Based Access Control (RBAC), theo dõi điểm uy tín và bảo mật
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                <span>Làm mới</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản mới</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Metric KPI Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Tổng tài khoản</p>
              <p className="text-xl font-bold text-slate-900">{stats?.totalUsers ?? '...'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Quản trị viên</p>
              <p className="text-xl font-bold text-rose-700">{stats?.adminCount ?? '...'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Cán bộ Kỹ thuật</p>
              <p className="text-xl font-bold text-sky-700">{stats?.staffCount ?? '...'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Công dân giao thông</p>
              <p className="text-xl font-bold text-emerald-700">{stats?.citizenCount ?? '...'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Bị khóa / Đình chỉ</p>
              <p className="text-xl font-bold text-amber-700">{stats?.lockedCount ?? '...'}</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs mb-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên, email, số điện thoại, tổ đội, chuyên môn..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium">Vai trò:</span>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ROLE_ADMIN">Quản trị viên (ROLE_ADMIN)</option>
              <option value="ROLE_STAFF">Cán bộ Kỹ thuật (ROLE_STAFF)</option>
              <option value="ROLE_CITIZEN">Công dân (ROLE_CITIZEN)</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2">
              <span className="text-[11px] font-medium">Trạng thái:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Bị tạm khóa</option>
            </select>

            <span className="text-xs text-slate-400 font-mono ml-auto md:ml-2">
              {filteredUsers.length} / {users.length} tài khoản
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Đang tải danh sách người dùng...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <UserX className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Không tìm thấy người dùng phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc vai trò / trạng thái</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Tài khoản & Người dùng</th>
                    <th className="py-3 px-4">Vai trò & Tổ đội</th>
                    <th className="py-3 px-4 text-center">Điểm uy tín</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => {
                    const initials = u.fullName
                      ? u.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(-2)
                          .join('')
                          .toUpperCase()
                      : 'U';
                    const isLocked = u.isActive === false;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* 1. Account info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 truncate">{u.fullName}</span>
                                {u.isTeamLeader && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    Đội trưởng
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1 font-mono">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {u.email}
                                </span>
                                {u.phone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {u.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role & Team */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeStyle(
                                  u.role
                                )}`}
                              >
                                {getRoleIcon(u.role)}
                                <span>{getRoleName(u.role)}</span>
                              </span>
                            </div>

                            {u.role === 'ROLE_STAFF' && (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {u.teamName ? u.teamName : 'Chưa phân vào tổ đội'}
                                </span>
                              </div>
                            )}

                            {u.specialization && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-xs">
                                {u.specialization}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 3. Reputation & Strikes */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{u.reputationScore ?? 50} / 100</span>
                            </span>
                            {(u.spamStrikes ?? 0) > 0 && (
                              <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                {u.spamStrikes} lần vi phạm
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isLocked ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                <span>Đã khóa</span>
                              </span>
                              {u.suspendReason && (
                                <span className="text-[10px] text-slate-500 mt-0.5 max-w-[140px] truncate" title={u.suspendReason}>
                                  {u.suspendReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Hoạt động</span>
                            </span>
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Phân quyền vai trò */}
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                              title="Phân quyền vai trò (Role)"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>

                            {/* Điều chỉnh điểm uy tín */}
                            <button
                              type="button"
                              onClick={() => handleOpenReputationModal(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-colors cursor-pointer"
                              title="Điều chỉnh điểm uy tín & spam"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>

                            {/* Đặt lại mật khẩu */}
                            <button
                              type="button"
                              onClick={() => handleOpenPasswordModal(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 border border-slate-200 transition-colors cursor-pointer"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Khóa / Mở khóa */}
                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u);
                                  handleSaveStatus(true);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                                title="Mở khóa tài khoản"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(u)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                title="Khóa tài khoản"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: PHÂN QUYỀN VAI TRÒ (ROLE ASSIGNMENT MODAL) */}
      {/* ========================================================= */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Phân Quyền Vai Trò Người Dùng</h3>
                <p className="text-xs text-slate-500">
                  Tài khoản: <span className="font-semibold text-slate-800">{selectedUser.fullName}</span> ({selectedUser.email})
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {/* Option 1: Công dân */}
              <label
                onClick={() => setNewRole('ROLE_CITIZEN')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  newRole === 'ROLE_CITIZEN'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Công dân giao thông</span>
                    {newRole === 'ROLE_CITIZEN' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Báo cáo phản ánh hư hỏng mặt đường qua ảnh chụp AI, tra cứu tình trạng hồ sơ, tham gia upvote và bảng vinh danh cộng đồng.
                  </p>
                </div>
              </label>

              {/* Option 2: Cán bộ Kỹ thuật */}
              <label
                onClick={() => setNewRole('ROLE_STAFF')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  newRole === 'ROLE_STAFF'
                    ? 'border-sky-500 bg-sky-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-sky-100 text-sky-700 mt-0.5 shrink-0">
                  <HardHat className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Cán bộ Kỹ thuật / Tuần tra</span>
                    {newRole === 'ROLE_STAFF' && <Check className="w-4 h-4 text-sky-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Truy cập chế độ Tuần tra Video AI hành trình, đo đạc khảo sát thực địa hiện trường, tiếp nhận nhiệm vụ thi công và chụp ảnh nghiệm thu.
                  </p>
                </div>
              </label>

              {/* Option 3: Quản trị viên */}
              <label
                onClick={() => setNewRole('ROLE_ADMIN')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  newRole === 'ROLE_ADMIN'
                    ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700 mt-0.5 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Quản trị viên Hệ Thống</span>
                    {newRole === 'ROLE_ADMIN' && <Check className="w-4 h-4 text-rose-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Toàn quyền điều hành: Hàng đợi điều phối, duyệt phương án sửa chữa, phân tích KPI & xuất GeoJSON, quản lý tổ đội nhân sự và phân quyền người dùng.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting || newRole === selectedUser.role}
                onClick={handleSaveRole}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
              >
                {submitting ? 'Đang lưu...' : 'Lưu quyền vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TẠO MỚI NGƯỜI DÙNG (CREATE USER MODAL) */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạo Mới Tài Khoản Người Dùng</h3>
                <p className="text-xs text-slate-500">Khởi tạo tài khoản trực tiếp từ bảng điều khiển quản trị viên</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.fullName}
                  onChange={(e) => setCreateFormData({ ...createFormData, fullName: e.target.value })}
                  placeholder="Ví dụ: KS. Nguyễn Văn An"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="ten.nv@roadcare.gov.vn"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu ban đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                    placeholder="0909xxxxxx"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createFormData.role}
                    onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ROLE_CITIZEN">Công dân (ROLE_CITIZEN)</option>
                    <option value="ROLE_STAFF">Cán bộ Kỹ thuật (ROLE_STAFF)</option>
                    <option value="ROLE_ADMIN">Quản trị viên (ROLE_ADMIN)</option>
                  </select>
                </div>
              </div>

              {/* Staff specific fields */}
              {createFormData.role === 'ROLE_STAFF' && (
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tổ đội chuyên trách</label>
                    <select
                      value={createFormData.teamId || ''}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          teamId: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">-- Chưa gán tổ đội --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.corridor || t.zoneName || 'Toàn tuyến'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Chuyên môn / Lĩnh vực</label>
                    <input
                      type="text"
                      value={createFormData.specialization || ''}
                      onChange={(e) => setCreateFormData({ ...createFormData, specialization: e.target.value })}
                      placeholder="Ví dụ: Khảo sát đo đạc mặt đường, Thảm nhựa nóng bê tông..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isTeamLeaderCheckbox"
                      checked={createFormData.isTeamLeader || false}
                      onChange={(e) => setCreateFormData({ ...createFormData, isTeamLeader: e.target.checked })}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <label htmlFor="isTeamLeaderCheckbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Đảm nhận vai trò Tổ trưởng / Trưởng nhóm phụ trách
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ĐIỀU CHỈNH ĐIỂM UY TÍN (REPUTATION MODAL) */}
      {/* ========================================================= */}
      {isReputationModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsReputationModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Điều Chỉnh Điểm Uy Tín</h3>
                <p className="text-xs text-slate-500">
                  {selectedUser.fullName} ({selectedUser.email})
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Điểm uy tín (0 - 100):</span>
                  <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {newReputation} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newReputation}
                  onChange={(e) => setNewReputation(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Ý nghĩa mức điểm uy tín trong RoadVision:
                </p>
                <p className="text-[11px] leading-relaxed">
                  • <strong>≥ 80 điểm</strong>: Báo cáo được AI ưu tiên duyệt thẳng vào hàng đợi điều phối khẩn cấp.
                  <br />
                  • <strong>50 - 79 điểm</strong>: Báo cáo trải qua kiểm duyệt đối chiếu không gian tiêu chuẩn.
                  <br />
                  • <strong>&lt; 30 điểm</strong>: Người dùng có nguy cơ bị hệ thống tự động gắn cờ cảnh báo spam.
                </p>
              </div>

              {(selectedUser.spamStrikes ?? 0) > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="resetStrikesCheckbox"
                    checked={resetStrikes}
                    onChange={(e) => setResetStrikes(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <label htmlFor="resetStrikesCheckbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Xóa sạch số lần cảnh cáo spam hiện tại ({selectedUser.spamStrikes} lần)
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReputationModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveReputation}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs shadow-amber-500/20 cursor-pointer"
              >
                {submitting ? 'Đang lưu...' : 'Lưu điểm uy tín'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ĐẶT LẠI MẬT KHẨU (PASSWORD RESET MODAL) */}
      {/* ========================================================= */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đặt Lại Mật Khẩu Người Dùng</h3>
                <p className="text-xs text-slate-500">
                  {selectedUser.fullName} ({selectedUser.email})
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Người dùng có thể dùng mật khẩu mới này để đăng nhập ngay lập tức.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSavePassword}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs shadow-purple-500/20 cursor-pointer"
              >
                {submitting ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: KHÓA TÀI KHOẢN (LOCK ACCOUNT MODAL) */}
      {/* ========================================================= */}
      {isStatusModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạm Khóa Tài Khoản Người Dùng</h3>
                <p className="text-xs text-slate-500">
                  {selectedUser.fullName} ({selectedUser.email})
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do tạm ngưng / khóa tài khoản:
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ví dụ: Gửi hình ảnh phản ánh không chính xác, vi phạm quy định nền tảng..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Khi bị tạm khóa, người dùng sẽ không thể đăng nhập hoặc thực hiện bất kỳ hành động nào trong hệ thống.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveStatus(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs shadow-rose-500/20 cursor-pointer"
              >
                {submitting ? 'Đang khóa...' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
