package com.roadvision.repository;

import com.roadvision.entity.IncidentInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentInspectionRepository extends JpaRepository<IncidentInspection, Long> {
    Optional<IncidentInspection> findByIncidentId(Long incidentId);
    List<IncidentInspection> findByInspectorId(Long inspectorId);
    List<IncidentInspection> findByInspectionTeamId(Long teamId);
}
