package com.roadvision.controller;

import com.roadvision.dto.*;
import com.roadvision.entity.User;
import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import com.roadvision.enums.Role;
import com.roadvision.security.JwtTokenProvider;
import com.roadvision.service.IncidentService;
import com.roadvision.service.UserService;
import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
@Tag(name = "Incident Management", description = "Các API cốt lõi trong chu trình 7 giai đoạn xử lý sự cố hạ tầng đường bộ RoadVision")
public class IncidentController {

    private final IncidentService incidentService;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.roadvision.service.AiInferenceService aiInferenceService;
    private final com.roadvision.service.PatrolVideoAiService patrolVideoAiService;

    /**
     * PHA 1 & 2: Tiếp nhận phản ánh từ người dân & AI tự động phân tích
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")
    @Operation(summary = "Pha 1 & 2: Nộp phản ánh sự cố kèm ảnh hiện trường và GPS (Kích hoạt AI ONNX Runtime)")
    public ResponseEntity<IncidentResponse> createIncident(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("image") MultipartFile image,
            @RequestParam("latitude") BigDecimal latitude,
            @RequestParam("longitude") BigDecimal longitude,
            @RequestParam(value = "originalLatitude", required = false) BigDecimal originalLatitude,
            @RequestParam(value = "originalLongitude", required = false) BigDecimal originalLongitude,
            @RequestParam(value = "gpsAccuracy", required = false) Double gpsAccuracy,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "address", required = false) String address,
            @RequestParam(value = "category", required = false) Category category,
            @RequestParam(value = "categories", required = false) java.util.List<String> categories,
            @RequestParam(value = "threshold", required = false) Float threshold) {

        Long citizenId = getUserIdFromHeader(authHeader);

        java.util.List<Category> parsedCategories = new java.util.ArrayList<>();
        if (categories != null) {
            for (String c : categories) {
                if (c != null && !c.isBlank()) {
                    for (String part : c.split(",")) {
                        try {
                            Category cat = Category.valueOf(part.trim());
                            if (!parsedCategories.contains(cat)) {
                                parsedCategories.add(cat);
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }
        }
        if (category != null && !parsedCategories.contains(category)) {
            parsedCategories.add(category);
        }

        Category effectiveCategory = category;
        if (parsedCategories.size() > 1) {
            effectiveCategory = Category.COMPLEX_DAMAGE;
        }

        IncidentCreateRequest request = IncidentCreateRequest.builder()
                .title(title)
                .description(description)
                .latitude(latitude)
                .longitude(longitude)
                .originalLatitude(originalLatitude != null ? originalLatitude : latitude)
                .originalLongitude(originalLongitude != null ? originalLongitude : longitude)
                .gpsAccuracy(gpsAccuracy)
                .address(address)
                .category(effectiveCategory)
                .categories(parsedCategories)
                .customThreshold(threshold)
                .build();

        IncidentResponse response = incidentService.createIncident(request, image, citizenId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * PHA 1.5: Quét thử và phân tích ảnh thời gian thực qua YOLOv8 ONNX Runtime (Client Preview)
     */
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Quét thử và phân tích ảnh thời gian thực qua YOLOv8 ONNX Runtime (Công khai)")
    public ResponseEntity<Map<String, Object>> analyzeImage(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "threshold", required = false, defaultValue = "0.25") float threshold) {
        long start = System.currentTimeMillis();
        List<com.roadvision.util.ImageTensorUtil.BoundingBox> boxes = new ArrayList<>();
        int imgWidth = 0;
        int imgHeight = 0;
        try {
            byte[] bytes = image.getBytes();
            java.awt.image.BufferedImage bimg = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
            if (bimg != null) {
                imgWidth = bimg.getWidth();
                imgHeight = bimg.getHeight();
            }
            boxes = aiInferenceService.runInferenceList(new java.io.ByteArrayInputStream(bytes), threshold);
        } catch (Exception e) {
            // empty boxes
        }

        com.roadvision.util.ImageTensorUtil.BoundingBox best = boxes.isEmpty()
                ? aiInferenceService.emptyDetection()
                : boxes.get(0);

        String estimatedSeverity = aiInferenceService.calculateSeverity(boxes, imgWidth, imgHeight);

        // Tính tổng diện tích hư hại % trên ảnh & đếm theo từng loại (classCounts)
        long totalArea = 0;
        java.util.Map<String, Integer> classCounts = new java.util.LinkedHashMap<>();
        for (com.roadvision.util.ImageTensorUtil.BoundingBox b : boxes) {
            totalArea += (long) b.getWidth() * b.getHeight();
            classCounts.put(b.getClassName(), classCounts.getOrDefault(b.getClassName(), 0) + 1);
        }
        double footprintPercent = (imgWidth > 0 && imgHeight > 0)
                ? ((double) totalArea / (imgWidth * imgHeight)) * 100.0
                : 0.0;

        Map<String, Object> res = new HashMap<>();
        res.put("className", best.getClassName());
        res.put("confidence", best.getConfidence());
        res.put("bboxX", best.getX());
        res.put("bboxY", best.getY());
        res.put("bboxWidth", best.getWidth());
        res.put("bboxHeight", best.getHeight());
        res.put("count", boxes.size());
        res.put("boxes", boxes);
        res.put("classCounts", classCounts);
        res.put("estimatedSeverity", estimatedSeverity);
        res.put("footprintPercent", Math.round(footprintPercent * 10.0) / 10.0);
        res.put("activeThreshold", threshold);
        res.put("imageWidth", imgWidth);
        res.put("imageHeight", imgHeight);
        res.put("inferenceMs", System.currentTimeMillis() - start);
        return ResponseEntity.ok(res);
    }

    /**
     * PHA 1.5 - KÊNH VIDEO TUẦN TRA: Quét frame video hành trình xe tuần tra (Tách biệt hoàn toàn với upload ảnh tĩnh)
     */
    @PostMapping(value = "/analyze-video-frame", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Quét frame video hành trình tuần tra qua PatrolVideoAiService chuyên biệt")
    public ResponseEntity<Map<String, Object>> analyzeVideoFrame(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "threshold", required = false, defaultValue = "0.20") float threshold) {
        long start = System.currentTimeMillis();
        List<com.roadvision.util.ImageTensorUtil.BoundingBox> boxes = new ArrayList<>();
        int imgWidth = 0;
        int imgHeight = 0;
        try {
            byte[] bytes = image.getBytes();
            java.awt.image.BufferedImage bimg = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
            if (bimg != null) {
                imgWidth = bimg.getWidth();
                imgHeight = bimg.getHeight();
            }
            boxes = patrolVideoAiService.runVideoFrameInference(new java.io.ByteArrayInputStream(bytes), threshold);
        } catch (Exception e) {
            // empty boxes
        }

        com.roadvision.util.ImageTensorUtil.BoundingBox best = boxes.isEmpty()
                ? patrolVideoAiService.emptyDetection()
                : boxes.get(0);

        String estimatedSeverity = patrolVideoAiService.calculateSeverity(boxes, imgWidth, imgHeight);

        long totalArea = 0;
        java.util.Map<String, Integer> classCounts = new java.util.LinkedHashMap<>();
        for (com.roadvision.util.ImageTensorUtil.BoundingBox b : boxes) {
            totalArea += (long) b.getWidth() * b.getHeight();
            classCounts.put(b.getClassName(), classCounts.getOrDefault(b.getClassName(), 0) + 1);
        }
        double footprintPercent = (imgWidth > 0 && imgHeight > 0)
                ? ((double) totalArea / (imgWidth * imgHeight)) * 100.0
                : 0.0;

        Map<String, Object> res = new HashMap<>();
        res.put("className", best.getClassName());
        res.put("confidence", best.getConfidence());
        res.put("bboxX", best.getX());
        res.put("bboxY", best.getY());
        res.put("bboxWidth", best.getWidth());
        res.put("bboxHeight", best.getHeight());
        res.put("count", boxes.size());
        res.put("boxes", boxes);
        res.put("classCounts", classCounts);
        res.put("estimatedSeverity", estimatedSeverity);
        res.put("footprintPercent", Math.round(footprintPercent * 10.0) / 10.0);
        res.put("activeThreshold", threshold);
        res.put("imageWidth", imgWidth);
        res.put("imageHeight", imgHeight);
        res.put("inferenceMs", System.currentTimeMillis() - start);
        return ResponseEntity.ok(res);
    }

    /**
     * PHA 3: Quản trị viên lấy danh sách hàng đợi điều phối (Dispatch Queue)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @Operation(summary = "Pha 3: Quản trị viên lấy danh sách sự cố theo bộ lọc (Hàng đợi điều phối)")
    public ResponseEntity<Page<IncidentResponse>> getIncidents(
            @RequestParam(value = "status", required = false) IncidentStatus status,
            @RequestParam(value = "statuses", required = false) java.util.List<IncidentStatus> statuses,
            @RequestParam(value = "category", required = false) Category category,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(incidentService.getFilteredIncidents(status, statuses, category, search, pageable));
    }

    /**
     * Xem chi tiết hồ sơ sự cố (Detailed Dossier)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN', 'STAFF')")
    @Operation(summary = "Xem toàn cảnh hồ sơ chi tiết một sự cố (Detailed Dossier #RC-...)")
    public ResponseEntity<IncidentResponse> getIncidentById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(incidentService.getIncidentById(id));
    }

    /**
     * Lấy danh sách sự cố do chính người dân đang đăng nhập tạo ra
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Người dân xem danh sách các phản ánh do chính mình gửi")
    public ResponseEntity<Page<IncidentResponse>> getMyReports(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        Long citizenId = getUserIdFromHeader(authHeader);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(incidentService.getMyIncidents(citizenId, pageable));
    }

    /**
     * Lấy danh sách sự cố được phân công cho nhân viên kỹ thuật đang đăng nhập
     */
    @GetMapping("/assigned-to-me")
    @PreAuthorize("hasRole('STAFF')")
    @Operation(summary = "Kỹ thuật viên hiện trường xem danh sách nhiệm vụ được giao")
    public ResponseEntity<Page<IncidentResponse>> getAssignedToMe(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        Long staffId = getUserIdFromHeader(authHeader);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(incidentService.getAssignedToStaff(staffId, pageable));
    }

    /**
     * PHA 2.5: Quản trị viên thẩm định và xác nhận sự cố hợp lệ (VERIFIED)
     */
    @PostMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Pha 2.5: Quản trị viên thẩm định và xác nhận sự cố hợp lệ (VERIFIED)")
    public ResponseEntity<IncidentResponse> verifyIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id) {

        Long adminId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.verifyIncident(id, adminId));
    }

    /**
     * PHA 4.5: Quản trị viên phê duyệt nghiệm thu mặt đường (RESOLVED)
     */
    @PostMapping("/{id}/approve-inspection")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Pha 4.5: Quản trị viên kiểm tra đối chiếu Before/After và phê duyệt nghiệm thu (RESOLVED)")
    public ResponseEntity<IncidentResponse> approveInspection(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, String> body) {

        Long adminId = getUserIdFromHeader(authHeader);
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(incidentService.approveInspection(id, notes, adminId));
    }

    /**
     * PHA 3: Quản trị viên duyệt và phân công kỹ thuật viên phụ trách
     */
    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Pha 3: Quản trị viên thẩm định và phân công nhân viên kỹ thuật")
    public ResponseEntity<IncidentResponse> assignIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody AssignmentRequest request) {

        Long adminId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.assignIncident(id, request, adminId));
    }

    /**
     * PHA 3: Quản trị viên từ chối tiếp nhận sự cố
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Pha 3: Quản trị viên từ chối tiếp nhận sự cố rác hoặc sai quy định")
    public ResponseEntity<IncidentResponse> rejectIncident(
            @PathVariable("id") Long id,
            @Valid @RequestBody RejectionRequest request) {

        return ResponseEntity.ok(incidentService.rejectIncident(id, request));
    }

    /**
     * PHA 4: Kỹ thuật viên chuyển trạng thái khi có mặt tại hiện trường (IN_PROGRESS)
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Pha 4: Cập nhật trạng thái tiến độ (Bắt đầu thi công IN_PROGRESS)")
    public ResponseEntity<IncidentResponse> updateStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> body) {

        Long userId = getUserIdFromHeader(authHeader);
        IncidentStatus status = IncidentStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(incidentService.updateStatus(id, status, userId));
    }

    /**
     * PHA 4: Kỹ thuật viên nộp ảnh nghiệm thu hiện trường (Proof of Work)
     */
    @PostMapping(value = "/{id}/resolve", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STAFF')")
    @Operation(summary = "Pha 4: Kỹ thuật viên nộp ảnh hoàn tất nghiệm thu mặt đường (Proof of Work)")
    public ResponseEntity<IncidentResponse> resolveIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestParam("proofImage") MultipartFile proofImage,
            @RequestParam(value = "notes", required = false) String notes) {

        Long staffId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.resolveIncident(id, proofImage, notes, staffId));
    }

    /**
     * PHA 5: Đóng hồ sơ sự cố (Admin hoặc Citizen sau khi đã nghiệm thu đạt chuẩn RESOLVED)
     * Đánh giá chất lượng (Feedback) là tùy chọn, không bắt buộc để đóng phiếu.
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")
    @Operation(summary = "Pha 5: Đóng hồ sơ sự cố sau khi đã nghiệm thu đạt chuẩn (RESOLVED -> CLOSED)")
    public ResponseEntity<IncidentResponse> closeIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody(required = false) FeedbackRequest request) {

        Long userId = getUserIdFromHeader(authHeader);
        Role userRole = Role.valueOf(jwtTokenProvider.extractRole(authHeader.substring(7)));
        return ResponseEntity.ok(incidentService.closeIncident(id, request, userId, userRole));
    }

    /**
     * Đánh giá chất lượng phục vụ của người dân (Citizen Feedback & Rating)
     * Độc lập với Incident Status: Người dân có thể đánh giá bất kỳ lúc nào sau khi sự cố RESOLVED hoặc CLOSED
     */
    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Người dân đánh giá 1-5 sao và để lại nhận xét (sau khi sự cố đã RESOLVED hoặc CLOSED)")
    public ResponseEntity<IncidentResponse> submitFeedback(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody FeedbackRequest request) {

        Long userId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.submitFeedback(id, request, userId));
    }

    /**
     * PHA 5: Người dân gửi khiếu nại nghiệm thu chưa đạt (Dispute)
     */
    @PostMapping("/{id}/dispute")
    @PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")
    @Operation(summary = "Pha 5: Người dân khiếu nại mặt đường chưa đạt chuẩn hoặc AI cảnh báo lỗi sót lại")
    public ResponseEntity<IncidentResponse> disputeIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody DisputeRequest request) {

        Long userId = getUserIdFromHeader(authHeader);
        Role userRole = Role.valueOf(jwtTokenProvider.extractRole(authHeader.substring(7)));
        return ResponseEntity.ok(incidentService.disputeIncident(id, request, userId, userRole));
    }

    /**
     * PHA 5: Quản trị viên bác bỏ nghiệm thu và ra lệnh thi công lại (Rework Order)
     */
    @PostMapping("/{id}/rework")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Pha 5: Quản trị viên bác bỏ nghiệm thu và ra lệnh thi công lại cho Kỹ thuật viên")
    public ResponseEntity<IncidentResponse> reworkIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody ReworkRequest request) {

        Long adminId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.reworkIncident(id, request, adminId));
    }

    /**
     * API Tiện ích: Lấy danh sách nhân viên kỹ thuật cho dropdown phân công
     */
    @GetMapping("/staff-list")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách các kỹ thuật viên phục vụ dropdown điều phối")
    public ResponseEntity<List<User>> getStaffList() {
        return ResponseEntity.ok(userService.getAllStaff());
    }

    /**
     * API Công khai: Lấy chỉ số tổng quan cho trang chủ và bản đồ công cộng
     */
    @GetMapping("/public-stats")
    @Operation(summary = "API công khai cung cấp số liệu thống kê cho trang chủ")
    public ResponseEntity<Map<String, Object>> getPublicStats() {
        return ResponseEntity.ok(incidentService.getPublicStats());
    }

    /**
     * API Công khai: Lấy danh sách toàn bộ sự cố có tọa độ để vẽ bản đồ số hóa GIS
     */
    @GetMapping("/public-map")
    @Operation(summary = "API công khai cung cấp danh sách sự cố kèm tọa độ hiển thị trên bản đồ số GIS")
    public ResponseEntity<List<IncidentResponse>> getPublicMapIncidents() {
        return ResponseEntity.ok(incidentService.getAllIncidentsForMap());
    }

    /**
     * PHA 1.8: Kiểm tra sự cố tương tự gần kề (Spatial Deduplication)
     */
    @GetMapping("/check-nearby")
    @Operation(summary = "Pha 1.8: Kiểm tra xem tại tọa độ GPS có sự cố tương tự trong bán kính lân cận không")
    public ResponseEntity<NearbyIncidentCheckResponse> checkNearby(
            @RequestParam("latitude") BigDecimal latitude,
            @RequestParam("longitude") BigDecimal longitude,
            @RequestParam(value = "category", required = false) Category category,
            @RequestParam(value = "radius", required = false, defaultValue = "25.0") Double radius) {
        return ResponseEntity.ok(incidentService.checkNearbyDuplicate(latitude, longitude, category, radius));
    }

    /**
     * PHA 1.9: Đồng tình với sự cố đã có (+1 Upvote)
     */
    @PostMapping("/{id}/upvote")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Pha 1.9: Người dân bấm đồng tình (+1 Upvote) với sự cố đã được báo cáo")
    public ResponseEntity<IncidentResponse> upvoteIncident(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id) {
        Long userId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.upvoteIncident(id, userId));
    }

    // =========================================================================
    // CÁC ENDPOINT CHO LUỒNG 7 GIAI ĐOẠN ĐỒ ÁN ROADVISION
    // =========================================================================

    @PostMapping("/{id}/assign-inspection")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giai đoạn 3 & 4: Admin giao nhiệm vụ khảo sát hiện trường cho Tổ Khảo sát")
    public ResponseEntity<IncidentResponse> assignInspection(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody InspectionAssignRequest request) {
        Long adminId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.assignInspection(id, request, adminId));
    }

    @PostMapping("/{id}/start-inspection")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 4: Nhân viên khảo sát xác nhận đã đến vị trí và bắt đầu khảo sát")
    public ResponseEntity<IncidentResponse> startInspection(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id) {
        Long staffId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.startInspecting(id, staffId));
    }

    @PostMapping(value = "/{id}/inspection-report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 4: Nhân viên gửi báo cáo khảo sát hiện trường, ảnh hiện trạng, đo đạc & phương án")
    public ResponseEntity<IncidentResponse> submitInspectionReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestPart("data") InspectionReportRequest request,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        Long staffId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.submitInspectionReport(id, request, photos, staffId));
    }

    @PostMapping("/{id}/assign-construction")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giai đoạn 5: Admin giao nhiệm vụ thi công cho Tổ Thi công chuyên trách")
    public ResponseEntity<IncidentResponse> assignConstruction(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody ConstructionAssignRequest request) {
        Long adminId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.assignConstruction(id, request, adminId));
    }

    @PostMapping("/{id}/reject-inspection-report")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giai đoạn 5: Admin từ chối phương án khảo sát và yêu cầu đo đạc/bổ sung số liệu")
    public ResponseEntity<IncidentResponse> rejectInspectionReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> request) {
        Long adminId = getUserIdFromHeader(authHeader);
        String reason = request != null ? request.get("reason") : null;
        return ResponseEntity.ok(incidentService.requestInspectionRevision(id, reason, adminId));
    }

    @PostMapping("/{id}/report-delay")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 6: Kỹ thuật viên giải trình lý do chậm tiến độ thi công")
    public ResponseEntity<IncidentResponse> reportDelay(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> request) {
        Long staffId = getUserIdFromHeader(authHeader);
        String delayReason = request != null ? request.get("delayReason") : null;
        return ResponseEntity.ok(incidentService.reportDelayReason(id, delayReason, staffId));
    }

    @PostMapping("/{id}/start-construction")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 6: Tổ đội bắt đầu triển khai thi công tại hiện trường (IN_PROGRESS)")
    public ResponseEntity<IncidentResponse> startConstruction(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id) {
        Long staffId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.startConstruction(id, staffId));
    }

    @PostMapping(value = "/{id}/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 6: Tổ đội tải lên bằng chứng theo giai đoạn (BEFORE_WORK, PROGRESS, AFTER_WORK, REWORK)")
    public ResponseEntity<EvidenceResponse> uploadEvidence(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestParam("stage") com.roadvision.enums.EvidenceStage stage,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "latitude", required = false) BigDecimal latitude,
            @RequestParam(value = "longitude", required = false) BigDecimal longitude) {
        Long staffId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.uploadEvidence(id, stage, file, notes, latitude, longitude, staffId));
    }

    @PostMapping(value = "/{id}/submit-acceptance", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 6: Tổ đội nộp ảnh hoàn thành & báo cáo nghiệm thu có AI quét (PENDING_ACCEPTANCE)")
    public ResponseEntity<IncidentResponse> submitAcceptanceMultipart(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "latitude", required = false) BigDecimal latitude,
            @RequestParam(value = "longitude", required = false) BigDecimal longitude) {
        Long staffId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.submitForAcceptance(id, file, notes, latitude, longitude, staffId));
    }

    @PostMapping(value = "/{id}/submit-acceptance")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Giai đoạn 6: Tổ đội hoàn tất thi công và gửi hồ sơ chờ Admin nghiệm thu (PENDING_ACCEPTANCE)")
    public ResponseEntity<IncidentResponse> submitAcceptance(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, String> body) {
        Long staffId = getUserIdFromHeader(authHeader);
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(incidentService.submitForAcceptance(id, notes, staffId));
    }

    @PostMapping("/{id}/review-acceptance")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giai đoạn 7: Admin thẩm định nghiệm thu (Đạt -> CLOSED, Không đạt -> REWORK_REQUIRED)")
    public ResponseEntity<IncidentResponse> reviewAcceptance(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") Long id,
            @Valid @RequestBody AcceptanceReviewRequest request) {
        Long adminId = getUserIdFromHeader(authHeader);
        return ResponseEntity.ok(incidentService.reviewAcceptance(id, request, adminId));
    }

    private Long getUserIdFromHeader(String authHeader) {
        String token = authHeader.substring(7);
        return jwtTokenProvider.extractUserId(token);
    }
}
