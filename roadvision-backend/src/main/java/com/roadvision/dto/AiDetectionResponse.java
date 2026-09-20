package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDetectionResponse {
    private String className;
    private BigDecimal confidence;
    private Integer bboxX;
    private Integer bboxY;
    private Integer bboxWidth;
    private Integer bboxHeight;
    private Integer inferenceMs;
    private String flag;
    private Integer count;
    private List<com.roadvision.util.ImageTensorUtil.BoundingBox> boxes;
    private String rawPredictionsJson;
}
