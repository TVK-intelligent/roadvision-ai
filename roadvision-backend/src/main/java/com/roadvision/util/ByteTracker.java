package com.roadvision.util;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Thuật toán bám vết đối tượng đa mục tiêu thời gian thực (Multi-Object Tracking - ByteTrack)
 * Chuyên biệt dành riêng cho luồng Video Tuần Tra (Patrol Video Stream / Dashcam).
 *
 * Tính năng chính:
 * 1. Ghép nối 2 tầng (Two-stage association): Tận dụng cả detection tự tin cao và thấp
 *    để bám vết liên tục khi xe di chuyển qua ổ gà / cây đổ bị rung lắc mờ (Motion Blur).
 * 2. Gán Track ID duy nhất xuyên suốt các khung hình, triệt tiêu hiện tượng đếm trùng sự cố.
 * 3. Bộ lọc làm mượt tọa độ (EMA Smoothing) triệt tiêu hiện tượng nhấp nháy Bounding Box (Flickering).
 */
@Component
public class ByteTracker {

    private final AtomicInteger nextId = new AtomicInteger(1);
    private final List<Track> activeTracks = new ArrayList<>();

    private final float highConfThresh;
    private final float matchIoUThresh;
    private final int maxTimeLost;

    public ByteTracker() {
        this(0.35f, 0.18f, 6);
    }

