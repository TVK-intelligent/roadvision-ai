package com.roadvision.dto;

import com.roadvision.enums.Priority;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionAssignRequest {
    @NotNull(message = "Tổ khảo sát không được để trống")
    private Long teamId;

    private Long inspectorId; // Nhân viên cụ thể phụ trách (nếu có, không bắt buộc)

    private Priority priority;

    private String notes;
}
