package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private String title;
    private String message;
    private String type; // INFO, WARNING, SUCCESS, URGENT
    private Long incidentId;
    private String ticketCode;
    private String targetRole;
    private Long targetUserId;
    private boolean read;
    private LocalDateTime createdAt;
}
