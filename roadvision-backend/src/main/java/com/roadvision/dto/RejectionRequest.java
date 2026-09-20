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
public class RejectionRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String rejectionReason;
}
