package com.roadvision.dto;

import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private String avatarUrl;
    private Boolean isActive;
    private Integer reputationScore;
    private Integer spamStrikes;
    private LocalDateTime suspendedUntil;
    private String suspendReason;
    private Long teamId;
    private String teamName;
    private Boolean isTeamLeader;
    private String specialization;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminUserResponse fromEntity(User user) {
        if (user == null) return null;
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .isActive(user.getIsActive() != null ? user.getIsActive() : true)
                .reputationScore(user.getReputationScore() != null ? user.getReputationScore() : 50)
                .spamStrikes(user.getSpamStrikes() != null ? user.getSpamStrikes() : 0)
                .suspendedUntil(user.getSuspendedUntil())
                .suspendReason(user.getSuspendReason())
                .teamId(user.getTeam() != null ? user.getTeam().getId() : null)
                .teamName(user.getTeam() != null ? user.getTeam().getName() : null)
                .isTeamLeader(user.getIsTeamLeader() != null ? user.getIsTeamLeader() : false)
                .specialization(user.getSpecialization())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
