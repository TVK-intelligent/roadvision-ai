# NHỮNG VIỆC CẦN LÀM & TOÀN BỘ LOGIC NGHIỆP VỤ HỆ THỐNG ROADVISION AI
## BẢN HƯỚNG DẪN TRIỂN KHAI TOÀN DIỆN CHO ĐỒ ÁN TỐT NGHIỆP

> **Mục tiêu:** Quy định toàn bộ các quy tắc logic kỹ thuật bắt buộc phải có để hệ thống vận hành chính xác theo đúng chu trình 7 giai đoạn, cơ chế Sổ cái Điểm Uy tín 0 - 1.000 điểm, cùng danh sách công việc chi tiết (Checklist/Roadmap) để triển khai mã nguồn Backend (`BE`) và Frontend (`FE`).  
> **Cập nhật lần cuối:** 2026-11-03  

---

# PHẦN I: TOÀN BỘ LOGIC NGHIỆP VỤ CỐT LÕI (CORE BUSINESS LOGIC)

---

## 1. LOGIC KIỂM ĐỊNH ĐẦU VÀO & BẢO VỆ TỆP ẢNH (INPUT & FILE INTEGRITY)

- **Quy chuẩn kích thước tệp:**
  - Giới hạn dung lượng tối đa cho mỗi tệp ảnh tải lên là $\le 10\text{ MB}$.
- **Xác thực định dạng ảnh an toàn (MIME & Magic Bytes Check):**
  - Không chỉ kiểm tra đuôi mở rộng (`.jpg`, `.png`), hệ thống kiểm tra MIME-Type thực tế (`image/jpeg`, `image/png`, `image/webp`) và đọc Magic Bytes để chống tấn công mã độc ẩn trong tệp tin (Polyglot File Attack).
- **Mã băm chống trùng lặp ảnh (SHA-256 Digest):**
  - Hệ thống tính toán `imageSha256` trên luồng byte ảnh tải lên. Nếu mã băm đã tồn tại trong bảng `incidents`, tự động gắn cờ `flag = 'SUSPECTED_DUPLICATE_IMAGE'` để ngăn chặn việc dùng lại ảnh cũ.
- **Phòng chống tấn công Spam (Rate Limiting):**
  - Mỗi tài khoản người dân chỉ được phép nộp tối đa **5 báo cáo sự cố trong vòng 10 phút**. Nếu vượt quá, trả về mã lỗi HTTP `429 Too Many Requests`.

---

## 2. LOGIC RÀO CHẮN ĐỊA LÝ & BẢN ĐỒ (GEO-FENCING & SPATIAL DEDUPLICATION)

- **Kiểm tra ranh giới phụ trách (Geofencing Guard):**
  - Khi người dân nộp tọa độ GPS `(latitude, longitude)`, hệ thống kiểm tra xem điểm tọa độ có nằm trong phạm vi địa bàn mà cơ quan quản lý phụ trách hay không. Nếu nằm ngoài $\rightarrow$ Từ chối tiếp nhận với mã lỗi `400 Bad Request`.
- **Khử trùng lặp không gian (Spatial Deduplication - Bán kính 25m):**
  - Sử dụng giải thuật Haversine tính toán khoảng cách đại cầu:
    $$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
  - Nếu tồn tại sự cố khác cùng phân loại trong bán kính $r \le 25\text{ mét}$ đang trong trạng thái chưa đóng hồ sơ $\rightarrow$ Tự động gắn cờ `flag = 'POTENTIAL_DUPLICATE'` để Admin đối chiếu tránh điều phối 2 đội thi công trùng nhau.

---

## 3. LOGIC PHÂN NHÁNH THỊ GIÁC AI & MANUAL FALLBACK (AI VISION GATE)

AI đóng vai trò **hỗ trợ thẩm định**, tuyệt đối không trở thành cổng chặn tuyệt đối làm mất quyền phản ánh của công dân:

1. **Phát hiện rõ hư hỏng ($\text{Confidence} \ge \tau$):**
   - Gán `ai_status = 'AI_ANALYZED'`, gán `category` theo nhận diện YOLOv8 (hoặc `COMPLEX_DAMAGE` nếu phát hiện đa khuyết tật).
2. **Độ tin cậy thấp ($\text{Confidence} < \tau$):**
   - Vẫn cho phép gửi, gán `ai_status = 'AI_LOW_CONFIDENCE'`, đặt cờ `flag = 'NEEDS_MANUAL_REVIEW'` để đưa lên đầu hàng đợi thẩm định thủ công.
3. **Không phát hiện hư hỏng (Ổ gà ngập nước, góc chụp ngược sáng):**
   - Hiển thị hướng dẫn chụp lại, **vẫn cho phép người dân nộp thủ công** với `ai_status = 'MANUAL_FALLBACK'` (không khóa cứng nút gửi).
4. **Phát hiện đối tượng không liên quan:**
   - Cảnh báo người dân xác nhận để tránh bị trừ điểm vi phạm tin giả.

---

