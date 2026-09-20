package com.roadvision.service;

import com.roadvision.util.ImageTensorUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.List;

@SpringBootTest
public class CropAndInspectTest {

    @Autowired
    private AiInferenceService aiInferenceService;

    @Test
    public void testUserDashcamImage() throws Exception {
        File f = new File("C:/Users/trank/.gemini/antigravity/brain/f79e389f-e3f2-45a8-9811-06a2da25abc9/.user_uploaded/media_1789884254588.png");
        BufferedImage full = ImageIO.read(f);
        System.out.println("=== USER DASHCAM IMAGE (" + full.getWidth() + "x" + full.getHeight() + ") ===");

        // In media_1789884254588.png, the video frame is in the upper portion
        // Let's test the upper portion (the video element)
        // Video element is approximately from x=0 to w=full.getWidth(), y=0 to where the white buttons start
        int vh = (int) (full.getHeight() * 0.85);
        BufferedImage videoFrame = full.getSubimage(0, 0, full.getWidth(), vh);
        inspectImage("User Dashcam Full Frame", videoFrame, 0.15f);

        // Now let's test ONLY the road portion (excluding the car hood in the bottom ~45%)
        int roadH = (int) (vh * 0.52);
        BufferedImage roadOnly = videoFrame.getSubimage(0, 0, videoFrame.getWidth(), roadH);
        inspectImage("User Dashcam Road Only (No Hood) - Thresh 15%", roadOnly, 0.15f);
        inspectImage("User Dashcam Road Only (No Hood) - Thresh 25%", roadOnly, 0.25f);
    }

    private void inspectImage(String label, BufferedImage img, float thresh) throws Exception {
        System.out.println("\n--- Testing " + label + " (" + img.getWidth() + "x" + img.getHeight() + ") ---");
        int inputSize = 800;
        ImageTensorUtil.LetterboxInfo lb = ImageTensorUtil.letterbox(img, inputSize);
        ai.onnxruntime.OrtEnvironment env = ai.onnxruntime.OrtEnvironment.getEnvironment();
        ai.onnxruntime.OrtSession session = env.createSession("e:/DATN/roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx", new ai.onnxruntime.OrtSession.SessionOptions());

        try (ai.onnxruntime.OnnxTensor inputTensor = ai.onnxruntime.OnnxTensor.createTensor(env, lb.getBuffer(), new long[]{1, 3, inputSize, inputSize});
             ai.onnxruntime.OrtSession.Result results = session.run(java.util.Collections.singletonMap("images", inputTensor))) {

            float[][][] output = (float[][][]) results.get(0).getValue();
            int channels = output[0].length;
            int numAnchors = output[0][0].length;
            int numClasses = channels - 4;
            String[] classNames = {"POTHOLE", "ROAD_CRACK", "ROAD_FLOODING", "ROAD_OBSTACLE"};

            float[] maxScore = new float[numClasses];
            int[] maxAnchor = new int[numClasses];
            for (int i = 0; i < numAnchors; i++) {
                for (int c = 0; c < numClasses; c++) {
                    float s = output[0][4 + c][i];
                    if (s > maxScore[c]) {
                        maxScore[c] = s;
                        maxAnchor[c] = i;
                    }
                }
            }
            System.out.println("Maximum raw class scores across all " + numAnchors + " anchors:");
            for (int c = 0; c < numClasses; c++) {
                int aIdx = maxAnchor[c];
                float cx = output[0][0][aIdx];
                float cy = output[0][1][aIdx];
                float w = output[0][2][aIdx];
                float h = output[0][3][aIdx];
                System.out.printf("  Max %-15s: %.4f (%.2f%%) at center=(%.1f, %.1f) wh=(%.1f, %.1f)%n",
                        classNames[c], maxScore[c], maxScore[c] * 100, cx, cy, w, h);
            }
        }
        session.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        List<ImageTensorUtil.BoundingBox> boxes = aiInferenceService.runInferenceList(new ByteArrayInputStream(baos.toByteArray()), thresh);
        System.out.println("AiInferenceService output (" + boxes.size() + "):");
        for (ImageTensorUtil.BoundingBox b : boxes) {
            System.out.printf("  => %s (%.1f%%) at [%d, %d, %d, %d]%n", b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight());
        }
    }

    private void inspect(File file, float thresh) throws Exception {
        if (!file.exists()) {
            System.out.println("File not found: " + file.getAbsolutePath());
            return;
        }
        BufferedImage img = ImageIO.read(file);
        System.out.println("Image: " + file.getName() + " size: " + img.getWidth() + "x" + img.getHeight());

        // Let's directly call session.run with LetterboxInfo to see raw ONNX predictions
        int inputSize = 800;
        ImageTensorUtil.LetterboxInfo lb = ImageTensorUtil.letterbox(img, inputSize);
        ai.onnxruntime.OrtEnvironment env = ai.onnxruntime.OrtEnvironment.getEnvironment();
        ai.onnxruntime.OrtSession session = env.createSession("e:/DATN/roadvision-backend/src/main/resources/models/yolov8_multiclass_roadcare.onnx", new ai.onnxruntime.OrtSession.SessionOptions());

        try (ai.onnxruntime.OnnxTensor inputTensor = ai.onnxruntime.OnnxTensor.createTensor(env, lb.getBuffer(), new long[]{1, 3, inputSize, inputSize});
             ai.onnxruntime.OrtSession.Result results = session.run(java.util.Collections.singletonMap("images", inputTensor))) {

            float[][][] output = (float[][][]) results.get(0).getValue();
            int channels = output[0].length;
            int numAnchors = output[0][0].length;
            int numClasses = channels - 4;
            String[] classNames = {"POTHOLE", "ROAD_CRACK", "ROAD_FLOODING", "ROAD_OBSTACLE"};

            System.out.println("--- RAW CANDIDATES (conf >= 0.10) ---");
            for (int i = 0; i < numAnchors; i++) {
                float bestConf = output[0][4][i];
                int bestClass = 0;
                for (int c = 1; c < numClasses; c++) {
                    if (output[0][4 + c][i] > bestConf) {
                        bestConf = output[0][4 + c][i];
                        bestClass = c;
                    }
                }
                if (bestConf >= 0.10f) {
                    float cx = output[0][0][i];
                    float cy = output[0][1][i];
                    float w = output[0][2][i];
                    float h = output[0][3][i];
                    System.out.printf("  Raw: %s (%.2f) at center=(%.1f, %.1f) wh=(%.1f, %.1f)%n",
                            classNames[bestClass], bestConf, cx, cy, w, h);
                }
            }
        }
        session.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        List<ImageTensorUtil.BoundingBox> boxes = aiInferenceService.runInferenceList(new ByteArrayInputStream(baos.toByteArray()), thresh);
        System.out.println("Detections via AiInferenceService (" + boxes.size() + "):");
        for (ImageTensorUtil.BoundingBox b : boxes) {
            System.out.printf("  %s (%.1f%%) at [%d, %d, %d, %d]%n", b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight());
        }
    }
}
