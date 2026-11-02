package com.roadvision.dto;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemHealthDTO {
    private String status; // UP, DEGRADED, MAINTENANCE
    private String uptime;
    private Long uptimeSeconds;
    private String jvmVersion;
    private Long jvmFreeMemoryMb;
    private Long jvmTotalMemoryMb;
    private Long jvmMaxMemoryMb;
    private String databaseStatus;
    private String aiInferenceEngine;
    private Boolean aiModelLoaded;
    private Long totalIncidentsCount;
    private Long pendingDispatchCount;
    private Long activeTeamsCount;
    private String serverTimestamp;
    private Map<String, Object> additionalMetrics;
}
