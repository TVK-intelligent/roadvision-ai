package com.roadvision.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_noti_user", columnList = "target_user_id"),
    @Index(name = "idx_noti_role", columnList = "target_role"),
    @Index(name = "idx_noti_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false, length = 30)
    private String type; // INFO, WARNING, SUCCESS, URGENT

    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "ticket_code", length = 50)
    private String ticketCode;

    @Column(name = "target_role", length = 30)
    private String targetRole; // ROLE_ADMIN, ROLE_STAFF, ROLE_CITIZEN, ALL

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
