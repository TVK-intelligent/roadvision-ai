package com.roadvision.dto;

import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import com.roadvision.enums.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamActiveTaskDto {
    private Long id;
    private String ticketCode;
    private String title;
    private String address;
    private Category category;
    private IncidentStatus status;
    private Severity severity;
    private LocalDateTime plannedDeadline;
    private LocalDateTime createdAt;
}
