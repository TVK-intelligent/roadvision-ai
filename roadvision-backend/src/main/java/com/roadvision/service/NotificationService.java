package com.roadvision.service;

import com.roadvision.dto.NotificationDTO;
import com.roadvision.entity.Incident;
import com.roadvision.entity.Notification;
import com.roadvision.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Gửi thông báo đến Quản trị viên (ROLE_ADMIN)
     */
    @Transactional
    public void notifyAdmins(String title, String message, String type, Incident incident) {
        Notification noti = Notification.builder()
                .title(title)
                .message(message)
                .type(type)
                .incidentId(incident != null ? incident.getId() : null)
                .ticketCode(incident != null ? incident.getTicketCode() : null)
                .targetRole("ROLE_ADMIN")
                .targetUserId(null)
                .build();
        noti = notificationRepository.save(noti);

        NotificationDTO dto = toDTO(noti);
        try {
            messagingTemplate.convertAndSend("/topic/notifications/admin", dto);
            log.info("Đã gửi WebSocket thông báo đến Quản trị viên: {}", title);
        } catch (Exception e) {
            log.warn("Lỗi khi gửi WebSocket đến Admin: {}", e.getMessage());
        }
    }

    /**
     * Gửi thông báo đến toàn bộ Kỹ thuật viên (ROLE_STAFF)
     */
    @Transactional
    public void notifyStaff(String title, String message, String type, Incident incident) {
        Notification noti = Notification.builder()
                .title(title)
                .message(message)
                .type(type)
                .incidentId(incident != null ? incident.getId() : null)
                .ticketCode(incident != null ? incident.getTicketCode() : null)
                .targetRole("ROLE_STAFF")
                .targetUserId(null)
                .build();
        noti = notificationRepository.save(noti);

        NotificationDTO dto = toDTO(noti);
        try {
            messagingTemplate.convertAndSend("/topic/notifications/staff", dto);
            log.info("Đã gửi WebSocket thông báo đến Kỹ thuật viên: {}", title);
        } catch (Exception e) {
            log.warn("Lỗi khi gửi WebSocket đến Staff: {}", e.getMessage());
        }
    }

    /**
     * Gửi thông báo trực tiếp đến người dùng cụ thể (Người dân hoặc Kỹ thuật viên cụ thể)
     */
    @Transactional
    public void notifyUser(Long userId, String title, String message, String type, Incident incident) {
        if (userId == null) return;
        Notification noti = Notification.builder()
                .title(title)
                .message(message)
                .type(type)
                .incidentId(incident != null ? incident.getId() : null)
                .ticketCode(incident != null ? incident.getTicketCode() : null)
                .targetRole(null)
                .targetUserId(userId)
                .build();
        noti = notificationRepository.save(noti);

        NotificationDTO dto = toDTO(noti);
        try {
            messagingTemplate.convertAndSend("/topic/notifications/user/" + userId, dto);
            log.info("Đã gửi WebSocket thông báo đến User #{}: {}", userId, title);
        } catch (Exception e) {
            log.warn("Lỗi khi gửi WebSocket đến User #{}: {}", userId, e.getMessage());
        }
    }

    /**
     * Lấy danh sách thông báo cho người dùng
     */
    @Transactional(readOnly = true)
    public Page<NotificationDTO> getNotifications(Long userId, String role, int page, int size) {
        return notificationRepository.findForUser(userId, role, PageRequest.of(page, size))
                .map(this::toDTO);
    }

    /**
     * Đếm số thông báo chưa đọc
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, String role) {
        return notificationRepository.countUnreadForUser(userId, role);
    }

    /**
     * Đánh dấu 1 thông báo là đã đọc
     */
    @Transactional
    public void markAsRead(Long notiId) {
        notificationRepository.findById(notiId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc
     */
    @Transactional
    public void markAllAsRead(Long userId, String role) {
        notificationRepository.markAllAsReadForUser(userId, role);
    }

    private NotificationDTO toDTO(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .incidentId(n.getIncidentId())
                .ticketCode(n.getTicketCode())
                .targetRole(n.getTargetRole())
                .targetUserId(n.getTargetUserId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
