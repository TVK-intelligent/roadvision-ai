package com.roadvision.enums;

public enum ViolationType {
    FAKE_REPORT,        // Báo cáo sai sự thật / hiện trường bịa đặt
    MALICIOUS_CONTENT,  // Tải ảnh rác / nội dung xúc phạm / nhảm nhí
    INTERNET_IMAGE,     // Dùng ảnh trên mạng / ảnh không đúng hiện trường thực tế
    SPAM,               // Bắn phá gửi báo cáo liên tục
    OTHER               // Vi phạm quy chuẩn khác
}
