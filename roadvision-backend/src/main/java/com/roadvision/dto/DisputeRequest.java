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
public class DisputeRequest {

    @NotBlank(message = "Lý do khiếu nại không được để trống")
    private String reason;

    private Short rating;
}
