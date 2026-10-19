package com.roadvision.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "incident_upvotes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_incident_user_upvote", columnNames = {"incident_id", "user_id"})
})
@Getter
@Setter
@Builder
public class IncidentUpvote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public IncidentUpvote() {
    }

    public IncidentUpvote(Long id, Incident incident, User user, LocalDateTime createdAt) {
        this.id = id;
        this.incident = incident;
        this.user = user;
        this.createdAt = createdAt;
    }
}
