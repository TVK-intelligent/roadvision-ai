package com.roadvision.service;

import com.roadvision.dto.*;
import com.roadvision.entity.Team;
import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import com.roadvision.enums.TeamType;
import com.roadvision.exception.BadRequestException;
import com.roadvision.exception.ResourceNotFoundException;
import com.roadvision.repository.IncidentRepository;
import com.roadvision.repository.TeamRepository;
import com.roadvision.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final PasswordEncoder passwordEncoder;

    // ==================== QUẢN LÝ TỔ ĐỘI (TEAMS) ====================

    @Transactional(readOnly = true)
    public List<TeamResponse> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(this::mapToTeamResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(Long id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội có ID: " + id));
        return mapToTeamResponse(team);
    }

    @Transactional
    public TeamResponse createTeam(TeamRequest request) {
        User leader = null;
        if (request.getLeaderId() != null) {
            leader = userRepository.findById(request.getLeaderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ trưởng có ID: " + request.getLeaderId()));
        }

        Team team = Team.builder()
                .name(request.getName().trim())
                .teamType(request.getTeamType())
                .corridor(request.getCorridor())
                .zoneName(request.getZoneName())
                .description(request.getDescription())
                .leader(leader)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        Team saved = teamRepository.save(team);

        // Nếu chỉ định tổ trưởng, gán luôn user đó vào team và bật cờ isTeamLeader
        if (leader != null) {
            leader.setTeam(saved);
            leader.setIsTeamLeader(true);
            userRepository.save(leader);
        }

        log.info("Tạo mới tổ đội thành công: {} (ID: {})", saved.getName(), saved.getId());
        return mapToTeamResponse(saved);
    }

    @Transactional
    public TeamResponse updateTeam(Long id, TeamRequest request) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội có ID: " + id));

        team.setName(request.getName().trim());
        team.setTeamType(request.getTeamType());
        team.setCorridor(request.getCorridor());
        team.setZoneName(request.getZoneName());
        team.setDescription(request.getDescription());
        if (request.getIsActive() != null) {
            team.setIsActive(request.getIsActive());
        }

        // Cập nhật tổ trưởng nếu có thay đổi
        if (request.getLeaderId() != null) {
            if (team.getLeader() == null || !team.getLeader().getId().equals(request.getLeaderId())) {
                // Hạ chức tổ trưởng cũ nếu có
                if (team.getLeader() != null) {
                    team.getLeader().setIsTeamLeader(false);
                    userRepository.save(team.getLeader());
                }

                User newLeader = userRepository.findById(request.getLeaderId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ trưởng có ID: " + request.getLeaderId()));
                newLeader.setTeam(team);
                newLeader.setIsTeamLeader(true);
                userRepository.save(newLeader);
                team.setLeader(newLeader);
            }
        } else if (team.getLeader() != null) {
            team.getLeader().setIsTeamLeader(false);
            userRepository.save(team.getLeader());
            team.setLeader(null);
        }

        Team updated = teamRepository.save(team);
        return mapToTeamResponse(updated);
    }

    @Transactional
    public void deleteTeam(Long id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội có ID: " + id));

        // Rời các thành viên ra khỏi team trước khi xóa
        List<User> members = userRepository.findByTeamId(id);
        for (User u : members) {
            u.setTeam(null);
            u.setIsTeamLeader(false);
            userRepository.save(u);
        }

        teamRepository.delete(team);
        log.info("Đã xóa tổ đội ID: {}", id);
    }

    // ==================== QUẢN LÝ NHÂN VIÊN (STAFF) ====================

    @Transactional(readOnly = true)
    public List<StaffResponse> getAllStaff(Long teamId, TeamType teamType, Boolean isActive) {
        List<User> staffList = userRepository.findByRole(Role.ROLE_STAFF);

        return staffList.stream()
                .filter(u -> teamId == null || (u.getTeam() != null && u.getTeam().getId().equals(teamId)))
                .filter(u -> teamType == null || (u.getTeam() != null && u.getTeam().getTeamType() == teamType))
                .filter(u -> isActive == null || u.getIsActive().equals(isActive))
                .map(this::mapToStaffResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffResponse getStaffById(Long id) {
        User staff = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên có ID: " + id));
        if (staff.getRole() != Role.ROLE_STAFF) {
            throw new BadRequestException("Người dùng ID " + id + " không phải là nhân viên kỹ thuật");
        }
        return mapToStaffResponse(staff);
    }

    @Transactional
    public StaffResponse createStaff(StaffCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email " + request.getEmail() + " đã tồn tại trong hệ thống");
        }

        Team team = null;
        if (request.getTeamId() != null) {
            team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội có ID: " + request.getTeamId()));
        }

        String rawPassword = (request.getPassword() != null && !request.getPassword().trim().isEmpty())
                ? request.getPassword().trim()
                : "12345678";

        User staff = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(rawPassword))
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .role(Role.ROLE_STAFF)
                .team(team)
                .isTeamLeader(request.getIsTeamLeader() != null ? request.getIsTeamLeader() : false)
                .specialization(request.getSpecialization())
                .isActive(true)
                .build();

        User saved = userRepository.save(staff);

        // Nếu đặt làm tổ trưởng, cập nhật luôn vào team
        if (team != null && Boolean.TRUE.equals(request.getIsTeamLeader())) {
            team.setLeader(saved);
            teamRepository.save(team);
        }

        log.info("Tạo mới nhân viên kỹ thuật thành công: {} ({})", saved.getFullName(), saved.getEmail());
        return mapToStaffResponse(saved);
    }

    @Transactional
    public StaffResponse updateStaff(Long id, StaffUpdateRequest request) {
        User staff = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên có ID: " + id));

        if (staff.getRole() != Role.ROLE_STAFF) {
            throw new BadRequestException("Người dùng ID " + id + " không phải là nhân viên");
        }

        staff.setFullName(request.getFullName().trim());
        staff.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        staff.setSpecialization(request.getSpecialization());
        if (request.getIsActive() != null) {
            staff.setIsActive(request.getIsActive());
        }

        // Cập nhật tổ đội
        if (request.getTeamId() != null) {
            if (staff.getTeam() == null || !staff.getTeam().getId().equals(request.getTeamId())) {
                Team newTeam = teamRepository.findById(request.getTeamId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội có ID: " + request.getTeamId()));
                staff.setTeam(newTeam);
            }
        } else {
            staff.setTeam(null);
            staff.setIsTeamLeader(false);
        }

        if (request.getIsTeamLeader() != null) {
            staff.setIsTeamLeader(request.getIsTeamLeader());
            if (staff.getTeam() != null && request.getIsTeamLeader()) {
                staff.getTeam().setLeader(staff);
                teamRepository.save(staff.getTeam());
            }
        }

        User updated = userRepository.save(staff);
        return mapToStaffResponse(updated);
    }

    @Transactional
    public StaffResponse toggleStaffStatus(Long id) {
        User staff = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên có ID: " + id));

        staff.setIsActive(!Boolean.TRUE.equals(staff.getIsActive()));
        User updated = userRepository.save(staff);
        log.info("Cập nhật trạng thái nhân viên ID {}: active = {}", id, updated.getIsActive());
        return mapToStaffResponse(updated);
    }

    // ==================== MAPPERS ====================

    private TeamResponse mapToTeamResponse(Team team) {
        List<User> members = userRepository.findByTeamId(team.getId());
        List<StaffResponse> memberResponses = members.stream()
                .map(this::mapToStaffResponse)
                .collect(Collectors.toList());

        Long leaderId = null;
        String leaderName = null;
        String leaderPhone = null;

        if (team.getLeader() != null) {
            leaderId = team.getLeader().getId();
            leaderName = team.getLeader().getFullName();
            leaderPhone = team.getLeader().getPhone();
        } else {
            // Thử tìm thành viên có isTeamLeader = true
            User leaderMember = members.stream()
                    .filter(u -> Boolean.TRUE.equals(u.getIsTeamLeader()))
                    .findFirst()
                    .orElse(null);
            if (leaderMember != null) {
                leaderId = leaderMember.getId();
                leaderName = leaderMember.getFullName();
                leaderPhone = leaderMember.getPhone();
            }
        }

        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .teamType(team.getTeamType())
                .corridor(team.getCorridor())
                .zoneName(team.getZoneName())
                .description(team.getDescription())
                .isActive(team.getIsActive())
                .memberCount(members.size())
                .leaderId(leaderId)
                .leaderName(leaderName)
                .leaderPhone(leaderPhone)
                .members(memberResponses)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }

    private StaffResponse mapToStaffResponse(User staff) {
        Long activeTasks = incidentRepository.countActiveTasksByStaffId(staff.getId());

        Long teamId = null;
        String teamName = null;
        TeamType teamType = null;
        String corridor = null;
        String zoneName = null;

        if (staff.getTeam() != null) {
            teamId = staff.getTeam().getId();
            teamName = staff.getTeam().getName();
            teamType = staff.getTeam().getTeamType();
            corridor = staff.getTeam().getCorridor();
            zoneName = staff.getTeam().getZoneName();
        }

        return StaffResponse.builder()
                .id(staff.getId())
                .fullName(staff.getFullName())
                .email(staff.getEmail())
                .phone(staff.getPhone())
                .role(staff.getRole())
                .isActive(staff.getIsActive())
                .teamId(teamId)
                .teamName(teamName)
                .teamType(teamType)
                .corridor(corridor)
                .zoneName(zoneName)
                .isTeamLeader(Boolean.TRUE.equals(staff.getIsTeamLeader()))
                .specialization(staff.getSpecialization())
                .activeTasksCount(activeTasks)
                .createdAt(staff.getCreatedAt())
                .build();
    }
}
