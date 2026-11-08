package com.roadvision.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FraudReversalRequest {
    @NotBlank(message = "Lý do thu hồi không được để trống")
    @Size(min = 10, max = 500, message = "Lý do thu hồi phải từ 10 đến 500 ký tự")
    private String reason;
}
