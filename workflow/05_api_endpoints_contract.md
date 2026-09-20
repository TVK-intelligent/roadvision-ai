# HỢP ĐỒNG KỸ THUẬT RESTFUL API (API ENDPOINTS CONTRACT)
## HỆ THỐNG ROADCARE - QUẢN LÝ SỰ CỐ GIAO THÔNG THÔNG MINH

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp - Chương 4: Thiết Kế Kiến Trúc Dịch Vụ & Tích Hợp Hệ Thống  
> **Phiên bản API:** `/api/v1`  
> **Tiêu chuẩn:** RESTful, JSON Payload, Multipart/Form-Data cho hình ảnh, Chuẩn lỗi RFC 7807.

---

## 1. TIÊU CHUẨN XÁC THỰC & ĐỊNH DẠNG CHUNG

- **Xác thực:** Mọi yêu cầu gửi lên (trừ các endpoint công khai) đều phải đính kèm Header:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
- **Cấu trúc phản hồi lỗi chuẩn (Standard Error Envelope):**
  ```json
  {
    "timestamp": "2026-09-07T12:00:00Z",
    "status": 400,
    "error": "Bad Request",
    "message": "Ảnh vượt quá kích thước cho phép (tối đa 10MB)",
    "path": "/api/v1/incidents",
    "validationErrors": [
      {
        "field": "image",
        "rejectedValue": "15.4MB",
        "reason": "Max file size is 10MB"
      }
    ]
  }
  ```

---

## 2. CHI TIẾT CÁC ENDPOINTS THEO TỪNG PHA

### 2.1. PHA 1 & 2: TIẾP NHẬN PHẢN ÁNH & AI PHÂN TÍCH

#### `POST /api/v1/incidents`
Tạo mới sự cố mặt đường, tải ảnh và tự động kích hoạt mô hình ONNX Runtime YOLOv8.

- **Quyền hạn:** `ROLE_CITIZEN`, `ROLE_ADMIN`
- **Content-Type:** `multipart/form-data`
- **Form Data Parameters:**
  - `image` *(File, bắt buộc)*: Tệp ảnh hiện trường (.jpg, .jpeg, .png, tối đa 10MB).
  - `latitude` *(Double, bắt buộc)*: Vĩ độ GPS (ví dụ: `10.776889`).
  - `longitude` *(Double, bắt buộc)*: Kinh độ GPS (ví dụ: `106.700806`).
  - `description` *(String, tùy chọn)*: Mô tả sơ bộ của người dân.
  - `address` *(String, tùy chọn)*: Địa chỉ số nhà / tên đường tự động phân giải (Reverse Geocoding).

- **Phản hồi thành công (`201 Created`):**
  ```json
  {
    "success": true,
    "code": 201,
    "message": "Tiếp nhận và phân tích sự cố thành công",
    "data": {
      "incidentId": 8942,
      "ticketCode": "#RC-8942",
      "status": "AI_ANALYZED",
      "category": "POTHOLE",
      "imageUrl": "https://storage.roadcare.gov.vn/incidents/2026/09/rc-8942-origin.jpg",
      "latitude": 10.776889,
      "longitude": 106.700806,
      "address": "120 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
      "createdAt": "2026-09-07T12:15:30Z",
      "aiDetection": {
        "className": "POTHOLE",
        "confidence": 0.9472,
        "inferenceLatencyMs": 42,
        "boundingBox": {
          "x": 128,
          "y": 140,
          "width": 371,
          "height": 345
        },
        "flag": null
      }
    }
  }
  ```

---

### 2.2. PHA 3: THẨM ĐỊNH & ĐIỀU PHỐI PHÂN CÔNG (ADMIN)

#### `GET /api/v1/incidents`
Tra cứu danh sách sự cố phục vụ hàng đợi điều phối (Dispatch Queue).

