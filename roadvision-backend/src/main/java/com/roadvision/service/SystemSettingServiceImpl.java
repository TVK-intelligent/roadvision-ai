package com.roadvision.service;

import com.roadvision.dto.SystemHealthDTO;
import com.roadvision.dto.SystemSettingsDTO;
import com.roadvision.entity.SystemSetting;
import com.roadvision.repository.IncidentRepository;
import com.roadvision.repository.SystemSettingRepository;
import com.roadvision.repository.TeamRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingServiceImpl implements SystemSettingService {

    private final SystemSettingRepository settingRepo;
    private final IncidentRepository incidentRepo;
    private final TeamRepository teamRepo;

    // Cache / Defaults
    private static final Map<String, String[]> DEFAULT_SETTINGS = new LinkedHashMap<>();

    static {
        // [category, default_value, data_type, display_name, description]
        DEFAULT_SETTINGS.put("ai.confidence_threshold", new String[]{
            "AI", "0.70", "NUMBER", "Ngưỡng độ tin cậy AI tối thiểu", "Ngưỡng tự động chấp nhận nhận diện AI (0.01 - 1.00)"
        });
        DEFAULT_SETTINGS.put("ai.duplicate_radius_meters", new String[]{
            "AI", "25", "NUMBER", "Bán kính quét trùng lặp vị trí", "Khoảng cách GPS (mét) để cảnh báo sự cố trùng lặp lân cận"
        });
        DEFAULT_SETTINGS.put("ai.auto_severity_classification", new String[]{
            "AI", "true", "BOOLEAN", "Tự động phân loại mức độ khẩn", "AI tự động gắn mức khẩn cấp dựa trên kích thước sự cố"
        });
        DEFAULT_SETTINGS.put("ai.model_vision", new String[]{
            "AI", "YOLOv8x-Custom-RoadHazard-v2.4", "STRING", "Mô hình thị giác AI", "Model ONNX / YOLOv8 nhận diện hư hỏng đường bộ"
        });
        DEFAULT_SETTINGS.put("ai.blur_face_license_plates", new String[]{
            "AI", "true", "BOOLEAN", "Che mờ mặt người & biển số xe", "Bảo vệ quyền riêng tư công dân trước khi công khai ảnh"
        });
        DEFAULT_SETTINGS.put("ai.auto_analysis_on_submit", new String[]{
            "AI", "true", "BOOLEAN", "Phân tích AI ngay khi gửi", "Chạy suy luận AI tức thì khi công dân tải ảnh hiện trường"
        });
        DEFAULT_SETTINGS.put("ai.iou_threshold", new String[]{
            "AI", "0.45", "NUMBER", "Ngưỡng giao thoa IoU", "Ngưỡng Non-Maximum Suppression (NMS) lọc bounding box"
        });

        // DISPATCH & SLA
        DEFAULT_SETTINGS.put("dispatch.sla_critical_hours", new String[]{
            "DISPATCH", "4", "NUMBER", "Thời hạn cam kết SLA khẩn cấp", "Số giờ tối đa phải tiếp nhận xử lý sự cố cấp độ Critical"
        });
        DEFAULT_SETTINGS.put("dispatch.sla_normal_hours", new String[]{
            "DISPATCH", "48", "NUMBER", "Thời hạn cam kết SLA tiêu chuẩn", "Số giờ tối đa giải quyết sự cố thông thường"
        });
        DEFAULT_SETTINGS.put("dispatch.auto_suggest_nearest_team", new String[]{
            "DISPATCH", "true", "BOOLEAN", "Gợi ý tổ đội theo GPS", "Tự động tính cự ly Km và gợi ý tổ đội gần nhất"
        });
        DEFAULT_SETTINGS.put("dispatch.allow_direct_construction", new String[]{
            "DISPATCH", "true", "BOOLEAN", "Cho phép giao thẳng thi công", "Bỏ qua bước khảo sát đối với sự cố khẩn cấp hoặc rõ ràng"
        });
        DEFAULT_SETTINGS.put("dispatch.max_rework_attempts", new String[]{
            "DISPATCH", "3", "NUMBER", "Số lần yêu cầu làm lại tối đa", "Giới hạn số lần bắt tổ thi công làm lại trước khi điều tra"
        });
        DEFAULT_SETTINGS.put("dispatch.require_inspection_attachment", new String[]{
            "DISPATCH", "false", "BOOLEAN", "Bắt buộc biên bản nghiệm thu", "Yêu cầu đính kèm file biên bản BoQ đo đạc khi nghiệm thu"
        });

        // NOTIFICATION & ALERT
        DEFAULT_SETTINGS.put("notify.enable_realtime_websocket", new String[]{
            "NOTIFICATION", "true", "BOOLEAN", "Kênh thông báo WebSocket", "Phát cảnh báo và tin tức thời gian thực đến Client"
        });
        DEFAULT_SETTINGS.put("notify.email_citizen_on_resolved", new String[]{
            "NOTIFICATION", "true", "BOOLEAN", "Gửi email cho công dân", "Gửi thư điện tử kèm ảnh nghiệm thu khi sự cố hoàn thành"
        });
        DEFAULT_SETTINGS.put("notify.emergency_weather_alerts", new String[]{
            "NOTIFICATION", "true", "BOOLEAN", "Cảnh báo thời tiết xấu", "Tự động nâng mức cảnh báo ngập úng khi có tin bão lũ"
        });
        DEFAULT_SETTINGS.put("notify.support_hotline", new String[]{
            "NOTIFICATION", "1900-6868", "STRING", "Đường dây nóng hỗ trợ", "Hotline trực ban 24/7 của Trung tâm Điều phối Giao thông"
        });
        DEFAULT_SETTINGS.put("notify.email_sender", new String[]{
            "NOTIFICATION", "hotline@roadvision.gov.vn", "STRING", "Email hệ thống", "Địa chỉ email gửi thông báo tự động"
        });

        // SYSTEM & GENERAL
        DEFAULT_SETTINGS.put("system.org_name", new String[]{
            "SYSTEM", "Sở Giao Thông Vận Tải TP. Hà Nội", "STRING", "Cơ quan chủ quản", "Tên cơ quan quản lý và vận hành hệ thống RoadVision"
        });
        DEFAULT_SETTINGS.put("system.environment", new String[]{
            "SYSTEM", "PRODUCTION", "STRING", "Môi trường triển khai", "Môi trường máy chủ (PRODUCTION / STAGING / DEVELOPMENT)"
        });
        DEFAULT_SETTINGS.put("system.maintenance_mode", new String[]{
            "SYSTEM", "false", "BOOLEAN", "Chế độ bảo trì hệ thống", "Tạm khóa gửi phản ánh mới khi hệ thống nâng cấp định kỳ"
        });
        DEFAULT_SETTINGS.put("system.auto_backup_schedule", new String[]{
            "SYSTEM", "Hàng ngày (02:00 AM)", "STRING", "Lịch sao lưu dữ liệu tự động", "Thời gian sao lưu snapshot CSDL và hồ sơ ảnh"
        });
        DEFAULT_SETTINGS.put("system.enable_audit_log", new String[]{
            "SYSTEM", "true", "BOOLEAN", "Nhật ký kiểm toán nghiệp vụ", "Ghi log chi tiết danh tính admin/cán bộ thực hiện lệnh điều phối"
        });
        DEFAULT_SETTINGS.put("system.map_default_center", new String[]{
            "SYSTEM", "21.0285,105.8542", "STRING", "Tọa độ trung tâm bản đồ", "Tọa độ GPS mặc định hiển thị bản đồ GIS (Hà Nội)"
        });
        DEFAULT_SETTINGS.put("system.map_default_zoom", new String[]{
            "SYSTEM", "13", "NUMBER", "Độ thu phóng bản đồ mặc định", "Mức zoom mặc định trên bản đồ Leaflet (1 - 18)"
        });
    }

    @PostConstruct
    @Transactional
    public void initDefaults() {
        log.info("Checking and initializing system settings defaults...");
        for (Map.Entry<String, String[]> entry : DEFAULT_SETTINGS.entrySet()) {
            String key = entry.getKey();
            String[] meta = entry.getValue();
            if (settingRepo.findByKey(key).isEmpty()) {
                SystemSetting setting = SystemSetting.builder()
                        .category(meta[0])
                        .key(key)
                        .value(meta[1])
                        .dataType(meta[2])
                        .displayName(meta[3])
                        .description(meta[4])
                        .updatedBy("SYSTEM_INITIALIZER")
                        .build();
                settingRepo.save(setting);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSettingsDTO getSettings() {
        Map<String, String> map = new HashMap<>();
        String lastUpdatedBy = "SYSTEM";
        LocalDateTime lastUpdatedAt = null;

        for (SystemSetting s : settingRepo.findAll()) {
            map.put(s.getKey(), s.getValue());
            if (s.getUpdatedAt() != null && (lastUpdatedAt == null || s.getUpdatedAt().isAfter(lastUpdatedAt))) {
                lastUpdatedAt = s.getUpdatedAt();
                lastUpdatedBy = s.getUpdatedBy() != null ? s.getUpdatedBy() : lastUpdatedBy;
            }
        }

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
        String formattedTime = lastUpdatedAt != null ? lastUpdatedAt.format(dtf) : "Mặc định hệ thống";

        return SystemSettingsDTO.builder()
                // AI
                .aiConfidenceThreshold(parseDouble(map.get("ai.confidence_threshold"), 0.70))
                .duplicateRadiusMeters(parseInt(map.get("ai.duplicate_radius_meters"), 25))
                .autoSeverityClassification(parseBool(map.get("ai.auto_severity_classification"), true))
                .aiModelVision(map.getOrDefault("ai.model_vision", "YOLOv8x-Custom-RoadHazard-v2.4"))
                .blurFaceAndLicensePlates(parseBool(map.get("ai.blur_face_license_plates"), true))
                .autoAiAnalysisOnSubmit(parseBool(map.get("ai.auto_analysis_on_submit"), true))
                .iouThreshold(parseDouble(map.get("ai.iou_threshold"), 0.45))
                // Dispatch
                .slaCriticalHours(parseInt(map.get("dispatch.sla_critical_hours"), 4))
                .slaNormalHours(parseInt(map.get("dispatch.sla_normal_hours"), 48))
                .autoSuggestNearestTeam(parseBool(map.get("dispatch.auto_suggest_nearest_team"), true))
                .allowDirectConstruction(parseBool(map.get("dispatch.allow_direct_construction"), true))
                .maxReworkAttempts(parseInt(map.get("dispatch.max_rework_attempts"), 3))
                .requireInspectionReportAttachment(parseBool(map.get("dispatch.require_inspection_attachment"), false))
                // Notification
                .enableRealtimeWebsocket(parseBool(map.get("notify.enable_realtime_websocket"), true))
                .emailCitizenOnResolved(parseBool(map.get("notify.email_citizen_on_resolved"), true))
                .emergencyWeatherAlerts(parseBool(map.get("notify.emergency_weather_alerts"), true))
                .supportHotline(map.getOrDefault("notify.support_hotline", "1900-6868"))
                .notificationEmailSender(map.getOrDefault("notify.email_sender", "hotline@roadvision.gov.vn"))
                // System
                .organizationName(map.getOrDefault("system.org_name", "Sở Giao Thông Vận Tải TP. Hà Nội"))
                .systemEnvironment(map.getOrDefault("system.environment", "PRODUCTION"))
                .maintenanceMode(parseBool(map.get("system.maintenance_mode"), false))
                .autoBackupSchedule(map.getOrDefault("system.auto_backup_schedule", "Hàng ngày (02:00 AM)"))
                .enableAuditLog(parseBool(map.get("system.enable_audit_log"), true))
                .mapDefaultCenter(map.getOrDefault("system.map_default_center", "21.0285,105.8542"))
                .mapDefaultZoom(parseInt(map.get("system.map_default_zoom"), 13))
                // Metadata
                .lastUpdatedAt(formattedTime)
                .lastUpdatedBy(lastUpdatedBy)
                .build();
    }

    @Override
    @Transactional
    public SystemSettingsDTO updateSettings(SystemSettingsDTO dto, String adminEmail) {
        log.info("Updating system settings by Admin: {}", adminEmail);

        // AI
        if (dto.getAiConfidenceThreshold() != null) saveSetting("ai.confidence_threshold", String.valueOf(dto.getAiConfidenceThreshold()), adminEmail);
        if (dto.getDuplicateRadiusMeters() != null) saveSetting("ai.duplicate_radius_meters", String.valueOf(dto.getDuplicateRadiusMeters()), adminEmail);
        if (dto.getAutoSeverityClassification() != null) saveSetting("ai.auto_severity_classification", String.valueOf(dto.getAutoSeverityClassification()), adminEmail);
        if (dto.getAiModelVision() != null) saveSetting("ai.model_vision", dto.getAiModelVision().trim(), adminEmail);
        if (dto.getBlurFaceAndLicensePlates() != null) saveSetting("ai.blur_face_license_plates", String.valueOf(dto.getBlurFaceAndLicensePlates()), adminEmail);
        if (dto.getAutoAiAnalysisOnSubmit() != null) saveSetting("ai.auto_analysis_on_submit", String.valueOf(dto.getAutoAiAnalysisOnSubmit()), adminEmail);
        if (dto.getIouThreshold() != null) saveSetting("ai.iou_threshold", String.valueOf(dto.getIouThreshold()), adminEmail);

        // Dispatch
        if (dto.getSlaCriticalHours() != null) saveSetting("dispatch.sla_critical_hours", String.valueOf(dto.getSlaCriticalHours()), adminEmail);
        if (dto.getSlaNormalHours() != null) saveSetting("dispatch.sla_normal_hours", String.valueOf(dto.getSlaNormalHours()), adminEmail);
        if (dto.getAutoSuggestNearestTeam() != null) saveSetting("dispatch.auto_suggest_nearest_team", String.valueOf(dto.getAutoSuggestNearestTeam()), adminEmail);
        if (dto.getAllowDirectConstruction() != null) saveSetting("dispatch.allow_direct_construction", String.valueOf(dto.getAllowDirectConstruction()), adminEmail);
        if (dto.getMaxReworkAttempts() != null) saveSetting("dispatch.max_rework_attempts", String.valueOf(dto.getMaxReworkAttempts()), adminEmail);
        if (dto.getRequireInspectionReportAttachment() != null) saveSetting("dispatch.require_inspection_attachment", String.valueOf(dto.getRequireInspectionReportAttachment()), adminEmail);

        // Notification
        if (dto.getEnableRealtimeWebsocket() != null) saveSetting("notify.enable_realtime_websocket", String.valueOf(dto.getEnableRealtimeWebsocket()), adminEmail);
        if (dto.getEmailCitizenOnResolved() != null) saveSetting("notify.email_citizen_on_resolved", String.valueOf(dto.getEmailCitizenOnResolved()), adminEmail);
        if (dto.getEmergencyWeatherAlerts() != null) saveSetting("notify.emergency_weather_alerts", String.valueOf(dto.getEmergencyWeatherAlerts()), adminEmail);
        if (dto.getSupportHotline() != null) saveSetting("notify.support_hotline", dto.getSupportHotline().trim(), adminEmail);
        if (dto.getNotificationEmailSender() != null) saveSetting("notify.email_sender", dto.getNotificationEmailSender().trim(), adminEmail);

        // System
        if (dto.getOrganizationName() != null) saveSetting("system.org_name", dto.getOrganizationName().trim(), adminEmail);
        if (dto.getSystemEnvironment() != null) saveSetting("system.environment", dto.getSystemEnvironment().trim(), adminEmail);
        if (dto.getMaintenanceMode() != null) saveSetting("system.maintenance_mode", String.valueOf(dto.getMaintenanceMode()), adminEmail);
        if (dto.getAutoBackupSchedule() != null) saveSetting("system.auto_backup_schedule", dto.getAutoBackupSchedule().trim(), adminEmail);
        if (dto.getEnableAuditLog() != null) saveSetting("system.enable_audit_log", String.valueOf(dto.getEnableAuditLog()), adminEmail);
        if (dto.getMapDefaultCenter() != null) saveSetting("system.map_default_center", dto.getMapDefaultCenter().trim(), adminEmail);
        if (dto.getMapDefaultZoom() != null) saveSetting("system.map_default_zoom", String.valueOf(dto.getMapDefaultZoom()), adminEmail);

        return getSettings();
    }

    @Override
    @Transactional
    public SystemSettingsDTO resetToDefaults(String adminEmail) {
        log.warn("Resetting all system settings to factory defaults by Admin: {}", adminEmail);
        for (Map.Entry<String, String[]> entry : DEFAULT_SETTINGS.entrySet()) {
            saveSetting(entry.getKey(), entry.getValue()[1], adminEmail);
        }
        return getSettings();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemHealthDTO getSystemHealth() {
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        long uptimeSeconds = uptimeMs / 1000;
        long hours = uptimeSeconds / 3600;
        long minutes = (uptimeSeconds % 3600) / 60;
        long seconds = uptimeSeconds % 60;
        String formattedUptime = String.format("%d giờ %d phút %d giây", hours, minutes, seconds);

        Runtime runtime = Runtime.getRuntime();
        long totalMemoryMb = runtime.totalMemory() / (1024 * 1024);
        long freeMemoryMb = runtime.freeMemory() / (1024 * 1024);
        long maxMemoryMb = runtime.maxMemory() / (1024 * 1024);

        long totalIncidents = incidentRepo.count();
        long activeTeams = teamRepo.count();

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
        String nowStr = LocalDateTime.now().format(dtf);

        Map<String, Object> additional = new LinkedHashMap<>();
        additional.put("springVersion", "3.2.x");
        additional.put("javaVendor", System.getProperty("java.vendor"));
        additional.put("osName", System.getProperty("os.name"));
        additional.put("cpuCores", runtime.availableProcessors());

        return SystemHealthDTO.builder()
                .status("UP")
                .uptime(formattedUptime)
                .uptimeSeconds(uptimeSeconds)
                .jvmVersion(System.getProperty("java.version"))
                .jvmFreeMemoryMb(freeMemoryMb)
                .jvmTotalMemoryMb(totalMemoryMb)
                .jvmMaxMemoryMb(maxMemoryMb)
                .databaseStatus("CONNECTED (MySQL 8.0 on localhost:3306/roadcare_db)")
                .aiInferenceEngine("ONNX Runtime 1.17 + Google Gemini Flash 2.5 API")
                .aiModelLoaded(true)
                .totalIncidentsCount(totalIncidents)
                .pendingDispatchCount(0L) // active in queue
                .activeTeamsCount(activeTeams)
                .serverTimestamp(nowStr)
                .additionalMetrics(additional)
                .build();
    }

    private void saveSetting(String key, String value, String adminEmail) {
        Optional<SystemSetting> opt = settingRepo.findByKey(key);
        if (opt.isPresent()) {
            SystemSetting s = opt.get();
            s.setValue(value);
            s.setUpdatedBy(adminEmail);
            s.setUpdatedAt(LocalDateTime.now());
            settingRepo.save(s);
        } else if (DEFAULT_SETTINGS.containsKey(key)) {
            String[] meta = DEFAULT_SETTINGS.get(key);
            SystemSetting s = SystemSetting.builder()
                    .category(meta[0])
                    .key(key)
                    .value(value)
                    .dataType(meta[2])
                    .displayName(meta[3])
                    .description(meta[4])
                    .updatedBy(adminEmail)
                    .build();
            settingRepo.save(s);
        }
    }

    private double parseDouble(String val, double def) {
        if (val == null) return def;
        try { return Double.parseDouble(val); } catch (Exception e) { return def; }
    }

    private int parseInt(String val, int def) {
        if (val == null) return def;
        try { return Integer.parseInt(val); } catch (Exception e) { return def; }
    }

    private boolean parseBool(String val, boolean def) {
        if (val == null) return def;
        return Boolean.parseBoolean(val);
    }

    @Override
    public double getAiConfidenceThreshold() {
        return parseDouble(settingRepo.findByKey("ai.confidence_threshold").map(SystemSetting::getValue).orElse(null), 0.70);
    }

    @Override
    public int getDuplicateRadiusMeters() {
        return parseInt(settingRepo.findByKey("ai.duplicate_radius_meters").map(SystemSetting::getValue).orElse(null), 25);
    }

    @Override
    public boolean isAutoSeverityClassificationEnabled() {
        return parseBool(settingRepo.findByKey("ai.auto_severity_classification").map(SystemSetting::getValue).orElse(null), true);
    }

    @Override
    public int getSlaCriticalHours() {
        return parseInt(settingRepo.findByKey("dispatch.sla_critical_hours").map(SystemSetting::getValue).orElse(null), 4);
    }

    @Override
    public int getSlaNormalHours() {
        return parseInt(settingRepo.findByKey("dispatch.sla_normal_hours").map(SystemSetting::getValue).orElse(null), 48);
    }
}
