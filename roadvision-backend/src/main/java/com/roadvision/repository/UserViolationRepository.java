package com.roadvision.repository;

import com.roadvision.entity.UserViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserViolationRepository extends JpaRepository<UserViolation, Long> {

    List<UserViolation> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndIsRevokedFalse(Long userId);
}
