package com.roadvision.repository;

import com.roadvision.entity.IncidentEvidence;
import com.roadvision.enums.EvidenceStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentEvidenceRepository extends JpaRepository<IncidentEvidence, Long> {
    List<IncidentEvidence> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);
    List<IncidentEvidence> findByIncidentIdAndStageOrderByCreatedAtAsc(Long incidentId, EvidenceStage stage);
    List<IncidentEvidence> findByUploaderId(Long uploaderId);
}
