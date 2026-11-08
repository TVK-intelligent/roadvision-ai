# HỢP ĐỒNG KỸ THUẬT RESTFUL API (API ENDPOINTS CONTRACT)
## HỆ THỐNG ROADVISION AI - QUẢN LÝ VÀ BẢO TRÌ HẠ TẦNG GIAO THÔNG THÔNG MINH

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp & Hợp đồng Tích hợp Giao tiếp Frontend - Backend  
> **Phiên bản API:** `/api/v1`  
> **Tiêu chuẩn:** RESTful, JSON Payload, Multipart/Form-Data cho hình ảnh, Chuẩn lỗi RFC 7807  
> **Cập nhật lần cuối:** 2026-11-03  

---

## 1. TIÊU CHUẨN XÁC THỰC & ĐỊNH DẠNG CHUNG

- **Xác thực:** Mọi yêu cầu gửi lên (trừ các endpoint công khai `permitAll()`) đều phải đính kèm Header:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
- **Cấu trúc phản hồi lỗi chuẩn (Standard RFC 7807 Error Envelope):**
  ```json
  {
    "timestamp": "2026-11-03T12:00:00Z",
    "status": 400,
    "error": "Bad Request",
    "message": "Phương án thi công phải chi tiết tối thiểu 10 ký tự",
    "path": "/api/v1/incidents/8942/assign-construction"
  }
  ```

---

## 2. CHI TIẾT CÁC ENDPOINT THEO CHU TRÌNH 7 GIAI ĐOẠN

### 2.1. GIAI ĐOẠN 1: TIẾP NHẬN PHẢN ÁNH & AI PHÂN TÍCH

#### `POST /api/v1/incidents/analyze`
Quét thử AI trực tiếp từ ảnh xem trước của người dân (hỗ trợ điều chỉnh ngưỡng tin cậy).

- **Quyền hạn:** Công khai (`permitAll()`)
- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `image` *(File, bắt buộc)*: Tệp ảnh hiện trường (.jpg, .png, tối đa 10MB).
  - `threshold` *(Float, tùy chọn)*: Ngưỡng trượt tin cậy (0.15 đến 0.85, mặc định 0.20).
- **Phản hồi (`200 OK`):**
  ```json
  {
    "className": "POTHOLE",
    "confidence": 0.9472,
    "bboxX": 128,
    "bboxY": 140,
    "bboxWidth": 371,
    "bboxHeight": 345,
    "count": 2,
    "footprintPercent": 14.8,
    "estimatedSeverity": "HIGH",
    "inferenceMs": 42,
    "boxes": [
      { "className": "POTHOLE", "confidence": 0.9472, "x": 128, "y": 140, "width": 371, "height": 345 }
    ]
  }
  ```

#### `POST /api/v1/incidents`
Tạo mới sự cố mặt đường chính thức vào cơ sở dữ liệu.

- **Quyền hạn:** `ROLE_CITIZEN`, `ROLE_ADMIN`
- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `image` *(File, bắt buộc)*: Tệp ảnh hiện trường.
  - `latitude` *(Double, bắt buộc)*: Vĩ độ GPS.
  - `longitude` *(Double, bắt buộc)*: Kinh độ GPS.
  - `title` *(String, tùy chọn)*: Tiêu đề phản ánh.
  - `description` *(String, tùy chọn)*: Mô tả chi tiết.
  - `category` *(String, tùy chọn)*: Phân loại hư hại (`POTHOLE`, `ROAD_CRACK`, `ROAD_FLOODING`, `ROAD_OBSTACLE`, `COMPLEX_DAMAGE`).
  - `categories` *(List<String>, tùy chọn)*: Danh sách đa sự cố khi hiện trường có nhiều khuyết tật.
  - `address` *(String, tùy chọn)*: Địa chỉ đường bộ.
- **Phản hồi thành công (`201 Created`):**
  ```json
  {
    "id": 8942,
    "ticketCode": "#RC-8942",
    "status": "SUBMITTED",
    "aiStatus": "AI_ANALYZED",
    "category": "POTHOLE",
    "severity": "HIGH",
    "flag": null,
    "latitude": 21.028511,
    "longitude": 105.854444,
    "address": "120 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    "routeCorridor": "DOWNTOWN",
    "zoneName": "Hạt QLĐB Đô Thị 1 - Hà Nội",
    "createdAt": "2026-11-03T12:15:30Z"
  }
  ```

