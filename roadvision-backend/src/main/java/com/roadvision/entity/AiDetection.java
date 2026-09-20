package com.roadvision.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_detections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiDetection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false, unique = true)
    private Incident incident;

    @Column(name = "class_name", nullable = false, length = 50)
    private String className;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "bbox_x", nullable = false)
    private Integer bboxX;

    @Column(name = "bbox_y", nullable = false)
    private Integer bboxY;

    @Column(name = "bbox_width", nullable = false)
    private Integer bboxWidth;

    @Column(name = "bbox_height", nullable = false)
    private Integer bboxHeight;

    @Column(name = "inference_ms", nullable = false)
    private Integer inferenceMs;

    @Column(name = "raw_predictions_json", columnDefinition = "JSON")
    private String rawPredictionsJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
