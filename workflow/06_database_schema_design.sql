-- =============================================================================
-- THIẾT KẾ CƠ SỞ DỮ LIỆU HỆ THỐNG ROADCARE (MYSQL 8.0+)
-- Chu trình 7 giai đoạn: Ingestion & AI -> Triage -> Inspection & Fast-Track -> 
-- Planning & Assignment -> Execution -> QA Acceptance & Rework -> Closure & Gamification
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `roadcare_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `roadcare_db`;

-- 1. BẢNG TỔ ĐỘI CHUYÊN TRÁCH (TEAMS)
DROP TABLE IF EXISTS `user_violations`;
DROP TABLE IF EXISTS `user_reputation_transactions`;
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `resolutions`;
DROP TABLE IF EXISTS `incident_evidences`;
DROP TABLE IF EXISTS `incident_inspections`;
DROP TABLE IF EXISTS `incident_upvotes`;
DROP TABLE IF EXISTS `assignments`;
DROP TABLE IF EXISTS `ai_detections`;
DROP TABLE IF EXISTS `incidents`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `teams`;

CREATE TABLE `teams` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `team_name` VARCHAR(150) NOT NULL UNIQUE,
    `team_type` ENUM('INSPECTION', 'MAINTENANCE', 'PATROL', 'EMERGENCY') NOT NULL,
    `leader_id` BIGINT NULL,
    `zone_name` VARCHAR(150) NULL COMMENT 'Khu vực địa bàn phụ trách (Hạt quản lý đường bộ)',
    `corridor_code` VARCHAR(50) NULL COMMENT 'Mã hành lang tuyến: QL1A, QL21, DOWNTOWN...',
    `description` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_teams_type` (`team_type`),
    INDEX `idx_teams_zone` (`zone_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục tổ đội khảo sát, thi công và tuần tra cơ sở';

-- 2. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (USERS)
CREATE TABLE `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('ROLE_CITIZEN', 'ROLE_ADMIN', 'ROLE_STAFF') NOT NULL DEFAULT 'ROLE_CITIZEN',
    `avatar_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `reputation_score` INT NOT NULL DEFAULT 50 COMMENT 'Điểm uy tín tích lũy dài hạn: 0 - 1000',
    `spam_strikes` INT NOT NULL DEFAULT 0 COMMENT 'Số lần bị cảnh cáo vi phạm',
    `suspended_until` DATETIME NULL COMMENT 'Thời hạn tạm khóa quyền gửi tin',
    `suspend_reason` VARCHAR(255) NULL,
    `team_id` BIGINT NULL COMMENT 'Tổ đội trực thuộc nếu là kỹ thuật viên (Staff)',
    `is_team_leader` BOOLEAN NOT NULL DEFAULT FALSE,
    `specialization` VARCHAR(150) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_reputation` (`reputation_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản công dân, quản trị viên điều phối và kỹ thuật viên';

-- Bổ sung Foreign Key leader cho bảng teams
ALTER TABLE `teams` 
    ADD CONSTRAINT `fk_teams_leader` FOREIGN KEY (`leader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- 3. BẢNG SỰ CỐ MẶT ĐƯỜNG (INCIDENTS)
CREATE TABLE `incidents` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ticket_code` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Mã định danh sự cố, vd: #RC-8942',
    `citizen_id` BIGINT NOT NULL COMMENT 'ID người dân tạo phản ánh',
    `title` VARCHAR(255) NOT NULL DEFAULT 'Sự cố mặt đường',
    `description` TEXT NULL COMMENT 'Mô tả chi tiết từ người dân',
    `image_url` VARCHAR(500) NOT NULL COMMENT 'Đường dẫn ảnh chụp hiện trường ban đầu',
    `image_sha256` VARCHAR(64) NULL COMMENT 'Mã băm SHA-256 chống tải ảnh trùng lặp',
    `latitude` DECIMAL(10, 8) NOT NULL COMMENT 'Vĩ độ GPS hiện tại',
    `longitude` DECIMAL(11, 8) NOT NULL COMMENT 'Kinh độ GPS hiện tại',
    `original_latitude` DECIMAL(10, 8) NULL COMMENT 'Vĩ độ gốc trích xuất từ EXIF ảnh',
    `original_longitude` DECIMAL(11, 8) NULL COMMENT 'Kinh độ gốc trích xuất từ EXIF ảnh',
    `gps_accuracy` DOUBLE NULL COMMENT 'Sai số đo đạc GPS (mét)',
    `address` VARCHAR(255) NULL COMMENT 'Địa chỉ số nhà / tên đường',
    `route_corridor` VARCHAR(50) NULL COMMENT 'Hành lang tuyến quản lý: QL1A, QL21...',
    `zone_name` VARCHAR(150) NULL COMMENT 'Hạt quản lý đường bộ phụ trách',
    `category` ENUM('POTHOLE', 'ROAD_CRACK', 'ROAD_OBSTACLE', 'ROAD_FLOODING', 'COMPLEX_DAMAGE', 'OTHER') NOT NULL DEFAULT 'POTHOLE',
    `status` ENUM('SUBMITTED', 'AI_ANALYZED', 'VERIFIED', 'INSPECTION_ASSIGNED', 'INSPECTING', 'INSPECTED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_ACCEPTANCE', 'REWORK_REQUIRED', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `flag` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Cờ nghiệp vụ: TRUSTED_REPORT, POTENTIAL_DUPLICATE, FAST_TRACK, MULTI_DEFECT, FRAUD_REVOKED...',
    `ai_status` VARCHAR(50) NOT NULL DEFAULT 'AI_ANALYZED' COMMENT 'Trạng thái AI: AI_ANALYZED, AI_LOW_CONFIDENCE, AI_FAILED, MANUAL_FALLBACK',
    `fast_track_reason` VARCHAR(500) NULL COMMENT 'Lý do giải trình khẩn cấp bỏ qua khảo sát',
    `fast_track_approved_by` BIGINT NULL COMMENT 'Admin phê duyệt cơ chế Fast-Track',
    `rejection_reason` VARCHAR(500) NULL COMMENT 'Lý do từ chối nếu bị Admin bác bỏ',
    `rework_reason` VARCHAR(500) NULL COMMENT 'Chỉ đạo làm lại khi nghiệm thu chưa đạt',
    `rework_count` INT NOT NULL DEFAULT 0 COMMENT 'Số lần bị trả về thi công lại',
    `upvote_count` INT NOT NULL DEFAULT 1,
    `inspection_team_id` BIGINT NULL COMMENT 'Tổ phụ trách khảo sát',
    `assigned_team_id` BIGINT NULL COMMENT 'Tổ phụ trách thi công',
    `work_plan` VARCHAR(1000) NULL COMMENT 'Phương án thi công được duyệt',
    `safety_notes` VARCHAR(1000) NULL COMMENT 'Yêu cầu biển báo, an toàn giao thông',
    `planned_start_date` DATETIME NULL,
    `planned_deadline` DATETIME NULL COMMENT 'Hạn cam kết xử lý SLA',
    `delay_reason` VARCHAR(1000) NULL COMMENT 'Lý do giải trình chậm trễ nếu quá hạn',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL DEFAULT NULL,
    `closed_at` TIMESTAMP NULL DEFAULT NULL,
    
    CONSTRAINT `fk_incidents_citizen` FOREIGN KEY (`citizen_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_incidents_inspection_team` FOREIGN KEY (`inspection_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_incidents_assigned_team` FOREIGN KEY (`assigned_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_incidents_fast_track_approver` FOREIGN KEY (`fast_track_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_incidents_status` (`status`),
    INDEX `idx_incidents_category` (`category`),
    INDEX `idx_incidents_corridor` (`route_corridor`),
    INDEX `idx_incidents_coordinates` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ sự cố hạ tầng giao thông qua 7 giai đoạn vận hành';

-- 4. BẢNG GHI NHẬN SUY LUẬN AI (AI_DETECTIONS)
CREATE TABLE `ai_detections` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL UNIQUE,
    `class_name` VARCHAR(50) NOT NULL,
    `confidence` DECIMAL(5, 4) NOT NULL,
    `bbox_x` INT NOT NULL,
    `bbox_y` INT NOT NULL,
    `bbox_width` INT NOT NULL,
    `bbox_height` INT NOT NULL,
    `inference_ms` INT NOT NULL,
    `raw_predictions_json` JSON NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ai_detections_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG KHẢO SÁT HIỆN TRƯỜNG (INCIDENT_INSPECTIONS)
CREATE TABLE `incident_inspections` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL UNIQUE,
    `inspected_by_user_id` BIGINT NOT NULL,
    `inspection_status` VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    `measured_length_m` DECIMAL(6, 2) NULL,
    `measured_width_m` DECIMAL(6, 2) NULL,
    `measured_depth_cm` DECIMAL(6, 2) NULL,
    `estimated_area_sqm` DECIMAL(8, 2) NULL,
    `recommended_treatment` VARCHAR(255) NULL,
    `traffic_impact` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `inspected_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_inspections_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inspections_user` FOREIGN KEY (`inspected_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG BẰNG CHỨNG HÌNH ẢNH ĐA GIAI ĐOẠN (INCIDENT_EVIDENCES)
CREATE TABLE `incident_evidences` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL,
    `uploaded_by_user_id` BIGINT NOT NULL,
    `stage` ENUM('REPORT', 'INSPECTION', 'CONSTRUCTION_BEFORE', 'CONSTRUCTION_DURING', 'CONSTRUCTION_AFTER', 'ACCEPTANCE') NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_evidences_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_evidences_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    INDEX `idx_evidences_incident_stage` (`incident_id`, `stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG SỔ CÁI BIẾN ĐỘNG ĐIỂM UY TÍN (USER_REPUTATION_TRANSACTIONS)
CREATE TABLE `user_reputation_transactions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `incident_id` BIGINT NULL,
    `points` INT NOT NULL COMMENT 'Biến động: +50, +100, -100, -50, -150',
    `balance_after` INT NOT NULL COMMENT 'Số dư sau giao dịch: 0 - 1000',
    `transaction_type` VARCHAR(50) NOT NULL COMMENT 'VERIFIED_BONUS, CLOSED_BONUS, PENALTY, REVERSAL, ADMIN_ADJUST',
    `reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reputation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reputation_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE SET NULL,
    UNIQUE KEY `uq_user_incident_type` (`user_id`, `incident_id`, `transaction_type`),
    INDEX `idx_reputation_user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sổ cái Ledger lưu vết toàn bộ biến động điểm uy tín và thi đua';

-- 8. BẢNG THEO DÕI VI PHẠM & CẢNH CÁO (USER_VIOLATIONS)
CREATE TABLE `user_violations` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `incident_id` BIGINT NULL,
    `violation_type` VARCHAR(50) NOT NULL COMMENT 'FAKE_REPORT, MALICIOUS_CONTENT, INTERNET_IMAGE, SPAM, OTHER',
    `strike_count` INT NOT NULL DEFAULT 1 COMMENT 'Lần vi phạm tích lũy: 1 đến 5',
    `action_taken` VARCHAR(100) NOT NULL COMMENT 'WARNING, RESTRICTED, SUSPENDED_7_DAYS',
    `description` VARCHAR(500) NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Khiếu nại thành công, Admin hủy cảnh cáo',
    `revoked_by` BIGINT NULL,
    `revoked_reason` VARCHAR(500) NULL,
    `revoked_at` DATETIME NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_violation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_violation_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_violation_revoker` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_violation_user_active` (`user_id`, `is_revoked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký ghi nhận và quản lý chế tài vi phạm 3 mức độ của người dùng';

-- 9. BẢNG ĐÁNH GIÁ CỦA CÔNG DÂN (FEEDBACKS)
CREATE TABLE `feedbacks` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL UNIQUE,
    `citizen_id` BIGINT NOT NULL,
    `rating` TINYINT NOT NULL COMMENT '1 đến 5 sao',
    `comments` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_feedbacks_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_feedbacks_citizen` FOREIGN KEY (`citizen_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_rating_range` CHECK (`rating` >= 1 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
