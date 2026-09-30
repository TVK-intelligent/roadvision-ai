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

    Page<Incident> findByCitizenId(Long citizenId, Pageable pageable);

    @Query("SELECT i FROM Incident i JOIN i.assignment a WHERE a.assignedToStaff.id = :staffId")
    Page<Incident> findByAssignedStaffId(@Param("staffId") Long staffId, Pageable pageable);

    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);

    Page<Incident> findByCategory(Category category, Pageable pageable);

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
