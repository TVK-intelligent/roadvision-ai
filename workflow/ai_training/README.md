# HƯỚNG DẪN HUẤN LUYỆN YOLOv8 TRÊN GOOGLE COLAB & XUẤT ONNX CHO ROADVISION

Thư mục này chứa toàn bộ mã nguồn và cấu hình phục vụ việc huấn luyện mô hình Trí tuệ Nhân tạo thị giác máy tính dựa trên tập dữ liệu RDD2022 và các nguồn tham khảo:
- `SamaIsmail91/Road-Damage-Detection` (RDD2022)
- `jaygala24/pothole-detection` (Dữ liệu ổ gà)

---

## 1. TẠI SAO PHẢI HUẤN LUYỆN TRÊN GOOGLE COLAB?
- Huấn luyện YOLO yêu cầu GPU có VRAM lớn (tối thiểu 8GB).
- Máy tính cá nhân (16GB RAM, không có GPU rời mạnh) nếu cố gắng train sẽ bị quá tải, quạt quay lớn, nóng máy và tốn từ 10 đến 20 giờ.
- **Google Colab cung cấp GPU NVIDIA T4 (15GB VRAM) hoàn toàn miễn phí**, thời gian huấn luyện 50 epochs chỉ mất khoảng **15 - 25 phút**!

---

## 2. CÁC BƯỚC THỰC HIỆN TRÊN GOOGLE COLAB:

### Bước 1: Mở Google Colab
- Truy cập trang [colab.research.google.com](https://colab.research.google.com/) và chọn *"New Notebook"*.
- Vào menu **Runtime** $\rightarrow$ **Change runtime type** $\rightarrow$ chọn **T4 GPU** $\rightarrow$ bấm **Save**.

### Bước 2: Cài đặt thư viện Ultralytics
Chạy cell lệnh sau trên Colab:
```bash
!pip install ultralytics onnx onnxslim
```

### Bước 3: Tải dữ liệu và cấu hình lên Colab
- Tải tập dữ liệu RDD2022 hoặc Pothole (đã gán nhãn theo định dạng YOLO) lên Google Drive hoặc upload trực tiếp vào thư mục `/content/dataset`.
- Kéo thả file `data.yaml` và `train_yolo.py` từ thư mục này lên khung Files của Colab.

### Bước 4: Chạy lệnh huấn luyện và xuất ONNX
Chạy cell lệnh:
```bash
!python train_yolo.py
```
Quá trình huấn luyện sẽ chạy qua 50 epochs, tính toán các chỉ số mAP, Precision, Recall và tự động xuất ra file:
`roadvision_runs/yolov8_roadcare/weights/best.onnx`

### Bước 5: Nhúng vào Backend Spring Boot của bạn
1. Bấm chuột phải vào file `best.onnx` trên Colab và chọn **Download** về máy tính.
2. Đổi tên tệp thành:
   `yolov8_roadcare.onnx`
3. Copy và dán tệp đó vào thư mục dự án trên máy:
   📁 `e:\ĐATN\roadvision-backend\src\main\resources\models\yolov8_roadcare.onnx`
4. Khởi động lại Spring Boot:
   Hệ thống sẽ tự động phát hiện tệp mô hình, nạp vào bộ nhớ JVM qua thư viện ONNX Runtime Java và thực thi suy luận trong **~40ms** trực tiếp trên CPU của máy bạn mà không tốn một chút RAM nào!
