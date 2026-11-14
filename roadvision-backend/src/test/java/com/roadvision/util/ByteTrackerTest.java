package com.roadvision.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ByteTrackerTest {

    @Test
    public void testContinuousTrackingAcrossFrames() {
        ByteTracker tracker = new ByteTracker(0.35f, 0.20f, 4);

        // Frame 1: Một ổ gà xuất hiện ở vị trí [100, 200, 80, 50]
        ImageTensorUtil.BoundingBox frame1Det = ImageTensorUtil.BoundingBox.builder()
                .className("POTHOLE")
                .confidence(0.85f)
                .x(100)
                .y(200)
                .width(80)
                .height(50)
                .build();

        List<ImageTensorUtil.BoundingBox> tracked1 = tracker.update(List.of(frame1Det));
        assertEquals(1, tracked1.size());
        int trackId1 = tracked1.get(0).getTrackId();
        assertTrue(trackId1 > 0);

        // Frame 2: Xe tuần tra tiến tới, ổ gà di chuyển nhẹ tới [105, 210, 85, 52]
        ImageTensorUtil.BoundingBox frame2Det = ImageTensorUtil.BoundingBox.builder()
                .className("POTHOLE")
                .confidence(0.88f)
                .x(105)
                .y(210)
                .width(85)
                .height(52)
                .build();

        List<ImageTensorUtil.BoundingBox> tracked2 = tracker.update(List.of(frame2Det));
        assertEquals(1, tracked2.size());
        assertEquals(trackId1, tracked2.get(0).getTrackId(), "Track ID phải được bảo toàn xuyên suốt các khung hình!");

        // Frame 3: Một cây đổ mới xuất hiện ở góc khác [400, 300, 300, 150]
        ImageTensorUtil.BoundingBox obstacleDet = ImageTensorUtil.BoundingBox.builder()
                .className("ROAD_OBSTACLE")
                .confidence(0.92f)
                .x(400)
                .y(300)
                .width(300)
                .height(150)
                .build();

        // Ổ gà vẫn còn trong frame 3
        ImageTensorUtil.BoundingBox frame3Pothole = ImageTensorUtil.BoundingBox.builder()
                .className("POTHOLE")
                .confidence(0.82f)
                .x(110)
                .y(220)
                .width(90)
                .height(55)
                .build();

        List<ImageTensorUtil.BoundingBox> tracked3 = tracker.update(List.of(frame3Pothole, obstacleDet));
        assertEquals(2, tracked3.size());

        ImageTensorUtil.BoundingBox potholeTrack = tracked3.stream()
                .filter(b -> "POTHOLE".equals(b.getClassName()))
                .findFirst().orElseThrow();
        ImageTensorUtil.BoundingBox treeTrack = tracked3.stream()
                .filter(b -> "ROAD_OBSTACLE".equals(b.getClassName()))
                .findFirst().orElseThrow();

        assertEquals(trackId1, potholeTrack.getTrackId(), "Ổ gà vẫn giữ nguyên Track ID 1!");
        assertNotEquals(trackId1, treeTrack.getTrackId(), "Cây đổ mới phải được cấp Track ID mới!");
    }

    @Test
    public void testTemporaryOcclusionHandledByLowConfidenceMatching() {
        ByteTracker tracker = new ByteTracker(0.35f, 0.15f, 4);

        // Frame 1: Detection mạnh
        ImageTensorUtil.BoundingBox d1 = ImageTensorUtil.BoundingBox.builder()
                .className("ROAD_OBSTACLE")
                .confidence(0.85f)
                .x(200).y(200).width(100).height(100)
                .build();
        List<ImageTensorUtil.BoundingBox> r1 = tracker.update(List.of(d1));
        int assignedId = r1.get(0).getTrackId();

        // Frame 2: Do xe xóc mờ, confidence tụt xuống 0.25f (Low Confidence)
        ImageTensorUtil.BoundingBox d2 = ImageTensorUtil.BoundingBox.builder()
                .className("ROAD_OBSTACLE")
                .confidence(0.25f)
                .x(202).y(205).width(98).height(102)
                .build();
        List<ImageTensorUtil.BoundingBox> r2 = tracker.update(List.of(d2));

        assertEquals(1, r2.size());
        assertEquals(assignedId, r2.get(0).getTrackId(), "Low confidence matching phải giữ được Track ID khi bị rung mờ!");
    }
}
