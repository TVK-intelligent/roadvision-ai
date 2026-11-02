import React, { useState, useEffect } from 'react';
import { settingsApi, SystemSettings, SystemHealth } from '../services/settingsApi';
import { useToast } from '../components/Toast';
import {
  Settings,
  Cpu,
  Clock,
  Bell,
  Building2,
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
} from 'lucide-react';

type TabKey = 'AI' | 'DISPATCH' | 'NOTIFICATION' | 'SYSTEM';

export const AdminSettingsPage: React.FC = () => {
  const toast = useToast();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('AI');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await settingsApi.updateSettings(settings);
      setSettings(updated);
      setHasUnsavedChanges(false);
      toast.success('Đã lưu và áp dụng toàn bộ tham số hệ thống!', 'Cập nhật thành công');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu cài đặt', 'Lỗi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      const resetData = await settingsApi.resetToDefaults();
      setSettings(resetData);
      setHasUnsavedChanges(false);
      setIsResetModalOpen(false);
      toast.info('Đã khôi phục toàn bộ thông số về mặc định xuất xưởng!', 'Khôi phục mặc định');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể khôi phục mặc định', 'Lỗi');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportJSON = () => {
    if (!settings) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `roadvision-settings-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.info('Đã xuất file sao lưu cấu hình hệ thống JSON', 'Xuất cấu hình');
  };

  if (loading || !settings) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-600">Đang tải tham số cấu hình hệ thống...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>Cài Đặt & Cấu Hình Hệ Thống</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  {settings.systemEnvironment}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý tham số mô hình AI, cam kết chất lượng SLA điều phối, kênh cảnh báo và máy chủ vận hành
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportJSON}
            title="Tải về file JSON sao lưu cài đặt"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            title="Khôi phục toàn bộ cài đặt về ban đầu"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-500/30 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thay đổi {hasUnsavedChanges && '•'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. System Health & Infrastructure Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-600" /> Trạng Thái Máy Chủ
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              HOẠT ĐỘNG
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {health?.uptime || 'Đang kết nối...'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Thời gian trực tuyến liên tục (Uptime)
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-sky-600" /> Tài Nguyên JVM (RAM)
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-500">
              Java {health?.jvmVersion || '21'}
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {health ? `${health.jvmTotalMemoryMb - health.jvmFreeMemoryMb} / ${health.jvmTotalMemoryMb} MB` : '—'}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-sky-500 h-1.5 rounded-full transition-all"
                style={{
                  width: health
                    ? `${Math.round(((health.jvmTotalMemoryMb - health.jvmFreeMemoryMb) / health.jvmTotalMemoryMb) * 100)}%`
                    : '40%',
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600" /> Động Cơ AI Thị Giác
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Sẵn sàng
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-bold text-slate-900 truncate" title={health?.aiInferenceEngine || ''}>
              ONNX + Gemini Flash
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              Model: {settings.aiModelVision}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-amber-600" /> CSDL & Quy Mô
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              MySQL 8.0
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {health?.totalIncidentsCount ?? 0} sự cố
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {health?.activeTeamsCount ?? 0} tổ đội kỹ thuật chuyên trách
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('AI')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'AI'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>1. Trí Tuệ Nhân Tạo & AI Vision</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISPATCH')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'DISPATCH'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. Quy Trình & Điều Phối SLA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('NOTIFICATION')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'NOTIFICATION'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>3. Thông Báo & Kênh Cảnh Báo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SYSTEM')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'SYSTEM'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>4. Cơ Quan & Vận Hành Hệ Thống</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: TRÍ TUỆ NHÂN TẠO & AI VISION */}
        {/* ========================================================= */}
        {activeTab === 'AI' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Cấu Hình Tham Số Mô Hình AI Thị Giác Máy Tính</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Điều chỉnh độ nhạy suy luận, thuật toán lọc vật cản và chính sách bảo vệ quyền riêng tư công dân.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ngưỡng AI Confidence */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Ngưỡng Độ Tin Cậy AI Tối Thiểu (Confidence)</span>
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
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Các phát hiện hư hỏng có độ tin cậy thấp hơn ngưỡng này sẽ bị gắn cờ cần kiểm duyệt thủ công hoặc loại bỏ.
                </p>
              </div>

              {/* Bán kính quét trùng lặp GPS */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Bán Kính Quét Trùng Lặp Vị Trí (Mét)
                  </label>
                  <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                    {settings.duplicateRadiusMeters} mét
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
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cảnh báo sự cố trùng lặp nếu có 2 phản ánh cùng vị trí trong bán kính thiết lập, giúp tránh phân công trùng lặp.
                </p>
              </div>

              {/* Ngưỡng IoU Non-Max Suppression */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Ngưỡng Giao Thoa Bounding Box (IoU NMS)
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
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Lọc bỏ các khung nhận diện chồng chéo lên cùng một vị trí ổ gà hoặc vết nứt trên mặt đường.
                </p>
              </div>

              {/* Chọn Mô hình AI Vision */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Mô Hình Trí Tuệ Nhân Tạo Triển Khai
                  </label>
                  <select
                    value={settings.aiModelVision}
                    onChange={(e) => handleChange('aiModelVision', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="YOLOv8x-Custom-RoadHazard-v2.4">YOLOv8x-Custom-RoadHazard-v2.4 (Khuyên dùng - Độ chính xác cao)</option>
                    <option value="YOLOv8m-RoadPothole-Speed">YOLOv8m-RoadPothole-Speed (Tối ưu suy luận nhanh)</option>
                    <option value="Gemini-2.5-Flash-Vision-Multimodal">Gemini 2.5 Flash Vision Multimodal (Phân tích bối cảnh nâng cao)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  Mô hình mạng nơ-ron tích chập (CNN) được huấn luyện trên 45.000 ảnh hư hỏng đường bộ tại Việt Nam.
                </p>
              </div>
            </div>

            {/* Switch Toggles */}
            <div className="divide-y divide-slate-100 pt-2">
              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Che mờ khuôn mặt & biển số xe tự động</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sử dụng model phụ quét và làm mờ thông tin nhận dạng cá nhân trước khi ảnh sự cố được hiển thị công khai.
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

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Tự động kích hoạt phân tích AI ngay khi gửi</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống sẽ chạy nhận diện bounding box tức thì qua ONNX runtime ngay trong luồng tạo sự cố.
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

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Tự động phân loại mức độ khẩn cấp (Critical / Major / Moderate)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    AI tự động tính toán diện tích hư hỏng so với khổ đường và nâng mức cảnh báo khẩn nếu nguy cơ tai nạn cao.
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

        {/* ========================================================= */}
        {/* TAB 2: QUY TRÌNH & ĐIỀU PHỐI (SLA) */}
        {/* ========================================================= */}
        {activeTab === 'DISPATCH' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Quy Trình Nghiệp Vụ & Cam Kết Chất Lượng Dịch Vụ (SLA)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập thời hạn xử lý từng cấp độ sự cố và quy chuẩn điều hành giữa Bàn cờ Điều phối và 13 Tổ đội.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SLA Khẩn cấp */}
              <div className="space-y-2 p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Thời Hạn Cam Kết SLA Khẩn Cấp (Giờ)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={settings.slaCriticalHours}
                    onChange={(e) => handleChange('slaCriticalHours', parseInt(e.target.value, 10) || 1)}
                    className="w-28 px-3 py-2 rounded-lg bg-white border border-rose-300 text-sm font-bold font-mono text-rose-900 focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-xs text-rose-700 font-medium">
                    giờ kể từ khi tiếp nhận (áp dụng cho sự cố Cấp Bách)
                  </span>
                </div>
                <p className="text-[11px] text-rose-600">
                  Nếu vượt quá thời hạn này, hệ thống sẽ tự động gửi cảnh báo vi phạm SLA lên lãnh đạo Sở.
                </p>
              </div>

              {/* SLA Tiêu chuẩn */}
              <div className="space-y-2 p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Thời Hạn Cam Kết SLA Tiêu Chuẩn (Giờ)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="12"
                    max="168"
                    step="6"
                    value={settings.slaNormalHours}
                    onChange={(e) => handleChange('slaNormalHours', parseInt(e.target.value, 10) || 12)}
                    className="w-28 px-3 py-2 rounded-lg bg-white border border-blue-300 text-sm font-bold font-mono text-blue-900 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-blue-700 font-medium">
                    giờ (tương đương {(settings.slaNormalHours / 24).toFixed(1)} ngày làm việc)
                  </span>
                </div>
                <p className="text-[11px] text-blue-600">
                  Thời hạn hoàn thành toàn bộ chu trình Khảo sát ➔ Thi công ➔ Nghiệm thu đối với sự cố thông thường.
                </p>
              </div>

              {/* Giới hạn số lần thi công lại */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800">
                  Số Lần Yêu Cầu Thi Công Lại Tối Đa
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.maxReworkAttempts}
                    onChange={(e) => handleChange('maxReworkAttempts', parseInt(e.target.value, 10) || 1)}
                    className="w-28 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">
                    lần làm lại hiện trường trước khi lập hội đồng thẩm tra
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Nếu tổ thi công bị từ chối nghiệm thu quá số lần này, sự cố sẽ chuyển sang trạng thái đình chỉ để giám sát đặc biệt.
                </p>
              </div>
            </div>

            {/* Switch Toggles */}
            <div className="divide-y divide-slate-100 pt-2">
              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Tự động gợi ý Tổ đội theo tọa độ GPS gần nhất</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống tính khoảng cách đường bộ bằng thuật toán Haversine / OSRM và tự động đánh dấu [Gợi ý] trên modal điều phối.
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

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Cho phép giao thẳng Tổ thi công (Bỏ qua khảo sát thực địa)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hiển thị tùy chọn "Giao thi công trực tiếp" trên dropdown điều phối để ứng phó nhanh các tình huống cấp bách.
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

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Bắt buộc đính kèm biên bản nghiệm thu kỹ thuật (PDF / Scan)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Yêu cầu tải lên file văn bản ký số giữa Chủ đầu tư và Nhà thầu khi phê duyệt hoàn thành.
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

        {/* ========================================================= */}
        {/* TAB 3: THÔNG BÁO & KÊNH CẢNH BÁO */}
        {/* ========================================================= */}
        {activeTab === 'NOTIFICATION' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>Kênh Cảnh Báo, Truyền Thông & Tương Tác Công Dân</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấu hình thông báo tức thì qua WebSocket, email tự động gửi công dân và hotline khẩn cấp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hotline */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <span>Đường Dây Nóng Hỗ Trợ Kỹ Thuật (Hotline 24/7)</span>
                </label>
                <input
                  type="text"
                  value={settings.supportHotline}
                  onChange={(e) => handleChange('supportHotline', e.target.value)}
                  placeholder="1900-6868"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Số điện thoại tổng đài được hiển thị ở chân trang và trên app di động của người dân.
                </p>
              </div>

              {/* Email người gửi */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Địa Chỉ Email Gửi Thông Báo Tự Động</span>
                </label>
                <input
                  type="email"
                  value={settings.notificationEmailSender}
                  onChange={(e) => handleChange('notificationEmailSender', e.target.value)}
                  placeholder="hotline@roadvision.gov.vn"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Email SMTP dùng để gửi thông báo tiến độ và thư cảm ơn khi người dân gửi phản ánh sự cố.
                </p>
              </div>
            </div>

            {/* Switch Toggles */}
            <div className="divide-y divide-slate-100 pt-2">
              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Kích hoạt luồng thông báo thời gian thực WebSocket</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Đẩy thông báo ngay lập tức lên quả chuông Topbar khi có sự cố mới phát sinh hoặc có lệnh điều xe.
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

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Tự động gửi email cho người dân khi sự cố được nghiệm thu</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Gửi thư kèm hình ảnh so sánh trước/sau thi công để công dân trực tiếp đánh giá và cộng điểm uy tín.
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

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Phát sóng cảnh báo thời tiết xấu & mưa bão diện rộng</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tự động đồng bộ với dữ liệu thời tiết và hiển thị banner cảnh báo nguy hiểm ngập lụt trên toàn trang.
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

        {/* ========================================================= */}
        {/* TAB 4: THÔNG TIN CƠ QUAN & HỆ THỐNG */}
        {/* ========================================================= */}
        {activeTab === 'SYSTEM' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Thông Tin Cơ Quan Quản Lý & Cấu Hình Môi Trường</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập định danh cơ quan chủ quản, bản đồ số GIS mặc định và chính sách sao lưu định kỳ.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tên cơ quan */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800">
                  Tên Cơ Quan Chủ Quản Vận Hành
                </label>
                <input
                  type="text"
                  value={settings.organizationName}
                  onChange={(e) => handleChange('organizationName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Hiển thị trên tiêu đề báo cáo, biên bản nghiệm thu pháp lý và trang công khai.
                </p>
              </div>

              {/* Môi trường */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800">
                  Môi Trường Vận Hành (Environment)
                </label>
                <select
                  value={settings.systemEnvironment}
                  onChange={(e) => handleChange('systemEnvironment', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="PRODUCTION">PRODUCTION (Môi trường sản xuất chính thức)</option>
                  <option value="STAGING">STAGING (Môi trường thử nghiệm & Nghiệm thu)</option>
                  <option value="DEVELOPMENT">DEVELOPMENT (Môi trường phát triển cục bộ)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Chế độ PRODUCTION tự động bật cache nén ảnh và kiểm soát bảo mật chặt chẽ.
                </p>
              </div>

              {/* Tọa độ trung tâm bản đồ GIS */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Tọa Độ Trung Tâm Bản Đồ GIS Mặc Định
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">Latitude, Longitude</span>
                </div>
                <input
                  type="text"
                  value={settings.mapDefaultCenter}
                  onChange={(e) => handleChange('mapDefaultCenter', e.target.value)}
                  placeholder="21.0285,105.8542"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Tọa độ gốc khi người dùng mở trang Bản đồ Không gian GIS (mặc định trung tâm Hà Nội).
                </p>
              </div>

              {/* Mức thu phóng Zoom */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Độ Thu Phóng Ban Đầu Của Bản Đồ (Zoom Level)
                  </label>
                  <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                    Mức {settings.mapDefaultZoom}
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="18"
                  value={settings.mapDefaultZoom}
                  onChange={(e) => handleChange('mapDefaultZoom', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Mức zoom 13 tương ứng bao quát toàn thành phố; 16 tương ứng hiển thị rõ từng tuyến phố nhỏ.
                </p>
              </div>
            </div>

            {/* Switch Toggles */}
            <div className="divide-y divide-slate-100 pt-2">
              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Kích hoạt chế độ bảo trì hệ thống (Maintenance Mode)</span>
                    {settings.maintenanceMode && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                        ĐANG BẬT
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tạm dừng tiếp nhận phản ánh mới từ công dân để phục vụ nâng cấp máy chủ hoặc sao lưu CSDL định kỳ.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1 ${
                      settings.maintenanceMode ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="pr-4">
                  <div className="text-xs font-bold text-slate-800">Ghi nhật ký kiểm toán hành vi (Audit Logging)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Lưu trữ dấu vết thời gian và địa chỉ IP khi Admin thực hiện phân công, duyệt nghiệm thu hoặc từ chối sự cố.
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

        {/* 5. Sticky Bottom Action Bar when has unsaved changes */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-medium text-slate-200">
                Có thay đổi tham số cấu hình chưa được lưu!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchData}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* 6. Metadata footer */}
      <div className="text-center text-[11px] text-slate-400 pt-2 pb-6">
        Cấu hình được cập nhật lần cuối vào lúc: <span className="font-semibold text-slate-600">{settings.lastUpdatedAt}</span> bởi <span className="font-mono font-semibold text-blue-600">{settings.lastUpdatedBy}</span>
      </div>

      {/* 7. Modal Xác Nhận Khôi Phục Cài Đặt Gốc */}
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
              Thao tác này sẽ đưa toàn bộ tham số mô hình AI, ngưỡng SLA, cấu hình thông báo và bản đồ về giá trị gốc của hệ thống. Bạn có chắc chắn muốn thực hiện?
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
