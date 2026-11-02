package com.roadvision.repository;

import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByRoleAndIsActiveTrue(Role role);
    List<User> findByTeamId(Long teamId);
    List<User> findByTeamIdAndIsActiveTrue(Long teamId);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.team WHERE " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:isActive IS NULL OR u.isActive = :isActive) AND " +
           "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR (:search IS NOT NULL AND u.phone LIKE CONCAT('%', :search, '%'))) " +
           "ORDER BY u.id DESC")
    List<User> searchUsers(@Param("search") String search,
                           @Param("role") Role role,
                           @Param("isActive") Boolean isActive);

    long countByRole(Role role);
    long countByIsActive(Boolean isActive);
}
