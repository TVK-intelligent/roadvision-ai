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
public class AssignmentRequest {
    @NotNull(message = "ID nhân viên kỹ thuật là bắt buộc")
    private Long staffId;

    private String verifiedCategory;

    @Builder.Default
    private Priority priority = Priority.NORMAL;

    private String notes;
}
