package com.roadvision.dto;

import com.roadvision.enums.EvidenceStage;
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
public class EvidenceResponse {
    private Long id;
    private Long incidentId;
    private EvidenceStage stage;
    private String imageUrl;
    private Long uploaderId;
    private String uploaderName;
    private String notes;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer reworkIteration;
    private String aiVerificationStatus;
    private String aiVerificationNotes;
    private LocalDateTime createdAt;
}
