package com.roadvision.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "resolutions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resolution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false, unique = true)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "proof_image_url", nullable = false, length = 500)
    private String proofImageUrl;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "ai_verification_status", length = 50)
    private String aiVerificationStatus; // 'AI_VERIFIED_CLEAN', 'AI_WARNING_DEFECT_REMAINS'

    @Column(name = "ai_verification_confidence", precision = 5, scale = 4)
    private java.math.BigDecimal aiVerificationConfidence;

    @Column(name = "ai_verification_detections_json", columnDefinition = "TEXT")
    private String aiVerificationDetectionsJson;

    @Column(name = "ai_verification_notes", length = 500)
    private String aiVerificationNotes;

    @CreationTimestamp
    @Column(name = "resolved_at", nullable = false)
    private LocalDateTime resolvedAt;
}
