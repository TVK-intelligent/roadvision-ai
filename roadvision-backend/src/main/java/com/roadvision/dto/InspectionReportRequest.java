package com.roadvision.dto;

import com.roadvision.enums.Category;
import com.roadvision.enums.Severity;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionReportRequest {
    @NotNull(message = "Vĩ độ khảo sát thực tế không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ không hợp lệ")
    private BigDecimal actualLatitude;

    @NotNull(message = "Kinh độ khảo sát thực tế không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ không hợp lệ")
    private BigDecimal actualLongitude;

    private BigDecimal gpsAccuracy;      // Độ chính xác GPS (mét, ví dụ: 3.5m)
    private String inspectionStatus;     // DRAFT hoặc SUBMITTED

    private Category confirmedCategory; // Xác nhận loại hư hỏng thực tế
    private Severity actualSeverity;       // Đánh giá mức độ nghiêm trọng thực tế

    @Size(max = 255, message = "Kích thước ước tính tối đa 255 ký tự")
    private String estimatedSize;         // Kích thước đo đạc (Dài x Rộng x Sâu)

    @Size(max = 500, message = "Mức độ ảnh hưởng giao thông tối đa 500 ký tự")
    private String trafficImpact;         // Khả năng ảnh hưởng giao thông

    @Size(max = 1000, message = "Phương án xử lý tối đa 1000 ký tự")
    private String proposedSolution;      // Đề xuất phương án xử lý kỹ thuật

    private Boolean noDamageFound;        // True nếu đến nơi không thấy hư hỏng
    private String reasonNoDamage;        // Lý do nếu không có hư hỏng

    @Size(max = 1000, message = "Nhận xét tối đa 1000 ký tự")
    private String notes;                 // Nhận xét của nhân viên khảo sát
}
