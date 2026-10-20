package com.roadvision.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.roadvision.enums.EvidenceStage;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "incident_evidences")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    @JsonIgnoreProperties({"evidences", "inspection", "assignment", "resolution", "citizen", "hibernateLazyInitializer"})
    private Incident incident;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 30)
    private EvidenceStage stage;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id")
    @JsonIgnoreProperties({"password", "team", "hibernateLazyInitializer"})
    private User uploader;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "rework_iteration")
    @Builder.Default
    private Integer reworkIteration = 0; // Lần nộp thứ mấy (0 cho lần đầu, 1, 2... nếu là REWORK)

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
