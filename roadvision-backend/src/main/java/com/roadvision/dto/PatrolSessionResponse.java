package com.roadvision.dto;

import com.roadvision.enums.PatrolStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatrolSessionResponse {

    private Long id;
    private String sessionCode;
    private Long inspectorId;
    private String inspectorName;
    private String inspectorEmail;
    private String routeName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Double totalDistanceKm;
    private Integer totalPotholesDetected;
    private String routeHealthRating;
    private String videoName;
    private String keyframeUrl1;
    private String keyframeUrl2;
    private String gpsPathJson;
    private BigDecimal startLatitude;
    private BigDecimal startLongitude;
    private BigDecimal endLatitude;
    private BigDecimal endLongitude;
    private PatrolStatus status;
    private String notes;
    private Long incidentId;
    private String incidentTicketCode;
    private Boolean hasNearbyDuplicate;
    private Long duplicateIncidentId;
    private String duplicateTicketCode;
    private Double duplicateDistanceMeters;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
