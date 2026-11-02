package com.roadvision.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateReputationRequest {
    @NotNull(message = "Điểm uy tín không được để trống")
    @Min(value = 0, message = "Điểm uy tín tối thiểu là 0")
    @Max(value = 100, message = "Điểm uy tín tối đa là 100")
    private Integer reputationScore;

    private Boolean resetStrikes;
}
