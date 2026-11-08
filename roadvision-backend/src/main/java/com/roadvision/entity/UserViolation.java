package com.roadvision.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.roadvision.enums.ViolationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_violations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Enumerated(EnumType.STRING)
    @Column(name = "violation_type", nullable = false, length = 50)
    private ViolationType violationType;

    @Column(name = "strike_count", nullable = false)
    @Builder.Default
    private Integer strikeCount = 1;

    @Column(name = "action_taken", nullable = false, length = 100)
    private String actionTaken; // WARNING, RESTRICTED, SUSPENDED_7_DAYS

    @Column(length = 500)
    private String description;

    @Column(name = "is_revoked", nullable = false)
    @Builder.Default
    private Boolean isRevoked = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revoked_by")
    private User revokedBy;

    @Column(name = "revoked_reason", length = 500)
    private String revokedReason;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @JsonProperty("userId")
    public Long fetchUserId() {
        return user != null ? user.getId() : null;
    }

    @JsonProperty("incidentId")
    public Long fetchIncidentId() {
        return incident != null ? incident.getId() : null;
    }

    @JsonProperty("revokedById")
    public Long fetchRevokedById() {
        return revokedBy != null ? revokedBy.getId() : null;
    }
}
