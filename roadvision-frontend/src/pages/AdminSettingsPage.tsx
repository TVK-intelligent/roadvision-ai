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
  { code: 'POTHOLE', name: 'Ổ gà', enabled: true, defaultSeverity: 'HIGH', estimatedHours: 24 },
  { code: 'ROAD_CRACK', name: 'Vết nứt mặt đường', enabled: true, defaultSeverity: 'MEDIUM', estimatedHours: 48 },
  { code: 'ROAD_FLOODING', name: 'Điểm ngập úng', enabled: true, defaultSeverity: 'CRITICAL', estimatedHours: 12 },
  { code: 'ROAD_OBSTACLE', name: 'Chướng ngại vật', enabled: true, defaultSeverity: 'HIGH', estimatedHours: 6 },
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
    } catch (err: any) {
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
    { key: 'AI' as SettingsCategoryKey, label: 'Cấu hình AI', icon: Cpu },
    { key: 'INCIDENT_CATEGORIES' as SettingsCategoryKey, label: 'Danh mục sự cố', icon: Layers },
    { key: 'DISPATCH_RULES' as SettingsCategoryKey, label: 'Quy tắc xử lý', icon: FileCheck2 },
    { key: 'NOTIFICATIONS' as SettingsCategoryKey, label: 'Thông báo', icon: Bell },
    { key: 'SECURITY' as SettingsCategoryKey, label: 'Bảo mật', icon: Shield },
    { key: 'SYSTEM_LOGS' as SettingsCategoryKey, label: 'Nhật ký', icon: FileText },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* 1. Phía trên: Tiêu đề, mô tả và trạng thái cấu hình */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Cài đặt hệ thống</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý cấu hình vận hành, thuật toán AI, danh mục sự cố, quy tắc xử lý, thông báo và bảo mật.
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Đang áp dụng
            </span>
          </div>
        </div>
      </div>

      {/* 2. Thân chính: Bên trái là Menu, Bên phải là Nội dung */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Bên trái: Menu danh mục cài đặt */}
        <div className="md:col-span-4 lg:col-span-3 bg-white rounded-xl border border-slate-200 p-2 shadow-2xs space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Danh mục
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCategory(item.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Bên phải: Nội dung cấu hình */}
        <div className="md:col-span-8 lg:col-span-9 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
          {/* Mục 1: Cấu hình AI */}
          {activeCategory === 'AI' && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Cấu hình AI</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các tham số vận hành thuật toán nhận diện và xử lý thị giác máy tính.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-medium text-slate-700">Ngưỡng tin cậy AI tối thiểu (Confidence)</label>
                    <span className="font-mono font-semibold text-blue-600">{config.aiConfidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="5"
                    value={config.aiConfidenceThreshold}
                    onChange={(e) => updateConfig('aiConfidenceThreshold', parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400">
                    Các phát hiện dưới ngưỡng này sẽ không được tự động công nhận.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-medium text-slate-700">Bán kính quét trùng lặp vị trí GPS (Mét)</label>
                    <span className="font-mono font-semibold text-blue-600">{config.duplicateRadiusMeters}m</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={config.duplicateRadiusMeters}
                    onChange={(e) => updateConfig('duplicateRadiusMeters', parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400">
                    Khoảng cách tối đa để hệ thống đánh dấu cảnh báo trùng lặp hiện trường.
                  </span>
                </div>

                <div className="pt-2 divide-y divide-slate-100">
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">Tự động che mờ khuôn mặt và biển số xe</div>
                      <div className="text-[11px] text-slate-400">Bảo vệ quyền riêng tư công dân trước khi hiển thị công khai ảnh.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.blurFaceAndLicensePlates}
                      onChange={(e) => updateConfig('blurFaceAndLicensePlates', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">Tự động phân tích AI ngay khi gửi ảnh</div>
                      <div className="text-[11px] text-slate-400">Chạy nhận diện bounding box tức thời khi có báo cáo mới.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoAiAnalysisOnSubmit}
                      onChange={(e) => updateConfig('autoAiAnalysisOnSubmit', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">Tự động phân loại mức độ khẩn cấp</div>
                      <div className="text-[11px] text-slate-400">AI tự ước lượng diện tích hư hỏng để gắn mức ưu tiên.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoSeverityClassification}
                      onChange={(e) => updateConfig('autoSeverityClassification', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mục 2: Danh mục sự cố */}
          {activeCategory === 'INCIDENT_CATEGORIES' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Danh mục sự cố</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bật / tắt các loại sự cố cho phép tiếp nhận và thiết lập mức ưu tiên xử lý.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Loại sự cố</th>
                      <th className="py-2.5 px-3">Tiếp nhận</th>
                      <th className="py-2.5 px-3">Mức độ ưu tiên</th>
                      <th className="py-2.5 px-3">Thời gian xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.code} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                          <span className="text-[11px] text-slate-400 block font-mono">{cat.code}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat.code)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${
                              cat.enabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {cat.enabled ? 'Đang bật' : 'Tạm tắt'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={cat.defaultSeverity}
                            onChange={(e) => handleChangeCategorySeverity(cat.code, e.target.value as any)}
                            className="px-2 py-1 rounded bg-white border border-slate-200 text-xs"
                          >
                            <option value="LOW">Thấp</option>
                            <option value="MEDIUM">Trung bình</option>
                            <option value="HIGH">Cao</option>
                            <option value="CRITICAL">Khẩn cấp</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={cat.estimatedHours}
                              onChange={(e) => handleChangeCategoryHours(cat.code, parseInt(e.target.value, 10) || 1)}
                              className="w-14 px-2 py-0.5 rounded border border-slate-200 text-center text-xs font-mono"
                            />
                            <span className="text-slate-400 text-[11px]">giờ</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mục 3: Quy tắc xử lý */}
          {activeCategory === 'DISPATCH_RULES' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Quy tắc xử lý</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập thời hạn cam kết SLA và quy trình phối hợp giữa các tổ đội.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Thời hạn SLA khẩn cấp</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={config.slaCriticalHours}
                      onChange={(e) => updateConfig('slaCriticalHours', parseInt(e.target.value, 10) || 1)}
                      className="w-20 px-2.5 py-1 rounded bg-white border border-slate-300 font-mono text-center text-xs font-semibold"
                    />
                    <span className="text-slate-600">giờ (sự cố cấp bách)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Thời hạn SLA tiêu chuẩn</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="12"
                      max="168"
                      value={config.slaNormalHours}
                      onChange={(e) => updateConfig('slaNormalHours', parseInt(e.target.value, 10) || 12)}
                      className="w-20 px-2.5 py-1 rounded bg-white border border-slate-300 font-mono text-center text-xs font-semibold"
                    />
                    <span className="text-slate-600">giờ (sự cố thông thường)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Số lần yêu cầu làm lại tối đa</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={config.maxReworkAttempts}
                      onChange={(e) => updateConfig('maxReworkAttempts', parseInt(e.target.value, 10) || 1)}
                      className="w-20 px-2.5 py-1 rounded bg-white border border-slate-300 font-mono text-center text-xs font-semibold"
                    />
                    <span className="text-slate-600">lần làm lại hiện trường</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">Tự động gợi ý Tổ đội theo GPS gần nhất</div>
                    <div className="text-[11px] text-slate-400">Tính khoảng cách km để đề xuất tổ đội phù hợp trên bảng điều phối.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoSuggestNearestTeam}
                    onChange={(e) => updateConfig('autoSuggestNearestTeam', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">Cho phép giao thẳng Tổ thi công</div>
                    <div className="text-[11px] text-slate-400">Bỏ qua bước khảo sát đối với các sự cố khẩn cấp.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.allowDirectConstruction}
                    onChange={(e) => updateConfig('allowDirectConstruction', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mục 4: Thông báo */}
          {activeCategory === 'NOTIFICATIONS' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Thông báo</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cấu hình các kênh liên lạc và phát cảnh báo sự cố.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Đường dây nóng (Hotline)</label>
                  <input
                    type="text"
                    value={config.supportHotline}
                    onChange={(e) => updateConfig('supportHotline', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Email hệ thống gửi thông báo</label>
                  <input
                    type="email"
                    value={config.notificationEmailSender}
                    onChange={(e) => updateConfig('notificationEmailSender', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">Thông báo đẩy thời gian thực WebSocket</div>
                    <div className="text-[11px] text-slate-400">Rung chuông và cập nhật bảng hàng đợi ngay khi có sự cố mới.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableRealtimeWebsocket}
                    onChange={(e) => updateConfig('enableRealtimeWebsocket', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">Gửi email cho công dân khi nghiệm thu hoàn tất</div>
                    <div className="text-[11px] text-slate-400">Gửi thư kèm ảnh trước và sau khi thi công cho người báo cáo.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.emailCitizenOnResolved}
                    onChange={(e) => updateConfig('emailCitizenOnResolved', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">Cảnh báo thời tiết xấu & mưa ngập</div>
                    <div className="text-[11px] text-slate-400">Hiển thị thông báo lưu ý khi thời tiết có mưa bão lớn.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.emergencyWeatherAlerts}
                    onChange={(e) => updateConfig('emergencyWeatherAlerts', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mục 5: Bảo mật */}
          {activeCategory === 'SECURITY' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Bảo mật</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chính sách bảo mật phiên làm việc và kiểm soát lưu lượng báo cáo.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Chế độ bảo trì hệ thống</div>
                    <div className="text-[11px] text-slate-400">Tạm dừng nhận phản ánh mới để nâng cấp hệ thống.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateConfig('maintenanceMode', !config.maintenanceMode)}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors ${
                      config.maintenanceMode
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {config.maintenanceMode ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>

                <div className="py-2 flex items-center justify-between border-t border-slate-100">
                  <div>
                    <div className="font-medium text-slate-800">Thời gian hết hạn phiên làm việc</div>
                    <div className="text-[11px] text-slate-400">Tự động đăng xuất sau khoảng thời gian không thao tác.</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="15"
                      max="480"
                      value={config.sessionTimeoutMinutes}
                      onChange={(e) => updateConfig('sessionTimeoutMinutes', parseInt(e.target.value, 10) || 15)}
                      className="w-16 px-2 py-1 rounded border border-slate-300 text-center font-mono"
                    />
                    <span className="text-slate-500">phút</span>
                  </div>
                </div>

                <div className="py-2 flex items-center justify-between border-t border-slate-100">
                  <div>
                    <div className="font-medium text-slate-800">Giới hạn tần suất gửi báo cáo (Rate-limiting)</div>
                    <div className="text-[11px] text-slate-400">Chặn hành vi spam phản ánh liên tục từ cùng một IP/tài khoản.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableRateLimitReport}
                    onChange={(e) => updateConfig('enableRateLimitReport', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mục 6: Nhật ký */}
          {activeCategory === 'SYSTEM_LOGS' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Nhật ký</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cấu hình lưu trữ nhật ký thao tác và lịch sao lưu dữ liệu.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">Ghi nhật ký kiểm toán hành vi (Audit log)</div>
                    <div className="text-[11px] text-slate-400">Lưu lại thao tác duyệt, phân công và nghiệm thu của cán bộ.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableAuditLog}
                    onChange={(e) => updateConfig('enableAuditLog', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="py-2 flex items-center justify-between border-t border-slate-100">
                  <div>
                    <div className="font-medium text-slate-800">Thời gian lưu trữ nhật ký</div>
                    <div className="text-[11px] text-slate-400">Tự động dọn dẹp các bản ghi log cũ hơn thời gian này.</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={config.logRetentionDays}
                      onChange={(e) => updateConfig('logRetentionDays', parseInt(e.target.value, 10) || 30)}
                      className="w-16 px-2 py-1 rounded border border-slate-300 text-center font-mono"
                    />
                    <span className="text-slate-500">ngày</span>
                  </div>
                </div>

                <div className="py-2 flex items-center justify-between border-t border-slate-100">
                  <div>
                    <div className="font-medium text-slate-800">Lịch sao lưu dữ liệu tự động</div>
                    <div className="text-[11px] text-slate-400">Khung giờ hệ thống tự động backup cơ sở dữ liệu.</div>
                  </div>
                  <select
                    value={config.autoBackupSchedule}
                    onChange={(e) => updateConfig('autoBackupSchedule', e.target.value)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 text-xs cursor-pointer"
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

      {/* 3. Phía dưới: Nút Khôi phục mặc định và Lưu thay đổi */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Khôi phục mặc định</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium">Có thay đổi chưa lưu</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
