package com.roadvision.service;

import ai.onnxruntime.*;
import com.roadvision.util.ImageTensorUtil;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Service AI chuyên biệt dành riêng cho VIDEO TUẦN TRA (Dashcam Patrol Video Stream).
 * Tách biệt hoàn toàn khỏi AiInferenceService (dành riêng cho upload ảnh tĩnh).
 *
 * Tối ưu hóa đặc thù cho Video:
 * 1. Suy luận Full-Frame Single-Pass tốc độ cao (đáp ứng chu kỳ 500ms - 1000ms/frame).
 * 2. Nhận diện hình học phối cảnh Camera hành trình (Perspective-Aware Pothole Identification).
 * 3. Triệt tiêu vết nứt con lồng trong lòng ổ gà (Nested Crack Suppression).
 */
@Slf4j
@Service
public class PatrolVideoAiService {

    @Value("${roadvision.ai.model-path:classpath:models/yolov8_multiclass_roadcare.onnx}")
    private String modelPath;

    @Value("${roadvision.ai.confidence-threshold:0.20}")
    private float confidenceThreshold;

    @Value("${roadvision.ai.iou-threshold:0.45}")
    private float iouThreshold;

    public static final String[] CLASS_NAMES = {
        "POTHOLE",       // 0: Ổ gà / Hố sụt
        "ROAD_CRACK",    // 1: Vết nứt mặt đường
        "ROAD_FLOODING", // 2: Điểm ngập úng
        "ROAD_OBSTACLE"  // 3: Chướng ngại vật / Vật cản
    };

    private final ResourceLoader resourceLoader;
    private OrtEnvironment env;
    private OrtSession session;
    private boolean isModelLoaded = false;

    public PatrolVideoAiService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        try {
            env = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
            opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);

