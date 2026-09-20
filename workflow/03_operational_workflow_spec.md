# ĐẶC TẢ KỸ THUẬT QUY TRÌNH VẬN HÀNH 5 PHA (OPERATIONAL WORKFLOW SPECIFICATION)
## HỆ THỐNG ROADCARE - QUẢN LÝ SỰ CỐ GIAO THÔNG THÔNG MINH

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp - Chương 3: Phân Tích & Thiết Kế Luồng Nghiệp Vụ  
> **Tác giả:** Nhóm phát triển RoadCare  
> **Cập nhật lần cuối:** 2026-09-07  

---

## 1. TỔNG QUAN VỀ QUY TRÌNH 5 PHA

Hệ thống RoadCare hoạt động xoay quanh chu trình khép kín gồm 5 pha kỹ thuật liên hoàn, giải quyết triệt để bài toán từ lúc người dân phát hiện chướng ngại/hư hại mặt đường cho đến khi sự cố được đơn vị bảo trì khắc phục và nghiệm thu hoàn tất:

```
[ Pha 1: Tiếp nhận ] ──> [ Pha 2: AI Phân tích ] ──> [ Pha 3: Thẩm định & Giao việc ]
                                                                   │
[ Pha 5: Nghiệm thu & Đóng ] <── [ Pha 4: Thi công thực địa ] <────┘
```

---

## 2. PHA 1: TIẾP NHẬN PHẢN ÁNH (INGESTION PHASE)

### 2.1. Mục tiêu
Tiếp nhận an toàn, nhanh chóng và chuẩn xác dữ liệu sự cố từ người dân thông qua thiết bị di động hoặc trình duyệt web, đảm bảo dữ liệu đầu vào sạch, có tọa độ địa lý hợp lệ trước khi chuyển sang các tầng xử lý kế tiếp.

### 2.2. Tác nhân & Quyền hạn
- **Tác nhân thực hiện:** Người dân (`Citizen`).
- **Quyền hạn hệ thống:** Đã đăng nhập (`ROLE_CITIZEN`) kèm mã định danh Token JWT trong Header. Hỗ trợ trường hợp người dân gửi nặc danh nếu cấu hình hệ thống mở cho phép (kèm số điện thoại xác minh).

### 2.3. Tiền điều kiện (Preconditions)
1. Ứng dụng React Client đã lấy được quyền truy cập Geolocation từ thiết bị của người dùng (HTML5 Geolocation API).
2. Camera hoặc tệp ảnh trong bộ nhớ thiết bị sẵn sàng để tải lên.

