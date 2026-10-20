package com.roadvision.dto;

import com.roadvision.enums.Priority;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConstructionAssignRequest {
    @NotNull(message = "Tổ thi công không được để trống")
    private Long teamId;

    private Long staffId; // Kỹ thuật viên/tổ trưởng phụ trách

    private String workPlan; // Phương án thi công được duyệt

    private Priority priority; // Mức độ ưu tiên

    private LocalDateTime plannedStartDate; // Hạn bắt đầu

    private LocalDateTime plannedDeadline;  // Hạn hoàn thành

    private String safetyNotes; // Yêu cầu an toàn giao thông, biển báo, vật tư

    private String instructions; // Hướng dẫn chi tiết từ Admin
}