---

### 2.2. GIAI ĐOẠN 2: THẨM ĐỊNH HỒ SƠ & GHI NHẬN SỔ CÁI

#### `PUT /api/v1/incidents/{id}/verify`
Quản trị viên thẩm định xác nhận sự cố hợp lệ, cộng 50 điểm uy tín vào sổ cái Ledger.

- **Quyền hạn:** `ROLE_ADMIN`
- **Phản hồi (`200 OK`):**
  ```json
  {
    "id": 8942,
    "ticketCode": "#RC-8942",
    "status": "VERIFIED",
    "flag": null,
    "reporterReputationScore": 900
  }
  ```
  *(Hệ thống tự động ghi 1 bản ghi vào `user_reputation_transactions`: `points = +50`, `transaction_type = 'VERIFIED_BONUS'`)*.

#### `POST /api/v1/incidents/{id}/reject`
Từ chối tiếp nhận phản ánh (phân biệt trùng lặp khách quan và vi phạm cố ý).

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "rejectionReason": "Sự cố đã được người dân khác phản ánh trước đó tại cùng vị trí"
  }
  ```
- **Xử lý:**
  - Nếu lý do chứa "trùng", "duplicate" $\rightarrow$ gắn `flag = 'DUPLICATE'`, **0 điểm phạt, 0 strike**.
  - Nếu lý do chứa "vị trí", "tọa độ", "location" $\rightarrow$ gắn `flag = 'INVALID_LOCATION'`, **0 điểm phạt, 0 strike**.
  - Nếu là tin giả/ảnh mạng/spam $\rightarrow$ trừ **-100 điểm uy tín** (`PENALTY`), ghi nhận `user_violations`, xử phạt 3 mức độ (Cảnh cáo, Hạn chế, Khóa 7 ngày).

---

### 2.3. GIAI ĐOẠN 3 & 4: KHẢO SÁT, FAST-TRACK & PHÂN CÔNG THI CÔNG

#### `POST /api/v1/incidents/{id}/assign-inspection`
Giao nhiệm vụ cho Tổ khảo sát hiện trường (Stage 3).

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "teamId": 3,
    "staffId": 12,
    "notes": "Đo đạc chính xác chiều sâu ổ gà và độ rạn nứt phụ cận"
  }
  ```

#### `POST /api/v1/incidents/{id}/assign-construction`
Giao nhiệm vụ thi công cho Tổ bảo trì, hỗ trợ nhánh **Fast-Track khẩn cấp**.

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body (Khảo sát chuẩn hoặc Fast-Track):**
  ```json
  {
    "teamId": 4,
    "staffId": 15,
    "workPlan": "Cào bóc lớp nhựa rạn nứt, quét nhũ tương dính bám và thảm bù bê tông nhựa nóng C12.5 dày 5cm",
    "plannedDeadline": "2026-11-04T18:00:00",
    "safetyNotes": "Căng dây phản quang, đặt biển báo hiệu cách công trường 50 mét",
    "isFastTrack": true,
    "fastTrackReason": "Hố sụt nguy hiểm sát mép dải phân cách giữa tim đường, có nguy cơ gây lật xe máy vào ban đêm"
  }
  ```
- **Ràng buộc:** Nếu chọn Fast-Track bỏ qua khảo sát, bắt buộc `fastTrackReason` có độ dài $\ge 10$ ký tự.

---

### 2.4. GIAI ĐOẠN 5 & 6: THI CÔNG, NGHIỆM THU QA & REWORK LOOP

#### `POST /api/v1/incidents/{id}/submit-acceptance`
Tổ thi công nộp hồ sơ bằng chứng hoàn thành (After Image) chờ Admin nghiệm thu.

- **Quyền hạn:** `ROLE_STAFF`, `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "notes": "Đã hoàn thành thảm nhựa và lu lèn phẳng mặt đường, thu dọn rào chắn an toàn."
  }
  ```
- **Trạng thái đích:** Chuyển sang `PENDING_ACCEPTANCE`.

