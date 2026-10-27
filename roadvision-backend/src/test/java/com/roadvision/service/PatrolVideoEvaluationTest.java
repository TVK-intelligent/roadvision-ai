package com.roadvision.service;

import com.roadvision.util.ImageTensorUtil;
import org.jcodec.api.FrameGrab;
import org.jcodec.common.model.Picture;
import org.jcodec.scale.AWTUtil;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.lang.reflect.Field;
import java.util.List;

public class PatrolVideoEvaluationTest {

    @Test
    public void testVideo1() throws Exception {
        evaluateVideo("video_tuan_tra_o_ga.mp4");
    }

    @Test
    public void testPotholeTrackerVideo() throws Exception {
        evaluateVideo("pothole_tracker_test.mp4");
    }

    private void evaluateVideo(String filename) throws Exception {
        DefaultResourceLoader loader = new DefaultResourceLoader();
        PatrolVideoAiService videoService = new PatrolVideoAiService(loader);

        Field confField = PatrolVideoAiService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(videoService, 0.20f);

        Field iouField = PatrolVideoAiService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(videoService, 0.45f);

        videoService.init();

        File videoFile = new File("E:/DATN/roadvision-frontend/public/sample-videos/" + filename);
        if (!videoFile.exists()) {
            videoFile = new File("E:/DATN/sample-videos/" + filename);
        }
        if (!videoFile.exists()) {
            System.out.println("Video file not found: " + filename);
            return;
        }

        System.out.println("\n========== TEST SAMPLE VIDEO: " + videoFile.getName() + " ==========\n");
        FrameGrab grab = FrameGrab.createFrameGrab(org.jcodec.common.io.NIOUtils.readableChannel(videoFile));

        int frameIndex = 0;
        int sampledCount = 0;
        int totalDetections = 0;
        Picture picture;

        // Simple Centroid / IoU Multi-Object Tracker
        class TrackedObj {
            int id;
            float x, y, w, h;
            int lastFrame;
            int hitCount;
            boolean crossedLine;
        }
        java.util.List<TrackedObj> tracks = new java.util.ArrayList<>();
        int nextId = 1;
        float lineY = 0.62f;
        int totalCrossedLine = 0;

        while ((picture = grab.getNativeFrame()) != null) {
            if (frameIndex % 6 == 0) {
                sampledCount++;
                BufferedImage frameImg = AWTUtil.toBufferedImage(picture);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(frameImg, "jpg", baos);
                byte[] imgBytes = baos.toByteArray();

                List<ImageTensorUtil.BoundingBox> boxes = videoService.runVideoFrameInference(
                        new ByteArrayInputStream(imgBytes), 0.20f);

                totalDetections += boxes.size();

                // Match with existing tracks
                java.util.Set<Integer> matchedTracks = new java.util.HashSet<>();
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    float normX = (float) b.getX() / frameImg.getWidth();
                    float normY = (float) b.getY() / frameImg.getHeight();
                    float normW = (float) b.getWidth() / frameImg.getWidth();
                    float normH = (float) b.getHeight() / frameImg.getHeight();
                    float cx = normX + normW / 2;
                    float cy = normY + normH / 2;

                    TrackedObj bestTr = null;
                    float bestDist = 0.18f;

                    for (TrackedObj tr : tracks) {
                        if (matchedTracks.contains(tr.id)) continue;
                        float trCx = tr.x + tr.w / 2;
                        float trCy = tr.y + tr.h / 2;
                        float dx = Math.abs(cx - trCx);
                        float dy = cy - trCy; // car moving forward, object moves down (+dy)

                        if (dy >= -0.05f && dy <= 0.25f && dx <= 0.15f) {
                            float dist = (float) Math.hypot(dx, dy);
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestTr = tr;
                            }
                        }
                    }

                    if (bestTr != null) {
                        matchedTracks.add(bestTr.id);
                        float prevCy = bestTr.y + bestTr.h / 2;
                        bestTr.x = normX;
                        bestTr.y = normY;
                        bestTr.w = normW;
                        bestTr.h = normH;
                        bestTr.lastFrame = frameIndex;
                        bestTr.hitCount++;

                        if (!bestTr.crossedLine && (prevCy < lineY && cy >= lineY || (normY <= lineY && normY + normH >= lineY))) {
                            bestTr.crossedLine = true;
                            totalCrossedLine++;
                        }
                    } else {
                        TrackedObj newTr = new TrackedObj();
                        newTr.id = nextId++;
                        newTr.x = normX;
                        newTr.y = normY;
                        newTr.w = normW;
                        newTr.h = normH;
                        newTr.lastFrame = frameIndex;
                        newTr.hitCount = 1;
                        if (normY <= lineY && normY + normH >= lineY) {
                            newTr.crossedLine = true;
                            totalCrossedLine++;
                        }
                        tracks.add(newTr);
                        matchedTracks.add(newTr.id);
                    }
                }
            }
            frameIndex++;
        }

        // Filter valid tracks (seen in at least 2 frames)
        long reliableTracks = tracks.stream().filter(t -> t.hitCount >= 2).count();
        long crossedLineReliable = tracks.stream().filter(t -> t.hitCount >= 2 && t.crossedLine).count();

        System.out.printf("\n=======================================================\n");
        System.out.printf("TỔNG KẾT TOÀN BỘ VIDEO 2 (%.2f giây, %d frames):\n", frameIndex / 30.0, frameIndex);
        System.out.printf(" - Tổng số lượt phát hiện BBox (tất cả frame): %d\n", totalDetections);
        System.out.printf(" - Tổng số ổ gà ĐỘC LẬP xuất hiện trên đường (Hit >= 2): %d ổ gà\n", reliableTracks);
        System.out.printf(" - Số ổ gà ĐỘC LẬP đi qua vạch đếm (Y=0.62): %d ổ gà\n", crossedLineReliable);
        System.out.printf("=======================================================\n");
        videoService.destroy();
    }
}
