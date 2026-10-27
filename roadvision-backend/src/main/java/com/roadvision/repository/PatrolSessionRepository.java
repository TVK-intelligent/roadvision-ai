package com.roadvision.repository;

import com.roadvision.entity.PatrolSession;
import com.roadvision.enums.PatrolStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatrolSessionRepository extends JpaRepository<PatrolSession, Long> {

    Optional<PatrolSession> findBySessionCode(String sessionCode);

    Page<PatrolSession> findByInspectorIdOrderByCreatedAtDesc(Long inspectorId, Pageable pageable);

    Page<PatrolSession> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT p FROM PatrolSession p WHERE " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:search IS NULL OR LOWER(p.sessionCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.routeName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.inspector.fullName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<PatrolSession> findWithFilters(@Param("status") PatrolStatus status,
                                        @Param("search") String search,
                                        Pageable pageable);
}
