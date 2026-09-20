package com.roadvision.util;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class ImageTensorUtil {

    public static final int INPUT_SIZE = 640;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoundingBox {
        private int x;
        private int y;
        private int width;
        private int height;
        private float confidence;
        private String className;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LetterboxInfo {
        private FloatBuffer buffer;
        private float scale;
        private int padLeft;
        private int padTop;
    }

    /**
     * Tiền xử lý ảnh theo chuẩn YOLOv8 Letterbox:
     * - Giữ nguyên tỷ lệ khung hình (aspect ratio) của ảnh gốc.
     * - Co kích thước tối đa vừa với khung 640x640.
     * - Bù viền xám RGB (114, 114, 114) vào 2 bên hoặc trên dưới.
     * - Trả về FloatBuffer NCHW và thông số pad/scale để quy đổi tọa độ ngược lại ảnh gốc.
     */
    public static LetterboxInfo letterbox(BufferedImage originalImage) {
        return letterbox(originalImage, INPUT_SIZE);
    }

    /**
     * Tiền xử lý ảnh theo chuẩn YOLOv8 Letterbox với kích thước đầu vào linh hoạt (640, 800, 1024):
     * - Giữ nguyên tỷ lệ khung hình (aspect ratio) của ảnh gốc.
     * - Co kích thước tối đa vừa với khung targetSize x targetSize.
     * - Bù viền xám RGB (114, 114, 114) vào 2 bên hoặc trên dưới.
     * - Trả về FloatBuffer NCHW và thông số pad/scale để quy đổi tọa độ ngược lại ảnh gốc.
     */
    public static LetterboxInfo letterbox(BufferedImage originalImage, int targetSize) {
        int target = targetSize > 0 ? targetSize : INPUT_SIZE;
        int origW = originalImage.getWidth();
        int origH = originalImage.getHeight();

        float scale = Math.min((float) target / origW, (float) target / origH);
        int newW = Math.round(origW * scale);
        int newH = Math.round(origH * scale);

        int padLeft = (target - newW) / 2;
        int padTop = (target - newH) / 2;

        BufferedImage letterboxed = new BufferedImage(target, target, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = letterboxed.createGraphics();
        // Điền nền xám 114 (chuẩn YOLO)
        g.setColor(new java.awt.Color(114, 114, 114));
        g.fillRect(0, 0, target, target);

        // Vẽ ảnh đã co giãn vào giữa
        Image scaled = originalImage.getScaledInstance(newW, newH, Image.SCALE_SMOOTH);
        g.drawImage(scaled, padLeft, padTop, null);
        g.dispose();

        FloatBuffer floatBuffer = FloatBuffer.allocate(1 * 3 * target * target);
        float[] rChannel = new float[target * target];
        float[] gChannel = new float[target * target];
        float[] bChannel = new float[target * target];

        for (int y = 0; y < target; y++) {
            for (int x = 0; x < target; x++) {
                int rgb = letterboxed.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int gVal = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int index = y * target + x;
                rChannel[index] = r / 255.0f;
                gChannel[index] = gVal / 255.0f;
                bChannel[index] = b / 255.0f;
            }
        }

        floatBuffer.put(rChannel);
        floatBuffer.put(gChannel);
        floatBuffer.put(bChannel);
        floatBuffer.flip();

        return LetterboxInfo.builder()
                .buffer(floatBuffer)
                .scale(scale)
                .padLeft(padLeft)
                .padTop(padTop)
                .build();
    }

    /**
     * Resize ảnh về 640x640 và chuyển đổi ma trận điểm ảnh thành NCHW FloatBuffer
     */
    public static FloatBuffer createFloatBufferFromImage(BufferedImage originalImage) {
        return letterbox(originalImage).getBuffer();
    }

    /**
     * Thuật toán Non-Maximum Suppression (NMS) để loại bỏ các hộp bao dư thừa
     */
    public static List<BoundingBox> applyNms(List<BoundingBox> boxes, float iouThreshold) {
        List<BoundingBox> selectedBoxes = new ArrayList<>();
        // Sắp xếp các box theo độ tin cậy giảm dần
        boxes.sort(Comparator.comparing(BoundingBox::getConfidence).reversed());

        boolean[] isSuppressed = new boolean[boxes.size()];

        for (int i = 0; i < boxes.size(); i++) {
            if (isSuppressed[i]) continue;

            BoundingBox current = boxes.get(i);
            selectedBoxes.add(current);

            for (int j = i + 1; j < boxes.size(); j++) {
                if (isSuppressed[j]) continue;

                BoundingBox other = boxes.get(j);
                // Class-aware NMS: Chỉ triệt tiêu các box của cùng 1 loại hư hại
                if (java.util.Objects.equals(current.getClassName(), other.getClassName())) {
                    float iou = computeIoU(current, other);
                    float ioMin = computeIoMin(current, other);
                    if (iou >= iouThreshold || ioMin >= 0.65f) {
                        isSuppressed[j] = true;
                    }
                }
            }
        }

        return selectedBoxes;
    }

    public static float computeIoU(BoundingBox a, BoundingBox b) {
        int x1 = Math.max(a.getX(), b.getX());
        int y1 = Math.max(a.getY(), b.getY());
        int x2 = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth());
        int y2 = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight());

        int intersectionWidth = Math.max(0, x2 - x1);
        int intersectionHeight = Math.max(0, y2 - y1);
        int intersectionArea = intersectionWidth * intersectionHeight;

        int areaA = a.getWidth() * a.getHeight();
        int areaB = b.getWidth() * b.getHeight();
        int unionArea = areaA + areaB - intersectionArea;

        return unionArea <= 0 ? 0.0f : (float) intersectionArea / unionArea;
    }

    public static float computeIoMin(BoundingBox a, BoundingBox b) {
        int x1 = Math.max(a.getX(), b.getX());
        int y1 = Math.max(a.getY(), b.getY());
        int x2 = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth());
        int y2 = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight());

        int intersectionWidth = Math.max(0, x2 - x1);
        int intersectionHeight = Math.max(0, y2 - y1);
        int intersectionArea = intersectionWidth * intersectionHeight;

        int minArea = Math.min(a.getWidth() * a.getHeight(), b.getWidth() * b.getHeight());
        return minArea <= 0 ? 0.0f : (float) intersectionArea / minArea;
    }
}
