package com.roadvision.service;

import ai.onnxruntime.*;
import com.roadvision.util.ImageTensorUtil;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.FloatBuffer;
import java.util.*;
import java.util.List;

public class YoloRawEvaluationTest {

    private static final String[] CLASS_NAMES = {
        "POTHOLE",       // 0
        "ROAD_CRACK",    // 1
        "ROAD_FLOODING", // 2
        "ROAD_OBSTACLE"  // 3
    };

    @Test
    public void testStarbucksConesSlicing() throws Exception {
        File modelFile = new File("src/main/resources/models/yolov8_multiclass_roadcare.onnx");
        if (!modelFile.exists()) {
            modelFile = new File("roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx");
        }
        OrtEnvironment env = OrtEnvironment.getEnvironment();
        OrtSession session = env.createSession(modelFile.getAbsolutePath(), new OrtSession.SessionOptions());

        List<File> imageList = new ArrayList<>();
        collectImages(new File("C:/Users/trank/Downloads"), imageList);
        File coneImgFile = imageList.stream().filter(f -> f.getName().contains("106A1be3")).findFirst().orElse(null);
        if (coneImgFile == null) {
            System.out.println("Cone image not found!");
            return;
        }

        BufferedImage bimg = ImageIO.read(coneImgFile);
        int origW = bimg.getWidth();
        int origH = bimg.getHeight();
        System.out.printf("Test ảnh: %s (%dx%d)%n", coneImgFile.getName(), origW, origH);

        // Test 1: Full image raw inference (threshold 0.10)
        System.out.println("\n--- PASS 1: FULL IMAGE RAW INFERENCE (Threshold 0.10) ---");
        List<ImageTensorUtil.BoundingBox> fullBoxes = inferCrop(session, env, bimg, 0, 0, origW, origH, 0.10f);
        fullBoxes = ImageTensorUtil.applyNms(fullBoxes, 0.45f);
        printBoxes(fullBoxes);

        // Test 2: Sliced Tiles across Roadway (native resolution)
        System.out.println("\n--- PASS 2: SLICED TILES ACROSS ROADWAY (Native 800x800 resolution) ---");
        List<ImageTensorUtil.BoundingBox> allSliced = new ArrayList<>(fullBoxes);

        // Cắt 3 lát ngang theo mặt đường xe chạy:
        // Tile 1: Khu vực bên trái (cọc 4, cọc 5)
        Rectangle tileLeft = new Rectangle(150, 380, 800, 750);
        // Tile 2: Khu vực giữa (cọc 3, cọc 4)
        Rectangle tileMid = new Rectangle(650, 420, 800, 750);
        // Tile 3: Khu vực bên phải (cọc 1, cọc 2)
        Rectangle tileRight = new Rectangle(1100, 480, 800, 750);

        Rectangle[] roadTiles = {tileLeft, tileMid, tileRight};
        for (int t = 0; t < roadTiles.length; t++) {
            Rectangle r = roadTiles[t];
            int rx = Math.max(0, Math.min(r.x, origW - 1));
            int ry = Math.max(0, Math.min(r.y, origH - 1));
            int rw = Math.min(r.width, origW - rx);
            int rh = Math.min(r.height, origH - ry);
            BufferedImage sub = bimg.getSubimage(rx, ry, rw, rh);
            List<ImageTensorUtil.BoundingBox> tBoxes = inferCrop(session, env, sub, rx, ry, origW, origH, 0.10f);
            System.out.printf("Tile %d [%d, %d, %d, %d] -> Phát hiện %d box%n", t + 1, rx, ry, rw, rh, tBoxes.size());
            for (ImageTensorUtil.BoundingBox b : tBoxes) {
                System.out.printf("   * %s (%.1f%%) [x=%d, y=%d, w=%d, h=%d]%n",
                        b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight());
            }
            allSliced.addAll(tBoxes);
        }

        List<ImageTensorUtil.BoundingBox> finalNms = ImageTensorUtil.applyNms(allSliced, 0.35f);
        System.out.printf("%n=== TỔNG KẾT SAU KHI KẾT HỢP FULL + SLICED TILES (NMS): %d BOX ===%n", finalNms.size());
        printBoxes(finalNms);
    }

