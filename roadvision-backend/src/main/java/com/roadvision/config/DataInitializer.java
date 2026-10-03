package com.roadvision.config;

import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import com.roadvision.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Khởi tạo / Cập nhật tài khoản mẫu với mật khẩu chuẩn '12345678'...");

        // 1. Tài khoản Quản trị viên (Admin)
        User admin = createOrUpdateUser(
                "admin@roadcare.gov.vn",
                "KS. Nguyễn Thị Phương Mai (Trưởng Ban Quản Lý Điều Hành)",
                "0909000001",
                Role.ROLE_ADMIN
        );

        // 2. Tài khoản Kỹ thuật viên 4 Khu Quản lý Đường bộ Toàn Quốc
        createOrUpdateUser(
                "staff.khu1@roadcare.gov.vn",
                "Nguyễn Văn Kỹ Thuật (Đội Cơ Động - Khu QLĐB I Miền Bắc)",
                "0909000002",
                Role.ROLE_STAFF
        );

        createOrUpdateUser(
                "staff.khu2@roadcare.gov.vn",
                "Lê Văn Miền Trung (Đội Cơ Động - Khu QLĐB II Bắc Trung Bộ)",
                "0909000003",
                Role.ROLE_STAFF
        );

        createOrUpdateUser(
                "staff.khu3@roadcare.gov.vn",
                "Trần Văn Hiện Trường (Đội Cơ Động - Khu QLĐB III Đà Nẵng & Tây Nguyên)",
                "0909000004",
                Role.ROLE_STAFF
        );

        createOrUpdateUser(
                "staff.khu4@roadcare.gov.vn",
                "Phạm Văn Phương Nam (Đội Cơ Động - Khu QLĐB IV TP.HCM & Miền Nam)",
                "0909000005",
                Role.ROLE_STAFF
        );

        // Alias tương thích cũ
        createOrUpdateUser(
                "staff.nguyen@roadcare.gov.vn",
                "Nguyễn Văn Kỹ Thuật (Đội Cơ Động - Khu QLĐB I)",
                "0909000002",
                Role.ROLE_STAFF
        );

        // 3. Tài khoản Công dân (Citizen)
        User citizen = createOrUpdateUser(
                "citizen.an@gmail.com",
                "Lê Hoàng An",
                "0912345678",
                Role.ROLE_CITIZEN
        );

        log.info("Khởi tạo tài khoản hệ thống hoàn tất! Mật khẩu cho mọi tài khoản mẫu là: 12345678");
    }

    private User createOrUpdateUser(String email, String fullName, String phone, Role role) {
        Optional<User> existing = userRepository.findByEmail(email);
        User user;
        if (existing.isPresent()) {
            user = existing.get();
            user.setPassword(passwordEncoder.encode("12345678"));
            user.setFullName(fullName);
            user.setPhone(phone);
            user.setRole(role);
        } else {
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode("12345678"))
                    .fullName(fullName)
                    .phone(phone)
                    .role(role)
                    .isActive(true)
                    .build();
        }
        return userRepository.save(user);
    }
}
