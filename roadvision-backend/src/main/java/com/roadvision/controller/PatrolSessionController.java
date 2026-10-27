package com.roadvision.controller;

import com.roadvision.dto.PatrolSessionCreateRequest;
import com.roadvision.dto.PatrolSessionResponse;
import com.roadvision.enums.PatrolStatus;
import com.roadvision.security.JwtTokenProvider;
import com.roadvision.service.PatrolSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/patrol-sessions")
@RequiredArgsConstructor
@Tag(name = "Patrol Session Management", description = "Quản lý phiên tuần tra đường bộ chuyên biệt bằng AI dành cho Nhân viên tuần tra & Cán bộ điều phối")
public class PatrolSessionController {

    private final PatrolSessionService patrolSessionService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Tạo phiên tuần tra mới từ kết quả AI video, tự động tạo hồ sơ sự cố tổng hợp và kiểm tra chống trùng lặp")
    public ResponseEntity<PatrolSessionResponse> createSession(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("routeName") String routeName,
            @RequestParam(value = "startTime", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(value = "totalDistanceKm", required = false) Double totalDistanceKm,
            @RequestParam(value = "totalPotholesDetected", required = false) Integer totalPotholesDetected,
            @RequestParam(value = "routeHealthRating", required = false) String routeHealthRating,
            @RequestParam(value = "videoName", required = false) String videoName,
            @RequestParam(value = "startLatitude", required = false) BigDecimal startLatitude,
            @RequestParam(value = "startLongitude", required = false) BigDecimal startLongitude,
            @RequestParam(value = "endLatitude", required = false) BigDecimal endLatitude,
            @RequestParam(value = "endLongitude", required = false) BigDecimal endLongitude,
            @RequestParam(value = "gpsPathJson", required = false) String gpsPathJson,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "keyframe1", required = false) MultipartFile keyframe1,
            @RequestParam(value = "keyframe2", required = false) MultipartFile keyframe2) {

        Long inspectorId = getUserIdFromHeader(authHeader);

        PatrolSessionCreateRequest request = PatrolSessionCreateRequest.builder()
                .routeName(routeName)
                .startTime(startTime)
                .endTime(endTime)
                .totalDistanceKm(totalDistanceKm)
                .totalPotholesDetected(totalPotholesDetected)
                .routeHealthRating(routeHealthRating)
                .videoName(videoName)
                .startLatitude(startLatitude)
                .startLongitude(startLongitude)
                .endLatitude(endLatitude)
                .endLongitude(endLongitude)
                .gpsPathJson(gpsPathJson)
                .notes(notes)
                .build();

        PatrolSessionResponse response = patrolSessionService.createSession(request, keyframe1, keyframe2, inspectorId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Lấy danh sách tất cả các phiên tuần tra (hỗ trợ phân trang, lọc trạng thái, tìm kiếm từ khóa)")
    public ResponseEntity<Page<PatrolSessionResponse>> getAllSessions(
            @RequestParam(value = "status", required = false) PatrolStatus status,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(patrolSessionService.getAllSessions(status, search, pageable));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Lấy danh sách các phiên tuần tra do chính nhân viên đang đăng nhập thực hiện")
    public ResponseEntity<Page<PatrolSessionResponse>> getMySessions(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        Long inspectorId = getUserIdFromHeader(authHeader);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(patrolSessionService.getMySessions(inspectorId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Operation(summary = "Xem chi tiết phiên tuần tra theo ID")
    public ResponseEntity<PatrolSessionResponse> getSessionById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(patrolSessionService.getSessionById(id));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cán bộ điều phối cập nhật trạng thái phiên tuần tra (REVIEWED, DISPATCHED, REJECTED)")
    public ResponseEntity<PatrolSessionResponse> updateStatus(
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        String notes = body.get("notes");
        if (statusStr == null || statusStr.isBlank()) {
            throw new IllegalArgumentException("Trạng thái mới không được để trống");
        }
        PatrolStatus newStatus = PatrolStatus.valueOf(statusStr.toUpperCase());
        return ResponseEntity.ok(patrolSessionService.updateStatus(id, newStatus, notes));
    }

    private Long getUserIdFromHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Header Authorization không hợp lệ");
        }
        String token = authHeader.substring(7);
        return jwtTokenProvider.extractUserId(token);
    }
}