    public ByteTracker(float highConfThresh, float matchIoUThresh, int maxTimeLost) {
        this.highConfThresh = highConfThresh;
        this.matchIoUThresh = matchIoUThresh;
        this.maxTimeLost = maxTimeLost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Track {
        private int id;
        private int x;
        private int y;
        private int width;
        private int height;
        private float confidence;
        private String className;
        private int hits;
        private int age;
        private int timeSinceUpdate;
        private List<int[]> polygon;

        public void update(ImageTensorUtil.BoundingBox b) {
            // Làm mượt tọa độ theo EMA (0.70 giá trị mới + 0.30 giá trị cũ)
            this.x = (int) (0.70f * b.getX() + 0.30f * this.x);
            this.y = (int) (0.70f * b.getY() + 0.30f * this.y);
            this.width = (int) (0.70f * b.getWidth() + 0.30f * this.width);
            this.height = (int) (0.70f * b.getHeight() + 0.30f * this.height);
            this.confidence = Math.max(this.confidence, b.getConfidence());
            this.className = b.getClassName();
            this.polygon = (b.getPolygon() != null && !b.getPolygon().isEmpty()) ? b.getPolygon() : this.polygon;
            this.hits++;
            this.timeSinceUpdate = 0;
        }
    }

    /**
     * Cập nhật danh sách detection từ frame hiện tại và gán Track ID liên tục.
     */
    public synchronized List<ImageTensorUtil.BoundingBox> update(List<ImageTensorUtil.BoundingBox> detections) {
        if (detections == null) detections = Collections.emptyList();

        for (Track t : activeTracks) {
            t.setAge(t.getAge() + 1);
            t.setTimeSinceUpdate(t.getTimeSinceUpdate() + 1);
        }

        // Tách thành 2 nhóm độ tự tin (High Confidence và Low Confidence)
        List<ImageTensorUtil.BoundingBox> highDets = new ArrayList<>();
        List<ImageTensorUtil.BoundingBox> lowDets = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox d : detections) {
            if (d.getConfidence() >= highConfThresh) {
                highDets.add(d);
            } else {
                lowDets.add(d);
            }
        }

        boolean[] trackMatched = new boolean[activeTracks.size()];
        boolean[] highMatched = new boolean[highDets.size()];

        // TẦNG 1: Ghép cặp High Confidence Detections với Active Tracks
        for (int i = 0; i < highDets.size(); i++) {
            ImageTensorUtil.BoundingBox d = highDets.get(i);
            int bestTrackIdx = -1;
            float bestIoU = matchIoUThresh;

            for (int j = 0; j < activeTracks.size(); j++) {
                if (trackMatched[j]) continue;
                Track t = activeTracks.get(j);
                if (!t.getClassName().equals(d.getClassName())) continue;

                float iou = computeIoU(d.getX(), d.getY(), d.getWidth(), d.getHeight(),
                                       t.getX(), t.getY(), t.getWidth(), t.getHeight());
                if (iou > bestIoU) {
                    bestIoU = iou;
                    bestTrackIdx = j;
                }
            }

            if (bestTrackIdx != -1) {
                activeTracks.get(bestTrackIdx).update(d);
                trackMatched[bestTrackIdx] = true;
                highMatched[i] = true;
            }
        }

        // TẦNG 2: Ghép cặp Low Confidence Detections với các Track chưa được ghép (Bù đắp vật thể bị mờ/rung)
        for (int i = 0; i < lowDets.size(); i++) {
            ImageTensorUtil.BoundingBox d = lowDets.get(i);
            int bestTrackIdx = -1;
            float bestIoU = matchIoUThresh * 0.9f;

            for (int j = 0; j < activeTracks.size(); j++) {
                if (trackMatched[j]) continue;
                Track t = activeTracks.get(j);
                if (!t.getClassName().equals(d.getClassName())) continue;

                float iou = computeIoU(d.getX(), d.getY(), d.getWidth(), d.getHeight(),
                                       t.getX(), t.getY(), t.getWidth(), t.getHeight());
                if (iou > bestIoU) {
                    bestIoU = iou;
                    bestTrackIdx = j;
                }
            }

            if (bestTrackIdx != -1) {
                activeTracks.get(bestTrackIdx).update(d);
                trackMatched[bestTrackIdx] = true;
            }
        }

        // Khởi tạo Track mới cho các High Confidence Detections chưa ghép cặp
        for (int i = 0; i < highDets.size(); i++) {
            if (!highMatched[i]) {
                ImageTensorUtil.BoundingBox d = highDets.get(i);
                Track newTrack = Track.builder()
                        .id(nextId.getAndIncrement())
                        .x(d.getX())
                        .y(d.getY())
                        .width(d.getWidth())
                        .height(d.getHeight())
                        .confidence(d.getConfidence())
                        .className(d.getClassName())
                        .hits(1)
                        .age(1)
                        .timeSinceUpdate(0)
                        .polygon(d.getPolygon())
                        .build();
                activeTracks.add(newTrack);
            }
        }

        // Xóa các Track đã ra khỏi khung hình quá lâu (> maxTimeLost)
        Iterator<Track> it = activeTracks.iterator();
        while (it.hasNext()) {
            Track t = it.next();
            if (t.getTimeSinceUpdate() > maxTimeLost) {
                it.remove();
            }
        }

        // Xuất danh sách BoundingBox đã gắn Track ID ổn định cho client
        List<ImageTensorUtil.BoundingBox> output = new ArrayList<>();
        for (Track t : activeTracks) {
            // Chỉ trả về các Track vừa cập nhật ở frame này và đã được xác nhận (hits >= 1)
            if (t.getTimeSinceUpdate() == 0) {
                output.add(ImageTensorUtil.BoundingBox.builder()
                        .x(t.getX())
                        .y(t.getY())
                        .width(t.getWidth())
                        .height(t.getHeight())
                        .confidence(t.getConfidence())
                        .className(t.getClassName())
                        .polygon(t.getPolygon())
                        .trackId(t.getId())
                        .build());
            }
        }

        return output;
    }

    public synchronized void reset() {
        activeTracks.clear();
        nextId.set(1);
    }

    public static float computeIoU(int x1, int y1, int w1, int h1, int x2, int y2, int w2, int h2) {
        int ix = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
        int iy = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
        float inter = (float) ix * iy;
        float union = (float) w1 * h1 + (float) w2 * h2 - inter;
        if (union <= 0.0001f) return 0f;
        return inter / union;
    }
}
