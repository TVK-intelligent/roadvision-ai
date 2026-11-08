package com.roadvision.dto;

import com.roadvision.enums.TeamType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
    private Double baseLatitude;
    private Double baseLongitude;
    private String baseAddress;
    private Long leaderId;
    private List<Long> memberIds;
    @Builder.Default
    private Boolean isActive = true;
}
