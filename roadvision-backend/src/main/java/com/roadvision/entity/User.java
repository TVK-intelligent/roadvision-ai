package com.roadvision.entity;

import com.roadvision.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties(value = {"hibernateLazyInitializer", "handler"}, ignoreUnknown = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "reputation_score", nullable = false)
    @Builder.Default
    private Integer reputationScore = 50;

    @Column(name = "spam_strikes", nullable = false)
    @Builder.Default
    private Integer spamStrikes = 0;

    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @Column(name = "suspend_reason", length = 255)
    private String suspendReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Team team;

    @Column(name = "is_team_leader")
    @Builder.Default
    private Boolean isTeamLeader = false;

    @Column(name = "specialization", length = 150)
    private String specialization;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public User() {
    }

    public User(Long id, String email, String password, String fullName, String phone, Role role, String avatarUrl, Boolean isActive, Integer reputationScore, Integer spamStrikes, LocalDateTime suspendedUntil, String suspendReason, Team team, Boolean isTeamLeader, String specialization, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.phone = phone;
        this.role = role;
        this.avatarUrl = avatarUrl;
        this.isActive = isActive != null ? isActive : true;
        this.reputationScore = reputationScore != null ? reputationScore : 50;
        this.spamStrikes = spamStrikes != null ? spamStrikes : 0;
        this.suspendedUntil = suspendedUntil;
        this.suspendReason = suspendReason;
        this.team = team;
        this.isTeamLeader = isTeamLeader != null ? isTeamLeader : false;
        this.specialization = specialization;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public User(Long id, String email, String password, String fullName, String phone, Role role, String avatarUrl, Boolean isActive, Integer reputationScore, Integer spamStrikes, LocalDateTime suspendedUntil, String suspendReason, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(id, email, password, fullName, phone, role, avatarUrl, isActive, reputationScore, spamStrikes, suspendedUntil, suspendReason, null, false, null, createdAt, updatedAt);
    }
}
