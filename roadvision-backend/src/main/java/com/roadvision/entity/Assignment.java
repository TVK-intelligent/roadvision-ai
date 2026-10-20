package com.roadvision.entity;

import com.roadvision.enums.Priority;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
@Getter
@Setter
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false, unique = true)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_admin_id", nullable = false)
    private User assignedByAdmin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_staff_id", nullable = false)
    private User assignedToStaff;

    @Column(name = "verified_category", length = 50)
    private String verifiedCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.NORMAL;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    public Assignment() {
    }

    public Assignment(Long id, Incident incident, User assignedByAdmin, User assignedToStaff, String verifiedCategory, Priority priority, String notes, LocalDateTime assignedAt) {
        this.id = id;
        this.incident = incident;
        this.assignedByAdmin = assignedByAdmin;
        this.assignedToStaff = assignedToStaff;
        this.verifiedCategory = verifiedCategory;
        this.priority = priority != null ? priority : Priority.NORMAL;
        this.notes = notes;
        this.assignedAt = assignedAt;
    }
}
