package com.roadvision.repository;

import com.roadvision.entity.IncidentUpvote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentUpvoteRepository extends JpaRepository<IncidentUpvote, Long> {

    boolean existsByIncidentIdAndUserId(Long incidentId, Long userId);

    Optional<IncidentUpvote> findByIncidentIdAndUserId(Long incidentId, Long userId);

    long countByIncidentId(Long incidentId);
}