## 4. LOGIC SỔ CÁI ĐIỂM UY TÍN (REPUTATION LEDGER & IDEMPOTENCY)

Hệ thống áp dụng mô hình Sổ cái (Ledger) minh bạch qua bảng `user_reputation_transactions`:

- **Thang điểm uy tín tích lũy:** Dao động nghiêm ngặt từ **0 đến 1.000 điểm** (Khởi tạo mặc định: 50 điểm cho tài khoản công dân mới).
- **Quy tắc cộng điểm thưởng (Idempotent Bonus):**
  - Khi Admin duyệt hợp lệ (`VERIFIED`): Thưởng **+50 điểm** (`VERIFIED_BONUS`).
  - Khi nghiệm thu đạt chuẩn đóng hồ sơ (`CLOSED`): Thưởng **+100 điểm** (`CLOSED_BONUS`).
  - Tổng điểm thưởng cho một sự cố hoàn thành xuất sắc là **+150 điểm**.
  - **Chống cộng điểm trùng (Idempotency):** Áp dụng Unique Constraint `(user_id, incident_id, transaction_type)` tại tầng CSDL. Dù Admin bấm duyệt lại hoặc gọi API nhiều lần, hệ thống tuyệt đối không cấp điểm hai lần.
- **Quy tắc phân biệt khi Từ chối tiếp nhận (`REJECTED`):**
  - `DUPLICATE` (Báo cáo trùng lặp với người khác): **0 điểm phạt, 0 lần cảnh cáo**.
  - `INVALID_LOCATION` (Sai lệch vị trí khách quan do sai số GPS): **0 điểm phạt, 0 lần cảnh cáo**.
  - `FAKE_REPORT` / `SPAM` (Cố tình gửi ảnh mạng, bịa đặt hiện trường): Phạt **-100 điểm** (`PENALTY`) và ghi nhận vào bảng `user_violations`.
- **Cơ chế Thu Hồi Điểm (Reversal Policy):**
  - Nếu phát hiện gian lận sau khi đã duyệt hoặc đã đóng hồ sơ:
  - Hệ thống thu hồi lại khoản điểm thưởng đã cấp (`REVERSAL`: -50đ hoặc -150đ).
  - Áp dụng thêm chế tài phạt **-100 điểm** (`PENALTY`) và tăng số lần vi phạm.
  - Phân tách rõ ràng giữa *Thu hồi điểm thưởng (Reversal)* và *Phạt vi phạm (Penalty)*.

---

## 5. CHẾ TÀI XỬ LÝ VI PHẠM 3 MỨC ĐỘ (VIOLATION ENFORCEMENT)

Hệ thống quản lý lịch sử vi phạm qua bảng `user_violations`:

| Mức độ | Số lần vi phạm tích lũy | Chế tài áp dụng (`action_taken`) | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Mức 1** | Lần 1 - 2 | Cảnh cáo (`WARNING`) | Gửi thông báo cảnh báo người dùng cần kiểm tra kỹ hiện trường. |
| **Mức 2** | Lần 3 - 4 | Hạn chế (`RESTRICTED`) | Đưa tài khoản vào diện kiểm duyệt thủ công nghiêm ngặt; không được gắn cờ `TRUSTED_REPORT`. |
| **Mức 3** | Lần 5 trở lên | Khóa 7 ngày (`SUSPENDED_7_DAYS`) | Tự động cập nhật `suspended_until = NOW() + 7 ngày`. Hệ thống từ chối nhận báo cáo mới trong thời gian bị phạt. |

- **Cơ chế hủy cảnh cáo (Revocation):** Quản trị viên có quyền hủy cảnh cáo (`is_revoked = true`, ghi nhận `revoked_reason` và `revoked_by`) nếu người dân khiếu nại thành công do hệ thống xác minh nhầm.

---

## 6. LOGIC FAST-TRACK & VÒNG LẶP REWORK NGHIỆM THU

### 6.1. Cơ chế Fast-Track có kiểm soát (Bỏ qua khảo sát)
- Dành riêng cho sự cố đặc biệt khẩn cấp (hố tử thần nguy hiểm, đá sạt lở đèo chặn đường).
- Admin có quyền chuyển thẳng từ `VERIFIED` sang `ASSIGNED` giao đội thi công mà không cần qua bước `INSPECTION_ASSIGNED`.
- **Ràng buộc kiểm soát (Audit Guards):**
  - Bắt buộc nhập `fast_track_reason` có độ dài tối thiểu 10 ký tự.
  - Hệ thống tự động ghi nhận `fast_track_approved_by = adminId` và gắn `flag = 'FAST_TRACK'` để phục vụ thanh tra nội bộ.

