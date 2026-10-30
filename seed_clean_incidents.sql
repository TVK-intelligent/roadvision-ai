-- =====================================================================
-- ROADVISION SEED STANDARDIZED DATA WITH ACCURATE MATCHING REAL IMAGES
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE ai_detections;
TRUNCATE TABLE assignments;
TRUNCATE TABLE feedbacks;
TRUNCATE TABLE incident_evidences;
TRUNCATE TABLE incident_inspections;
TRUNCATE TABLE incident_upvotes;
TRUNCATE TABLE resolutions;
TRUNCATE TABLE patrol_sessions;
TRUNCATE TABLE notifications;
TRUNCATE TABLE incidents;

-- #1: SUBMITTED - Người dân vừa gửi phản ánh, chờ AI phân tích (Hố ga mất nắp)
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (1, '#RC-1011', 37,
  'Hố ga mất nắp nguy hiểm trước cổng Ga Giáp Bát',
  'Miệng hố ga sâu khoảng 1.5m bị mất nắp sắt, các phương tiện đi lại qua đoạn Giải Phóng dễ bị lọt bánh xe vào ban đêm.',
  '/uploads/incidents/manhole_hazard.jpg',
  'POTHOLE', 'SUBMITTED', 'HIGH',
  20.98223400, 105.84234500,
  'Km 188+300 Quốc lộ 1A (Trước Ga Giáp Bát), Phường Hoàng Liệt, Quận Hoàng Mai, Hà Nội',
  'QL1A & Cao tốc HN - Hải Phòng', 'Khu QLĐB I (Miền Bắc)',
  3, 0, NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 1 HOUR);

