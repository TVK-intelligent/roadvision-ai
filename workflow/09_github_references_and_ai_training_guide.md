# PHÂN TÍCH CÁC CÔNG TRÌNH THAM KHẢO & HƯỚNG DẪN HUẤN LUYỆN AI
## HỆ THỐNG ROADCARE / ROADVISION - ĐỒ ÁN TỐT NGHIỆP KỸ SƯ CNTT

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp - Chương 2: Khảo Sát Các Công Trình Liên Quan (Related Works) & Phương Pháp Tiếp Cận Kiến Trúc  
> **Chiến lược:** Kế thừa chọn lọc tinh hoa từ 6 kho lưu trữ (repositories) mã nguồn mở hàng đầu, loại bỏ các thành phần cồng kềnh, thống nhất thành một giải pháp on-premise/cloud-ready tinh gọn: **Spring Boot + ONNX Runtime (Java) + React + MySQL**.

---

## 1. MA TRẬN PHÂN TÍCH 6 REPOSITORY THAM KHẢO

Hệ thống RoadVision được thiết kế dựa trên sự đúc kết từ 6 công trình mã nguồn mở tiêu biểu trong lĩnh vực thị giác máy tính và quản lý khiếu nại đô thị:

| STT | Tên Repository & Tác giả | Trọng tâm nghiên cứu | Thành phần RoadVision kế thừa | Thành phần loại bỏ / Cải tiến |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **`SamaIsmail91/Road-Damage-Detection`** | Nhận diện hư hại mặt đường bằng YOLO trên tập RDD2022 | - Tập dữ liệu chuẩn RDD2022<br>- Cấu hình `data.yaml`<br>- Pipeline huấn luyện YOLOv8<br>- Các chỉ số mAP, Precision, Recall | - Đổi luồng chạy suy luận từ script Python sang **ONNX Runtime Java** chạy trực tiếp trong JVM. |
| **2** | **`jaygala24/pothole-detection`** | Tập dữ liệu ổ gà chuyên sâu (1.243 ảnh annotate YOLO) | - Dữ liệu ảnh thực tế các hố sụt, ổ gà độ phân giải cao để tăng cường tập train (Data Augmentation) | - Kết hợp hợp nhất vào tập RDD2022 thành 1 model duy nhất. |
| **3** | **`DivyaKrishnani/Yolo-Road-Obstacle-Detection`** | Nhận diện chướng ngại vật mặt đường bằng YOLO / Darkflow | - Nhãn phân loại chướng ngại vật (`ROAD_OBSTACLE`) | - **Loại bỏ Darkflow lỗi thời**, chuẩn hóa về kiến trúc Ultralytics YOLOv8 / YOLOv11 hiện đại. |
| **4** | **`share2code99/road_flood_segmentation`** | Phân vùng & nhận diện ngập úng mặt đường | - Định nghĩa lớp ngập lụt (`ROAD_FLOODING`) | - Thay vì dùng mạng Semantic Segmentation phức tạp tốn GPU, chuyển thành phân loại/bounding box để đồng bộ pipeline YOLO. |
| **5** | **`moulendra143/Greviances_Management`** | Hệ thống quản lý phản ánh công dân toàn diện | - **Kiến trúc nghiệp vụ lõi**<br>- Spring Boot + React + MySQL<br>- Phân quyền Spring Security + JWT<br>- 3 Roles: Citizen, Admin, Staff<br>- Quy trình nộp $\rightarrow$ giao việc $\rightarrow$ ảnh Trước/Sau $\rightarrow$ đánh giá sao | - Bổ sung tầng suy luận AI tự động (repo gốc xử lý thủ công 100%). |
| **6** | **`Sujit-1509/CivicAI`** | Nền tảng phản ánh đô thị kết hợp AI & GPS | - Luồng UX: Tải ảnh $\rightarrow$ AI gợi ý nhãn $\rightarrow$ Trích xuất GPS $\rightarrow$ Tạo ticket điều phối | - **Loại bỏ hoàn toàn AWS Cloud** (Lambda, DynamoDB, Bedrock, SNS...) để tránh phụ thuộc và chi phí cloud, đưa về Spring Boot on-premise. |

