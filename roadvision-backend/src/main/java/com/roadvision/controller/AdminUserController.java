package com.roadvision.controller;

import com.roadvision.dto.*;
import com.roadvision.enums.Role;
import com.roadvision.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin User & RBAC Management", description = "Quản lý toàn bộ người dùng, phân quyền truy cập, kiểm duyệt và tài khoản")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả người dùng kèm bộ lọc tìm kiếm, vai trò và trạng thái")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean isActive
    ) {
        return ResponseEntity.ok(userService.searchUsers(search, role, isActive));
    }

    @GetMapping("/stats")
    @Operation(summary = "Thống kê tổng quan người dùng theo vai trò và trạng thái hoạt động")
    public ResponseEntity<UserStatsResponse> getUserStats() {
        return ResponseEntity.ok(userService.getUserStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một người dùng")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @Operation(summary = "Admin tạo mới tài khoản người dùng trực tiếp")
    public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createAdminUser(request));
    }

    @PutMapping("/{id}/role")
    @Operation(summary = "Phân quyền vai trò người dùng (ROLE_CITIZEN, ROLE_STAFF, ROLE_ADMIN)")
    public ResponseEntity<AdminUserResponse> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(userService.updateUserRole(id, request.getRole()));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Khóa hoặc Mở khóa kích hoạt tài khoản")
    public ResponseEntity<AdminUserResponse> updateUserStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserStatusRequest request
    ) {
        return ResponseEntity.ok(userService.updateUserStatus(id, request));
    }

    @PutMapping("/{id}/reputation")
    @Operation(summary = "Điều chỉnh điểm uy tín cộng đồng và xóa cảnh cáo spam")
    public ResponseEntity<AdminUserResponse> updateReputation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReputationRequest request
    ) {
        return ResponseEntity.ok(userService.updateReputationScore(id, request));
    }

    @PutMapping("/{id}/reset-password")
    @Operation(summary = "Quản trị viên đặt lại mật khẩu cho tài khoản người dùng")
    public ResponseEntity<Map<String, String>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminResetPasswordRequest request
    ) {
        userService.resetPassword(id, request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Đã cập nhật mật khẩu mới thành công cho người dùng ID " + id));
    }
}
