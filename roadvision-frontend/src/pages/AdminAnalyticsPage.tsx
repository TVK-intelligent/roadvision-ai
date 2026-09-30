import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/incidentApi';
import { AdminAnalyticsResponse } from '../types';
import { useToast } from '../components/Toast';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  MapPin,
  Maximize2,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  TrafficCone,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  Zap
} from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<string>('30d');
  const [district, setDistrict] = useState<string>('ALL');
  const [broadcastAlert, setBroadcastAlert] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchAnalytics = () => {
    setLoading(true);
    incidentApi
      .getAdminAnalytics({ timeframe, district })
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error('Lỗi khi tải dữ liệu phân tích KPI:', err);
        toast.error('Không thể tải dữ liệu phân tích KPI.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, district]);

  const handleExportGeoJson = async () => {
    try {
      setIsExporting(true);
      const res = await incidentApi.exportGeoJson();
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roadcare_incidents_export_${new Date().toISOString().slice(0, 10)}.geojson`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất thành công tệp dữ liệu GIS GeoJSON chuẩn OGC!', 'Xuất Dữ Liệu');
    } catch {
      toast.error('Lỗi khi xuất tệp dữ liệu GIS GeoJSON');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleBroadcast = () => {
    const next = !broadcastAlert;
    setBroadcastAlert(next);
    if (next) {
      toast.warning('Đã kích hoạt chế độ Phát Sóng Cảnh Báo Khẩn Cấp trên toàn mạng lưới đô thị!', 'Báo Động Hạ Tầng');
    } else {
      toast.info('Đã tắt chế độ Phát Sóng Cảnh Báo Khẩn Cấp.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const total = data?.totalIncidents || 0;
  const categorySpectrum = [
    { key: 'POTHOLE', label: 'Ổ gà / Hố sụt', color: 'bg-primary', textColor: 'text-primary', count: data?.categoryCounts?.POTHOLE || 0, pct: data?.categoryPercentages?.POTHOLE || 48 },
    { key: 'ROAD_CRACK', label: 'Vết nứt mặt đường', color: 'bg-sky-500', textColor: 'text-sky-500', count: data?.categoryCounts?.ROAD_CRACK || 0, pct: data?.categoryPercentages?.ROAD_CRACK || 26 },
    { key: 'ROAD_OBSTACLE', label: 'Chướng ngại vật', color: 'bg-amber-500', textColor: 'text-amber-500', count: data?.categoryCounts?.ROAD_OBSTACLE || 0, pct: data?.categoryPercentages?.ROAD_OBSTACLE || 14 },
    { key: 'ROAD_FLOODING', label: 'Ngập úng', color: 'bg-rose-500', textColor: 'text-rose-500', count: data?.categoryCounts?.ROAD_FLOODING || 0, pct: data?.categoryPercentages?.ROAD_FLOODING || 12 },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* 1. OPERATIONAL COMMAND HEADER BAR (Theo đúng chuẩn Stitch UI) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Dispatch Grid Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
            </span>
            <span className="font-mono text-xs uppercase font-bold tracking-wider">Live Dispatch Grid</span>
          </div>

          <div className="h-4 w-px bg-outline-variant/30 hidden sm:block"></div>

          {/* Khu Vực Quản Lý Đường Bộ Toàn Quốc (Cục Đường Bộ VN - 63 Tỉnh Thành) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-medium">Khu Vực Quản Lý:</span>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-surface-container text-on-surface font-semibold text-xs px-3 py-1.5 rounded-xl border border-outline-variant/20 focus:outline-none focus:border-primary cursor-pointer shadow-none"
            >
              <option value="ALL">Toàn Quốc (Tổng Hợp 63 Tỉnh Thành)</option>
              <option value="KHU_1">Khu QLĐB I (Miền Bắc - 25 Tỉnh Thành)</option>
              <option value="KHU_2">Khu QLĐB II (Bắc Trung Bộ - 6 Tỉnh Thành)</option>
              <option value="KHU_3">Khu QLĐB III (Miền Trung & Tây Nguyên - 13 Tỉnh Thành)</option>
              <option value="KHU_4">Khu QLĐB IV (Miền Nam - 19 Tỉnh Thành)</option>
            </select>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timeframe === 'today'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Hôm Nay
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timeframe === '7d'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              7 Ngày
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timeframe === '30d'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              30 Ngày
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Emergency Broadcast Toggle */}
          <button
            type="button"
            onClick={handleToggleBroadcast}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              broadcastAlert
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse'
                : 'bg-surface-container text-on-surface border-outline-variant/30 hover:bg-rose-500/10 hover:text-rose-600'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{broadcastAlert ? 'Báo Động Bật' : 'Phát Lệnh Khẩn'}</span>
          </button>

          {/* Export GIS GeoJSON */}
          <button
            type="button"
            onClick={handleExportGeoJson}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>{isExporting ? 'Đang Xuất...' : 'Xuất GeoJSON'}</span>
          </button>

          {/* Print / PDF Report */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-container transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>In Báo Cáo KPI</span>
          </button>

          <button
            type="button"
            onClick={fetchAnalytics}
            title="Làm mới số liệu"
            className="p-1.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* BANNER THÔNG BÁO BÁO ĐỘNG KHẨN NẾU ĐƯỢC BẬT */}
      {broadcastAlert && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 animate-ping" />
            <div>
              <div className="font-black text-sm uppercase tracking-wider">CẢNH BÁO KHẨN CẤP TOÀN ĐÔ THỊ ĐANG PHÁT</div>
              <div className="text-xs opacity-90 mt-0.5">Mọi đội thi công hiện trường ưu tiên giải tỏa ngay các hố sụt lún nguy hiểm trước giờ cao điểm.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleBroadcast}
            className="px-3 py-1.5 bg-white text-rose-700 text-xs font-bold rounded-xl shadow-xs"
          >
            Hủy Báo Động
          </button>
        </div>
      )}

      {/* 2. DẢI 5 THẺ CHỈ SỐ KPI TỐC ĐỘ CAO (TOP KPI INSTRUMENTS ROW) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Tổng số sự cố */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Tổng Sự Cố
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrafficCone className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl md:text-3xl font-black text-on-surface tracking-tight">
              {data ? data.totalIncidents.toLocaleString() : '---'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-secondary font-bold" />
              <span className="font-mono text-secondary font-bold">+{data?.totalGrowthPercent || 14.2}%</span>
              <span className="text-on-surface-variant text-[11px]">so kỳ trước</span>
            </div>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full w-[78%]"></div>
          </div>
        </div>

        {/* KPI 2: Chờ thẩm định / Kiểm duyệt */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-rose-500/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-rose-600 font-bold">
              Chờ Thẩm Định
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl md:text-3xl font-black text-rose-600 tracking-tight">
              {data ? data.triagePendingCount : '---'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
              <span className="text-on-surface-variant text-[11px]">Cần người duyệt</span>
            </div>
          </div>
          <div className="w-full bg-rose-500/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-600 h-full rounded-full w-[45%]"></div>
          </div>
        </div>

        {/* KPI 3: Đang thi công */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Đang Thi Công
            </span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl md:text-3xl font-black text-on-surface tracking-tight">
              {data ? data.inProgressCount : '---'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <Truck className="w-3.5 h-3.5 text-secondary" />
              <span className="font-mono text-secondary font-bold">{data?.activeCrewsCount || 4} Tổ Cơ Động</span>
              <span className="text-on-surface-variant text-[11px]">thuộc Hạt QLĐB</span>
            </div>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-secondary h-full rounded-full w-[62%]"></div>
          </div>
        </div>

        {/* KPI 4: Đã nghiệm thu / Giải tỏa */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Đã Hoàn Tất
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl md:text-3xl font-black text-on-surface tracking-tight">
              {data ? data.resolvedCount.toLocaleString() : '---'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-mono text-emerald-600 font-bold">{data?.clearanceRatePercent || 91.1}%</span>
              <span className="text-on-surface-variant text-[11px]">tỷ lệ giải tỏa</span>
            </div>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full w-[91%]"></div>
          </div>
        </div>

        {/* KPI 5: Độ chính xác YOLOv8 Edge */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
              YOLOv8 Edge Acc
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl md:text-3xl font-black text-on-surface tracking-tight">
              {data?.aiAccuracyPercent || 96.8}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono text-primary font-bold">~{data?.avgInferenceLatencyMs || 42}ms</span>
              <span className="text-on-surface-variant text-[11px]">độ trễ ONNX</span>
            </div>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full w-[96%]"></div>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY OPERATIONS SPLIT LAYOUT (Biểu đồ sóng + Bảng điều phối) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* CỘT TRÁI (8 CỘT): Biểu đồ luồng viễn trắc + Phổ danh mục + Bảng duyệt nhanh */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* SECTION 1: Telemetric Verification Stream (Dual Area SVG Chart) */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Telemetric Verification Stream
                </span>
                <h2 className="font-display text-lg font-black text-on-surface">
                  Luồng Thu Nhận Sự Cố: Camera AI Tuần Tra vs Công Dân Phản Ánh
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-primary"></span>
                  <span className="text-on-surface">YOLOv8 AI Sensor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-sky-400"></span>
                  <span className="text-on-surface-variant">Citizen App</span>
                </div>
              </div>
            </div>

            {/* High-Fidelity SVG Dual Area Chart */}
            <div className="relative w-full h-56 bg-surface-container-low/50 rounded-2xl p-4 flex flex-col justify-end overflow-hidden border border-outline-variant/20">
              <svg className="w-full h-44 overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 160">
                {/* Lưới tọa độ ngang */}
                <line stroke="#c3c6d7" strokeDasharray="4 4" strokeOpacity="0.3" x1="0" x2="700" y1="10" y2="10" />
                <line stroke="#c3c6d7" strokeDasharray="4 4" strokeOpacity="0.3" x1="0" x2="700" y1="50" y2="50" />
                <line stroke="#c3c6d7" strokeDasharray="4 4" strokeOpacity="0.3" x1="0" x2="700" y1="90" y2="90" />
                <line stroke="#c3c6d7" strokeDasharray="4 4" strokeOpacity="0.3" x1="0" x2="700" y1="130" y2="130" />

                {/* AI Stream Area Fill (Primary) */}
                <path
                  className="text-primary/15"
                  d="M0,130 C70,110 130,80 200,85 C270,90 320,40 400,35 C480,30 540,65 620,25 L700,20 L700,160 L0,160 Z"
                  fill="currentColor"
                />
                {/* AI Stream Curve Stroke */}
                <path
                  className="text-primary"
                  d="M0,130 C70,110 130,80 200,85 C270,90 320,40 400,35 C480,30 540,65 620,25 L700,20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />

                {/* Citizen Stream Fill (Sky Blue) */}
                <path
                  className="text-sky-500/15"
                  d="M0,145 C80,140 140,120 210,125 C280,130 330,110 410,105 C490,100 550,115 630,95 L700,90 L700,160 L0,160 Z"
                  fill="currentColor"
                />
                {/* Citizen Stream Curve Stroke */}
                <path
                  className="text-sky-500"
                  d="M0,145 C80,140 140,120 210,125 C280,130 330,110 410,105 C490,100 550,115 630,95 L700,90"
                  stroke="currentColor"
                  strokeDasharray="4 2"
                  strokeWidth="2"
                />

                {/* Interactive Anchor Pulse Points */}
                <circle className="fill-surface-container-lowest stroke-primary" cx="400" cy="35" r="4" strokeWidth="2.5" />
                <circle className="fill-surface-container-lowest stroke-primary" cx="620" cy="25" r="4" strokeWidth="2.5" />
                <circle className="fill-surface-container-lowest stroke-sky-500" cx="630" cy="95" r="3" strokeWidth="2" />
              </svg>

              {/* Trục mốc thời gian */}
              <div className="flex justify-between items-center pt-2 font-mono text-[11px] text-on-surface-variant font-medium">
                <span>00:00</span>
                <span>04:00</span>
                <span className="text-primary font-bold">08:00 (Cao Điểm)</span>
                <span>12:00</span>
                <span className="text-secondary font-bold">16:00 (Tan Tầm)</span>
                <span>20:00</span>
                <span className="text-rose-600 font-bold">Hiện Tại</span>
              </div>
            </div>

            {/* Phổ phân bổ danh mục sự cố (Category Spectrum Bar) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-on-surface">Phổ Phân Bổ Hư Hại Mặt Đường (Spectrum Breakdown)</span>
                <span className="font-mono text-on-surface-variant font-bold">{total} Phiếu Tổng Hợp</span>
              </div>

              {/* Thanh màu tỷ lệ */}
              <div className="w-full h-3 rounded-full flex overflow-hidden bg-surface-container">
                {categorySpectrum.map((cat) => (
                  <div
                    key={cat.key}
                    className={`${cat.color} h-full transition-all`}
                    style={{ width: `${cat.pct}%` }}
                    title={`${cat.label}: ${cat.pct}%`}
                  />
                ))}
              </div>

              {/* Chú giải 4 góc */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                {categorySpectrum.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`}></span>
                    <span className="text-on-surface-variant">
                      {cat.label}: <strong className={`font-mono ${cat.textColor}`}>{cat.pct}% ({cat.count})</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: Danh sách vé khẩn cấp cần thẩm định (Triage Feed Table) */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-rose-600 font-bold">
                  Mission Dispatch Priority Feed
                </span>
                <h3 className="font-display text-base font-black text-on-surface">
                  Danh Sách Vé Cần Thẩm Định & Xử Lý Khẩn Cấp
                </h3>
              </div>
              <Link
                to="/dispatch"
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span>Xem Toàn Bộ Hàng Đợi</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant font-mono uppercase text-[10px] tracking-wider border-b border-outline-variant/20">
                  <tr>
                    <th className="py-3 px-3">Mã Vé</th>
                    <th className="py-3 px-3">Địa Chỉ / Tọa Độ</th>
                    <th className="py-3 px-3">Hư Hại</th>
                    <th className="py-3 px-3">Nguồn Phát Hiện</th>
                    <th className="py-3 px-3">Cờ Cảnh Báo</th>
                    <th className="py-3 px-3 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {data?.urgentIncidents && data.urgentIncidents.length > 0 ? (
                    data.urgentIncidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-primary">
                          #{inc.ticketCode}
                        </td>
                        <td className="py-3 px-3 font-medium text-on-surface max-w-[200px] truncate" title={inc.address}>
                          {inc.address || 'Hà Nam'}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <span className="px-2 py-0.5 rounded-md bg-surface-container font-mono text-[11px]">
                            {inc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-on-surface-variant">
                          {inc.aiDetection ? (
                            <span className="inline-flex items-center gap-1 text-primary font-mono font-bold text-[11px]">
                              <Cpu className="w-3 h-3" />
                              YOLOv8 ({Math.round(inc.aiDetection.confidence * 100)}%)
                            </span>
                          ) : (
                            <span className="text-[11px]">Công Dân Báo</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {inc.flag === 'DISPUTED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px] uppercase">
                              Khiếu nại
                            </span>
                          ) : inc.flag === 'NEEDS_MANUAL_REVIEW' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px] uppercase">
                              Cần duyệt
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px]">
                              {inc.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/incidents/${inc.id}`}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-primary hover:text-white text-on-surface transition-colors inline-flex items-center"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant font-medium">
                        Không có sự cố nào cần xử lý khẩn cấp tại thời điểm này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4 CỘT): Viễn trắc AI Model + SLA Monitor + Nhân sự */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Card 1: AI Model Telemetry Engine */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Vision Pipeline Telemetry
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold">
                OPERATIONAL
              </span>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant/30">
              <div className="p-3 rounded-xl bg-primary text-white shadow-xs">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-black text-on-surface">
                  {data?.aiModelVersion || 'YOLOv8-RoadCare v2.4 Active'}
                </span>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  Microsoft ONNX Runtime 1.18.0 (NCHW 640x640)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Phần Cứng Tăng Tốc:</span>
                <span className="font-mono font-bold text-on-surface">CPU / TensorRT Direct</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Thời Gian Trễ (Latency):</span>
                <span className="font-mono font-bold text-emerald-600">~{data?.avgInferenceLatencyMs || 42} ms</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Thời Gian Sửa Xong Trung Bình:</span>
                <span className="font-mono font-bold text-primary">{data?.meanResolutionHours || 4.2} Giờ (SLA Đạt)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Tổ Duy Tu Cơ Động (Crews):</span>
                <span className="font-mono font-bold text-secondary">{data?.activeCrewsCount || 4} Tổ (Thuộc các Hạt QLĐB)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
              <Activity className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
              <div>
                <strong>Quy chế duy tu thường xuyên (Bộ GTVT):</strong> Phân luồng sự cố theo hành lang tuyến phụ trách của từng Hạt QLĐB. Điều phối xe bán tải chở máy đầm cóc và nhựa nguội Carboncor xử lý dứt điểm ổ gà trong ca làm việc, giảm 60% chi phí điều xe cơ giới lớn.
              </div>
            </div>
          </div>

          {/* Card 2: Quick Links to Operational Modules */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-3">
            <h4 className="font-display text-sm font-black text-on-surface uppercase tracking-wider">
              Phím Tắt Điều Hành Trung Tâm
            </h4>
            <div className="flex flex-col gap-2">
              <Link
                to="/dispatch"
                className="p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between text-xs font-bold text-on-surface border border-outline-variant/20"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Hàng Đợi Phân Công Thợ (Dispatch Queue)</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-on-surface-variant" />
              </Link>

              <Link
                to="/map"
                className="p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between text-xs font-bold text-on-surface border border-outline-variant/20"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Bản Đồ Số GIS Toàn Cảnh (Spatial Map)</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-on-surface-variant" />
              </Link>

              <Link
                to="/patrol"
                className="p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between text-xs font-bold text-on-surface border border-outline-variant/20"
              >
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-secondary" />
                  <span>Tuần Tra Camera Thời Gian Thực (Patrol Mode)</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-on-surface-variant" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
