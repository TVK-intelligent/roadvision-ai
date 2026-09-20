package com.roadvision.controller;

import com.roadvision.dto.AuthResponse;
import com.roadvision.dto.LoginRequest;
import com.roadvision.dto.RegisterRequest;
import com.roadvision.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Các API đăng nhập, đăng ký và cấp phát Token JWT")
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản người dân hoặc nhân viên mới")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return new ResponseEntity<>(userService.register(request), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống và nhận Bearer Token")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }
}
