package com.roadvision.entity;

import com.roadvision.enums.PatrolStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "patrol_sessions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatrolSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_code", nullable = false, unique = true, length = 50)
    private String sessionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspector_id", nullable = false)
    private User inspector;

    @Column(name = "route_name", nullable = false, length = 255)
    private String routeName;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "total_distance_km")
    @Builder.Default
    private Double totalDistanceKm = 0.0;

    @Column(name = "total_potholes_detected")
    @Builder.Default
    private Integer totalPotholesDetected = 0;

    @Column(name = "route_health_rating", length = 30)
    private String routeHealthRating; // 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL'

    @Column(name = "video_name", length = 255)
    private String videoName;

    @Column(name = "keyframe_url1", length = 500)
    private String keyframeUrl1;

    @Column(name = "keyframe_url2", length = 500)
    private String keyframeUrl2;

    @Column(name = "gps_path_json", columnDefinition = "LONGTEXT")
    private String gpsPathJson;

    @Column(name = "start_latitude", precision = 10, scale = 8)
    private BigDecimal startLatitude;

    @Column(name = "start_longitude", precision = 11, scale = 8)
    private BigDecimal startLongitude;

    @Column(name = "end_latitude", precision = 10, scale = 8)
    private BigDecimal endLatitude;

    @Column(name = "end_longitude", precision = 11, scale = 8)
    private BigDecimal endLongitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PatrolStatus status = PatrolStatus.SUBMITTED;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
