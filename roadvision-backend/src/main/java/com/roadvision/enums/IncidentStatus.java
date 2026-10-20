package com.roadvision.enums;

public enum IncidentStatus {
    SUBMITTED,              // Giai đoạn 1: Người dân vừa gửi phản ánh
    AI_ANALYZED,            // Giai đoạn 2: AI nhận diện nhãn, bbox, confidence
    VERIFIED,               // Tương thích cũ: Admin xác nhận hợp lệ
    INSPECTION_ASSIGNED,    // Giai đoạn 3 & 4: Admin giao nhiệm vụ khảo sát hiện trường
    INSPECTING,             // Giai đoạn 4: Nhân viên đang khảo sát thực địa
    INSPECTED,              // Giai đoạn 4: Đã hoàn tất báo cáo khảo sát & đề xuất phương án
    ASSIGNED,               // Giai đoạn 5: Admin giao thi công cho Tổ đội
    IN_PROGRESS,            // Giai đoạn 6: Tổ đội đang thi công ngoài hiện trường
    PENDING_INSPECTION,     // Tương thích cũ: Chờ nghiệm thu
    PENDING_ACCEPTANCE,     // Giai đoạn 6 & 7: Hoàn tất thi công, nộp đủ bằng chứng chờ nghiệm thu
    RESOLVED,               // Tương thích cũ: Đã xử lý
    REWORK_REQUIRED,        // Giai đoạn 7: Nghiệm thu không đạt, yêu cầu thi công lại
    CLOSED,                 // Giai đoạn 7: Nghiệm thu đạt yêu cầu, đóng hồ sơ phản ánh
    REJECTED                // Giai đoạn 3: Bị từ chối
}
