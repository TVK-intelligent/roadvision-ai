-- =============================================================================
-- THIẾT KẾ CƠ SỞ DỮ LIỆU HỆ THỐNG ROADCARE (MYSQL 8.0+)
-- Hỗ trợ quy trình 5 pha: Ingestion -> AI Inference -> Triage -> Resolution -> Closure
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `roadcare_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `roadcare_db`;

-- 1. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (USERS)
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `resolutions`;
DROP TABLE IF EXISTS `assignments`;
DROP TABLE IF EXISTS `ai_detections`;
DROP TABLE IF EXISTS `incidents`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('ROLE_CITIZEN', 'ROLE_ADMIN', 'ROLE_STAFF') NOT NULL DEFAULT 'ROLE_CITIZEN',
    `avatar_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh sách tài khoản công dân, quản trị viên và nhân viên kỹ thuật';

-- 2. BẢNG SỰ CỐ MẶT ĐƯỜNG (INCIDENTS)
CREATE TABLE `incidents` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ticket_code` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Mã định danh sự cố, vd: #RC-8942',
    `citizen_id` BIGINT NOT NULL COMMENT 'ID người dân tạo phản ánh',
    `title` VARCHAR(255) NOT NULL DEFAULT 'Sự cố mặt đường',
    `description` TEXT NULL COMMENT 'Mô tả chi tiết từ người dân',
    `image_url` VARCHAR(500) NOT NULL COMMENT 'Đường dẫn ảnh chụp ban đầu tại hiện trường',
    `latitude` DECIMAL(10, 8) NOT NULL COMMENT 'Vĩ độ GPS',
    `longitude` DECIMAL(11, 8) NOT NULL COMMENT 'Kinh độ GPS',
    `address` VARCHAR(255) NULL COMMENT 'Địa chỉ số nhà / tên đường',
    `category` ENUM('POTHOLE', 'ROAD_CRACK', 'ROAD_OBSTACLE', 'ROAD_FLOODING', 'OTHER') NOT NULL DEFAULT 'POTHOLE',
    `status` ENUM('SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `flag` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Cờ cảnh báo vd: NEEDS_MANUAL_REVIEW',
    `rejection_reason` VARCHAR(500) NULL COMMENT 'Lý do từ chối nếu bị Admin bác bỏ',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời điểm hoàn thành sửa chữa',
    `closed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời điểm nghiệm thu & đóng phiếu',
    
    CONSTRAINT `fk_incidents_citizen` 
        FOREIGN KEY (`citizen_id`) REFERENCES `users` (`id`) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    INDEX `idx_incidents_status` (`status`),
    INDEX `idx_incidents_category` (`category`),
    INDEX `idx_incidents_created_at` (`created_at`),
    INDEX `idx_incidents_coordinates` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ toàn bộ thông tin vòng đời của các sự cố hạ tầng giao thông';

-- 3. BẢNG GHI NHẬN SUY LUẬN AI (AI_DETECTIONS)
CREATE TABLE `ai_detections` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL UNIQUE COMMENT 'Quan hệ 1-1 với Incident ban đầu',
    `class_name` VARCHAR(50) NOT NULL COMMENT 'Lớp nhận diện: POTHOLE, ROAD_CRACK...',
    `confidence` DECIMAL(5, 4) NOT NULL COMMENT 'Độ tin cậy từ 0.0000 đến 1.0000',
    `bbox_x` INT NOT NULL COMMENT 'Tọa độ X pixel góc trên trái của bounding box',
    `bbox_y` INT NOT NULL COMMENT 'Tọa độ Y pixel góc trên trái của bounding box',
    `bbox_width` INT NOT NULL COMMENT 'Chiều rộng hộp bao',
    `bbox_height` INT NOT NULL COMMENT 'Chiều cao hộp bao',
    `inference_ms` INT NOT NULL COMMENT 'Thời gian thực thi suy luận (ms)',
    `raw_predictions_json` JSON NULL COMMENT 'Ma trận thô của toàn bộ các box phát hiện được',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_ai_detections_incident` 
        FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ chi tiết viễn trắc AI từ mô hình ONNX Runtime YOLOv8';

-- 4. BẢNG PHÂN CÔNG ĐIỀU PHỐI (ASSIGNMENTS)
CREATE TABLE `assignments` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL,
    `assigned_by_admin_id` BIGINT NOT NULL COMMENT 'Admin phê chuẩn và phân công',
    `assigned_to_staff_id` BIGINT NOT NULL COMMENT 'Kỹ thuật viên hiện trường được giao',
    `verified_category` VARCHAR(50) NOT NULL COMMENT 'Loại sự cố sau khi Admin thẩm định (có quyền ghi đè)',
    `priority` ENUM('NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    `notes` TEXT NULL COMMENT 'Chỉ đạo thi công từ Admin',
    `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_assignments_incident` 
        FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_assignments_admin` 
        FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `users` (`id`) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_assignments_staff` 
        FOREIGN KEY (`assigned_to_staff_id`) REFERENCES `users` (`id`) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    INDEX `idx_assignments_staff` (`assigned_to_staff_id`),
    INDEX `idx_assignments_incident` (`incident_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử phân công điều phối nhiệm vụ';

