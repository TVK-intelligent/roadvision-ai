package com.roadvision.dto;

import com.roadvision.enums.Category;
import com.roadvision.enums.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionResponse {
    private Long id;
    private Long incidentId;
    private Long inspectorId;
    private String inspectorName;
    private Long inspectionTeamId;
    private String inspectionTeamName;
    private BigDecimal actualLatitude;
    private BigDecimal actualLongitude;
    private Category confirmedCategory;
    private Severity actualSeverity;
    private String estimatedSize;
    private String trafficImpact;
    private String proposedSolution;
    private Boolean noDamageFound;
    private String reasonNoDamage;
    private String notes;
    private List<String> inspectionPhotos;
    private LocalDateTime inspectedAt;
}
