package com.roadvision.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettingsDTO {

    // ==========================================
    // 1. NHÓM TRÍ TUỆ NHÂN TẠO & AI VISION
    // ==========================================
    private Double aiConfidenceThreshold;
    private Integer duplicateRadiusMeters;
    private Boolean autoSeverityClassification;
    private String aiModelVision;
    private Boolean blurFaceAndLicensePlates;
    private Boolean autoAiAnalysisOnSubmit;
    private Double iouThreshold;

    // ==========================================
    // 2. NHÓM QUY TRÌNH & ĐIỀU PHỐI (DISPATCH & SLA)
    // ==========================================
    private Integer slaCriticalHours;
    private Integer slaNormalHours;
    private Boolean autoSuggestNearestTeam;
    private Boolean allowDirectConstruction;
    private Integer maxReworkAttempts;
    private Boolean requireInspectionReportAttachment;

    // ==========================================
    // 3. NHÓM THÔNG BÁO & KÊNH CẢNH BÁO
    // ==========================================
    private Boolean enableRealtimeWebsocket;
    private Boolean emailCitizenOnResolved;
    private Boolean emergencyWeatherAlerts;
    private String supportHotline;
    private String notificationEmailSender;

    // ==========================================
    // 4. NHÓM THÔNG TIN CƠ QUAN & HỆ THỐNG
    // ==========================================
    private String organizationName;
    private String systemEnvironment;
    private Boolean maintenanceMode;
    private String autoBackupSchedule;
    private Boolean enableAuditLog;
    private String mapDefaultCenter;
    private Integer mapDefaultZoom;

    // Metadata
    private String lastUpdatedAt;
    private String lastUpdatedBy;
}