---

## 2. TẠI SAO `Greviances_Management` & `SamaIsmail91` LÀ 2 TRỤ CỘT CHÍNH?

1. **Về mặt Kỹ thuật Phần mềm (`moulendra143/Greviances_Management`):**
   - Cung cấp mô hình kiến trúc hoàn hảo cho đồ án tốt nghiệp: Tách biệt rõ ràng Controller, Service, Repository, Entity.
   - Luồng nghiệp vụ khép kín chuẩn chính phủ điện tử: Công dân tạo phản ánh $\rightarrow$ Quản trị viên thẩm định & phân công $\rightarrow$ Cán bộ hiện trường thi công & nộp ảnh bằng chứng $\rightarrow$ Công dân nghiệm thu và chấm điểm.
2. **Về mặt Trí tuệ Nhân tạo (`SamaIsmail91/Road-Damage-Detection`):**
   - Bộ dữ liệu **RDD2022 (Road Damage Dataset)** là quy chuẩn học thuật quốc tế của hội nghị IEEE Big Data Cup. Sử dụng bộ dữ liệu này giúp báo cáo đồ án có cơ sở khoa học vững chắc và được hội đồng đánh giá cao.

---

## 3. LỘ TRÌNH TRIỂN KHAI 9 BƯỚC CHUẨN HOÁ (EXECUTION ROADMAP)

Hệ thống được phát triển theo đúng tuần tự kỹ thuật nhằm kiểm soát rủi ro và bảo đảm tiến độ:

```text
[Bước 1: Spring Boot + MySQL] ──> [Bước 2: User/Admin/Staff + JWT] ──> [Bước 3: Report + Ảnh + GPS]
                                                                                   │
[Bước 6: Export ONNX] <── [Bước 5: Train YOLO trên Colab] <── [Bước 4: Status + Assignment + Proof]
        │
        └──> [Bước 7: Spring Boot + ONNX Java] ──> [Bước 8: React AI Visualizer] ──> [Bước 9: Dashboard & Map]
```

- **Bước 1:** Khởi tạo Spring Boot 3.3, kết nối MySQL 8.0 với script DDL chuẩn `roadcare_db`. *(Đã hoàn tất)*
- **Bước 2:** Xây dựng hệ thống phân quyền Spring Security 6.x với JWT Stateless cho 3 vai trò: `ROLE_CITIZEN`, `ROLE_ADMIN`, `ROLE_STAFF`. *(Đã hoàn tất)*
- **Bước 3:** Hiện thực hóa API nộp phản ánh `POST /api/v1/incidents` kèm validate dung lượng $\le 10\text{MB}$, MIME type và rào chắn địa lý GPS. *(Đã hoàn tất)*
- **Bước 4:** Xây dựng máy trạng thái vòng đời sự cố, lịch sử phân công (`assignments`), ảnh bằng chứng thi công (`resolutions`) và đánh giá sao (`feedbacks`). *(Đã hoàn tất)*
- **Bước 5:** Huấn luyện mô hình YOLOv8 trên Google Colab với GPU T4 miễn phí dựa trên RDD2022.
- **Bước 6:** Xuất mô hình tốt nhất (`best.pt`) sang định dạng `yolov8_roadcare.onnx`.
- **Bước 7:** Tích hợp `onnxruntime` Java nạp trực tiếp file `.onnx` vào bộ nhớ JVM của Spring Boot để suy luận trong $30 - 50\text{ms}$. *(Đã hoàn tất khung code)*
- **Bước 8:** Giao diện React hiển thị khung vẽ Bounding Box màu xanh `#004ac6` kèm tỷ lệ phần trăm độ tin cậy của AI. *(Đã hoàn tất)*
- **Bước 9:** Bảng điều khiển quản trị (Dispatch Queue), bản đồ tương tác Leaflet và thống kê chỉ số SLA. *(Đã hoàn tất)*

---

## 4. CHIẾN LƯỢC HUẤN LUYỆN MÔ HÌNH TRÊN GOOGLE COLAB (VỚI LAPTOP 16GB RAM)

