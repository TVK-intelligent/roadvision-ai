package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyIncidentCheckResponse {
    private boolean hasNearbyDuplicate;
    private Double distanceMeters;
    private IncidentResponse existingIncident;
    private String message;
}
