import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { incidentApi } from '../services/incidentApi';
import { Incident } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import {
  PlusCircle,
  Clock,
  MapPin,
  ArrowRight,
  FileText,
  AlertCircle,
  Star,
  Award,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

const getReputationTier = (score: number) => {
  if (score >= 80) {
    return {
      tier: 'Hạng Vàng',
      title: 'Công dân gương mẫu',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      barClass: 'bg-gradient-to-r from-amber-400 to-amber-500',
      description: 'Phản ánh của bạn có độ tin cậy rất cao và luôn được ưu tiên tiếp nhận xử lý nhanh nhất.',
    };
  }
  if (score >= 60) {
    return {
      tier: 'Hạng Bạc',
      title: 'Công dân tích cực',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
      barClass: 'bg-gradient-to-r from-sky-400 to-blue-500',
      description: 'Đóng góp tích cực và đáng tin cậy trong việc giám sát chất lượng hạ tầng giao thông đô thị.',
    };
  }
  if (score >= 40) {
    return {
      tier: 'Hạng Đồng',
      title: 'Thành viên tiêu chuẩn',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      barClass: 'bg-gradient-to-r from-slate-400 to-slate-500',
      description: 'Tài khoản hoạt động tiêu chuẩn. Tiếp tục gửi các phản ánh chính xác để nâng hạng uy tín.',
    };
  }
  return {
    tier: 'Cần lưu ý',
    title: 'Điểm uy tín hạn chế',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    barClass: 'bg-gradient-to-r from-rose-400 to-rose-500',
    description: 'Tài khoản từng bị ghi nhận phản ánh không khớp hiện trường hoặc không hợp lệ. Hãy kiểm tra kỹ ảnh chụp.',
  };
};

export const MyReportsPage: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();
  const [reports, setReports] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  const reputationScore = user?.reputationScore ?? 50;
  const tierInfo = getReputationTier(reputationScore);

  const fetchReports = (targetPage = page, targetSize = pageSize) => {
    setLoading(true);
    incidentApi
      .getMyReports(targetPage, targetSize)
      .then((res) => {
        setReports(res.data?.content || []);
        setTotalPages(res.data?.totalPages || 0);
        setTotalElements(res.data?.totalElements || 0);
      })
      .catch(() => {
        setReports([]);
        setTotalPages(0);
        setTotalElements(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports(page, pageSize);
    refreshUserProfile();
  }, [page, pageSize]);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Hồ sơ phản ánh công dân</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Lịch sử phản ánh sự cố</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ tiếp nhận, phân công xử lý và hình ảnh nghiệm thu thực tế từ cơ quan quản lý.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Gửi phản ánh mới</span>
          </Link>
        </div>
      </div>

      {/* Thẻ Điểm Uy Tín Công Dân & Gamification */}
      <div className="bg-gradient-to-br from-amber-50/70 via-white to-sky-50/50 p-5 rounded-xl border border-amber-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Cột trái: Điểm số & Xếp hạng */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              <Star className="w-7 h-7 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Điểm uy tín công dân</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${tierInfo.badgeClass}`}>
                  <Award className="w-3.5 h-3.5" />
                  {tierInfo.tier} — {tierInfo.title}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 font-mono">{reputationScore}</span>
                <span className="text-sm font-semibold text-slate-400">/ 100 điểm</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                {tierInfo.description}
              </p>
            </div>
          </div>

          {/* Cột giữa: Thanh tiến trình */}
          <div className="lg:w-72 flex flex-col gap-1.5 justify-center">
            <div className="flex justify-between items-center text-xs font-medium text-slate-600">
              <span>Mức độ tín nhiệm</span>
              <span className="font-bold text-amber-700">{reputationScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tierInfo.barClass}`}
                style={{ width: `${Math.min(100, Math.max(5, reputationScore))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 (Thấp)</span>
              <span>50 (Tiêu chuẩn)</span>
              <span>100 (Xuất sắc)</span>
            </div>
          </div>

          {/* Cột phải: Quy tắc cộng/trừ điểm */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 text-xs bg-white/80 p-3 rounded-lg border border-amber-100">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sự cố nghiệm thu hoàn tất:</span>
              <span className="font-bold text-emerald-600 ml-auto">+10đ ⭐</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Khảo sát hiện trường duyệt:</span>
              <span className="font-bold text-blue-600 ml-auto">+5đ 🔍</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Phản ánh sai / spam bị từ chối:</span>
              <span className="font-bold text-rose-600 ml-auto">-10đ ⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách Thẻ Sự Cố */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
          <div className="text-xs">Đang tải lịch sử phản ánh của bạn...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-lg border border-slate-200 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-900">Bạn chưa có phản ánh sự cố nào</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Khi bạn gửi thông tin hiện trường mặt đường hư hỏng, tiến độ xử lý sẽ được cập nhật chi tiết tại đây.
          </p>
          <Link
            to="/report"
            className="mt-1 px-3.5 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-xs"
          >
            Gửi phản ánh đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((item) => {
              const isDone = item.status === 'CLOSED' || item.status === 'RESOLVED';
              const isReworking = item.status === 'REWORK_REQUIRED';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-lg border shadow-xs flex flex-col justify-between gap-4 transition-colors ${
                    isDone
                      ? 'bg-gradient-to-b from-emerald-50/20 via-white to-white border-emerald-300/80 hover:border-emerald-400'
                      : isReworking
                      ? 'bg-rose-50/20 border-rose-200 hover:border-rose-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-4">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-20 h-20 rounded-md object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-blue-700">{item.ticketCode}</span>
                        <StatusBadge status={item.status} />
                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Nghiệm thu đạt
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{item.address || `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                      </span>
                    </div>
                    <Link
                      to={`/incidents/${item.id}`}
                      className={`inline-flex items-center gap-1 font-medium transition-colors ${
                        isDone ? 'text-emerald-700 hover:text-emerald-800' : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      <span>Chi tiết hồ sơ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
};