### 2.4. Luồng sự kiện chính (Main Success Scenario)
1. **Bước 1 (Thu thập hình ảnh):** Người dân kích hoạt tính năng nộp báo cáo trên Client, chụp ảnh trực tiếp tại hiện trường mặt đường hoặc chọn ảnh từ thư viện.
2. **Bước 2 (Trích xuất tọa độ tự động):** Trình duyệt gọi hàm `navigator.geolocation.getCurrentPosition()`. Hệ thống tự động điền `latitude` (vĩ độ) và `longitude` (kinh độ) với độ chính xác theo chuẩn GPS (thường dưới 10m).
3. **Bước 3 (Bổ sung mô tả):** Người dân nhập ghi chú ngắn gọn (ví dụ: *"Ổ gà sâu khoảng 15cm trước số nhà 120 đường Nguyễn Trãi, gây nguy hiểm cho xe máy"*).
4. **Bước 4 (Gửi yêu cầu):** React Client đóng gói dữ liệu dạng `multipart/form-data` và gửi yêu cầu `POST /api/v1/incidents` tới Spring Boot Backend.
5. **Bước 5 (Kiểm tra & Validate tại Gateway/Filter):**
   - **Kiểm tra kích thước:** Dung lượng tệp ảnh không vượt quá $10\text{ MB}$ (cấu hình `spring.servlet.multipart.max-file-size=10MB`).
   - **Kiểm tra định dạng:** Chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`.
   - **Kiểm tra Geofence:** Tọa độ GPS phải nằm trong ranh giới địa lý hành chính mà ban quản lý đô thị chịu trách nhiệm (ví dụ khu vực TP. Hồ Chí Minh: $10.375^\circ \le \text{Lat} \le 11.160^\circ$ và $106.363^\circ \le \text{Lng} \le 107.025^\circ$).
6. **Bước 6 (Lưu trữ ảnh sơ bộ):** Spring Boot lưu trữ tệp ảnh vật lý vào hệ thống lưu trữ tệp (Local Storage/MinIO/S3), khởi tạo bản ghi trong bảng `incidents` với trạng thái ban đầu `SUBMITTED`.

### 2.5. Luồng ngoại lệ (Exception Flows)
- **E1.1 - Tệp ảnh quá lớn (> 10MB):** Backend ngắt kết nối, trả về `413 Payload Too Large`. Client hiển thị thông báo yêu cầu chụp lại hoặc giảm độ phân giải.
- **E1.2 - Tọa độ ngoài phạm vi phụ trách:** Backend trả về `422 Unprocessable Entity` với thông điệp: *"Vị trí phản ánh nằm ngoài phạm vi bảo trì hạ tầng của địa bàn"*.
- **E1.3 - Phát hiện Spam/Tần suất cao:** Nếu cùng một tài khoản nộp trên 5 báo cáo trong vòng 60 giây, bộ lọc `RateLimiter` chặn với mã lỗi `429 Too Many Requests`.

### 2.6. Hậu điều kiện (Postconditions)
- Sự cố được lưu vào cơ sở dữ liệu với trạng thái `SUBMITTED`.
- Dữ liệu byte array của ảnh được chuyển ngay lập tức sang **Pha 2** để thực thi mô hình AI.

---

## 3. PHA 2: PHÂN TÍCH & PHÂN LOẠI TỰ ĐỘNG (AI INFERENCE PHASE)

### 3.1. Mục tiêu
Tự động quét bức ảnh bằng mạng nơ-ron học sâu (Deep Neural Network), phát hiện chính xác vị trí, kích thước và phân loại sự cố hư hỏng mặt đường mà không cần sự can thiệp thủ công của con người ở bước đầu.

### 3.2. Tác nhân & Công nghệ
- **Tác nhân:** Spring Boot AI Service kết hợp thư viện **ONNX Runtime Java (`com.microsoft.onnxruntime:onnxruntime`)**.
- **Mô hình máy học:** Kiến trúc **YOLOv8-RoadCare** đã huấn luyện và xuất ra định dạng `.onnx`. Chạy in-process trực tiếp trên nền tảng Java Virtual Machine (JVM), tận dụng tối đa CPU đa luồng (OpenMP) hoặc GPU CUDA nếu có, loại bỏ hoàn toàn độ trễ mạng và chi phí duy trì tiến trình Flask/FastAPI (Python) độc lập.

### 3.3. Các bước xử lý kỹ thuật (Deep Pipeline)

```
[Ảnh gốc JPEG/PNG] ──> [Resize 640x640] ──> [Normalize RGB (0..1)] ──> [NCHW FloatBuffer Tensor]
                                                                               │
