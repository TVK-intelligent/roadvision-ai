import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Cpu, MapPin, Activity, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Cột 1: Thông tin hệ thống */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-base font-bold text-on-surface leading-tight">RoadVision</span>
                <span className="font-mono text-[9px] text-primary uppercase tracking-wider font-semibold">AI INFRASTRUCTURE PLATFORM</span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-md">
              Hệ thống quản lý, giám sát và điều phối khắc phục hư hại hạ tầng giao thông đô thị tự động hóa dựa trên Thị giác máy tính đa lớp YOLOv8 và Bản đồ số GIS không gian.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>TELEMETRY ONLINE</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>ONNX Runtime 1.20</span>
              </div>
            </div>
          </div>

          {/* Cột 2: Điều hướng nhanh */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
              Khám Phá
            </span>
            <ul className="flex flex-col gap-2 text-xs text-on-surface-variant">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Trang Chủ & Tổng Quan
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-primary transition-colors">
                  Bản Đồ Không Gian GIS
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-primary transition-colors">
                  Báo Cáo Sự Cố 1-Chạm
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Quản trị & Nghiệp vụ */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
              Nghiệp Vụ
            </span>
            <ul className="flex flex-col gap-2 text-xs text-on-surface-variant">
              <li>
                <Link to="/dispatch" className="hover:text-primary transition-colors">
                  Hàng Đợi Điều Phối (Admin)
                </Link>
              </li>
              <li>
                <Link to="/tasks" className="hover:text-primary transition-colors">
                  Nhiệm Vụ Kỹ Thuật (Staff)
                </Link>
              </li>
              <li>
                <Link to="/my-reports" className="hover:text-primary transition-colors">
                  Lịch Sử Phản Ánh (Citizen)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Dải chân trang bản quyền */}
        <div className="pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span>© 2026 RoadVision. Đồ án tốt nghiệp Kỹ sư CNTT.</span>
          </div>
          <div className="font-mono text-[11px] text-on-surface-variant flex items-center gap-3">
            <span>YOLOv8-RoadCare 4-Class</span>
            <span>•</span>
            <span>Leaflet Spatial GIS</span>
            <span>•</span>
            <span>Spring Boot 3</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