### 6.2. Vòng lặp REWORK không giới hạn (QA Acceptance Loop)
- Tại Giai đoạn 6, Admin đối chiếu ảnh Before và After:
  - **Đạt chuẩn:** Chuyển `CLOSED`, ghi nhận `closed_at`, thưởng +100 điểm vào Sổ cái.
  - **Không đạt chuẩn:** Chuyển `REWORK_REQUIRED`, tăng biến đếm `rework_count = rework_count + 1`, bắt buộc ghi rõ hướng dẫn khắc phục `rework_reason` (tối thiểu 10 ký tự).
  - Tổ thi công khắc phục và nộp ảnh mới $\rightarrow$ chuyển `PENDING_ACCEPTANCE`.
  - Quá trình lặp lại cho đến khi đạt chất lượng, đảm bảo tuyệt đối không nghiệm thu cẩu thả. Điểm thưởng +100đ chỉ được cấp 1 lần duy nhất khi sự cố chính thức đóng hồ sơ.

---

## 7. LOGIC BẢNG XẾP HẠNG HAI TẦNG (DUAL-TRACK GAMIFICATION)

Hệ thống phân tách rạch ròi hai chỉ số vinh danh:

1. **Điểm thi đua tháng (Monthly Competition Points):**
   - Chỉ tính tổng các điểm thưởng phát sinh trong tháng hiện tại:
     $$\text{MonthlyPoints} = \sum \text{points} \quad (\text{với } \text{createdAt} \ge \text{StartOfMonth} \text{ và } \text{points} > 0)$$
   - Tự động làm mới về 0 vào ngày 1 hàng tháng để tạo động lực thi đua mới và công bằng cho mọi công dân.
2. **Điểm uy tín tích lũy dài hạn (Lifetime Reputation Score):**
   - Điểm số bền vững từ **0 đến 1.000 điểm**, quyết định Hạng công dân:
     - $\ge 800$ điểm: **Hạng Vàng** (Hiệp Sĩ Giao Thông) — Ưu tiên gắn cờ `TRUSTED_REPORT`, hỗ trợ duyệt nhanh Fast-Track.
     - $600 - 799$ điểm: **Hạng Bạc** (Đôi Mắt Đô Thị).
     - $400 - 599$ điểm: **Hạng Đồng** (Công Dân Tích Cực).
     - $100 - 399$ điểm: **Tiêu Chuẩn** (Thành Viên Tiêu Chuẩn).
     - $< 100$ điểm: **Cần Lưu Ý** (Kiểm duyệt thủ công nghiêm ngặt).
3. **Quy tắc phân định hòa điểm (Tie-Breaking Rule):**
   - Khi hai hoặc nhiều công dân có cùng điểm số (hoặc cùng đạt trần 1.000 điểm), công dân nào đạt mốc điểm đó sớm hơn (dựa trên thời điểm giao dịch `lastEarnedAt`) sẽ được xếp hạng cao hơn trên bảng vinh danh.

---

# PHẦN II: MA TRẬN CHUYỂN DỊCH TRẠNG THÁI (STATE MACHINE GUARDS)

Nghiêm cấm nhảy cóc trạng thái bất hợp pháp trong cơ sở dữ liệu. Mọi thay đổi phải tuân thủ ma trận sau:

| Trạng thái hiện tại | Trạng thái đích được phép | Tác nhân kích hoạt | Điều kiện bắt buộc |
| :--- | :--- | :--- | :--- |
| `SUBMITTED` | `AI_ANALYZED`, `VERIFIED`, `REJECTED` | AI Engine / Admin | Quét ảnh AI xong hoặc Admin thẩm định thủ công |
| `AI_ANALYZED` | `VERIFIED`, `REJECTED` | Quản trị viên (Admin) | Admin kiểm duyệt ảnh và tọa độ |
| `VERIFIED` | `INSPECTION_ASSIGNED`, `ASSIGNED` (Fast-Track), `REJECTED` | Quản trị viên (Admin) | Giao tổ khảo sát HOẶC Fast-Track kèm lý do khẩn cấp |
| `INSPECTION_ASSIGNED` | `INSPECTING` | Kỹ thuật viên khảo sát | Tổ khảo sát xuất phát tới hiện trường |
| `INSPECTING` | `INSPECTED` | Kỹ thuật viên khảo sát | Bắt buộc nhập biên bản đo đạc kích thước |
| `INSPECTED` | `ASSIGNED` | Quản trị viên (Admin) | Phê duyệt phương án thi công và giao tổ bảo trì |
| `ASSIGNED` | `IN_PROGRESS` | Tổ thi công | Bấm bắt đầu thi công tại hiện trường |
| `IN_PROGRESS` | `PENDING_ACCEPTANCE` | Tổ thi công | Bắt buộc tải lên ảnh bằng chứng After Image |
| `PENDING_ACCEPTANCE` | `CLOSED`, `REWORK_REQUIRED` | Quản trị viên (Admin) | Admin đối chiếu Before/After |
| `REWORK_REQUIRED` | `IN_PROGRESS`, `PENDING_ACCEPTANCE` | Tổ thi công | Tiến hành khắc phục và nộp ảnh mới |
| `CLOSED` | `REJECTED` (Fraud Revocation) | Quản trị viên (Admin) | Chỉ đổi sang REJECTED khi phát hiện gian lận qua lệnh reverse |
| `REJECTED` | *(Trạng thái kết thúc)* | - | Hồ sơ lưu trữ, không thể chỉnh sửa |
