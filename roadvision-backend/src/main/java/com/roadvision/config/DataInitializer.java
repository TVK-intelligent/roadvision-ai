package com.roadvision.config;

import com.roadvision.entity.Incident;
import com.roadvision.entity.IncidentInspection;
import com.roadvision.entity.Team;
import com.roadvision.entity.User;
import com.roadvision.enums.Role;
import com.roadvision.enums.TeamType;
import com.roadvision.repository.IncidentInspectionRepository;
import com.roadvision.repository.IncidentRepository;
import com.roadvision.repository.TeamRepository;
import com.roadvision.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

@Slf4j
@Configuration
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final IncidentRepository incidentRepository;
    private final IncidentInspectionRepository incidentInspectionRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            TeamRepository teamRepository,
            IncidentRepository incidentRepository,
            IncidentInspectionRepository incidentInspectionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.incidentRepository = incidentRepository;
        this.incidentInspectionRepository = incidentInspectionRepository;
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

        User staffMember10 = createOrUpdateUser(
                "staff.member10@roadcare.gov.vn",
                "Nguyễn Hữu Trí (Đội Trưởng Khảo Sát Ba Đình)",
                "0909000020",
                Role.ROLE_STAFF,
                "Trắc địa đô thị & Đo vẽ bình đồ sự cố",
                null,
                true
        );

        User staffMember11 = createOrUpdateUser(
                "staff.member11@roadcare.gov.vn",
                "Lê Tuấn Anh (Kỹ thuật viên Khảo sát Ba Đình)",
                "0909000021",
                Role.ROLE_STAFF,
                "Đo kích thước hình học hố sụt & nứt mặt đường",
                null,
                false
        );

        User staffMember12 = createOrUpdateUser(
                "staff.member12@roadcare.gov.vn",
                "Trần Quang Đăng (Đội Trưởng Thi Công Thanh Xuân)",
                "0909000022",
                Role.ROLE_STAFF,
                "Chỉ huy cơ giới hóa thảm nhựa & lu lèn",
                null,
                true
        );

        User staffMember13 = createOrUpdateUser(
                "staff.member13@roadcare.gov.vn",
                "Vũ Đình Cường (Kỹ thuật viên Thi công Thanh Xuân)",
                "0909000023",
                Role.ROLE_STAFF,
                "Vận hành xe tưới nhựa dính bám & đầm cóc",
                null,
                false
        );

        User staffMember14 = createOrUpdateUser(
                "staff.member14@roadcare.gov.vn",
                "Hoàng Trọng Nghĩa (Đội Trưởng Thi Công Ba Đình)",
                "0909000024",
                Role.ROLE_STAFF,
                "Chỉ huy duy tu vá víu & bảo trì hoàn thiện",
                null,
                true
        );

        User staffMember15 = createOrUpdateUser(
                "staff.member15@roadcare.gov.vn",
                "Phạm Duy Khánh (Kỹ thuật viên Thi công Ba Đình)",
                "0909000025",
                Role.ROLE_STAFF,
                "Cân chỉnh nắp hố ga & đan rãnh thoát nước",
                null,
                false
        );

        // 2.3 Tài khoản Tổ Tuần Tra Tuyến Đường (Camera AI)
        User patrolLeader1 = createOrUpdateUser(
                "patrol.khu1@roadcare.gov.vn",
                "Trần Tuần Kiểm (Đội Trưởng Tuần Tra Phía Bắc)",
                "0909000031",
                Role.ROLE_STAFF,
                "Tuần tra Camera AI hành trình & Lập sổ tuần đường",
                null,
                true
        );
        User patrolMember1 = createOrUpdateUser(
                "patrol.member1@roadcare.gov.vn",
                "Ngô Văn Lái Xe (Tuần Tra Phía Bắc)",
                "0909000032",
                Role.ROLE_STAFF,
                "Vận hành xe tuần đường & thiết bị ghi hình AI",
                null,
                false
        );

        User patrolLeader2 = createOrUpdateUser(
                "patrol.khu2@roadcare.gov.vn",
                "Lê Tuần Tuyến (Đội Trưởng Tuần Tra Phía Nam)",
                "0909000033",
                Role.ROLE_STAFF,
                "Tuần tra Camera AI hành trình & Lập sổ tuần đường",
                null,
                true
        );
        User patrolMember2 = createOrUpdateUser(
                "patrol.member2@roadcare.gov.vn",
                "Bùi Văn Lái Xe (Tuần Tra Phía Nam)",
                "0909000034",
                Role.ROLE_STAFF,
                "Vận hành xe tuần đường & thiết bị ghi hình AI",
                null,
                false
        );

        User patrolLeader3 = createOrUpdateUser(
                "patrol.khu3@roadcare.gov.vn",
                "Phạm Camera (Đội Trưởng Tuần Tra Phía Đông)",
                "0909000035",
                Role.ROLE_STAFF,
                "Tuần tra Camera AI hành trình & Lập sổ tuần đường",
                null,
                true
        );
        User patrolMember3 = createOrUpdateUser(
                "patrol.member3@roadcare.gov.vn",
                "Đinh Văn Lái Xe (Tuần Tra Phía Đông)",
                "0909000036",
                Role.ROLE_STAFF,
                "Vận hành xe tuần đường & thiết bị ghi hình AI",
                null,
                false
        );

        User patrolLeader4 = createOrUpdateUser(
                "patrol.khu4@roadcare.gov.vn",
                "Hoàng Hành Trình (Đội Trưởng Tuần Tra Phía Tây)",
                "0909000037",
                Role.ROLE_STAFF,
                "Tuần tra Camera AI hành trình & Lập sổ tuần đường",
                null,
                true
        );
        User patrolMember4 = createOrUpdateUser(
                "patrol.member4@roadcare.gov.vn",
                "Trương Văn Lái Xe (Tuần Tra Phía Tây)",
                "0909000038",
                Role.ROLE_STAFF,
                "Vận hành xe tuần đường & thiết bị ghi hình AI",
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

        // 4. Khởi tạo / Cập nhật 13 Tổ đội chuyên trách Hà Nội (4 Tuần tra, 4 Khảo sát, 4 Thi công, 1 Khẩn cấp)
        initTeamsAndMembers(
                patrolLeader1, patrolLeader2, patrolLeader3, patrolLeader4,
                patrolMember1, patrolMember2, patrolMember3, patrolMember4,
                staffKhu1, staffKhu2, staffKhu3, staffKhu4,
                staffMember1, staffMember2, staffMember3, staffMember4,
                staffMember5, staffMember6, staffMember7, staffMember8, staffMember9,
                staffMember10, staffMember11, staffMember12, staffMember13, staffMember14, staffMember15
        );

        log.info("Khởi tạo tài khoản hệ thống & 13 tổ đội chuyên trách Hà Nội hoàn tất! Mật khẩu mẫu: 12345678");
    }

    private void initTeamsAndMembers(
            User pLeader1, User pLeader2, User pLeader3, User pLeader4,
            User pM1, User pM2, User pM3, User pM4,
            User leader1, User leader2, User leader3, User leader4,
            User m1, User m2, User m3, User m4, User m5, User m6, User m7, User m8, User m9,
            User m10, User m11, User m12, User m13, User m14, User m15
    ) {
        log.info("Dọn dẹp các tổ đội di sản và khởi tạo danh sách 13 tổ đội chuyên trách Hà Nội...");

        // 0. Vô hiệu hóa triệt để các tổ đội di sản vùng miền cũ (Miền Bắc, Miền Trung, Đà Nẵng, Tây Nguyên, Phía Nam)
        List<Team> allTeams = teamRepository.findAll();
        for (Team legacy : allTeams) {
            String n = legacy.getName();
            if (n.contains("Miền Bắc") || n.contains("Miền Trung") || n.contains("Tây Nguyên")
                    || n.contains("Đà Nẵng") || n.contains("Phía Nam") || n.contains("Khu QLĐB") || n.contains("Khu Quản Lý")) {
                legacy.setIsActive(false);
                teamRepository.save(legacy);
                log.info("Đã vô hiệu hóa hoàn toàn tổ đội di sản cũ: {}", n);
            }
        }

        // ==========================================
        // NHÓM 1: 4 TỔ TUẦN TRA TUYẾN ĐƯỜNG (PATROL - CAMERA AI)
        // ==========================================
        // P1. TỔ TUẦN TRA 1 - PHÍA BẮC
        Team p1 = createOrUpdateTeam(
                "Tổ Tuần Tra 1 - Phía Bắc",
                TeamType.PATROL,
                "Quận Cầu Giấy, Tây Hồ, Bắc Từ Liêm (Trục Phạm Văn Đồng - Võ Chí Công - QL32)",
                "Phía Bắc Hà Nội",
                "Tuần tra mặt đường bằng camera AI hành trình liên tục, phát hiện sớm ổ gà, rạn nứt, ngập úng tuyến cửa ngõ phía Bắc.",
                21.0550, 105.7820,
                "Số 136 Phạm Văn Đồng, Quận Bắc Từ Liêm, Hà Nội",
                pLeader1
        );
        assignUserToTeam(pM1, p1, false);

        // P2. TỔ TUẦN TRA 2 - PHÍA NAM
        Team p2 = createOrUpdateTeam(
                "Tổ Tuần Tra 2 - Phía Nam",
                TeamType.PATROL,
                "Quận Thanh Xuân, Hoàng Mai, Hà Đông (Trục Giải Phóng - QL1A - Quang Trung)",
                "Phía Nam Hà Nội",
                "Tuần tra lưu động bằng camera AI dọc trục giao thông trọng điểm phía Nam và cửa ngõ Quốc lộ 1A.",
                20.9780, 105.8420,
                "Số 885 Giải Phóng, Quận Hoàng Mai, Hà Nội",
                pLeader2
        );
        assignUserToTeam(pM2, p2, false);

        // P3. TỔ TUẦN TRA 3 - PHÍA ĐÔNG
        Team p3 = createOrUpdateTeam(
                "Tổ Tuần Tra 3 - Phía Đông",
                TeamType.PATROL,
                "Quận Long Biên, Gia Lâm, Hoàn Kiếm (Trục QL5 - Cầu Vĩnh Tuy - Nguyễn Văn Cừ)",
                "Phía Đông Hà Nội",
                "Tuần tra giám sát chất lượng mặt đường cầu vượt sông Hồng, đường cao tốc Hà Nội - Hải Phòng và QL5.",
                21.0480, 105.8860,
                "Số 350 Nguyễn Văn Cừ, Quận Long Biên, Hà Nội",
                pLeader3
        );
        assignUserToTeam(pM3, p3, false);

        // P4. TỔ TUẦN TRA 4 - PHÍA TÂY
        Team p4 = createOrUpdateTeam(
                "Tổ Tuần Tra 4 - Phía Tây",
                TeamType.PATROL,
                "Quận Nam Từ Liêm, Hoài Đức (Trục Đại Lộ Thăng Long - Vành Đai 3 - Lê Trọng Tấn)",
                "Phía Tây Hà Nội",
                "Tuần tra cao tốc đô thị Đại Lộ Thăng Long và tuyến Vành đai 3 trên cao, phát hiện chướng ngại vật rơi vãi và ổ gà tốc độ cao.",
                21.0080, 105.7650,
                "Km 4 Đại Lộ Thăng Long, Quận Nam Từ Liêm, Hà Nội",
                pLeader4
        );
        assignUserToTeam(pM4, p4, false);

        // ==========================================
        // NHÓM 2: 4 TỔ KHẢO SÁT & ĐÁNH GIÁ KỸ THUẬT (INSPECTION)
        // ==========================================

        // 1. TỔ KHẢO SÁT 1 - CẦU GIẤY
        Team t1 = createOrUpdateTeam(
                "Tổ Khảo Sát 1 - Cầu Giấy",
                TeamType.INSPECTION,
                "Quận Cầu Giấy (Trục Cầu Giấy - Xuân Thủy - Duy Tân)",
                "Cầu Giấy, Hà Nội",
                "Tiếp cận hiện trường trong 15-20 phút, đo đạc kích thước hố sụt, trắc địa nứt lún và bay flycam.",
                21.0333, 105.7939,
                "Số 68 Cầu Giấy, Quận Cầu Giấy, Hà Nội",
                leader1
        );
        assignUserToTeam(m2, t1, false);

        // 2. TỔ KHẢO SÁT 2 - ĐỐNG ĐA
        Team t2 = createOrUpdateTeam(
                "Tổ Khảo Sát 2 - Đống Đa",
                TeamType.INSPECTION,
                "Quận Đống Đa (Trục Xã Đàn - Tôn Đức Thắng - Thái Hà)",
                "Đống Đa, Hà Nội",
                "Kiểm định kết cấu nứt vỡ mặt đường, đo độ sâu hố ga và lập biên bản kỹ thuật số.",
                21.0181, 105.8272,
                "Số 226 Xã Đàn, Quận Đống Đa, Hà Nội",
                leader3
        );
        assignUserToTeam(m3, t2, false);

        // 3. TỔ KHẢO SÁT 3 - THANH XUÂN
        Team t3 = createOrUpdateTeam(
                "Tổ Khảo Sát 3 - Thanh Xuân",
                TeamType.INSPECTION,
                "Quận Thanh Xuân (Trục Nguyễn Trãi - Khuất Duy Tiến - Lê Văn Lương)",
                "Thanh Xuân, Hà Nội",
                "Khảo sát hiện trạng trồi lún vệt bánh xe, nứt mai rùa trục giao thông huyết mạch Tây Nam.",
                20.9980, 105.8083,
                "Số 312 Nguyễn Trãi, Quận Thanh Xuân, Hà Nội",
                m6
        );
        assignUserToTeam(m7, t3, false);

        // 4. TỔ KHẢO SÁT 4 - BA ĐÌNH
        Team t4 = createOrUpdateTeam(
                "Tổ Khảo Sát 4 - Ba Đình",
                TeamType.INSPECTION,
                "Quận Ba Đình (Trục Kim Mã - Liễu Giai - Giảng Võ)",
                "Ba Đình, Hà Nội",
                "Khảo sát địa bàn trung tâm hành chính, bảo đảm an toàn giao thông và mỹ quan đô thị.",
                21.0341, 105.8239,
                "Số 12 Kim Mã, Quận Ba Đình, Hà Nội",
                m10
        );
        assignUserToTeam(m11, t4, false);

        // 5. TỔ THI CÔNG 1 - CẦU GIẤY
        Team t5 = createOrUpdateTeam(
                "Tổ Thi Công 1 - Cầu Giấy",
                TeamType.CONSTRUCTION,
                "Quận Cầu Giấy (Trục Phạm Hùng - Duy Tân - Trần Thái Tông)",
                "Cầu Giấy, Hà Nội",
                "Trang bị máy cào bóc 1m, xe rải thảm bê tông nhựa nóng polymer và lu rung 10 tấn.",
                21.0315, 105.7836,
                "Ngõ 19 Duy Tân, Quận Cầu Giấy, Hà Nội",
                leader4
        );
        assignUserToTeam(m1, t5, false);

        // 6. TỔ THI CÔNG 2 - ĐỐNG ĐA
        Team t6 = createOrUpdateTeam(
                "Tổ Thi Công 2 - Đống Đa",
                TeamType.CONSTRUCTION,
                "Quận Đống Đa (Trục Đường Láng - Láng Hạ - Tây Sơn)",
                "Đống Đa, Hà Nội",
                "Đội cơ động vá nhanh ổ gà, sửa chữa vết nứt kết cấu và cân chỉnh nắp hố ga phẳng êm thuận.",
                21.0156, 105.8142,
                "Số 89 Láng Hạ, Quận Đống Đa, Hà Nội",
                m8
        );
        assignUserToTeam(m9, t6, false);

        // 7. TỔ THI CÔNG 3 - THANH XUÂN
        Team t7 = createOrUpdateTeam(
                "Tổ Thi Công 3 - Thanh Xuân",
                TeamType.CONSTRUCTION,
                "Quận Thanh Xuân (Trục Vành Đai 3 dưới thấp - Trường Chinh)",
                "Thanh Xuân, Hà Nội",
                "Thi công cào bóc hoàn trả mặt đường cao tốc và đường đô thị quá tải trọng.",
                20.9912, 105.8175,
                "Số 18 Vũ Tông Phan, Quận Thanh Xuân, Hà Nội",
                m12
        );
        assignUserToTeam(m13, t7, false);

        // 8. TỔ THI CÔNG 4 - BA ĐÌNH
        Team t8 = createOrUpdateTeam(
                "Tổ Thi Công 4 - Ba Đình",
                TeamType.CONSTRUCTION,
                "Quận Ba Đình (Trục Đội Cấn - Hoàng Hoa Thám - Nguyễn Thái Học)",
                "Ba Đình, Hà Nội",
                "Thi công hoàn thiện bê tông nhựa chặt, xử lý mép nối và bảo đảm chất lượng nghiêm ngặt.",
                21.0368, 105.8295,
                "Số 45 Đội Cấn, Quận Ba Đình, Hà Nội",
                m14
        );
        assignUserToTeam(m15, t8, false);

        // 9. ĐỘI CỨU HỘ KHẨN CẤP HÀ NỘI
        Team t9 = createOrUpdateTeam(
                "Đội Cứu Hộ Khẩn Cấp Hà Nội",
                TeamType.EMERGENCY,
                "Toàn thành phố Hà Nội (Cơ động Nút giao Vành Đai 3 - Đại Lộ Thăng Long)",
                "Hà Nội (Khẩn cấp 24/7)",
                "Đội trực chiến 24/7, chuyên xử lý sự cố CRITICAL trong 4 giờ: cây đổ, ngập hầm chui, hố sụt lớn.",
                21.0022, 105.7895,
                "Nút giao Đại Lộ Thăng Long & Vành Đai 3, Hà Nội",
                leader2
        );
        assignUserToTeam(m4, t9, false);
        assignUserToTeam(m5, t9, false);
    }

    private Team createOrUpdateTeam(
            String name, TeamType teamType, String corridor, String zoneName,
            String description, Double lat, Double lng, String baseAddress, User leader
    ) {
        Team team = teamRepository.findAll().stream()
                .filter(t -> t.getName().equalsIgnoreCase(name)
                        || (t.getTeamType() == teamType && t.getName().contains("Phía Bắc") && name.contains("Phía Bắc"))
                        || (t.getTeamType() == teamType && t.getName().contains("Phía Nam") && name.contains("Phía Nam"))
                        || (t.getTeamType() == teamType && t.getName().contains("Phía Đông") && name.contains("Phía Đông"))
                        || (t.getTeamType() == teamType && t.getName().contains("Phía Tây") && name.contains("Phía Tây"))
                        || (t.getZoneName() != null && t.getZoneName().equalsIgnoreCase(zoneName) && t.getTeamType() == teamType)
                        || (t.getName().contains("Cầu Giấy") && name.contains("Cầu Giấy") && t.getTeamType() == teamType)
                        || (t.getName().contains("Đống Đa") && name.contains("Đống Đa") && t.getTeamType() == teamType)
                        || (t.getName().contains("Thanh Xuân") && name.contains("Thanh Xuân") && t.getTeamType() == teamType)
                        || (t.getName().contains("Ba Đình") && name.contains("Ba Đình") && t.getTeamType() == teamType)
                        || (t.getName().toLowerCase().contains("khẩn cấp") && name.toLowerCase().contains("khẩn cấp")))
                .findFirst()
                .orElseGet(() -> Team.builder().name(name).build());

        team.setName(name);
        team.setTeamType(teamType);
        team.setCorridor(corridor);
        team.setZoneName(zoneName);
        team.setDescription(description);
        team.setBaseLatitude(lat);
        team.setBaseLongitude(lng);
        team.setBaseAddress(baseAddress);
        team.setIsActive(true);
        if (leader != null) {
            team.setLeader(leader);
        }
        Team saved = teamRepository.save(team);
        if (leader != null) {
            leader.setTeam(saved);
            leader.setIsTeamLeader(true);
            userRepository.save(leader);
        }
        return saved;
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