-- #2: AI_ANALYZED - AI phân tích phát hiện nứt mai rùa trên mặt cầu
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (2, '#RC-2022', 37,
  'Nứt mai rùa diện rộng trên mặt cầu Bến Thủy 1',
  'Mặt đường bê tông nhựa xuất hiện vệt nứt ngang kèm chân chim kéo dài hơn 5m, nguy cơ bong bật ổ gà khi xe tải trọng lớn đi qua.',
  '/uploads/incidents/alligator_crack_bridge.png',
  'ROAD_CRACK', 'AI_ANALYZED', 'MEDIUM',
  18.66540000, 105.69870000,
  'Km 468+200 QL1A, Cầu Bến Thủy, Phường Trung Đô, TP. Vinh, Nghệ An',
  'QL1A & Cao tốc HN - Hải Phòng', 'Khu QLĐB I (Miền Bắc)',
  1, 0, NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 2 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (2, 'ROAD_CRACK', 0.882, 9, 34, 386, 200, 42);

-- #3: INSPECTION_ASSIGNED - Admin đã giao Tổ Khảo sát tiếp cận hầm chui ngập nước
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, inspection_team_id, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (3, '#RC-3033', 37,
  'Nước ngập cục bộ 40cm dưới hầm chui dân sinh Đại lộ Thăng Long',
  'Sau cơn mưa to, cống thoát nước bị nghẹt rác khiến ngập sâu, xe máy và ô tô nhỏ không thể lưu thông.',
  '/uploads/incidents/urban_flood_underpass.jpg',
  'ROAD_FLOODING', 'INSPECTION_ASSIGNED', 'HIGH',
  9,
  20.99870000, 105.74560000,
  'Hầm chui số 3, Km 8+500 Đại lộ Thăng Long, Huyện Hoài Đức, Hà Nội',
  'QL1A & Cao tốc HN - Hải Phòng', 'Khu QLĐB I (Miền Bắc)',
  5, 0, NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 4 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (3, 'ROAD_FLOODING', 0.940, 100, 180, 720, 480, 50);

-- #4: INSPECTING - Kỹ thuật viên đang đo đạc ổ gà sâu đèo Hải Vân
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, inspection_team_id, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (4, '#RC-4044', 37,
  'Ổ gà sâu mép đường chân đèo Hải Vân',
  'Ổ gà kích thước xấp xỉ 1.2m x 0.9m, sâu 8cm, đáy đọng đá dăm cạnh cua gắt nguy hiểm cho xe máy.',
  '/uploads/incidents/pothole_mountain.jpg',
  'POTHOLE', 'INSPECTING', 'CRITICAL',
  9,
  16.18230000, 108.12450000,
  'Km 899+600 Đèo Hải Vân, Phường Hòa Hiệp Bắc, Quận Liên Chiểu, TP. Đà Nẵng',
  'QL1A & Đèo Hải Vân', 'Khu QLĐB II & III (Miền Trung)',
  8, 0, NOW() - INTERVAL 8 HOUR, NOW() - INTERVAL 1 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (4, 'POTHOLE', 0.912, 120, 190, 680, 450, 48);

-- #5: INSPECTED - Đã lập biên bản khảo sát hiện trường hằn lún bánh xe (Rutting)
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, inspection_team_id, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (5, '#RC-5055', 37,
  'Lún võng vệt bánh xe sâu tại nút giao QL14 Đắk Glei',
  'Vệt hằn lún bánh xe sâu 7cm dài hơn 15m trên làn xe tải nặng leo dốc đèo.',
  '/uploads/incidents/rutting_highway.jpg',
  'POTHOLE', 'INSPECTED', 'HIGH',
  9,
  15.02340000, 107.72120000,
  'Km 1420+500 Đường Hồ Chí Minh (QL14), Huyện Đắk Glei, Tỉnh Kon Tum',
  'QL14 Hồ Chí Minh & QL19', 'Khu QLĐB III (Tây Nguyên)',
  4, 0, NOW() - INTERVAL 14 HOUR, NOW() - INTERVAL 3 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (5, 'POTHOLE', 0.895, 110, 210, 640, 420, 45);

INSERT INTO incident_inspections (incident_id, inspection_team_id, inspector_id, actual_latitude, actual_longitude, confirmed_category, actual_severity, estimated_size, traffic_impact, proposed_solution, notes, inspection_status, gps_accuracy, inspected_at, created_at, updated_at)
VALUES (5, 9, 23, 15.02342000, 107.72125000, 'POTHOLE', 'HIGH', '15.0m x 0.8m x 7.0cm (S = 12.00 m², V = 0.84 m³ ~ 2.02 tấn BTN)', 'Chiếm 1/2 làn xe tải nặng', 'Cào bóc sâu 7cm, tưới nhựa dính bám 0.5kg/m2, thảm bù BTNC 12.5 đầm lèn K98', 'Cần bố trí biển báo phân luồng từ xa 150m vì nằm ngay đoạn dốc cua', 'SUBMITTED', 2.8, NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 3 HOUR);

-- #6: ASSIGNED - Vết nứt kéo dài vành đai Buôn Ma Thuột
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, inspection_team_id, assigned_team_id, planned_deadline, work_plan, safety_notes, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (6, '#RC-6066', 37,
  'Rạn nứt kéo dài bề mặt đường vành đai phía Tây Buôn Ma Thuột',
  'Vết nứt dọc nối dài dọc tim đường nhánh rẽ gây ngấm nước vào móng đường.',
  '/uploads/incidents/longitudinal_crack_highway.jpg',
  'ROAD_CRACK', 'ASSIGNED', 'HIGH',
  11, 12,
  NOW() + INTERVAL 24 HOUR,
  'Cắt rãnh theo vết nứt, làm sạch bằng máy nén khí, rót matit chèn khe chuyên dụng Polyurethane',
  'Đặt cọc tiêu phân luồng và đèn xoay cảnh báo trong suốt quá trình trám vá',
  12.67890000, 108.03450000,
  'Km 10+200 Đường tránh phía Tây, TP. Buôn Ma Thuột, Đắk Lắk',
  'QL14 Hồ Chí Minh & QL19', 'Khu QLĐB III (Tây Nguyên)',
  2, 0, NOW() - INTERVAL 18 HOUR, NOW() - INTERVAL 5 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (6, 'ROAD_CRACK', 0.870, 150, 200, 600, 410, 41);

INSERT INTO assignments (incident_id, assigned_by_admin_id, assigned_to_staff_id, verified_category, priority, notes, assigned_at)
VALUES (6, 22, 26, 'ROAD_CRACK', 'HIGH', 'Tập kết máy nén khí và hoàn thành thi công trước 17h hôm sau.', NOW() - INTERVAL 5 HOUR);

-- #7: IN_PROGRESS - Ổ voi lớn trên QL51 gần Ngã 3 Vũng Tàu
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, assigned_team_id, planned_deadline, planned_start_date, work_plan, safety_notes, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (7, '#RC-7077', 37,
  'Ổ voi sụt lún nguy hiểm trên Quốc lộ 51 gần Ngã 3 Vũng Tàu',
  'Ổ voi kích thước lớn đường kính 1.8m, sâu 12cm khiến nhiều xe máy ngã khi trời tối.',
  '/uploads/incidents/large_pothole_crater.jpg',
  'POTHOLE', 'IN_PROGRESS', 'CRITICAL',
  12,
  NOW() + INTERVAL 12 HOUR, NOW() - INTERVAL 2 HOUR,
  'Dùng máy cào bóc vuông vắn 2.2m x 2.2m, lu lèn móng cấp phối đá dăm loại 1, tưới nhựa thấm bám 1.0kg/m2, thảm bê tông nhựa nóng C19 dày 7cm đầm chặt K98',
  'Bố trí 2 nhân viên cầm cờ hiệu điều tiết giao thông và rào chắn phản quang',
  10.92340000, 106.86540000,
  'Km 2+100 Quốc lộ 51, Phường Long Bình Tân, TP. Biên Hòa, Đồng Nai',
  'Cao tốc TP.HCM - Long Thành & QL51', 'Khu QLĐB IV (Phía Nam)',
  12, 0, NOW() - INTERVAL 24 HOUR, NOW() - INTERVAL 2 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (7, 'POTHOLE', 0.950, 90, 170, 700, 500, 52);

INSERT INTO assignments (incident_id, assigned_by_admin_id, assigned_to_staff_id, verified_category, priority, notes, assigned_at)
VALUES (7, 22, 26, 'POTHOLE', 'CRITICAL', 'Ưu tiên thi công khẩn cấp xử lý ổ voi tránh tai nạn nghiêm trọng.', NOW() - INTERVAL 6 HOUR);

-- #8: PENDING_ACCEPTANCE - Vá ổ gà cầu Phú Mỹ, đã nộp ảnh hoàn thành thảm nhựa phẳng đẹp
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, assigned_team_id, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (8, '#RC-8088', 37,
  'Ổ gà sâu đoạn dốc cầu Phú Mỹ hướng về Quận 7',
  'Mặt cầu đoạn chuyển tiếp mố bị bong bật tạo ổ gà cạnh khe co giãn.',
  '/uploads/incidents/pothole_mountain.jpg',
  'POTHOLE', 'PENDING_ACCEPTANCE', 'HIGH',
  12,
  10.74890000, 106.74560000,
  'Cầu Phú Mỹ, Phường Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh',
  'Cao tốc TP.HCM - Long Thành & QL51', 'Khu QLĐB IV (Phía Nam)',
  9, 0, NOW() - INTERVAL 36 HOUR, NOW() - INTERVAL 1 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (8, 'POTHOLE', 0.920, 130, 200, 630, 420, 44);

INSERT INTO assignments (incident_id, assigned_by_admin_id, assigned_to_staff_id, verified_category, priority, notes, assigned_at)
VALUES (8, 22, 26, 'POTHOLE', 'HIGH', 'Sửa chữa dứt điểm khe chuyển tiếp.', NOW() - INTERVAL 24 HOUR);

-- Ảnh bằng chứng hoàn công: Mặt đường vá mới phẳng phiu sạch sẽ
INSERT INTO resolutions (incident_id, staff_id, proof_image_url, notes, resolved_at, ai_verification_confidence, ai_verification_status)
VALUES (8, 26,
  '/uploads/incidents/fresh_asphalt_patch.jpg',
  'Đã cào bóc xử lý bù phụ mặt đường 2m x 1.5m bằng bê tông nhựa nóng C12.5 đầm lèn đạt độ chặt yêu cầu, bằng phẳng êm thuận.',
  NOW() - INTERVAL 1 HOUR, 0.965, 'VERIFIED_CLEAN');

-- #9: REWORK_REQUIRED - Vết rạn nứt kết cấu nút giao Long Thành cần thi công lại
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, assigned_team_id, rework_reason, rework_count, latitude, longitude, address, route_corridor, zone_name, upvote_count, created_at, updated_at)
VALUES (9, '#RC-9099', 37,
  'Vết rạn nứt kết cấu nút giao cao tốc Long Thành - Dầu Giây',
  'Vết nứt kéo dài dạng chân rết nguy cơ ảnh hưởng lớp móng gia cố xi măng.',
  '/uploads/incidents/alligator_crack_bridge.png',
  'ROAD_CRACK', 'REWORK_REQUIRED', 'HIGH',
  12,
  'Vết vá chưa phẳng, chênh cao > 2cm so với mặt đường hiện hữu, mép vá chưa được tưới nhựa dính bám kỹ.',
  1,
  10.78900000, 106.81230000,
  'Nút giao An Phú, Đường dẫn Cao tốc Long Thành - Dầu Giây, TP. Thủ Đức, TP. Hồ Chí Minh',
  'Cao tốc TP.HCM - Long Thành & QL51', 'Khu QLĐB IV (Phía Nam)',
  3, NOW() - INTERVAL 48 HOUR, NOW() - INTERVAL 2 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (9, 'ROAD_CRACK', 0.890, 140, 220, 610, 400, 43);

INSERT INTO assignments (incident_id, assigned_by_admin_id, assigned_to_staff_id, verified_category, priority, notes, assigned_at)
VALUES (9, 22, 26, 'ROAD_CRACK', 'HIGH', 'Yêu cầu lu lèn lại bề mặt đảm bảo độ phẳng.', NOW() - INTERVAL 30 HOUR);

-- #10: CLOSED - Cây ngã chắn ngang đường Pháp Vân, đã dọn sạch và đóng hồ sơ
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, assigned_team_id, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, resolved_at, closed_at, created_at, updated_at)
VALUES (10, '#RC-1010', 37,
  'Cây ngã chắn ngang đường gom cao tốc Pháp Vân - Cầu Giẽ',
  'Cây xà cừ cổ thụ gãy đổ chắn ngang toàn bộ 2 làn đường gom sau trận giông lốc.',
  '/uploads/incidents/tree_blocking_road.jpg',
  'ROAD_OBSTACLE', 'CLOSED', 'HIGH',
  10,
  20.89540000, 105.86780000,
  'Km 192+400 Đường gom Cao tốc Pháp Vân - Cầu Giẽ, Huyện Thường Tín, Hà Nội',
  'QL1A & Cao tốc HN - Hải Phòng', 'Khu QLĐB I (Miền Bắc)',
  15, 0,
  NOW() - INTERVAL 8 HOUR, NOW() - INTERVAL 2 HOUR,
  NOW() - INTERVAL 72 HOUR, NOW() - INTERVAL 2 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (10, 'ROAD_OBSTACLE', 0.980, 80, 150, 750, 520, 55);

INSERT INTO resolutions (incident_id, staff_id, proof_image_url, notes, resolved_at, ai_verification_confidence, ai_verification_status)
VALUES (10, 24,
  '/uploads/incidents/fresh_asphalt_patch.jpg',
  'Đã huy động cưa máy và xe cẩu giải tỏa thân cây trong vòng 90 phút, hoàn trả mặt đường sạch sẽ thông thoáng an toàn.',
  NOW() - INTERVAL 8 HOUR, 0.990, 'VERIFIED_CLEAN');

INSERT INTO feedbacks (incident_id, citizen_id, rating, comments, created_at)
VALUES (10, 37, 5, 'Lực lượng phản ứng rất nhanh! Cảm ơn các cán bộ đã thông xe cho người dân trước giờ cao điểm.', NOW() - INTERVAL 4 HOUR);

-- #11: DISPUTED - Ổ gà tái phát đầu cầu Đuống
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, assigned_team_id, flag, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (11, '#RC-1111', 37,
  'Ổ gà tái phát tại đầu cầu Đuống mới sau cơn mưa lớn',
  'Vết vá trước đây bị bong bọt nhựa tạo thành sống trâu và hố sâu nguy hiểm.',
  '/uploads/incidents/large_pothole_crater.jpg',
  'POTHOLE', 'PENDING_ACCEPTANCE', 'HIGH',
  12, 'DISPUTED',
  21.06540000, 105.89230000,
  'Đầu Cầu Đuống, Huyện Gia Lâm, Hà Nội',
  'QL1A & Cao tốc HN - Hải Phòng', 'Khu QLĐB I (Miền Bắc)',
  7, 1, NOW() - INTERVAL 50 HOUR, NOW() - INTERVAL 6 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (11, 'POTHOLE', 0.910, 120, 180, 650, 430, 45);

-- #12: REJECTED - Gạch lát sân nội bộ chung cư (Ngoài thẩm quyền đường bộ công cộng)
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, rejection_reason, latitude, longitude, address, upvote_count, rework_count, created_at, updated_at)
VALUES (12, '#RC-1212', 37,
  'Báo cáo hư hỏng gạch lát sân nội bộ chung cư',
  'Gạch lát sân nội bộ tòa nhà bị sụt lún sau cơn mưa to.',
  '/uploads/incidents/private_patio_tiles.png',
  'OTHER', 'REJECTED', 'LOW',
  'Sự cố nằm trong khuôn viên sân nội bộ công trình chung cư riêng, không thuộc phạm vi và thẩm quyền quản lý của mạng lưới hạ tầng đường bộ công cộng.',
  20.98540000, 105.79560000,
  'Khuôn viên Tòa nhà CT1, Ngõ 12 Phố Triều Khúc, Quận Thanh Xuân, Hà Nội',
  0, 0, NOW() - INTERVAL 60 HOUR, NOW() - INTERVAL 40 HOUR);

-- #13: POTENTIAL_DUPLICATE - Hố sâu ngã tư Giải Phóng - Kim Đồng
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, flag, latitude, longitude, address, route_corridor, zone_name, upvote_count, rework_count, created_at, updated_at)
VALUES (13, '#RC-1313', 37,
  'Hố sâu nguy hiểm ngã tư Giải Phóng - Kim Đồng',
  'Nhiều người dân phản ánh trùng lặp tại cùng vị trí giao cắt Giải Phóng - Kim Đồng.',
  '/uploads/incidents/large_pothole_crater.jpg',
  'POTHOLE', 'AI_ANALYZED', 'CRITICAL',
  'POTENTIAL_DUPLICATE',
  20.98210000, 105.84150000,
  'Ngã tư Giải Phóng - Kim Đồng, Quận Hoàng Mai, Hà Nội',
  'QL1A & Cao tốc HN - Hải Phòng', 'Khu QLĐB I (Miền Bắc)',
  8, 0, NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 2 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (13, 'POTHOLE', 0.788, 212, 410, 809, 310, 46);

-- #14: IN_PROGRESS (OVERDUE SLA) - Vết nứt trượt taluy đường ven biển Vũng Tàu
INSERT INTO incidents (id, ticket_code, citizen_id, title, description, image_url, category, status, severity, latitude, longitude, address, route_corridor, zone_name, assigned_team_id, planned_deadline, work_plan, safety_notes, delay_reason, upvote_count, rework_count, created_at, updated_at)
VALUES (14, '#RC-1414', 37,
  'Vết nứt trượt taluy đường ven biển Vũng Tàu (Quá hạn SLA)',
  'Công trình thi công chậm trễ do gặp mưa lớn kéo dài, đã quá thời hạn cam kết SLA.',
  '/uploads/incidents/talus_crack_coastal.png',
  'ROAD_CRACK', 'IN_PROGRESS', 'HIGH',
  10.34560000, 107.08760000,
  'Đường Hạ Long ven biển, Phường 2, TP. Vũng Tàu',
  'Cao tốc TP.HCM - Long Thành & QL51', 'Khu QLĐB IV (Phía Nam)',
  12,
  NOW() - INTERVAL 24 HOUR,
  'Gia cố taluy và thảm bù bê tông nhựa hạt trung C19',
  'Bố trí hàng rào tôn và đèn chớp ban đêm cảnh báo phương tiện',
  'Mưa bão lớn kéo dài 3 ngày liên tiếp khiến việc thảm bê tông nhựa nóng polymer không thể thực hiện, đang chờ mặt đường khô ráo.',
  4, 0, NOW() - INTERVAL 72 HOUR, NOW() - INTERVAL 12 HOUR);

INSERT INTO ai_detections (incident_id, class_name, confidence, bbox_x, bbox_y, bbox_width, bbox_height, inference_ms)
VALUES (14, 'ROAD_CRACK', 0.880, 120, 210, 610, 400, 40);

INSERT INTO assignments (incident_id, assigned_by_admin_id, assigned_to_staff_id, verified_category, priority, notes, assigned_at)
VALUES (14, 22, 26, 'ROAD_CRACK', 'HIGH', 'Tiến hành khắc phục ngay khi thời tiết nắng ráo.', NOW() - INTERVAL 48 HOUR);

-- THÔNG BÁO MẪU (NOTIFICATIONS)
INSERT INTO notifications (title, message, type, target_role, is_read, incident_id, ticket_code, created_at)
VALUES 
  ('Sự cố mới tiếp nhận', 'Công dân vừa gửi phản ánh hố ga mất nắp tại Ga Giáp Bát', 'WARNING', 'ROLE_ADMIN', false, 1, '#RC-1011', NOW() - INTERVAL 1 HOUR),
  ('Nhiệm vụ khảo sát mới', 'Bạn được phân công khảo sát hiện trường hầm chui Đại lộ Thăng Long', 'INFO', 'ROLE_STAFF', false, 3, '#RC-3033', NOW() - INTERVAL 4 HOUR),
  ('Yêu cầu thi công lại', 'Admin yêu cầu thi công lại vết nứt cao tốc Long Thành do chưa đạt độ phẳng', 'URGENT', 'ROLE_STAFF', false, 9, '#RC-9099', NOW() - INTERVAL 2 HOUR),
  ('Sự cố đã hoàn tất', 'Sự cố cây đổ tại đường gom Pháp Vân đã được đóng và nhận đánh giá 5 sao', 'SUCCESS', 'ROLE_ADMIN', true, 10, '#RC-1010', NOW() - INTERVAL 2 HOUR);

SET FOREIGN_KEY_CHECKS = 1;
