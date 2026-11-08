import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Award,
  Star,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Search,
  ArrowRight,
  ChevronRight,
  Users,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { incidentApi } from '../services/incidentApi';

export interface CitizenRank {
  rank: number;
  name: string;
  isCurrentUser?: boolean;
  avatarText: string;
  points: number;
  reputationScore?: number;
  tier: 'HẠNG VÀNG' | 'HẠNG BẠC' | 'HẠNG ĐỒNG' | 'TIÊU CHUẨN' | 'CẦN LƯU Ý';
  tierBadgeColor: string;
  reportsSent: number;
  resolvedHoles: number;
  badgeTitle: string;
  accuracyPercent: number;
}

// Phân hạng uy tín đồng bộ 100% với MyReportsPage & Backend (Thang điểm chuẩn 0 - 1.000)
const getReputationTier = (score: number) => {
  if (score >= 800) {
    return {
      tier: 'HẠNG VÀNG' as const,
      title: 'Hiệp Sĩ Giao Thông',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  if (score >= 600) {
    return {
      tier: 'HẠNG BẠC' as const,
      title: 'Đôi Mắt Đô Thị',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    };
  }
  if (score >= 400) {
    return {
      tier: 'HẠNG ĐỒNG' as const,
      title: 'Công Dân Tích Cực',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    };
  }
  if (score >= 100) {
    return {
      tier: 'TIÊU CHUẨN' as const,
      title: 'Thành Viên Tiêu Chuẩn',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }
  return {
    tier: 'CẦN LƯU Ý' as const,
    title: 'Điểm Uy Tín Hạn Chế',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  };
};

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [apiData, setApiData] = useState<any[] | null>(null);

  const currentUserName = user?.fullName || 'Lê Hoàng An';
  const currentUserScore = Math.min(1000, Math.max(0, user?.reputationScore ?? 850));

  useEffect(() => {
    incidentApi.getCitizenLeaderboard(period === 'all' ? 'all' : 'month')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setApiData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải bảng xếp hạng thực tế:', err);
      });
  }, [period]);

  // Danh sách công dân tham gia giám sát giao thông đô thị (Điểm chuẩn từ 0 - 1.000)
  const leaderboardData: CitizenRank[] = useMemo(() => {
    if (apiData && apiData.length > 0) {
      return apiData.map((item, index) => {
        const isCurrent = user?.id ? item.userId === user.id : item.fullName === currentUserName;
        const pts = period === 'all' ? (item.reputationScore ?? 50) : (item.monthlyPoints ?? 0);
        const rep = item.reputationScore ?? 50;
        const tierInfo = getReputationTier(rep);
        const nameParts = (item.fullName || 'Công dân').trim().split(' ');
        const initials = nameParts.length > 1
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : (item.fullName || 'CD').slice(0, 2).toUpperCase();

        return {
          rank: index + 1,
          name: item.fullName || 'Công dân số',
          isCurrentUser: isCurrent,
          avatarText: initials,
          points: pts,
          reputationScore: rep,
          tier: tierInfo.tier,
          tierBadgeColor: tierInfo.badgeClass,
          reportsSent: item.reportsSent || 0,
          resolvedHoles: item.resolvedReports || 0,
          badgeTitle: item.badgeTitle || tierInfo.title,
          accuracyPercent: 95,
        };
      });
    }

    const list = [
      {
        name: 'Nguyễn Văn Hùng',
        avatarText: 'NH',
        points: period === 'all' ? 980 : 350,
        reputationScore: 980,
        reportsSent: 28,
        resolvedHoles: 24,
        badgeTitle: 'Hiệp Sĩ Giao Thông',
        accuracyPercent: 98,
      },
      {
        name: 'Trần Thị Mai Linh',
        avatarText: 'TL',
        points: period === 'all' ? 920 : 250,
        reputationScore: 920,
        reportsSent: 19,
        resolvedHoles: 16,
        badgeTitle: 'Đôi Mắt Đô Thị',
        accuracyPercent: 95,
      },
      {
        name: currentUserName,
        isCurrentUser: true,
        avatarText: currentUserName.slice(0, 2).toUpperCase(),
        points: period === 'all' ? currentUserScore : 150,
        reputationScore: currentUserScore,
        reportsSent: 8,
        resolvedHoles: 6,
        badgeTitle: getReputationTier(currentUserScore).title,
        accuracyPercent: 94,
      },
      {
        name: 'Phạm Quốc Bảo',
        avatarText: 'PB',
        points: period === 'all' ? 800 : 100,
        reputationScore: 800,
        reportsSent: 12,
        resolvedHoles: 9,
        badgeTitle: 'Công Dân Gương Mẫu',
        accuracyPercent: 92,
      },
      {
        name: 'Đặng Thu Trang',
        avatarText: 'TT',
        points: period === 'all' ? 650 : 50,
        reputationScore: 650,
        reportsSent: 7,
        resolvedHoles: 5,
        badgeTitle: 'Công Dân Tích Cực',
        accuracyPercent: 88,
      },
      {
        name: 'Vũ Đức Minh',
        avatarText: 'VM',
        points: period === 'all' ? 550 : 0,
        reputationScore: 550,
        reportsSent: 4,
        resolvedHoles: 3,
        badgeTitle: 'Thành Viên Tiêu Chuẩn',
        accuracyPercent: 85,
      },
      {
        name: 'Hoàng Lan Anh',
        avatarText: 'LA',
        points: period === 'all' ? 450 : 0,
        reputationScore: 450,
        reportsSent: 2,
        resolvedHoles: 1,
        badgeTitle: 'Thành Viên Tiêu Chuẩn',
        accuracyPercent: 90,
      },
    ];

    // Sắp xếp giảm dần theo điểm
    list.sort((a, b) => b.points - a.points);

    return list.map((item, index) => {
      const tierInfo = getReputationTier(item.reputationScore);
      return {
        ...item,
        rank: index + 1,
        tier: tierInfo.tier,
        tierBadgeColor: tierInfo.badgeClass,
      };
    });
  }, [apiData, period, currentUserName, currentUserScore, user?.id]);

  const filteredLeaderboard = leaderboardData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.badgeTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1] || leaderboardData[0];
  const top3 = leaderboardData[2] || leaderboardData[1];

  const currentUserTier = getReputationTier(currentUserScore);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium">Bảng vinh danh công dân</span>
      </nav>

      {/* 2. Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-500/20 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              <span>Chỉ dành riêng cho Công Dân Số RoadCare (ROLE_CITIZEN)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Bảng Vinh Danh Đóng Góp Công Dân
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Vinh danh những công dân tích cực gửi ảnh phản ánh ổ gà, vết nứt, ngập úng giúp cơ quan quản lý sửa chữa kịp thời, bảo vệ an toàn cho cộng đồng. Thang điểm chuẩn tối đa 100 điểm.
            </p>
          </div>

          {/* Card thành tích cá nhân của người đăng nhập */}
          <div className="w-full lg:w-auto p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0 min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-md">
                {currentUserName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{currentUserName}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${currentUserTier.badgeClass}`}>
                    {currentUserTier.tier}
                  </span>
                </div>
                <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                  ⭐ {currentUserScore} / 100 Điểm uy tín
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Đã gửi</span>
                <span className="text-base font-bold text-white font-mono">8 phản ánh</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Đã xử lý</span>
                <span className="text-base font-bold text-emerald-400 font-mono">6 hố sụt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin cơ chế tính điểm & làm mới thi đua */}
      <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900 shadow-xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">Quy chế Bảng vinh danh & Sổ cái uy tín RoadCare:</p>
          <p className="text-blue-800 leading-relaxed">
            • <strong>Điểm thi đua tháng:</strong> Tính theo các giao dịch điểm thưởng phát sinh trong tháng hiện tại và <em>tự động làm mới về 0 vào ngày 1 hàng tháng</em> để thi đua công bằng.
            <br />
            • <strong>Điểm uy tín tích lũy:</strong> Tích lũy dài hạn từ <strong>0 đến 1.000 điểm</strong>, quyết định Hạng công dân (Đồng / Bạc / Vàng / Kim Cương) và được cấp quyền ưu tiên duyệt nhanh Fast-Track.
            <br />
            • Khi bằng điểm ở mốc 1.000, công dân nào đạt mốc điểm trước sẽ được ưu tiên xếp hạng cao hơn.
          </p>
        </div>
      </div>

      {/* 3. Bục vinh danh Top 3 Podium (Huy chương Vàng, Bạc, Đồng) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Bục Vinh Quang Top 3 Công Dân {period === 'all' ? 'Toàn Thời Gian' : 'Tháng Này'}
            </h2>
            <p className="text-xs text-slate-500">
              {period === 'all'
                ? 'Công dân tiêu biểu tích cực với Điểm Uy Tín tích lũy cao nhất (Tối đa 1.000 điểm)'
                : 'Công dân dẫn đầu phong trào thi đua trong tháng hiện tại (Làm mới đầu tháng)'}
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Thi đua tháng này
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Uy tín tích lũy (0-1.000)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Top 2 - Hạng Bạc */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm absolute top-4 left-4">
              🥈 2
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 p-1 mb-3 ring-4 ring-slate-100">
              <div className="w-full h-full rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                {top2.avatarText}
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{top2.name}</h3>
            <span className="text-xs text-sky-600 font-semibold mt-0.5">{top2.badgeTitle}</span>
            <div className="mt-3 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-mono font-bold">
              ⭐ {top2.points} {period === 'all' ? '/ 1.000 Điểm Uy Tín' : 'Điểm Thi Đua'}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {top2.reportsSent} phản ánh • {top2.resolvedHoles} vị trí đã nghiệm thu
            </p>
          </div>

          {/* Top 1 - Quán Quân Công Dân Số */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50/80 via-white to-white border-2 border-amber-400 shadow-lg flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2 transform md:-translate-y-2">
            <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 py-1 text-slate-950 font-extrabold text-[11px] tracking-wider uppercase">
              👑 Quán Quân Cống Hiến
            </div>
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 p-1 mb-3 mt-4 ring-4 ring-amber-100 shadow-md">
              <div className="w-full h-full rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-2xl">
                {top1.avatarText}
              </div>
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">{top1.name}</h3>
            <span className="text-xs text-amber-700 font-bold mt-0.5">{top1.badgeTitle}</span>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 text-sm font-mono font-extrabold shadow-sm">
              ⭐ {top1.points} {period === 'all' ? '/ 1.000 Điểm Uy Tín' : 'Điểm Thi Đua'}
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {top1.reportsSent} phản ánh hợp lệ • {top1.resolvedHoles} vị trí đã nghiệm thu
            </p>
          </div>

          {/* Top 3 - Hạng Ba */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden order-3">
            <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-900 flex items-center justify-center font-bold text-sm absolute top-4 left-4">
              🥉 3
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-700/30 to-amber-600/20 p-1 mb-3 ring-4 ring-amber-50">
              <div className="w-full h-full rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                {top3.avatarText}
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{top3.name}</h3>
            <span className="text-xs text-slate-600 font-semibold mt-0.5">{top3.badgeTitle}</span>
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-bold">
              ⭐ {top3.points} {period === 'all' ? '/ 1.000 Điểm Uy Tín' : 'Điểm Thi Đua'}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {top3.reportsSent} phản ánh • {top3.resolvedHoles} vị trí đã nghiệm thu
            </p>
          </div>
        </div>
      </div>

      {/* 4. Bảng Xếp Hạng Toàn Bộ Công Dân */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Danh Sách Đóng Góp Công Dân
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {period === 'all'
                ? 'Xếp hạng minh bạch dựa trên Điểm Uy Tín tích lũy lâu dài (0 - 1.000 điểm) và số sự cố đã nghiệm thu'
                : 'Xếp hạng thi đua tháng hiện tại (Làm mới định kỳ vào ngày 1 hàng tháng)'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm công dân hoặc danh hiệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold text-center w-16">Hạng</th>
                <th className="py-3 px-4 font-semibold">Công dân</th>
                <th className="py-3 px-4 font-semibold">Danh hiệu</th>
                <th className="py-3 px-4 font-semibold text-center">Phản ánh</th>
                <th className="py-3 px-4 font-semibold text-center">Đã sửa</th>
                <th className="py-3 px-4 font-semibold text-center">Cấp bậc</th>
                <th className="py-3 px-4 font-semibold text-right">Điểm uy tín</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaderboard.map((item) => (
                <tr
                  key={item.rank}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    item.isCurrentUser ? 'bg-blue-50/70 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    {item.rank === 1 ? (
                      <span className="text-base">🥇</span>
                    ) : item.rank === 2 ? (
                      <span className="text-base">🥈</span>
                    ) : item.rank === 3 ? (
                      <span className="text-base">🥉</span>
                    ) : (
                      <span className="text-slate-500">#{item.rank}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                        {item.avatarText}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {item.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-600 text-[10px] text-white font-bold">
                              Bạn
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">Độ chính xác: {item.accuracyPercent}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{item.badgeTitle}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                    {item.reportsSent}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-600">
                    {item.resolvedHoles}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${item.tierBadgeColor}`}>
                      {item.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-sm font-bold text-blue-600 font-mono">
                      ⭐ {item.points} {period === 'all' ? '/ 1.000' : 'đ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Quy chế tích lũy Điểm Uy Tín & Cơ chế xử phạt vi phạm */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Quy Chế Tích Lũy Điểm Uy Tín & Chế Tài Vi Phạm Minh Bạch (Sổ Cái Giao Dịch)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Mỗi đóng góp chuẩn xác được ghi nhận giao dịch vào Sổ cái Ledger. Chế tài phân cấp rõ ràng theo 3 mức độ để khuyến khích và bảo vệ người dân.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-sky-600 font-bold text-sm">
              <span>+50 Điểm</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">Thẩm định hợp lệ</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Phản ánh được Quản trị viên duyệt xác nhận hiện trường thực tế và đưa vào kế hoạch bảo trì.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 font-bold text-sm">
              <span>+100 Điểm</span>
              <Trophy className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">Nghiệm thu hoàn tất</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Điểm hư hại được tổ thi công sửa chữa đạt chuẩn, Admin duyệt nghiệm thu và đóng hồ sơ thành công.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 font-bold text-sm">
              <span>-100 Điểm</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-rose-800 text-xs">Gian lận / Tin giả</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cố tình gửi ảnh mạng, bịa đặt hiện trường bị phạt trừ 100 điểm, ghi nhận sổ cái PENALTY và cảnh cáo vi phạm.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-slate-600 font-bold text-sm">
              <span>0 Điểm Phạt</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">Trùng lặp / Vị trí</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sự cố trùng lặp hoặc sai lệch vị trí do GPS khách quan được từ chối nhưng KHÔNG trừ điểm và KHÔNG tính vi phạm.
            </p>
          </div>
        </div>

        {/* Nút điều hướng nộp phản ánh */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-blue-900">Bắt đầu đóng góp cho thành phố</h4>
              <p className="text-[11px] text-blue-700">
                Phát hiện ổ gà, nứt đường trên tuyến đường đi lại? Chụp ảnh và gửi phản ánh để tích lũy điểm uy tín ngay hôm nay.
              </p>
            </div>
          </div>
          <Link
            to="/report"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <span>Gửi phản ánh mới</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
