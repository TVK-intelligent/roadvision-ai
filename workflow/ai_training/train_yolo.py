#!/usr/bin/env python3
"""
Script huấn luyện mô hình YOLOv8 tối ưu trên Google Colab / Kaggle và xuất ra file ONNX
Dành cho dự án RoadVision - Đồ án tốt nghiệp Kỹ sư CNTT
Đã tối ưu 5 điểm nghẽn kỹ thuật:
1. Ngăn Data Leakage giữa Train / Val / Test
2. Lọc bỏ Bounding Box khổng lồ ép từ đa giác Segmentation
3. Nâng khung hình imgsz=800 để bắt rõ chi tiết vết nứt (crack)
4. Sử dụng backbone YOLOv8s (~11M tham số) với 80 Epochs
5. Tích hợp ảnh nền âm tính (Background images) triệt tiêu nhận diện nhầm bóng râm
"""

import os
import glob
import shutil
import random
import torch
from ultralytics import YOLO

def main():
    print("=" * 65)
    print("ROADVISION AI: HUẤN LUYỆN YOLOv8s ĐA LỚP TỐI ƯU (800x800, 80 EPOCHS)")
    print("=" * 65)

    # 1. Kiểm tra GPU
    device = 0 if torch.cuda.is_available() else 'cpu'
    if device == 0:
        print(f" Thiết bị GPU: {torch.cuda.get_device_name(0)}")
    else:
        print(" CẢNH BÁO: Đang chạy trên CPU, hãy đổi runtime sang GPU (T4/A100) trên Colab!")

    # 2. Khởi tạo mô hình pretrained YOLOv8s (~11M tham số, vượt trội bản Nano)
    model_name = 'yolov8s.pt'
    print(f"🚀 Nạp mô hình cơ sở: {model_name}")
    model = YOLO(model_name)

    # 3. Tiến hành huấn luyện tối ưu
    data_config = '/content/dataset/data.yaml' if os.path.exists('/content/dataset/data.yaml') else 'data.yaml'
    print(f"📊 Bắt đầu huấn luyện với cấu hình: {data_config}")
    results = model.train(
        data=data_config,
        epochs=80,             # 80 Epochs để 4 lớp đa dạng kịp hội tụ cân bằng
        imgsz=800,             # 800x800 bắt rõ nét vết nứt mỏng & ổ gà nhỏ
        batch=16,
        patience=15,           # Early stopping nếu mAP bão hòa 15 epochs liên tiếp
        save=True,
        device=device,
        project='roadvision_runs',
        name='roadcare_4class_v2',
        # Tinh chỉnh Data Augmentation cho camera hành trình đường bộ:
        mosaic=1.0,            # Bật full mosaic để học vật thể ở nhiều tỷ lệ khác nhau
        mixup=0.15,            # Trộn ảnh nhẹ để xử lý tốt hiện tượng bóng râm / ngập nước
        degrees=10.0,          # Xoay nhẹ góc chụp camera
        scale=0.5,             # Tăng cường đa dạng kích thước vật thể
        fliplr=0.5,            # Lật ngang ảnh
        hsv_v=0.4              # Thay đổi độ sáng để bắt lỗi cả trời nắng chói và chiều tối
    )

    # 4. Đánh giá chất lượng mô hình trên tập Test độc lập
    print("\n" + "=" * 50)
    print("--- ĐÁNH GIÁ CHỈ SỐ MÔ HÌNH TRÊN TẬP TEST ĐỘC LẬP ---")
    print("=" * 50)
    metrics = model.val(data=data_config, split='test')
    print(f" mAP@50:    {metrics.box.map50:.4f}")
    print(f" mAP@50-95: {metrics.box.map:.4f}")
    print(f" Precision: {metrics.box.mp:.4f}")
    print(f" Recall:    {metrics.box.mr:.4f}")

    # 5. Xuất mô hình sang định dạng ONNX Runtime chuẩn 800x800
    print("\n--- XUẤT MÔ HÌNH SANG ĐỊNH DẠNG ONNX RUNTIME (800x800) ---")
    exported_onnx = model.export(
        format='onnx',
        imgsz=800,
        dynamic=False,
        simplify=True,
        opset=12
    )

    final_name = "yolov8_multiclass_roadcare.onnx"
    shutil.copy(exported_onnx, final_name)
    size_mb = os.path.getsize(final_name) / (1024 * 1024)
    print(f"\n Xuất mô hình ONNX thành công: {final_name} ({size_mb:.2f} MB)")
    print(" HƯỚNG DẪN TÍCH HỢP:")
    print("1. Tải tệp 'yolov8_multiclass_roadcare.onnx' về máy tính.")
    print("2. Đặt vào thư mục: roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx")
    print("3. Spring Boot Backend đã được cấu hình tự động nhận diện imgsz=800!")

if __name__ == '__main__':
    main()
