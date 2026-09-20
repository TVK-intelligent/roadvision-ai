import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Sparkles,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  ArrowRight,
  Map,
  Wrench,
  ShieldAlert,
  FileText,
  Layers,
  Cpu,
  ChevronRight,
  Activity,
  Zap
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, any>>({
    aiConfidenceMedian: '96.8%',
    activeDispatches: 38,
    meanResolutionSpeed: '4.2 Giờ',
    activeVisionModel: 'YOLOv8-RoadCare v2.4 Active',
  });

  useEffect(() => {
    incidentApi
      .getPublicStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-8 md:p-14 border border-outline-variant/30 shadow-xs mt-3">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold self-start border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            NỀN TẢNG THỊ GIÁC MÁY TÍNH HẠ TẦNG GIAO THÔNG ĐÔ THỊ
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-black text-on-surface tracking-tight leading-tight">
            Giám Sát & Điều Phối Xử Lý Sự Cố Mặt Đường Thông Minh
          </h1>

          <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
            Hệ thống RoadVision ứng dụng mô hình AI đa lớp YOLOv8 nhúng trực tiếp qua ONNX Runtime, tự động phân tích hiện trường (ổ gà, vết nứt, ngập úng, chướng ngại vật) và điều phối đội bảo dưỡng xử lý theo quy trình 5 pha khép kín.
          </p>

          {/* Các nút hành động thông minh theo Role */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-on-primary font-bold text-xs shadow-sm hover:bg-primary-container transition-all hover:scale-[1.02]"
            >
              <span>Báo Cáo Sự Cố Mặt Đường</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface-container text-on-surface font-bold text-xs hover:bg-surface-container-high transition-colors border border-outline-variant/30"
            >
              <Map className="w-4 h-4 text-primary" />
              <span>Bản Đồ Số GIS</span>
            </Link>

            {user?.role === 'ROLE_ADMIN' && (
              <Link
                to="/dispatch"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-500/10 text-rose-600 font-bold text-xs hover:bg-rose-500/20 transition-colors border border-rose-500/30"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Hàng Đợi Điều Phối</span>
              </Link>
            )}

            {user?.role === 'ROLE_STAFF' && (
              <Link
                to="/tasks"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary/10 text-secondary font-bold text-xs hover:bg-secondary/20 transition-colors border border-secondary/30"
              >
                <Wrench className="w-4 h-4" />
                <span>Nhiệm Vụ Kỹ Thuật</span>
              </Link>
            )}

            {user?.role === 'ROLE_CITIZEN' && (
              <Link
                to="/my-reports"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-500/10 text-blue-600 font-bold text-xs hover:bg-blue-500/20 transition-colors border border-blue-500/30"
              >
                <FileText className="w-4 h-4" />
                <span>Lịch Sử Phản Ánh</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Dải chỉ số viễn trắc (Telemetry Metrics Strip) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Sự Cố Cần Xử Lý</span>
            <div className="font-display text-2xl font-black text-rose-600 mt-1">14 Điểm</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Độ Tin Cậy AI</span>
            <div className="font-display text-2xl font-black text-primary mt-1">{stats.aiConfidenceMedian}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Đội Kỹ Thuật Trực Chiến</span>
            <div className="font-display text-2xl font-black text-secondary mt-1">{stats.activeDispatches} Đội</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Thời Gian Xử Lý TB</span>
            <div className="font-display text-2xl font-black text-emerald-600 mt-1">{stats.meanResolutionSpeed}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Showcase 4 Danh Mục Sự Cố AI Nhận Diện */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              MÔ HÌNH THỊ GIÁC ĐA LỚP YOLOV8-ROADCARE
            </div>
            <h2 className="font-display text-xl font-black text-on-surface mt-0.5">
              4 Nhóm Sự Cố Hạ Tầng Tự Động Định Danh
            </h2>
          </div>
          <Link
            to="/map"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Xem trên bản đồ</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'POTHOLE',
              code: 'LỚP 0',
              title: 'Ổ Gà / Hố Sụt',
              desc: 'Hố trũng sâu, sụt lún mép đường nhựa, miệng hố nguy cơ lật xe và tai nạn.',
              color: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400',
              badge: 'bg-rose-500/15 text-rose-700',
              icon: '🕳️',
            },
            {
              id: 'ROAD_CRACK',
              code: 'LỚP 1',
              title: 'Vết Nứt Mặt Đường',
              desc: 'Nứt chân chim, nứt rạn mai rùa, nứt khe co giãn làm ngấm nước phá hỏng nền đường.',
              color: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              badge: 'bg-amber-500/15 text-amber-700',
              icon: '⚡',
            },
            {
              id: 'ROAD_FLOODING',
              code: 'LỚP 2',
              title: 'Điểm Ngập Úng',
              desc: 'Vùng nước đọng sâu ngập bánh xe, nước tràn mặt đường cản trở phương tiện lưu thông.',
              color: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400',
              badge: 'bg-blue-500/15 text-blue-700',
              icon: '🌊',
            },
            {
              id: 'ROAD_OBSTACLE',
              code: 'LỚP 3',
              title: 'Chướng Ngại Vật',
              desc: 'Két nhựa, thùng xốp, rào chắn, cọc tiêu, đất đá sạt lở hoặc nắp cống rơi mất.',
              color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
              badge: 'bg-emerald-500/15 text-emerald-700',
              icon: '📦',
            },
          ].map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border ${item.color} shadow-xs flex flex-col justify-between gap-4 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${item.badge}`}>
                  {item.code}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-sm text-on-surface">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quy trình 5 Pha Khép Kín */}
      <section className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col gap-6">
        <div>
          <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            CLOSED-LOOP INCIDENT LIFECYCLE
          </span>
          <h2 className="font-display text-2xl font-black text-on-surface mt-1">
            Quy Trình 5 Pha Quản Trị Khép Kín
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Phản Ánh Dân Sinh', desc: 'Chụp ảnh hiện trường, tự động ghim tọa độ GPS.' },
            { step: '02', title: 'AI Quét Tức Thời', desc: 'YOLOv8 On-Device quét bounding box và dự báo mức độ.' },
            { step: '03', title: 'Điều Phối Trung Tâm', desc: 'Ban Quản Lý thẩm định và chỉ định đội kỹ thuật.' },
            { step: '04', title: 'Thi Công & Nghiệm Thu', desc: 'Hiện trường xử lý, chụp ảnh hoàn thành (Proof of Work).' },
            { step: '05', title: 'Đánh Giá & Đóng Hồ Sơ', desc: 'Người dân chấm sao hài lòng, lưu vết dữ liệu viễn trắc.' },
          ].map((phase, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20">
              <span className="font-mono text-xs font-black text-primary">{phase.step}</span>
              <h4 className="font-bold text-xs text-on-surface">{phase.title}</h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">{phase.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
