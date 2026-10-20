package com.roadvision.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffCreateRequest {
    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    private String password; // Mặc định 12345678 nếu bỏ trống

    private String phone;

    private Long teamId;

    @Builder.Default
    private Boolean isTeamLeader = false;

    private String specialization;
}
