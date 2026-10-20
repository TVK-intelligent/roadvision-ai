package com.roadvision.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.roadvision.enums.Category;
import com.roadvision.enums.Severity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "incident_inspections")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"inspection", "evidences", "assignment", "resolution", "citizen", "hibernateLazyInitializer"})
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspector_id")
    @JsonIgnoreProperties({"password", "team", "hibernateLazyInitializer"})
    private User inspector;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_team_id")
    @JsonIgnoreProperties({"members", "leader", "hibernateLazyInitializer"})
    private Team inspectionTeam;

    @Column(name = "actual_latitude", precision = 10, scale = 8)
    private BigDecimal actualLatitude;

    @Column(name = "actual_longitude", precision = 11, scale = 8)
    private BigDecimal actualLongitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "confirmed_category", length = 30)
    private Category confirmedCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "actual_severity", length = 20)
    private Severity actualSeverity;

    @Column(name = "estimated_size", length = 255)
    private String estimatedSize; // Ví dụ: Dài 2.5m x Rộng 1.2m x Sâu 8cm (Diện tích ~3.0m2)

    @Column(name = "traffic_impact", length = 500)
    private String trafficImpact; // Ví dụ: Chiếm 1/2 làn xe cơ giới, nguy cơ ùn tắc cao giờ cao điểm

    @Column(name = "proposed_solution", length = 1000)
    private String proposedSolution; // Ví dụ: Cào bóc sâu 7cm, tưới dính bám nhũ tương, thảm BTN C19

    @Column(name = "no_damage_found")
    @Builder.Default
    private Boolean noDamageFound = false;

    @Column(name = "reason_no_damage", length = 500)
    private String reasonNoDamage; // Ví dụ: Đã được đơn vị BOT dặm vá trước đó hoặc sai vị trí

    @Column(name = "inspection_photos", columnDefinition = "TEXT")
    private String inspectionPhotos; // Danh sách URLs ảnh hiện trạng khảo sát (ngăn cách bởi dấu phẩy)

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "inspected_at")
    private LocalDateTime inspectedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
