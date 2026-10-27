package com.roadvision.repository;

import com.roadvision.entity.Incident;
import com.roadvision.enums.Category;
import com.roadvision.enums.IncidentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Optional<Incident> findByTicketCode(String ticketCode);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.createdAt >= :since")
    long countIncidentsSince(@Param("since") LocalDateTime since);

    @Query("SELECT i.status, COUNT(i) FROM Incident i GROUP BY i.status")
    List<Object[]> countGroupedByStatus();

    boolean existsByImageSha256(String imageSha256);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.citizen.id = :citizenId AND i.createdAt >= :since")
    long countRecentReportsByCitizen(@Param("citizenId") Long citizenId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.citizen.id = :citizenId AND i.createdAt >= :since AND i.status = :status")
    long countRecentReportsByCitizenAndStatus(@Param("citizenId") Long citizenId, @Param("since") LocalDateTime since, @Param("status") IncidentStatus status);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.citizen.id = :citizenId AND i.status IN ('VERIFIED', 'RESOLVED', 'CLOSED')")
    long countVerifiedReportsByCitizen(@Param("citizenId") Long citizenId);

    Page<Incident> findByCitizenId(Long citizenId, Pageable pageable);

    @Query("SELECT DISTINCT i FROM Incident i " +
           "LEFT JOIN i.assignment a " +
           "LEFT JOIN i.inspection insp " +
           "LEFT JOIN i.inspectionTeam it " +
           "LEFT JOIN i.assignedTeam at " +
           "WHERE a.assignedToStaff.id = :staffId " +
           "   OR insp.inspector.id = :staffId " +
           "   OR (it.id IS NOT NULL AND it.id = (SELECT u.team.id FROM User u WHERE u.id = :staffId)) " +
           "   OR (at.id IS NOT NULL AND at.id = (SELECT u.team.id FROM User u WHERE u.id = :staffId))")
    Page<Incident> findByAssignedStaffId(@Param("staffId") Long staffId, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT i) FROM Incident i " +
           "LEFT JOIN i.assignment a " +
           "LEFT JOIN i.inspection insp " +
           "LEFT JOIN i.inspectionTeam it " +
           "LEFT JOIN i.assignedTeam at " +
           "WHERE (a.assignedToStaff.id = :staffId " +
           "       OR insp.inspector.id = :staffId " +
           "       OR (it.id IS NOT NULL AND it.id = (SELECT u.team.id FROM User u WHERE u.id = :staffId)) " +
           "       OR (at.id IS NOT NULL AND at.id = (SELECT u.team.id FROM User u WHERE u.id = :staffId))) " +
           "  AND i.status IN ('INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'PENDING_INSPECTION', 'REWORK_REQUIRED')")
    long countActiveTasksByStaffId(@Param("staffId") Long staffId);

    @Query("SELECT i FROM Incident i " +
           "WHERE (i.inspectionTeam.id = :teamId AND i.status IN ('INSPECTION_ASSIGNED', 'INSPECTING')) " +
           "   OR (i.assignedTeam.id = :teamId AND i.status IN ('ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED')) " +
           "ORDER BY i.updatedAt DESC")
    List<Incident> findActiveIncidentsByTeamId(@Param("teamId") Long teamId);

    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);

    Page<Incident> findByCategory(Category category, Pageable pageable);

    @Query("SELECT i FROM Incident i WHERE " +
           "(:statuses IS NULL OR i.status IN :statuses) AND " +
           "(:category IS NULL OR i.category = :category) AND " +
           "(:search IS NULL OR LOWER(i.ticketCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(i.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(i.address) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR (i.flag IS NOT NULL AND LOWER(i.flag) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "OR (i.reworkReason IS NOT NULL AND LOWER(i.reworkReason) LIKE LOWER(CONCAT('%', :search, '%'))))")
    Page<Incident> findWithStatuses(@Param("statuses") List<IncidentStatus> statuses,
                                   @Param("category") Category category,
                                   @Param("search") String search,
                                   Pageable pageable);

    @Query("SELECT i FROM Incident i WHERE " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:category IS NULL OR i.category = :category) AND " +
           "(:search IS NULL OR LOWER(i.ticketCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(i.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(i.address) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR (i.flag IS NOT NULL AND LOWER(i.flag) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "OR (i.reworkReason IS NOT NULL AND LOWER(i.reworkReason) LIKE LOWER(CONCAT('%', :search, '%'))))")
    Page<Incident> findWithFilters(@Param("status") IncidentStatus status,
                                  @Param("category") Category category,
                                  @Param("search") String search,
                                  Pageable pageable);

    List<Incident> findByStatusAndResolvedAtBefore(IncidentStatus status, LocalDateTime thresholdTime);

    @Query("SELECT i FROM Incident i WHERE " +
           "i.latitude BETWEEN :minLat AND :maxLat AND " +
           "i.longitude BETWEEN :minLng AND :maxLng AND " +
           "i.status IN ('SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS')")
    List<Incident> findActiveInGeoBox(@Param("minLat") java.math.BigDecimal minLat,
                                      @Param("maxLat") java.math.BigDecimal maxLat,
                                      @Param("minLng") java.math.BigDecimal minLng,
                                      @Param("maxLng") java.math.BigDecimal maxLng);
}