[Output: Bounding Boxes + Confidence] <── [NMS IoU >= 0.45] <── [ONNX Model Forward Pass]
```

1. **Tiền xử lý (Image Preprocessing):**
   - Đọc ảnh thông qua `BufferedImage`.
   - Resize tỷ lệ ảnh về kích thước chuẩn đầu vào của mô hình: $640 \times 640$ pixel.
   - Trích xuất 3 kênh màu Red, Green, Blue; chuẩn hóa giá trị điểm ảnh từ $[0, 255]$ về $[0.0, 1.0]$.
   - Đóng gói thành tensor 4 chiều định dạng NCHW (`FloatBuffer` dung lượng $1 \times 3 \times 640 \times 640$).
2. **Thực thi suy luận (Inference Execution):**
   - Khởi tạo session với model: `OrtSession.run(Collections.singletonMap("images", inputTensor))`.
   - Đo đạc thời gian suy luận (Inference Latency), trung bình từ $30\text{ms} - 50\text{ms}$ trên CPU thông thường.
3. **Hậu xử lý (Postprocessing & NMS):**
   - Đọc ma trận kết quả dự đoán với kích thước chuẩn YOLO: $1 \times (4 + C) \times 8400$, trong đó $4$ tọa độ hộp bao $(x_{center}, y_{center}, width, height)$ và $C$ xác suất của các lớp sự cố.
   - Thuật toán Non-Maximum Suppression (NMS) với ngưỡng chồng lấn Intersection-over-Union $\text{IoU} \ge 0.45$ để triệt tiêu các hộp nhận diện dư thừa, giữ lại hộp có điểm số cao nhất.
4. **Phân nhánh Logic Ngưỡng tin cậy (Confidence Decision Gate):**
   - **Nhánh A (Độ tin cậy $\ge 70\%$):**
     - Tự động gán nhãn sự cố vào một trong các lớp:
       - `POTHOLE` (Ổ gà / Hố sụt mặt đường)
       - `ROAD_CRACK` (Vết rạn nứt kết cấu mặt đường)
       - `ROAD_OBSTACLE` (Chướng ngại vật / Rác thải cản trở)
       - `ROAD_FLOODING` (Điểm ngập úng cục bộ)
     - Cập nhật trạng thái sự cố sang: `AI_ANALYZED`.
     - Ghi nhận chi tiết tọa độ Bounding Box $[x, y, w, h]$, độ tin cậy (ví dụ: $94.7\%$) và thời gian xử lý ($42\text{ms}$) vào bảng `ai_detections`.
   - **Nhánh B (Độ tin cậy $< 70\%$ hoặc không phát hiện dị vật):**
     - Giữ nguyên trạng thái `SUBMITTED`.
     - Bật cờ cảnh báo: `flag = 'NEEDS_MANUAL_REVIEW'`.
     - Phản ánh này sẽ được đẩy lên đầu danh sách ưu tiên kiểm tra bằng mắt của Quản trị viên.

### 3.4. Hậu điều kiện (Postconditions)
- Trả về mã phản hồi `201 Created` cho React Client kèm tóm tắt kết quả AI: `{ incidentId: 8942, status: "AI_ANALYZED", aiSummary: { class: "POTHOLE", confidence: 0.947 } }`.
- Người dân trên giao diện thấy ngay nhãn sự cố và mã số phiếu để theo dõi.

---

## 4. PHA 3: THẨM ĐỊNH & ĐIỀU PHỐI (TRIAGE & ASSIGNMENT PHASE)

### 4.1. Mục tiêu
Cung cấp công cụ trực quan hóa cho Quản trị viên đô thị (Admin/Dispatcher) thẩm định tính xác thực của sự cố, đối chiếu kết quả máy học với hiện trường thực tế, và chỉ định đội kỹ thuật xử lý thích hợp nhất.

### 4.2. Tác nhân & Giao diện
- **Tác nhân:** Quản trị viên vận hành đô thị (`Admin` / `Dispatcher`).
- **Màn hình tương ứng:** `municipal_incident_management_dispatch_queue_roadcare` & `incident_rc_8942_detailed_dossier_roadcare`.

### 4.3. Các bước nghiệp vụ
1. **Duyệt danh sách sự cố chờ xử lý:**
   - Admin truy cập trang Dispatch Queue, lọc các sự cố có trạng thái `AI_ANALYZED` hoặc gắn cờ `NEEDS_MANUAL_REVIEW`.
   - Hệ thống hiển thị bảng với các chỉ số viễn trắc (Telemetry Metrics): Độ khẩn cấp (SLA), Tên đường, Thời gian nộp, Độ tin cậy AI.
2. **Kiểm tra hồ sơ chi tiết (Incident Dossier):**
   - Admin mở hồ sơ chi tiết `#RC-8942`.
   - Màn hình hiển thị 2 bảng đối chiếu song song:
     - **Bên trái:** Ảnh chụp hiện trường có lớp phủ vẽ Bounding Box màu xanh của AI, nhãn `POTHOLE (94.7%)`.
     - **Bên phải:** Bản đồ tương tác vệ tinh/vector (OpenStreetMap + Leaflet), hiển thị chính xác vị trí cột mốc GPS, địa chỉ số nhà, và bán kính các đội bảo trì xung quanh.
3. **Quyết định thẩm định:**
   - **Trường hợp hợp lệ:** Admin xác nhận loại sự cố (giữ nguyên nhãn AI đề xuất hoặc chọn ghi đè nếu AI phân loại nhầm giữa ổ gà và nứt đường).
   - **Trường hợp không hợp lệ:** Admin nhấn *"Từ chối phản ánh"* (`POST /api/v1/incidents/{id}/reject`), nhập lý do (ảnh mờ không thấy đường, hành vi spam, khu vực thuộc dự án tư nhân không thuộc quyền quản lý). Trạng thái chuyển thành `REJECTED`.
