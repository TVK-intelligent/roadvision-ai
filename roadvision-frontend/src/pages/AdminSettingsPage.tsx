import React, { useState, useEffect } from 'react';
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
  Check,
  ChevronRight,
  Info,
  Zap,
  EyeOff,
  Flame,
  Navigation,
  HardHat,
  Phone,
  Mail,
  Radio,
  Send,
  CloudRain,
  Lock,
  Clock,
  ShieldAlert,
  Calendar,
  HardDrive,
  Sliders,
  Sparkles,
  HelpCircle,
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
  estimatedHours: number;
}

const DEFAULT_CATEGORIES: IncidentCategoryItem[] = [
  { code: 'POTHOLE', name: 'Ổ gà & Hố sụt lún', enabled: true, defaultSeverity: 'HIGH', estimatedHours: 24 },
  { code: 'ROAD_CRACK', name: 'Vết nứt & Rạn mặt đường', enabled: true, defaultSeverity: 'MEDIUM', estimatedHours: 48 },
  { code: 'ROAD_FLOODING', name: 'Điểm ngập úng', enabled: true, defaultSeverity: 'CRITICAL', estimatedHours: 12 },
  { code: 'ROAD_OBSTACLE', name: 'Chướng ngại vật & Cây đổ', enabled: true, defaultSeverity: 'HIGH', estimatedHours: 6 },
  { code: 'COMPLEX_DAMAGE', name: 'Đa sự cố kết hợp', enabled: true, defaultSeverity: 'CRITICAL', estimatedHours: 72 },
];

const DEFAULT_CONFIG = {
  // 1. AI
  aiConfidenceThreshold: 70,
  duplicateRadiusMeters: 25,
  blurFaceAndLicensePlates: true,
  autoAiAnalysisOnSubmit: true,
  autoSeverityClassification: true,

  // 2. Quy tắc xử lý
  slaCriticalHours: 4,
  slaNormalHours: 48,
  maxReworkAttempts: 3,
  autoSuggestNearestTeam: true,
  allowDirectConstruction: true,

  // 3. Thông báo
  enableRealtimeWebsocket: true,
  emailCitizenOnResolved: true,
  emergencyWeatherAlerts: true,
  supportHotline: '1900-6868',
  notificationEmailSender: 'hotline@roadcare.gov.vn',

  // 4. Bảo mật
  maintenanceMode: false,
  sessionTimeoutMinutes: 60,
  enableRateLimitReport: true,

  // 5. Nhật ký
  enableAuditLog: true,
  logRetentionDays: 90,
  autoBackupSchedule: 'Hàng ngày (02:00 AM)',
};

const STORAGE_KEY = 'roadvision_system_settings';
const CATEGORIES_STORAGE_KEY = 'roadvision_incident_categories';

