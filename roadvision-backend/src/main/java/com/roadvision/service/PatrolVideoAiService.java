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
    private int cachedInputSize = 800;

    public PatrolVideoAiService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        try {
            env = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
            opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
            // Kích hoạt đa luồng CPU tối đa cho xử lý video thời gian thực
            int cores = Math.max(2, Runtime.getRuntime().availableProcessors());
            opts.setIntraOpNumThreads(Math.min(cores, 6));

            Resource modelResource = resourceLoader.getResource("classpath:models/yolov8_multiclass_roadcare.onnx");
            if (!modelResource.exists()) {
                modelResource = resourceLoader.getResource(modelPath);
            }
            if (modelResource.exists()) {
                try (InputStream is = modelResource.getInputStream()) {
                    byte[] modelBytes = is.readAllBytes();
                    session = env.createSession(modelBytes, opts);
                    isModelLoaded = true;
                    try {
                        TensorInfo tInfo = (TensorInfo) session.getInputInfo().get("images").getInfo();
                        long[] inShape = tInfo.getShape();
                        if (inShape != null && inShape.length >= 4 && inShape[2] > 0) {
                            cachedInputSize = (int) inShape[2];
                        }
                    } catch (Exception ignored) {}
                    log.info("[PatrolVideoAiService] Nạp thành công Session AI chuyên biệt cho Video Tuần Tra từ: {} (InputSize: {})", modelResource.getFilename(), cachedInputSize);

                    // WARM-UP MÔ HÌNH NGAY KHI KHỞI ĐỘNG (Triệt tiêu độ trễ 2s của frame đầu tiên)
                    try {
                        java.nio.FloatBuffer dummyBuf = java.nio.FloatBuffer.allocate(3 * cachedInputSize * cachedInputSize);
                        long[] dummyShape = new long[]{1, 3, cachedInputSize, cachedInputSize};
                        try (OnnxTensor dummyTensor = OnnxTensor.createTensor(env, dummyBuf, dummyShape);
                             OrtSession.Result ignored = session.run(Collections.singletonMap("images", dummyTensor))) {
                            log.info("[PatrolVideoAiService] Khởi động nóng (Warm-up) ONNX Engine thành công! Sẵn sàng nhận diện tức thì ngay frame 0.");
                        }
                    } catch (Exception warmErr) {
                        log.debug("[PatrolVideoAiService] Bỏ qua warm-up dummy: {}", warmErr.getMessage());
                    }
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

            int modelInputSize = this.cachedInputSize;

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

                    // 1. Khử vùng chân trời / bầu trời / xe phía trước (Top 18% của frame video camera hành trình)
                    float normCenterY = localCy / (float) Math.max(1, origHeight);
                    if (normCenterY < 0.18f || normCenterY > 0.97f) continue;

                    // 2. Khử bóng râm khổng lồ (bóng tòa nhà, bóng cầu vượt, bóng xe container trùm > 35% diện tích ảnh)
                    float boxAreaRatio = ((float) lw * lh) / (origWidth * origHeight);
                    if (boxAreaRatio > 0.35f) continue;

                    float potholeConf = (numClasses > 0) ? output[0][4][i] : 0f;
                    float crackConf = (numClasses > 1) ? output[0][5][i] : 0f;
                    float floodingConf = (numClasses > 2) ? output[0][6][i] : 0f;

                    // PHÂN BIỆT RÕ RÀNG GIỮA VẾT ƯỚT / VŨNG NƯỚC (ROAD_FLOODING) VÀ Ổ GÀ (POTHOLE):
                    // Tuyệt đối không tự động biến vệt ướt / vũng nước thành Ổ gà!
                    // Chỉ khi nào mô hình nhận diện rõ hố lõm (potholeConf >= 0.38f và cao hơn hẳn floodingConf) mới coi là ổ gà chứa nước.
                    boolean isLocalizedCavity = (boxAreaRatio < 0.20f) && (lw < origWidth * 0.50f);

                    if (bestClassId == 2) {
                        if (isLocalizedCavity && potholeConf >= 0.38f && potholeConf > floodingConf) {
                            bestClassId = 0;
                            bestConf = potholeConf;
                        }
                    } else if (bestClassId == 1 && isLocalizedCavity) {
                        // Vết nứt vỡ rỗ mặt đường dạng ổ gà
                        if (potholeConf >= 0.25f && potholeConf >= crackConf * 0.80f) {
                            float aspect = (float) Math.max(lw, lh) / Math.max(1, Math.min(lw, lh));
                            if (aspect < 2.5f) {
                                bestClassId = 0;
                                bestConf = Math.max(potholeConf, crackConf);
                            }
                        }
                    }

                    String className = (bestClassId < CLASS_NAMES.length)
                            ? CLASS_NAMES[bestClassId]
                            : "ROAD_DAMAGE_" + bestClassId;

                    // Ngưỡng lọc tin cậy chuẩn xác: Lọc bỏ triệt để các vệt ướt/bóng gương mờ nhạt
                    float minThresh;
                    if ("ROAD_CRACK".equals(className)) {
                        minThresh = Math.min(0.18f, effectiveThreshold);
                    } else if ("POTHOLE".equals(className)) {
                        // Bám sát ngưỡng tin cậy (mặc định 0.22), loại bỏ hoàn toàn nhiễu vết ướt < 20%
                        minThresh = effectiveThreshold;
                    } else if ("ROAD_OBSTACLE".equals(className)) {
                        minThresh = Math.min(0.20f, effectiveThreshold);
                    } else if ("ROAD_FLOODING".equals(className)) {
                        minThresh = Math.min(0.20f, effectiveThreshold);
                    } else {
                        minThresh = effectiveThreshold;
                    }
                    if (bestConf < minThresh) continue;

                    // Khử vệt ướt dài dạng vệt bánh xe hoặc vệt trượt dài mỏng (tỷ lệ cạnh > 3.6 không thể là ổ gà)
                    if ("POTHOLE".equals(className)) {
                        float aspect = (float) Math.max(lw, lh) / Math.max(1, Math.min(lw, lh));
                        if (aspect > 3.6f) continue;
                    }

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

            if (rawCandidates.isEmpty()) return result;

            // 1. Hợp nhất trước các mảnh ổ gà gối nhau để bảo toàn kích thước trọn vẹn, không bị NMS cắt xén
            List<ImageTensorUtil.BoundingBox> mergedCandidates = mergeOverlappingPotholes(rawCandidates);

            // 2. Áp dụng NMS
            List<ImageTensorUtil.BoundingBox> nmsBoxes = ImageTensorUtil.applyNms(mergedCandidates, iouThreshold);

            // 3. Tinh chỉnh thu gọn (Tighten & Trim) để hộp ôm sát mép thật của ổ gà, triệt tiêu lấn chiếm đường phẳng
            List<ImageTensorUtil.BoundingBox> convertedBoxes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : nmsBoxes) {
                if ("POTHOLE".equals(b.getClassName())) {
                    convertedBoxes.add(tightenSinglePotholeBox(image, b));
                } else {
                    convertedBoxes.add(b);
                }
            }

            // 3. Phân tách danh sách Ổ gà đã thu gọn
            List<ImageTensorUtil.BoundingBox> potholes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : convertedBoxes) {
                if ("POTHOLE".equals(b.getClassName())) potholes.add(b);
            }

            // 4. Khử xung đột và triệt tiêu box ngập úng ảo (ROAD_FLOODING)
            // Hiện tượng ngập úng thật sự là nước tràn mênh mông qua mặt đường.
            // Nếu một vùng bị model gán ngập úng nhưng bên trong chứa các ổ gà riêng lẻ,
            // hoặc trùm cả phong cảnh (> 60% diện tích ảnh) -> đó là đường hư hỏng ổ gà đọng nước, không phải ngập lụt.
            List<ImageTensorUtil.BoundingBox> resolvedBoxes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : convertedBoxes) {
                if ("ROAD_FLOODING".equals(b.getClassName())) {
                    float wRatio = (float) b.getWidth() / Math.max(1, origWidth);
                    float aRatio = (float) (b.getWidth() * b.getHeight()) / Math.max(1, origWidth * origHeight);

                    // Khung ngập úng bao trùm phong cảnh hoặc bầu trời (> 60% diện tích ảnh) -> Triệt tiêu ảo giác
                    if (aRatio >= 0.60f) continue;

                    // Nếu có ổ gà cụ thể nằm trong vùng ngập úng này -> Giữ lại các ổ gà, triệt tiêu box ngập úng bao trùm
                    boolean containsDiscretePothole = false;
                    for (ImageTensorUtil.BoundingBox p : potholes) {
                        int cx = p.getX() + p.getWidth() / 2;
                        int cy = p.getY() + p.getHeight() / 2;
                        if (cx >= b.getX() && cx <= (b.getX() + b.getWidth())
                                && cy >= b.getY() && cy <= (b.getY() + b.getHeight())) {
                            containsDiscretePothole = true;
                            break;
                        }
                    }
                    if (containsDiscretePothole) continue;

                    // Đối với ngập úng diện rộng (> 50% chiều ngang hoặc > 25% diện tích), độ tin cậy phải đủ cao (>= 0.60) để tránh chớp tắt ngẫu nhiên
                    if ((wRatio >= 0.50f || aRatio >= 0.25f) && b.getConfidence() < 0.60f) {
                        continue;
                    }
                }
                resolvedBoxes.add(b);
            }

            // 5. Triệt tiêu vết nứt con lồng sâu trong hoặc đè lên ổ gà
            List<ImageTensorUtil.BoundingBox> finalVideoBoxes = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : resolvedBoxes) {
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

    /**
     * Lọc danh sách BoundingBox theo Vùng nhận diện đa giác (Detection Zone ROI).
     * Chỉ giữ lại các detection có tâm (cx, cy) nằm trong đa giác mặt đường.
     *
     * @param boxes Danh sách bounding box thô
     * @param polygonVertices Danh sách đỉnh đa giác chuẩn hóa [0..1]
     * @param imgWidth Chiều rộng frame
     * @param imgHeight Chiều cao frame
     */
    public List<ImageTensorUtil.BoundingBox> filterBoxesByDetectionZone(
            List<ImageTensorUtil.BoundingBox> boxes,
            List<java.awt.geom.Point2D.Double> polygonVertices,
            int imgWidth, int imgHeight) {
        if (boxes == null || boxes.isEmpty() || polygonVertices == null || polygonVertices.size() < 3) {
            return boxes != null ? boxes : Collections.emptyList();
        }

        List<ImageTensorUtil.BoundingBox> insideBoxes = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox b : boxes) {
            double cx = (double) (b.getX() + b.getWidth() / 2.0) / Math.max(1, imgWidth);
            double cy = (double) (b.getY() + b.getHeight() / 2.0) / Math.max(1, imgHeight);

            if (isPointInPolygon(cx, cy, polygonVertices)) {
                insideBoxes.add(b);
            }
        }
        return insideBoxes;
    }

    /**
     * Thuật toán Ray-Casting kiểm tra một điểm (px, py) có nằm trong đa giác kín hay không.
     */
    public static boolean isPointInPolygon(double px, double py, List<java.awt.geom.Point2D.Double> polygon) {
        if (polygon == null || polygon.size() < 3) return true;
        boolean inside = false;
        int n = polygon.size();
        for (int i = 0, j = n - 1; i < n; j = i++) {
            double xi = polygon.get(i).x, yi = polygon.get(i).y;
            double xj = polygon.get(j).x, yj = polygon.get(j).y;
            boolean intersect = ((yi > py) != (yj > py))
                    && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
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

    private List<ImageTensorUtil.BoundingBox> mergeOverlappingPotholes(List<ImageTensorUtil.BoundingBox> boxes) {
        if (boxes == null || boxes.size() < 2) return boxes;

        List<ImageTensorUtil.BoundingBox> nonPotholes = new ArrayList<>();
        List<ImageTensorUtil.BoundingBox> potholes = new ArrayList<>();

        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("POTHOLE".equals(b.getClassName())) {
                potholes.add(b);
            } else {
                nonPotholes.add(b);
            }
        }

        if (potholes.size() < 2) return boxes;

        boolean mergedAny = true;
        while (mergedAny) {
            mergedAny = false;
            for (int i = 0; i < potholes.size(); i++) {
                for (int j = i + 1; j < potholes.size(); j++) {
                    ImageTensorUtil.BoundingBox a = potholes.get(i);
                    ImageTensorUtil.BoundingBox b = potholes.get(j);

                    int interX1 = Math.max(a.getX(), b.getX());
                    int interY1 = Math.max(a.getY(), b.getY());
                    int interX2 = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth());
                    int interY2 = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight());
                    float interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);

                    float areaA = (float) a.getWidth() * a.getHeight();
                    float areaB = (float) b.getWidth() * b.getHeight();
                    float minArea = Math.min(areaA, areaB);

                    if (interArea / minArea >= 0.25f || ImageTensorUtil.computeIoU(a, b) >= 0.15f) {
                        int nx = Math.min(a.getX(), b.getX());
                        int ny = Math.min(a.getY(), b.getY());
                        int nr = Math.max(a.getX() + a.getWidth(), b.getX() + b.getWidth());
                        int nb = Math.max(a.getY() + a.getHeight(), b.getY() + b.getHeight());
                        float nConf = Math.max(a.getConfidence(), b.getConfidence());

                        ImageTensorUtil.BoundingBox merged = ImageTensorUtil.BoundingBox.builder()
                                .className("POTHOLE")
                                .confidence(nConf)
                                .x(nx)
                                .y(ny)
                                .width(nr - nx)
                                .height(nb - ny)
                                .build();

                        potholes.remove(j);
                        potholes.remove(i);
                        potholes.add(merged);
                        mergedAny = true;
                        break;
                    }
                }
                if (mergedAny) break;
            }
        }

        nonPotholes.addAll(potholes);
        return nonPotholes;
    }

    private ImageTensorUtil.BoundingBox tightenSinglePotholeBox(
            BufferedImage img, ImageTensorUtil.BoundingBox b) {
        if (img == null || b == null) return b;
        int imgW = img.getWidth(), imgH = img.getHeight();
        int left = Math.max(0, b.getX());
        int top = Math.max(0, b.getY());
        int right = Math.min(imgW - 1, b.getX() + b.getWidth());
        int bottom = Math.min(imgH - 1, b.getY() + b.getHeight());
        if ((right - left) < 24 || (bottom - top) < 20) return b;

        // Ước lượng độ sáng trung bình của mặt đường phẳng tại 4 góc ngoài của box
        int sampleStep = Math.max(2, Math.min(right - left, bottom - top) / 35);
        int borderLumaSum = 0, borderCount = 0;
        for (int x = left; x <= right; x += sampleStep) {
            borderLumaSum += getPixelLuma(img, x, top);
            borderLumaSum += getPixelLuma(img, x, bottom);
            borderCount += 2;
        }
        for (int y = top; y <= bottom; y += sampleStep) {
            borderLumaSum += getPixelLuma(img, left, y);
            borderLumaSum += getPixelLuma(img, right, y);
            borderCount += 2;
        }
        int avgRoadLuma = borderCount > 0 ? borderLumaSum / borderCount : 130;
        int darkCavityThresh = Math.min(85, avgRoadLuma - 25);

        // Thu gọn mép trái: tiến dần vào trong chừng nào cột x vẫn là nhựa đường phẳng mịn
        int minAllowedW = Math.max(20, (int) ((right - left) * 0.40));
        while (left < right - minAllowedW) {
            int cavityHits = 0;
            int gradSum = 0, gradSamples = 0;
            for (int y = top; y <= bottom; y += sampleStep) {
                int luma = getPixelLuma(img, left, y);
                if (luma <= darkCavityThresh) cavityHits++;
                int l1 = getPixelLuma(img, Math.max(0, left - 2), y);
                int l2 = getPixelLuma(img, Math.min(imgW - 1, left + 2), y);
                gradSum += Math.abs(l2 - l1);
                gradSamples++;
            }
            float avgGrad = gradSamples > 0 ? (float) gradSum / gradSamples : 0;
            if (cavityHits >= 3 || avgGrad >= 24.0f) break;
            left += sampleStep;
        }

        // Thu gọn mép phải: lùi dần từ phải sang trái chừng nào cột x vẫn là đường phẳng
        while (right > left + minAllowedW) {
            int cavityHits = 0;
            int gradSum = 0, gradSamples = 0;
            for (int y = top; y <= bottom; y += sampleStep) {
                int luma = getPixelLuma(img, right, y);
                if (luma <= darkCavityThresh) cavityHits++;
                int l1 = getPixelLuma(img, Math.max(0, right - 2), y);
                int l2 = getPixelLuma(img, Math.min(imgW - 1, right + 2), y);
                gradSum += Math.abs(l2 - l1);
                gradSamples++;
            }
            float avgGrad = gradSamples > 0 ? (float) gradSum / gradSamples : 0;
            if (cavityHits >= 3 || avgGrad >= 24.0f) break;
            right -= sampleStep;
        }

        // Thu gọn mép trên: tiến dần từ trên xuống dưới
        int minAllowedH = Math.max(16, (int) ((bottom - top) * 0.40));
        while (top < bottom - minAllowedH) {
            int cavityHits = 0;
            int gradSum = 0, gradSamples = 0;
            for (int x = left; x <= right; x += sampleStep) {
                int luma = getPixelLuma(img, x, top);
                if (luma <= darkCavityThresh) cavityHits++;
                int l1 = getPixelLuma(img, x, Math.max(0, top - 2));
                int l2 = getPixelLuma(img, x, Math.min(imgH - 1, top + 2));
                gradSum += Math.abs(l2 - l1);
                gradSamples++;
            }
            float avgGrad = gradSamples > 0 ? (float) gradSum / gradSamples : 0;
            if (cavityHits >= 3 || avgGrad >= 24.0f) break;
            top += sampleStep;
        }

        // Thu gọn mép dưới: lùi dần từ dưới lên trên
        while (bottom > top + minAllowedH) {
            int cavityHits = 0;
            int gradSum = 0, gradSamples = 0;
            for (int x = left; x <= right; x += sampleStep) {
                int luma = getPixelLuma(img, x, bottom);
                if (luma <= darkCavityThresh) cavityHits++;
                int l1 = getPixelLuma(img, x, Math.max(0, bottom - 2));
                int l2 = getPixelLuma(img, x, Math.min(imgH - 1, bottom + 2));
                gradSum += Math.abs(l2 - l1);
                gradSamples++;
            }
            float avgGrad = gradSamples > 0 ? (float) gradSum / gradSamples : 0;
            if (cavityHits >= 3 || avgGrad >= 24.0f) break;
            bottom -= sampleStep;
        }

        int finalW = right - left;
        int finalH = bottom - top;
        int padX = Math.max(2, (int) (finalW * 0.03));
        int padY = Math.max(2, (int) (finalH * 0.03));

        int newX = Math.max(0, left - padX);
        int newY = Math.max(0, top - padY);
        int newW = Math.min(imgW - newX, finalW + padX * 2);
        int newH = Math.min(imgH - newY, finalH + padY * 2);

        return ImageTensorUtil.BoundingBox.builder()
                .className("POTHOLE")
                .confidence(b.getConfidence())
                .x(newX)
                .y(newY)
                .width(newW)
                .height(newH)
                .build();
    }

    private int getPixelLuma(BufferedImage img, int x, int y) {
        int rgb = img.getRGB(Math.max(0, Math.min(img.getWidth() - 1, x)),
                             Math.max(0, Math.min(img.getHeight() - 1, y)));
        int r = (rgb >> 16) & 0xFF;
        int g = (rgb >> 8) & 0xFF;
        int b = rgb & 0xFF;
        return (int) (0.299 * r + 0.587 * g + 0.114 * b);
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

    /**
     * Tinh chỉnh thu gọn Bounding Box ôm sát lòng hốc / mặt nước thực tế của ổ gà
     * Loại bỏ các phần đường nhựa khô hoặc khoảng trống không liên quan ở xung quanh.
     */
    private ImageTensorUtil.BoundingBox tightenPotholeBox(BufferedImage img, ImageTensorUtil.BoundingBox b) {
        if (img == null || b == null) return b;
        int imgW = img.getWidth();
        int imgH = img.getHeight();

        int rx = Math.max(0, Math.min(b.getX(), imgW - 1));
        int ry = Math.max(0, Math.min(b.getY(), imgH - 1));
        int rw = Math.min(b.getWidth(), imgW - rx);
        int rh = Math.min(b.getHeight(), imgH - ry);
        if (rw <= 16 || rh <= 16) return b;

        int minX = rx + rw, maxX = rx, minY = ry + rh, maxY = ry;
        int cavityPixelCount = 0;
        int step = Math.max(1, Math.min(rw, rh) / 30);

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int bVal = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * bVal);

                boolean isNeutralDryAsphalt = (Math.abs(r - g) <= 15 && Math.abs(g - bVal) <= 15 && Math.abs(r - bVal) <= 15 && luma <= 215);
                boolean isMirrorWater = !isNeutralDryAsphalt && (luma > 220 && Math.abs(r - bVal) < 25);
                boolean isSkyBlueWater = (bVal > r + 15 && bVal > g + 8 && luma > 110);
                boolean isMuddyWater = (r > bVal + 18 && g > bVal + 10 && luma >= 65 && luma <= 215);
                boolean isDarkDepression = (luma < 65);

                if (isMirrorWater || isSkyBlueWater || isMuddyWater || isDarkDepression) {
                    cavityPixelCount++;
                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                }
            }
        }

        // Nếu tìm thấy vùng lõm/nước thực tế tập trung bên trong box
        if (cavityPixelCount >= 8 && minX < maxX && minY < maxY) {
            int detectedW = maxX - minX;
            int detectedH = maxY - minY;

            int padX = Math.max(4, (int) (detectedW * 0.08));
            int padY = Math.max(4, (int) (detectedH * 0.08));

            int tightX = Math.max(rx, minX - padX);
            int tightY = Math.max(ry, minY - padY);
            int tightRight = Math.min(rx + rw, maxX + padX);
            int tightBottom = Math.min(ry + rh, maxY + padY);
            int tightW = tightRight - tightX;
            int tightH = tightBottom - tightY;

            // Kiểm tra tính hợp lệ: đảm bảo box thu gọn ôm sát nhưng không quá bé
            if (tightW >= 12 && tightH >= 10 && tightW <= rw && tightH <= rh) {
                return ImageTensorUtil.BoundingBox.builder()
                        .className("POTHOLE")
                        .confidence(b.getConfidence())
                        .x(tightX)
                        .y(tightY)
                        .width(tightW)
                        .height(tightH)
                        .build();
            }
        }

        return b;
    }
}
