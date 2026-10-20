package com.roadvision.dto;

import com.roadvision.enums.TeamType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamRequest {
    @NotBlank(message = "Tên tổ đội không được để trống")
    private String name;

    @NotNull(message = "Loại tổ đội không được để trống")
    private TeamType teamType;

    private String corridor;
    private String zoneName;
    private String description;
    private Long leaderId;
    @Builder.Default
    private Boolean isActive = true;
}
