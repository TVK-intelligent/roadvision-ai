package com.roadvision.service;

import com.roadvision.dto.*;
import com.roadvision.entity.*;
import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import com.roadvision.enums.Role;
import com.roadvision.enums.Severity;
import com.roadvision.exception.BadRequestException;
import com.roadvision.exception.ResourceNotFoundException;
import com.roadvision.repository.*;
import com.roadvision.util.GeoUtil;
import com.roadvision.util.ImageTensorUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final AiDetectionRepository aiDetectionRepository;
    private final AssignmentRepository assignmentRepository;
    private final ResolutionRepository resolutionRepository;
    private final IncidentUpvoteRepository incidentUpvoteRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final IncidentInspectionRepository incidentInspectionRepository;
    private final IncidentEvidenceRepository incidentEvidenceRepository;
    private final FileStorageService fileStorageService;
    private final AiInferenceService aiInferenceService;
    private final NotificationService notificationService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * PHA 1 & 2: TIẾP NHẬN PHẢN ÁNH & SUY LUẬN AI TỰ ĐỘNG
     */
    @Transactional
    public IncidentResponse createIncident(IncidentCreateRequest request, MultipartFile image, Long citizenId) {
        // 1. Kiểm tra rào chắn địa lý
        if (!GeoUtil.isWithinGeoBounds(request.getLatitude(), request.getLongitude())) {
            throw new BadRequestException("Tọa độ GPS phản ánh nằm ngoài phạm vi phụ trách bảo trì của hệ thống");
        }

        // 2. Tìm thông tin Citizen & Kiểm tra đình chỉ tài khoản (Spam Enforcement)
        User citizen = userRepository.findById(citizenId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + citizenId));

        if (citizen.getSuspendedUntil() != null && citizen.getSuspendedUntil().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Tài khoản của bạn đang bị tạm khóa quyền gửi báo cáo đến " 
                    + citizen.getSuspendedUntil() + ". Lý do: " + (citizen.getSuspendReason() != null ? citizen.getSuspendReason() : "Vi phạm quy định gửi tin"));
        }

        // 2.1 Giới hạn tần suất: tối đa 5 báo cáo trong 10 phút (Rate Limit)
        LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);
        long recentReportsCount = incidentRepository.countRecentReportsByCitizen(citizenId, tenMinutesAgo);
        if (recentReportsCount >= 5) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã gửi quá 5 báo cáo trong 10 phút qua. Vui lòng chờ trước khi tiếp tục gửi phản ánh mới.");
        }

        // 2.2 Tính mã băm SHA-256 của ảnh để chống trùng lặp file (Image Hash Check)
        byte[] imgBytes;
        try {
            imgBytes = image.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Không thể đọc dữ liệu ảnh tải lên");
        }
        String imageSha256 = org.springframework.util.DigestUtils.md5DigestAsHex(imgBytes);
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(imgBytes);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            imageSha256 = hexString.toString();
        } catch (Exception ignored) {}

        boolean isDuplicateImage = incidentRepository.existsByImageSha256(imageSha256);

        // 2.3 Đánh giá mức độ ưu tiên/kiểm duyệt dựa trên lịch sử tài khoản (Reputation Analysis)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long reportsLast30Days = incidentRepository.countRecentReportsByCitizen(citizenId, thirtyDaysAgo);
        long rejectedLast30Days = incidentRepository.countRecentReportsByCitizenAndStatus(citizenId, thirtyDaysAgo, IncidentStatus.REJECTED);
        long verifiedTotal = incidentRepository.countVerifiedReportsByCitizen(citizenId);

        String initialModerationFlag = null;
        if (isDuplicateImage) {
            initialModerationFlag = "SUSPECTED_DUPLICATE_IMAGE";
        } else if (reportsLast30Days >= 5 && ((double) rejectedLast30Days / reportsLast30Days) > 0.5) {
            initialModerationFlag = "LOW_PRIORITY_REVIEW";
        } else if (citizen.getReputationScore() >= 80 && verifiedTotal >= 3) {
            initialModerationFlag = "TRUSTED_REPORT";
        }

        // 3. Lưu trữ ảnh vào thư mục upload
        String imageUrl = fileStorageService.storeFile(image, "incidents");

        // 4. Sinh mã ticket ngẫu nhiên duy nhất (vd: #RC-8942)
        int randomCode = 1000 + new Random().nextInt(9000);
        String ticketCode = "#RC-" + randomCode;

        // Tự động phân giải Hạt Quản Lý Đường Bộ & Tuyến phụ trách
        GeoUtil.RouteCorridorInfo corridor = GeoUtil.resolveCorridor(request.getLatitude(), request.getLongitude(), request.getAddress());

        // 5. Khởi tạo Incident ban đầu
        Incident incident = Incident.builder()
                .ticketCode(ticketCode)
                .citizen(citizen)
                .title(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle() : "Phát hiện hư hại mặt đường tại " + ticketCode)
                .description(request.getDescription())
                .imageUrl(imageUrl)
                .imageSha256(imageSha256)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .originalLatitude(request.getOriginalLatitude() != null ? request.getOriginalLatitude() : request.getLatitude())
                .originalLongitude(request.getOriginalLongitude() != null ? request.getOriginalLongitude() : request.getLongitude())
                .gpsAccuracy(request.getGpsAccuracy())
                .address(request.getAddress() != null ? request.getAddress() : "Khu vực đô thị")
                .routeCorridor(corridor.getCode())
                .zoneName(corridor.getName())
                .flag(initialModerationFlag)
                .status(IncidentStatus.SUBMITTED)
                .build();

        // 6. Thực thi suy luận AI ONNX Runtime
        List<ImageTensorUtil.BoundingBox> detectionBoxes;
        int imgW = 0;
        int imgH = 0;
        float effectiveThresh = request.getCustomThreshold() != null
                ? request.getCustomThreshold()
                : aiInferenceService.getConfidenceThreshold();

        long inferStart = System.currentTimeMillis();
        try {
            java.awt.image.BufferedImage bimg = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(imgBytes));
            if (bimg != null) {
                imgW = bimg.getWidth();
                imgH = bimg.getHeight();
            }
            detectionBoxes = aiInferenceService.runInferenceList(new java.io.ByteArrayInputStream(imgBytes), effectiveThresh);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi đọc luồng ảnh để đưa vào mô hình AI", e);
        }
        int measuredInferenceMs = (int) Math.max(1, System.currentTimeMillis() - inferStart);

        ImageTensorUtil.BoundingBox detectionResult = detectionBoxes.isEmpty()
                ? aiInferenceService.emptyDetection()
                : detectionBoxes.get(0);

        // 7. Tự động tính toán Mức độ nghiêm trọng (Severity) theo chuẩn chuyên gia
        String estimatedSeverity = aiInferenceService.calculateSeverity(detectionBoxes, imgW, imgH);
        try {
            incident.setSeverity(Severity.valueOf(estimatedSeverity));
        } catch (Exception ignored) {}

        // 8. Logic phân nhánh ngưỡng an toàn (Confidence Gate) & Đa sự cố
        BigDecimal conf = BigDecimal.valueOf(detectionResult.getConfidence());
        boolean isConfident = detectionResult.getConfidence() >= effectiveThresh;

        // Đếm các phân loại hư hỏng khác nhau mà AI phát hiện
        java.util.Set<String> distinctDetectedClasses = new java.util.HashSet<>();
        for (ImageTensorUtil.BoundingBox b : detectionBoxes) {
            if (b.getConfidence() >= effectiveThresh) {
                distinctDetectedClasses.add(b.getClassName());
            }
        }

        boolean isUserMulti = (request.getCategories() != null && request.getCategories().size() > 1)
                || request.getCategory() == Category.COMPLEX_DAMAGE;
        boolean isAiMulti = distinctDetectedClasses.size() > 1;

        if (isConfident) {
            incident.setStatus(IncidentStatus.AI_ANALYZED);
            if (isUserMulti || isAiMulti) {
                incident.setCategory(Category.COMPLEX_DAMAGE);
                if (incident.getFlag() == null) incident.setFlag("MULTI_DEFECT");
            } else {
                try {
                    incident.setCategory(Category.valueOf(detectionResult.getClassName()));
                } catch (Exception e) {
                    incident.setCategory(request.getCategory() != null ? request.getCategory() : Category.POTHOLE);
                }
            }
        } else {
            incident.setStatus(IncidentStatus.SUBMITTED);
            if (incident.getFlag() == null) incident.setFlag("NEEDS_MANUAL_REVIEW");
            if (isUserMulti) {
                incident.setCategory(Category.COMPLEX_DAMAGE);
            } else {
                incident.setCategory(request.getCategory() != null ? request.getCategory() : Category.ROAD_OBSTACLE);
            }
        }

        // Tự động kiểm tra phát hiện sự cố trùng lặp trong bán kính 25m (Spatial Deduplication)
        try {
            NearbyIncidentCheckResponse nearbyCheck = checkNearbyDuplicate(
                    incident.getLatitude(), incident.getLongitude(), incident.getCategory(), 25.0);
            if (nearbyCheck.isHasNearbyDuplicate() && (incident.getFlag() == null || "TRUSTED_REPORT".equals(incident.getFlag()))) {
                incident.setFlag("POTENTIAL_DUPLICATE");
            }
        } catch (Exception e) {
            log.warn("Không thể kiểm tra trùng lặp sự cố khi tạo mới: {}", e.getMessage());
        }

        Incident savedIncident = incidentRepository.save(incident);

        // 8. Lưu kết quả suy luận AI vào bảng ai_detections (bao gồm toàn bộ hộp bao dạng JSON)
        String rawJson = "[]";
        try {
            rawJson = objectMapper.writeValueAsString(detectionBoxes);
        } catch (Exception e) {
            log.warn("Không thể chuyển đổi danh sách boxes sang JSON: {}", e.getMessage());
        }

        AiDetection aiDetection = AiDetection.builder()
                .incident(savedIncident)
                .className(detectionResult.getClassName())
                .confidence(conf)
                .bboxX(detectionResult.getX())
                .bboxY(detectionResult.getY())
                .bboxWidth(detectionResult.getWidth())
                .bboxHeight(detectionResult.getHeight())
                .rawPredictionsJson(rawJson)
                .inferenceMs(measuredInferenceMs)
                .build();

        aiDetectionRepository.save(aiDetection);
        savedIncident.setAiDetection(aiDetection);

        // Gửi thông báo Real-time đến Quản trị viên
        notificationService.notifyAdmins(
            "Phản ánh mới tiếp nhận: " + savedIncident.getTicketCode(),
            "Sự cố [" + savedIncident.getTitle() + "] vừa được ghi nhận tại " + savedIncident.getAddress(),
            "INFO",
            savedIncident
        );

        return mapToResponse(savedIncident);
    }

    /**
     * PHA 3: THẨM ĐỊNH VÀ PHÂN CÔNG KỸ THUẬT VIÊN (ADMIN)
     */
    @Transactional
    public IncidentResponse assignIncident(Long incidentId, AssignmentRequest request, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);

        // Bắt buộc tuân thủ Incident Lifecycle: AI_ANALYZED -> VERIFIED -> ASSIGNED
        if (incident.getStatus() != IncidentStatus.VERIFIED) {
            throw new BadRequestException("Chỉ có thể giao việc cho sự cố đã được điều phối viên xác minh (VERIFIED). Hiện tại: " + incident.getStatus());
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Quản trị viên"));
        User staff = userRepository.findById(request.getStaffId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kỹ thuật viên với ID: " + request.getStaffId()));

        if (staff.getRole() != Role.ROLE_STAFF) {
            throw new BadRequestException("Người dùng được gán không phải là nhân viên kỹ thuật (ROLE_STAFF)");
        }

        // Cập nhật thông tin Incident
        incident.setStatus(IncidentStatus.ASSIGNED);
        if (request.getVerifiedCategory() != null && !request.getVerifiedCategory().isBlank()) {
            try {
                incident.setCategory(Category.valueOf(request.getVerifiedCategory()));
            } catch (Exception ignored) {}
        }
        incident.setFlag(null); // Xóa cờ thẩm định thủ công khi đã được duyệt

        Assignment assignment = incident.getAssignment();
        if (assignment == null) {
            assignment = Assignment.builder()
                    .incident(incident)
                    .build();
        }
        assignment.setAssignedByAdmin(admin);
        assignment.setAssignedToStaff(staff);
        assignment.setVerifiedCategory(incident.getCategory().name());
        assignment.setPriority(request.getPriority());
        assignment.setNotes(request.getNotes());
        assignment.setAssignedAt(LocalDateTime.now());

        assignmentRepository.save(assignment);
        incident.setAssignment(assignment);

        notificationService.notifyStaff(
            "Phân công xử lý sự cố: " + incident.getTicketCode(),
            "Nhân viên kỹ thuật [" + staff.getFullName() + "] được giao xử lý sự cố tại: " + incident.getAddress(),
            "URGENT",
            incident
        );

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 2.5: QUẢN TRỊ VIÊN XÁC NHẬN SỰ CỐ HỢP LỆ (ADMIN)
     */
    @Transactional
    public IncidentResponse verifyIncident(Long incidentId, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);

        if (incident.getStatus() != IncidentStatus.AI_ANALYZED && incident.getStatus() != IncidentStatus.SUBMITTED) {
            throw new BadRequestException("Chỉ có thể xác nhận sự cố khi đang ở trạng thái AI_ANALYZED hoặc SUBMITTED");
        }

        incident.setStatus(IncidentStatus.VERIFIED);
        incident.setFlag(null);

        // Cộng điểm uy tín cho người dân (+5 điểm, tối đa 100)
        User citizen = incident.getCitizen();
        if (citizen != null) {
            int currentScore = citizen.getReputationScore() != null ? citizen.getReputationScore() : 50;
            citizen.setReputationScore(Math.min(100, currentScore + 5));
            userRepository.save(citizen);
            log.info("Cộng +5 điểm uy tín cho người dùng ID {}. Điểm mới: {}", citizen.getId(), citizen.getReputationScore());
        }

        log.info("Quản trị viên ID {} đã thẩm định xác nhận sự cố #{}", adminId, incident.getTicketCode());
        if (citizen != null) {
            notificationService.notifyUser(
                citizen.getId(),
                "Phản ánh hợp lệ: " + incident.getTicketCode(),
                "Phản ánh của bạn đã được Quản trị viên thẩm định hợp lệ và đưa vào kế hoạch bảo trì.",
                "SUCCESS",
                incident
            );
        }
        notificationService.notifyStaff(
            "Hồ sơ sẵn sàng điều phối: " + incident.getTicketCode(),
            "Sự cố [" + incident.getTitle() + "] đã được duyệt hợp lệ và sẵn sàng phân công khảo sát/thi công.",
            "INFO",
            incident
        );
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 3: TỪ CHỐI TIẾP NHẬN SỰ CỐ (ADMIN)
     */
    @Transactional
    public IncidentResponse rejectIncident(Long incidentId, RejectionRequest request) {
        Incident incident = getIncidentEntity(incidentId);
        incident.setStatus(IncidentStatus.REJECTED);
        incident.setRejectionReason(request.getRejectionReason());

        // Xử lý trừ điểm uy tín & phạt vi phạm nếu bị từ chối do vi phạm rõ ràng
        User citizen = incident.getCitizen();
        if (citizen != null) {
            int currentScore = citizen.getReputationScore() != null ? citizen.getReputationScore() : 50;
            citizen.setReputationScore(Math.max(0, currentScore - 10));

            // Chỉ tính strike nếu lý do vi phạm không phải do lỗi trùng lặp khách quan
            String reason = request.getRejectionReason() != null ? request.getRejectionReason().toLowerCase() : "";
            boolean isObjectiveDuplicate = reason.contains("trùng") || reason.contains("duplicate");
            
            if (!isObjectiveDuplicate) {
                int strikes = (citizen.getSpamStrikes() != null ? citizen.getSpamStrikes() : 0) + 1;
                citizen.setSpamStrikes(strikes);

                // Khóa tài khoản tạm thời 7 ngày nếu tái phạm >= 5 lần
                if (strikes >= 5) {
                    citizen.setSuspendedUntil(LocalDateTime.now().plusDays(7));
                    citizen.setSuspendReason("Tài khoản đã có từ 5 báo cáo bị từ chối do vi phạm quy định gửi tin.");
                    log.warn("Tài khoản ID {} đã bị tạm khóa 7 ngày do đạt 5 vi phạm spam!", citizen.getId());
                }
            }
            userRepository.save(citizen);
            log.info("Trừ -10 điểm uy tín cho người dùng ID {}. Điểm mới: {}, Số strike vi phạm: {}", 
                    citizen.getId(), citizen.getReputationScore(), citizen.getSpamStrikes());
            notificationService.notifyUser(
                citizen.getId(),
                "Phản ánh bị từ chối: " + incident.getTicketCode(),
                "Phản ánh sự cố của bạn đã bị từ chối tiếp nhận. Lý do: " + request.getRejectionReason(),
                "WARNING",
                incident
            );
        }

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 4: CẬP NHẬT TRẠNG THÁI TIẾN ĐỘ THI CÔNG (STAFF)
     */
    @Transactional
    public IncidentResponse updateStatus(Long incidentId, IncidentStatus newStatus, Long userId) {
        Incident incident = getIncidentEntity(incidentId);

        // Kiểm tra hợp lệ chuyển trạng thái (cho phép chuyển IN_PROGRESS từ ASSIGNED, PENDING_INSPECTION hoặc khi làm lại từ RESOLVED)
        if (newStatus == IncidentStatus.IN_PROGRESS && 
            incident.getStatus() != IncidentStatus.ASSIGNED && 
            incident.getStatus() != IncidentStatus.RESOLVED &&
            incident.getStatus() != IncidentStatus.PENDING_INSPECTION) {
            throw new BadRequestException("Chỉ có thể chuyển sang IN_PROGRESS từ trạng thái ASSIGNED, PENDING_INSPECTION hoặc RESOLVED");
        }

        incident.setStatus(newStatus);
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 4: NỘP BẰNG CHỨNG NGHIỆM THU HIỆN TRƯỜNG (STAFF)
     */
    @Transactional
    public IncidentResponse resolveIncident(Long incidentId, MultipartFile proofImage, String notes, Long staffId) {
        Incident incident = getIncidentEntity(incidentId);
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin kỹ thuật viên"));

        if (incident.getStatus() != IncidentStatus.IN_PROGRESS && incident.getStatus() != IncidentStatus.ASSIGNED) {
            throw new BadRequestException("Sự cố phải ở trạng thái đang thi công mới có thể nộp nghiệm thu");
        }

        // Lưu ảnh bằng chứng thi công
        String proofUrl = fileStorageService.storeFile(proofImage, "proofs");

        // 🌟 BƯỚC THẨM ĐỊNH CHẤT LƯỢNG NGHIỆM THU TỰ ĐỘNG BẰNG AI (Before vs After)
        String aiVerificationStatus = "AI_VERIFIED_CLEAN";
        BigDecimal aiVerificationConfidence = BigDecimal.ZERO;
        String aiVerificationDetectionsJson = "[]";
        String aiVerificationNotes = "Nghiệm thu đạt chuẩn: AI không phát hiện bất kỳ hư hỏng nào còn sót lại trên mặt đường.";

        try {
            byte[] proofBytes = proofImage.getBytes();
            List<ImageTensorUtil.BoundingBox> proofBoxes = aiInferenceService.runInferenceList(
                    new java.io.ByteArrayInputStream(proofBytes), 0.22f);

            if (!proofBoxes.isEmpty()) {
                aiVerificationStatus = "AI_WARNING_DEFECT_REMAINS";
                float maxConf = 0.0f;
                for (ImageTensorUtil.BoundingBox b : proofBoxes) {
                    if (b.getConfidence() > maxConf) maxConf = b.getConfidence();
                }
                aiVerificationConfidence = BigDecimal.valueOf(maxConf);
                aiVerificationDetectionsJson = objectMapper.writeValueAsString(proofBoxes);
                aiVerificationNotes = String.format("Cảnh báo AI: Phát hiện %d vị trí hư hỏng còn sót lại trên bề mặt sửa chữa!", proofBoxes.size());
                log.warn("Nghiệm thu sự cố #{} có cảnh báo từ AI: {}", incident.getTicketCode(), aiVerificationNotes);
            } else {
                log.info("Nghiệm thu sự cố #{} đạt chuẩn qua thẩm định AI (0 khuyết tật sót lại)", incident.getTicketCode());
            }
        } catch (Exception e) {
            log.warn("Không thể chạy suy luận AI trên ảnh nghiệm thu: {}", e.getMessage());
            aiVerificationNotes = "Nghiệm thu thủ công (Không thể khởi chạy AI thẩm định)";
        }

        // Chuyển sang PENDING_INSPECTION để Chờ Quản trị viên thẩm định & nghiệm thu
        incident.setStatus(IncidentStatus.PENDING_INSPECTION);

        Resolution resolution = incident.getResolution();
        if (resolution == null) {
            resolution = Resolution.builder()
                    .incident(incident)
                    .build();
        }
        resolution.setStaff(staff);
        resolution.setProofImageUrl(proofUrl);
        resolution.setNotes(notes);
        resolution.setAiVerificationStatus(aiVerificationStatus);
        resolution.setAiVerificationConfidence(aiVerificationConfidence);
        resolution.setAiVerificationDetectionsJson(aiVerificationDetectionsJson);
        resolution.setAiVerificationNotes(aiVerificationNotes);
        resolution.setResolvedAt(LocalDateTime.now());

        resolutionRepository.save(resolution);
        incident.setResolution(resolution);

        notificationService.notifyAdmins(
            "Hồ sơ nghiệm thu mới: " + incident.getTicketCode(),
            "Tổ thi công đã nộp hồ sơ hoàn thành (kèm ảnh và kết quả quét AI). Đang chờ Admin duyệt nghiệm thu.",
            "INFO",
            incident
        );

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 4.5: QUẢN TRỊ VIÊN DUYỆT NGHIỆM THU HIỆN TRƯỜNG (ADMIN)
     */
    @Transactional
    public IncidentResponse approveInspection(Long incidentId, String notes, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);

        if (incident.getStatus() != IncidentStatus.PENDING_INSPECTION) {
            throw new BadRequestException("Chỉ có thể phê duyệt nghiệm thu khi sự cố ở trạng thái chờ nghiệm thu (PENDING_INSPECTION)");
        }

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedAt(LocalDateTime.now());
        if (notes != null && !notes.isBlank() && incident.getResolution() != null) {
            incident.getResolution().setNotes(
                (incident.getResolution().getNotes() != null ? incident.getResolution().getNotes() + "\n" : "") +
                "[Admin duyệt nghiệm thu]: " + notes
            );
            resolutionRepository.save(incident.getResolution());
        }

        log.info("Quản trị viên ID {} đã phê duyệt nghiệm thu sự cố #{}", adminId, incident.getTicketCode());
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 5: ĐÓNG HỒ SƠ SỰ CỐ (ADMIN HOẶC CITIZEN SAU KHI ĐÃ RESOLVED)
     * Chuẩn workflow: RESOLVED -> CLOSED. Đánh giá (Feedback/Rating) là tùy chọn, không cản trở việc đóng phiếu.
     */
    @Transactional
    public IncidentResponse closeIncident(Long incidentId, FeedbackRequest request, Long userId, Role userRole) {
        Incident incident = getIncidentEntity(incidentId);

        // Chỉ công dân tạo phiếu hoặc Admin mới có quyền đóng
        if (userRole != Role.ROLE_ADMIN && !incident.getCitizen().getId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền đóng sự cố này");
        }

        if (incident.getStatus() != IncidentStatus.RESOLVED) {
            throw new BadRequestException("Chỉ có thể đóng sự cố khi đã được hoàn thành nghiệm thu (RESOLVED)");
        }

        if (incident.getResolvedAt() == null) {
            incident.setResolvedAt(LocalDateTime.now());
        }

        User citizen = incident.getCitizen();

        incident.setStatus(IncidentStatus.CLOSED);
        incident.setClosedAt(LocalDateTime.now());

        // Nếu có gửi kèm feedback rating thì lưu, nếu không thì vẫn CLOSED bình thường
        if (request != null && request.getRating() != null && request.getRating() > 0) {
            Feedback feedback = incident.getFeedback();
            if (feedback == null) {
                feedback = Feedback.builder()
                        .incident(incident)
                        .citizen(citizen)
                        .build();
            }
            feedback.setRating(request.getRating());
            feedback.setComments(request.getComments());
            feedback.setCreatedAt(LocalDateTime.now());

            feedbackRepository.save(feedback);
            incident.setFeedback(feedback);
        }

        log.info("Sự cố #{} đã được đóng hồ sơ (CLOSED) thành công bởi user ID {}", incident.getTicketCode(), userId);
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * ĐÁNH GIÁ CỦA NGƯỜI DÂN (CITIZEN FEEDBACK & RATING)
     * Độc lập với Incident Status: Người dân có thể đánh giá bất kỳ lúc nào sau khi sự cố RESOLVED hoặc CLOSED
     */
    @Transactional
    public IncidentResponse submitFeedback(Long incidentId, FeedbackRequest request, Long citizenId) {
        Incident incident = getIncidentEntity(incidentId);

        if (!incident.getCitizen().getId().equals(citizenId)) {
            throw new AccessDeniedException("Chỉ người dân gửi phản ánh này mới có quyền đánh giá chất lượng phục vụ");
        }

        if (incident.getStatus() != IncidentStatus.RESOLVED && incident.getStatus() != IncidentStatus.CLOSED) {
            throw new BadRequestException("Chỉ có thể gửi đánh giá khi sự cố đã được nghiệm thu (RESOLVED) hoặc đã đóng (CLOSED)");
        }

        if (request == null || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new BadRequestException("Vui lòng đánh giá từ 1 đến 5 sao");
        }

        Feedback feedback = incident.getFeedback();
        if (feedback == null) {
            feedback = Feedback.builder()
                    .incident(incident)
                    .citizen(incident.getCitizen())
                    .build();
        }
        feedback.setRating(request.getRating());
        feedback.setComments(request.getComments());
        feedback.setCreatedAt(LocalDateTime.now());

        feedbackRepository.save(feedback);
        incident.setFeedback(feedback);

        log.info("Người dân ID {} đã gửi đánh giá {} sao cho sự cố #{}", citizenId, request.getRating(), incident.getTicketCode());
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 5: NGƯỜI DÂN KHIẾU NẠI NGHIỆM THU CHƯA ĐẠT (CITIZEN / ADMIN)
     */
    @Transactional
    public IncidentResponse disputeIncident(Long incidentId, DisputeRequest request, Long citizenId, Role role) {
        Incident incident = getIncidentEntity(incidentId);

        if (role != Role.ROLE_ADMIN && !incident.getCitizen().getId().equals(citizenId)) {
            throw new AccessDeniedException("Bạn không có quyền gửi khiếu nại sự cố này");
        }

        if (incident.getStatus() != IncidentStatus.RESOLVED && incident.getStatus() != IncidentStatus.PENDING_INSPECTION) {
            throw new BadRequestException("Chỉ có thể khiếu nại khi sự cố đang ở trạng thái PENDING_INSPECTION hoặc RESOLVED");
        }

        incident.setFlag("DISPUTED");
        incident.setReworkReason(request.getReason());
        log.warn("Sự cố #{} bị khiếu nại chất lượng: {}", incident.getTicketCode(), request.getReason());

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 5: QUẢN TRỊ VIÊN BÁC BỎ NGHIỆM THU VÀ RA LỆNH THI CÔNG LẠI (ADMIN)
     */
    @Transactional
    public IncidentResponse reworkIncident(Long incidentId, ReworkRequest request, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);

        if (incident.getStatus() != IncidentStatus.RESOLVED && 
            incident.getStatus() != IncidentStatus.PENDING_INSPECTION && 
            incident.getStatus() != IncidentStatus.IN_PROGRESS) {
            throw new BadRequestException("Chỉ có thể yêu cầu làm lại với sự cố ở trạng thái PENDING_INSPECTION, RESOLVED hoặc IN_PROGRESS");
        }

        incident.setStatus(IncidentStatus.IN_PROGRESS);
        incident.setFlag(null); // Gỡ cờ khiếu nại khi Admin đã ra quyết định chỉ đạo xử lý
        incident.setReworkReason(request.getInstructions());
        incident.setReworkCount(incident.getReworkCount() != null ? incident.getReworkCount() + 1 : 1);

        if (incident.getAssignment() != null) {
            if (request.getPriority() != null) {
                incident.getAssignment().setPriority(request.getPriority());
            }
            incident.getAssignment().setNotes("YÊU CẦU THI CÔNG LẠI: " + request.getInstructions());
            assignmentRepository.save(incident.getAssignment());
        }

        log.info("Quản trị viên đã ra lệnh thi công lại sự cố #{}: {}", incident.getTicketCode(), request.getInstructions());
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * Tự động quét và đóng các sự cố RESOLVED quá 7 ngày (trừ các sự cố có cảnh báo AI hoặc đang bị khiếu nại)
     */
    @Scheduled(cron = "0 0 2 * * ?") // 02:00 sáng mỗi ngày
    @Transactional
    public void autoCloseOldResolvedIncidents() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<Incident> oldResolvedIncidents = incidentRepository.findByStatusAndResolvedAtBefore(IncidentStatus.RESOLVED, sevenDaysAgo);

        int closedCount = 0;
        for (Incident incident : oldResolvedIncidents) {
            // Chốt chặn an toàn: Tuyệt đối KHÔNG tự động đóng nếu AI cảnh báo còn lỗi hoặc người dân đang khiếu nại
            if (incident.getResolution() != null && "AI_WARNING_DEFECT_REMAINS".equals(incident.getResolution().getAiVerificationStatus())) {
                continue;
            }
            if ("DISPUTED".equals(incident.getFlag())) {
                continue;
            }

            incident.setStatus(IncidentStatus.CLOSED);
            incident.setClosedAt(LocalDateTime.now());

            Feedback autoFeedback = Feedback.builder()
                    .incident(incident)
                    .citizen(incident.getCitizen())
                    .rating((short) 5)
                    .comments("Hệ thống tự động đóng phiếu sau 7 ngày theo quy chuẩn vận hành đô thị")
                    .build();

            feedbackRepository.save(autoFeedback);
            incidentRepository.save(incident);
            closedCount++;
        }
        log.info("Tác vụ tự động đóng phiếu hoàn tất: đã đóng {} sự cố tồn đọng hợp lệ", closedCount);
    }

    // Các hàm truy vấn đọc dữ liệu
    @Transactional(readOnly = true)
    public IncidentResponse getIncidentById(Long id) {
        return mapToResponse(getIncidentEntity(id));
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> getFilteredIncidents(IncidentStatus status, Category category, String search, Pageable pageable) {
        return incidentRepository.findWithFilters(status, category, search, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> getMyIncidents(Long citizenId, Pageable pageable) {
        return incidentRepository.findByCitizenId(citizenId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> getAssignedToStaff(Long staffId, Pageable pageable) {
        return incidentRepository.findByAssignedStaffId(staffId, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Lấy toàn bộ danh sách sự cố phục vụ bản đồ số hóa GIS
     */
    @Transactional(readOnly = true)
    public List<IncidentResponse> getAllIncidentsForMap() {
        return incidentRepository.findAll(org.springframework.data.domain.Sort.by("createdAt").descending())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private Incident getIncidentEntity(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sự cố với ID: " + id));
    }

    private IncidentResponse mapToResponse(Incident i) {
        IncidentResponse.IncidentResponseBuilder builder = IncidentResponse.builder()
                .id(i.getId())
                .ticketCode(i.getTicketCode())
                .title(i.getTitle())
                .description(i.getDescription())
                .imageUrl(i.getImageUrl())
                .latitude(i.getLatitude())
                .longitude(i.getLongitude())
                .address(i.getAddress())
                .routeCorridor(i.getRouteCorridor())
                .zoneName(i.getZoneName())
                .category(i.getCategory())
                .status(i.getStatus())
                .severity(i.getSeverity())
                .flag(i.getFlag())
                .rejectionReason(i.getRejectionReason())
                .reworkReason(i.getReworkReason())
                .reworkCount(i.getReworkCount())
                .upvoteCount(i.getUpvoteCount() != null ? i.getUpvoteCount() : 1)
                .citizenId(i.getCitizen().getId())
                .reporterName(i.getCitizen().getFullName())
                .reporterPhone(i.getCitizen().getPhone())
                .reporterReputationScore(i.getCitizen().getReputationScore())
                .imageSha256(i.getImageSha256())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .resolvedAt(i.getResolvedAt())
                .closedAt(i.getClosedAt());

        if (i.getAiDetection() != null) {
            List<ImageTensorUtil.BoundingBox> boxes = new java.util.ArrayList<>();
            String rawJson = i.getAiDetection().getRawPredictionsJson();
            if (rawJson != null && !rawJson.isBlank()) {
                try {
                    boxes = objectMapper.readValue(rawJson, new com.fasterxml.jackson.core.type.TypeReference<List<ImageTensorUtil.BoundingBox>>() {});
                } catch (Exception e) {
                    log.debug("Không thể parse rawPredictionsJson: {}", e.getMessage());
                }
            }
            if (boxes.isEmpty() && i.getAiDetection().getBboxWidth() > 0) {
                boxes.add(ImageTensorUtil.BoundingBox.builder()
                        .className(i.getAiDetection().getClassName())
                        .confidence(i.getAiDetection().getConfidence().floatValue())
                        .x(i.getAiDetection().getBboxX())
                        .y(i.getAiDetection().getBboxY())
                        .width(i.getAiDetection().getBboxWidth())
                        .height(i.getAiDetection().getBboxHeight())
                        .build());
            }

            builder.aiDetection(AiDetectionResponse.builder()
                    .className(i.getAiDetection().getClassName())
                    .confidence(i.getAiDetection().getConfidence())
                    .bboxX(i.getAiDetection().getBboxX())
                    .bboxY(i.getAiDetection().getBboxY())
                    .bboxWidth(i.getAiDetection().getBboxWidth())
                    .bboxHeight(i.getAiDetection().getBboxHeight())
                    .inferenceMs(i.getAiDetection().getInferenceMs())
                    .flag(i.getFlag())
                    .count(boxes.size())
                    .boxes(boxes)
                    .rawPredictionsJson(rawJson)
                    .build());
        }

        if (i.getAssignment() != null) {
            builder.assignment(IncidentResponse.AssignmentInfo.builder()
                    .assignedByAdminName(i.getAssignment().getAssignedByAdmin() != null ? i.getAssignment().getAssignedByAdmin().getFullName() : null)
                    .assignedToStaffId(i.getAssignment().getAssignedToStaff() != null ? i.getAssignment().getAssignedToStaff().getId() : null)
                    .assignedToStaffName(i.getAssignment().getAssignedToStaff() != null ? i.getAssignment().getAssignedToStaff().getFullName() : null)
                    .verifiedCategory(i.getAssignment().getVerifiedCategory())
                    .priority(i.getAssignment().getPriority())
                    .notes(i.getAssignment().getNotes())
                    .assignedAt(i.getAssignment().getAssignedAt())
                    .build());
        }

        if (i.getResolution() != null) {
            List<ImageTensorUtil.BoundingBox> proofBoxes = new java.util.ArrayList<>();
            String rawProofJson = i.getResolution().getAiVerificationDetectionsJson();
            if (rawProofJson != null && !rawProofJson.isBlank()) {
                try {
                    proofBoxes = objectMapper.readValue(rawProofJson, new com.fasterxml.jackson.core.type.TypeReference<List<ImageTensorUtil.BoundingBox>>() {});
                } catch (Exception e) {
                    log.debug("Không thể parse aiVerificationDetectionsJson: {}", e.getMessage());
                }
            }

            builder.resolution(IncidentResponse.ResolutionInfo.builder()
                    .staffName(i.getResolution().getStaff() != null ? i.getResolution().getStaff().getFullName() : null)
                    .proofImageUrl(i.getResolution().getProofImageUrl())
                    .notes(i.getResolution().getNotes())
                    .aiVerificationStatus(i.getResolution().getAiVerificationStatus())
                    .aiVerificationConfidence(i.getResolution().getAiVerificationConfidence())
                    .aiVerificationDetectionsJson(rawProofJson)
                    .aiVerificationNotes(i.getResolution().getAiVerificationNotes())
                    .verificationBoxes(proofBoxes)
                    .resolvedAt(i.getResolution().getResolvedAt())
                    .build());
        }

        if (i.getFeedback() != null) {
            builder.feedback(IncidentResponse.FeedbackInfo.builder()
                    .rating(i.getFeedback().getRating())
                    .comments(i.getFeedback().getComments())
                    .createdAt(i.getFeedback().getCreatedAt())
                    .build());
        }

        // Mapping luồng 7 giai đoạn mới
        builder.originalLatitude(i.getOriginalLatitude() != null ? i.getOriginalLatitude() : i.getLatitude())
                .originalLongitude(i.getOriginalLongitude() != null ? i.getOriginalLongitude() : i.getLongitude())
                .gpsAccuracy(i.getGpsAccuracy())
                .inspectionTeamId(i.getInspectionTeam() != null ? i.getInspectionTeam().getId() : null)
                .inspectionTeamName(i.getInspectionTeam() != null ? i.getInspectionTeam().getName() : null)
                .assignedTeamId(i.getAssignedTeam() != null ? i.getAssignedTeam().getId() : null)
                .assignedTeamName(i.getAssignedTeam() != null ? i.getAssignedTeam().getName() : null)
                .workPlan(i.getWorkPlan())
                .safetyNotes(i.getSafetyNotes())
                .plannedStartDate(i.getPlannedStartDate())
                .plannedDeadline(i.getPlannedDeadline());

        // Mapping báo cáo khảo sát hiện trường (Giai đoạn 4)
        if (i.getInspection() != null) {
            IncidentInspection insp = i.getInspection();
            List<String> photos = new java.util.ArrayList<>();
            if (insp.getInspectionPhotos() != null && !insp.getInspectionPhotos().isBlank()) {
                photos = java.util.Arrays.asList(insp.getInspectionPhotos().split(","));
            }
            builder.inspection(InspectionResponse.builder()
                    .id(insp.getId())
                    .incidentId(i.getId())
                    .inspectorId(insp.getInspector() != null ? insp.getInspector().getId() : null)
                    .inspectorName(insp.getInspector() != null ? insp.getInspector().getFullName() : null)
                    .inspectionTeamId(insp.getInspectionTeam() != null ? insp.getInspectionTeam().getId() : null)
                    .inspectionTeamName(insp.getInspectionTeam() != null ? insp.getInspectionTeam().getName() : null)
                    .actualLatitude(insp.getActualLatitude())
                    .actualLongitude(insp.getActualLongitude())
                    .confirmedCategory(insp.getConfirmedCategory())
                    .actualSeverity(insp.getActualSeverity())
                    .estimatedSize(insp.getEstimatedSize())
                    .trafficImpact(insp.getTrafficImpact())
                    .proposedSolution(insp.getProposedSolution())
                    .noDamageFound(insp.getNoDamageFound())
                    .reasonNoDamage(insp.getReasonNoDamage())
                    .notes(insp.getNotes())
                    .inspectionPhotos(photos)
                    .inspectedAt(insp.getInspectedAt())
                    .build());
        }

        // Mapping bằng chứng các giai đoạn (Giai đoạn 4, 6, 7)
        if (i.getEvidences() != null && !i.getEvidences().isEmpty()) {
            builder.evidences(i.getEvidences().stream().map(ev -> EvidenceResponse.builder()
                    .id(ev.getId())
                    .incidentId(i.getId())
                    .stage(ev.getStage())
                    .imageUrl(ev.getImageUrl())
                    .uploaderId(ev.getUploader() != null ? ev.getUploader().getId() : null)
                    .uploaderName(ev.getUploader() != null ? ev.getUploader().getFullName() : null)
                    .notes(ev.getNotes())
                    .latitude(ev.getLatitude())
                    .longitude(ev.getLongitude())
                    .reworkIteration(ev.getReworkIteration())
                    .createdAt(ev.getCreatedAt())
                    .build()).toList());
        }

        return builder.build();
    }

    // =========================================================================
    // CÁC PHƯƠNG THỨC MỚI CHO LUỒNG 7 GIAI ĐOẠN ĐỒ ÁN
    // =========================================================================

    /**
     * GIAI ĐOẠN 3 -> 4: ADMIN GIAO KHẢO SÁT HIỆN TRƯỜNG CHO TỔ ĐỘI
     */
    @Transactional
    public IncidentResponse assignInspection(Long incidentId, InspectionAssignRequest req, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);
        Team team = teamRepository.findById(req.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội khảo sát ID: " + req.getTeamId()));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Quản trị viên"));

        User inspector = null;
        if (req.getInspectorId() != null) {
            inspector = userRepository.findById(req.getInspectorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên khảo sát ID: " + req.getInspectorId()));
        } else if (team.getLeader() != null) {
            inspector = team.getLeader();
        }

        incident.setInspectionTeam(team);
        incident.setStatus(IncidentStatus.INSPECTION_ASSIGNED);
        incident.setFlag(null);

        IncidentInspection inspection = incident.getInspection();
        if (inspection == null) {
            inspection = IncidentInspection.builder()
                    .incident(incident)
                    .inspectionTeam(team)
                    .inspector(inspector)
                    .notes(req.getNotes())
                    .build();
        } else {
            inspection.setInspectionTeam(team);
            inspection.setInspector(inspector);
            if (req.getNotes() != null) inspection.setNotes(req.getNotes());
        }
        incidentInspectionRepository.save(inspection);
        incident.setInspection(inspection);

        if (inspector != null) {
            Assignment assignment = incident.getAssignment();
            if (assignment == null) {
                assignment = Assignment.builder().incident(incident).build();
            }
            assignment.setAssignedByAdmin(admin);
            assignment.setAssignedToStaff(inspector);
            assignment.setVerifiedCategory(incident.getCategory() != null ? incident.getCategory().name() : "POTHOLE");
            assignment.setPriority(req.getPriority() != null ? req.getPriority() : com.roadvision.enums.Priority.NORMAL);
            assignment.setNotes(req.getNotes());
            assignment.setAssignedAt(LocalDateTime.now());
            assignmentRepository.save(assignment);
            notificationService.notifyStaff(
                "Nhiệm vụ khảo sát mới: " + incident.getTicketCode(),
                "Tổ [" + team.getName() + "] được giao nhiệm vụ khảo sát thực địa sự cố tại: " + incident.getAddress(),
                "WARNING",
                incident
            );
            incident.setAssignment(assignment);
        notificationService.notifyStaff(
            "Nhiệm vụ thi công mới: " + incident.getTicketCode(),
            "Tổ [" + team.getName() + "] được giao thi công sửa chữa sự cố tại: " + incident.getAddress(),
            "URGENT",
            incident
        );
        if (incident.getCitizen() != null) {
            notificationService.notifyUser(
                incident.getCitizen().getId(),
                "Triển khai thi công: " + incident.getTicketCode(),
                "Sự cố mặt đường của bạn đã được chuyển cho Tổ Thi công tiến hành xử lý.",
                "INFO",
                incident
            );
        }
        }

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * GIAI ĐOẠN 4: NHÂN VIÊN KHẢO SÁT BẮT ĐẦU DI CHUYỂN / KHẢO SÁT
     */
    @Transactional
    public IncidentResponse startInspecting(Long incidentId, Long staffId) {
        Incident incident = getIncidentEntity(incidentId);
        if (incident.getStatus() != IncidentStatus.INSPECTION_ASSIGNED) {
            throw new BadRequestException("Chỉ có thể bắt đầu khảo sát khi sự cố ở trạng thái INSPECTION_ASSIGNED");
        }
        incident.setStatus(IncidentStatus.INSPECTING);
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * GIAI ĐOẠN 4: NHÂN VIÊN GỬI BÁO CÁO KẾT QUẢ KHẢO SÁT & ĐỀ XUẤT PHƯƠNG ÁN
     */
    @Transactional
    public IncidentResponse submitInspectionReport(Long incidentId, InspectionReportRequest req, List<MultipartFile> photos, Long staffId) {
        if (req == null) {
            throw new BadRequestException("Dữ liệu biên bản khảo sát hiện trường không được để trống");
        }

        Incident incident = getIncidentEntity(incidentId);
        User inspector = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên khảo sát"));

        // 1. Kiểm tra tọa độ GPS khảo sát
        BigDecimal lat = req.getActualLatitude() != null ? req.getActualLatitude() : incident.getLatitude();
        BigDecimal lng = req.getActualLongitude() != null ? req.getActualLongitude() : incident.getLongitude();
        if (lat == null || lng == null || !GeoUtil.isWithinGeoBounds(lat, lng)) {
            throw new BadRequestException("Tọa độ GPS khảo sát không hợp lệ hoặc nằm ngoài phạm vi bảo trì");
        }

        // 2. Kiểm tra ảnh hiện trường
        long validPhotosCount = (photos != null) ? photos.stream().filter(p -> p != null && !p.isEmpty()).count() : 0;
        boolean noDamage = req.getNoDamageFound() != null && req.getNoDamageFound();

        if (noDamage) {
            if (req.getReasonNoDamage() == null || req.getReasonNoDamage().trim().length() < 10) {
                throw new BadRequestException("Khi báo cáo không phát hiện hư hỏng, bắt buộc giải trình lý do chi tiết tối thiểu 10 ký tự");
            }
            if (validPhotosCount == 0) {
                throw new BadRequestException("Bắt buộc tải lên ít nhất 1 ảnh chụp hiện trường chứng minh không có hư hỏng");
            }
        } else {
            if (validPhotosCount == 0) {
                throw new BadRequestException("Bắt buộc tải lên ít nhất 1 ảnh chụp hiện trạng khảo sát thực tế tại hiện trường");
            }
            if (req.getConfirmedCategory() == null) {
                throw new BadRequestException("Vui lòng xác nhận loại hư hỏng thực tế (ổ gà, vết nứt, ngập úng...)");
            }
            if (req.getActualSeverity() == null) {
                throw new BadRequestException("Vui lòng đánh giá mức độ nghiêm trọng thực tế (Cao, Trung bình, Thấp)");
            }
            if (req.getEstimatedSize() == null || req.getEstimatedSize().trim().isEmpty() || req.getEstimatedSize().trim().equals("0 x 0 x 0")) {
                throw new BadRequestException("Vui lòng cung cấp số liệu kích thước đo đạc thực tế (Dài x Rộng x Sâu)");
            }
            if (req.getProposedSolution() == null || req.getProposedSolution().trim().length() < 10) {
                throw new BadRequestException("Đề xuất phương án kỹ thuật phải cụ thể tối thiểu 10 ký tự (ví dụ: cào bóc, tưới dính bám, thảm BTN...)");
            }
        }

        // Kiểm tra dung lượng và định dạng ảnh
        if (photos != null) {
            for (MultipartFile photo : photos) {
                if (photo != null && !photo.isEmpty()) {
                    if (photo.getSize() > 15 * 1024 * 1024) {
                        throw new BadRequestException("Tệp ảnh khảo sát vượt quá kích thước cho phép (tối đa 15MB/ảnh)");
                    }
                    String ct = photo.getContentType();
                    if (ct != null && !ct.startsWith("image/")) {
                        throw new BadRequestException("Tệp tải lên phải là hình ảnh (JPEG, PNG, WEBP)");
                    }
                }
            }
        }

        IncidentInspection inspection = incident.getInspection();
        if (inspection == null) {
            inspection = IncidentInspection.builder()
                    .incident(incident)
                    .inspectionTeam(incident.getInspectionTeam())
                    .build();
        }

        inspection.setInspector(inspector);
        inspection.setActualLatitude(lat);
        inspection.setActualLongitude(lng);
        if (req.getConfirmedCategory() != null) inspection.setConfirmedCategory(req.getConfirmedCategory());
        if (req.getActualSeverity() != null) inspection.setActualSeverity(req.getActualSeverity());
        inspection.setEstimatedSize(req.getEstimatedSize());
        inspection.setTrafficImpact(req.getTrafficImpact());
        inspection.setProposedSolution(req.getProposedSolution());
        inspection.setNoDamageFound(noDamage);
        inspection.setReasonNoDamage(req.getReasonNoDamage());
        inspection.setNotes(req.getNotes());
        inspection.setInspectedAt(LocalDateTime.now());

        // Lưu các ảnh khảo sát
        List<String> photoUrls = new java.util.ArrayList<>();
        if (photos != null && !photos.isEmpty()) {
            for (MultipartFile photo : photos) {
                if (!photo.isEmpty()) {
                    String url = fileStorageService.storeFile(photo, "inspections");
                    photoUrls.add(url);

                    IncidentEvidence ev = IncidentEvidence.builder()
                            .incident(incident)
                            .stage(com.roadvision.enums.EvidenceStage.INSPECTION)
                            .imageUrl(url)
                            .uploader(inspector)
                            .latitude(inspection.getActualLatitude())
                            .longitude(inspection.getActualLongitude())
                            .notes("Ảnh khảo sát hiện trường: " + (req.getEstimatedSize() != null ? req.getEstimatedSize() : ""))
                            .build();
                    incidentEvidenceRepository.save(ev);
                }
            }
            inspection.setInspectionPhotos(String.join(",", photoUrls));
        }

        incidentInspectionRepository.save(inspection);
        incident.setInspection(inspection);

        if (req.getConfirmedCategory() != null) {
            incident.setCategory(req.getConfirmedCategory());
        }
        if (req.getActualSeverity() != null) {
            incident.setSeverity(req.getActualSeverity());
        }
        incident.setLatitude(lat);
        incident.setLongitude(lng);

        incident.setStatus(IncidentStatus.INSPECTED);
        notificationService.notifyAdmins(
            "Biên bản khảo sát hoàn tất: " + incident.getTicketCode(),
            "Tổ kỹ thuật đã nộp biên bản đo đạc và đề xuất phương án thi công. Sẵn sàng điều phối giao việc.",
            "SUCCESS",
            incident
        );
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * GIAI ĐOẠN 5: ADMIN GIAO NHIỆM VỤ THI CÔNG CHO TỔ ĐỘI
     */
    @Transactional
    public IncidentResponse assignConstruction(Long incidentId, ConstructionAssignRequest req, Long adminId) {
        if (req == null || req.getTeamId() == null) {
            throw new BadRequestException("Vui lòng chọn tổ đội thi công phụ trách");
        }
        if (req.getWorkPlan() == null || req.getWorkPlan().trim().length() < 10) {
            throw new BadRequestException("Phương án thi công phải chi tiết tối thiểu 10 ký tự");
        }
        if (req.getPlannedDeadline() != null && req.getPlannedDeadline().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Hạn hoàn thành thi công (Deadline) không được ở trong quá khứ");
        }

        Incident incident = getIncidentEntity(incidentId);
        Team team = teamRepository.findById(req.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội thi công ID: " + req.getTeamId()));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Quản trị viên"));

        User staff = null;
        if (req.getStaffId() != null) {
            staff = userRepository.findById(req.getStaffId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên phụ trách ID: " + req.getStaffId()));
        } else if (team.getLeader() != null) {
            staff = team.getLeader();
        }

        incident.setAssignedTeam(team);
        incident.setWorkPlan(req.getWorkPlan().trim());
        incident.setPlannedStartDate(req.getPlannedStartDate());
        incident.setPlannedDeadline(req.getPlannedDeadline());
        incident.setSafetyNotes(req.getSafetyNotes());
        incident.setStatus(IncidentStatus.ASSIGNED);

        Assignment assignment = incident.getAssignment();
        if (assignment == null) {
            assignment = Assignment.builder().incident(incident).build();
        }
        assignment.setAssignedByAdmin(admin);
        assignment.setAssignedToStaff(staff);
        assignment.setVerifiedCategory(incident.getCategory() != null ? incident.getCategory().name() : "POTHOLE");
        assignment.setPriority(req.getPriority() != null ? req.getPriority() : com.roadvision.enums.Priority.NORMAL);
        assignment.setNotes(req.getInstructions() != null ? req.getInstructions() : req.getWorkPlan());
        assignment.setAssignedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);
        incident.setAssignment(assignment);

        notificationService.notifyStaff(
            "Nhiệm vụ thi công mới: " + incident.getTicketCode(),
            "Tổ [" + team.getName() + "] được giao thi công sửa chữa sự cố tại: " + incident.getAddress(),
            "URGENT",
            incident
        );
        if (incident.getCitizen() != null) {
            notificationService.notifyUser(
                incident.getCitizen().getId(),
                "Triển khai thi công: " + incident.getTicketCode(),
                "Sự cố mặt đường của bạn đã được chuyển cho Tổ Thi công tiến hành xử lý.",
                "INFO",
                incident
            );
        }

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * GIAI ĐOẠN 6: BẮT ĐẦU THI CÔNG
     */
    @Transactional
    public IncidentResponse startConstruction(Long incidentId, Long staffId) {
        Incident incident = getIncidentEntity(incidentId);
        if (incident.getStatus() != IncidentStatus.ASSIGNED && incident.getStatus() != IncidentStatus.REWORK_REQUIRED) {
            throw new BadRequestException("Chỉ có thể bắt đầu thi công khi sự cố ở trạng thái ASSIGNED hoặc REWORK_REQUIRED");
        }
        incident.setStatus(IncidentStatus.IN_PROGRESS);
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * GIAI ĐOẠN 6: NỘP BẰNG CHỨNG THEO TỪNG GIAI ĐOẠN (BEFORE_WORK, PROGRESS, AFTER_WORK, REWORK)
     * Tự động quét AI thẩm định nếu nộp ảnh hoàn thành (AFTER_WORK hoặc REWORK)
     */
    @Transactional
    public EvidenceResponse uploadEvidence(Long incidentId, com.roadvision.enums.EvidenceStage stage, MultipartFile file, String notes, BigDecimal lat, BigDecimal lng, Long staffId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng đính kèm tệp ảnh chụp hiện trường");
        }
        if (file.getSize() > 15 * 1024 * 1024) {
            throw new BadRequestException("Tệp ảnh không được vượt quá dung lượng 15MB");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("image/")) {
            throw new BadRequestException("Tệp tải lên phải là hình ảnh (JPEG, PNG, WEBP)");
        }
        if (notes != null && !notes.isBlank() && notes.trim().length() < 5) {
            throw new BadRequestException("Ghi chú mô tả công việc phải có ít nhất 5 ký tự");
        }

        Incident incident = getIncidentEntity(incidentId);
        User uploader = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));

        String url = fileStorageService.storeFile(file, "evidences");

        IncidentEvidence ev = IncidentEvidence.builder()
                .incident(incident)
                .stage(stage)
                .imageUrl(url)
                .uploader(uploader)
                .notes(notes != null ? notes.trim() : null)
                .latitude(lat != null ? lat : incident.getLatitude())
                .longitude(lng != null ? lng : incident.getLongitude())
                .reworkIteration(incident.getReworkCount() != null ? incident.getReworkCount() : 0)
                .build();

        IncidentEvidence saved = incidentEvidenceRepository.save(ev);

        String aiStatus = null;
        String aiNotes = null;

        // Nếu là ảnh hoàn thành thi công (AFTER_WORK hoặc REWORK), tự động cập nhật Resolution và quét AI
        if (stage == com.roadvision.enums.EvidenceStage.AFTER_WORK || stage == com.roadvision.enums.EvidenceStage.REWORK) {
            Resolution resolution = incident.getResolution();
            if (resolution == null) {
                resolution = Resolution.builder()
                        .incident(incident)
                        .staff(uploader)
                        .proofImageUrl(url)
                        .notes(notes)
                        .resolvedAt(LocalDateTime.now())
                        .build();
            } else {
                resolution.setStaff(uploader);
                resolution.setProofImageUrl(url);
                if (notes != null && !notes.isBlank()) resolution.setNotes(notes);
                resolution.setResolvedAt(LocalDateTime.now());
            }

            verifyResolutionWithAi(resolution, incident, file);
            resolutionRepository.save(resolution);
            incident.setResolution(resolution);
            incidentRepository.save(incident);

            aiStatus = resolution.getAiVerificationStatus();
            aiNotes = resolution.getAiVerificationNotes();
        }

        return EvidenceResponse.builder()
                .id(saved.getId())
                .incidentId(incident.getId())
                .stage(saved.getStage())
                .imageUrl(saved.getImageUrl())
                .uploaderId(uploader.getId())
                .uploaderName(uploader.getFullName())
                .notes(saved.getNotes())
                .latitude(saved.getLatitude())
                .longitude(saved.getLongitude())
                .reworkIteration(saved.getReworkIteration())
                .aiVerificationStatus(aiStatus)
                .aiVerificationNotes(aiNotes)
                .createdAt(saved.getCreatedAt())
                .build();
    }

    /**
     * GIAI ĐOẠN 6: TỔ ĐỘI HOÀN TẤT VÀ NỘP HỒ SƠ CHỜ NGHIỆM THU
     * Gồm ảnh chụp hoàn thành sau thi công + ghi chú kết quả + AI YOLOv8 tự động thẩm định chất lượng
     */
    @Transactional
    public IncidentResponse submitForAcceptance(Long incidentId, MultipartFile file, String notes, BigDecimal lat, BigDecimal lng, Long staffId) {
        Incident incident = getIncidentEntity(incidentId);

        // 1. Kiểm tra trạng thái sự cố
        if (incident.getStatus() != IncidentStatus.IN_PROGRESS && incident.getStatus() != IncidentStatus.REWORK_REQUIRED) {
            throw new BadRequestException("Chỉ có thể nộp nghiệm thu khi công trình đang ở trạng thái Đang thi công (IN_PROGRESS) hoặc Cần sửa lại (REWORK_REQUIRED)");
        }

        // 2. Kiểm tra ảnh hoàn thành nghiệm thu (Bắt buộc)
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Bắt buộc phải tải lên ảnh chụp hiện trường sau khi thi công hoàn thành để AI thẩm định chất lượng");
        }
        if (file.getSize() > 15 * 1024 * 1024) {
            throw new BadRequestException("Dung lượng tệp ảnh nghiệm thu không được vượt quá 15MB");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("image/")) {
            throw new BadRequestException("Tệp tải lên phải là hình ảnh (JPEG, PNG, WEBP)");
        }

        // 3. Kiểm tra nội dung báo cáo nghiệm thu
        if (notes == null || notes.trim().length() < 15) {
            throw new BadRequestException("Báo cáo hoàn thành & ghi chú nghiệm thu phải chi tiết tối thiểu 15 ký tự (mô tả kết quả khắc phục, độ êm thuận...)");
        }

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));

        incident.setStatus(IncidentStatus.PENDING_ACCEPTANCE);

        String proofUrl = fileStorageService.storeFile(file, "proofs");

        // Lưu thêm vào bảng nhật ký bằng chứng (IncidentEvidence)
        com.roadvision.enums.EvidenceStage stage = (incident.getReworkCount() != null && incident.getReworkCount() > 0)
                ? com.roadvision.enums.EvidenceStage.REWORK
                : com.roadvision.enums.EvidenceStage.AFTER_WORK;

        IncidentEvidence ev = IncidentEvidence.builder()
                .incident(incident)
                .stage(stage)
                .imageUrl(proofUrl)
                .uploader(staff)
                .notes(notes.trim())
                .latitude(lat != null ? lat : incident.getLatitude())
                .longitude(lng != null ? lng : incident.getLongitude())
                .reworkIteration(incident.getReworkCount() != null ? incident.getReworkCount() : 0)
                .build();
        incidentEvidenceRepository.save(ev);

        Resolution resolution = incident.getResolution();
        if (resolution == null) {
            resolution = Resolution.builder()
                    .incident(incident)
                    .build();
        }
        resolution.setStaff(staff);
        resolution.setProofImageUrl(proofUrl);
        resolution.setNotes(notes.trim());
        resolution.setResolvedAt(LocalDateTime.now());

        // 🌟 CHẠY MÔ HÌNH AI YOLOV8 QUÉT THẨM ĐỊNH ẢNH HOÀN THÀNH
        verifyResolutionWithAi(resolution, incident, file);

        resolutionRepository.save(resolution);
        incident.setResolution(resolution);

        notificationService.notifyAdmins(
            "Hồ sơ nghiệm thu mới: " + incident.getTicketCode(),
            "Tổ thi công đã nộp hồ sơ hoàn thành (kèm ảnh và kết quả quét AI). Đang chờ Admin duyệt nghiệm thu.",
            "INFO",
            incident
        );

        return mapToResponse(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse submitForAcceptance(Long incidentId, String notes, Long staffId) {
        return submitForAcceptance(incidentId, null, notes, null, null, staffId);
    }

    /**
     * Helper: Dùng mô hình AI YOLOv8 để quét ảnh hiện trường sau thi công
     * Đánh giá xem còn tồn tại vết nứt, ổ gà, lún nứt nào không
     */
    private void verifyResolutionWithAi(Resolution resolution, Incident incident, MultipartFile file) {
        if (file == null || file.isEmpty()) return;
        try {
            byte[] proofBytes = file.getBytes();
            List<ImageTensorUtil.BoundingBox> proofBoxes = aiInferenceService.runInferenceList(
                    new java.io.ByteArrayInputStream(proofBytes), 0.22f);

            if (!proofBoxes.isEmpty()) {
                resolution.setAiVerificationStatus("AI_WARNING_DEFECT_REMAINS");
                float maxConf = 0.0f;
                for (ImageTensorUtil.BoundingBox b : proofBoxes) {
                    if (b.getConfidence() > maxConf) maxConf = b.getConfidence();
                }
                resolution.setAiVerificationConfidence(BigDecimal.valueOf(maxConf));
                resolution.setAiVerificationDetectionsJson(objectMapper.writeValueAsString(proofBoxes));
                resolution.setAiVerificationNotes(String.format("Cảnh báo AI: Phát hiện %d vị trí hư hỏng còn sót lại sau thi công!", proofBoxes.size()));
                log.warn("Nghiệm thu sự cố #{} có cảnh báo từ AI: {}", incident.getTicketCode(), resolution.getAiVerificationNotes());
            } else {
                resolution.setAiVerificationStatus("AI_VERIFIED_CLEAN");
                resolution.setAiVerificationConfidence(BigDecimal.ZERO);
                resolution.setAiVerificationDetectionsJson("[]");
                resolution.setAiVerificationNotes("Nghiệm thu đạt chuẩn: AI quét ảnh sau thi công không phát hiện khuyết tật còn sót lại.");
                log.info("Nghiệm thu sự cố #{} đạt chuẩn qua thẩm định AI (0 khuyết tật sót lại)", incident.getTicketCode());
            }
        } catch (Exception e) {
            log.warn("Không thể chạy suy luận AI trên ảnh nghiệm thu: {}", e.getMessage());
            resolution.setAiVerificationStatus("MANUAL_VERIFIED");
            resolution.setAiVerificationNotes("Nghiệm thu thủ công (Không thể khởi chạy AI thẩm định: " + e.getMessage() + ")");
        }
    }

    /**
     * GIAI ĐOẠN 7: ADMIN THẨM ĐỊNH NGHIỆM THU (ĐẠT -> CLOSED, KHÔNG ĐẠT -> REWORK_REQUIRED)
     */
    @Transactional
    public IncidentResponse reviewAcceptance(Long incidentId, AcceptanceReviewRequest req, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);
        if (req.getApproved() != null && req.getApproved()) {
            incident.setStatus(IncidentStatus.CLOSED);
            incident.setClosedAt(LocalDateTime.now());
            incident.setResolvedAt(LocalDateTime.now());
        } else {
            if (req.getReworkReason() == null || req.getReworkReason().trim().length() < 10) {
                throw new BadRequestException("Bắt buộc ghi rõ lý do cụ thể (tối thiểu 10 ký tự) khi nghiệm thu không đạt yêu cầu");
            }
            incident.setStatus(IncidentStatus.REWORK_REQUIRED);
            incident.setReworkReason(req.getReworkReason().trim());
            incident.setReworkCount(incident.getReworkCount() != null ? incident.getReworkCount() + 1 : 1);
        }

        Incident savedIncident = incidentRepository.save(incident);
        if (req.getApproved() != null && req.getApproved()) {
            if (savedIncident.getCitizen() != null) {
                notificationService.notifyUser(
                    savedIncident.getCitizen().getId(),
                    "Nghiệm thu hoàn tất: " + savedIncident.getTicketCode(),
                    "Sự cố mặt đường bạn phản ánh đã được nghiệm thu sửa chữa đạt chuẩn và đóng hồ sơ thành công.",
                    "SUCCESS",
                    savedIncident
                );
            }
            notificationService.notifyStaff(
                "Nghiệm thu được duyệt: " + savedIncident.getTicketCode(),
                "Hồ sơ thi công " + savedIncident.getTicketCode() + " đã được Quản trị viên duyệt nghiệm thu đạt chuẩn.",
                "SUCCESS",
                savedIncident
            );
        } else {
            notificationService.notifyStaff(
                "Yêu cầu sửa lại (Rework): " + savedIncident.getTicketCode(),
                "Hồ sơ nghiệm thu " + savedIncident.getTicketCode() + " chưa đạt yêu cầu. Lý do: " + req.getReworkReason(),
                "URGENT",
                savedIncident
            );
        }

        return mapToResponse(savedIncident);
    }

    /**
     * PHA 1.8: KIỂM TRA TRÙNG LẶP KHÔNG GIAN (SPATIAL DEDUPLICATION)
     * Tìm kiếm sự cố đang mở trong bán kính r (mặc định 25 mét) bằng giải thuật Haversine
     */
    @Transactional(readOnly = true)
    public NearbyIncidentCheckResponse checkNearbyDuplicate(BigDecimal lat, BigDecimal lng, Category category, Double radiusMeters) {
        if (lat == null || lng == null) {
            return NearbyIncidentCheckResponse.builder().hasNearbyDuplicate(false).build();
        }

        double radius = (radiusMeters != null && radiusMeters > 0) ? radiusMeters : 25.0;

        // Bounding box xấp xỉ 1.5 lần bán kính để tối ưu hóa truy vấn SQL
        double deltaLat = (radius * 1.5) / 111000.0;
        double deltaLng = (radius * 1.5) / (111000.0 * Math.max(0.1, Math.cos(Math.toRadians(lat.doubleValue()))));

        BigDecimal minLat = BigDecimal.valueOf(lat.doubleValue() - deltaLat);
        BigDecimal maxLat = BigDecimal.valueOf(lat.doubleValue() + deltaLat);
        BigDecimal minLng = BigDecimal.valueOf(lng.doubleValue() - deltaLng);
        BigDecimal maxLng = BigDecimal.valueOf(lng.doubleValue() + deltaLng);

        List<Incident> candidates = incidentRepository.findActiveInGeoBox(minLat, maxLat, minLng, maxLng);

        Incident closestMatch = null;
        double minDistance = Double.MAX_VALUE;

        for (Incident cand : candidates) {
            double dist = GeoUtil.distanceInMeters(
                    lat.doubleValue(), lng.doubleValue(),
                    cand.getLatitude().doubleValue(), cand.getLongitude().doubleValue()
            );

            if (dist <= radius) {
                // Kiểm tra tương đồng loại hư hại
                boolean categoryMatches = (category == null)
                        || category == Category.COMPLEX_DAMAGE
                        || cand.getCategory() == Category.COMPLEX_DAMAGE
                        || cand.getCategory() == category;

                if (categoryMatches && dist < minDistance) {
                    minDistance = dist;
                    closestMatch = cand;
                }
            }
        }

        if (closestMatch != null) {
            return NearbyIncidentCheckResponse.builder()
                    .hasNearbyDuplicate(true)
                    .distanceMeters(Math.round(minDistance * 10.0) / 10.0)
                    .existingIncident(mapToResponse(closestMatch))
                    .message(String.format("Đã phát hiện sự cố tương tự cách vị trí của bạn %.1f mét", minDistance))
                    .build();
        }

        return NearbyIncidentCheckResponse.builder()
                .hasNearbyDuplicate(false)
                .build();
    }

    /**
     * PHA 1.9: ĐỒNG TÌNH VỚI SỰ CỐ ĐÃ CÓ (COMMUNITY UPVOTE)
     * Chống trùng lặp, tăng biến đếm upvote và tự động leo thang ưu tiên nếu nhiều người cùng báo
     */
    @Transactional
    public IncidentResponse upvoteIncident(Long incidentId, Long userId) {
        Incident incident = getIncidentEntity(incidentId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin người dùng với ID: " + userId));

        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_STAFF) {
            throw new BadRequestException("Chức năng đồng tình phản ánh chỉ dành cho người dân");
        }

        boolean alreadyUpvoted = incidentUpvoteRepository.existsByIncidentIdAndUserId(incidentId, userId);
        if (alreadyUpvoted) {
            throw new BadRequestException("Bạn đã bấm đồng tình với phản ánh này trước đó rồi!");
        }

        incidentUpvoteRepository.save(IncidentUpvote.builder()
                .incident(incident)
                .user(user)
                .build());

        int currentUpvotes = (incident.getUpvoteCount() != null ? incident.getUpvoteCount() : 1) + 1;
        incident.setUpvoteCount(currentUpvotes);

        // Tự động leo thang độ ưu tiên và mức độ nghiêm trọng theo phản ánh đám đông:
        // >= 5 lượt upvote: Khẩn cấp (CRITICAL)
        // >= 3 lượt upvote: Cao (HIGH)
        if (currentUpvotes >= 5) {
            incident.setSeverity(Severity.CRITICAL);
            if (incident.getAssignment() != null) {
                incident.getAssignment().setPriority(com.roadvision.enums.Priority.CRITICAL);
            }
            log.info("Sự cố #{} tự động leo thang lên mức CRITICAL do có {} lượt đồng tình",
                    incident.getTicketCode(), currentUpvotes);
        } else if (currentUpvotes >= 3) {
            if (incident.getSeverity() == Severity.LOW || incident.getSeverity() == Severity.MEDIUM) {
                incident.setSeverity(Severity.HIGH);
            }
            if (incident.getAssignment() != null && incident.getAssignment().getPriority() == com.roadvision.enums.Priority.NORMAL) {
                incident.getAssignment().setPriority(com.roadvision.enums.Priority.HIGH);
            }
            log.info("Sự cố #{} tự động leo thang lên mức HIGH do có {} lượt đồng tình",
                    incident.getTicketCode(), currentUpvotes);
        }

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * BÁO CÁO & PHÂN TÍCH KPI TỔNG THỂ CHO QUẢN TRỊ VIÊN (ADMIN CONTROL CENTER & ANALYTICS)
     */
    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAdminAnalytics(String timeframe, String district) {
        List<Incident> allIncidents = incidentRepository.findAll();

        if (district != null && !district.isBlank() && !"ALL".equalsIgnoreCase(district)) {
            allIncidents = allIncidents.stream()
                    .filter(i -> {
                        if (district.equalsIgnoreCase(i.getRouteCorridor())) {
                            return true;
                        }
                        if (i.getAddress() == null) return false;
                        String addr = i.getAddress().toLowerCase();
                        if ("KHU_1".equalsIgnoreCase(district)) {
                            return "KHU_1".equalsIgnoreCase(i.getRouteCorridor()) || addr.contains("hà nội") || addr.contains("hải phòng") || addr.contains("hà nam") || addr.contains("quảng ninh") || addr.contains("bắc ninh");
                        } else if ("KHU_2".equalsIgnoreCase(district)) {
                            return "KHU_2".equalsIgnoreCase(i.getRouteCorridor()) || addr.contains("thanh hóa") || addr.contains("nghệ an") || addr.contains("hà tĩnh") || addr.contains("huế");
                        } else if ("KHU_3".equalsIgnoreCase(district)) {
                            return "KHU_3".equalsIgnoreCase(i.getRouteCorridor()) || addr.contains("đà nẵng") || addr.contains("quảng nam") || addr.contains("bình định") || addr.contains("khánh hòa") || addr.contains("đắk lắk");
                        } else if ("KHU_4".equalsIgnoreCase(district)) {
                            return "KHU_4".equalsIgnoreCase(i.getRouteCorridor()) || addr.contains("hồ chí minh") || addr.contains("hcm") || addr.contains("cần thơ") || addr.contains("bình dương") || addr.contains("đồng nai");
                        } else if ("QL1A".equalsIgnoreCase(district)) {
                            return addr.contains("ql1a") || addr.contains("quốc lộ 1") || addr.contains("tránh") || addr.contains("thanh liêm") || addr.contains("phủ lý");
                        } else if ("QL21".equalsIgnoreCase(district)) {
                            return addr.contains("ql21") || addr.contains("21") || addr.contains("494") || addr.contains("kim bảng");
                        }
                        return addr.contains(district.toLowerCase());
                    })
                    .toList();
        }

        long total = allIncidents.size();
        long triagePending = allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.SUBMITTED || i.getStatus() == IncidentStatus.AI_ANALYZED || i.getStatus() == IncidentStatus.VERIFIED || "NEEDS_MANUAL_REVIEW".equals(i.getFlag()))
                .count();
        long inProgress = allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.IN_PROGRESS || i.getStatus() == IncidentStatus.ASSIGNED || i.getStatus() == IncidentStatus.PENDING_INSPECTION)
                .count();
        long resolved = allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.RESOLVED || i.getStatus() == IncidentStatus.CLOSED)
                .count();

        double clearanceRate = total > 0 ? ((double) resolved * 100.0 / total) : 100.0;
        clearanceRate = Math.round(clearanceRate * 10.0) / 10.0;

        int activeCrews = (int) allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.IN_PROGRESS && i.getAssignment() != null && i.getAssignment().getAssignedToStaff() != null)
                .map(i -> i.getAssignment().getAssignedToStaff().getId())
                .distinct()
                .count();
        if (activeCrews == 0) {
            activeCrews = Math.max(1, userRepository.findByRole(Role.ROLE_STAFF).size());
        }

        double totalResolutionHours = 0;
        int resolvedCountWithTime = 0;
        for (Incident i : allIncidents) {
            if ((i.getStatus() == IncidentStatus.RESOLVED || i.getStatus() == IncidentStatus.CLOSED) && i.getResolution() != null && i.getResolution().getResolvedAt() != null) {
                java.time.Duration d = java.time.Duration.between(i.getCreatedAt(), i.getResolution().getResolvedAt());
                totalResolutionHours += (double) d.toMinutes() / 60.0;
                resolvedCountWithTime++;
            }
        }
        double meanResolutionHours = resolvedCountWithTime > 0
                ? Math.round((totalResolutionHours / resolvedCountWithTime) * 10.0) / 10.0
                : 0.0;

        java.util.Map<String, Long> categoryCounts = new java.util.LinkedHashMap<>();
        for (Category c : Category.values()) {
            categoryCounts.put(c.name(), 0L);
        }
        for (Incident i : allIncidents) {
            String cname = i.getCategory() != null ? i.getCategory().name() : Category.POTHOLE.name();
            categoryCounts.put(cname, categoryCounts.getOrDefault(cname, 0L) + 1);
        }

        java.util.Map<String, Double> categoryPercentages = new java.util.LinkedHashMap<>();
        for (java.util.Map.Entry<String, Long> entry : categoryCounts.entrySet()) {
            double pct = total > 0 ? ((double) entry.getValue() * 100.0 / total) : 0.0;
            categoryPercentages.put(entry.getKey(), Math.round(pct * 10.0) / 10.0);
        }

        java.util.Map<String, Long> statusCounts = new java.util.LinkedHashMap<>();
        for (IncidentStatus s : IncidentStatus.values()) {
            statusCounts.put(s.name(), 0L);
        }
        for (Incident i : allIncidents) {
            String sname = i.getStatus() != null ? i.getStatus().name() : IncidentStatus.SUBMITTED.name();
            statusCounts.put(sname, statusCounts.getOrDefault(sname, 0L) + 1);
        }

        double totalConfidence = 0;
        long totalLatency = 0;
        int aiCount = 0;
        for (Incident i : allIncidents) {
            if (i.getAiDetection() != null && i.getAiDetection().getConfidence() != null) {
                totalConfidence += i.getAiDetection().getConfidence().doubleValue();
                if (i.getAiDetection().getInferenceMs() != null) {
                    totalLatency += i.getAiDetection().getInferenceMs();
                }
                aiCount++;
            }
        }
        double aiAccuracy = aiCount > 0 ? (totalConfidence / aiCount) * 100.0 : 0.0;
        long avgLatency = aiCount > 0 ? Math.max(1, totalLatency / aiCount) : 0L;

        // Tính tốc độ tăng trưởng thực tế so với chu kỳ trước
        int days = "today".equalsIgnoreCase(timeframe) ? 1 : "7d".equalsIgnoreCase(timeframe) ? 7 : 30;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentPeriodStart = now.minusDays(days);
        LocalDateTime previousPeriodStart = currentPeriodStart.minusDays(days);

        long currentPeriodCount = allIncidents.stream()
                .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isAfter(currentPeriodStart))
                .count();
        long previousPeriodCount = allIncidents.stream()
                .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isAfter(previousPeriodStart) && i.getCreatedAt().isBefore(currentPeriodStart))
                .count();

        double totalGrowthPercent;
        if (previousPeriodCount == 0) {
            totalGrowthPercent = currentPeriodCount > 0 ? 100.0 : 0.0;
        } else {
            totalGrowthPercent = Math.round(((double)(currentPeriodCount - previousPeriodCount) * 100.0 / previousPeriodCount) * 10.0) / 10.0;
        }

        // Luồng viễn trắc phân bổ theo khung giờ thực tế dựa trên createdAt của sự cố
        java.util.List<AdminAnalyticsResponse.StreamPoint> streamPoints = new java.util.ArrayList<>();
        String[] timeLabels = {"00:00", "04:00", "08:00 (Cao Điểm)", "12:00", "16:00 (Tan Tầm)", "20:00", "Hiện Tại"};
        int[][] hourRanges = {{0, 3}, {4, 7}, {8, 11}, {12, 15}, {16, 19}, {20, 23}, {now.getHour(), now.getHour()}};

        for (int idx = 0; idx < timeLabels.length; idx++) {
            final int startH = hourRanges[idx][0];
            final int endH = hourRanges[idx][1];
            long aiCountInSlot = allIncidents.stream()
                    .filter(i -> i.getCreatedAt() != null)
                    .filter(i -> {
                        int h = i.getCreatedAt().getHour();
                        return h >= startH && h <= endH;
                    })
                    .filter(i -> (i.getTitle() != null && i.getTitle().startsWith("[Tuần Tra AI]"))
                            || (i.getAiDetection() != null && i.getAiDetection().getConfidence() != null && i.getAiDetection().getConfidence().doubleValue() >= 0.20))
                    .count();

            long citCountInSlot = allIncidents.stream()
                    .filter(i -> i.getCreatedAt() != null)
                    .filter(i -> {
                        int h = i.getCreatedAt().getHour();
                        return h >= startH && h <= endH;
                    })
                    .filter(i -> i.getTitle() == null || !i.getTitle().startsWith("[Tuần Tra AI]"))
                    .count();

            streamPoints.add(new AdminAnalyticsResponse.StreamPoint(timeLabels[idx], aiCountInSlot, citCountInSlot));
        }

        java.util.List<IncidentResponse> urgent = allIncidents.stream()
                .filter(i -> "DISPUTED".equals(i.getFlag()) || "NEEDS_MANUAL_REVIEW".equals(i.getFlag()) || i.getStatus() == IncidentStatus.SUBMITTED)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(10)
                .map(this::mapToResponse)
                .toList();

        String aiModelVersion = aiInferenceService.isModelLoaded()
                ? "YOLOv8-RoadCare v2.4 Active"
                : "YOLOv8-RoadCare Standby";

        return AdminAnalyticsResponse.builder()
                .totalIncidents(total)
                .totalGrowthPercent(totalGrowthPercent)
                .triagePendingCount(triagePending)
                .inProgressCount(inProgress)
                .activeCrewsCount(activeCrews)
                .resolvedCount(resolved)
                .clearanceRatePercent(clearanceRate)
                .aiAccuracyPercent(Math.round(aiAccuracy * 10.0) / 10.0)
                .aiModelVersion(aiModelVersion)
                .avgInferenceLatencyMs(avgLatency)
                .meanResolutionHours(meanResolutionHours)
                .categoryCounts(categoryCounts)
                .categoryPercentages(categoryPercentages)
                .statusCounts(statusCounts)
                .telemetricStream(streamPoints)
                .urgentIncidents(urgent)
                .build();
    }

    /**
     * SỐ LIỆU THỐNG KÊ CÔNG KHAI (PUBLIC STATS) PHỤC VỤ TRANG CHỦ & BẢN ĐỒ
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getPublicStats() {
        java.util.Map<String, Object> stats = new java.util.LinkedHashMap<>();
        List<Incident> all = incidentRepository.findAll();
        long total = all.size();

        long inProgress = all.stream()
                .filter(i -> i.getStatus() == IncidentStatus.IN_PROGRESS || i.getStatus() == IncidentStatus.ASSIGNED || i.getStatus() == IncidentStatus.PENDING_INSPECTION)
                .count();

        long resolved = all.stream()
                .filter(i -> i.getStatus() == IncidentStatus.RESOLVED || i.getStatus() == IncidentStatus.CLOSED)
                .count();

        double clearanceRate = total > 0 ? (resolved * 100.0 / total) : 100.0;
        clearanceRate = Math.round(clearanceRate * 10.0) / 10.0;

        int activeCrews = (int) all.stream()
                .filter(i -> i.getStatus() == IncidentStatus.IN_PROGRESS && i.getAssignment() != null && i.getAssignment().getAssignedToStaff() != null)
                .map(i -> i.getAssignment().getAssignedToStaff().getId())
                .distinct()
                .count();
        if (activeCrews == 0) {
            activeCrews = Math.max(1, userRepository.findByRole(Role.ROLE_STAFF).size());
        }

        double totalResolutionHours = 0;
        int resolvedCountWithTime = 0;
        for (Incident i : all) {
            if ((i.getStatus() == IncidentStatus.RESOLVED || i.getStatus() == IncidentStatus.CLOSED)
                    && i.getResolution() != null && i.getResolution().getResolvedAt() != null && i.getCreatedAt() != null) {
                java.time.Duration d = java.time.Duration.between(i.getCreatedAt(), i.getResolution().getResolvedAt());
                totalResolutionHours += (double) d.toMinutes() / 60.0;
                resolvedCountWithTime++;
            }
        }
        String meanSpeed;
        if (resolvedCountWithTime > 0) {
            double avgHours = Math.round((totalResolutionHours / resolvedCountWithTime) * 10.0) / 10.0;
            meanSpeed = avgHours + " Giờ";
        } else {
            meanSpeed = total > 0 ? "< 4.0 Giờ" : "0.0 Giờ";
        }

        double totalConfidence = 0;
        int aiCount = 0;
        for (Incident i : all) {
            if (i.getAiDetection() != null && i.getAiDetection().getConfidence() != null) {
                totalConfidence += i.getAiDetection().getConfidence().doubleValue();
                aiCount++;
            }
        }
        String aiConfStr = aiCount > 0
                ? String.format(java.util.Locale.US, "%.1f%%", (totalConfidence / aiCount) * 100.0)
                : "0.0%";

        stats.put("totalIncidents", total);
        stats.put("inProgressCount", inProgress);
        stats.put("resolvedCount", resolved);
        stats.put("clearanceRatePercent", clearanceRate);
        stats.put("activeDispatches", activeCrews);
        stats.put("meanResolutionSpeed", meanSpeed);
        stats.put("aiConfidenceMedian", aiConfStr);
        stats.put("activeVisionModel", aiInferenceService.isModelLoaded() ? "YOLOv8-RoadCare v2.4 Active" : "YOLOv8-RoadCare Standby");
        return stats;
    }
}
