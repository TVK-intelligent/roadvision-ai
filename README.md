# ROADCARE - HỆ THỐNG QUẢN LÝ SỰ CỐ GIAO THÔNG ĐÔ THỊ THÔNG MINH
## ĐỒ ÁN TỐT NGHIỆP KỸ SƯ CÔNG NGHỆ THÔNG TIN

Hệ thống ứng dụng Trí tuệ Nhân tạo thị giác máy tính (AI Computer Vision - YOLOv8 nhúng ONNX Runtime) kết hợp Nền tảng Điều phối Thông minh hỗ trợ người dân phản ánh hư hại mặt đường và chính quyền đô thị điều phối bảo trì hạ tầng giao thông theo thời gian thực.

---

## 1. CẤU TRÚC KHÔNG GIAN LÀM VIỆC (WORKSPACE DIRECTORY)

```text
e:\ĐATN\
├── workflow/                                   # THƯ MỤC THIẾT KẾ QUY TRÌNH & BẢN VẼ KỸ THUẬT CHUẨN ĐATN
│   ├── README.md                               # Hướng dẫn tra cứu & xuất tài liệu báo cáo
│   ├── 01_sequence_diagram.puml & .mmd         # Sơ đồ tuần tự luồng kỹ thuật (PlantUML & Mermaid)
│   ├── 02_incident_state_machine.puml & .mmd   # Sơ đồ máy trạng thái vòng đời sự cố
│   ├── 03_operational_workflow_spec.md         # Đặc tả chi tiết 5 pha vận hành kỹ thuật
│   ├── 04_raci_and_rbac_matrix.md              # Ma trận RACI & Phân quyền RBAC trên Spring Security
│   ├── 05_api_endpoints_contract.md            # Hợp đồng RESTful API chi tiết (Request/Response JSON)
│   ├── 06_database_schema_design.sql           # Script DDL MySQL chuẩn tạo bảng & dữ liệu mẫu
│   ├── 07_stitch_ui_mapping.md                 # Bản đồ khớp nối 9 màn hình Stitch UI vào 5 pha
│   └── 08_tasks_and_business_logic.md          # Những việc cần làm & Toàn bộ logic nghiệp vụ cốt lõi
│
├── stitch_roadcare_incident_management_ui/     # BỘ GIAO DIỆN UI/UX CÓ SẴN (GOOGLE STITCH / TAILWINDCSS)
│   └── stitch_roadcare_incident_management_ui/
│       ├── roadcare_ai_road_incident_platform_home/
│       ├── report_road_incident_ai_vision_scanner/
│       ├── my_submitted_reports_roadcare/
│       ├── municipal_incident_management_dispatch_queue_roadcare/
│       ├── incident_rc_8942_detailed_dossier_roadcare/
│       ├── roadcare_admin_control_center_analytics/
│       └── roadcare_ai_incident_engine/
│
├── BE/                                         # DỰ ÁN BACKEND (SPRING BOOT + ONNX RUNTIME JAVA)
└── FE/                                         # DỰ ÁN FRONTEND (REACT + VITE + TAILWINDCSS)
```

---

## 2. QUY TRÌNH VẬN HÀNH 5 PHA (5-PHASE OPERATIONAL WORKFLOW)

1. **Pha 1: Tiếp nhận phản ánh (Ingestion Phase):** Người dân chụp ảnh mặt đường, trình duyệt tự động lấy tọa độ GPS, nhập mô tả ngắn và gửi lên hệ thống.
2. **Pha 2: Phân tích & Phân loại tự động (AI Inference Phase):** Mô hình YOLOv8 chạy in-process qua thư viện ONNX Runtime (JVM), phát hiện ổ gà/nứt đường, vẽ Bounding Box, tính độ tin cậy. Nếu $\ge 70\% \rightarrow$ tự động gán nhãn `POTHOLE`, trạng thái `AI_ANALYZED`; nếu $< 70\% \rightarrow$ gắn cờ `NEEDS_MANUAL_REVIEW`.
3. **Pha 3: Thẩm định & Điều phối (Triage & Assignment Phase):** Quản trị viên (Admin) đối chiếu ảnh có vẽ BBox với bản đồ GIS vệ tinh, xác nhận loại sự cố và phân công cho nhân viên kỹ thuật (Staff). Trạng thái chuyển thành `ASSIGNED`.
4. **Pha 4: Thực thi tại hiện trường (Execution & Resolution Phase):** Kỹ thuật viên đến hiện trường, bấm *"Bắt đầu xử lý"* (`IN_PROGRESS`), tiến hành vá đường, chụp ảnh nghiệm thu hoàn thiện (Proof of Work) tải lên hệ thống. Trạng thái chuyển thành `RESOLVED`.
5. **Pha 5: Nghiệm thu & Đóng luồng (Verification & Closure Phase):** Người dân xem giao diện so sánh Before/After, chấm điểm hài lòng từ 1 đến 5 sao và xác nhận đóng phiếu (`CLOSED`).

---

## 3. CÁCH BẮT ĐẦU

- Để nghiên cứu quy chuẩn kỹ thuật hoặc đưa vào báo cáo đồ án, hãy mở thư mục [`workflow/`](./workflow/README.md).
- Để xem các việc cần làm tiếp theo khi lập trình BE & FE, hãy mở [`workflow/08_tasks_and_business_logic.md`](./workflow/08_tasks_and_business_logic.md).
