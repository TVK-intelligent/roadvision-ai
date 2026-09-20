# BẢN ĐỒ ÁNH XẠ GIAO DIỆN STITCH UI VÀO QUY TRÌNH 5 PHA
## HỆ THỐNG ROADCARE - QUẢN LÝ SỰ CỐ GIAO THÔNG THÔNG MINH

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp & Hướng dẫn Tích hợp Frontend (`FE`) với Backend (`BE`)  
> **Thư mục nguồn UI:** `stitch_roadcare_incident_management_ui/stitch_roadcare_incident_management_ui/`

---

## 1. TỔNG QUAN ÁNH XẠ CÁC MÀN HÌNH

Hệ thống đã có sẵn bộ thiết kế giao diện hoàn chỉnh chuẩn TailwindCSS & HTML5 trong thư mục `stitch_roadcare_incident_management_ui`. Bảng dưới đây thể hiện sự liên kết giữa từng màn hình thiết kế với các pha nghiệp vụ trong quy trình 5 pha và các API tương ứng:

| Tên thư mục màn hình Stitch UI | Pha nghiệp vụ tương ứng | Vai trò người dùng | API kết nối chính |
| :--- | :--- | :--- | :--- |
| **`roadcare_ai_road_incident_platform_home`** | Trang chủ & Cổng thông tin công cộng | Tất cả (Khách vãng lai, Công dân) | `GET /api/v1/incidents/public-stats` |
| **`report_road_incident_ai_vision_scanner`** | **Pha 1 & Pha 2** (Tiếp nhận & AI Scan) | Người dân (`ROLE_CITIZEN`) | `POST /api/v1/incidents` |
| **`my_submitted_reports_roadcare`** | **Pha 1 & Pha 5** (Theo dõi & Nghiệm thu) | Người dân (`ROLE_CITIZEN`) | `GET /api/v1/incidents/my`<br>`POST /api/v1/incidents/{id}/close` |
| **`municipal_incident_management_dispatch_queue_roadcare`** | **Pha 3** (Kiểm duyệt & Điều phối) | Quản trị viên (`ROLE_ADMIN`) | `GET /api/v1/incidents`<br>`PATCH /api/v1/incidents/{id}/assign` |
| **`incident_rc_8942_detailed_dossier_roadcare`** | **Pha 3, 4 & 5** (Hồ sơ toàn cảnh sự cố) | Admin, Staff & Citizen | `GET /api/v1/incidents/{id}`<br>`POST /api/v1/incidents/{id}/resolve` |
| **`roadcare_admin_control_center_analytics`** | Báo cáo & Phân tích tổng thể KPI | Quản trị viên (`ROLE_ADMIN`) | `GET /api/v1/admin/analytics` |
| **`roadcare_ai_incident_engine`** | Giám sát viễn trắc AI Model | Quản trị viên (`ROLE_ADMIN`) | `GET /api/v1/ai/telemetry` |

---

## 2. CHI TIẾT KHỚP NỐI THEO TỪNG MÀN HÌNH CỐT LÕI

### 2.1. Màn hình tiếp nhận phản ánh & AI Vision Scanner
- **Thư mục:** `report_road_incident_ai_vision_scanner/`
- **Mã nguồn gốc:** `code.html`
- **Thành phần UI tương tác:**
  - **Khung thả ảnh (Dropzone & Vision Canvas):** Nhận diện kéo thả ảnh hoặc chụp từ camera di động.
  - **Lớp phủ Bounding Box AI:** Thẻ `id="ai-bounding-box"` vẽ khung định vị ổ gà (xanh dương `#004ac6`), kèm nhãn `POTHOLE (94.7%)`.
  - **Thanh tiến trình 4 giai đoạn:**
    - `Stage 1: Upload Photo / Feed`
    - `Stage 2: Neural Scan & Classify`
    - `Stage 3: Location & Spatial Triage`
    - `Stage 4: Dispatch & Archive`
  - **Chỉ số viễn trắc AI:** Huy hiệu `TENSOR-RT ACCELERATOR`, độ trễ `Latency: 42ms`, phiên bản mô hình `YOLOv8-RoadCare v2.4 Active`.
