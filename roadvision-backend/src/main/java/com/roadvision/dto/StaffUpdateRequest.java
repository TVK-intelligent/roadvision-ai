package com.roadvision.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffUpdateRequest {
    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    private String phone;

    private Long teamId;

    private Boolean isTeamLeader;

    private String specialization;

    private Boolean isActive;
}
