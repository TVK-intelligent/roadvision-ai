# NHỮNG VIỆC CẦN LÀM & TOÀN BỘ LOGIC NGHIỆP VỤ HỆ THỐNG ROADCARE
## BẢN HƯỚNG DẪN TRIỂN KHAI TOÀN DIỆN CHO ĐỒ ÁN TỐT NGHIỆP

> **Mục tiêu:** Quy định toàn bộ các quy tắc logic kỹ thuật bắt buộc phải có để hệ thống vận hành chính xác theo đúng 5 pha đề ra, cùng danh sách công việc chi tiết (Checklist/Roadmap) để bắt tay triển khai mã nguồn Backend (`BE`) và Frontend (`FE`).

---

# PHẦN I: TOÀN BỘ LOGIC NGHIỆP VỤ BẮT BUỘC PHẢI CÓ (CORE BUSINESS LOGIC)

Để hệ thống RoadCare không chỉ là một ứng dụng CRUD đơn thuần mà đạt chuẩn chất lượng của một đồ án tốt nghiệp kỹ sư CNTT xuất sắc, các khối logic kỹ thuật sau đây bắt buộc phải được hiện thực hóa đầy đủ:

---

## 1. LOGIC KIỂM ĐỊNH ĐẦU VÀO & BẢO VỆ TỆP ẢNH (INPUT & FILE INTEGRITY)

- **Quy chuẩn kích thước tệp:**
  - Giới hạn dung lượng tối đa cho mỗi tệp ảnh tải lên là $\le 10\text{ MB}$.
  - Cấu hình trong `application.yml` của Spring Boot:
    ```yaml
    spring:
      servlet:
        multipart:
          max-file-size: 10MB
          max-request-size: 15MB
    ```
- **Xác thực định dạng ảnh an toàn (MIME & Magic Bytes Check):**
  - Không chỉ kiểm tra đuôi mở rộng (`.jpg`, `.png`), hệ thống phải kiểm tra MIME-Type thực tế (`image/jpeg`, `image/png`, `image/webp`) và đọc vài byte đầu (Magic Bytes) để chống tấn công thực thi mã độc ẩn trong tệp tin (Polyglot File Attack).
- **Phòng chống tấn công Spam (Rate Limiting):**
  - Mỗi tài khoản người dân hoặc địa chỉ IP chỉ được phép nộp tối đa **5 báo cáo sự cố trong vòng 10 phút**. Nếu vượt quá, trả về mã lỗi HTTP `429 Too Many Requests`.

---

## 2. LOGIC RÀO CHẮN ĐỊA LÝ & BẢN ĐỒ (GEO-FENCING & SPATIAL VALIDATION)

- **Kiểm tra ranh giới phụ trách (Geofencing Guard):**
  - Khi người dân nộp tọa độ GPS `(latitude, longitude)`, hệ thống kiểm tra xem điểm tọa độ đó có nằm trong phạm vi ranh giới đô thị mà ban quản lý hạ tầng chịu trách nhiệm hay không (ví dụ hình chữ nhật bao phủ hoặc đa giác Polygon GeoJSON của khu vực đô thị).
  - *Công thức kiểm tra biên chữ nhật nhanh:*
    $$\text{MinLat} \le \text{Latitude} \le \text{MaxLat} \quad \text{và} \quad \text{MinLng} \le \text{Longitude} \le \text{MaxLng}$$
  - Nếu nằm ngoài phạm vi $\rightarrow$ Từ chối tiếp nhận ngay tại API với thông báo: *"Tọa độ phản ánh nằm ngoài địa bàn phụ trách bảo trì"*.
- **Phân giải địa chỉ tự động (Reverse Geocoding):**
  - Nhận tọa độ GPS và truy vấn dịch vụ bản đồ (OpenStreetMap Nominatim hoặc Google Geocoding API) để tự động điền chuỗi địa chỉ dễ đọc (ví dụ: *"120 Nguyễn Trãi, Phường Bến Thành, Quận 1"*) vào trường `address` của bảng `incidents`.

---

## 3. LOGIC XỬ LÝ TENSOR & NHÚNG MÔ HÌNH TRÍ TUỆ NHÂN TẠO (IN-PROCESS ONNX RUNTIME)

