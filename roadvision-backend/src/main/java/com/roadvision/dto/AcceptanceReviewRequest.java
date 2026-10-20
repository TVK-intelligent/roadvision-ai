package com.roadvision.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptanceReviewRequest {
    @NotNull(message = "Kết quả thẩm định nghiệm thu không được để trống")
    private Boolean approved; // true: Đạt yêu cầu (CLOSED), false: Không đạt (REWORK_REQUIRED)

    private String reworkReason; // Bắt buộc nếu approved = false

    private String notes; // Nhận xét của Admin khi nghiệm thu
}
