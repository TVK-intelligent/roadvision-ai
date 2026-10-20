package com.roadvision.dto;

import com.roadvision.enums.Role;
import com.roadvision.enums.TeamType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private Boolean isActive;
    private Long teamId;
    private String teamName;
    private TeamType teamType;
    private String corridor;
    private String zoneName;
    private Boolean isTeamLeader;
    private String specialization;
    private Long activeTasksCount;
    private LocalDateTime createdAt;
}