- **Cơ chế nạp mô hình một lần (Singleton Model Session):**
  - Mô hình `yolov8_roadcare.onnx` được nạp sẵn vào bộ nhớ ngay khi Spring Boot khởi động thông qua bean `@PostConstruct`. Không khởi tạo lại session sau mỗi request để tối ưu hiệu năng.
- **Tiền xử lý dữ liệu ảnh (Image Preprocessing Pipeline):**
  1. Đọc luồng byte ảnh thành đối tượng `BufferedImage`.
  2. Resize ảnh về chuẩn kích thước đầu vào của YOLO: $640 \times 640$ pixels.
  3. Chuẩn hóa ma trận điểm ảnh từ dải số nguyên $[0, 255]$ về số thực dấu phẩy động $[0.0, 1.0]$.
  4. Sắp xếp thứ tự kênh màu theo định dạng NCHW (Batch size = 1, Channels = 3 [R, G, B], Height = 640, Width = 640).
  5. Đổ dữ liệu vào vùng đệm `FloatBuffer` để tạo `OnnxTensor`.
- **Hậu xử lý kết quả suy luận & Thuật toán NMS (Non-Maximum Suppression):**
  1. Đọc tensor kết quả dạng $1 \times (4 + C) \times 8400$.
  2. Với mỗi ứng viên dự đoán, tính toán tọa độ hộp bao $(x_{min}, y_{min}, x_{max}, y_{max})$ đã quy đổi về kích thước ảnh gốc.
  3. Áp dụng thuật toán **NMS** với ngưỡng chồng lấn $\text{IoU} \ge 0.45$ để loại trừ các hộp nhận diện trùng lặp trên cùng một ổ gà, chỉ giữ lại hộp có độ tin cậy cao nhất.

---

## 4. LOGIC PHÂN NHÁNH QUYẾT ĐỊNH THEO NGƯỠNG TIN CẬY (CONFIDENCE GATE)

Hệ thống thiết lập ngưỡng an toàn $\mathbf{\tau = 70\%}$ ($0.70$):
- **Trường hợp $\text{Confidence} \ge 70\%$:**
  - Tự động gán nhãn loại hư hại (`category = 'POTHOLE'`, `'ROAD_CRACK'`, `'ROAD_OBSTACLE'`, hoặc `'ROAD_FLOODING'`).
  - Gán trạng thái: `status = 'AI_ANALYZED'`.
  - Lưu chi tiết hộp bao Bounding Box $[x, y, w, h]$, độ tin cậy và thời gian suy luận (latency ms) vào bảng `ai_detections`.
- **Trường hợp $\text{Confidence} < 70\%$ hoặc không tìm thấy vật thể:**
  - Giữ nguyên trạng thái ban đầu: `status = 'SUBMITTED'`.
  - Đánh dấu cờ cảnh báo: `flag = 'NEEDS_MANUAL_REVIEW'`.
  - Sự cố này sẽ được đẩy lên vị trí khẩn cấp trên màn hình Dispatch Queue để Admin kiểm duyệt thủ công bằng mắt.

---

## 5. LOGIC RÀNG BUỘC VÒNG ĐỜI & CHUYỂN TRẠNG THÁI (STATE MACHINE GUARDS)

Nghiêm cấm việc nhảy cóc trạng thái bất hợp pháp trong cơ sở dữ liệu. Mọi thay đổi trạng thái phải tuân thủ bảng ma trận chuyển dịch hợp lệ (Valid State Transitions):

| Trạng thái hiện tại | Các trạng thái đích được phép chuyển đến | Ai có quyền kích hoạt? | Điều kiện bắt buộc |
| :--- | :--- | :--- | :--- |
| `SUBMITTED` | `AI_ANALYZED`, `ASSIGNED`, `REJECTED` | AI Engine / Quản trị viên (Admin) | AI chạy xong hoặc Admin thẩm định thủ công |
| `AI_ANALYZED` | `ASSIGNED`, `REJECTED` | Quản trị viên (Admin) | Admin chọn Staff hoặc nhập lý do từ chối |
| `ASSIGNED` | `IN_PROGRESS` | Nhân viên kỹ thuật (`Staff`) | Staff được phân công bấm bắt đầu xử lý |
| `IN_PROGRESS` | `RESOLVED` | Nhân viên kỹ thuật (`Staff`) | Bắt buộc phải đính kèm tệp ảnh nghiệm thu |
| `RESOLVED` | `CLOSED`, `IN_PROGRESS` | Người dân (`Citizen`) / Admin | Chấm điểm sao hoặc khiếu nại yêu cầu sửa lại |
| `CLOSED` | *(Trạng thái kết thúc - Không thể đổi)* | - | Đã lưu trữ |
| `REJECTED` | *(Trạng thái kết thúc - Không thể đổi)* | - | Đã lưu trữ |

