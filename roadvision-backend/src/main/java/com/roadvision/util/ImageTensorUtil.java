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
     * Tiền xử lý ảnh theo chuẩn YOLOv8 Letterbox (mặc định 640x640).
     */
    public static LetterboxInfo letterbox(BufferedImage originalImage) {
        return letterbox(originalImage, INPUT_SIZE);
    }

    /**
     * Tiền xử lý ảnh theo chuẩn YOLOv8 Letterbox với kích thước đầu vào linh hoạt:
     * - Giữ nguyên tỷ lệ khung hình, bù viền xám 114, trả về FloatBuffer NCHW + scale/pad.
     * - Đọc pixel một lần bằng getRGB(bulk) thay vì từng pixel (kết quả giống hệt, nhanh hơn).
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
        g.setColor(new java.awt.Color(114, 114, 114));
        g.fillRect(0, 0, target, target);

        Image scaled = originalImage.getScaledInstance(newW, newH, Image.SCALE_SMOOTH);
        g.drawImage(scaled, padLeft, padTop, null);
        g.dispose();

        int plane = target * target;
        int[] pixels = letterboxed.getRGB(0, 0, target, target, null, 0, target);

        float[] rChannel = new float[plane];
        float[] gChannel = new float[plane];
        float[] bChannel = new float[plane];

        for (int i = 0; i < plane; i++) {
            int rgb = pixels[i];
            rChannel[i] = ((rgb >> 16) & 0xFF) / 255.0f;
            gChannel[i] = ((rgb >> 8) & 0xFF) / 255.0f;
            bChannel[i] = (rgb & 0xFF) / 255.0f;
        }

        FloatBuffer floatBuffer = FloatBuffer.allocate(3 * plane);
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

    public static FloatBuffer createFloatBufferFromImage(BufferedImage originalImage) {
        return letterbox(originalImage).getBuffer();
    }

    /**
     * Class-aware NMS.
     * ĐÃ SỬA: ngưỡng ioMin của ROAD_OBSTACLE hạ từ 0.80 xuống 0.60 để khử khung trùng do full-image + tile,
     * nhưng vẫn giữ riêng các vật cản đứng cạnh nhau (thùng hàng, cọc tiêu).
     */
    public static List<BoundingBox> applyNms(List<BoundingBox> boxes, float iouThreshold) {
        List<BoundingBox> selectedBoxes = new ArrayList<>();
        boxes.sort(Comparator.comparing(BoundingBox::getConfidence).reversed());

        boolean[] isSuppressed = new boolean[boxes.size()];

        for (int i = 0; i < boxes.size(); i++) {
            if (isSuppressed[i]) continue;

            BoundingBox current = boxes.get(i);
            selectedBoxes.add(current);

            for (int j = i + 1; j < boxes.size(); j++) {
                if (isSuppressed[j]) continue;

                BoundingBox other = boxes.get(j);
                if (java.util.Objects.equals(current.getClassName(), other.getClassName())) {
                    float iou = computeIoU(current, other);
                    float ioMin = computeIoMin(current, other);

                    if ("ROAD_OBSTACLE".equals(current.getClassName())) {
                        if (iou >= 0.45f || ioMin >= 0.60f) {
                            isSuppressed[j] = true;
                        }
                    } else {
                        if (iou >= iouThreshold || ioMin >= 0.65f) {
                            isSuppressed[j] = true;
                        }
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

        long intersectionWidth = Math.max(0, x2 - x1);
        long intersectionHeight = Math.max(0, y2 - y1);
        long intersectionArea = intersectionWidth * intersectionHeight;

        long areaA = (long) a.getWidth() * a.getHeight();
        long areaB = (long) b.getWidth() * b.getHeight();
        long unionArea = areaA + areaB - intersectionArea;

        return unionArea <= 0 ? 0.0f : (float) intersectionArea / unionArea;
    }

    public static float computeIoMin(BoundingBox a, BoundingBox b) {
        int x1 = Math.max(a.getX(), b.getX());
        int y1 = Math.max(a.getY(), b.getY());
        int x2 = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth());
        int y2 = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight());

        long intersectionWidth = Math.max(0, x2 - x1);
        long intersectionHeight = Math.max(0, y2 - y1);
        long intersectionArea = intersectionWidth * intersectionHeight;

        long minArea = Math.min((long) a.getWidth() * a.getHeight(), (long) b.getWidth() * b.getHeight());
        return minArea <= 0 ? 0.0f : (float) intersectionArea / minArea;
    }
}