export const AdminSettingsPage: React.FC = () => {
  const toast = useToast();

  const [activeCategory, setActiveCategory] = useState<SettingsCategoryKey>('AI');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [categories, setCategories] = useState<IncidentCategoryItem[]>(DEFAULT_CATEGORIES);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        setConfig((prev) => ({ ...prev, ...JSON.parse(savedConfig) }));
      }
      const savedCats = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (savedCats) {
        setCategories(JSON.parse(savedCats));
      }
    } catch {
      // ignore
    }
  }, []);

  const updateConfig = <K extends keyof typeof DEFAULT_CONFIG>(key: K, value: (typeof DEFAULT_CONFIG)[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleToggleCategory = (code: string) => {
    setCategories((prev) =>
      prev.map((item) => (item.code === code ? { ...item, enabled: !item.enabled } : item))
    );
    setHasChanges(true);
  };

  const handleChangeCategorySeverity = (code: string, defaultSeverity: IncidentCategoryItem['defaultSeverity']) => {
    setCategories((prev) =>
      prev.map((item) => (item.code === code ? { ...item, defaultSeverity } : item))
    );
    setHasChanges(true);
  };

  const handleChangeCategoryHours = (code: string, estimatedHours: number) => {
    setCategories((prev) =>
      prev.map((item) => (item.code === code ? { ...item, estimatedHours: Math.max(1, estimatedHours) } : item))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      setHasChanges(false);
      toast.success('Đã lưu các thay đổi cài đặt hệ thống thành công!', 'Đã lưu cài đặt');
    } catch {
      toast.error('Không thể lưu cài đặt vào bộ nhớ trình duyệt', 'Lỗi');
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định ban đầu không?')) {
      setConfig(DEFAULT_CONFIG);
      setCategories(DEFAULT_CATEGORIES);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CATEGORIES_STORAGE_KEY);
      setHasChanges(false);
      toast.info('Đã khôi phục toàn bộ cài đặt về mặc định ban đầu!', 'Khôi phục mặc định');
    }
  };

  const menuItems = [
    {
      key: 'AI' as SettingsCategoryKey,
      label: 'Cấu hình AI',
      desc: 'Mô hình, ngưỡng tin cậy & quyền riêng tư',
      icon: Cpu,
    },
    {
      key: 'INCIDENT_CATEGORIES' as SettingsCategoryKey,
      label: 'Danh mục sự cố',
      desc: 'Bật/tắt loại hư hỏng & mức độ ưu tiên',
      icon: Layers,
    },
    {
      key: 'DISPATCH_RULES' as SettingsCategoryKey,
      label: 'Quy tắc xử lý',
      desc: 'Cam kết SLA, khảo sát & gợi ý GPS',
      icon: FileCheck2,
    },
    {
      key: 'NOTIFICATIONS' as SettingsCategoryKey,
      label: 'Thông báo',
      desc: 'Kênh WebSocket, email công dân & hotline',
      icon: Bell,
    },
    {
      key: 'SECURITY' as SettingsCategoryKey,
      label: 'Bảo mật',
      desc: 'Chế độ bảo trì, phiên làm việc & rate limit',
      icon: Shield,
    },
    {
      key: 'SYSTEM_LOGS' as SettingsCategoryKey,
      label: 'Nhật ký',
      desc: 'Audit log, thời gian lưu & lịch sao lưu',
      icon: FileText,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* ========================================================= */}
      {/* 1. PHÍA TRÊN: TIÊU ĐỀ, MÔ TẢ VÀ TRẠNG THÁI CẤU HÌNH      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Cài đặt hệ thống
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Quản lý cấu hình vận hành, thuật toán AI, danh mục sự cố, quy tắc xử lý, thông báo và bảo mật.
            </p>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Đang áp dụng
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. THÂN CHÍNH: BÊN TRÁI LÀ MENU, BÊN PHẢI LÀ NỘI DUNG     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Bên trái: Menu danh mục cài đặt */}
        <div className="md:col-span-4 lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-xs space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Danh mục cài đặt
          </div>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveCategory(item.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                    <div className="truncate">
                      <div className="leading-tight">{item.label}</div>
                      <div className={`text-[10px] truncate max-w-[150px] mt-0.5 ${isActive ? 'text-blue-100 font-normal' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bên phải: Nội dung cấu hình */}
        <div className="md:col-span-8 lg:col-span-9 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          {/* ========================================================= */}
          {/* MỤC 1: CẤU HÌNH AI                                        */}
          {/* ========================================================= */}
          {activeCategory === 'AI' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-600" />
                  <h2 className="text-base font-bold text-slate-800">Cấu hình AI</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Các tham số vận hành thuật toán nhận diện và xử lý thị giác máy tính.
                </p>
              </div>

              {/* Sliders với Ô Nhập Số Trực Tiếp */}
              <div className="space-y-4">
                {/* 1. Ngưỡng AI Confidence */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      <label className="text-xs font-bold text-slate-800">
                        Ngưỡng tin cậy AI tối thiểu (Confidence)
                      </label>
                      <div className="group relative cursor-pointer" title="Phát hiện có độ tin cậy thấp hơn ngưỡng này sẽ không được tự động gắn cờ duyệt.">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </div>

                    {/* Ô nhập số trực tiếp */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="10"
                          max="95"
                          step="1"
                          value={config.aiConfidenceThreshold}
                          onChange={(e) => {
                            const val = Math.min(95, Math.max(10, parseInt(e.target.value, 10) || 10));
                            updateConfig('aiConfidenceThreshold', val);
                          }}
                          className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg text-purple-700 shadow-2xs focus:ring-2 focus:ring-purple-400 focus:outline-none"
                        />
                        <span className="absolute right-2 top-1 text-xs text-slate-400 pointer-events-none">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Thanh trượt slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400">10%</span>
                    <input
                      type="range"
                      min="10"
                      max="95"
                      step="1"
                      value={config.aiConfidenceThreshold}
                      onChange={(e) => updateConfig('aiConfidenceThreshold', parseInt(e.target.value, 10))}
                      className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                    <span className="text-[11px] font-mono text-slate-400">95%</span>
                  </div>

                  {/* Preset gợi ý nhanh */}
                  <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                    <span className="text-slate-400">Gợi ý nhanh:</span>
                    {[
                      { val: 50, label: '50% (Độ nhạy cao)' },
                      { val: 70, label: '70% (Chuẩn khuyên dùng)' },
                      { val: 85, label: '85% (Chính xác cao)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => updateConfig('aiConfidenceThreshold', item.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                          config.aiConfidenceThreshold === item.val
                            ? 'bg-purple-100 text-purple-800 border-purple-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Bán kính quét trùng lặp vị trí GPS */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                      <label className="text-xs font-bold text-slate-800">
                        Bán kính quét trùng lặp vị trí GPS
                      </label>
                      <div className="group relative cursor-pointer" title="Khoảng cách tối đa (mét) để hệ thống tự động cảnh báo sự cố trùng lặp vị trí lân cận.">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </div>

                    {/* Ô nhập số trực tiếp */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="5"
                          max="100"
                          step="1"
                          value={config.duplicateRadiusMeters}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(5, parseInt(e.target.value, 10) || 5));
                            updateConfig('duplicateRadiusMeters', val);
                          }}
                          className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg text-blue-700 shadow-2xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                        <span className="absolute right-2 top-1 text-xs text-slate-400 pointer-events-none">m</span>
                      </div>
                    </div>
                  </div>

                  {/* Thanh trượt slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400">5m</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={config.duplicateRadiusMeters}
                      onChange={(e) => updateConfig('duplicateRadiusMeters', parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                    <span className="text-[11px] font-mono text-slate-400">100m</span>
                  </div>

                  {/* Preset gợi ý nhanh */}
                  <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                    <span className="text-slate-400">Gợi ý nhanh:</span>
                    {[
                      { val: 15, label: '15m (Khu phố hẹp)' },
                      { val: 25, label: '25m (Đô thị chuẩn)' },
                      { val: 50, label: '50m (Đường lớn / Quốc lộ)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => updateConfig('duplicateRadiusMeters', item.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                          config.duplicateRadiusMeters === item.val
                            ? 'bg-blue-100 text-blue-800 border-blue-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles Hiện đại với Icon & Tooltip */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                      <EyeOff className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Tự động che mờ khuôn mặt và biển số xe</span>
                        <span className="group relative cursor-pointer" title="Thuật toán bảo vệ quyền riêng tư người đi đường trước khi công khai hình ảnh hiện trường.">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Bảo vệ thông tin cá nhân của người dân khi ảnh sự cố được hiển thị công khai trên bản đồ.
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => updateConfig('blurFaceAndLicensePlates', !config.blurFaceAndLicensePlates)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.blurFaceAndLicensePlates ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.blurFaceAndLicensePlates ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 mt-0.5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Tự động phân tích AI ngay khi gửi ảnh</span>
                        <span className="group relative cursor-pointer" title="Kích hoạt nhận diện vật thể và phân loại tự động ngay trong luồng tiếp nhận sự cố.">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Chạy mô hình suy luận bounding box tức thì khi công dân hoặc tuần tra viên tải ảnh lên.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('autoAiAnalysisOnSubmit', !config.autoAiAnalysisOnSubmit)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.autoAiAnalysisOnSubmit ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.autoAiAnalysisOnSubmit ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 mt-0.5">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Tự động phân loại mức độ khẩn cấp (Severity)</span>
                        <span className="group relative cursor-pointer" title="AI tự ước lượng diện tích hư hỏng so với lòng đường để gắn mức ưu tiên Critical/Major.">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Hệ thống tự động nâng cờ khẩn cấp đối với ổ gà sâu hoặc sự cố ngập úng nguy hiểm.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('autoSeverityClassification', !config.autoSeverityClassification)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.autoSeverityClassification ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.autoSeverityClassification ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MỤC 2: DANH MỤC SỰ CỐ                                     */}
          {/* ========================================================= */}
          {activeCategory === 'INCIDENT_CATEGORIES' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-800">Danh mục sự cố</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Bật / tắt các loại sự cố cho phép tiếp nhận và thiết lập mức ưu tiên xử lý.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Loại sự cố</th>
                      <th className="py-3 px-4">Trạng thái tiếp nhận</th>
                      <th className="py-3 px-4">Mức độ ưu tiên</th>
                      <th className="py-3 px-4">Thời gian xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.code} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{cat.name}</span>
                          <span className="text-[11px] text-slate-400 block font-mono">{cat.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat.code)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors ${
                              cat.enabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {cat.enabled ? '✓ Đang bật' : '✕ Tạm tắt'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={cat.defaultSeverity}
                            onChange={(e) => handleChangeCategorySeverity(cat.code, e.target.value as any)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            <option value="LOW">Thấp (Low)</option>
                            <option value="MEDIUM">Trung bình (Medium)</option>
                            <option value="HIGH">Cao (High)</option>
                            <option value="CRITICAL">Khẩn cấp (Critical)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={cat.estimatedHours}
                              onChange={(e) => handleChangeCategoryHours(cat.code, parseInt(e.target.value, 10) || 1)}
                              className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-center text-xs font-mono font-bold"
                            />
                            <span className="text-slate-500">giờ</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MỤC 3: QUY TẮC XỬ LÝ                                      */}
          {/* ========================================================= */}
          {activeCategory === 'DISPATCH_RULES' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-800">Quy tắc xử lý</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Thiết lập thời hạn cam kết SLA và quy trình phối hợp giữa các tổ đội.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-800">Thời hạn SLA khẩn cấp</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={config.slaCriticalHours}
                      onChange={(e) => updateConfig('slaCriticalHours', parseInt(e.target.value, 10) || 1)}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-rose-700 text-xs text-center shadow-2xs"
                    />
                    <span className="text-xs text-slate-600">giờ (sự cố cấp bách)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Thời gian tối đa phải tiếp nhận sự cố nguy hiểm.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-800">Thời hạn SLA tiêu chuẩn</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="12"
                      max="168"
                      value={config.slaNormalHours}
                      onChange={(e) => updateConfig('slaNormalHours', parseInt(e.target.value, 10) || 12)}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-blue-700 text-xs text-center shadow-2xs"
                    />
                    <span className="text-xs text-slate-600">giờ (sự cố thông thường)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Thời hạn xử lý hoàn tất cho các hư hỏng vừa và nhỏ.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 sm:col-span-2">
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-800">Số lần yêu cầu thi công lại tối đa</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={config.maxReworkAttempts}
                      onChange={(e) => updateConfig('maxReworkAttempts', parseInt(e.target.value, 10) || 1)}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-amber-800 text-xs text-center shadow-2xs"
                    />
                    <span className="text-xs text-slate-600">lần làm lại hiện trường</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Nếu quá số lần này, sự cố sẽ chuyển sang đình chỉ để thẩm tra.</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 mt-0.5">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Tự động gợi ý Tổ đội theo GPS gần nhất</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tính khoảng cách đường bộ km để đề xuất tổ đội phụ trách phù hợp trên bảng điều phối.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('autoSuggestNearestTeam', !config.autoSuggestNearestTeam)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.autoSuggestNearestTeam ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.autoSuggestNearestTeam ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 mt-0.5">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Cho phép giao thẳng Tổ thi công</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Bỏ qua bước khảo sát đo đạc đối với các sự cố khẩn cấp hoặc kích thước đã rõ ràng.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('allowDirectConstruction', !config.allowDirectConstruction)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.allowDirectConstruction ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.allowDirectConstruction ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MỤC 4: THÔNG BÁO                                          */}
          {/* ========================================================= */}
          {activeCategory === 'NOTIFICATIONS' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-800">Thông báo</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cấu hình các kênh liên lạc và phát cảnh báo sự cố.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-800">Đường dây nóng (Hotline)</label>
                  </div>
                  <input
                    type="text"
                    value={config.supportHotline}
                    onChange={(e) => updateConfig('supportHotline', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Số tổng đài được hiển thị cho người dân liên hệ khẩn cấp.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-800">Email hệ thống gửi thông báo</label>
                  </div>
                  <input
                    type="email"
                    value={config.notificationEmailSender}
                    onChange={(e) => updateConfig('notificationEmailSender', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Hòm thư dùng để gửi thông báo nghiệm thu cho người dân.</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Thông báo đẩy thời gian thực WebSocket</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Rung chuông và cập nhật bảng hàng đợi ngay khi có sự cố mới phát sinh.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('enableRealtimeWebsocket', !config.enableRealtimeWebsocket)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.enableRealtimeWebsocket ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.enableRealtimeWebsocket ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 mt-0.5">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Gửi email cho công dân khi nghiệm thu hoàn tất</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Gửi thư kèm ảnh trước và sau khi thi công cho người báo cáo kiểm tra kết quả.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('emailCitizenOnResolved', !config.emailCitizenOnResolved)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.emailCitizenOnResolved ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.emailCitizenOnResolved ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 mt-0.5">
                      <CloudRain className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Cảnh báo thời tiết xấu & mưa ngập</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tự động hiển thị banner lưu ý trên bản đồ khi dự báo thời tiết có bão lũ.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('emergencyWeatherAlerts', !config.emergencyWeatherAlerts)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.emergencyWeatherAlerts ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.emergencyWeatherAlerts ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MỤC 5: BẢO MẬT                                            */}
          {/* ========================================================= */}
          {activeCategory === 'SECURITY' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-rose-600" />
                  <h2 className="text-base font-bold text-slate-800">Bảo mật</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chính sách bảo mật phiên làm việc và kiểm soát lưu lượng báo cáo.
                </p>
              </div>

              <div className="space-y-4">
                {/* Chế độ bảo trì */}
                <div
                  className={`p-4 rounded-xl border transition-colors flex items-center justify-between ${
                    config.maintenanceMode
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Chế độ bảo trì hệ thống (Maintenance Mode)</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            config.maintenanceMode
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {config.maintenanceMode ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tạm dừng nhận phản ánh mới để nâng cấp cơ sở dữ liệu định kỳ.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('maintenanceMode', !config.maintenanceMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.maintenanceMode ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Phiên làm việc */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Thời gian hết hạn phiên làm việc</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tự động đăng xuất tài khoản sau khoảng thời gian không thao tác.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="15"
                      max="480"
                      value={config.sessionTimeoutMinutes}
                      onChange={(e) => updateConfig('sessionTimeoutMinutes', parseInt(e.target.value, 10) || 15)}
                      className="w-18 px-2 py-1 rounded-lg border border-slate-300 text-center font-mono font-bold text-xs bg-white shadow-2xs"
                    />
                    <span className="text-xs text-slate-500">phút</span>
                  </div>
                </div>

                {/* Rate limit */}
                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Giới hạn tần suất gửi báo cáo (Rate-limiting)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Chặn hành vi spam gửi phản ánh liên tục từ cùng một IP hoặc tài khoản.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('enableRateLimitReport', !config.enableRateLimitReport)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.enableRateLimitReport ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.enableRateLimitReport ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MỤC 6: NHẬT KÝ                                            */}
          {/* ========================================================= */}
          {activeCategory === 'SYSTEM_LOGS' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-700" />
                  <h2 className="text-base font-bold text-slate-800">Nhật ký</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cấu hình lưu trữ nhật ký thao tác và lịch sao lưu dữ liệu.
                </p>
              </div>

              <div className="space-y-4">
                {/* Audit log toggle */}
                <div className="p-3.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Ghi nhật ký kiểm toán hành vi (Audit log)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Lưu lại thao tác duyệt, phân công và nghiệm thu của cán bộ điều phối.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateConfig('enableAuditLog', !config.enableAuditLog)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      config.enableAuditLog ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                        config.enableAuditLog ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Retention days */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Thời gian lưu trữ nhật ký</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tự động dọn dẹp các bản ghi log cũ hơn thời gian này để tối ưu dung lượng.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={config.logRetentionDays}
                      onChange={(e) => updateConfig('logRetentionDays', parseInt(e.target.value, 10) || 30)}
                      className="w-18 px-2 py-1 rounded-lg border border-slate-300 text-center font-mono font-bold text-xs bg-white shadow-2xs"
                    />
                    <span className="text-xs text-slate-500">ngày</span>
                  </div>
                </div>

                {/* Backup schedule */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Lịch sao lưu dữ liệu tự động</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Khung giờ hệ thống tự động backup cơ sở dữ liệu quốc gia.
                      </div>
                    </div>
                  </div>

                  <select
                    value={config.autoBackupSchedule}
                    onChange={(e) => updateConfig('autoBackupSchedule', e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium cursor-pointer shadow-2xs"
                  >
                    <option value="Hàng ngày (02:00 AM)">Hàng ngày (02:00 AM)</option>
                    <option value="Mỗi 12 giờ">Mỗi 12 giờ</option>
                    <option value="Hàng tuần (Chủ Nhật)">Hàng tuần (Chủ Nhật)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. PHÍA DƯỚI: NÚT LƯU THAY ĐỔI VÀ KHÔI PHỤC MẶC ĐỊNH        */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Khôi phục mặc định</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium inline-flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Có thay đổi chưa lưu
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 ring-2 ring-blue-500/30'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