---

## 6. LOGIC NGHIỆM THU HIỆN TRƯỜNG BẰNG CHỨNG (PROOF OF WORK LOGIC)

- Khi kỹ thuật viên gọi API `POST /api/v1/incidents/{id}/resolve`:
  - **Bắt buộc** phải tải lên tệp ảnh hiện trường hoàn thiện (`proofImage`). Hệ thống không cho phép nghiệm thu mà không có hình ảnh minh chứng.
  - Tự động ghi nhận thời điểm hoàn tất `resolved_at = NOW()`.
  - Tính toán chỉ số viễn trắc **Thời gian khắc phục (Resolution Duration)**:
    $$\text{Duration} = \text{resolved\_at} - \text{created\_at}$$
    Chỉ số này phục vụ trực tiếp cho báo cáo thống kê KPI trên màn hình `roadcare_admin_control_center_analytics`.

---

## 7. LOGIC TỰ ĐỘNG ĐÓNG PHIẾU ĐỊNH KỲ (AUTO-CLOSURE CRON JOB)

- Nhằm giải quyết triệt để tình trạng phiếu tồn đọng do người dân quên không bấm nghiệm thu sau khi đường đã sửa xong:
  - Spring Boot thiết lập tác vụ chạy ngầm định kỳ:
    ```java
    @Scheduled(cron = "0 0 2 * * ?") // Chạy vào lúc 02:00 sáng mỗi ngày
    public void autoCloseResolvedIncidents() { ... }
    ```
  - Logic: Quét toàn bộ các sự cố có trạng thái `RESOLVED` mà thời điểm `resolved_at` đã trôi qua **hơn 7 ngày (168 giờ)** $\rightarrow$ Tự động chuyển `status = 'CLOSED'`, ghi nhận đánh giá mặc định 5 sao và chú thích: *"Hệ thống tự động đóng phiếu sau 7 ngày theo quy chế đô thị"*.

---

# PHẦN II: DANH SÁCH NHỮNG VIỆC CẦN LÀM (DEVELOPMENT ROADMAP & CHECKLIST)

---

## 1. CÁC VIỆC CẦN LÀM CHO BACKEND (`BE/` - SPRING BOOT + ONNX)

### Giai đoạn B1: Khởi tạo Kiến trúc Nền tảng (Foundation Setup)
- [ ] **B1.1:** Khởi tạo cấu trúc Maven/Gradle dự án Spring Boot 3.3.x với Java 17/21.
- [ ] **B1.2:** Khai báo các thư viện phụ thuộc:
  - `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-validation`.
  - `mysql-connector-j` (kết nối cơ sở dữ liệu MySQL).
  - `com.microsoft.onnxruntime:onnxruntime:1.18.0` (thực thi mô hình AI).
  - `io.jsonwebtoken:jjwt-api:0.12.5` (xử lý Token JWT).
  - `org.springdoc:springdoc-openapi-starter-webmvc-ui` (tạo giao diện Swagger/OpenAPI tự động).
- [ ] **B1.3:** Thực thi file `workflow/06_database_schema_design.sql` trên máy chủ MySQL nội bộ để tạo toàn bộ bảng và dữ liệu mẫu.
- [ ] **B1.4:** Tạo các Entity JPA: `User`, `Incident`, `AiDetection`, `Assignment`, `Resolution`, `Feedback`.

