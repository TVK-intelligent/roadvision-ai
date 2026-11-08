package com.roadvision.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.roadvision.enums.ReputationTransactionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_reputation_transactions", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_incident_type", columnNames = {"user_id", "incident_id", "transaction_type"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserReputationTransaction {

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

    @Column(nullable = false)
    private Integer points; // Số điểm biến động (+50, +100, -100, -50, -150)

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter; // Điểm số sau biến động (0 - 1000)

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 50)
    private ReputationTransactionType transactionType;

    @Column(length = 255)
    private String reason;

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
}