4. **Phân công kỹ thuật viên (Dispatch Assignment):**
   - Admin chọn nhân viên kỹ thuật từ menu thả xuống (Dropdown hiển thị tên nhân viên, đội bảo trì, số lượng việc đang phụ trách).
   - Chọn mức độ ưu tiên: `CRITICAL` (xử lý trong 4h), `HIGH` (24h), `NORMAL` (72h).
   - Nhấn *"Xác nhận phân công"* $\rightarrow$ Client gửi `PATCH /api/v1/incidents/{id}/assign`.

### 4.4. Hậu điều kiện
- Trạng thái sự cố chuyển thành `ASSIGNED`.
- Bản ghi mới được tạo trong bảng `assignments`.
- Hệ thống gửi thông báo đẩy (Web Notification/SMS/App Alert) tới tài khoản của nhân viên kỹ thuật được giao việc.

---

## 5. PHA 4: THỰC THI TẠI HIỆN TRƯỜNG (EXECUTION & RESOLUTION PHASE)

### 5.1. Mục tiêu
Kỹ thuật viên hiện trường tiếp nhận nhiệm vụ, di chuyển đến tọa độ được chỉ định, thực hiện sửa chữa, khắc phục sự cố mặt đường và tải lên ảnh nghiệm thu hoàn tất.

### 5.2. Tác nhân & Giao diện
- **Tác nhân:** Nhân viên kỹ thuật / Đội bảo trì cầu đường (`Staff`).
- **Thiết bị:** Ứng dụng di động hoặc máy tính bảng hiện trường.

### 5.3. Các bước nghiệp vụ
1. **Tiếp nhận nhiệm vụ:**
   - Nhân viên đăng nhập hệ thống, truy cập mục danh sách nhiệm vụ được giao (`GET /api/v1/incidents/assigned-to-me`).
   - Mở chi tiết sự cố, nhấn vào nút liên kết chỉ đường (Google Maps / OpenStreetMap Routing) để điều hướng xe bảo trì đến vị trí GPS.
2. **Kích hoạt trạng thái thi công:**
   - Khi đã đến hiện trường và dựng biển báo rào chắn an toàn, nhân viên bấm nút *"Bắt đầu xử lý"*.
   - Client gửi `PATCH /api/v1/incidents/{id}/status` với thân payload `{ "status": "IN_PROGRESS" }`.
   - Trạng thái trên toàn hệ thống chuyển thành `IN_PROGRESS` (Đang thi công).
3. **Khắc phục hạ tầng:**
   - Đội kỹ thuật thực hiện các thao tác chuyên môn: Cắt gọt viền ổ gà, vệ sinh đáy hố, tưới nhũ tương bám dính, đổ hỗn hợp bê tông nhựa nóng/nguội, đầm nén phẳng bề mặt bằng máy đầm lu.
4. **Nghiệm thu hiện trường (Proof of Work):**
   - Sau khi hoàn thiện, nhân viên sử dụng camera chụp lại bức ảnh toàn cảnh mặt đường đã được xử lý bằng phẳng.
   - Nhập ghi chú ngắn (ví dụ: *"Đã vá hoàn tất bằng 2 bao bê tông nhựa nguội Carboncor Asphalt, lu lèn chặt, giao thông lưu thông bình thường"*).
   - Nhấn nút *"Nộp báo cáo hoàn tất"* $\rightarrow$ Gửi `POST /api/v1/incidents/{id}/resolve` (kèm file ảnh nghiệm thu).

### 5.4. Hậu điều kiện
- Tệp ảnh nghiệm thu được lưu trữ an toàn.
- Bản ghi `resolutions` được tạo lưu vết: `staff_id`, `proof_image_url`, `notes`.
- Cột `resolved_at` trong bảng `incidents` được cập nhật thời gian hiện tại (`NOW()`).
- Trạng thái sự cố chuyển sang `RESOLVED`.

---

## 6. PHA 5: NGHIỆM THU & ĐÓNG LUỒNG (VERIFICATION & CLOSURE PHASE)

