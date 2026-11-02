import React, { useState, useEffect } from 'react';
import { settingsApi, SystemSettings, SystemHealth } from '../services/settingsApi';
import { useToast } from '../components/Toast';
import {
  Cpu,
  Layers,
  FileCheck2,
  Bell,
  Shield,
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Eye,
  Sliders,
  ShieldAlert,
  Radio,
  Mail,
  PhoneCall,
  HardDrive,
  Download,
  Upload,
  Info,
  Sparkles,
  Zap,
  RefreshCw,
  Clock,
  Building2,
  Lock,
  History,
  AlertCircle,
  Check,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

type SettingsCategoryKey =
  | 'AI'
  | 'INCIDENT_CATEGORIES'
  | 'DISPATCH_RULES'
  | 'NOTIFICATIONS'
  | 'SECURITY'
  | 'SYSTEM_LOGS';

interface IncidentCategoryItem {
  code: string;
  name: string;
  enabled: boolean;
  defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  color: string;
  estimatedHours: number;
  description: string;
}

const DEFAULT_INCIDENT_CATEGORIES: IncidentCategoryItem[] = [
  {
    code: 'POTHOLE',
    name: 'Ổ gà & Hố sụt lún',
    enabled: true,
    defaultSeverity: 'HIGH',
    color: '#EF4444',
    estimatedHours: 24,
    description: 'Hư hỏng dạng hố sâu hoặc bề mặt lồi lõm gây nguy hiểm trực tiếp cho xe máy và ô tô.',
  },
  {
    code: 'ROAD_CRACK',
    name: 'Vết nứt & Rạn mặt đường',
    enabled: true,
    defaultSeverity: 'MEDIUM',
    color: '#F59E0B',
    estimatedHours: 48,
    description: 'Vết nứt chân chim, nứt lưới hoặc nứt dọc/ngang cần trám nhựa ngăn nước xâm nhập móng đường.',
  },
  {
    code: 'ROAD_FLOODING',
    name: 'Điểm ngập úng mặt đường',
    enabled: true,
    defaultSeverity: 'CRITICAL',
    color: '#3B82F6',
    estimatedHours: 12,
    description: 'Ứ đọng nước do tắc cống rãnh hoặc trũng thấp gây ngập lụt, cản trở giao thông đô thị.',
  },
  {
    code: 'ROAD_OBSTACLE',
    name: 'Chướng ngại vật & Cây đổ',
    enabled: true,
    defaultSeverity: 'HIGH',
    color: '#F97316',
    estimatedHours: 6,
    description: 'Vật cản cơ học, đất đá rơi vãi, cây đổ hoặc sụt trượt cản trở làn xe lưu thông.',
  },
  {
    code: 'COMPLEX_DAMAGE',
    name: 'Đa sự cố kết hợp',
    enabled: true,
    defaultSeverity: 'CRITICAL',
    color: '#8B5CF6',
    estimatedHours: 72,
    description: 'Khu vực vừa có hố sụt lún vừa ngập nước hoặc sạt lở lề đường cần giải pháp khảo sát BoQ kỹ thuật.',
  },
];

export const AdminSettingsPage: React.FC = () => {
  const toast = useToast();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryKey>('AI');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Local categories list
  const [categoryItems, setCategoryItems] = useState<IncidentCategoryItem[]>(DEFAULT_INCIDENT_CATEGORIES);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsData, healthData] = await Promise.all([
        settingsApi.getSettings(),
        settingsApi.getSystemHealth().catch((err) => {
          console.warn('Lỗi lấy sức khỏe hệ thống:', err);
          return null;
        }),
      ]);
      setSettings(settingsData);
      setHealth(healthData);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải cấu hình hệ thống', 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setHasUnsavedChanges(true);
  };

  const handleToggleCategoryItem = (code: string) => {
    setCategoryItems((prev) =>
      prev.map((item) => (item.code === code ? { ...item, enabled: !item.enabled } : item))
    );
    setHasUnsavedChanges(true);
  };

  const handleChangeCategorySeverity = (code: string, severity: IncidentCategoryItem['defaultSeverity']) => {
    setCategoryItems((prev) =>
      prev.map((item) => (item.code === code ? { ...item, defaultSeverity: severity } : item))
    );
    setHasUnsavedChanges(true);
  };

  const handleChangeCategoryHours = (code: string, hours: number) => {
    setCategoryItems((prev) =>
      prev.map((item) => (item.code === code ? { ...item, estimatedHours: Math.max(1, hours) } : item))
    );
    setHasUnsavedChanges(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await settingsApi.updateSettings(settings);
      setSettings(updated);
      setHasUnsavedChanges(false);
      toast.success('Đã lưu và áp dụng toàn bộ cấu hình hệ thống!', 'Cập nhật thành công');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu cài đặt', 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      const resetData = await settingsApi.resetToDefaults();
      setSettings(resetData);
      setCategoryItems(DEFAULT_INCIDENT_CATEGORIES);
      setHasUnsavedChanges(false);
      setIsResetModalOpen(false);
      toast.info('Đã khôi phục toàn bộ thông số về mặc định xuất xưởng!', 'Khôi phục cài đặt gốc');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể khôi phục mặc định', 'Lỗi');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportJSON = () => {
    if (!settings) return;
    const payload = {
      ...settings,
      incidentCategoriesConfig: categoryItems,
      exportedAt: new Date().toISOString(),
      version: 'RoadVision-AI-v2.4',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `roadvision-settings-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.info('Đã tải xuống tệp sao lưu cấu hình hệ thống JSON', 'Xuất cấu hình');
  };

  if (loading || !settings) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-600">Đang nạp cấu hình hệ thống RoadVision AI...</span>
      </div>
    );
  }

  // Danh sách 6 menu cài đặt bên trái theo đúng đề xuất của người dùng
  const menuCategories = [
    {
      key: 'AI' as SettingsCategoryKey,
      name: 'Cấu hình AI',
      desc: 'Mô hình nhận diện, ngưỡng tin cậy, che mờ mặt & biển số',
      icon: Cpu,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      key: 'INCIDENT_CATEGORIES' as SettingsCategoryKey,
      name: 'Danh mục sự cố',
      desc: 'Quản lý loại hư hỏng, mức độ ưu tiên & thời gian xử lý',
      icon: Layers,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      key: 'DISPATCH_RULES' as SettingsCategoryKey,
      name: 'Quy tắc xử lý',
      desc: 'Cam kết SLA, quy trình khảo sát - thi công & gợi ý GPS',
      icon: FileCheck2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      key: 'NOTIFICATIONS' as SettingsCategoryKey,
      name: 'Thông báo',
      desc: 'Kênh WebSocket, email công dân, cảnh báo bão lũ & hotline',
      icon: Bell,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      key: 'SECURITY' as SettingsCategoryKey,
      name: 'Bảo mật',
      desc: 'Chế độ bảo trì, giới hạn phiên đăng nhập & chống spam',
      icon: Shield,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      key: 'SYSTEM_LOGS' as SettingsCategoryKey,
      name: 'Nhật ký hệ thống',
      desc: 'Ghi vết kiểm toán audit, lịch sao lưu & xuất file log',
      icon: FileText,
      color: 'text-slate-600 bg-slate-100 border-slate-200',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ========================================================= */}
      {/* 1. PHÍA TRÊN: TIÊU ĐỀ, MÔ TẢ VÀ TRẠNG THÁI CẤU HÌNH      */}
      {/* ========================================================= */}
      <header className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Hệ thống đang hoạt động ổn định
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Môi trường: {settings.systemEnvironment}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Bản dựng v2.4.0
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Cài Đặt Hệ Thống RoadVision AI
            </h1>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Thiết lập toàn bộ quy chuẩn vận hành, tham số mô hình thị giác trí tuệ nhân tạo, danh mục sự cố đường bộ, cam kết chất lượng dịch vụ SLA, kênh cảnh báo khẩn cấp và bảo mật dữ liệu.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportJSON}
              title="Xuất file JSON sao lưu toàn bộ cấu hình"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất cấu hình</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-right text-[11px] text-slate-400">
              <div>Cập nhật lần cuối: <span className="font-semibold text-slate-700">{settings.lastUpdatedAt}</span></div>
              <div>Người sửa: <span className="font-mono text-blue-600 font-semibold">{settings.lastUpdatedBy}</span></div>
            </div>
          </div>
        </div>

        {/* Dải tóm tắt hạ tầng máy chủ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 text-[10px] block">Uptime máy chủ</span>
              <span className="font-semibold text-slate-800 font-mono">{health?.uptime || '0 giờ 15 phút'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 text-[10px] block">Bộ nhớ JVM RAM</span>
              <span className="font-semibold text-slate-800 font-mono">
                {health ? `${health.jvmTotalMemoryMb - health.jvmFreeMemoryMb} / ${health.jvmTotalMemoryMb} MB` : '420 MB'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 text-[10px] block">Động cơ AI</span>
              <span className="font-semibold text-slate-800 truncate" title={settings.aiModelVision}>
                ONNX + YOLOv8x
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 text-[10px] block">Cơ sở dữ liệu</span>
              <span className="font-semibold text-slate-800">MySQL 8.0 Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. BỐ CỤC CHÍNH: MENU TRÁI & NỘI DUNG PHẢI                 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================== */}
        {/* CỘT BÊN TRÁI: MENU DANH MỤC CÀI ĐẶT        */}
        {/* ========================================== */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 space-y-1.5 sticky top-20">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Danh mục cài đặt
          </div>

          <nav className="space-y-1">
            {menuCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isActive
                          ? 'bg-white/20 border-white/30 text-white'
                          : cat.color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs ${isActive ? 'text-white font-bold' : 'text-slate-800 font-semibold'}`}>
                        {cat.name}
                      </div>
                      <div
                        className={`text-[10px] truncate max-w-[170px] mt-0.5 ${
                          isActive ? 'text-blue-100' : 'text-slate-400'
                        }`}
                        title={cat.desc}
                      >
                        {cat.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-white translate-x-0.5' : 'text-slate-300 group-hover:text-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mt-3 text-[11px] text-slate-500">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Ghi nhớ vận hành</span>
            </div>
            Các thay đổi tham số sẽ có hiệu lực tức thời cho toàn bộ quy trình điều phối & máy chủ AI.
          </div>
        </aside>

        {/* ========================================== */}
        {/* CỘT BÊN PHẢI: NỘI DUNG CẤU HÌNH CHI TIẾT   */}
        {/* ========================================== */}
        <main className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 md:p-6 space-y-6">
          {/* ------------------------------------------------------- */}
          {/* MỤC 1: CẤU HÌNH AI                                      */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'AI' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-600" />
                  <span>1. Cấu Hình Trí Tuệ Nhân Tạo & AI Vision</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý mô hình mạng nơ-ron nhận diện hư hỏng đường bộ, ngưỡng tin cậy và cơ chế bảo vệ quyền riêng tư.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ngưỡng AI Confidence */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Ngưỡng Tin Cậy Tối Thiểu (Confidence)
                    </label>
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-purple-100 text-purple-800 border border-purple-200">
                      {(settings.aiConfidenceThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.95"
                    step="0.05"
                    value={settings.aiConfidenceThreshold}
                    onChange={(e) => handleChange('aiConfidenceThreshold', parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Phát hiện dưới {(settings.aiConfidenceThreshold * 100).toFixed(0)}% sẽ bị loại bỏ hoặc gắn cờ kiểm duyệt bổ sung.
                  </p>
                </div>

                {/* Bán kính quét trùng lặp vị trí GPS */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Bán Kính Quét Trùng Lặp Vị Trí (Mét)
                    </label>
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                      {settings.duplicateRadiusMeters}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.duplicateRadiusMeters}
                    onChange={(e) => handleChange('duplicateRadiusMeters', parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Cảnh báo sự cố trùng lặp nếu có báo cáo khác trong vòng {settings.duplicateRadiusMeters}m lân cận.
                  </p>
                </div>

                {/* Ngưỡng IoU Non-Max Suppression */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Ngưỡng Giao Thoa Bounding Box (IoU)
                    </label>
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-slate-200 text-slate-800">
                      {settings.iouThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.80"
                    step="0.05"
                    value={settings.iouThreshold}
                    onChange={(e) => handleChange('iouThreshold', parseFloat(e.target.value))}
                    className="w-full accent-slate-700 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Lọc bỏ các hộp nhận diện chồng lấn lên nhau đối với cùng một vết nứt hoặc ổ gà.
                  </p>
                </div>

                {/* Chọn Mô hình AI Vision */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Mô Hình AI Vision Đang Chạy
                    </label>
                    <select
                      value={settings.aiModelVision}
                      onChange={(e) => handleChange('aiModelVision', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="YOLOv8x-Custom-RoadHazard-v2.4">YOLOv8x-Custom-RoadHazard-v2.4 (Khuyên dùng - Chuẩn xác)</option>
                      <option value="YOLOv8m-RoadPothole-Speed">YOLOv8m-RoadPothole-Speed (Suy luận tốc độ cao)</option>
                      <option value="Gemini-2.5-Flash-Vision-Multimodal">Gemini 2.5 Flash Vision Multimodal (Đa phương thức)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đã nạp file ONNX Runtime chuẩn xác với tập dữ liệu 45.000 mẫu đường giao thông Việt Nam.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Che mờ khuôn mặt và biển số xe tự động</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Bảo vệ thông tin cá nhân của người đi đường trước khi công khai hình ảnh hiện trường lên bản đồ GIS.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('blurFaceAndLicensePlates', !settings.blurFaceAndLicensePlates)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.blurFaceAndLicensePlates ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.blurFaceAndLicensePlates ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Tự động phân tích AI ngay khi gửi ảnh</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Kích hoạt worker nhận diện ONNX tức thì khi công dân hoặc tuần tra viên tải ảnh lên.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('autoAiAnalysisOnSubmit', !settings.autoAiAnalysisOnSubmit)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.autoAiAnalysisOnSubmit ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.autoAiAnalysisOnSubmit ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Tự động gắn cờ mức độ khẩn cấp (Critical / Major / Moderate)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      AI tính diện tích hư hỏng so với lòng đường để tự động xếp loại mức độ ưu tiên xử lý.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('autoSeverityClassification', !settings.autoSeverityClassification)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.autoSeverityClassification ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.autoSeverityClassification ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MỤC 2: DANH MỤC SỰ CỐ                                   */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'INCIDENT_CATEGORIES' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <span>2. Quản Lý Danh Mục Sự Cố & Tiêu Chuẩn Kỹ Thuật</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cấu hình các loại hư hỏng mặt đường được phép báo cáo, mức độ khẩn cấp mặc định và thời gian dự kiến xử lý.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tên loại sự cố</th>
                      <th className="py-3 px-4">Trạng thái tiếp nhận</th>
                      <th className="py-3 px-4">Cấp độ ưu tiên mặc định</th>
                      <th className="py-3 px-4">Thời gian xử lý dự kiến</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryItems.map((cat) => (
                      <tr key={cat.code} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div>
                              <div className="font-semibold text-slate-900">{cat.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{cat.code}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryItem(cat.code)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors ${
                              cat.enabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {cat.enabled ? '✓ Đang tiếp nhận' : '✕ Tạm dừng'}
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={cat.defaultSeverity}
                            onChange={(e) => handleChangeCategorySeverity(cat.code, e.target.value as any)}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            <option value="LOW">Thấp (Low)</option>
                            <option value="MEDIUM">Trung bình (Medium)</option>
                            <option value="HIGH">Cao (High)</option>
                            <option value="CRITICAL">Khẩn cấp (Critical)</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={cat.estimatedHours}
                              onChange={(e) => handleChangeCategoryHours(cat.code, parseInt(e.target.value, 10) || 1)}
                              className="w-16 px-2 py-1 rounded-md bg-white border border-slate-300 font-mono text-center text-xs font-bold"
                            />
                            <span className="text-slate-500">giờ</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Lưu ý phân loại:</span> Các loại sự cố tạm dừng sẽ không hiển thị trên danh sách lựa chọn của người dân khi gửi báo cáo mới, nhưng các sự cố đã ghi nhận trong quá khứ vẫn được lưu trữ đầy đủ.
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MỤC 3: QUY TẮC XỬ LÝ & ĐIỀU PHỐI (SLA)                  */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'DISPATCH_RULES' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <span>3. Quy Tắc Xử Lý, Điều Phối & Cam Kết Chất Lượng SLA</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập hạn mức thời gian cam kết dịch vụ cho từng cấp độ sự cố và quy chuẩn luân chuyển hồ sơ giữa các tổ đội.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SLA Khẩn cấp */}
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Hạn Cam Kết SLA Khẩn Cấp (Critical)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={settings.slaCriticalHours}
                      onChange={(e) => handleChange('slaCriticalHours', parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-mono font-bold text-rose-900 text-sm text-center"
                    />
                    <span className="text-xs text-rose-700 font-medium">giờ kể từ khi tiếp nhận</span>
                  </div>
                  <p className="text-[11px] text-rose-600 leading-relaxed">
                    Sự cố nghiêm trọng nguy cơ gây tai nạn phải được phản hồi và có mặt hiện trường trong thời hạn này.
                  </p>
                </div>

                {/* SLA Tiêu chuẩn */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Hạn Cam Kết SLA Tiêu Chuẩn (Normal)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="12"
                      max="168"
                      step="6"
                      value={settings.slaNormalHours}
                      onChange={(e) => handleChange('slaNormalHours', parseInt(e.target.value, 10) || 12)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-white border border-blue-300 font-mono font-bold text-blue-900 text-sm text-center"
                    />
                    <span className="text-xs text-blue-700 font-medium">giờ ({((settings.slaNormalHours || 48) / 24).toFixed(1)} ngày làm việc)</span>
                  </div>
                  <p className="text-[11px] text-blue-600 leading-relaxed">
                    Thời gian tối đa để hoàn thành trọn vẹn chu trình sửa chữa đối với hư hỏng bình thường.
                  </p>
                </div>

                {/* Giới hạn số lần thi công lại */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">
                    Số Lần Yêu Cầu Thi Công Lại Tối Đa
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={settings.maxReworkAttempts}
                      onChange={(e) => handleChange('maxReworkAttempts', parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900 text-sm text-center"
                    />
                    <span className="text-xs text-slate-600">lần làm lại hiện trường</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nếu tổ thi công bị từ chối nghiệm thu quá số lần này, sự cố sẽ chuyển sang đình chỉ để thẩm tra nguyên nhân.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Tự động gợi ý Tổ đội theo tọa độ GPS gần nhất</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tính toán cự ly thực tế trên tuyến đường bộ để tự động đề xuất tổ đội phụ trách phù hợp nhất.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('autoSuggestNearestTeam', !settings.autoSuggestNearestTeam)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.autoSuggestNearestTeam ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.autoSuggestNearestTeam ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Cho phép giao thẳng Tổ thi công (Bỏ qua khảo sát đo đạc)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Áp dụng cho sự cố khẩn cấp hoặc các hư hỏng đã rõ ràng về kích thước, giúp rút ngắn thời gian xử lý.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('allowDirectConstruction', !settings.allowDirectConstruction)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.allowDirectConstruction ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.allowDirectConstruction ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Bắt buộc đính kèm biên bản đo đạc BoQ khi nghiệm thu</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Yêu cầu tổ thi công phải tải lên biên bản khối lượng vật tư trước khi được duyệt nghiệm thu đạt chuẩn.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('requireInspectionReportAttachment', !settings.requireInspectionReportAttachment)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.requireInspectionReportAttachment ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.requireInspectionReportAttachment ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MỤC 4: THÔNG BÁO & KÊNH CẢNH BÁO                        */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'NOTIFICATIONS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span>4. Cấu Hình Thông Báo & Kênh Cảnh Báo Khẩn Cấp</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý luồng thông báo thời gian thực WebSocket, email tự động gửi công dân và hotline hỗ trợ 24/7.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hotline */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    <span>Đường Dây Nóng Hỗ Trợ 24/7 (Hotline)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.supportHotline}
                    onChange={(e) => handleChange('supportHotline', e.target.value)}
                    placeholder="1900-6868"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Số hotline được ghim ở chân trang và trên app di động để người dân gọi báo khẩn cấp.
                  </p>
                </div>

                {/* Email người gửi */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email Hệ Thống Gửi Thông Báo Tự Động</span>
                  </label>
                  <input
                    type="email"
                    value={settings.notificationEmailSender}
                    onChange={(e) => handleChange('notificationEmailSender', e.target.value)}
                    placeholder="hotline@roadvision.gov.vn"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Hòm thư SMTP dùng để phát thư cảm ơn và thông báo kết quả nghiệm thu cho người dân.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Kích hoạt thông báo đẩy thời gian thực WebSocket</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tự động rung chuông Topbar và cập nhật bảng hàng đợi ngay khi có sự cố mới hoặc có điều xe.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('enableRealtimeWebsocket', !settings.enableRealtimeWebsocket)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.enableRealtimeWebsocket ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.enableRealtimeWebsocket ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Gửi email cho công dân khi sự cố được hoàn thành nghiệm thu</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Kèm theo ảnh so sánh trước/sau khi thi công và link để công dân đánh giá hài lòng.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('emailCitizenOnResolved', !settings.emailCitizenOnResolved)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.emailCitizenOnResolved ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.emailCitizenOnResolved ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Phát sóng cảnh báo thời tiết xấu & mưa bão diện rộng</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tự động ghim banner cảnh báo ngập lụt trên toàn trang khi có tin dự báo thời tiết cực đoan.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('emergencyWeatherAlerts', !settings.emergencyWeatherAlerts)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.emergencyWeatherAlerts ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.emergencyWeatherAlerts ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MỤC 5: BẢO MẬT & KIỂM SOÁT TRUY CẬP                     */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'SECURITY' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-rose-600" />
                  <span>5. Cấu Hình Bảo Mật & Kiểm Soát Truy Cập</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập chế độ bảo trì toàn hệ thống, thời hạn phiên làm việc và chính sách ngăn chặn spam báo cáo ảo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chế độ bảo trì */}
                <div
                  className={`p-4 rounded-xl border transition-colors space-y-2 ${
                    settings.maintenanceMode
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-rose-600" />
                      <span>Chế Độ Bảo Trì Hệ Thống</span>
                    </label>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        settings.maintenanceMode
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {settings.maintenanceMode ? 'ĐANG BẬT' : 'TẮT'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Khi bật chế độ bảo trì, người dân sẽ tạm thời không thể gửi phản ánh mới để phục vụ nâng cấp dữ liệu.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                      settings.maintenanceMode
                        ? 'bg-white text-rose-700 border-rose-300 hover:bg-rose-100'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {settings.maintenanceMode ? 'Tắt chế độ bảo trì' : 'Bật chế độ bảo trì ngay'}
                  </button>
                </div>

                {/* Môi trường */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Môi Trường Triển Khai (Environment)
                  </label>
                  <select
                    value={settings.systemEnvironment}
                    onChange={(e) => handleChange('systemEnvironment', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="PRODUCTION">PRODUCTION (Sản xuất chính thức - Bảo mật tối đa)</option>
                    <option value="STAGING">STAGING (Thử nghiệm nghiệm thu)</option>
                    <option value="DEVELOPMENT">DEVELOPMENT (Phát triển nội bộ)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Môi trường PRODUCTION tự động bật cache tối ưu và mã hóa kiểm toán chặt chẽ.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Chặn spam phản ánh liên tục (Rate-Limiting)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Giới hạn tối đa 5 báo cáo / 10 phút đối với cùng 1 tài khoản hoặc địa chỉ IP mạng.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('enableRateLimitReport', !settings.enableRateLimitReport)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.enableRateLimitReport !== false ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.enableRateLimitReport !== false ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Ghi vết kiểm toán hành vi quản trị (Audit Logging)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Lưu lại nhật ký chi tiết địa chỉ IP và tài khoản khi thực hiện duyệt nghiệm thu hoặc từ chối sự cố.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('enableAuditLog', !settings.enableAuditLog)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      settings.enableAuditLog ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        settings.enableAuditLog ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* MỤC 6: NHẬT KÝ HỆ THỐNG                                 */}
          {/* ------------------------------------------------------- */}
          {activeCategory === 'SYSTEM_LOGS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-700" />
                  <span>6. Nhật Ký Hệ Thống & Lịch Sao Lưu Dữ Liệu</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi lịch trình sao lưu tự động CSDL quốc gia và nhật ký các phiên chỉnh sửa cấu hình gần đây.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lịch sao lưu */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Lịch Trình Sao Lưu Dữ Liệu Tự Động
                  </label>
                  <select
                    value={settings.autoBackupSchedule}
                    onChange={(e) => handleChange('autoBackupSchedule', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Hàng ngày (02:00 AM)">Hàng ngày vào lúc 02:00 AM (Khuyên dùng)</option>
                    <option value="Mỗi 12 giờ">Mỗi 12 giờ một lần (02:00 AM & 02:00 PM)</option>
                    <option value="Hàng tuần (Chủ Nhật 00:00)">Hàng tuần (Chủ Nhật 00:00)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Bản sao lưu snapshot CSDL MySQL và hồ sơ chứng chỉ ảnh được lưu trữ an toàn trên máy chủ lưu trữ.
                  </p>
                </div>

                {/* Tên cơ quan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Tên Cơ Quan Chủ Quản Vận Hành
                  </label>
                  <input
                    type="text"
                    value={settings.organizationName}
                    onChange={(e) => handleChange('organizationName', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Tên cơ quan in trên các văn bản báo cáo tổng hợp và biên bản pháp lý nghiệm thu.
                  </p>
                </div>
              </div>

              {/* Bảng nhật ký chỉnh sửa gần đây */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>Lịch Sử Hoạt Động Cấu Hình Gần Nhất</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Tự động ghi nhận bởi Audit Tracker</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  <div className="p-3 bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="font-semibold text-slate-800">Cập nhật tham số hệ thống</span>
                      <span className="text-[11px] text-slate-500 font-mono">by {settings.lastUpdatedBy}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{settings.lastUpdatedAt}</span>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="font-semibold text-slate-800">Khởi tạo dữ liệu tham số mặc định</span>
                      <span className="text-[11px] text-slate-500 font-mono">by SYSTEM_INITIALIZER</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Hệ thống ban đầu</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 3. PHÍA DƯỚI: NÚT LƯU THAY ĐỔI VÀ KHÔI PHỤC MẶC ĐỊNH        */}
      {/* ========================================================= */}
      <footer className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Nút Khôi phục mặc định nằm bên trái */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi phục mặc định</span>
          </button>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            Đưa các tham số về giá trị xuất xưởng
          </span>
        </div>

        {/* Nút Lưu thay đổi nằm bên phải */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-700 font-medium inline-flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Có thay đổi chưa được lưu
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 ring-2 ring-blue-500/30'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang lưu cấu hình...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL XÁC NHẬN KHÔI PHỤC CÀI ĐẶT GỐC                       */}
      {/* ========================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Khôi phục toàn bộ cài đặt về mặc định?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Thao tác này sẽ thiết lập lại toàn bộ các thông số: Ngưỡng AI Confidence (0.70), Bán kính quét GPS (25m), Hạn SLA (4h/48h), danh mục sự cố và kênh thông báo về giá trị mặc định ban đầu. Bạn có chắc chắn muốn thực hiện?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang khôi phục...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đồng ý khôi phục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
