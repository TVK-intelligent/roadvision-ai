package com.roadvision.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentCreateRequest {
    private String title;
    private String description;

    @NotNull(message = "Vĩ độ (latitude) là bắt buộc")
    private BigDecimal latitude;

    @NotNull(message = "Kinh độ (longitude) là bắt buộc")
    private BigDecimal longitude;

    private String address;
    private com.roadvision.enums.Category category;
    private java.util.List<com.roadvision.enums.Category> categories;
    private Float customThreshold;
}
