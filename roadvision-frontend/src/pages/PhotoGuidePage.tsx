import React from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  XCircle,
  Crosshair,
  Sun,
  ShieldAlert,
  Navigation,
  Sparkles,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Eye,
  Zap,
} from 'lucide-react';

export const PhotoGuidePage: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium">Cẩm nang chụp ảnh hiện trường chuẩn AI</span>
      </nav>

      {/* 2. Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Camera className="w-3.5 h-3.5" />
            <span>Tiêu Chuẩn Kỹ Thuật Thị Giác Máy Tính</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Cẩm Nang Chụp Ảnh Mặt Đường Chuẩn AI
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Mô hình AI YOLOv8 của RoadVision phân tích hình học không gian đa chiều để đo đạc diện tích và độ sâu hố lõm. Áp dụng 4 tiêu chuẩn dưới đây để đảm bảo ảnh của bạn được phân loại chuẩn xác 100% ngay từ lần gửi đầu tiên.
          </p>
        </div>
      </div>

      {/* 3. Cảnh báo an toàn số 1 */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
          <ShieldAlert className="w-6 h-6 text-amber-950" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-amber-500 text-sm">
            Nguyên Tắc Vàng: An Toàn Giao Thông Là Số 1
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Chỉ thực hiện chụp ảnh khi bạn đã dừng xe ở nơi an toàn (vỉa hè hoặc lề đường có rào chắn). <strong>Tuyệt đối không dừng xe giữa dòng phương tiện đang lưu thông nhanh</strong> để chụp ảnh. An toàn tính mạng của bạn là ưu tiên cao nhất!
          </p>
        </div>
      </div>

      {/* 4. 4 Tiêu Chuẩn Kỹ Thuật Có Sơ Đồ Đồ Họa Minh Họa */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-blue-600" />
              4 Tiêu Chuẩn Kỹ Thuật Đạt Điểm Tuyệt Đối
            </h2>
            <p className="text-xs text-slate-500">
              Giúp mô hình AI phân biệt ổ gà với vết loang nước và tính toán cấp độ nghiêm trọng chính xác
            </p>
          </div>
        </div>

        {/* Tiêu chuẩn 1: Góc chụp 45° */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                TIÊU CHUẨN 01
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Góc Nghiêng 45° – 60° (Không Chụp Đứng Vuông Góc 90°)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Nghiêng điện thoại khoảng 45° đến 60° so với mặt đường. Góc nghiêng này cho phép thị giác máy tính nhìn thấy rõ thành vách mép vỡ và chiều sâu lòng hố sụt, phân biệt rạch ròi với một vũng nước mưa bằng phẳng.
              </p>
            </div>

            {/* Sơ đồ hình học SVG góc 45° */}
            <div className="w-full lg:w-72 h-36 bg-slate-950 rounded-2xl p-3 flex items-center justify-center shrink-0 border border-slate-800">
              <svg viewBox="0 0 240 120" className="w-full h-full text-slate-300">
                {/* Mặt đường */}
                <line x1="20" y1="100" x2="220" y2="100" stroke="#475569" strokeWidth="3" />
                {/* Lòng ổ gà */}
                <path d="M 90 100 Q 120 115 150 100" fill="none" stroke="#ef4444" strokeWidth="3" />
                <text x="105" y="118" fill="#ef4444" fontSize="8" fontWeight="bold">Hố sụt</text>
                {/* Vị trí camera */}
                <circle cx="50" cy="30" r="5" fill="#3b82f6" />
                <rect x="42" y="24" width="16" height="12" rx="2" fill="none" stroke="#60a5fa" strokeWidth="2" transform="rotate(-45 50 30)" />
                {/* Tia nhìn 45° */}
                <line x1="55" y1="35" x2="120" y2="105" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
                <text x="75" y="55" fill="#60a5fa" fontSize="9" fontWeight="bold">Tia AI (45°)</text>
                {/* Vòm góc */}
                <path d="M 65 30 A 15 15 0 0 1 61 41" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="70" y="38" fill="#fbbf24" fontSize="8" fontWeight="bold">45°</text>
              </svg>
            </div>
          </div>

          {/* So sánh Đối chiếu Đúng vs Sai */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NÊN: Chụp góc nghiêng 45° thấy mép hố và lòng sâu</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Ống kính hướng chéo giúp AI đo đạc bóng đổ và độ lún thẳng đứng của mặt đường nhựa.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>TRÁNH: Chụp thẳng đứng 90° từ trên đỉnh xuống</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Ảnh nhìn từ trên đỉnh xuống làm hố bị bẹt phẳng, AI dễ nhầm thành vệt nước mưa hoặc vệt sơn tối màu.
              </p>
            </div>
          </div>
        </div>

        {/* Tiêu chuẩn 2: Cự ly 1 – 2 mét */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                TIÊU CHUẨN 02
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Cự Ly Lý Tưởng 1 Đến 2 Mét (Chiếm 40% – 70% Khung Hình)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Đứng cách hư hại khoảng 1 đến 2 mét để hố sụt hoặc vết nứt chiếm từ 40% đến 70% khung hình. Tránh chụp quá xa làm ổ gà lọt thỏm dưới 32 pixel hoặc dí ống kính quá sát làm mất bối cảnh mặt đường.
              </p>
            </div>

            {/* Sơ đồ hình học SVG cự ly */}
            <div className="w-full lg:w-72 h-36 bg-slate-950 rounded-2xl p-3 flex items-center justify-center shrink-0 border border-slate-800">
              <svg viewBox="0 0 240 120" className="w-full h-full text-slate-300">
                {/* Khung máy ảnh */}
                <rect x="25" y="15" width="90" height="90" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="70" cy="60" r="22" fill="#ef4444" opacity="0.3" stroke="#ef4444" strokeWidth="2" />
                <text x="48" y="63" fill="#ffffff" fontSize="9" fontWeight="bold">Ổ gà (55%)</text>
                <text x="32" y="30" fill="#38bdf8" fontSize="8">Khung ảnh 800px</text>
                {/* Mũi tên khoảng cách */}
                <line x1="140" y1="60" x2="210" y2="60" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />
                <text x="145" y="52" fill="#10b981" fontSize="9" fontWeight="bold">Cự ly 1.5m</text>
                <circle cx="215" cy="60" r="4" fill="#10b981" />
                <text x="195" y="78" fill="#94a3b8" fontSize="8">Người chụp</text>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NÊN: Giữ cự ly 1.5m để thấy một phần mặt đường xung quanh</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Mặt đường bao quanh đóng vai trò thước đo đối chứng giúp thuật toán ước lượng chính xác kích thước cm².
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>TRÁNH: Đứng quá xa trên 5m hoặc dí sát dí dính vào đất đá</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Chụp quá xa làm chi tiết vỡ vụn dưới ngưỡng phân giải; chụp quá sát làm mất bối cảnh cấu trúc đường.
              </p>
            </div>
          </div>
        </div>

        {/* Tiêu chuẩn 3: Ánh sáng & Rõ nét */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold font-mono">
              TIÊU CHUẨN 03
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Đủ Ánh Sáng & Giữ Máy Cầm Chắc Chắn (Không Rung Lắc)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mặt đường bê tông nhựa có kết cấu hạt đá li ti. Hình ảnh rõ nét không bị rung tay sẽ giúp mạng nơ-ron nhận biết kết cấu rạn mai rùa (Alligator Cracking) thay vì nhầm thành bóng râm của cành cây.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NÊN: Chụp ban ngày hoặc bật đèn flash trợ sáng vào ban đêm</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Độ tương phản cao giữa màu đen của nhựa đường và mép nứt xám trắng giúp AI bắt vết nứt đạt độ tin cậy trên 95%.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>TRÁNH: Chụp ngược nắng gay gắt hoặc chụp qua kính xe bị nhòe</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Ánh sáng lóa trắng làm mất thông tin chiều sâu; kính xe gạt nước mờ làm giảm độ phân giải thực.
              </p>
            </div>
          </div>
        </div>

        {/* Tiêu chuẩn 4: Bật GPS vị trí */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold font-mono">
              TIÊU CHUẨN 04
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Bật GPS Thiết Bị Hoặc Kéo Ghim Trực Tiếp Trên Bản Đồ Số
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tọa độ GPS giúp hệ thống tự động xác định cung đường quản lý (QL1A, QL21, ĐT494) và giao ngay cho Hạt Quản Lý Đường Bộ phụ trách khu vực đó đến khảo sát trong vòng 24 giờ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NÊN: Bật GPS trên điện thoại để tự động ghim vị trí sai số dưới 5m</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Nếu vị trí chưa chuẩn, bạn hoàn toàn có thể kéo di chuyển ghim đỏ trên bản đồ để khớp với cột mốc km gần nhất.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>TRÁNH: Tắt định vị và không chọn vị trí</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Thiếu tọa độ GPS sẽ khiến phiếu phản ánh bị xếp vào hàng chờ xác minh địa bàn, kéo dài thời gian sửa chữa.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Khối hành động thực hành */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thực Hành Ngay Hôm Nay</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Sẵn Sàng Gửi Bức Ảnh Chuẩn AI Đầu Tiên?
          </h3>
          <p className="text-xs text-blue-100 leading-relaxed">
            Áp dụng góc nghiêng 45° và cự ly 1-2m ngay bây giờ. Bạn sẽ nhận ngay <strong>+10 Điểm uy tín</strong> và nâng hạng huy hiệu trên Bảng Vinh Danh Cộng Đồng!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <Link
            to="/leaderboard"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all text-center"
          >
            Xem Bảng vinh danh
          </Link>
          <Link
            to="/report"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Gửi phản ánh sự cố</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
export default PhotoGuidePage;
