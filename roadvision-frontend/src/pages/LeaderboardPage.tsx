import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Medal,
  Award,
  Star,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Flame,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CitizenRank {
  rank: number;
  name: string;
  isCurrentUser?: boolean;
  avatarText: string;
  points: number;
  tier: 'KIM CƯƠNG' | 'VÀNG' | 'BẠC' | 'ĐỒNG';
  tierBadgeColor: string;
  reportsSent: number;
  resolvedHoles: number;
  badgeTitle: string;
  accuracyPercent: number;
}

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState('');

  const currentUserName = user?.fullName || 'Lê Hoàng An';
  const currentUserScore = user?.reputationScore ?? 10;

  // Dữ liệu bảng vinh danh công dân mẫu thực tế
  const leaderboardData: CitizenRank[] = [
    {
      rank: 1,
      name: 'Nguyễn Văn Hùng',
      avatarText: 'NH',
      points: 145,
      tier: 'KIM CƯƠNG',
      tierBadgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      reportsSent: 28,
      resolvedHoles: 24,
      badgeTitle: 'Hiệp Sĩ Giao Thông',
      accuracyPercent: 98,
    },
    {
      rank: 2,
      name: 'Trần Thị Mai Linh',
      avatarText: 'TL',
      points: 98,
      tier: 'VÀNG',
      tierBadgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      reportsSent: 19,
      resolvedHoles: 16,
      badgeTitle: 'Đôi Mắt Đô Thị',
      accuracyPercent: 95,
    },
    {
      rank: 3,
      name: 'Phạm Quốc Bảo',
      avatarText: 'PB',
      points: 65,
      tier: 'BẠC',
      tierBadgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      reportsSent: 12,
      resolvedHoles: 9,
      badgeTitle: 'Công Dân Gương Mẫu',
      accuracyPercent: 92,
    },
    {
      rank: 4,
      name: currentUserName,
      isCurrentUser: true,
      avatarText: 'AN',
      points: currentUserScore,
      tier: 'BẠC',
      tierBadgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      reportsSent: 3,
      resolvedHoles: 1,
      badgeTitle: 'Công Dân Số Tích Cực',
      accuracyPercent: 100,
    },
    {
      rank: 5,
      name: 'Đặng Thu Trang',
      avatarText: 'TT',
      points: 8,
      tier: 'ĐỒNG',
      tierBadgeColor: 'bg-orange-700/10 text-orange-400 border-orange-700/30',
      reportsSent: 2,
      resolvedHoles: 1,
      badgeTitle: 'Người Đóng Góp Mới',
      accuracyPercent: 88,
    },
    {
      rank: 6,
      name: 'Vũ Đức Minh',
      avatarText: 'VM',
      points: 5,
      tier: 'ĐỒNG',
      tierBadgeColor: 'bg-orange-700/10 text-orange-400 border-orange-700/30',
      reportsSent: 1,
      resolvedHoles: 1,
      badgeTitle: 'Người Đóng Góp Mới',
      accuracyPercent: 85,
    },
    {
      rank: 7,
      name: 'Hoàng Lan Anh',
      avatarText: 'LA',
      points: 5,
      tier: 'ĐỒNG',
      tierBadgeColor: 'bg-orange-700/10 text-orange-400 border-orange-700/30',
      reportsSent: 1,
      resolvedHoles: 0,
      badgeTitle: 'Người Đóng Góp Mới',
      accuracyPercent: 90,
    },
  ];

  const filteredLeaderboard = leaderboardData.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.badgeTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1];
  const top3 = leaderboardData[2];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium">Bảng vinh danh cộng đồng</span>
      </nav>

      {/* 2. Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-500/20 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              <span>Cộng Đồng Công Dân Số RoadCare</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Bảng Vinh Danh Đóng Góp Cộng Đồng
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Mỗi bức ảnh phản ánh ổ gà, nứt mặt đường của bạn là một bước giúp thành phố sửa chữa hạ tầng nhanh hơn, bảo vệ tính mạng người đi đường.
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
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 text-[10px] font-bold">
                    Hạng Bạc
                  </span>
                </div>
                <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                  ⭐ {currentUserScore} Điểm uy tín
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Đã gửi</span>
                <span className="text-base font-bold text-white font-mono">3 phản ánh</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Đã xử lý</span>
                <span className="text-base font-bold text-emerald-400 font-mono">1 hố sụt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bục vinh danh Top 3 Podium (Huy chương Vàng, Bạc, Đồng) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Bục Vinh Quang Top 3 Tháng Này
            </h2>
            <p className="text-xs text-slate-500">
              Những cá nhân tiên phong cống hiến cho an toàn giao thông đô thị
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'quarter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Quý này
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Toàn thời gian
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
            <span className="text-xs text-amber-600 font-semibold mt-0.5">{top2.badgeTitle}</span>
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-mono font-bold">
              ⭐ {top2.points} Điểm
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {top2.reportsSent} phản ánh • {top2.resolvedHoles} hố đã thi công
            </p>
          </div>

          {/* Top 1 - Hạng Kim Cương / Quán Quân */}
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
              ⭐ {top1.points} Điểm Uy Tín
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {top1.reportsSent} phản ánh hợp lệ • {top1.resolvedHoles} vị trí đã nghiệm thu
            </p>
          </div>

          {/* Top 3 - Hạng Đồng */}
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
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-mono font-bold">
              ⭐ {top3.points} Điểm
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {top3.reportsSent} phản ánh • {top3.resolvedHoles} hố đã thi công
            </p>
          </div>
        </div>
      </div>

      {/* 4. Toàn bộ danh sách xếp hạng */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Danh Sách Đóng Góp Công Dân
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm công dân hoặc danh hiệu..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold text-center w-14">Hạng</th>
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
                    item.isCurrentUser ? 'bg-blue-50/60 font-semibold' : ''
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
                      ⭐ {item.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Quy chế tích lũy Điểm thưởng & Cấp bậc */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Quy Chế Tích Lũy Điểm Uy Tín & Quyền Lợi Công Dân Số
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Mỗi đóng góp chuẩn xác giúp nâng cao thứ hạng và nhận được ưu tiên xử lý phản ánh thực địa
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 font-bold text-sm">
              <span>+10 Điểm</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">Phản ánh hợp lệ</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ổ gà hoặc vết nứt gửi lên được mô hình AI RoadCare phân loại chính xác và tiếp nhận.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-blue-600 font-bold text-sm">
              <span>+15 Điểm</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">Ảnh chuẩn góc 45°</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ảnh chụp đúng cự ly 1-2m, góc nghiêng 45° và có đầy đủ dữ liệu định vị GPS chính xác.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 font-bold text-sm">
              <span>+20 Điểm</span>
              <Trophy className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">Nghiệm thu sửa chữa</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Điểm hư hỏng được đội kỹ thuật hoàn tất thi công thảm nhựa nóng và đóng phiếu thành công.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 font-bold text-sm">
              <span>-20 Điểm</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-rose-700 text-xs">Cảnh báo Spam</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Gửi ảnh mạng không có thật, spam hình ảnh rác hoặc cố ý cung cấp thông tin sai lệch.
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
                Phát hiện một ổ gà trên đường đi làm? Hãy chụp ảnh và gửi phản ánh ngay hôm nay.
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
