package com.roadvision.controller;

import com.roadvision.dto.StaffCreateRequest;
import com.roadvision.dto.StaffResponse;
import com.roadvision.dto.StaffUpdateRequest;
import com.roadvision.dto.TeamRequest;
import com.roadvision.dto.TeamResponse;
import com.roadvision.enums.TeamType;
import com.roadvision.service.TeamService;
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
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Team & Staff Management", description = "Quản lý Tổ đội chuyên trách và Nhân viên kỹ thuật")
@PreAuthorize("hasRole('ADMIN')")
public class AdminTeamController {

    private final TeamService teamService;

    // ==========================================
    // QUẢN LÝ TỔ ĐỘI (TEAMS)
    // ==========================================

    @GetMapping("/teams")
    @Operation(summary = "Lấy danh sách tất cả tổ đội kèm thông tin tổ trưởng & thành viên")
    public ResponseEntity<List<TeamResponse>> getAllTeams() {
        return ResponseEntity.ok(teamService.getAllTeams());
    }

    @GetMapping("/teams/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một tổ đội")
    public ResponseEntity<TeamResponse> getTeamById(@PathVariable Long id) {
        return ResponseEntity.ok(teamService.getTeamById(id));
    }

    @PostMapping("/teams")
    @Operation(summary = "Tạo mới tổ đội chuyên trách")
    public ResponseEntity<TeamResponse> createTeam(@Valid @RequestBody TeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.createTeam(request));
    }

    @PutMapping("/teams/{id}")
    @Operation(summary = "Cập nhật thông tin tổ đội")
    public ResponseEntity<TeamResponse> updateTeam(@PathVariable Long id, @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.ok(teamService.updateTeam(id, request));
    }

    @DeleteMapping("/teams/{id}")
    @Operation(summary = "Xóa hoặc vô hiệu hóa tổ đội")
    public ResponseEntity<Map<String, String>> deleteTeam(@PathVariable Long id) {
        teamService.deleteTeam(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa hoặc giải thể tổ đội thành công"));
    }

    // ==========================================
    // QUẢN LÝ NHÂN VIÊN & PHÂN CÔNG (STAFF)
    // ==========================================

    @GetMapping("/staff")
    @Operation(summary = "Lấy danh sách nhân viên kỹ thuật có bộ lọc theo tổ đội, loại đội, trạng thái")
    public ResponseEntity<List<StaffResponse>> getAllStaff(
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) TeamType teamType,
            @RequestParam(required = false) Boolean isActive
    ) {
        return ResponseEntity.ok(teamService.getAllStaff(teamId, teamType, isActive));
    }

    @PostMapping("/staff")
    @Operation(summary = "Tạo tài khoản nhân viên kỹ thuật mới và gán vào tổ đội")
    public ResponseEntity<StaffResponse> createStaff(@Valid @RequestBody StaffCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.createStaff(request));
    }

    @PutMapping("/staff/{id}")
    @Operation(summary = "Cập nhật thông tin nhân viên, chuyên môn, phân tổ đội")
    public ResponseEntity<StaffResponse> updateStaff(@PathVariable Long id, @Valid @RequestBody StaffUpdateRequest request) {
        return ResponseEntity.ok(teamService.updateStaff(id, request));
    }

    @PutMapping("/staff/{id}/toggle-status")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản nhân viên")
    public ResponseEntity<StaffResponse> toggleStaffStatus(@PathVariable Long id) {
        return ResponseEntity.ok(teamService.toggleStaffStatus(id));
    }
}