            Resource modelResource = resourceLoader.getResource("classpath:models/yolov8_multiclass_roadcare.onnx");
            if (!modelResource.exists()) {
                modelResource = resourceLoader.getResource(modelPath);
            }
            if (modelResource.exists()) {
                try (InputStream is = modelResource.getInputStream()) {
                    byte[] modelBytes = is.readAllBytes();
                    session = env.createSession(modelBytes, opts);
                    isModelLoaded = true;
                    log.info("[PatrolVideoAiService] Nạp thành công Session AI chuyên biệt cho Video Tuần Tra từ: {}", modelResource.getFilename());
                }
            } else {
                log.warn("[PatrolVideoAiService] Không tìm thấy file model ONNX tại: {}", modelPath);
            }
        } catch (Exception e) {
            log.error("[PatrolVideoAiService] Lỗi khi khởi tạo Session AI Video", e);
        }
    }

    @PreDestroy
    public void destroy() {
        try {
            if (session != null) session.close();
            if (env != null) env.close();
        } catch (Exception e) {
            log.error("[PatrolVideoAiService] Lỗi khi đóng ONNX session", e);
        }
    }

    /**
     * Suy luận phân tích frame video tuần tra thời gian thực
     */
    public List<ImageTensorUtil.BoundingBox> runVideoFrameInference(InputStream imageInputStream, float customThreshold) {
        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        float effectiveThreshold = (customThreshold >= 0.05f && customThreshold <= 0.99f) ? customThreshold : this.confidenceThreshold;

        try {
            BufferedImage image = ImageIO.read(imageInputStream);
            if (image == null) return result;

            int origWidth = image.getWidth();
            int origHeight = image.getHeight();

            if (!isModelLoaded || session == null) return result;

            int modelInputSize = 800;
            try {
                TensorInfo tInfo = (TensorInfo) session.getInputInfo().get("images").getInfo();
                long[] inShape = tInfo.getShape();
                if (inShape != null && inShape.length >= 4 && inShape[2] > 0) {
                    modelInputSize = (int) inShape[2];
                }
            } catch (Exception ignored) {}

            // SUY LUẬN TỐC ĐỘ CAO CHO VIDEO (Single-Pass Full Frame)
            ImageTensorUtil.LetterboxInfo lb = ImageTensorUtil.letterbox(image, modelInputSize);
            FloatBuffer tensorBuffer = lb.getBuffer();
            long[] shape = new long[]{1, 3, modelInputSize, modelInputSize};

            float scale = lb.getScale();
            int padLeft = lb.getPadLeft();
            int padTop = lb.getPadTop();

            List<ImageTensorUtil.BoundingBox> rawCandidates = new ArrayList<>();

            try (OnnxTensor inputTensor = OnnxTensor.createTensor(env, tensorBuffer, shape);
                 OrtSession.Result sessionResult = session.run(Collections.singletonMap("images", inputTensor))) {

                float[][][] output = (float[][][]) sessionResult.get(0).getValue();
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

                    for (int c = 0; c < numClasses; c++) {
                        float cConf = output[0][4 + c][i];
                        if (c > 0 && cConf > bestConf) {
                            bestConf = cConf;
                            bestClassId = c;
                        }
                    }

                    float preliminaryThresh = Math.max(0.08f, effectiveThreshold * 0.70f);
                    if (bestConf < preliminaryThresh) continue;

                    float localCx = (cx - padLeft) / scale;
                    float localCy = (cy - padTop) / scale;
                    float localW = w / scale;
                    float localH = h / scale;

                    int lx = Math.max(0, (int) (localCx - localW / 2.0f));
                    int ly = Math.max(0, (int) (localCy - localH / 2.0f));
                    int lw = Math.min(origWidth - lx, (int) localW);
                    int lh = Math.min(origHeight - ly, (int) localH);

                    if (lw <= 8 || lh <= 8) continue;

                    String className = (bestClassId < CLASS_NAMES.length)
                            ? CLASS_NAMES[bestClassId]
                            : "ROAD_DAMAGE_" + bestClassId;

                    // Kiểm tra lòng hốc chứa nước bùn / vũng trũng
                    if (isWaterCavity(image, lx, ly, lw, lh)) {
                        className = "POTHOLE";
                    }

                    // Ngưỡng thu thập gợi ý ban đầu để không bỏ lỡ vết nứt/vật cản trước khi truy vết
                    float minThresh;
                    if ("ROAD_CRACK".equals(className)) {
                        minThresh = Math.min(0.12f, effectiveThreshold);
                    } else if ("POTHOLE".equals(className)) {
                        minThresh = Math.min(0.10f, effectiveThreshold);
                    } else if ("ROAD_OBSTACLE".equals(className)) {
                        minThresh = Math.min(0.12f, effectiveThreshold);
                    } else if ("ROAD_FLOODING".equals(className)) {
                        minThresh = Math.min(0.15f, effectiveThreshold);
                    } else {
                        minThresh = Math.min(0.15f, effectiveThreshold);
                    }
                    if (bestConf < minThresh) continue;

                    rawCandidates.add(ImageTensorUtil.BoundingBox.builder()
                            .className(className)
                            .confidence(bestConf)
                            .x(lx)
                            .y(ly)
                            .width(lw)
                            .height(lh)
                            .build());
                }
            }

            // Truy vết dải nứt lớn / sụt gãy mặt đường (chỉ kích hoạt khi YOLO có gợi ý nứt thật sự rõ)
            boolean hasPavementDamageHint = false;
            for (ImageTensorUtil.BoundingBox cand : rawCandidates) {
                if ("ROAD_CRACK".equals(cand.getClassName()) && cand.getConfidence() >= 0.25f) {
                    hasPavementDamageHint = true;
                    break;
                }
            }
            if (hasPavementDamageHint) {
                rawCandidates.addAll(detectAndTraceMajorRoadCracks(image, rawCandidates));
            }

            if (rawCandidates.isEmpty()) return result;

            // 1. Áp dụng NMS
            List<ImageTensorUtil.BoundingBox> nmsBoxes = ImageTensorUtil.applyNms(rawCandidates, iouThreshold);

            // 2. Chuyển đổi và bảo toàn Ổ GÀ: Bất kỳ box nào chứa lòng nước / bùn trũng đều phải là Ổ GÀ (POTHOLE)
            List<ImageTensorUtil.BoundingBox> convertedBoxes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : nmsBoxes) {
                if ("ROAD_CRACK".equals(b.getClassName()) && isWaterCavity(image, b.getX(), b.getY(), b.getWidth(), b.getHeight())) {
                    convertedBoxes.add(ImageTensorUtil.BoundingBox.builder()
                            .className("POTHOLE")
                            .confidence(b.getConfidence())
                            .x(b.getX())
                            .y(b.getY())
                            .width(b.getWidth())
                            .height(b.getHeight())
                            .build());
                } else {
                    convertedBoxes.add(b);
                }
            }

            // 3. Triệt tiêu vết nứt con lồng sâu trong hoặc đè lên ổ gà
            List<ImageTensorUtil.BoundingBox> potholes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : convertedBoxes) {
                if ("POTHOLE".equals(b.getClassName())) potholes.add(b);
            }

            List<ImageTensorUtil.BoundingBox> finalVideoBoxes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : convertedBoxes) {
                if ("ROAD_CRACK".equals(b.getClassName())) {
                    boolean insidePothole = false;
                    for (ImageTensorUtil.BoundingBox p : potholes) {
                        int xA = Math.max(p.getX(), b.getX());
                        int yA = Math.max(p.getY(), b.getY());
                        int xB = Math.min(p.getX() + p.getWidth(), b.getX() + b.getWidth());
                        int yB = Math.min(p.getY() + p.getHeight(), b.getY() + b.getHeight());
                        float interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
                        float crackArea = (float) b.getWidth() * b.getHeight();
                        float iou = ImageTensorUtil.computeIoU(p, b);

                        if (interArea / Math.max(1, crackArea) >= 0.40f || iou >= 0.20f) {
                            insidePothole = true;
                            break;
                        }
                    }
                    if (insidePothole) continue;
                }
                finalVideoBoxes.add(b);
            }

            List<ImageTensorUtil.BoundingBox> visibleBoxes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : finalVideoBoxes) {
                if (b.getConfidence() >= effectiveThreshold) {
                    visibleBoxes.add(b);
                }
            }

            return visibleBoxes;

        } catch (Exception e) {
            log.error("[PatrolVideoAiService] Lỗi suy luận video frame: {}", e.getMessage());
            return result;
        }
    }

    public ImageTensorUtil.BoundingBox emptyDetection() {
        return ImageTensorUtil.BoundingBox.builder()
                .className("NONE")
                .confidence(0.0f)
                .x(0)
                .y(0)
                .width(0)
                .height(0)
                .build();
    }

    public String calculateSeverity(List<ImageTensorUtil.BoundingBox> boxes, int imgWidth, int imgHeight) {
        if (boxes == null || boxes.isEmpty()) return "LOW";
        int count = boxes.size();
        long totalArea = 0;
        for (ImageTensorUtil.BoundingBox b : boxes) {
            totalArea += (long) b.getWidth() * b.getHeight();
        }
        long imgArea = (long) Math.max(1, imgWidth) * Math.max(1, imgHeight);
        double areaRatio = (double) totalArea / imgArea;
        if (count >= 3 || areaRatio >= 0.12) return "CRITICAL";
        if (count >= 2 || areaRatio >= 0.06) return "HIGH";
        return "MEDIUM";
    }

    private List<ImageTensorUtil.BoundingBox> detectAndTraceMajorRoadCracks(
            BufferedImage img, List<ImageTensorUtil.BoundingBox> currentCandidates) {
        List<ImageTensorUtil.BoundingBox> traced = new ArrayList<>();
        int w = img.getWidth();
        int h = img.getHeight();
        if (w < 100 || h < 100) return traced;

        int startY = (int) (h * 0.15);
        int endY = (int) (h * 0.98);
        int startX = (int) (w * 0.10);
        int endX = (int) (w * 0.90);

        List<int[]> fissurePoints = new ArrayList<>();
        int minCrackX = w, maxCrackX = 0, minCrackY = h, maxCrackY = 0;
        int validRowsWithFissure = 0;
        int totalFissurePixels = 0;

        int stepY = Math.max(1, h / 120);
        int rimOffset = Math.max(4, w / 35);

        for (int y = startY; y < endY; y += stepY) {
            boolean rowHasFissure = false;
            int bestXInRow = -1;
            int maxDepthInRow = 0;

            for (int x = startX; x < endX; x += 1) {
                int rgb = img.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);

                if (luma < 60) {
                    int leftX = Math.max(0, x - rimOffset);
                    int rightX = Math.min(w - 1, x + rimOffset);

                    int rgbL = img.getRGB(leftX, y);
                    int lumaL = (int) (0.299 * ((rgbL >> 16) & 0xFF) + 0.587 * ((rgbL >> 8) & 0xFF) + 0.114 * (rgbL & 0xFF));

                    int rgbR = img.getRGB(rightX, y);
                    int lumaR = (int) (0.299 * ((rgbR >> 16) & 0xFF) + 0.587 * ((rgbR >> 8) & 0xFF) + 0.114 * (rgbR & 0xFF));

                    int depth = Math.min(lumaL - luma, lumaR - luma);
                    if (depth >= 25) {
                        rowHasFissure = true;
                        totalFissurePixels++;
                        if (depth > maxDepthInRow) {
                            maxDepthInRow = depth;
                            bestXInRow = x;
                        }
                        if (x < minCrackX) minCrackX = x;
                        if (x > maxCrackX) maxCrackX = x;
                        if (y < minCrackY) minCrackY = y;
                        if (y > maxCrackY) maxCrackY = y;
                    }
                }
            }
            if (rowHasFissure) {
                validRowsWithFissure++;
                if (bestXInRow != -1) {
                    fissurePoints.add(new int[]{bestXInRow, y});
                }
            }
        }

        // Kiểm tra tính liên tục theo chiều dọc (Continuous Fissure Chain)
        int maxJump = Math.max(20, (int) (w * 0.08));
        int longestChainSize = 0;
        int currentChainSize = 0;
        int prevX = -1000, prevY = -1000;
        for (int[] pt : fissurePoints) {
            if (Math.abs(pt[0] - prevX) <= maxJump && (pt[1] - prevY) <= stepY * 3) {
                currentChainSize++;
            } else {
                currentChainSize = 1;
            }
            prevX = pt[0];
            prevY = pt[1];
            if (currentChainSize > longestChainSize) {
                longestChainSize = currentChainSize;
            }
        }

        int totalScannedRows = (endY - startY) / stepY;
        if (validRowsWithFissure >= Math.max(8, totalScannedRows * 0.18)
                && totalFissurePixels >= 30
                && longestChainSize >= 22) {
            int padX = Math.max(10, (int) ((maxCrackX - minCrackX) * 0.12));
            int padY = Math.max(8, (int) ((maxCrackY - minCrackY) * 0.05));

            int bx = Math.max(0, minCrackX - padX);
            int by = Math.max(0, minCrackY - padY);
            int bw = Math.min(w - bx, (maxCrackX - minCrackX) + padX * 2);
            int bh = Math.min(h - by, (maxCrackY - minCrackY) + padY * 2);

            double areaRatio = (double) ((long) bw * bh) / ((double) w * h);
            if (areaRatio > 0.85 || (bw > w * 0.88 && bh > h * 0.80)) {
                return traced;
            }

            if (isShadowArtifact(img, bx, by, bw, bh)) {
                return traced;
            }

            float baseRawConf = 0.72f;
            for (ImageTensorUtil.BoundingBox cand : currentCandidates) {
                if (!"ROAD_CRACK".equals(cand.getClassName())) continue;
                int ix = Math.max(0, Math.min(bx + bw, cand.getX() + cand.getWidth()) - Math.max(bx, cand.getX()));
                int iy = Math.max(0, Math.min(by + bh, cand.getY() + cand.getHeight()) - Math.max(by, cand.getY()));
                float inter = (float) ix * iy;
                float candArea = Math.max(1f, (float) cand.getWidth() * cand.getHeight());
                if (inter / candArea >= 0.35f) {
                    baseRawConf = Math.max(baseRawConf, cand.getConfidence());
                }
            }

            traced.add(ImageTensorUtil.BoundingBox.builder()
                    .className("ROAD_CRACK")
                    .confidence(baseRawConf)
                    .x(bx)
                    .y(by)
                    .width(bw)
                    .height(bh)
                    .build());
        }

        return traced;
    }

    private boolean isShadowArtifact(BufferedImage img, int x, int y, int w, int h) {
        if (img == null || w <= 0 || h <= 0) return false;

        int imgW = img.getWidth();
        int imgH = img.getHeight();
        int rx = Math.max(0, Math.min(x, imgW - 1));
        int ry = Math.max(0, Math.min(y, imgH - 1));
        int rw = Math.min(w, imgW - rx);
        int rh = Math.min(h, imgH - ry);
        if (rw <= 6 || rh <= 6) return false;

        int step = Math.max(1, Math.min(rw, rh) / 30);
        int totalSampled = 0;
        long sumLuma = 0;
        long sumSqLuma = 0;
        int extremeDarkCrackPixels = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);

                totalSampled++;
                sumLuma += luma;
                sumSqLuma += ((long) luma * luma);

                if (luma < 75) {
                    extremeDarkCrackPixels++;
                }
            }
        }

        if (totalSampled == 0) return false;

        double mean = (double) sumLuma / totalSampled;
        double variance = ((double) sumSqLuma / totalSampled) - (mean * mean);
        double stdDev = Math.sqrt(Math.max(0, variance));

        return (mean < 115 && stdDev < 11.5 && extremeDarkCrackPixels < 2);
    }

    private boolean isWaterCavity(BufferedImage img, int x, int y, int w, int h) {
        if (img == null || w <= 0 || h <= 0) return false;

        int imgW = img.getWidth();
        int imgH = img.getHeight();
        int rx = Math.max(0, Math.min(x, imgW - 1));
        int ry = Math.max(0, Math.min(y, imgH - 1));
        int rw = Math.min(w, imgW - rx);
        int rh = Math.min(h, imgH - ry);
        if (rw <= 6 || rh <= 6) return false;

        int step = Math.max(1, Math.min(rw, rh) / 20);
        int totalSampled = 0;
        int waterSurfacePixels = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;

                boolean isNeutralDryAsphalt = (Math.abs(r - g) <= 15 && Math.abs(g - b) <= 15 && Math.abs(r - b) <= 15 && luma <= 215);
                boolean isMirrorWater = !isNeutralDryAsphalt && (luma > 220 && Math.abs(r - b) < 25);
                boolean isSkyBlueWater = (b > r + 15 && b > g + 8 && luma > 110);
                boolean isMuddyWater = (r > b + 18 && g > b + 10 && luma >= 65 && luma <= 215);

                if (isMirrorWater || isSkyBlueWater || isMuddyWater) {
                    waterSurfacePixels++;
                }
            }
        }

        if (totalSampled == 0) return false;
        float waterRatio = (float) waterSurfacePixels / totalSampled;
        return (waterRatio >= 0.28f);
    }
}
