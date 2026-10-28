package com.roadvision.controller;

import com.roadvision.dto.NotificationDTO;
import com.roadvision.entity.User;
import com.roadvision.repository.UserRepository;
import com.roadvision.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Hệ thống chuông thông báo Real-time cho người dùng")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của tài khoản hiện tại")
    public ResponseEntity<Page<NotificationDTO>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Authentication auth) {
        User user = getAuthenticatedUser(auth);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Page<NotificationDTO> result = notificationService.getNotifications(
                user.getId(),
                user.getRole().name(),
                page,
                size
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số lượng thông báo chưa đọc")
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        if (user == null) {
            return ResponseEntity.ok(Map.of("unreadCount", 0));
        }
        long count = notificationService.getUnreadCount(user.getId(), user.getRole().name());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo là đã đọc")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    @Operation(summary = "Đánh dấu tất cả thông báo là đã đọc")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        if (user != null) {
            notificationService.markAllAsRead(user.getId(), user.getRole().name());
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/broadcast-emergency")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin phát lệnh báo động khẩn cấp điều động kỹ thuật viên (ROLE_STAFF)")
    public ResponseEntity<NotificationDTO> broadcastEmergency(
            @RequestBody(required = false) Map<String, Object> body) {
        boolean active = true;
        String title = null;
        String message = null;
        if (body != null) {
            if (body.get("active") != null) {
                active = Boolean.parseBoolean(String.valueOf(body.get("active")));
            }
            if (body.get("title") != null) title = String.valueOf(body.get("title"));
            if (body.get("message") != null) message = String.valueOf(body.get("message"));
        }
        return ResponseEntity.ok(notificationService.broadcastEmergency(title, message, active));
    }

    @GetMapping("/emergency-status")
    @Operation(summary = "Lấy trạng thái cảnh báo khẩn cấp hiện tại của hệ thống")
    public ResponseEntity<Map<String, Object>> getEmergencyStatus() {
        return ResponseEntity.ok(notificationService.getEmergencyStatus());
    }
}
