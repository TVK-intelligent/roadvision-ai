import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Cột 1: Thông tin hệ thống */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 text-sm leading-tight">RoadVision</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Hệ thống Quản lý & Giám sát Hạ tầng Giao thông</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md">
              Nền tảng tiếp nhận phản ánh hư hỏng mặt đường, tự động phân tích hiện trường và hỗ trợ điều phối lực lượng duy tu bảo dưỡng trên không gian bản đồ số GIS.
            </p>
          </div>

          {/* Cột 2: Điều hướng nhanh */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
              Chức năng công khai
            </span>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-600">
              <li>
                <Link to="/" className="hover:text-blue-600 transition-colors">
                  Tổng quan hệ thống
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-blue-600 transition-colors">
                  Bản đồ số GIS
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-blue-600 transition-colors">
                  Gửi phản ánh sự cố
                </Link>
              </li>
              <li>
                <Link to="/patrol" className="hover:text-blue-600 transition-colors">
                  Tuần tra video trực tuyến
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Quản trị & Nghiệp vụ */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
              Khu vực nghiệp vụ
            </span>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-600">
              <li>
                <Link to="/dispatch" className="hover:text-blue-600 transition-colors">
                  Điều phối hiện trường (Admin)
                </Link>
              </li>
              <li>
                <Link to="/tasks" className="hover:text-blue-600 transition-colors">
                  Nhiệm vụ kỹ thuật (Kỹ thuật viên)
                </Link>
              </li>
              <li>
                <Link to="/my-reports" className="hover:text-blue-600 transition-colors">
                  Lịch sử phản ánh (Người dân)
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="hover:text-blue-600 transition-colors">
                  Báo cáo thống kê & KPI
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Dải chân trang bản quyền */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>© 2026 RoadVision. Hệ thống quản lý hạ tầng giao thông đô thị.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Tiêu chuẩn TCCS đường bộ</span>
            <span>•</span>
            <span>Không gian GIS WGS-84</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
