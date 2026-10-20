package com.roadvision.enums;

public enum EvidenceStage {
    INSPECTION,     // Ảnh khảo sát thực trạng hiện trường (Giai đoạn 4)
    BEFORE_WORK,    // Ảnh hiện trường trước khi bắt đầu thi công (Giai đoạn 6)
    PROGRESS,       // Ảnh trong quá trình thi công cào bóc, lu lèn, rải thảm (Giai đoạn 6)
    AFTER_WORK,     // Ảnh sau khi hoàn tất sửa chữa (Giai đoạn 6)
    REWORK          // Bằng chứng sau mỗi lần thi công lại khi bị bác nghiệm thu (Giai đoạn 7)
}