> ⚠️ **Lưu ý quan trọng:** Quá trình huấn luyện mạng nơ-ron học sâu YOLO trên tập dữ liệu hàng nghìn ảnh đòi hỏi GPU có VRAM từ 8GB trở lên. Với laptop thông thường (RAM 16GB, GPU tích hợp hoặc GPU rời phổ thông), **không nên huấn luyện trực tiếp trên máy** vì sẽ gây nóng máy, tràn RAM và mất hàng chục giờ đồng hồ.

### Giải pháp tối ưu:
1. **Huấn luyện:** Thực thi trên **Google Colab** (sử dụng GPU NVIDIA Tesla T4 15GB VRAM hoàn toàn miễn phí).
2. **Triển khai thực tế:** Tải tệp mô hình đã xuất `.onnx` về máy và đặt vào thư mục:
   📁 `roadvision-backend/src/main/resources/models/yolov8_roadcare.onnx`
3. **Thực thi suy luận (Inference):** Spring Boot với thư viện ONNX Runtime Java chỉ mất **~40ms trên CPU thông thường** của laptop để phân tích một bức ảnh, hoàn toàn mượt mà và không tốn tài nguyên!

---

## 5. CẤU HÌNH NHÃN DỮ LIỆU ĐỒNG BỘ (`data.yaml`)

Để thống nhất cả 4 nhóm hư hỏng mặt đường từ các repo tham khảo, cấu hình `data.yaml` cho YOLOv8 được thiết lập chuẩn hóa như sau:

```yaml
# Đường dẫn dữ liệu trên Google Colab
path: /content/dataset
train: images/train
val: images/val
test: images/test

# Số lượng lớp nhận diện
nc: 4

# Danh mục lớp hư hại mặt đường RoadVision
names:
  0: POTHOLE        # Ổ gà, hố sụt (Tham khảo: SamaIsmail91 + jaygala24)
  1: ROAD_CRACK     # Nứt ngang, nứt dọc, nứt mai rùa (Tham khảo: SamaIsmail91 RDD2022)
  2: ROAD_OBSTACLE  # Chướng ngại vật, gạch đá, rác thải (Tham khảo: DivyaKrishnani)
  3: ROAD_FLOODING  # Điểm ngập nước, úng cục bộ (Tham khảo: share2code99)
```

---

## 6. SCRIPT HUẤN LUYỆN & XUẤT ONNX TRÊN GOOGLE COLAB

Đoạn mã Python sau chạy trực tiếp trên 1 cell của Google Colab để huấn luyện và tự động xuất ra file `.onnx`:

```python
# 1. Cài đặt thư viện Ultralytics YOLOv8 & ONNX
!pip install ultralytics onnx onnxslim onnxruntime

# 2. Kiểm tra GPU khả dụng
import torch
print(f"Thiết bị huấn luyện: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")

# 3. Tiến hành huấn luyện mô hình YOLOv8n (bản nano nhẹ, phù hợp nhúng JVM)
from ultralytics import YOLO

# Khởi tạo mô hình pretrained yolov8n
model = YOLO('yolov8n.pt')

# Huấn luyện với kích thước ảnh chuẩn 640x640
results = model.train(
    data='data.yaml',
    epochs=50,          # 50 - 100 epochs
    imgsz=640,
    batch=16,
    patience=10,
    save=True,
    device=0            # GPU 0
)

# 4. Đánh giá chất lượng mô hình (mAP50, Precision, Recall)
metrics = model.val()
print(f"mAP 50: {metrics.box.map50}")
print(f"Precision: {metrics.box.mp}")
print(f"Recall: {metrics.box.mr}")

# 5. Xuất sang định dạng ONNX phục vụ nhúng trực tiếp vào Spring Boot
onnx_path = model.export(
    format='onnx',
    imgsz=640,
    dynamic=False,      # Cố định batch=1 để tối ưu bộ nhớ JVM
    simplify=True,      # Tối ưu hóa đồ thị tính toán
    opset=12            # Chuẩn tương thích cao với ONNX Runtime Java
)

print(f"Mô hình đã xuất thành công tại: {onnx_path}")
```
