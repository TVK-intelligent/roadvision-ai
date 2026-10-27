package com.roadvision.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatrolSessionCreateRequest {

    @NotBlank(message = "Tên tuyến đường không được để trống")
    private String routeName;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Double totalDistanceKm;
    private Integer totalPotholesDetected;
    private String routeHealthRating; // 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL'
    private String videoName;
    private BigDecimal startLatitude;
    private BigDecimal startLongitude;
    private BigDecimal endLatitude;
    private BigDecimal endLongitude;
    private String gpsPathJson;
    private String notes;
}
