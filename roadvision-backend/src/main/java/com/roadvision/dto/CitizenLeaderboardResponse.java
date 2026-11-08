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
public class CitizenLeaderboardResponse {
    private int rank;
    private Long userId;
    private String fullName;
    private String avatarUrl;
    private Integer monthlyPoints; // Điểm thi đua trong tháng hiện tại
    private Integer reputationScore; // Điểm uy tín tích lũy dài hạn (0 - 1000)
    private Long reportsSent;
    private Long resolvedReports;
    private String tier; // HẠNG KIM CƯƠNG, HẠNG VÀNG, HẠNG BẠC, HẠNG ĐỒNG, TIÊU CHUẨN
    private String badgeTitle;
    private LocalDateTime lastEarnedAt;
}