-- 5. BẢNG NGHIỆM THU HIỆN TRƯỜNG (RESOLUTIONS / PROOF OF WORK)
CREATE TABLE `resolutions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL UNIQUE,
    `staff_id` BIGINT NOT NULL COMMENT 'Kỹ thuật viên trực tiếp thực hiện',
    `proof_image_url` VARCHAR(500) NOT NULL COMMENT 'Ảnh chụp mặt đường sau khi đã vá phẳng',
    `notes` TEXT NULL COMMENT 'Ghi chú vật tư, kỹ thuật thi công',
    `resolved_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_resolutions_incident` 
        FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_resolutions_staff` 
        FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh bằng chứng và chi tiết kết quả xử lý tại hiện trường';

-- 6. BẢNG ĐÁNH GIÁ & ĐÓNG PHIẾU (FEEDBACKS)
CREATE TABLE `feedbacks` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` BIGINT NOT NULL UNIQUE,
    `citizen_id` BIGINT NOT NULL COMMENT 'Người dân chấm điểm chất lượng',
    `rating` TINYINT NOT NULL COMMENT 'Thang điểm từ 1 đến 5 sao',
    `comments` TEXT NULL COMMENT 'Ý kiến nhận xét của công dân',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_feedbacks_incident` 
        FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_feedbacks_citizen` 
        FOREIGN KEY (`citizen_id`) REFERENCES `users` (`id`) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT `chk_rating_range` CHECK (`rating` >= 1 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đánh giá mức độ hài lòng của công dân sau khi nghiệm thu';

-- =============================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- =============================================================================

-- Mật khẩu mặc định là: 'password123' (bcrypt hash mẫu)
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `phone`, `role`) VALUES
(1, 'admin@roadcare.gov.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.fS06l78rT3vV9yFfBmsF8R9l8k8qye', 'Eng. Elena Rostova', '0909000001', 'ROLE_ADMIN'),
(2, 'staff.nguyen@roadcare.gov.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.fS06l78rT3vV9yFfBmsF8R9l8k8qye', 'Nguyễn Văn Kỹ Thuật (Đội 4)', '0909000002', 'ROLE_STAFF'),
(3, 'staff.tran@roadcare.gov.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.fS06l78rT3vV9yFfBmsF8R9l8k8qye', 'Trần Văn Hiện Trường (Đội 1)', '0909000003', 'ROLE_STAFF'),
(4, 'citizen.an@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.fS06l78rT3vV9yFfBmsF8R9l8k8qye', 'Lê Hoàng An', '0912345678', 'ROLE_CITIZEN');

-- Sự cố mẫu #RC-8942 khớp hoàn toàn với bản thiết kế Stitch UI
INSERT INTO `incidents` (`id`, `ticket_code`, `citizen_id`, `title`, `description`, `image_url`, `latitude`, `longitude`, `address`, `category`, `status`, `severity`, `created_at`) VALUES
(8942, '#RC-8942', 4, 'Severe Road Pothole with Subsurface Base Erosion', 'Ổ gà lớn giữa đường gây nguy hiểm cho xe máy qua lại ban đêm', 'https://storage.roadcare.gov.vn/incidents/rc-8942-origin.jpg', 10.776889, 106.700806, '120 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM', 'POTHOLE', 'ASSIGNED', 'HIGH', '2026-09-07 08:30:00');

-- Kết quả suy luận AI mẫu cho #RC-8942
INSERT INTO `ai_detections` (`incident_id`, `class_name`, `confidence`, `bbox_x`, `bbox_y`, `bbox_width`, `bbox_height`, `inference_ms`) VALUES
(8942, 'POTHOLE', 0.9472, 128, 140, 371, 345, 42);

-- Phân công mẫu cho #RC-8942
INSERT INTO `assignments` (`incident_id`, `assigned_by_admin_id`, `assigned_to_staff_id`, `verified_category`, `priority`, `notes`, `assigned_at`) VALUES
(8942, 1, 2, 'POTHOLE', 'HIGH', 'Khắc phục ngay trong ngày hôm nay bằng thảm nhựa nguội Carboncor', '2026-09-07 09:15:00');
