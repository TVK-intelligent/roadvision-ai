package com.roadvision.repository;

import com.roadvision.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n WHERE " +
           "(n.targetUserId = :userId) OR " +
           "(n.targetUserId IS NULL AND (n.targetRole = :role OR n.targetRole = 'ALL')) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findForUser(@Param("userId") Long userId, @Param("role") String role, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Notification n WHERE " +
           "n.isRead = false AND " +
           "((n.targetUserId = :userId) OR " +
           "(n.targetUserId IS NULL AND (n.targetRole = :role OR n.targetRole = 'ALL')))")
    long countUnreadForUser(@Param("userId") Long userId, @Param("role") String role);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE " +
           "(n.targetUserId = :userId) OR " +
           "(n.targetUserId IS NULL AND (n.targetRole = :role OR n.targetRole = 'ALL'))")
    void markAllAsReadForUser(@Param("userId") Long userId, @Param("role") String role);
}