    private List<ImageTensorUtil.BoundingBox> inferCrop(OrtSession session, OrtEnvironment env,
                                                       BufferedImage img, int offsetX, int offsetY,
                                                       int origW, int origH, float thresh) throws Exception {
        int targetSize = 800;
        ImageTensorUtil.LetterboxInfo lb = ImageTensorUtil.letterbox(img, targetSize);
        long[] shape = new long[]{1, 3, targetSize, targetSize};
        float scale = lb.getScale();
        int padLeft = lb.getPadLeft();
        int padTop = lb.getPadTop();

        List<ImageTensorUtil.BoundingBox> list = new ArrayList<>();
        try (OnnxTensor tensor = OnnxTensor.createTensor(env, lb.getBuffer(), shape);
             OrtSession.Result res = session.run(Collections.singletonMap("images", tensor))) {

            float[][][] output = (float[][][]) res.get(0).getValue();
            int channels = output[0].length;
            int numAnchors = output[0][0].length;
            int numClasses = channels - 4;

            for (int i = 0; i < numAnchors; i++) {
                float cx = output[0][0][i];
                float cy = output[0][1][i];
                float w = output[0][2][i];
                float h = output[0][3][i];

                int bestClassId = 0;
                float bestConf = output[0][4][i];
                for (int c = 1; c < numClasses; c++) {
                    float score = output[0][4 + c][i];
                    if (score > bestConf) {
                        bestConf = score;
                        bestClassId = c;
                    }
                }

                if (bestConf >= thresh) {
                    float lxMin = (cx - w / 2.0f - padLeft) / scale;
                    float lyMin = (cy - h / 2.0f - padTop) / scale;
                    float lw = w / scale;
                    float lh = h / scale;

                    int gx = Math.max(0, Math.min(origW - 1, Math.round(lxMin + offsetX)));
                    int gy = Math.max(0, Math.min(origH - 1, Math.round(lyMin + offsetY)));
                    int gw = Math.min(origW - gx, Math.round(lw));
                    int gh = Math.min(origH - gy, Math.round(lh));

                    String className = (bestClassId >= 0 && bestClassId < CLASS_NAMES.length)
                            ? CLASS_NAMES[bestClassId] : "CLASS_" + bestClassId;

                    list.add(ImageTensorUtil.BoundingBox.builder()
                            .className(className)
                            .confidence(bestConf)
                            .x(gx)
                            .y(gy)
                            .width(gw)
                            .height(gh)
                            .build());
                }
            }
        }
        return list;
    }

    private void printBoxes(List<ImageTensorUtil.BoundingBox> boxes) {
        for (int i = 0; i < boxes.size(); i++) {
            ImageTensorUtil.BoundingBox b = boxes.get(i);
            System.out.printf("   [%d] %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                    i + 1, b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight());
        }
    }

    @Test
    public void testDiagnoseZeroBoxImages() throws Exception {
        File modelFile = new File("src/main/resources/models/yolov8_multiclass_roadcare.onnx");
        if (!modelFile.exists()) {
            modelFile = new File("roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx");
        }
        OrtEnvironment env = OrtEnvironment.getEnvironment();
        OrtSession session = env.createSession(modelFile.getAbsolutePath(), new OrtSession.SessionOptions());

        List<File> imageList = new ArrayList<>();
        collectImages(new File("C:/Users/trank/Downloads"), imageList);

        String[] targetNames = {
            "baodanang",
            "chuongvat",
            "OIP (2).jpg",
            "OIP (3).jpg",
            "vietnut"
        };

        System.out.println("\n========== DIAGNOSING 5 PROBLEMATIC IMAGES (RAW YOLO & UPSCALED) ==========\n");

        for (String target : targetNames) {
            File imgFile = imageList.stream().filter(f -> f.getName().contains(target)).findFirst().orElse(null);
            if (imgFile == null) continue;

            BufferedImage bimg = ImageIO.read(imgFile);
            System.out.printf(">>> Test: %-45s (%dx%d)%n", imgFile.getName(), bimg.getWidth(), bimg.getHeight());

            List<ImageTensorUtil.BoundingBox> rawBoxes = inferCrop(session, env, bimg, 0, 0, bimg.getWidth(), bimg.getHeight(), 0.05f);
            rawBoxes = ImageTensorUtil.applyNms(rawBoxes, 0.45f);

            for (ImageTensorUtil.BoundingBox b : rawBoxes) {
                System.out.printf("    [RAW]  %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                        b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight());
            }

            // Thử phóng to ảnh nhỏ (như OIP (3).jpg 260x166) lên 800px
            if (bimg.getWidth() < 500 || bimg.getHeight() < 400) {
                int targetW = Math.max(800, bimg.getWidth() * 2);
                int targetH = (int) ((long) bimg.getHeight() * targetW / bimg.getWidth());
                BufferedImage upscaled = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_RGB);
                Graphics2D g2 = upscaled.createGraphics();
                g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g2.drawImage(bimg, 0, 0, targetW, targetH, null);
                g2.dispose();

                List<ImageTensorUtil.BoundingBox> upBoxes = inferCrop(session, env, upscaled, 0, 0, targetW, targetH, 0.05f);
                upBoxes = ImageTensorUtil.applyNms(upBoxes, 0.45f);
                for (ImageTensorUtil.BoundingBox b : upBoxes) {
                    float origX = (float) b.getX() * bimg.getWidth() / targetW;
                    float origY = (float) b.getY() * bimg.getHeight() / targetH;
                    float origW = (float) b.getWidth() * bimg.getWidth() / targetW;
                    float origH = (float) b.getHeight() * bimg.getHeight() / targetH;
                    System.out.printf("    [UPSCALED] %-15s | Conf: %5.1f%% | Box: [x=%.0f, y=%.0f, w=%.0f, h=%.0f]%n",
                            b.getClassName(), b.getConfidence() * 100, origX, origY, origW, origH);
                }
            }
        }

        session.close();
        env.close();
    }

    private void collectImages(File dir, List<File> list) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return;
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.isDirectory()) {
                String dname = f.getName().toLowerCase();
                if (!dname.contains("roadvision_runs") && !dname.contains(".git") && !dname.contains("unikey")) {
                    collectImages(f, list);
                }
            } else {
                String lower = f.getName().toLowerCase();
                if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
                    list.add(f);
                }
            }
        }
    }
}
