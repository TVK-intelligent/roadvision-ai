package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsResponse {

    // 5 Thẻ KPI cốt lõi
    private Long totalIncidents;
    private Double totalGrowthPercent;
    private Long triagePendingCount;
    private Long inProgressCount;
    private Integer activeCrewsCount;
    private Long resolvedCount;
    private Double clearanceRatePercent;
    private Double aiAccuracyPercent;
    private String aiModelVersion;
    private Long avgInferenceLatencyMs;
    private Double meanResolutionHours;

    // Phân bổ danh mục hư hại (Category Spectrum)
    private Map<String, Long> categoryCounts;
    private Map<String, Double> categoryPercentages;

    // Phân bổ theo trạng thái
    private Map<String, Long> statusCounts;

    // Xu hướng thời gian thực (Telemetric Verification Stream)
    private List<StreamPoint> telemetricStream;

    // Danh sách sự cố cần chú ý khẩn (Triage & Work Order Feed)
    private List<IncidentResponse> urgentIncidents;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StreamPoint {
        private String timeLabel;
        private Long aiSensorCount;
        private Long citizenReportCount;
    }
}
