# 📋 BẢNG ĐÁNH DẤU TIẾN ĐỘ THỬ NGHIỆM TỪNG ĐỐI TƯỢNG HƯ HẠI (ROADVISION AI)

> Tài liệu theo dõi chất lượng từng mô hình thành phần trước khi ghép thành 1 mô hình tổng thể duy nhất (`yolov8_multiclass_roadcare.onnx`).

---

## 🎯 DANH SÁCH FILE NOTEBOOK VÀ TIẾN ĐỘ HUẤN LUYỆN

| STT | Đối tượng kiểm thử | Tên File Notebook trên máy | Bộ dữ liệu chuyên sâu | Thời gian train | Độ tự tin kỳ vọng | Trạng thái nghiệm thu |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | **Ổ gà mặt đường**<br>`0: POTHOLE` | Đã tích hợp trong hệ thống | **Ryukijano Potholes** (Ổ gà khoét sâu, đọng nước) | ~20 phút | >= 70% | 🟢 **ĐÃ ĐẠT (70.3%)** |
| **2** | **Vết nứt mặt đường**<br>`1: ROAD_CRACK` | `train_yolov8_crack_specialist.ipynb` | **RDD2022** (Nứt chân chim, nứt dọc, nứt ngang, nứt lưới) | ~20 phút | >= 65% - 80% | 🟡 **ĐANG CHỜ TEST** |
| **3** | **Điểm ngập úng**<br>`2: ROAD_FLOODING` | `train_yolov8_flood_specialist.ipynb` | **Urban Flood Detection** (Xe cộ lội nước, bọt sóng cuộn) | ~20 phút | >= 65% - 80% | ⚪ Chưa chạy |
| **4** | **Chướng ngại vật**<br>`3: ROAD_OBSTACLE` | `train_yolov8_obstacle_specialist.ipynb` | **Dderedor Obstacles** (Cọc tiêu, thùng phuy, rào chắn, sạt lở) | ~20 phút | >= 65% - 80% | ⚪ Chưa chạy |

---

## 🚀 HƯỚNG DẪN TEST TỪNG FILE TRÊN GOOGLE COLAB

Tất cả các file notebook chuyên biệt đều được thiết kế **siêu gọn - siêu nhanh**:
- Tải dữ liệu chỉ mất **5 - 15 giây** (không lỗi 401, không bị Rate Limit).
- Huấn luyện chỉ **30 - 35 Epochs** (chạy khoảng **20 phút** trên GPU Tesla T4).
- **✨ Ô cuối cùng (Bước 5):** Có nút **`Choose Files`** cho phép bạn chọn ảnh chụp thực tế từ máy tính tải lên để xem ngay mô hình có nhảy độ tự tin **>= 65% - 85%** hay không.

### 📝 Các bước thực hiện:
1. **Mở Google Colab** -> Tải file `train_yolov8_crack_specialist.ipynb` lên trước.
2. Bật GPU: `Runtime > Change runtime type > Chọn T4 GPU`.
3. Bấm **Runtime > Run all** (Chạy tất cả).
4. Khi chạy đến **Bước 5**, bấm nút **`Choose Files`** để upload ảnh vết nứt từ máy tính của bạn:
   - Nếu kết quả nhảy ra khung nhận diện với độ tự tin **>= 65% - 85%**: 👉 Đánh dấu 🟢 **ĐẠT**.
   - Nếu còn góc nào chưa đạt: 👉 Nhắn lại để tinh chỉnh dữ liệu.
5. Tiếp tục làm tương tự với 2 file còn lại: `train_yolov8_flood_specialist.ipynb` và `train_yolov8_obstacle_specialist.ipynb`.

---

## 🏆 KẾ HOẠCH GỘP SAU CÙNG (FINAL FUSION)
Khi cả 4 dòng trên đều được đánh dấu 🟢 **ĐẠT**:
1. Kích hoạt script **tự động gộp toàn bộ 4 tập dữ liệu chuẩn** thành 1 tập duy nhất.
2. Huấn luyện 1 lần cuối để xuất ra file duy nhất: **`yolov8_multiclass_roadcare.onnx`**.
3. Nạp vào Backend Spring Boot -> Toàn bộ hệ thống Web/App RoadVision sẽ bắt mượt mà cả 4 loại hư hại!