#### `POST /api/v1/incidents/{id}/review-acceptance`
Quản trị viên thẩm định chất lượng Before/After.

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body (Khi đạt chuẩn):**
  ```json
  {
    "approved": true
  }
  ```
  *(Chuyển `status = 'CLOSED'`, thưởng **+100 điểm uy tín** vào Sổ cái `CLOSED_BONUS`)*.
- **Request Body (Khi không đạt - Ra lệnh Rework):**
  ```json
  {
    "approved": false,
    "reworkReason": "Mặt đường còn gồ ghề chênh lệch > 2cm so với cốt mặt đường cũ, yêu cầu bù thêm vật tư và lu lèn lại"
  }
  ```
  *(Chuyển `status = 'REWORK_REQUIRED'`, tăng `rework_count = rework_count + 1`, không giới hạn số vòng lặp làm lại)*.

---

### 2.5. GIAI ĐOẠN 7: ĐÁNH GIÁ, THU HỒI ĐIỂM & BẢNG VINH DANH THI ĐUA

#### `POST /api/v1/incidents/{id}/reverse-fraud`
Thu hồi toàn bộ điểm thưởng đã cấp và áp dụng chế tài vi phạm khi phát hiện gian lận sau khi đã duyệt hoặc đóng hồ sơ.

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "reason": "Phát hiện người dân sử dụng ảnh tải từ diễn đàn mạng xã hội năm 2021, không có ổ gà thực tế tại hiện trường"
  }
  ```
- **Xử lý:**
  - Thu hồi điểm thưởng đã cấp qua giao dịch `REVERSAL` (-50đ nếu đã VERIFIED, hoặc -150đ nếu đã CLOSED).
  - Phạt bổ sung **-100 điểm uy tín** vi phạm (`PENALTY`).
  - Ghi nhận 1 vi phạm vào bảng `user_violations`.
  - Cập nhật hồ sơ sự cố: `status = 'REJECTED'`, `flag = 'FRAUD_REVOKED'`.

#### `GET /api/v1/incidents/leaderboard/citizens`
Lấy danh sách Bảng vinh danh thi đua công dân theo tháng hoặc toàn thời gian.

- **Quyền hạn:** Công khai (`permitAll()`)
- **Query Parameters:**
  - `period` *(String, mặc định `month`)*: `month` (Thi đua tháng này, tự động làm mới đầu tháng) hoặc `all` (Điểm uy tín tích lũy dài hạn 0 - 1.000).
- **Phản hồi (`200 OK`):**
  ```json
  [
    {
      "rank": 1,
      "userId": 37,
      "fullName": "Lê Hoàng An",
      "avatarUrl": null,
      "monthlyPoints": 150,
      "reputationScore": 850,
      "reportsSent": 31,
      "resolvedReports": 3,
      "tier": "HẠNG VÀNG",
      "badgeTitle": "Hiệp Sĩ Giao Thông",
      "lastEarnedAt": "2026-11-03T19:40:11"
    }
  ]
  ```

#### `GET /api/v1/incidents/reputation/transactions`
Lấy toàn bộ lịch sử biến động Sổ cái (Ledger) của người dùng đang đăng nhập.

- **Quyền hạn:** `ROLE_CITIZEN`, `ROLE_ADMIN`, `ROLE_STAFF`
- **Phản hồi (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "points": 100,
      "balanceAfter": 850,
      "transactionType": "CLOSED_BONUS",
      "reason": "Thưởng nghiệm thu & đóng hồ sơ thành công sự cố #RC-8942",
      "createdAt": "2026-11-03T10:15:00"
    },
    {
      "id": 2,
      "points": 50,
      "balanceAfter": 750,
      "transactionType": "VERIFIED_BONUS",
      "reason": "Thưởng thẩm định phản ánh hợp lệ #RC-8942",
      "createdAt": "2026-11-03T08:30:00"
    }
  ]
  ```

#### `PUT /api/v1/admin/users/{id}/reputation`
Quản trị viên điều chỉnh trực tiếp điểm uy tín của công dân và xóa cảnh cáo vi phạm.

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "reputationScore": 850,
    "resetStrikes": true
  }
  ```
  *(Thang điểm hợp lệ: `0` đến `1000`. Hệ thống tự động ghi nhận giao dịch `ADMIN_ADJUST` nếu điểm có sự chênh lệch)*.
