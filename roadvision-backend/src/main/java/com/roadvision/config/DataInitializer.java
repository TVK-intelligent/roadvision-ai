package com.roadvision.config;

import com.roadvision.entity.Team;
import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import com.roadvision.enums.TeamType;
import com.roadvision.repository.TeamRepository;
import com.roadvision.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@Slf4j
@Configuration
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, TeamRepository teamRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        log.info("Khởi tạo / Cập nhật tài khoản mẫu với mật khẩu chuẩn '12345678'...");

        // 1. Tài khoản Quản trị viên (Admin)
        createOrUpdateUser(
                "admin@roadcare.gov.vn",
                "KS. Nguyễn Thị Phương Mai (Trưởng Ban Quản Lý Điều Hành)",
                "0909000001",
                Role.ROLE_ADMIN,
                "Quản lý điều hành & Giám sát hạ tầng",
                null,
                false
        );

        // 2. Tài khoản Kỹ thuật viên 4 Khu Quản lý Đường bộ Toàn Quốc
        User staffKhu1 = createOrUpdateUser(
                "staff.khu1@roadcare.gov.vn",
                "Nguyễn Văn Kỹ Thuật (Đội Trưởng Khảo Sát Phía Bắc)",
                "0909000002",
                Role.ROLE_STAFF,
                "Khảo sát hiện trường & Đo đạc rạn nứt, ổ gà",
                null,
                true
        );

        User staffKhu2 = createOrUpdateUser(
                "staff.khu2@roadcare.gov.vn",
                "Lê Văn Miền Trung (Đội Trưởng Ứng Cứu Khẩn Cấp)",
                "0909000003",
                Role.ROLE_STAFF,
                "Ứng cứu sạt lở, ngập úng & chướng ngại vật",
                null,
                true
        );

        User staffKhu3 = createOrUpdateUser(
                "staff.khu3@roadcare.gov.vn",
                "Trần Văn Hiện Trường (Kỹ thuật viên Khảo sát QL14)",
                "0909000004",
                Role.ROLE_STAFF,
                "Khảo sát hiện trạng mặt đường & trắc địa",
                null,
                true
        );

        User staffKhu4 = createOrUpdateUser(
                "staff.khu4@roadcare.gov.vn",
                "Phạm Văn Phương Nam (Đội Trưởng Thi Công Phía Nam)",
                "0909000005",
                Role.ROLE_STAFF,
                "Thi công cào bóc thảm nhựa nóng & hoàn thiện mặt đường",
                null,
                true
        );

        // Alias tương thích cũ
        createOrUpdateUser(
                "staff.nguyen@roadcare.gov.vn",
                "Nguyễn Văn Kỹ Thuật (Đội Cơ Động - Khu QLĐB I)",
                "0909000002",
                Role.ROLE_STAFF,
                "Khảo sát hiện trường & Cơ động phản ứng nhanh",
                null,
                false
        );

        // Thêm các nhân viên chuyên trách thành viên kèm theo của các tổ đội
        User staffMember1 = createOrUpdateUser(
                "staff.member1@roadcare.gov.vn",
                "Hoàng Đình Hải (Kỹ thuật viên Thảm nhựa nóng)",
                "0909000011",
                Role.ROLE_STAFF,
                "Vận hành máy rải thảm bê tông nhựa & đầm nén",
                null,
                false
        );

        User staffMember2 = createOrUpdateUser(
                "staff.member2@roadcare.gov.vn",
                "Đỗ Quốc Tuấn (Kỹ thuật viên Trắc địa & Bay Flycam)",
                "0909000012",
                Role.ROLE_STAFF,
                "Flycam khảo sát & Đo vẽ bình đồ sự cố",
                null,
                false
        );

        User staffMember3 = createOrUpdateUser(
                "staff.member3@roadcare.gov.vn",
                "Vũ Minh Hoàng (Kỹ thuật viên Kiểm định kết cấu đường)",
                "0909000013",
                Role.ROLE_STAFF,
                "Đo độ sâu hố sụt & Thẩm định rạn nứt mặt đường",
                null,
                false
        );

        User staffMember4 = createOrUpdateUser(
                "staff.member4@roadcare.gov.vn",
                "Phan Thành Nam (Kỹ thuật viên Cứu hộ & Giải phóng chướng ngại vật)",
                "0909000014",
                Role.ROLE_STAFF,
                "Cắt tỉa cây đổ, cẩu kéo vật cản & phân luồng khẩn cấp",
                null,
                false
        );

        User staffMember5 = createOrUpdateUser(
                "staff.member5@roadcare.gov.vn",
                "Trịnh Quốc Hùng (Kỹ thuật viên Bơm tiêu úng & Chống sạt trượt)",
                "0909000015",
                Role.ROLE_STAFF,
                "Vận hành máy bơm công suất lớn & xử lý sạt trượt đèo dốc",
                null,
                false
        );

        User staffMember6 = createOrUpdateUser(
                "staff.member6@roadcare.gov.vn",
                "Nguyễn Công Bằng (Kỹ thuật viên Trắc địa đèo dốc)",
                "0909000016",
                Role.ROLE_STAFF,
                "Đo vẽ cao độ mặt đường, rãnh xói & taluy âm",
                null,
                false
        );

        User staffMember7 = createOrUpdateUser(
                "staff.member7@roadcare.gov.vn",
                "Mai Xuân Thắng (Kỹ thuật viên Khảo sát lún nứt QL14)",
                "0909000017",
                Role.ROLE_STAFF,
                "Khảo sát hiện trường & Lập biên bản đo đạc hư hại",
                null,
                false
        );

        User staffMember8 = createOrUpdateUser(
                "staff.member8@roadcare.gov.vn",
                "Đinh Văn Trọng (Kỹ thuật viên Cào bóc mặt đường)",
                "0909000018",
                Role.ROLE_STAFF,
                "Vận hành máy cào bóc bê tông nhựa & tái chế nguội",
                null,
                false
        );

        User staffMember9 = createOrUpdateUser(
                "staff.member9@roadcare.gov.vn",
                "Bùi Anh Khoa (Kỹ thuật viên An toàn giao thông & Thi công)",
                "0909000019",
                Role.ROLE_STAFF,
                "Bố trí rào chắn an toàn, biển cảnh báo & đầm nén vá víu",
                null,
                false
        );

        // 3. Tài khoản Công dân (Citizen)
        createOrUpdateUser(
                "citizen.an@gmail.com",
                "Lê Hoàng An",
                "0912345678",
                Role.ROLE_CITIZEN,
                null,
                null,
                false
        );

        // 4. Khởi tạo / Cập nhật Tổ đội chuyên trách (Teams) và gắn đầy đủ nhân viên kèm theo
        initTeamsAndMembers(
                staffKhu1, staffKhu2, staffKhu3, staffKhu4,
                staffMember1, staffMember2, staffMember3, staffMember4,
                staffMember5, staffMember6, staffMember7, staffMember8, staffMember9
        );

        log.info("Khởi tạo tài khoản hệ thống & tổ đội mẫu hoàn tất! Mật khẩu cho mọi tài khoản mẫu là: 12345678");
    }

    private void initTeamsAndMembers(
            User leader1, User leader2, User leader3, User leader4,
            User m1, User m2, User m3, User m4, User m5, User m6, User m7, User m8, User m9
    ) {
        log.info("Khởi tạo & Cập nhật danh sách tổ đội chuyên trách và nhân viên kèm theo...");

        // Team 1: Khảo sát Miền Bắc (Khu QLĐB I)
        Team team1 = teamRepository.findAll().stream()
                .filter(t -> t.getTeamType() == TeamType.INSPECTION && t.getName().contains("Miền Bắc"))
                .findFirst()
                .orElseGet(() -> teamRepository.save(Team.builder()
                        .name("Tổ Khảo Sát Hiện Trường Miền Bắc (Khu QLĐB I)")
                        .teamType(TeamType.INSPECTION)
                        .corridor("QL1A & Cao tốc HN - Hải Phòng")
                        .zoneName("Khu QLĐB I (Miền Bắc)")
                        .description("Chuyên trách tiếp cận hiện trường trong 60 phút, định vị GPS, đo đạc kích thước hư hỏng và lập báo cáo khảo sát kỹ thuật.")
                        .leader(leader1)
                        .isActive(true)
                        .build()));

        assignUserToTeam(leader1, team1, true);
        assignUserToTeam(m2, team1, false);
        assignUserToTeam(m3, team1, false);

        // Team 2: Phản ứng nhanh Khẩn cấp Trung Bộ (Khu QLĐB II)
        Team team2 = teamRepository.findAll().stream()
                .filter(t -> t.getTeamType() == TeamType.EMERGENCY)
                .findFirst()
                .orElseGet(() -> teamRepository.save(Team.builder()
                        .name("Đội Phản Ứng Khẩn Cấp Miền Trung (Khu QLĐB II)")
                        .teamType(TeamType.EMERGENCY)
                        .corridor("QL1A & Đèo Hải Vân")
                        .zoneName("Khu QLĐB II & III (Miền Trung)")
                        .description("Đội cơ động trực chiến 24/7, chuyên xử lý vật cản lòng đường, cây đổ sạt trượt và ngập úng trong mùa mưa bão miền Trung.")
                        .leader(leader2)
                        .isActive(true)
                        .build()));

        assignUserToTeam(leader2, team2, true);
        assignUserToTeam(m4, team2, false);
        assignUserToTeam(m5, team2, false);

        // Team 3: Khảo sát Tây Nguyên (Khu QLĐB III)
        Team team3 = teamRepository.findAll().stream()
                .filter(t -> t.getTeamType() == TeamType.INSPECTION && (t.getName().contains("Tây Nguyên") || t.getName().contains("QL14")))
                .findFirst()
                .orElseGet(() -> teamRepository.save(Team.builder()
                        .name("Tổ Khảo Sát & Trắc Địa Đà Nẵng - Tây Nguyên (Khu QLĐB III)")
                        .teamType(TeamType.INSPECTION)
                        .corridor("QL14 Hồ Chí Minh & QL19")
                        .zoneName("Khu QLĐB III (Tây Nguyên)")
                        .description("Khảo sát hiện trạng hư hỏng, lún nứt, rãnh xói thoát nước vùng cao nguyên đèo dốc.")
                        .leader(leader3)
                        .isActive(true)
                        .build()));

        assignUserToTeam(leader3, team3, true);
        assignUserToTeam(m6, team3, false);
        assignUserToTeam(m7, team3, false);

        // Team 4: Thi công sửa chữa Phía Nam (Khu QLĐB IV)
        Team team4 = teamRepository.findAll().stream()
                .filter(t -> t.getTeamType() == TeamType.CONSTRUCTION)
                .findFirst()
                .orElseGet(() -> teamRepository.save(Team.builder()
                        .name("Tổ Thi Công Sửa Chữa Mặt Đường Phía Nam (Khu QLĐB IV)")
                        .teamType(TeamType.CONSTRUCTION)
                        .corridor("Cao tốc TP.HCM - Long Thành & QL51")
                        .zoneName("Khu QLĐB IV (Phía Nam)")
                        .description("Đội thi công trang bị cơ giới cào bóc thảm nhựa nóng polymer, vá triệt để hố sụt, bảo đảm êm thuận cho các tuyến huyết mạch phía Nam.")
                        .leader(leader4)
                        .isActive(true)
                        .build()));

        assignUserToTeam(leader4, team4, true);
        assignUserToTeam(m1, team4, false);
        assignUserToTeam(m8, team4, false);
        assignUserToTeam(m9, team4, false);
    }

    private void assignUserToTeam(User user, Team team, boolean isTeamLeader) {
        if (user != null && team != null) {
            user.setTeam(team);
            user.setIsTeamLeader(isTeamLeader);
            userRepository.save(user);
        }
    }

    private User createOrUpdateUser(String email, String fullName, String phone, Role role, String specialization, Team team, boolean isTeamLeader) {
        Optional<User> existing = userRepository.findByEmail(email);
        User user;
        if (existing.isPresent()) {
            user = existing.get();
            user.setPassword(passwordEncoder.encode("12345678"));
            user.setFullName(fullName);
            user.setPhone(phone);
            user.setRole(role);
            if (specialization != null) user.setSpecialization(specialization);
            if (team != null) user.setTeam(team);
            user.setIsTeamLeader(isTeamLeader);
        } else {
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode("12345678"))
                    .fullName(fullName)
                    .phone(phone)
                    .role(role)
                    .specialization(specialization)
                    .team(team)
                    .isTeamLeader(isTeamLeader)
                    .isActive(true)
                    .build();
        }
        return userRepository.save(user);
    }
}
