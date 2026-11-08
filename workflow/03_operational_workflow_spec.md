# ĐẶC TẢ KỸ THUẬT QUY TRÌNH VẬN HÀNH 7 GIAI ĐOẠN (7-STAGE OPERATIONAL LIFECYCLE)
## HỆ THỐNG ROADVISION AI - QUẢN LÝ VÀ BẢO TRÌ HẠ TẦNG GIAO THÔNG THÔNG MINH

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp & Tài liệu Thiết kế Kiến trúc Vận hành Hệ thống  
> **Phiên bản:** 2.4 (Cập nhật Kiến trúc Sổ cái Uy tín & Chu trình 7 Giai đoạn Toàn diện)  
> **Cập nhật lần cuối:** 2026-11-03  

---

## 1. TỔNG QUAN VỀ CHU TRÌNH 7 GIAI ĐOẠN LIÊN HOÀN

Hệ thống **RoadVision AI** vận hành xoay quanh chu trình khép kín gồm 7 giai đoạn kỹ thuật liên hoàn, giải quyết triệt để bài toán từ lúc người dân phát hiện hư hại mặt đường đến khi thi công, nghiệm thu đối chiếu Before/After và tích lũy điểm thi đua:

```
[ GĐ 1: Tiếp Nhận & AI Scan ] ──> [ GĐ 2: Thẩm Định & Sổ Cái (+50đ) ] ──> [ GĐ 3: Khảo Sát / Fast-Track ]
                                                                                   │
[ GĐ 6: Nghiệm Thu QA & Rework ] <── [ GĐ 5: Thi Công & Nộp Bằng Chứng ] <── [ GĐ 4: Lập Phương Án & Giao Tổ ]
        │                  ▲
        │ (Đạt chuẩn)      │ (Chưa đạt: REWORK_REQUIRED)
        ▼                  │
[ GĐ 7: Đóng Hồ Sơ (+100đ) & Thi Đua Tháng ]
```

---

## 2. PHÂN TÁCH BA TRỤ CỘT TRẠNG THÁI (TRẠNG THÁI - AI - CỜ NGHIỆP VỤ)

Để hệ thống không bị xung đột logic khi một sự cố vừa được AI phân tích, vừa là của công dân uy tín, vừa chờ Admin thẩm định, hệ thống phân tách độc lập 3 trường dữ liệu:

