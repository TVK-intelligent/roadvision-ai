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
    private final FileStorageService fileStorageService;
    private final AiInferenceService aiInferenceService;
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

        // 2. Tìm thông tin Citizen
        User citizen = userRepository.findById(citizenId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + citizenId));

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
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .address(request.getAddress() != null ? request.getAddress() : "Khu vực đô thị")
                .routeCorridor(corridor.getCode())
                .zoneName(corridor.getName())
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
            byte[] imgBytes = image.getBytes();
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
                incident.setFlag("MULTI_DEFECT");
            } else {
                try {
                    incident.setCategory(Category.valueOf(detectionResult.getClassName()));
                } catch (Exception e) {
                    incident.setCategory(request.getCategory() != null ? request.getCategory() : Category.POTHOLE);
                }
            }
        } else {
            incident.setStatus(IncidentStatus.SUBMITTED);
            incident.setFlag("NEEDS_MANUAL_REVIEW");
            if (isUserMulti) {
                incident.setCategory(Category.COMPLEX_DAMAGE);
            } else {
                incident.setCategory(request.getCategory() != null ? request.getCategory() : Category.ROAD_OBSTACLE);
            }
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

        return mapToResponse(savedIncident);
    }

    /**
     * PHA 3: THẨM ĐỊNH VÀ PHÂN CÔNG KỸ THUẬT VIÊN (ADMIN)
     */
    @Transactional
    public IncidentResponse assignIncident(Long incidentId, AssignmentRequest request, Long adminId) {
        Incident incident = getIncidentEntity(incidentId);

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
        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 4: CẬP NHẬT TRẠNG THÁI TIẾN ĐỘ THI CÔNG (STAFF)
     */
    @Transactional
    public IncidentResponse updateStatus(Long incidentId, IncidentStatus newStatus, Long userId) {
        Incident incident = getIncidentEntity(incidentId);

        // Kiểm tra hợp lệ chuyển trạng thái (cho phép chuyển IN_PROGRESS từ ASSIGNED hoặc khi làm lại từ RESOLVED)
        if (newStatus == IncidentStatus.IN_PROGRESS && incident.getStatus() != IncidentStatus.ASSIGNED && incident.getStatus() != IncidentStatus.RESOLVED) {
            throw new BadRequestException("Chỉ có thể chuyển sang IN_PROGRESS từ trạng thái ASSIGNED hoặc RESOLVED");
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

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedAt(LocalDateTime.now());

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

        return mapToResponse(incidentRepository.save(incident));
    }

    /**
     * PHA 5: NGHIỆM THU, CHẤM ĐIỂM SAO VÀ ĐÓNG LUỒNG (CITIZEN / ADMIN)
     */
    @Transactional
    public IncidentResponse closeIncident(Long incidentId, FeedbackRequest request, Long userId, Role userRole) {
        Incident incident = getIncidentEntity(incidentId);

        // Chỉ công dân tạo phiếu hoặc Admin mới có quyền đóng
        if (userRole != Role.ROLE_ADMIN && !incident.getCitizen().getId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền đánh giá hoặc đóng sự cố này");
        }

        if (incident.getStatus() != IncidentStatus.RESOLVED) {
            throw new BadRequestException("Chỉ có thể đóng sự cố khi đã được kỹ thuật viên hoàn thành (RESOLVED)");
        }

        User citizen = incident.getCitizen();

        incident.setStatus(IncidentStatus.CLOSED);
        incident.setClosedAt(LocalDateTime.now());

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

        if (incident.getStatus() != IncidentStatus.RESOLVED) {
            throw new BadRequestException("Chỉ có thể khiếu nại khi sự cố đang ở trạng thái đã nghiệm thu (RESOLVED)");
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

        if (incident.getStatus() != IncidentStatus.RESOLVED && incident.getStatus() != IncidentStatus.IN_PROGRESS) {
            throw new BadRequestException("Chỉ có thể yêu cầu làm lại với sự cố đã nghiệm thu (RESOLVED) hoặc đang thi công");
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
                    .assignedByAdminName(i.getAssignment().getAssignedByAdmin().getFullName())
                    .assignedToStaffId(i.getAssignment().getAssignedToStaff().getId())
                    .assignedToStaffName(i.getAssignment().getAssignedToStaff().getFullName())
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
                    .staffName(i.getResolution().getStaff().getFullName())
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

        return builder.build();
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
                .filter(i -> i.getStatus() == IncidentStatus.SUBMITTED || "NEEDS_MANUAL_REVIEW".equals(i.getFlag()))
                .count();
        long inProgress = allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.IN_PROGRESS || i.getStatus() == IncidentStatus.ASSIGNED)
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
                .filter(i -> i.getStatus() == IncidentStatus.IN_PROGRESS || i.getStatus() == IncidentStatus.ASSIGNED)
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
