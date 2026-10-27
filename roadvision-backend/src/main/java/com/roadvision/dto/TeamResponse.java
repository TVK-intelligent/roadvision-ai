package com.roadvision.dto;

import com.roadvision.enums.TeamType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponse {
    private Long id;
    private String name;
    private TeamType teamType;
    private String corridor;
    private String zoneName;
    private String description;
    private Boolean isActive;
    private Integer memberCount;
    private Long leaderId;
    private String leaderName;
    private String leaderPhone;
    private List<StaffResponse> members;
    private Integer activeTaskCount;
    private String availabilityStatus; // AVAILABLE, BUSY, OVERLOADED, INACTIVE
    private String currentActiveIncidentTicket;
    private String currentActiveIncidentTitle;
    private List<TeamActiveTaskDto> activeTasks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