| Nhóm dữ liệu | Tên trường | Các giá trị cho phép | Mục đích & Ý nghĩa |
| :--- | :--- | :--- | :--- |
| **Trạng thái sự cố (Incident Status)** | `status` | `SUBMITTED`, `VERIFIED`, `INSPECTION_ASSIGNED`, `INSPECTING`, `INSPECTED`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_ACCEPTANCE`, `REWORK_REQUIRED`, `RESOLVED`, `CLOSED`, `REJECTED` | Quản lý tiến trình xử lý nghiệp vụ chính của hồ sơ qua 7 giai đoạn. |
| **Trạng thái phân tích AI (AI Status)** | `ai_status` | `AI_ANALYZED`, `AI_LOW_CONFIDENCE`, `AI_FAILED`, `MANUAL_FALLBACK` | Lưu vết kết quả xử lý thị giác máy tính của YOLOv8, độc lập với phê duyệt của con người. |
| **Cờ nghiệp vụ (Business Flags)** | `flag` | `TRUSTED_REPORT`, `POTENTIAL_DUPLICATE`, `MULTI_DEFECT`, `FAST_TRACK`, `FRAUD_REVOKED`, `DISPUTED` | Gắn nhãn bổ trợ để kích hoạt các chính sách xử lý ưu tiên hoặc rào chắn nghiệp vụ. |

---

## 3. CHI TIẾT 7 GIAI ĐOẠN VẬN HÀNH

### GIAI ĐOẠN 1: TIẾP NHẬN PHẢN ÁNH & AI KIỂM ĐỊNH TIỀN KỲ (INGESTION & PRE-SUBMISSION)
- **Tác nhân:** Người dân (`ROLE_CITIZEN`).
- **Nghiệp vụ:**
  - Chụp ảnh hiện trường hoặc tải ảnh lên. Trình duyệt tự động trích xuất tọa độ GPS từ thẻ EXIF ảnh hoặc HTML5 Geolocation API.
  - Client gửi ảnh tới `POST /api/v1/incidents/analyze` để quét nhanh bằng YOLOv8.
  - **Chính sách Confidence Gate & Fallback thông minh (Không khóa cứng nút gửi):**
    - *Phát hiện rõ hư hỏng ($\ge \tau$):* Tiếp nhận bình thường, gợi ý tự động loại sự cố (`POTHOLE`, `ROAD_CRACK`...), gán `ai_status = 'AI_ANALYZED'`.
    - *Độ tin cậy thấp ($< \tau$):* Cảnh báo người dân, vẫn cho phép gửi, gán `ai_status = 'AI_LOW_CONFIDENCE'` và `flag = 'NEEDS_MANUAL_REVIEW'`.
    - *Không phát hiện hư hỏng / Ảnh mờ:* Hiển thị thông báo hướng dẫn chụp lại, **vẫn cho phép gửi thủ công** với `ai_status = 'MANUAL_FALLBACK'`. Tuyệt đối không khóa cứng nút gửi của người dân.
    - *Phát hiện đối tượng không liên quan:* Cảnh báo người dân xác nhận để tránh bị trừ điểm vi phạm.
  - **Kiểm tra rào chắn địa lý (Geofencing):** Tọa độ GPS phải thuộc phạm vi ranh giới quản lý của thành phố.
  - Sau khi người dân bấm nộp, hệ thống tạo bản ghi mới với `status = 'SUBMITTED'`.

---

### GIAI ĐOẠN 2: THẨM ĐỊNH HỒ SƠ & GHI NHẬN SỔ CÁI BƯỚC ĐẦU (TRIAGE & VERIFICATION)
- **Tác nhân:** Quản trị viên điều phối (`ROLE_ADMIN`).
- **Nghiệp vụ:**
  - **Khử trùng lặp không gian (Spatial Deduplication):** Tự động phát hiện các sự cố đang mở trong bán kính 25 mét bằng giải thuật Haversine. Nếu trùng, gắn `flag = 'POTENTIAL_DUPLICATE'`.
  - **Kiểm tra uy tín công dân:** Nếu người gửi có điểm uy tín $\ge 800$ và có từ 3 báo cáo hợp lệ trở lên, tự động gắn `flag = 'TRUSTED_REPORT'`.
  - **Quyết định thẩm định của Admin:**
    - **Chấp thuận hợp lệ (`VERIFIED`):**
      - Chuyển `status = 'VERIFIED'`.
      - **Cộng +50 điểm uy tín** cho người dân vào Sổ cái (`user_reputation_transactions`: `VERIFIED_BONUS`). Điểm tối đa chạm trần 1.000 điểm.
      - Sử dụng Unique Index `(user_id, incident_id, transaction_type)` để đảm bảo tính Idempotent (tuyệt đối không bị cộng trùng 50 điểm).
    - **Từ chối tiếp nhận (`REJECTED`):**
      - *Phân biệt loại từ chối để tránh phạt oan công dân:*
        - `DUPLICATE` (Báo cáo trùng lặp với người khác): Gắn `flag = 'DUPLICATE'`, **0 điểm phạt, 0 lần cảnh cáo**.
        - `INVALID_LOCATION` (Sai lệch vị trí khách quan): Gắn `flag = 'INVALID_LOCATION'`, **0 điểm phạt, 0 lần cảnh cáo**.
        - `FAKE_REPORT` / `SPAM` (Cố tình bịa đặt, ảnh mạng, phá hoại): Phạt **-100 điểm uy tín** (`PENALTY`), ghi nhận vào bảng `user_violations` và áp dụng chế tài 3 mức vi phạm:
          - *Lần 1 - 2:* Cảnh cáo (`WARNING`).
          - *Lần 3 - 4:* Đưa vào diện hạn chế kiểm duyệt (`RESTRICTED`).
          - *Lần 5:* Tự động tạm khóa tài khoản 7 ngày (`SUSPENDED_7_DAYS`).

---

### GIAI ĐOẠN 3: PHÂN CÔNG KHẢO SÁT & CƠ CHẾ FAST-TRACK CÓ KIỂM SOÁT
- **Tác nhân:** Quản trị viên (`ROLE_ADMIN`) & Tổ khảo sát (`TeamType.INSPECTION`).
- **Luồng khảo sát chuẩn:**
  - Admin giao việc khảo sát cho tổ phụ trách tuyến (`status = 'INSPECTION_ASSIGNED'`).
  - Kỹ thuật viên di chuyển đến hiện trường (`INSPECTING`), đo đạc kích thước thực tế (dài, rộng, sâu tính bằng mét/cm), ghi nhận ảnh hiện trường và đề xuất giải pháp thi công $\rightarrow$ chuyển `INSPECTED`.
- **Nhánh Fast-Track có kiểm soát (Khẩn cấp / Nguy cơ tai nạn cao):**
  - Đối với sự cố sụt lún nghiêm trọng, hố tử thần hoặc đá sạt lở đèo gây ách tắc giao thông, Admin có quyền **bỏ qua bước khảo sát hiện trường** và giao thẳng cho Tổ thi công.
  - **Ràng buộc kiểm soát (Audit Guards):**
    - Bắt buộc Admin phải nhập giải trình lý do khẩn cấp `fast_track_reason` (tối thiểu 10 ký tự).
    - Hệ thống lưu vết `fast_track_approved_by` (ID Admin phê duyệt) và gắn `flag = 'FAST_TRACK'`.
    - Khối lượng vật tư thực tế sẽ được đo đạc và cập nhật bổ sung trong quá trình thi công.

---

### GIAI ĐOẠN 4: LẬP PHƯƠNG ÁN THI CÔNG & PHÂN BỔ NGUỒN LỰC (PLANNING & ASSIGNMENT)
- **Tác nhân:** Quản trị viên (`ROLE_ADMIN`).
- **Nghiệp vụ:**
  - Chọn tổ thi công trực thuộc Hạt/Tuyến quản lý (`TeamType.MAINTENANCE`).
  - Phê duyệt phương án kỹ thuật thi công (`work_plan`: thảm bê tông nhựa nóng, vá nguội Carboncor, trám khe nứt mastic).
  - Quy định yêu cầu an toàn giao thông (`safety_notes`: biển báo hiệu cách 50m, chóp nón, đèn chớp ban đêm).
  - Thiết lập thời hạn cam kết hoàn thành SLA (`planned_deadline`).
  - Chuyển trạng thái `status = 'ASSIGNED'`. Gửi thông báo đẩy WebPush/App tới Tổ trưởng thi công.

---

### GIAI ĐOẠN 5: THI CÔNG THỰC ĐỊA & NỘP BẰNG CHỨNG (EXECUTION & PROOF OF WORK)
- **Tác nhân:** Tổ thi công (`ROLE_STAFF`).
- **Nghiệp vụ:**
  - Đội thi công có mặt tại hiện trường, bấm bắt đầu xử lý $\rightarrow$ `status = 'IN_PROGRESS'`.
  - Thực hiện cào bóc, lu lèn và hoàn trả kết cấu áo đường.
  - Chụp ảnh bằng chứng hoàn thành sau khi thi công (`After Image`).
  - Gửi hồ sơ nghiệm thu qua API $\rightarrow$ chuyển trạng thái `status = 'PENDING_ACCEPTANCE'`.

---

### GIAI ĐOẠN 6: NGHIỆM THU QA & VÒNG LẶP REWORK KHÔNG GIỚI HẠN
- **Tác nhân:** Quản trị viên nghiệm thu (`ROLE_ADMIN`).
- **Nghiệp vụ:**
  - Admin mở giao diện nghiệm thu, đối chiếu trực quan ảnh Before (Giai đoạn 1) và ảnh After (Giai đoạn 5).
  - Hệ thống tự động kích hoạt mô hình AI quét ảnh After để kiểm tra xem có khuyết tật ổ gà nào còn sót lại không.
  - **Nhánh 1 - Nghiệm thu đạt yêu cầu:**
    - Admin xác nhận đạt chuẩn $\rightarrow$ chuyển `status = 'CLOSED'`, ghi nhận `resolved_at` và `closed_at`.
    - **Cộng +100 điểm uy tín** cho người dân vào Sổ cái (`user_reputation_transactions`: `CLOSED_BONUS`).
    - *Lưu ý:* Tổng điểm thưởng trọn vẹn cho 1 sự cố thành công là **+150 điểm** (+50 điểm khi VERIFIED và +100 điểm khi CLOSED).
  - **Nhánh 2 - Nghiệm thu không đạt yêu cầu (Vòng lặp REWORK):**
    - Bắt buộc Admin ghi rõ lý do không đạt `rework_reason` (tối thiểu 10 ký tự: ví dụ *"Mặt đường còn gồ ghề chênh cao > 2cm, mép vá chưa được tưới nhựa dính bám nhũ tương"*).
    - Chuyển trạng thái `status = 'REWORK_REQUIRED'`, tăng biến đếm `rework_count = rework_count + 1`.
    - Không giới hạn số lần làm lại cho đến khi chất lượng đạt chuẩn nghiệm thu.
    - Tổ thi công khắc phục và nộp ảnh mới $\rightarrow$ quay lại `PENDING_ACCEPTANCE`.
    - Điểm thưởng +100 điểm uy tín **chỉ được cấp đúng 1 lần duy nhất** khi sự cố thực sự được đóng hồ sơ (`CLOSED`), không cấp theo số lần nộp hồ sơ.

---

### GIAI ĐOẠN 7: ĐÁNH GIÁ CÔNG DÂN, THU HỒI ĐIỂM & THI ĐUA THÁNG (GAMIFICATION & REVERSAL)
- **Tác nhân:** Người dân (`ROLE_CITIZEN`) & Quản trị viên (`ROLE_ADMIN`).
- **Nghiệp vụ:**
  - Người dân có thể đánh giá mức độ hài lòng từ 1 đến 5 sao kèm ý kiến nhận xét (Feedback) bất kỳ lúc nào sau khi sự cố hoàn tất.
  - **Cơ chế Thu Hồi Điểm (Reversal Policy):**
    - Nếu sau khi đã duyệt `VERIFIED` hoặc đã đóng hồ sơ `CLOSED`, Ban Thanh tra phát hiện phản ánh là gian lận:
      - Admin gọi lệnh thu hồi `POST /api/v1/incidents/{id}/reverse-fraud`.
      - Hệ thống tự động truy thu toàn bộ điểm thưởng đã cấp qua giao dịch `REVERSAL` (-50đ nếu mới VERIFIED, hoặc -150đ nếu đã CLOSED).
      - Đồng thời phạt thêm **-100 điểm** vi phạm (`PENALTY`) và ghi nhận vào `user_violations`.
      - Phân tách rành mạch: `REVERSAL` (thu hồi điểm thưởng cấp nhầm) và `PENALTY` (chế tài trừng phạt).
  - **Cơ chế Bảng Xếp Hạng Hai Tầng (Dual Metrics):**
    - **Điểm thi đua tháng:** Chỉ tính tổng các điểm thưởng phát sinh trong tháng hiện tại (`created_at >= đầu tháng`). Vào ngày 1 hàng tháng, kỳ thi đua mới bắt đầu từ 0 để đảm bảo công bằng cho người mới tham gia.
    - **Điểm uy tín tích lũy:** Tích lũy bền vững lâu dài theo thang chuẩn **0 – 1.000 điểm**, quyết định Hạng công dân:
      - $\ge 800$ điểm: **Hạng Vàng** (Hiệp Sĩ Giao Thông)
      - $600 - 799$ điểm: **Hạng Bạc** (Đôi Mắt Đô Thị)
      - $400 - 599$ điểm: **Hạng Đồng** (Công Dân Tích Cực)
      - $100 - 399$ điểm: **Tiêu Chuẩn** (Thành Viên Tiêu Chuẩn)
      - $< 100$ điểm: **Cần Lưu Ý** (Diện kiểm duyệt thủ công nghiêm ngặt)
    - **Quy tắc hòa điểm (Tie-Breaker):** Khi hai hoặc nhiều công dân có cùng điểm số (hoặc cùng đạt mốc tối đa 1.000 điểm), công dân nào đạt mốc điểm đó trước (dựa trên thời điểm giao dịch `lastEarnedAt`) sẽ được xếp hạng cao hơn.
