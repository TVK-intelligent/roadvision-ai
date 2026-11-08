package com.roadvision.enums;

public enum ReputationTransactionType {
    VERIFIED_BONUS,   // Thưởng khi báo cáo được thẩm định hợp lệ (+50đ)
    CLOSED_BONUS,     // Thưởng khi sự cố được nghiệm thu & đóng hồ sơ (+100đ)
    PENALTY,          // Phạt vi phạm báo cáo gian lận/spam/ảnh mạng (-100đ)
    REVERSAL,         // Thu hồi điểm thưởng đã cấp khi phát hiện gian lận sau đó (-50đ hoặc -150đ)
    ADMIN_ADJUST      // Điều chỉnh thủ công bởi Quản trị viên
}
