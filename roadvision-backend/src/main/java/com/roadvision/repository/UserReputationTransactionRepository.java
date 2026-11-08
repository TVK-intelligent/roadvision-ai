package com.roadvision.repository;

import com.roadvision.entity.UserReputationTransaction;
import com.roadvision.enums.ReputationTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserReputationTransactionRepository extends JpaRepository<UserReputationTransaction, Long> {

    List<UserReputationTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndIncidentIdAndTransactionType(Long userId, Long incidentId, ReputationTransactionType transactionType);

    Optional<UserReputationTransaction> findByUserIdAndIncidentIdAndTransactionType(Long userId, Long incidentId, ReputationTransactionType transactionType);

    @Query("SELECT COALESCE(SUM(t.points), 0) FROM UserReputationTransaction t " +
           "WHERE t.user.id = :userId AND t.createdAt >= :startDate AND t.points > 0")
    Integer calculateMonthlyPoints(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT t.user.id as userId, t.user.fullName as fullName, t.user.avatarUrl as avatarUrl, " +
           "COALESCE(SUM(t.points), 0) as monthlyPoints, MAX(t.createdAt) as lastEarnedAt " +
           "FROM UserReputationTransaction t " +
           "WHERE t.createdAt >= :startDate AND t.points > 0 AND t.user.role = 'ROLE_CITIZEN' " +
           "GROUP BY t.user.id, t.user.fullName, t.user.avatarUrl " +
           "ORDER BY monthlyPoints DESC, lastEarnedAt ASC")
    List<Object[]> getMonthlyCitizenLeaderboard(@Param("startDate") LocalDateTime startDate);
}
