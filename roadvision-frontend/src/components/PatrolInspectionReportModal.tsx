import React from 'react';
import { PatrolSession } from '../services/patrolApi';
import { Printer, X, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface PatrolInspectionReportModalProps {
  session: PatrolSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PatrolInspectionReportModal: React.FC<PatrolInspectionReportModalProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !session) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('vi-VN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Thanh công cụ Modal (Không in) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Biên Bản Kỹ Thuật Tuần Tra Tuyến Đường (Chuẩn Bộ GTVT)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Biên Bản / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Biên bản (Được in ra chuẩn giấy A4) */}
        <div id="printable-patrol-report" className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
          {/* 1. Quốc hiệu & Tiêu ngữ */}
          <div className="flex flex-col items-center text-center pb-6 border-b-2 border-slate-900 dark:border-slate-300">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </div>
            <div className="font-semibold text-xs text-slate-600 dark:text-slate-400">
              Độc lập - Tự do - Hạnh phúc
            </div>
            <div className="w-28 h-0.5 bg-slate-400 mt-1 mb-4"></div>

            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-mono">
              HỆ THỐNG GIÁM SÁT & QUẢN LÝ HẠ TẦNG GIAO THÔNG ĐÔ THỊ ROADVISION AI
            </div>
            <h1 className="text-xl font-bold uppercase mt-1 tracking-tight text-slate-950 dark:text-white">
              BIÊN BẢN KẾT QUẢ TUẦN TRA ĐƯỜNG BỘ
            </h1>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Số: <span className="font-bold text-blue-600 dark:text-blue-400">{session.sessionCode}</span> | Ngày lập: {formattedDate}
            </div>
          </div>

          {/* 2. Thông tin chung về chuyến tuần tra */}
          <div className="mt-6 space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase mb-2.5">
                I. THÔNG TIN CHUYẾN TUẦN TRA
              </h2>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Tuyến đường tuần tra:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{session.routeName}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Nhân viên tuần tra:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {session.inspectorName || 'Kỹ thuật viên tuần tra'} ({session.inspectorEmail || 'staff@roadcare.gov.vn'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Tọa độ GPS điểm đầu:</span>{' '}
                  <span className="font-mono font-semibold">
                    {session.startLatitude ? `${session.startLatitude}, ${session.startLongitude}` : 'Đang cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Tọa độ GPS điểm cuối:</span>{' '}
                  <span className="font-mono font-semibold">
                    {session.endLatitude ? `${session.endLatitude}, ${session.endLongitude}` : 'Đang cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Quãng đường ghi nhận:</span>{' '}
                  <span className="font-semibold">{session.totalDistanceKm || 1.2} km</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Mã Hồ sơ Điều phối (Incident):</span>{' '}
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {session.incidentTicketCode || 'Đang tạo'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Kết quả AI nhận diện & Đánh giá kỹ thuật */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase mb-2.5">
                II. KẾT QUẢ NHẬN DIỆN MÔ HÌNH AI & ĐÁNH GIÁ MẶT ĐƯỜNG
              </h2>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Tổng số ổ gà / hư hại phát hiện:</span>{' '}
                  <span className="font-bold text-base text-rose-600 dark:text-rose-400">
                    {session.totalPotholesDetected} vị trí
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Đánh giá chất lượng tuyến:</span>{' '}
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    session.routeHealthRating === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : session.routeHealthRating === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {session.routeHealthRating === 'CRITICAL'
                      ? 'NGUY HIỂM (Xuống cấp nặng)'
                      : session.routeHealthRating === 'HIGH'
                      ? 'CẦN DUY TU SỚM'
                      : 'TRUNG BÌNH (Theo dõi)'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400">Tình trạng đối chiếu trùng lặp với người dân:</span>{' '}
                  {session.hasNearbyDuplicate ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Đã phát hiện phản ánh [{session.duplicateTicketCode}] lân cận trong bán kính {session.duplicateDistanceMeters}m (Đã tự động liên kết)
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Không có phản ánh trùng lặp (Tuyến đường mới ghi nhận)
                    </span>
                  )}
                </div>
                {session.notes && (
                  <div className="col-span-2 text-slate-600 dark:text-slate-300 italic">
                    Ghi chú: {session.notes}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Hình ảnh Keyframe trích xuất từ camera AI */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase mb-2.5">
                III. HÌNH ẢNH HIỆN TRƯỜNG TIÊU BIỂU TỪ CAMERA HÀNH TRÌNH
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {session.keyframeUrl1 ? (
                  <div className="flex flex-col gap-1">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                      <img
                        src={session.keyframeUrl1}
                        alt="Ảnh hiện trường tiêu biểu 1"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-center text-slate-500">
                      Ảnh tiêu biểu số 1 (Độ nét cao nhất)
                    </span>
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    Chưa có ảnh keyframe 1
                  </div>
                )}

                {session.keyframeUrl2 ? (
                  <div className="flex flex-col gap-1">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                      <img
                        src={session.keyframeUrl2}
                        alt="Ảnh hiện trường tiêu biểu 2"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-center text-slate-500">
                      Ảnh tiêu biểu số 2
                    </span>
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700">
                    Không có ảnh phụ
                  </div>
                )}
              </div>
            </div>

            {/* 5. Chữ ký xác nhận */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs">
              <div>
                <div className="font-bold uppercase text-slate-800 dark:text-slate-200">
                  NHÂN VIÊN TUẦN TRA
                </div>
                <div className="text-[10px] text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {session.inspectorName || 'Kỹ thuật viên tuần tra'}
                </div>
              </div>
              <div>
                <div className="font-bold uppercase text-slate-800 dark:text-slate-200">
                  CÁN BỘ ĐIỀU PHỐI / DUYỆT
                </div>
                <div className="text-[10px] text-slate-500 italic mb-14">(Ký, đóng dấu duyệt phương án)</div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  KS. Nguyễn Thị Phương Mai
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