- **Ánh xạ sự kiện React Frontend:**
  - Khi người dùng chọn file $\rightarrow$ Gửi lên endpoint `POST /api/v1/incidents`.
  - Nhận phản hồi $\rightarrow$ Cập nhật tọa độ Bounding Box vào style `top`, `left`, `width`, `height` của thẻ `#ai-bounding-box`.

---

### 2.2. Hàng đợi điều phối của Quản trị viên (Dispatch Queue)
- **Thư mục:** `municipal_incident_management_dispatch_queue_roadcare/`
- **Mã nguồn gốc:** `code.html`
- **Thành phần UI tương tác:**
  - **Thẻ chỉ số Telemetry Strip:**
    - `Critical SLA At Risk` (Cảnh báo sự cố khẩn cấp).
    - `AI Confidence Median` (Độ tin cậy trung bình của AI, ví dụ 96.8%).
    - `Active Crew Dispatches` (Số đội bảo trì đang thi công thực địa).
    - `Mean Resolution Speed` (Thời gian khắc phục trung bình, ví dụ 4.2 giờ).
  - **Bộ lọc đa tiêu chí:**
    - Tìm kiếm theo mã Ticket (`#RC-...`), tên đường, người báo cáo.
    - Lọc theo loại hư hại: `POTHOLE`, `CRACK`, `OBSTACLE`, `FLOODING`.
    - Lọc theo trạng thái: `SUBMITTED`, `AI_ANALYZED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
  - **Bảng danh sách sự cố:** Nút hành động nhanh *Assign*, *Inspect*, *Reject*.
- **Ánh xạ sự kiện React Frontend:**
  - Khi Admin thay đổi bộ lọc $\rightarrow$ Gọi API `GET /api/v1/incidents?status=...&category=...`.
  - Nút phân công nhanh $\rightarrow$ Mở modal chọn Staff và gọi `PATCH /api/v1/incidents/{id}/assign`.

---

### 2.3. Hồ sơ chi tiết sự cố (Detailed Incident Dossier #RC-8942)
- **Thư mục:** `incident_rc_8942_detailed_dossier_roadcare/`
- **Mã nguồn gốc:** `code.html`
- **Thành phần UI tương tác:**
  - **Timeline tiến trình 7 bước (7-Stage Processing Lifecycle):**
    1. `1. Submitted` (Thời điểm người dân gửi).
    2. `2. AI Analyzed` (Thời điểm hoàn thành suy luận YOLOv8).
    3. `3. Verified` (Thời điểm Quản trị viên thẩm định).
    4. `4. Assigned` (Giao cho Đội bảo dưỡng #4).
    5. `5. In Progress` (Trạng thái đang thi công lu lèn mặt đường).
    6. `6. Resolved` (Đã khắc phục xong, tải ảnh Proof of Work).
    7. `7. Closed` (Nghiệm thu trọn vẹn).
  - **Hai khung so sánh trực quan:**
    - Khung ảnh ban đầu kèm tọa độ Bounding Box của hố sụt.
    - Khung bản đồ vệ tinh OpenStreetMap hiển thị chính xác vị trí GPS của ổ gà.
  - **Nút tải chứng nhận & xuất GeoJSON:** Hỗ trợ trích xuất dữ liệu phục vụ báo cáo cơ quan giao thông.
- **Ánh xạ sự kiện React Frontend:**
  - Hiển thị dữ liệu trả về từ `GET /api/v1/incidents/{id}`.
  - Nếu đăng nhập với quyền `Staff`: Hiển thị nút bấm *"Tải ảnh nghiệm thu"* kích hoạt `POST /resolve`.
  - Nếu đăng nhập với quyền `Citizen`: Hiển thị bảng đánh giá sao và nút *"Xác nhận đóng sự cố"* kích hoạt `POST /close`.

---

### 2.4. Danh sách phản ánh của công dân (My Reports)
- **Thư mục:** `my_submitted_reports_roadcare/`
- **Mã nguồn gốc:** `code.html`
- **Thành phần UI tương tác:**
  - Thống kê tổng số báo cáo của cá nhân: Đã gửi (`Total Submitted`), Đang xử lý (`In Resolution`), Đã hoàn tất (`Resolved`).
  - Danh sách thẻ sự cố với huy hiệu màu sắc tương ứng theo tiến độ.
  - Nút bấm xem lại ảnh Before / After và gửi phản hồi chấm điểm sao.
