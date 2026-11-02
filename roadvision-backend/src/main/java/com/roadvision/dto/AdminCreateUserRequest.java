package com.roadvision.dto;

import com.roadvision.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminCreateUserRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private String phone;

    @NotNull(message = "Vai trò (Role) không được để trống")
    private Role role;

    private Long teamId;
    private String specialization;
    private Boolean isTeamLeader;
}
