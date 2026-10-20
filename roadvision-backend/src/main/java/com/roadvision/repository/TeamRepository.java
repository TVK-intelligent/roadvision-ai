package com.roadvision.repository;

import com.roadvision.entity.Team;
import com.roadvision.enums.TeamType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByIsActiveTrue();

    List<Team> findByCorridor(String corridor);

    List<Team> findByTeamType(TeamType teamType);
}
