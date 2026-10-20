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
}