### Giai đoạn B2: Tầng Bảo mật & Xác thực (Security & JWT)
- [ ] **B2.1:** Viết `JwtTokenProvider` (tạo và kiểm tra tính hợp lệ của token).
- [ ] **B2.2:** Cài đặt `JwtAuthenticationFilter` để chặn và xác thực Header `Authorization: Bearer <token>`.
- [ ] **B2.3:** Cấu hình `SecurityFilterChain` theo đúng thiết kế trong `04_raci_and_rbac_matrix.md`, kích hoạt `@EnableMethodSecurity`.
- [ ] **B2.4:** Viết API Đăng nhập / Đăng ký: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`.

### Giai đoạn B3: Tích hợp Động cơ Trí tuệ Nhân tạo ONNX Runtime
- [ ] **B3.1:** Chuẩn bị tệp mô hình `yolov8_roadcare.onnx` (đặt trong thư mục `src/main/resources/models/`).
- [ ] **B3.2:** Viết lớp dịch vụ `YoloModelLoader` khởi tạo `OrtEnvironment` và `OrtSession`.
- [ ] **B3.3:** Viết lớp tiện ích xử lý ảnh `ImageTensorUtil`:
  - Đọc `BufferedImage` từ `MultipartFile`.
  - Resize $640 \times 640$, chuẩn hóa $[0, 1]$, tạo mảng float NCHW.
- [ ] **B3.4:** Viết giải thuật giải mã Bounding Box và thuật toán lọc chồng lấn **NMS (Non-Maximum Suppression)**.
- [ ] **B3.5:** Viết lớp `AiInferenceService` nhận ảnh, trả về danh sách đối tượng phát hiện (`className`, `confidence`, `bbox`, `latencyMs`).

### Giai đoạn B4: Xây dựng Nghiệp vụ Sự cố & API Endpoints (5 Pha)
- [ ] **B4.1:** Viết `FileStorageService` để lưu trữ ảnh gốc và ảnh nghiệm thu vào thư mục tĩnh hoặc máy chủ lưu trữ.
- [ ] **B4.2 (Pha 1 & 2):** Xây dựng `POST /api/v1/incidents`:
  - Validate file size $\le 10\text{ MB}$, định dạng ảnh, Geofence GPS.
  - Gọi `AiInferenceService`. Nếu confidence $\ge 70\% \rightarrow$ gán nhãn & `AI_ANALYZED`; nếu $< 70\% \rightarrow$ gắn cờ `NEEDS_MANUAL_REVIEW`.
- [ ] **B4.3 (Pha 3):** Xây dựng các API cho Quản trị viên:
  - `GET /api/v1/incidents` (tìm kiếm, phân trang, lọc theo trạng thái/loại lỗi).
  - `GET /api/v1/incidents/{id}` (lấy toàn bộ hồ sơ chi tiết Dossier).
  - `PATCH /api/v1/incidents/{id}/assign` (duyệt và phân công kỹ thuật viên).
  - `POST /api/v1/incidents/{id}/reject` (từ chối báo cáo không hợp lệ).
- [ ] **B4.4 (Pha 4):** Xây dựng các API cho Kỹ thuật viên:
  - `GET /api/v1/incidents/assigned-to-me` (danh sách việc cần làm).
  - `PATCH /api/v1/incidents/{id}/status` (chuyển sang `IN_PROGRESS`).
  - `POST /api/v1/incidents/{id}/resolve` (tải ảnh nghiệm thu Proof of Work $\rightarrow$ chuyển `RESOLVED`).
- [ ] **B4.5 (Pha 5):** Xây dựng API cho Công dân:
  - `GET /api/v1/incidents/my` (danh sách phản ánh của tôi).
  - `POST /api/v1/incidents/{id}/close` (đánh giá sao và đóng phiếu $\rightarrow$ chuyển `CLOSED`).
- [ ] **B4.6:** Cài đặt tác vụ ngầm `@Scheduled` quét tự động đóng các phiếu `RESOLVED` sau 7 ngày.

---

## 2. CÁC VIỆC CẦN LÀM CHO FRONTEND (`FE/` - REACT + TAILWINDCSS)

### Giai đoạn F1: Thiết lập Khung Ứng dụng & Định Tuyến (Project Setup & Routing)
- [ ] **F1.1:** Khởi tạo dự án React bằng Vite: `npm create vite@latest . -- --template react-ts`.
- [ ] **F1.2:** Cài đặt TailwindCSS và cấu hình bộ bảng màu chuẩn của RoadCare (đã có trong thẻ `<script id="tailwind-config">` của các tệp HTML Stitch):
  - Màu chủ đạo: `primary: "#004ac6"`, `secondary: "#006398"`, `surface: "#f8f9ff"`.
  - Phông chữ: `Plus Jakarta Sans`, `Inter`, `JetBrains Mono`.
- [ ] **F1.3:** Cài đặt các thư viện bổ trợ:
  - `react-router-dom` (điều hướng trang).
  - `axios` (gọi RESTful API).
  - `leaflet` & `react-leaflet` (hiển thị bản đồ tương tác sự cố).
- [ ] **F1.4:** Thiết lập `AuthContext` lưu trữ JWT Token, thông tin người dùng và quyền hạn (Role: Citizen, Admin, Staff).

### Giai đoạn F2: Chuyển Đổi & Ghép Nối Giao Diện Stitch UI vào React
- [ ] **F2.1:** Tạo thanh Header điều hướng chung (`Navbar`) và thanh công cụ bên (`Sidebar`) đồng bộ từ `stitch_roadcare_incident_management_ui`.
- [ ] **F2.2 (Trang chủ):** Chuyển đổi mã nguồn `roadcare_ai_road_incident_platform_home/code.html` thành component `HomePage.tsx`.
- [ ] **F2.3 (Pha 1 & 2 - Nộp báo cáo):** Chuyển đổi `report_road_incident_ai_vision_scanner/code.html` thành `ReportIncidentPage.tsx`:
  - Tích hợp HTML5 Geolocation API để tự động lấy tọa độ kinh/vĩ độ của thiết bị.
  - Vùng kéo thả ảnh / Chụp ảnh camera.
  - Sau khi nộp $\rightarrow$ Nhận kết quả từ Backend và hiển thị ngay lớp phủ Bounding Box AI màu xanh `#004ac6` lên khung hình.
