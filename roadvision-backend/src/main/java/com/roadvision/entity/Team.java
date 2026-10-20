package com.roadvision.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.roadvision.enums.TeamType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "teams")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "team_type", nullable = false, length = 30)
    @Builder.Default
    private TeamType teamType = TeamType.CONSTRUCTION;

    @Column(name = "corridor", length = 255)
    private String corridor; // KHU_1, KHU_2, KHU_3, KHU_4, QL1A, v.v.

    @Column(name = "zone_name", length = 255)
    private String zoneName; // Khu Quản lý Đường bộ I (Miền Bắc)...

    @Column(name = "description", length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leader_id")
    @JsonIgnoreProperties({"team", "password", "hibernateLazyInitializer"})
    private User leader;

    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnoreProperties({"team", "password", "hibernateLazyInitializer"})
    private List<User> members = new ArrayList<>();

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
