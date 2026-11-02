package com.roadvision.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UpdateUserStatusRequest {
    private Boolean isActive;
    private String suspendReason;
    private LocalDateTime suspendedUntil;
}
