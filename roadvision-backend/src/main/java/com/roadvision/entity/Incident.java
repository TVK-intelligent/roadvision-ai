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

    @Column(name = "image_sha256", length = 64)
    private String imageSha256;

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

    public Incident() {
    }

    public Incident(Long id, String ticketCode, User citizen, String title, String description, String imageUrl, String imageSha256, BigDecimal latitude, BigDecimal longitude, String address, String routeCorridor, String zoneName, Category category, IncidentStatus status, Severity severity, String flag, String rejectionReason, String reworkReason, Integer reworkCount, Integer upvoteCount, AiDetection aiDetection, Assignment assignment, Resolution resolution, Feedback feedback, LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime resolvedAt, LocalDateTime closedAt) {
        this.id = id;
        this.ticketCode = ticketCode;
        this.citizen = citizen;
        this.title = title != null ? title : "Sự cố mặt đường";
        this.description = description;
        this.imageUrl = imageUrl;
        this.imageSha256 = imageSha256;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.routeCorridor = routeCorridor;
        this.zoneName = zoneName;
        this.category = category != null ? category : Category.POTHOLE;
        this.status = status != null ? status : IncidentStatus.SUBMITTED;
        this.severity = severity != null ? severity : Severity.MEDIUM;
        this.flag = flag;
        this.rejectionReason = rejectionReason;
        this.reworkReason = reworkReason;
        this.reworkCount = reworkCount != null ? reworkCount : 0;
        this.upvoteCount = upvoteCount != null ? upvoteCount : 1;
        this.aiDetection = aiDetection;
        this.assignment = assignment;
        this.resolution = resolution;
        this.feedback = feedback;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.resolvedAt = resolvedAt;
        this.closedAt = closedAt;
    }
}
