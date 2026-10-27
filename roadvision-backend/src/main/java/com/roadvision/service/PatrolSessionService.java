package com.roadvision.service;

import com.roadvision.dto.PatrolSessionCreateRequest;
import com.roadvision.dto.PatrolSessionResponse;
import com.roadvision.entity.Incident;
import com.roadvision.entity.PatrolSession;
import com.roadvision.entity.User;
import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import com.roadvision.enums.PatrolStatus;
import com.roadvision.enums.Severity;
import com.roadvision.exception.BadRequestException;
import com.roadvision.exception.ResourceNotFoundException;
import com.roadvision.repository.IncidentRepository;
import com.roadvision.repository.PatrolSessionRepository;
import com.roadvision.repository.UserRepository;
import com.roadvision.util.GeoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class PatrolSessionService {

    private final PatrolSessionRepository patrolSessionRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final Random random = new Random();

    @Transactional
    public PatrolSessionResponse createSession(PatrolSessionCreateRequest request,
                                               MultipartFile keyframe1,
                                               MultipartFile keyframe2,
                                               Long inspectorId) {
        User inspector = userRepository.findById(inspectorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhân viên tuần tra với ID: " + inspectorId));

        // 1. Lưu các ảnh Keyframe đại diện
        String url1 = null;
        String url2 = null;
        if (keyframe1 != null && !keyframe1.isEmpty()) {
            url1 = fileStorageService.storeFile(keyframe1, "patrols");
        }
        if (keyframe2 != null && !keyframe2.isEmpty()) {
            url2 = fileStorageService.storeFile(keyframe2, "patrols");
        }

        // 2. Tạo mã phiên tuần tra độc bản (PTR-YYYYMMDD-XXXX)
        String datePrefix = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sessionCode = "PTR-" + datePrefix + "-" + String.format("%04d", random.nextInt(10000));

        // 3. Cơ chế Chống trùng lặp (Deduplication) qua tính toán không gian GPS
        BigDecimal refLat = request.getStartLatitude() != null ? request.getStartLatitude() : new BigDecimal("10.762622");
        BigDecimal refLng = request.getStartLongitude() != null ? request.getStartLongitude() : new BigDecimal("106.660172");

        boolean hasDuplicate = false;
        Long dupIncidentId = null;
        String dupTicketCode = null;
        Double dupDistance = null;

        BigDecimal delta = new BigDecimal("0.005"); // Bán kính tương đương ~500m
        List<Incident> nearby = incidentRepository.findActiveInGeoBox(
                refLat.subtract(delta), refLat.add(delta),
                refLng.subtract(delta), refLng.add(delta)
        );

        for (Incident inc : nearby) {
            double d = GeoUtil.distanceInMeters(
                    refLat.doubleValue(), refLng.doubleValue(),
                    inc.getLatitude().doubleValue(), inc.getLongitude().doubleValue()
            );
            if (d <= 25.0) { // Trong bán kính 25m được xem là trùng lặp vị trí hư hỏng
                hasDuplicate = true;
                dupIncidentId = inc.getId();
                dupTicketCode = inc.getTicketCode();
                dupDistance = Math.round(d * 10.0) / 10.0;
                log.info("Phát hiện trùng lặp với phản ánh [{}] cách {:.1f}m", dupTicketCode, d);
                break;
            }
        }

        // 4. Tự động khởi tạo Hồ sơ Sự cố Tổng hợp (Unified Incident) để sẵn sàng điều phối
        String ticketCode = "RV-" + datePrefix + "-" + String.format("%04d", random.nextInt(10000));
        
        Severity sev = Severity.MEDIUM;
        if ("CRITICAL".equalsIgnoreCase(request.getRouteHealthRating())) {
            sev = Severity.CRITICAL;
        } else if ("HIGH".equalsIgnoreCase(request.getRouteHealthRating())) {
            sev = Severity.HIGH;
        }

        int potholeCount = request.getTotalPotholesDetected() != null ? request.getTotalPotholesDetected() : 0;
        Category cat = potholeCount >= 2 ? Category.COMPLEX_DAMAGE : Category.POTHOLE;

        String desc = String.format("Báo cáo tuần tra tự động qua camera AI hành trình. Tuyến: %s. " +
                        "Phát hiện %d vị trí hư hỏng. Đánh giá chất lượng tuyến: %s. Phiên tuần tra: %s.",
                request.getRouteName(), potholeCount,
                request.getRouteHealthRating() != null ? request.getRouteHealthRating() : "CHƯA_XÁC_ĐỊNH",
                sessionCode);
        if (hasDuplicate) {
            desc += String.format(" [Cảnh báo đối chiếu: Đã có phản ánh %s lân cận trong bán kính %.1fm]", dupTicketCode, dupDistance);
        }

        Incident unifiedIncident = Incident.builder()
                .ticketCode(ticketCode)
                .citizen(inspector)
                .title("[TUẦN TRA AI] Tuyến: " + request.getRouteName())
                .description(desc)
                .imageUrl(url1 != null ? url1 : (url2 != null ? url2 : "/uploads/patrols/default_patrol.jpg"))
                .latitude(refLat)
                .longitude(refLng)
                .originalLatitude(refLat)
                .originalLongitude(refLng)
                .gpsAccuracy(5.0)
                .address(request.getRouteName())
                .category(cat)
                .severity(sev)
                .status(IncidentStatus.SUBMITTED)
                .build();

        Incident savedIncident = incidentRepository.save(unifiedIncident);

        // 5. Lưu phiên tuần tra PatrolSession
        PatrolSession session = PatrolSession.builder()
                .sessionCode(sessionCode)
                .inspector(inspector)
                .routeName(request.getRouteName())
                .startTime(request.getStartTime() != null ? request.getStartTime() : LocalDateTime.now().minusMinutes(5))
                .endTime(request.getEndTime() != null ? request.getEndTime() : LocalDateTime.now())
                .totalDistanceKm(request.getTotalDistanceKm() != null ? request.getTotalDistanceKm() : 0.0)
                .totalPotholesDetected(potholeCount)
                .routeHealthRating(request.getRouteHealthRating() != null ? request.getRouteHealthRating() : "NORMAL")
                .videoName(request.getVideoName())
                .keyframeUrl1(url1)
                .keyframeUrl2(url2)
                .gpsPathJson(request.getGpsPathJson())
                .startLatitude(refLat)
                .startLongitude(refLng)
                .endLatitude(request.getEndLatitude() != null ? request.getEndLatitude() : refLat)
                .endLongitude(request.getEndLongitude() != null ? request.getEndLongitude() : refLng)
                .status(PatrolStatus.SUBMITTED)
                .notes(request.getNotes())
                .incident(savedIncident)
                .build();

        PatrolSession savedSession = patrolSessionRepository.save(session);

        return mapToResponse(savedSession, hasDuplicate, dupIncidentId, dupTicketCode, dupDistance);
    }

    @Transactional(readOnly = true)
    public Page<PatrolSessionResponse> getAllSessions(PatrolStatus status, String search, Pageable pageable) {
        Page<PatrolSession> page = patrolSessionRepository.findWithFilters(status, search, pageable);
        return page.map(s -> mapToResponse(s, false, null, null, null));
    }

    @Transactional(readOnly = true)
    public Page<PatrolSessionResponse> getMySessions(Long inspectorId, Pageable pageable) {
        Page<PatrolSession> page = patrolSessionRepository.findByInspectorIdOrderByCreatedAtDesc(inspectorId, pageable);
        return page.map(s -> mapToResponse(s, false, null, null, null));
    }

    @Transactional(readOnly = true)
    public PatrolSessionResponse getSessionById(Long id) {
        PatrolSession s = patrolSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên tuần tra với ID: " + id));
        return mapToResponse(s, false, null, null, null);
    }

    @Transactional
    public PatrolSessionResponse updateStatus(Long id, PatrolStatus newStatus, String notes) {
        PatrolSession s = patrolSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên tuần tra với ID: " + id));
        s.setStatus(newStatus);
        if (notes != null && !notes.isBlank()) {
            s.setNotes((s.getNotes() != null ? s.getNotes() + "\n" : "") + notes);
        }
        PatrolSession saved = patrolSessionRepository.save(s);
        return mapToResponse(saved, false, null, null, null);
    }

    private PatrolSessionResponse mapToResponse(PatrolSession s,
                                                Boolean hasDuplicate,
                                                Long dupIncidentId,
                                                String dupTicketCode,
                                                Double dupDistance) {
        return PatrolSessionResponse.builder()
                .id(s.getId())
                .sessionCode(s.getSessionCode())
                .inspectorId(s.getInspector() != null ? s.getInspector().getId() : null)
                .inspectorName(s.getInspector() != null ? s.getInspector().getFullName() : null)
                .inspectorEmail(s.getInspector() != null ? s.getInspector().getEmail() : null)
                .routeName(s.getRouteName())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .totalDistanceKm(s.getTotalDistanceKm())
                .totalPotholesDetected(s.getTotalPotholesDetected())
                .routeHealthRating(s.getRouteHealthRating())
                .videoName(s.getVideoName())
                .keyframeUrl1(s.getKeyframeUrl1())
                .keyframeUrl2(s.getKeyframeUrl2())
                .gpsPathJson(s.getGpsPathJson())
                .startLatitude(s.getStartLatitude())
                .startLongitude(s.getStartLongitude())
                .endLatitude(s.getEndLatitude())
                .endLongitude(s.getEndLongitude())
                .status(s.getStatus())
                .notes(s.getNotes())
                .incidentId(s.getIncident() != null ? s.getIncident().getId() : null)
                .incidentTicketCode(s.getIncident() != null ? s.getIncident().getTicketCode() : null)
                .hasNearbyDuplicate(hasDuplicate != null ? hasDuplicate : false)
                .duplicateIncidentId(dupIncidentId)
                .duplicateTicketCode(dupTicketCode)
                .duplicateDistanceMeters(dupDistance)
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