- [ ] **F2.4 (Pha 3 - Quản trị điều phối):** Chuyển đổi `municipal_incident_management_dispatch_queue_roadcare/code.html` thành `AdminDispatchQueuePage.tsx`:
  - Hiển thị 4 thẻ chỉ số nhanh (Critical SLA, AI Confidence Median, Active Crew, Mean Speed).
  - Bảng dữ liệu sự cố kèm thanh tìm kiếm, bộ lọc trạng thái và loại sự cố.
  - Hộp thoại (Modal) chọn kỹ thuật viên và mức độ ưu tiên để phân công.
- [ ] **F2.5 (Pha 3, 4 & 5 - Hồ sơ chi tiết):** Chuyển đổi `incident_rc_8942_detailed_dossier_roadcare/code.html` thành `IncidentDossierPage.tsx`:
  - Thanh tiến trình 7 bước (7-Stage Processing Lifecycle) tự động sáng đèn theo trạng thái thực tế.
  - Bản đồ tương tác Leaflet hiển thị đúng tọa độ của sự cố.
  - Nút phân quyền tương ứng theo người dùng đang đăng nhập:
    - Nếu là Staff: Nút *"Bắt đầu thi công"* và form nộp ảnh *"Nghiệm thu hoàn tất"*.
    - Nếu là Citizen: Khung trượt đối chiếu ảnh Before/After và bộ chọn đánh giá 1-5 sao kèm nhận xét.
- [ ] **F2.6 (Pha 1 & 5 - Lịch sử của tôi):** Chuyển đổi `my_submitted_reports_roadcare/code.html` thành `MyReportsPage.tsx`.

### Giai đoạn F3: Kiểm Thử Tích Hợp Toàn Diện (End-to-End Integration Testing)
- [ ] **F3.1:** Kiểm thử kịch bản Người dân đăng nhập $\rightarrow$ Chụp ảnh ổ gà $\rightarrow$ Gửi thành công $\rightarrow$ AI tự gán `POTHOLE` (Confidence $\ge 70\%$).
- [ ] **F3.2:** Kiểm thử kịch bản Quản trị viên mở Dispatch Queue $\rightarrow$ Xem hồ sơ sự cố $\rightarrow$ Phân công cho Nhân viên Đội 4.
- [ ] **F3.3:** Kiểm thử kịch bản Nhân viên đăng nhập $\rightarrow$ Bấm *"Bắt đầu xử lý"* $\rightarrow$ Tải ảnh nghiệm thu $\rightarrow$ Trạng thái chuyển sang `RESOLVED`.
- [ ] **F3.4:** Kiểm thử kịch bản Người dân vào mục *My Reports* $\rightarrow$ Đối chiếu ảnh Trước/Sau $\rightarrow$ Đánh giá 5 sao $\rightarrow$ Trạng thái chuyển sang `CLOSED`.
