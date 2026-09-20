package com.roadvision.dto;

import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import com.roadvision.enums.Priority;
import com.roadvision.enums.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentResponse {
    private Long id;
    private String ticketCode;
    private String title;
    private String description;
    private String imageUrl;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String address;
    private Category category;
    private IncidentStatus status;
    private Severity severity;
    private String flag;
    private String rejectionReason;

    private Long citizenId;
    private String reporterName;
    private String reporterPhone;

    private AiDetectionResponse aiDetection;

    // Chi tiết phân công nếu có
    private AssignmentInfo assignment;

    // Chi tiết nghiệm thu nếu có
    private ResolutionInfo resolution;

    // Chi tiết đánh giá nếu có
    private FeedbackInfo feedback;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentInfo {
        private String assignedByAdminName;
        private Long assignedToStaffId;
        private String assignedToStaffName;
        private String verifiedCategory;
        private Priority priority;
        private String notes;
        private LocalDateTime assignedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResolutionInfo {
        private String staffName;
        private String proofImageUrl;
        private String notes;
        private LocalDateTime resolvedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackInfo {
        private Short rating;
        private String comments;
        private LocalDateTime createdAt;
    }
}
