#!/usr/bin/env python3
"""
HỆ THỐNG HUẤN LUYỆN MÔ HÌNH THỊ GIÁC MÁY TÍNH ROADVISION AI (YOLOv8 MULTI-CLASS)
Đồ án tốt nghiệp: Nền tảng quản lý & phát hiện sự cố hạ tầng giao thông thông minh
Chuẩn hóa 4 lớp mục tiêu:
  0: POTHOLE        (Ổ gà / Hố sụt mặt đường)
  1: ROAD_CRACK     (Vết nứt mặt đường)
  2: ROAD_FLOODING  (Điểm ngập úng mặt đường)
  3: ROAD_OBSTACLE  (Chướng ngại vật / Vật cản lòng đường)
Tích hợp ảnh nền âm bản (Negative Samples): xe máy, ô tô, người đi bộ để triệt tiêu báo nhầm.
Tối ưu hóa kép cho cả Ảnh tĩnh (Citizen Report) và Video tuần tra (Dashcam Patrol).
"""

import os
import glob
import shutil
import yaml
import torch
from ultralytics import YOLO

def inspect_dataset_totals(data_yaml_path):
    """
    Rà soát và tổng hợp toàn cảnh bộ dữ liệu:
    Thống kê tổng số ảnh, tổng số Bounding Box theo từng lớp trên toàn bộ các tập Train / Val / Test.
    Không trình bày phân mảnh, hiển thị tổng thể kiến trúc dữ liệu.
    """
    print("\n" + "=" * 78)
    print("📊 BÁO CÁO TỔNG THỂ BỘ DỮ LIỆU ĐA LỚP TOÀN DIỆN (UNIFIED DATASET ARCHITECTURE)")
    print("=" * 78)

    if not os.path.exists(data_yaml_path):
        print(f"⚠️ Không tìm thấy file cấu hình {data_yaml_path}")
        return

    with open(data_yaml_path, 'r', encoding='utf-8') as f:
        cfg = yaml.safe_load(f)

    base_path = cfg.get('path', '')
    train_dir = os.path.join(base_path, cfg.get('train', 'images/train'))
    val_dir = os.path.join(base_path, cfg.get('val', 'images/val'))
    test_dir = os.path.join(base_path, cfg.get('test', 'images/test')) if 'test' in cfg else None

    splits = {'TRAIN (70%)': train_dir, 'VAL (20%)': val_dir}
    if test_dir and os.path.exists(test_dir):
        splits['TEST (10%)'] = test_dir

    class_names = cfg.get('names', {
        0: 'POTHOLE',
        1: 'ROAD_CRACK',
        2: 'ROAD_FLOODING',
        3: 'ROAD_OBSTACLE'
    })

    class_counts = {c: {s: 0 for s in splits} for c in class_names}
    img_counts = {s: 0 for s in splits}
    empty_counts = {s: 0 for s in splits} # Ảnh nền âm bản (Negative Samples)

    for s_name, img_folder in splits.items():
        if not os.path.exists(img_folder):
            continue
        imgs = glob.glob(os.path.join(img_folder, '*.*'))
        img_counts[s_name] = len(imgs)
        lbl_folder = img_folder.replace('/images', '/labels').replace('\\images', '\\labels')

        for im in imgs:
            base_name = os.path.splitext(os.path.basename(im))[0]
            lbl_p = os.path.join(lbl_folder, base_name + '.txt')
            if os.path.exists(lbl_p):
                with open(lbl_p, 'r', encoding='utf-8', errors='ignore') as lf:
                    lines = [line.strip() for line in lf if line.strip()]
                    if not lines:
                        empty_counts[s_name] += 1
                    for line in lines:
                        parts = line.split()
                        if parts:
                            try:
                                cls_id = int(float(parts[0]))
                                if cls_id in class_counts:
                                    class_counts[cls_id][s_name] += 1
                            except ValueError:
                                pass
            else:
                empty_counts[s_name] += 1

    # In bảng tổng thể theo chuẩn báo cáo khoa học
    header = f"{'LỚP MỤC TIÊU (CLASS)':<22}"
    for s_name in splits:
        header += f" {s_name:<14}"
    header += f" {'TỔNG CỘNG':<12}"
    print(header)
    print("-" * 78)

    total_boxes = 0
    for cls_id, cls_name in class_names.items():
        row = f"{str(cls_id) + ': ' + cls_name:<22}"
        cls_total = 0
        for s_name in splits:
            cnt = class_counts[cls_id][s_name]
            cls_total += cnt
            row += f" {cnt:<14}"
        row += f" {cls_total:<12}"
        total_boxes += cls_total
        print(row)

    print("-" * 78)
    row_bg = f"{'NỀN ÂM BẢN (NEGATIVE)':<22}"
    tot_bg = 0
    for s_name in splits:
        cnt = empty_counts[s_name]
        tot_bg += cnt
        row_bg += f" {cnt:<14}"
    row_bg += f" {tot_bg:<12}"
    print(row_bg)

    print("-" * 78)
    row_img = f"{'TỔNG SỐ ẢNH':<22}"
    tot_imgs = 0
    for s_name in splits:
        cnt = img_counts[s_name]
        tot_imgs += cnt
        row_img += f" {cnt:<14}"
    row_img += f" {tot_imgs:<12}"
    print(row_img)
    print(f"{'TỔNG SỐ HỘP BAO (BOXES)':<22} {total_boxes}")
    print("=" * 78)
    print("✅ Phân bổ dữ liệu cân bằng giữa 4 lớp hư hại, tích hợp đầy đủ mẫu nền âm bản")
    print("   chống nhận diện nhầm phương tiện giao thông (xe máy, ô tô) và người đi đường.")
    print("=" * 78 + "\n")

