package com.roadvision.service;

import com.roadvision.dto.*;
import com.roadvision.entity.Team;
import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import com.roadvision.exception.BadRequestException;
import com.roadvision.exception.ResourceNotFoundException;
import com.roadvision.repository.TeamRepository;
import com.roadvision.repository.UserRepository;
import com.roadvision.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import com.roadvision.entity.UserReputationTransaction;
import com.roadvision.enums.ReputationTransactionType;
import com.roadvision.repository.UserReputationTransactionRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final UserReputationTransactionRepository reputationTransactionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email này đã được đăng ký trong hệ thống");
        }

        Role role = request.getRole() != null ? request.getRole() : Role.ROLE_CITIZEN;

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(role)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getEmail());
        String token = jwtTokenProvider.generateToken(userDetails, savedUser.getId(), savedUser.getRole().name(), savedUser.getFullName());

        return AuthResponse.builder()
                .token(token)
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .role(savedUser.getRole())
                .reputationScore(savedUser.getReputationScore() != null ? savedUser.getReputationScore() : 50)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtTokenProvider.generateToken(userDetails, user.getId(), user.getRole().name(), user.getFullName());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .reputationScore(user.getReputationScore() != null ? user.getReputationScore() : 50)
                .teamId(user.getTeam() != null ? user.getTeam().getId() : null)
                .teamName(user.getTeam() != null ? user.getTeam().getName() : null)
                .teamType(user.getTeam() != null ? user.getTeam().getTeamType() : null)
                .isTeamLeader(user.getIsTeamLeader() != null ? user.getIsTeamLeader() : false)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .reputationScore(user.getReputationScore() != null ? user.getReputationScore() : 50)
                .teamId(user.getTeam() != null ? user.getTeam().getId() : null)
                .teamName(user.getTeam() != null ? user.getTeam().getName() : null)
                .teamType(user.getTeam() != null ? user.getTeam().getTeamType() : null)
                .isTeamLeader(user.getIsTeamLeader() != null ? user.getIsTeamLeader() : false)
                .build();
    }

    public List<User> getAllStaff() {
        return userRepository.findByRole(Role.ROLE_STAFF);
    }

    // ==========================================
    // QUẢN TRỊ NGƯỜI DÙNG & PHÂN QUYỀN (ADMIN)
    // ==========================================

    @Transactional(readOnly = true)
    public List<AdminUserResponse> searchUsers(String search, Role role, Boolean isActive) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        return userRepository.searchUsers(cleanSearch, role, isActive).stream()
                .map(AdminUserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserStatsResponse getUserStats() {
        long total = userRepository.count();
        long admins = userRepository.countByRole(Role.ROLE_ADMIN);
        long staff = userRepository.countByRole(Role.ROLE_STAFF);
        long citizens = userRepository.countByRole(Role.ROLE_CITIZEN);
        long active = userRepository.countByIsActive(true);
        long locked = userRepository.countByIsActive(false);

        return UserStatsResponse.builder()
                .totalUsers(total)
                .adminCount(admins)
                .staffCount(staff)
                .citizenCount(citizens)
                .activeCount(active)
                .lockedCount(locked)
                .build();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
        return AdminUserResponse.fromEntity(user);
    }

    @Transactional
    public AdminUserResponse updateUserRole(Long userId, Role newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        user.setRole(newRole);
        User updated = userRepository.save(user);
        return AdminUserResponse.fromEntity(updated);
    }

    @Transactional
    public AdminUserResponse updateUserStatus(Long userId, UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }
        if (request.getSuspendReason() != null) {
            user.setSuspendReason(request.getSuspendReason());
        }
        if (request.getSuspendedUntil() != null) {
            user.setSuspendedUntil(request.getSuspendedUntil());
        } else if (Boolean.TRUE.equals(request.getIsActive())) {
            user.setSuspendedUntil(null);
            user.setSuspendReason(null);
        }
        User updated = userRepository.save(user);
        return AdminUserResponse.fromEntity(updated);
    }

    @Transactional
    public AdminUserResponse updateReputationScore(Long userId, UpdateReputationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        int oldScore = user.getReputationScore() != null ? user.getReputationScore() : 50;
        if (request.getReputationScore() != null) {
            int newScore = Math.max(0, Math.min(1000, request.getReputationScore()));
            user.setReputationScore(newScore);

            int diff = newScore - oldScore;
            if (diff != 0) {
                UserReputationTransaction tx = UserReputationTransaction.builder()
                        .user(user)
                        .points(diff)
                        .balanceAfter(newScore)
                        .transactionType(ReputationTransactionType.ADMIN_ADJUST)
                        .reason("Quản trị viên điều chỉnh điểm uy tín trực tiếp")
                        .build();
                reputationTransactionRepository.save(tx);
            }
        }
        if (Boolean.TRUE.equals(request.getResetStrikes())) {
            user.setSpamStrikes(0);
            user.setSuspendedUntil(null);
            user.setSuspendReason(null);
        }
        User updated = userRepository.save(user);
        return AdminUserResponse.fromEntity(updated);
    }

    @Transactional
    public AdminUserResponse createAdminUser(AdminCreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email này đã được sử dụng: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone())
                .role(request.getRole())
                .isActive(true)
                .reputationScore(request.getRole() == Role.ROLE_CITIZEN ? 50 : 100)
                .specialization(request.getSpecialization())
                .isTeamLeader(Boolean.TRUE.equals(request.getIsTeamLeader()))
                .build();

        if (request.getTeamId() != null) {
            Team team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tổ đội ID: " + request.getTeamId()));
            user.setTeam(team);
        }

        User saved = userRepository.save(user);
        return AdminUserResponse.fromEntity(saved);
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
