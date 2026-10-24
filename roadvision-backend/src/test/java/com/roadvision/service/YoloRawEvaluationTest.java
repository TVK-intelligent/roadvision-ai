package com.roadvision.service;

import ai.onnxruntime.*;
import com.roadvision.util.ImageTensorUtil;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.FloatBuffer;
import java.util.*;

public class YoloRawEvaluationTest {

    private static final String[] CLASS_NAMES = {
        "POTHOLE",       // 0
        "ROAD_CRACK",    // 1
        "ROAD_FLOODING", // 2
        "ROAD_OBSTACLE"  // 3
    };

    @Test
    public void evaluateAllDownloadImages() throws Exception {
        File modelFile = new File("src/main/resources/models/yolov8_multiclass_roadcare.onnx");
        if (!modelFile.exists()) {
            modelFile = new File("roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx");
        }
        System.out.println("Model path: " + modelFile.getAbsolutePath() + " (Exists: " + modelFile.exists() + ", Size: " + modelFile.length() + ")");

        OrtEnvironment env = OrtEnvironment.getEnvironment();
        OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
        OrtSession session = env.createSession(modelFile.getAbsolutePath(), opts);

        System.out.println("Inputs: " + session.getInputNames());
        System.out.println("Outputs: " + session.getOutputNames());
        NodeInfo inInfo = session.getInputInfo().get("images");
        if (inInfo != null && inInfo.getInfo() instanceof TensorInfo tInfo) {
            System.out.println("Input 'images' shape: " + Arrays.toString(tInfo.getShape()));
        }
        for (String outName : session.getOutputNames()) {
            NodeInfo outInfo = session.getOutputInfo().get(outName);
            if (outInfo != null && outInfo.getInfo() instanceof TensorInfo tInfo) {
                System.out.println("Output '" + outName + "' shape: " + Arrays.toString(tInfo.getShape()));
            }
        }

        File downloadsDir = new File("C:/Users/trank/Downloads");
        File[] images = downloadsDir.listFiles((dir, name) -> {
            String lower = name.toLowerCase();
            return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
        });

        if (images == null || images.length == 0) {
            System.out.println("No images found in Downloads directory.");
            return;
        }

        System.out.println("\n========== BẮT ĐẦU TEST RAW YOLO TRÊN " + images.length + " ẢNH MỤC DOWNLOAD ==========\n");

        int targetSize = 800;
        float testThreshold = 0.05f;

        for (int idx = 0; idx < images.length; idx++) {
            File imgFile = images[idx];
            System.out.println("----------------------------------------------------------------------");
            System.out.printf("[%d/%d] FILE: %s (%d bytes)%n", idx + 1, images.length, imgFile.getName(), imgFile.length());

            BufferedImage bimg;
            try {
                bimg = ImageIO.read(imgFile);
            } catch (Exception e) {
                System.out.println("   [LỖI] Không đọc được định dạng ảnh: " + e.getMessage());
                continue;
            }
            if (bimg == null) {
                System.out.println("   [LỖI] ImageIO trả về null (có thể là webp chưa có plugin tương thích trong test runner)");
                continue;
            }

            int origW = bimg.getWidth();
            int origH = bimg.getHeight();
            System.out.printf("   Kích thước ảnh gốc: %dx%d%n", origW, origH);

            ImageTensorUtil.LetterboxInfo lb = ImageTensorUtil.letterbox(bimg, targetSize);
            FloatBuffer tensorBuffer = lb.getBuffer();
            long[] shape = new long[]{1, 3, targetSize, targetSize};
            float scale = lb.getScale();
            int padLeft = lb.getPadLeft();
            int padTop = lb.getPadTop();

            List<ImageTensorUtil.BoundingBox> rawBoxes = new ArrayList<>();

            try (OnnxTensor inputTensor = OnnxTensor.createTensor(env, tensorBuffer, shape);
                 OrtSession.Result results = session.run(Collections.singletonMap("images", inputTensor))) {

                float[][][] output = (float[][][]) results.get(0).getValue();
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

                    if (bestConf >= testThreshold) {
                        float xMin = (cx - w / 2.0f - padLeft) / scale;
                        float yMin = (cy - h / 2.0f - padTop) / scale;
                        float boxW = w / scale;
                        float boxH = h / scale;

                        int boxX = Math.max(0, Math.round(xMin));
                        int boxY = Math.max(0, Math.round(yMin));
                        int finalW = Math.min(origW - boxX, Math.round(boxW));
                        int finalH = Math.min(origH - boxY, Math.round(boxH));

                        String className = (bestClassId >= 0 && bestClassId < CLASS_NAMES.length)
                                ? CLASS_NAMES[bestClassId]
                                : ("CLASS_" + bestClassId);

                        rawBoxes.add(ImageTensorUtil.BoundingBox.builder()
                                .className(className)
                                .confidence(bestConf)
                                .x(boxX)
                                .y(boxY)
                                .width(finalW)
                                .height(finalH)
                                .build());
                    }
                }
            }

            // Apply NMS
            List<ImageTensorUtil.BoundingBox> nmsBoxes = ImageTensorUtil.applyNms(rawBoxes, 0.45f);

            if (nmsBoxes.isEmpty()) {
                System.out.println("   -> PURE YOLOv8 KẾT QUẢ: KHÔNG PHÁT HIỆN HƯ HỎNG (0 BOX)");
            } else {
                System.out.printf("   -> PURE YOLOv8 KẾT QUẢ: Phát hiện %d box hư hỏng:%n", nmsBoxes.size());
                for (int bIdx = 0; bIdx < nmsBoxes.size(); bIdx++) {
                    ImageTensorUtil.BoundingBox b = nmsBoxes.get(bIdx);
                    System.out.printf("      [%d] Class: %-15s | Raw Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                            bIdx + 1, b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            }
        }
    }
}
