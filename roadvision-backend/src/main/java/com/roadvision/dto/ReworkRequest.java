package com.roadvision.dto;

import com.roadvision.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReworkRequest {

    @NotBlank(message = "Chỉ đạo thi công lại không được để trống")
    private String instructions;

    @Builder.Default
    private Priority priority = Priority.HIGH;
}
