package com.roadvision.entity;

import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import com.roadvision.enums.Severity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_code", nullable = false, unique = true, length = 30)
    private String ticketCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_id", nullable = false)
    private User citizen;

    @Column(nullable = false)
    @Builder.Default
    private String title = "Sự cố mặt đường";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(length = 255)
    private String address;

    @Column(name = "route_corridor", length = 50)
    private String routeCorridor; // QL1A, QL21, DOWNTOWN, DT495

    @Column(name = "zone_name", length = 150)
    private String zoneName; // Tên đầy đủ của Hạt & Tuyến


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Category category = Category.POTHOLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private IncidentStatus status = IncidentStatus.SUBMITTED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Severity severity = Severity.MEDIUM;

    @Column(length = 50)
    private String flag;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "rework_reason", length = 500)
    private String reworkReason;

    @Column(name = "rework_count", nullable = false)
    @Builder.Default
    private Integer reworkCount = 0;

    @Column(name = "upvote_count", nullable = false)
    @Builder.Default
    private Integer upvoteCount = 1;

    @OneToOne(mappedBy = "incident", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private AiDetection aiDetection;

    @OneToOne(mappedBy = "incident", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Assignment assignment;

    @OneToOne(mappedBy = "incident", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Resolution resolution;

    @OneToOne(mappedBy = "incident", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Feedback feedback;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;
}
