package com.roadvision.controller;

import com.roadvision.dto.SystemHealthDTO;
import com.roadvision.dto.SystemSettingsDTO;
import com.roadvision.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/settings")
@RequiredArgsConstructor
@Tag(name = "Admin System Settings", description = "Quản lý Cấu hình Tham số Hệ thống & Giám sát Sức khỏe Máy chủ")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    private final SystemSettingService settingService;

    @GetMapping
    @Operation(summary = "Lấy toàn bộ cấu hình hệ thống hiện tại")
    public ResponseEntity<SystemSettingsDTO> getSettings() {
        return ResponseEntity.ok(settingService.getSettings());
    }

    @PutMapping
    @Operation(summary = "Cập nhật các tham số cấu hình hệ thống")
    public ResponseEntity<SystemSettingsDTO> updateSettings(
            @RequestBody SystemSettingsDTO dto,
            Authentication authentication
    ) {
        String adminEmail = authentication != null ? authentication.getName() : "ADMIN";
        return ResponseEntity.ok(settingService.updateSettings(dto, adminEmail));
    }

    @PostMapping("/reset")
    @Operation(summary = "Khôi phục toàn bộ cài đặt về mặc định của nhà sản xuất")
    public ResponseEntity<SystemSettingsDTO> resetToDefaults(Authentication authentication) {
        String adminEmail = authentication != null ? authentication.getName() : "ADMIN";
        return ResponseEntity.ok(settingService.resetToDefaults(adminEmail));
    }

    @GetMapping("/health")
    @Operation(summary = "Kiểm tra tình trạng sức khỏe máy chủ & tài nguyên JVM/DB/AI")
    public ResponseEntity<SystemHealthDTO> getSystemHealth() {
        return ResponseEntity.ok(settingService.getSystemHealth());
    }
}
