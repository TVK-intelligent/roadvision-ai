package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsResponse {
    private long totalUsers;
    private long adminCount;
    private long staffCount;
    private long citizenCount;
    private long activeCount;
    private long lockedCount;
}
