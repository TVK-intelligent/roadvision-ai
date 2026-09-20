package com.roadvision.repository;

import com.roadvision.entity.AiDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiDetectionRepository extends JpaRepository<AiDetection, Long> {
    Optional<AiDetection> findByIncidentId(Long incidentId);

    @org.springframework.data.jpa.repository.Query("SELECT AVG(d.confidence) FROM AiDetection d WHERE d.confidence > 0")
    Double findAverageConfidence();
}
