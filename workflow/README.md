# Hệ Thống Quản Lý Sự Cố Giao Thông Đô Thị Thông Minh (RoadCare)
## TÀI LIỆU THIẾT KẾ QUY TRÌNH KỸ THUẬT (WORKFLOW BLUEPRINT)

> **Dành cho:** Báo cáo Đồ án Tốt nghiệp & Hướng dẫn Triển khai Mã nguồn Backend (`BE`) - Frontend (`FE`)  
> **Phiên bản:** v2.4 (Chuẩn kỹ thuật ĐATN)  
> **Công nghệ áp dụng:** React (Vite/TailwindCSS) + Spring Boot (Java 17/21) + ONNX Runtime (YOLOv8/v11 Embedded) + MySQL 8.0

---

## 1. Giới Thiệu Tổng Quan

Thư mục `workflow/` này đóng vai trò là **Bản thiết kế kỹ thuật (Technical Specification & Architecture Blueprint)** cốt lõi của toàn bộ hệ thống RoadCare. Tài liệu được biên soạn đồng bộ chặt chẽ giữa:
1. **9 màn hình thiết kế giao diện có sẵn** trong `stitch_roadcare_incident_management_ui/`.
2. **Quy trình nghiệp vụ 5 pha (Phase-by-Phase Operational Workflow)**.
3. **Mô hình Trí tuệ Nhân tạo thị giác máy tính tích hợp trực tiếp (In-Process ONNX Runtime Inference)** không cần duy trì Python microservice.
4. **Hệ thống phân quyền dựa trên vai trò (RBAC) chuẩn Spring Security** tương ứng với ma trận RACI.

---

## 2. Cấu Trúc Tài Liệu Trong Thư Mục `workflow/`

| Tệp tin | Tên tài liệu | Mô tả & Mục đích sử dụng |
| :--- | :--- | :--- |
| **`01_sequence_diagram.puml`** | Sơ đồ tuần tự (PlantUML) | Mã nguồn PlantUML luồng giao tiếp giữa 6 thành phần: Citizen, React, Spring Boot, ONNX Runtime, MySQL, Admin/Staff. Dùng xuất ảnh báo cáo. |
| **`01_sequence_diagram.mmd`** | Sơ đồ tuần tự (Mermaid) | Định dạng Mermaid hiển thị trực quan trực tiếp trên GitHub, VSCode và Markdown viewer. |
| **`02_incident_state_machine.puml`** | Sơ đồ máy trạng thái (PlantUML) | Vòng đời chuyển dịch trạng thái của thực thể Sự cố (`IncidentStatus`). |
| **`02_incident_state_machine.mmd`** | Sơ đồ máy trạng thái (Mermaid) | Bản Mermaid biểu diễn trực quan các bước chuyển trạng thái sự cố. |
| **`03_operational_workflow_spec.md`** | Đặc tả 5 pha vận hành kỹ thuật | Chi tiết 5 pha: Tiếp nhận (P1) $\rightarrow$ Phân tích AI (P2) $\rightarrow$ Thẩm định & Phân công (P3) $\rightarrow$ Thực thi hiện trường (P4) $\rightarrow$ Nghiệm thu & Đóng luồng (P5). Đưa thẳng vào chương Thiết kế hệ thống. |
| **`04_raci_and_rbac_matrix.md`** | Ma trận RACI & Phân quyền RBAC | Bảng phân chia trách nhiệm (R-A-C-I) và bảng ánh xạ cấu hình Spring Security `@PreAuthorize` cho từng API. |
| **`05_api_endpoints_contract.md`** | Hợp đồng RESTful API chi tiết | Đặc tả đầy đủ Request/Response JSON, mã trạng thái HTTP (200, 201, 400, 403, 404, 500) phục vụ làm việc song song giữa BE và FE. |
| **`06_database_schema_design.sql`** | Lược đồ Cơ sở dữ liệu MySQL | Script DDL hoàn chỉnh tạo 6 bảng chính (`users`, `incidents`, `ai_detections`, `assignments`, `resolutions`, `feedbacks`), khóa ngoại, chỉ mục GPS và dữ liệu mẫu khởi tạo. |
| **`07_stitch_ui_mapping.md`** | Bản đồ khớp nối Stitch UI | Bảng đối chiếu chính xác giữa 9 màn hình thiết kế Stitch UI với các pha nghiệp vụ và các API tương ứng. |
| **`08_tasks_and_business_logic.md`** | Việc cần làm & Logic hệ thống cốt lõi | Danh mục toàn bộ các logic kiểm tra (validation), rào cản địa lý (geo-fencing), giải thuật NMS/Tensor, bảo đảm toàn vẹn và Checklist phân rã công việc chi tiết cho BE & FE. |
| **`09_github_references_and_ai_training_guide.md`** | Phân tích 6 Repo tham khảo & Hướng dẫn train AI | Phân tích chuyên sâu 6 repo tham khảo (`Greviances_Management`, `SamaIsmail91`, `jaygala24`, `CivicAI`...), chiến lược huấn luyện YOLOv8 trên Colab cho máy 16GB RAM và xuất sang ONNX. |
| **`ai_training/`** | Thư mục mã nguồn huấn luyện AI | Chứa `data.yaml`, script `train_yolo.py` và hướng dẫn chạy miễn phí trên Google Colab với GPU T4. |

---

## 3. Cách Sử Dụng Cho Báo Cáo Đồ Án Tốt Nghiệp

1. **Chương 2 / Chương 3 (Phân tích & Thiết kế Hệ thống):**
   - Đưa nội dung từ `03_operational_workflow_spec.md` vào phần Mô tả ca sử dụng chi tiết (Detailed Use Case Specification).
   - Render tệp `01_sequence_diagram.puml` hoặc sao chép mã Mermaid từ `01_sequence_diagram.mmd` để chèn biểu đồ tuần tự kỹ thuật.
   - Trích xuất `02_incident_state_machine.puml` cho phần Sơ đồ chuyển trạng thái thực thể.
   - Đưa ma trận RACI trong `04_raci_and_rbac_matrix.md` vào phần Phân định quyền hạn và tác nhân hệ thống.
2. **Chương 4 (Thiết kế Dữ liệu & Kiến trúc Giao tiếp):**
   - Đưa script và mô hình thực thể quan hệ (ERD) trích từ `06_database_schema_design.sql` vào phần Thiết kế Cơ sở dữ liệu.
   - Trích xuất `05_api_endpoints_contract.md` vào phần Thiết kế RESTful API Gateway.
3. **Chương 5 (Thực nghiệm & Triển khai):**
   - Áp dụng `08_tasks_and_business_logic.md` và `07_stitch_ui_mapping.md` để minh chứng quá trình hiện thực hóa giao diện và logic máy học ONNX trên nền JVM.

---

## 4. Hướng Dẫn Render Sơ Đồ

- **Đối với PlantUML (`.puml`):**
  - Cài đặt tiện ích mở rộng **PlantUML** trong VS Code (hoặc truy cập trang trực tuyến [PlantText](https://www.planttext.com/) / [PlantUML Server](https://www.plantuml.com/plantuml/uml/)).
  - Nhấn `Alt + D` trong VS Code để xem trước và xuất ảnh PNG/SVG vector chất lượng cao phục vụ in ấn luận văn.
- **Đối với Mermaid (`.mmd`):**
  - Xem trực tiếp bằng tính năng Preview Markdown của VS Code, GitHub, GitLab hoặc trang [Mermaid Live Editor](https://mermaid.live/).