- **Quyền hạn:** `ROLE_ADMIN`
- **Query Parameters:**
  - `page` *(int, default: 0)*, `size` *(int, default: 20)*
  - `status` *(string, vd: `AI_ANALYZED`, `SUBMITTED`, `ASSIGNED`)*
  - `category` *(string, vd: `POTHOLE`, `ROAD_CRACK`)*
  - `search` *(string, tìm theo mã ticket, tên đường, người báo cáo)*
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "content": [
        {
          "incidentId": 8942,
          "ticketCode": "#RC-8942",
          "title": "Severe Road Pothole with Subsurface Base Erosion",
          "status": "AI_ANALYZED",
          "category": "POTHOLE",
          "confidence": 0.9472,
          "address": "120 Nguyễn Trãi, Quận 1",
          "createdAt": "2026-09-07T12:15:30Z"
        }
      ],
      "pageNumber": 0,
      "pageSize": 20,
      "totalElements": 142,
      "totalPages": 8
    }
  }
  ```

#### `GET /api/v1/incidents/{id}`
Lấy chi tiết hồ sơ toàn diện (Detailed Dossier) của một sự cố.

- **Quyền hạn:** `ROLE_ADMIN`, `ROLE_STAFF`, `ROLE_CITIZEN`
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": 8942,
      "ticketCode": "#RC-8942",
      "status": "ASSIGNED",
      "category": "POTHOLE",
      "severity": "HIGH",
      "imageUrl": "https://storage.roadcare.gov.vn/incidents/rc-8942-origin.jpg",
      "latitude": 10.776889,
      "longitude": 106.700806,
      "address": "120 Nguyễn Trãi, Quận 1",
      "reporter": {
        "id": 1001,
        "fullName": "Nguyễn Văn A",
        "phone": "0901234567"
      },
      "aiDetection": {
        "className": "POTHOLE",
        "confidence": 0.9472,
        "bbox": { "x": 128, "y": 140, "w": 371, "h": 345 },
        "inferenceMs": 42
      },
      "assignment": {
        "assignedByAdmin": "Eng. Elena Rostova",
        "assignedToStaff": "Pavement Team #4 - Nguyễn Kỹ Thuật",
        "priority": "HIGH",
        "notes": "Ưu tiên hoàn thành trước giờ cao điểm",
        "assignedAt": "2026-09-07T13:00:00Z"
      },
      "resolution": null,
      "feedback": null
    }
  }
  ```

#### `PATCH /api/v1/incidents/{id}/assign`
Quản trị viên phê chuẩn loại sự cố và chỉ định nhân viên kỹ thuật phụ trách.

- **Quyền hạn:** `ROLE_ADMIN`
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "staffId": 204,
    "verifiedCategory": "POTHOLE",
    "priority": "HIGH",
    "notes": "Kiểm tra kỹ phần sụt lún xung quanh miệng hố ga"
  }
  ```
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Phân công nhiệm vụ thành công",
    "data": {
      "incidentId": 8942,
      "status": "ASSIGNED",
      "assignedToStaffId": 204,
      "assignedAt": "2026-09-07T13:00:00Z"
    }
  }
  ```

#### `POST /api/v1/incidents/{id}/reject`
Quản trị viên từ chối tiếp nhận phản ánh không hợp lệ hoặc spam.

- **Quyền hạn:** `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "rejectionReason": "Ảnh bị mờ nhòe nghiêm trọng, không xác định được dị vật mặt đường",
    "rejectionCategory": "BLURRED_IMAGE"
  }
  ```
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã từ chối sự cố",
    "data": {
      "incidentId": 8942,
      "status": "REJECTED"
    }
  }
  ```

---

### 2.3. PHA 4: THỰC THI TẠI HIỆN TRƯỜNG (STAFF)

#### `PATCH /api/v1/incidents/{id}/status`
Kỹ thuật viên cập nhật trạng thái khi có mặt tại hiện trường.

- **Quyền hạn:** `ROLE_STAFF`, `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã chuyển sang trạng thái đang thi công",
    "data": {
      "incidentId": 8942,
      "status": "IN_PROGRESS"
    }
  }
  ```

#### `POST /api/v1/incidents/{id}/resolve`
Kỹ thuật viên nộp ảnh bằng chứng nghiệm thu (Proof of Work) hoàn tất thi công.

- **Quyền hạn:** `ROLE_STAFF`
- **Content-Type:** `multipart/form-data`
- **Form Data Parameters:**
  - `proofImage` *(File, bắt buộc)*: Tệp ảnh chụp hiện trường sau khi đã vá đường (.jpg/.png).
  - `notes` *(String, tùy chọn)*: Ghi chú vật liệu sử dụng, kết quả thi công.
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã ghi nhận hoàn tất khắc phục sự cố",
    "data": {
      "incidentId": 8942,
      "status": "RESOLVED",
      "proofImageUrl": "https://storage.roadcare.gov.vn/incidents/rc-8942-proof.jpg",
      "resolvedAt": "2026-09-07T15:45:00Z"
    }
  }
  ```

---

### 2.4. PHA 5: NGHIỆM THU & ĐÓNG LUỒNG (CITIZEN / ADMIN)

#### `POST /api/v1/incidents/{id}/close`
Người dân xác nhận hài lòng, chấm điểm sao và đóng sự cố.

- **Quyền hạn:** `ROLE_CITIZEN`, `ROLE_ADMIN`
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "rating": 5,
    "comments": "Đội thi công làm rất nhanh và phẳng đẹp. Cảm ơn ban quản lý đô thị!"
  }
  ```
- **Phản hồi (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Đã đóng sự cố và ghi nhận đánh giá thành công",
    "data": {
      "incidentId": 8942,
      "status": "CLOSED",
      "closedAt": "2026-09-07T16:10:00Z"
    }
  }
  ```