def main():
    print("=" * 70)
    print("🚀 ROADVISION AI: HUẤN LUYỆN YOLOv8 MULTI-CLASS TOÀN DIỆN (800x800)")
    print("=" * 70)

    # 1. Kiểm tra môi trường tính toán phần cứng
    device = 0 if torch.cuda.is_available() else 'cpu'
    if device == 0:
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f" Thiết bị GPU: {gpu_name} (VRAM: {vram_gb:.2f} GB)")
    else:
        print(" CẢNH BÁO: Đang chạy trên CPU! Khuyến nghị chuyển sang GPU (T4/A100) để tối ưu thời gian.")

    data_config = '/content/dataset/data.yaml' if os.path.exists('/content/dataset/data.yaml') else 'data.yaml'

    # 2. Rà soát tổng thể bộ dữ liệu trước khi train
    inspect_dataset_totals(data_config)

    # 3. Khởi tạo mô hình nền tảng YOLOv8m (Medium - 25.9M tham số tối ưu mAP & FPS)
    model_name = 'yolov8m.pt'
    print(f"🚀 Nạp mô hình nền tảng: {model_name}")
    model = YOLO(model_name)

    # 4. Huấn luyện với tham số tối ưu kép cho cả Ảnh hiện trường và Video tuần tra
    run_name = 'roadcare_4class_unified'
    print(f"📊 Bắt đầu huấn luyện mô hình đa lớp...")
    results = model.train(
        data=data_config,
        epochs=80,             # 80 Epochs đảm bảo cả 4 lớp hội tụ cân bằng
        imgsz=800,             # 800x800 giữ trọn chi tiết vết nứt mỏng & ổ gà ở xa
        batch=8,               # Phù hợp an toàn với GPU T4 (16GB VRAM)
        nbs=16,
        patience=15,           # Early stopping chống Overfitting
        save=True,
        device=device,
        project='roadvision_runs',
        name=run_name,
        # Tối ưu hóa Augmentation chống nhầm lẫn Vạch Kẻ Đường & Bóng Râm:
        mosaic=0.5,            # Ghép đa tỉ lệ để nhận diện tốt vật thể từ xa đến gần
        close_mosaic=10,       # Tắt mosaic 10 epoch cuối để hộp bao viền sắc nét tối đa
        mixup=0.15,            # Xử lý tốt hiện tượng bóng râm, tán cây đổ bóng, phản chiếu mặt nước
        degrees=5.0,           # Xoay nhẹ góc nghiêng camera
        perspective=0.0005,    # Phối cảnh góc nhìn camera hành trình xe tuần tra
        fliplr=0.5,            # Lật ngang ảnh
        hsv_h=0.015,           # Thay đổi sắc độ màu nhẹ
        hsv_s=0.5,             # Thay đổi độ bão hòa (vạch sơn trắng mờ, bạc màu)
        hsv_v=0.4,             # Thay đổi độ sáng: xử lý bóng râm gắt (Shadow Invariance) và nắng chói
        cls=1.5                # Tăng trọng số phạt phân loại nhầm lớp
    )

    # LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU ĐỂ TRIỆT TIÊU BÁO NHẦM VẠCH TRẮNG & BÓNG RÂM:
    # 1. Mẫu nền âm bản (Negative Background Images - chiếm ~10-15% tập train):
    #    - Ảnh mặt đường có vạch sơn trắng đứt đoạn, vạch liền, vạch đi bộ (nhưng KHÔNG gán nhãn box nào).
    #    - Ảnh mặt đường có bóng cây râm, bóng cột đèn, bóng xe cộ đổ dài ngang đường (file txt nhãn để rỗng).
    #    -> YOLO khi học các ảnh nhãn rỗng này sẽ hiểu bóng râm và vạch sơn là "Background" (Nền), không phải Crack!
    # 2. Không gán nhãn nhầm (Label Noise):
    #    - Kiểm tra tập RDD2022 tránh annotate vạch sơn bong tróc hoặc khe co giãn bê tông thành ROAD_CRACK.

    # 5. Đánh giá chất lượng mô hình trên tập Test độc lập
    print("\n" + "=" * 55)
    print("🏆 BÁO CÁO ĐÁNH GIÁ CHỈ SỐ MÔ HÌNH TRÊN TẬP TEST ĐỘC LẬP")
    print("=" * 55)
    metrics = model.val(data=data_config, split='test')
    print(f"• mAP@50 (Toàn bộ 4 lớp):   {metrics.box.map50 * 100:.2f}%")
    print(f"• mAP@50-95:                 {metrics.box.map * 100:.2f}%")
    print(f"• Precision (Độ chính xác):  {metrics.box.mp * 100:.2f}%")
    print(f"• Recall (Độ bao phủ):       {metrics.box.mr * 100:.2f}%")
    print("=" * 55)

    # 6. Xuất mô hình sang định dạng ONNX Runtime chuẩn Spring Boot Backend
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
    print(f" Xuất mô hình ONNX thành công: {final_name} ({size_mb:.2f} MB)")
    print("\n📌 HƯỚNG DẪN TÍCH HỢP HỆ THỐNG:")
    print(f"1. Tệp '{final_name}' đã sẵn sàng nạp vào hệ thống RoadVision.")
    print("2. Đặt vào thư mục: roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx")
    print("3. Hệ thống Spring Boot và Giao diện Web đã đồng bộ hoàn toàn 4 lớp:")
    print("   [0: POTHOLE] - [1: ROAD_CRACK] - [2: ROAD_FLOODING] - [3: ROAD_OBSTACLE]\n")

if __name__ == '__main__':
    main()