### 6.1. Mục tiêu
Minh bạch hóa kết quả xử lý với người dân, đối chiếu trực quan bằng chứng trước và sau thi công, ghi nhận mức độ hài lòng của công dân và đóng vòng đời sự cố.

### 6.2. Tác nhân & Giao diện
- **Tác nhân:** Người dân đã báo cáo ban đầu (`Citizen`) & Quản trị viên (`Admin`).
- **Màn hình tương ứng:** `my_submitted_reports_roadcare` & `incident_rc_8942_detailed_dossier_roadcare`.

### 6.3. Các bước nghiệp vụ
1. **Thông báo công dân:**
   - Hệ thống tự động kích hoạt thông báo đến người dân: *"Sự cố #RC-8942 do bạn phản ánh đã được khắc phục hoàn tất. Vui lòng kiểm tra nghiệm thu!"*.
2. **Xem đối chiếu trực quan (Before / After Comparison):**
   - Người dân nhấn vào liên kết, giao diện hiển thị thành phần so sánh hình ảnh Before/After (thanh trượt kéo đối chiếu ảnh hư hỏng lúc đầu vs ảnh đã vá phẳng).
3. **Đánh giá & Phản hồi:**
   - Người dân chọn số sao đánh giá chất lượng (từ 1 đến 5 sao).
   - Nhập cảm nhận/nhận xét đóng góp.
   - Nhấn nút *"Đồng ý nghiệm thu & Đóng sự cố"* $\rightarrow$ Gửi `POST /api/v1/incidents/{id}/close`.
4. **Cập nhật hệ thống:**
   - Trạng thái sự cố chuyển sang `CLOSED`.
   - Bản ghi đánh giá được lưu vào bảng `feedbacks` (`rating`, `comments`, `closed_at`).
5. **Cơ chế đóng tự động (Auto-closure Fallback):**
   - Nhằm tránh tình trạng phiếu tồn đọng nếu người dân quên không phản hồi, một tác vụ ngầm định kỳ (Spring `@Scheduled(cron = "0 0 2 * * *")`) sẽ tự động chuyển các sự cố ở trạng thái `RESOLVED` quá 7 ngày sang trạng thái `CLOSED` với ghi chú mặc định *"Tự động đóng theo chính sách quá thời hạn 7 ngày"*.
6. **Cơ chế khiếu nại (Dispute / Re-open Flow):**
   - Nếu người dân bấm *"Chưa hài lòng / Hiện trường chưa khắc phục triệt để"*, hệ thống tạo thông báo ưu tiên gửi thẳng cho Admin thẩm định lại để yêu cầu Staff thi công bổ sung.

---

## 7. BẢNG TỔNG HỢP VÒNG ĐỜI TRẠNG THÁI SỰ CỐ (INCIDENT STATUS LIFECYCLE)

| Mã trạng thái (`status`) | Ý nghĩa nghiệp vụ | Tác nhân kích hoạt | Điều kiện chuyển tiếp |
| :--- | :--- | :--- | :--- |
| **`SUBMITTED`** | Vừa nộp, chờ AI phân tích hoặc chờ duyệt tay | Người dân (Citizen) | Nộp thành công ảnh & tọa độ GPS hợp lệ. |
| **`AI_ANALYZED`** | Đã phân tích AI thành công | Hệ thống AI ONNX | Model phát hiện lỗi với Confidence $\ge 70\%$. |
| **`REJECTED`** | Bị từ chối tiếp nhận | Quản trị viên (Admin) | Ảnh không phải đường bộ, ảnh mờ, vị trí sai. |
| **`ASSIGNED`** | Đã phân công kỹ thuật viên | Quản trị viên (Admin) | Admin duyệt và chọn Staff phụ trách. |
| **`IN_PROGRESS`** | Đang thi công sửa chữa | Kỹ thuật viên (Staff) | Staff bấm nhận việc khi có mặt tại hiện trường. |
| **`RESOLVED`** | Đã sửa xong, chờ nghiệm thu | Kỹ thuật viên (Staff) | Staff tải lên ảnh bằng chứng thi công (Proof). |
| **`CLOSED`** | Đã nghiệm thu & đóng phiếu | Người dân / Tự động | Dân chấm sao hài lòng hoặc quá hạn 7 ngày. |
