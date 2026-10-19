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
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public User() {
    }

    public User(Long id, String email, String password, String fullName, String phone, Role role, String avatarUrl, Boolean isActive, Integer reputationScore, Integer spamStrikes, LocalDateTime suspendedUntil, String suspendReason, LocalDateTime createdAt, LocalDateTime updatedAt) {
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
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
