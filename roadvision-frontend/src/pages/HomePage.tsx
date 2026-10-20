import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  ArrowRight,
  Map,
  Wrench,
  ShieldAlert,
  FileText,
  ChevronRight,
  AlertCircle,
  Activity,
  Droplets,
  Box,
  Compass,
  HardHat,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    incidentApi
      .getPublicStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-12 pt-2">
      {/* Hero Section */}
      <section className="rounded-lg bg-white p-6 md:p-10 border border-slate-200 shadow-xs">
        <div className="max-w-3xl flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium self-start border border-slate-200">
            <span>Hệ thống Giám sát & Quản lý Hạ tầng Đô thị</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
            Giám sát và điều phối xử lý sự cố mặt đường đô thị
          </h1>

          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Nền tảng tiếp nhận phản ánh hư hại mặt đường từ người dân và tuần tra thực địa, tự động phân tích dữ liệu hình ảnh, định vị tọa độ GIS và hỗ trợ điều phối lực lượng duy tu bảo dưỡng.
          </p>

          {/* Các nút hành động chính theo phân quyền */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs"
            >
              <span>Gửi phản ánh sự cố</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors border border-slate-300 shadow-xs"
            >
              <Map className="w-4 h-4 text-slate-500" />
              <span>Bản đồ số GIS</span>
            </Link>

            {user?.role === 'ROLE_ADMIN' && (
              <Link
                to="/dispatch"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition-colors border border-slate-200"
              >
                <ShieldAlert className="w-4 h-4 text-slate-600" />
                <span>Hàng đợi điều phối</span>
              </Link>
            )}

            {user?.role === 'ROLE_STAFF' && (
              <>
                <Link
                  to="/inspection-tasks"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <Compass className="w-4 h-4 text-teal-600" />
                  <span>Khảo sát hiện trường</span>
                </Link>
                <Link
                  to="/construction-tasks"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <HardHat className="w-4 h-4 text-amber-600" />
                  <span>Thi công sửa chữa</span>
                </Link>
              </>
            )}

            {user?.role === 'ROLE_CITIZEN' && (
              <Link
                to="/my-reports"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition-colors border border-slate-200"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Lịch sử phản ánh</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Chỉ số vận hành KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Sự cố đang xử lý</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats ? `${stats.inProgressCount ?? 0} điểm` : '---'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Tỷ lệ giải tỏa mặt đường</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats ? `${stats.clearanceRatePercent ?? 0}%` : '---'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Đội duy tu trực chiến</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats ? `${stats.activeDispatches ?? 0} tổ đội` : '---'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Thời gian xử lý TB</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.meanResolutionSpeed || '---'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Danh mục phân loại hư hại mặt đường theo quy chuẩn */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Phân loại hư hại mặt đường theo quy chuẩn kỹ thuật
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Các nhóm sự cố được hệ thống tự động nhận diện và gán độ ưu tiên xử lý
            </p>
          </div>
          <Link
            to="/map"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Xem trên bản đồ</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'POTHOLE',
              code: 'POTH-01',
              title: 'Ổ gà, sụt lún',
              desc: 'Hố trũng sâu, sụt mép đường nhựa, miệng hố gây nguy cơ mất an toàn giao thông.',
              icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
              badge: 'bg-rose-50 text-rose-700 border border-rose-200',
            },
            {
              id: 'ROAD_CRACK',
              code: 'CRK-02',
              title: 'Vết nứt mặt đường',
              desc: 'Nứt chân chim, nứt rạn mai rùa hoặc nứt khe co giãn làm ngấm nước phá hỏng kết cấu.',
              icon: <Activity className="w-5 h-5 text-amber-600" />,
              badge: 'bg-amber-50 text-amber-700 border border-amber-200',
            },
            {
              id: 'ROAD_FLOODING',
              code: 'FLD-03',
              title: 'Điểm ngập úng',
              desc: 'Vùng đọng nước cục bộ, nước tràn mặt đường cản trở phương tiện lưu thông an toàn.',
              icon: <Droplets className="w-5 h-5 text-blue-600" />,
              badge: 'bg-blue-50 text-blue-700 border border-blue-200',
            },
            {
              id: 'ROAD_OBSTACLE',
              code: 'OBS-04',
              title: 'Chướng ngại vật',
              desc: 'Vật thể rơi vãi, rào chắn hỏng, đất đá sạt lở hoặc nắp hố ga mất nắp trên tuyến đường.',
              icon: <Box className="w-5 h-5 text-slate-600" />,
              badge: 'bg-slate-100 text-slate-700 border border-slate-200',
            },
          ].map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${item.badge}`}>
                  {item.code}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-sm text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quy trình quản lý bảo trì 7 giai đoạn chuẩn */}
      <section className="bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Quy trình quản lý bảo trì đường bộ 7 giai đoạn chuẩn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình phối hợp khép kín từ tiếp nhận hiện trường, phân tích AI, khảo sát đo đạc đến nghiệm thu bàn giao
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { step: '01', title: 'Gửi phản ánh', desc: 'Tiếp nhận ảnh hiện trường và tọa độ GPS định vị chính xác.' },
            { step: '02', title: 'AI phân tích', desc: 'Mô hình RoadVision quét phát hiện hư hỏng tự động.' },
            { step: '03', title: 'Phân loại', desc: 'Thẩm định hồ sơ, xác định tính hợp lệ và độ ưu tiên.' },
            { step: '04', title: 'Khảo sát', desc: 'Tổ kỹ thuật đo đạc kích thước thực địa, đề xuất phương án.' },
            { step: '05', title: 'Giao tổ đội', desc: 'Điều phối tổ thi công kèm vật tư và hạn hoàn thành.' },
            { step: '06', title: 'Thi công', desc: 'Thực hiện sửa chữa, chụp ảnh hoàn thành và quét AI.' },
            { step: '07', title: 'Nghiệm thu', desc: 'Đánh giá chất lượng xử lý, đối chiếu Trước/Sau và đóng hồ sơ.' },
          ].map((phase, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <span className="text-xs font-mono font-bold text-blue-600">{phase.step}</span>
              <h4 className="font-semibold text-xs text-slate-900">{phase.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{phase.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
