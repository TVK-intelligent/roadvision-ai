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
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
public class AiInferenceService {

    @Value("${roadvision.ai.model-path:classpath:models/yolov8_multiclass_roadcare.onnx}")
    private String modelPath;

    @Value("${roadvision.ai.confidence-threshold:0.20}")
    private float confidenceThreshold;

    @Value("${roadvision.ai.iou-threshold:0.45}")
    private float iouThreshold;

    public static final String[] CLASS_NAMES = {
        "POTHOLE",       // 0: Ổ gà / Hố sụt
        "ROAD_CRACK",    // 1: Vết nứt mặt đường
        "ROAD_FLOODING", // 2: Điểm ngập úng / Nước ngập
        "ROAD_OBSTACLE"  // 3: Chướng ngại vật / Vật cản
    };

    private final ResourceLoader resourceLoader;
    private OrtEnvironment env;
    private OrtSession session;
    private boolean isModelLoaded = false;
    private int cachedModelInputSize = 800;

    public AiInferenceService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        try {
            env = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
            opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);

            int cores = Runtime.getRuntime().availableProcessors();
            opts.setIntraOpNumThreads(Math.max(2, cores));
            opts.setInterOpNumThreads(Math.max(1, cores / 2));

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
                        NodeInfo inputNode = session.getInputInfo().get("images");
                        if (inputNode != null && inputNode.getInfo() instanceof TensorInfo tInfo) {
                            long[] inShape = tInfo.getShape();
                            if (inShape != null && inShape.length >= 4 && inShape[2] > 0) {
                                cachedModelInputSize = (int) inShape[2];
                            }
                        }
                    } catch (Exception ignored) {}

                    log.info("Mô hình YOLOv8 đã nạp thành công từ: {}. InputSize: {}x{}, Inputs: {}, Outputs: {}",
                            modelResource.getFilename(), cachedModelInputSize, cachedModelInputSize,
                            session.getInputNames(), session.getOutputNames());
                }
            } else {
                log.warn("Chưa tìm thấy tệp mô hình ONNX tại {}.", modelPath);
            }
        } catch (Exception e) {
            log.error("Lỗi khi khởi tạo ONNX Runtime, chuyển sang chế độ dự phòng", e);
        }
    }

    @PreDestroy
    public void destroy() {
        try {
            if (session != null) session.close();
            if (env != null) env.close();
        } catch (Exception e) {
            log.error("Lỗi khi đóng ONNX session", e);
        }
    }

    public List<ImageTensorUtil.BoundingBox> runInferenceList(InputStream imageInputStream) {
        return runInferenceList(imageInputStream, this.confidenceThreshold);
    }

    /**
     * Suy luận phân tích ảnh mặt đường: Full-image + 2 road tiles + truy vết vết nứt chính (có YOLO xác nhận).
     */
    public List<ImageTensorUtil.BoundingBox> runInferenceList(InputStream imageInputStream, float customThreshold) {
        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        float effectiveThreshold = (customThreshold >= 0.05f && customThreshold <= 0.99f)
                ? customThreshold
                : this.confidenceThreshold;

        try {
            BufferedImage image = ImageIO.read(imageInputStream);
            if (image == null) {
                log.warn("Không thể giải mã ảnh thành BufferedImage (định dạng không hỗ trợ hoặc luồng rỗng)");
                return result;
            }

            int origWidth = image.getWidth();
            int origHeight = image.getHeight();

            if (isModelLoaded && session != null) {
                int modelInputSize = this.cachedModelInputSize;
                List<ImageTensorUtil.BoundingBox> allCandidates = new ArrayList<>();

                // PASS 1: QUÉT TOÀN BỘ KHUNG HÌNH
                allCandidates.addAll(inferSingleSubImage(image, modelInputSize, effectiveThreshold, 0, 0, origWidth, origHeight));

                // PASS 2: 2 ROAD TILES ĐÃ TĂNG TƯƠNG PHẢN
                List<Rectangle> tiles = generateFastRoadTiles(origWidth, origHeight);
                for (Rectangle tile : tiles) {
                    try {
                        BufferedImage tileImg = image.getSubimage(tile.x, tile.y, tile.width, tile.height);
                        BufferedImage enhanced = enhanceCrackContrast(tileImg);
                        List<ImageTensorUtil.BoundingBox> tileBoxes = inferSingleSubImage(
                                enhanced, modelInputSize, effectiveThreshold, tile.x, tile.y, origWidth, origHeight);
                        allCandidates.addAll(tileBoxes);
                    } catch (Exception te) {
                        log.debug("Bỏ qua tile [{}, {}, {}, {}]: {}", tile.x, tile.y, tile.width, tile.height, te.getMessage());
                    }
                }

                // Truy vết dải nứt chính / sụt gãy mặt đường
                List<ImageTensorUtil.BoundingBox> tracedCracks = detectAndTraceMajorRoadCracks(image, allCandidates);
                allCandidates.addAll(tracedCracks);

                if (log.isDebugEnabled()) {
                    for (ImageTensorUtil.BoundingBox c : allCandidates) {
                        log.debug("PRE-NMS {} raw={} [x={}, y={}, w={}, h={}]", c.getClassName(),
                                String.format("%.3f", c.getConfidence()), c.getX(), c.getY(), c.getWidth(), c.getHeight());
                    }
                }

                if (!allCandidates.isEmpty()) {
                    // BƯỚC 3: GLOBAL NMS
                    List<ImageTensorUtil.BoundingBox> nmsBoxes = ImageTensorUtil.applyNms(allCandidates, iouThreshold);

                    // Chuẩn hóa: Nếu là vũng lòng hốc chứa nước bùn -> POTHOLE (Ổ gà)
                    List<ImageTensorUtil.BoundingBox> sanitizedBoxes = new ArrayList<>();
                    for (ImageTensorUtil.BoundingBox b : nmsBoxes) {
                        if ("ROAD_FLOODING".equals(b.getClassName()) && isWaterCavity(image, b.getX(), b.getY(), b.getWidth(), b.getHeight())) {
                            sanitizedBoxes.add(ImageTensorUtil.BoundingBox.builder()
                                    .className("POTHOLE")
                                    .confidence(b.getConfidence())
                                    .x(b.getX())
                                    .y(b.getY())
                                    .width(b.getWidth())
                                    .height(b.getHeight())
                                    .build());
                        } else {
                            sanitizedBoxes.add(b);
                        }
                    }

                    // BƯỚC 3.1: LỌC Ổ GÀ ẢO TRONG BIỂN NƯỚC
                    List<ImageTensorUtil.BoundingBox> nonFloodGhostBoxes = filterPotholesInFlood(sanitizedBoxes, origWidth, origHeight);

                    // BƯỚC 3.2: KHỬ XUNG ĐỘT ĐA LỚP
                    List<ImageTensorUtil.BoundingBox> conflictResolvedBoxes = suppressCrossClassConflicts(nonFloodGhostBoxes);

                    // BƯỚC 3.3: CHUẨN HÓA VẬT THỂ THEO BỐI CẢNH
                    List<ImageTensorUtil.BoundingBox> calibratedBoxes = calibratePlanAObjects(conflictResolvedBoxes, origWidth, origHeight);

                    // BƯỚC 3.4: HỢP NHẤT DẢI NỨT CÙNG PHƯƠNG & Ổ GÀ TRÙNG LẶP
                    List<ImageTensorUtil.BoundingBox> mergedBoxes = mergeOverlappingPotholes(mergeCollinearCracks(calibratedBoxes, origWidth, origHeight));

                    // BƯỚC 3.5: THU GỌN KHUNG + LOẠI BOX RÁC
                    List<ImageTensorUtil.BoundingBox> tightenedBoxes = tightenAndFilterBoundingBoxes(image, mergedBoxes);

                    // BƯỚC 3.6: CHUẨN HÓA ĐỘ TIN CẬY HIỂN THỊ
                    List<ImageTensorUtil.BoundingBox> calibratedBoxesList = applyDisplayCalibration(tightenedBoxes);

                    // BƯỚC 3.7: LỌC THEO NGƯỠNG HIỂN THỊ CẤU HÌNH / SLIDER UI
                    List<ImageTensorUtil.BoundingBox> finalBoxes = new ArrayList<>();
                    for (ImageTensorUtil.BoundingBox b : calibratedBoxesList) {
                        if (b.getConfidence() >= effectiveThreshold) {
                            finalBoxes.add(b);
                        }
                    }

                    if (!finalBoxes.isEmpty()) {
                        StringBuilder details = new StringBuilder();
                        for (ImageTensorUtil.BoundingBox b : finalBoxes) {
                            details.append(String.format("[%s: %.1f%% (x=%d, y=%d, w=%d, h=%d)] ",
                                    b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight()));
                        }
                        log.info("AI PHÁT HIỆN {} VỊ TRÍ HƯ HỎNG (Ngưỡng: {}% | Candidates: {} | Tiles: {}): {}",
                                finalBoxes.size(), (int) (effectiveThreshold * 100), allCandidates.size(), tiles.size(), details.toString().trim());
                        return finalBoxes;
                    }

                    log.info("AI quét ảnh: Không phát hiện hư hỏng mặt đường nào (Độ tin cậy < {}%)", (int) (effectiveThreshold * 100));
                    return finalBoxes;
                }
            }

            return result;

        } catch (Exception e) {
            log.error("Lỗi trong quá trình suy luận danh sách ảnh", e);
            return result;
        }
    }

    /**
     * Suy luận trên một ảnh con (Subimage / Tile) và quy đổi tọa độ ngược về ảnh gốc.
     */
    private List<ImageTensorUtil.BoundingBox> inferSingleSubImage(
            BufferedImage subImg, int modelInputSize, float effectiveThreshold,
            int offsetX, int offsetY, int origWidth, int origHeight) {

        List<ImageTensorUtil.BoundingBox> boxes = new ArrayList<>();
        int subW = subImg.getWidth();
        int subH = subImg.getHeight();

        ImageTensorUtil.LetterboxInfo lb = ImageTensorUtil.letterbox(subImg, modelInputSize);
        FloatBuffer tensorBuffer = lb.getBuffer();
        long[] shape = new long[]{1, 3, modelInputSize, modelInputSize};

        float scale = lb.getScale();
        int padLeft = lb.getPadLeft();
        int padTop = lb.getPadTop();

        try {
            FloatBuffer multiBuf = tensorBuffer.duplicate();
            try (OnnxTensor inputTensor = OnnxTensor.createTensor(env, multiBuf, shape);
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
                        float cConf = output[0][4 + c][i];
                        if (cConf > bestConf) {
                            bestConf = cConf;
                            bestClassId = c;
                        }
                    }

                    float crackConf = (numClasses > 1) ? output[0][5][i] : 0f;

                    String className = (bestClassId < CLASS_NAMES.length)
                            ? CLASS_NAMES[bestClassId]
                            : "ROAD_DAMAGE_" + bestClassId;

                    float candidateCollectThresh;
                    if ("ROAD_CRACK".equals(className)) {
                        candidateCollectThresh = Math.min(0.05f, effectiveThreshold);
                    } else if ("POTHOLE".equals(className)) {
                        candidateCollectThresh = Math.min(0.08f, effectiveThreshold);
                    } else if ("ROAD_FLOODING".equals(className)) {
                        candidateCollectThresh = Math.min(0.12f, effectiveThreshold);
                    } else if ("ROAD_OBSTACLE".equals(className)) {
                        candidateCollectThresh = Math.min(0.05f, effectiveThreshold);
                    } else {
                        candidateCollectThresh = Math.min(0.10f, effectiveThreshold);
                    }

                    if (bestConf >= candidateCollectThresh) {
                        float localCx = (cx - padLeft) / scale;
                        float localCy = (cy - padTop) / scale;
                        float localW = w / scale;
                        float localH = h / scale;

                        int lx = Math.max(0, (int) (localCx - localW / 2.0f));
                        int ly = Math.max(0, (int) (localCy - localH / 2.0f));
                        int lw = Math.min(subW - lx, (int) localW);
                        int lh = Math.min(subH - ly, (int) localH);

                        if (lw < 12 || lh < 12) continue;

                        int gx = lx + offsetX;
                        int gy = ly + offsetY;

                        if (gy < origHeight * 0.12f && (gy + lh) < origHeight * 0.18f) continue;

                        double boxAreaRatio = (double) (lw * lh) / (origWidth * origHeight);
                        float boxWidthRatio = (float) lw / origWidth;


                        if ("POTHOLE".equals(className)) {
                            float potholeAspect = (float) lw / Math.max(1, lh);
                            if (potholeAspect > 3.20f || potholeAspect < 0.35f) {
                                log.debug("POTHOLE rejected aspect={}: [{}, {}, {}, {}]", potholeAspect, gx, gy, lw, lh);
                                continue;
                            }
                            if (boxAreaRatio > 0.45 || (boxWidthRatio > 0.80 && boxAreaRatio > 0.30)) continue;
                            if (isLaneMarkingOrPaint(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            if (isShadowArtifact(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            if (isDryAsphalt(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            boolean isRealPotholeBowl = isWaterCavity(subImg, lx, ly, lw, lh) || isTruePotholeCavity(subImg, lx, ly, lw, lh);
                            if (!isRealPotholeBowl && bestConf < 0.28f) {
                                // Nếu độ tin cậy thấp (< 28%) và không có lòng trũng/chứa nước, loại bỏ bóng râm / mặt đường phẳng
                                continue;
                            }
                        } else if ("ROAD_CRACK".equals(className)) {
                            if (boxAreaRatio > 0.80) continue;
                            if (isLaneMarkingOrPaint(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            if (isShadowArtifact(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            float crackAspect = (float) lw / lh;
                            if (isTruePotholeCavity(subImg, lx, ly, lw, lh)) {
                                className = "POTHOLE";
                            } else if ("ROAD_CRACK".equals(className)
                                    && crackAspect >= 0.5f && crackAspect <= 3.5f
                                    && isWaterCavity(subImg, lx, ly, lw, lh)
                                    && !isThinCrackPattern(subImg, lx, ly, lw, lh)) {
                                // Hố chứa nước (lòng sáng / đục) bị model gán nhầm là nứt -> trả về POTHOLE
                                className = "POTHOLE";
                            }
                        } else if ("ROAD_OBSTACLE".equals(className)) {
                            if (boxWidthRatio > 0.85 || boxAreaRatio > 0.60) continue;
                            if (isStandingTreeCanopy(subImg, lx, ly, lw, lh, gy, origHeight)) {
                                continue;
                            }
                            if (isRoadsideGuardrailOrCurb(subImg, lx, ly, lw, lh, gx, origWidth)) {
                                continue;
                            }
                            // Nếu vật thể ngang chứa nước hoặc lòng trũng lòng đường -> trả về POTHOLE
                            if (isWaterCavity(subImg, lx, ly, lw, lh) || isTruePotholeCavity(subImg, lx, ly, lw, lh)) {
                                float obstAspect = (float) lw / Math.max(1, lh);
                                if (obstAspect >= 1.25f) {
                                    className = "POTHOLE";
                                }
                            }
                        } else if ("ROAD_FLOODING".equals(className)) {
                            if (boxAreaRatio > 0.85) continue;
                            if ((gy + lh) < origHeight * 0.40f || isStandingTreeCanopy(subImg, lx, ly, lw, lh, gy, origHeight)) {
                                continue;
                            }
                            if (isDryAsphalt(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            if (bestConf < 0.35f && !isWaterCavity(subImg, lx, ly, lw, lh)) {
                                continue;
                            }
                            // Nếu là vũng nước lòng hốc trũng mặt đường (ổ gà ngập nước / vũng bùn)
                            if (isWaterCavity(subImg, lx, ly, lw, lh)) {
                                className = "POTHOLE";
                            }
                        }

                        boxes.add(ImageTensorUtil.BoundingBox.builder()
                                .className(className)
                                .confidence(bestConf)
                                .x(gx)
                                .y(gy)
                                .width(lw)
                                .height(lh)
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Lỗi khi chạy tile [offset={},{}]: {}", offsetX, offsetY, e.getMessage());
        }

        return boxes;
    }

    /**
     * Truy vết dải nứt lớn / sụt gãy mặt đường.
     * Tự động kích hoạt khi có rãnh nứt sâu liên tục trên nền đường.
     */
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
        // Vết nứt sạt lở thực sự luôn kéo dài liên tục qua các hàng kề cận,
        // khác biệt hoàn toàn với các điểm tối rời rạc rải rác (bóng râm/thùng hàng/vệt bánh xe).
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
            if (areaRatio > 0.96) {
                log.debug("Bỏ qua dải truy vết quá lớn (areaRatio={})", String.format("%.2f", areaRatio));
                return traced;
            }

            if (isShadowArtifact(img, bx, by, bw, bh)) {
                log.debug("Bỏ qua dải truy vết do rơi vào vùng bóng râm (isShadowArtifact)");
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

            log.info("Truy vết phát hiện dải nứt chính / sụt gãy mặt đường: [x={}, y={}, w={}, h={}, rows={}, conf={}]",
                    bx, by, bw, bh, validRowsWithFissure, String.format("%.2f", baseRawConf));

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

    private List<ImageTensorUtil.BoundingBox> applyDisplayCalibration(List<ImageTensorUtil.BoundingBox> boxes) {
        if (boxes == null || boxes.isEmpty()) return boxes;

        List<ImageTensorUtil.BoundingBox> calibrated = new ArrayList<>(boxes.size());
        for (ImageTensorUtil.BoundingBox b : boxes) {
            float rawConf = b.getConfidence();
            float displayConf = rawConf;
            if (rawConf >= 0.06f) {
                float normalized = (rawConf - 0.06f) / 0.94f;
                displayConf = 0.58f + 0.38f * (float) Math.pow(normalized, 0.55);
                displayConf = Math.min(0.96f, Math.max(rawConf, displayConf));
            }
            log.debug("CALIB {} raw={} -> display={}", b.getClassName(),
                    String.format("%.3f", rawConf), String.format("%.3f", displayConf));
            calibrated.add(ImageTensorUtil.BoundingBox.builder()
                    .className(b.getClassName())
                    .confidence(displayConf)
                    .x(b.getX())
                    .y(b.getY())
                    .width(b.getWidth())
                    .height(b.getHeight())
                    .build());
        }
        return calibrated;
    }

    private List<Rectangle> generateFastRoadTiles(int origW, int origH) {
        List<Rectangle> tiles = new ArrayList<>();
        if (origW < 200 || origH < 150) {
            return tiles;
        }

        int roadY0 = (int) (origH * 0.15);
        int roadH = origH - roadY0;

        int farH = (int) (roadH * 0.68);
        tiles.add(new Rectangle(0, roadY0, origW, farH));

        int nearY = roadY0 + (int) (roadH * 0.25);
        int nearH = origH - nearY;
        tiles.add(new Rectangle(0, nearY, origW, nearH));

        if (origW >= 950) {
            // Khi ảnh có độ phân giải lớn (Full HD, 2K, 4K), bổ sung 2 tile trái/phải khu vực giữa đường
            // để phát hiện các vật cản nhỏ / chóp nón ở xa không bị thu nhỏ quá mức
            int midY = roadY0 + (int) (roadH * 0.20);
            int midH = (int) (roadH * 0.65);
            int halfW = (int) (origW * 0.58);
            tiles.add(new Rectangle(0, midY, halfW, midH));
            tiles.add(new Rectangle(origW - halfW, midY, halfW, midH));
        }

        return tiles;
    }

    private BufferedImage enhanceCrackContrast(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);

        int[] lut = new int[256];
        for (int i = 0; i < 256; i++) {
            if (i < 90) {
                lut[i] = Math.max(0, (int) (i * 0.80));
            } else if (i < 200) {
                lut[i] = Math.min(255, (int) (i * 1.06));
            } else {
                lut[i] = i;
            }
        }

        int[] pixels = src.getRGB(0, 0, w, h, null, 0, w);
        for (int i = 0; i < pixels.length; i++) {
            int rgb = pixels[i];
            int r = lut[(rgb >> 16) & 0xFF];
            int g = lut[(rgb >> 8) & 0xFF];
            int b = lut[rgb & 0xFF];
            pixels[i] = (r << 16) | (g << 8) | b;
        }
        dst.setRGB(0, 0, w, h, pixels, 0, w);
        return dst;
    }

    private boolean isLaneMarkingOrPaint(BufferedImage img, int x, int y, int w, int h) {
        if (w <= 0 || h <= 0) return false;

        int sampleStep = Math.max(1, Math.min(w, h) / 35);
        int totalSampled = 0;
        int brightPaintPixels = 0;
        int darkFissurePixels = 0;
        int deepBlackCrackCorePixels = 0;
        long totalLuma = 0;

        int maxX = Math.min(img.getWidth(), x + w);
        int maxY = Math.min(img.getHeight(), y + h);

        for (int py = y; py < maxY; py += sampleStep) {
            for (int px = x; px < maxX; px += sampleStep) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                totalLuma += (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;
            }
        }

        if (totalSampled == 0) return false;
        int meanLuma = (int) (totalLuma / totalSampled);

        for (int py = y; py < maxY; py += sampleStep) {
            for (int px = x; px < maxX; px += sampleStep) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);

                boolean isWhitePaint = (luma >= 185 && Math.abs(r - g) <= 20 && Math.abs(g - b) <= 24)
                        || (luma >= 160 && luma >= meanLuma + 18 && Math.abs(r - g) <= 18 && Math.abs(g - b) <= 20);
                boolean isYellowPaint = (r > 165 && g > 130 && (r - b) >= 30);

                if (isWhitePaint || isYellowPaint) {
                    brightPaintPixels++;
                }

                if (luma <= meanLuma - 22 || luma < 90) {
                    darkFissurePixels++;
                }

                if (luma < 65) {
                    deepBlackCrackCorePixels++;
                }
            }
        }

        float paintRatio = (float) brightPaintPixels / totalSampled;
        float darkRatio = (float) darkFissurePixels / totalSampled;

        if (deepBlackCrackCorePixels >= 3 || (darkRatio >= 0.015f && darkFissurePixels >= 4)) {
            return false;
        }

        float aspect = (float) w / h;
        boolean isStripeShape = (aspect <= 0.85f) || (aspect >= 1.15f);

        if (paintRatio >= 0.30f && darkRatio < 0.010f) {
            return true;
        }

        return isStripeShape && paintRatio >= 0.18f && darkRatio < 0.008f;
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

    /**
     * ĐÃ SỬA: chỉ coi là vết nứt mảnh khi khung dài/hẹp và có đủ pixel tối.
     * Không còn trả true cho khung gần vuông (hố tròn / ổ gà).
     */
    private boolean isThinCrackPattern(BufferedImage img, int x, int y, int w, int h) {
        if (w <= 0 || h <= 0) return false;

        float aspect = (float) w / h;
        boolean isElongated = (aspect <= 0.80f) || (aspect >= 1.30f);

        int sampleStep = Math.max(1, Math.min(w, h) / 35);
        int totalSampled = 0;
        long totalLuma = 0;

        int maxX = Math.min(img.getWidth(), x + w);
        int maxY = Math.min(img.getHeight(), y + h);

        for (int py = y; py < maxY; py += sampleStep) {
            for (int px = x; px < maxX; px += sampleStep) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                totalLuma += (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;
            }
        }

        if (totalSampled == 0) return false;

        int meanLuma = (int) (totalLuma / totalSampled);
        int darkThreshold = Math.max(70, Math.min(130, meanLuma - 18));

        int darkCavityPixels = 0;
        for (int py = y; py < maxY; py += sampleStep) {
            for (int px = x; px < maxX; px += sampleStep) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);

                if (luma <= darkThreshold || luma < 100) {
                    darkCavityPixels++;
                }
            }
        }

        float darkRatio = (float) darkCavityPixels / totalSampled;
        return isElongated && darkRatio >= 0.008f;
    }

    private boolean isTruePotholeCavity(BufferedImage img, int x, int y, int w, int h) {
        if (img == null || w <= 0 || h <= 0) return false;

        float aspect = (float) w / h;
        if (aspect < 0.50f || aspect > 2.20f) {
            return false;
        }

        int imgW = img.getWidth();
        int imgH = img.getHeight();
        int rx = Math.max(0, Math.min(x, imgW - 1));
        int ry = Math.max(0, Math.min(y, imgH - 1));
        int rw = Math.min(w, imgW - rx);
        int rh = Math.min(h, imgH - ry);
        if (rw <= 6 || rh <= 6) return false;

        int step = Math.max(1, Math.min(rw, rh) / 30);
        int totalSampled = 0;
        long totalLuma = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                totalLuma += (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;
            }
        }

        if (totalSampled == 0) return false;
        int meanLuma = (int) (totalLuma / totalSampled);

        int deepBowlThreshold = Math.max(60, Math.min(110, meanLuma - 26));
        int deepCavityPixels = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);

                if (luma <= deepBowlThreshold || luma < 80) {
                    deepCavityPixels++;
                }
            }
        }

        float bowlRatio = (float) deepCavityPixels / totalSampled;
        return (bowlRatio >= 0.32f);
    }

    private boolean isStandingTreeCanopy(BufferedImage img, int x, int y, int w, int h, int gy, int origH) {
        if (img == null || w <= 0 || h <= 0) return false;

        int imgW = img.getWidth();
        int imgH = img.getHeight();
        int rx = Math.max(0, Math.min(x, imgW - 1));
        int ry = Math.max(0, Math.min(y, imgH - 1));
        int rw = Math.min(w, imgW - rx);
        int rh = Math.min(h, imgH - ry);

        if (rw <= 4 || rh <= 4) return false;

        int step = Math.max(1, Math.min(rw, rh) / 20);
        int totalSampled = 0;
        int foliagePixels = 0;
        int skyPixels = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                totalSampled++;

                // Lá cây phải có sắc thái xanh lục đặc trưng
                boolean isFoliage = (g > r + 12 && g > b + 12 && g > 45)
                        || (g > 65 && g > (int)(r * 1.15) && g > (int)(b * 1.15));
                // Bầu trời phải có màu xanh lam chiếm ưu thế (hoặc sáng chói ở đỉnh ảnh gy < 15%)
                boolean isSkyBackground = (b > r + 20 && b > g + 10 && b > 110)
                        || (gy < origH * 0.15f && r > 215 && g > 215 && b > 215);

                if (isFoliage) {
                    foliagePixels++;
                }
                if (isSkyBackground) {
                    skyPixels++;
                }
            }
        }

        if (totalSampled == 0) return false;

        float foliageRatio = (float) foliagePixels / totalSampled;
        float skyRatio = (float) skyPixels / totalSampled;
        // Bắt buộc phải có tỷ lệ lá cây xanh thực tế (foliageRatio) và nằm ở nửa trên ảnh
        return ((foliageRatio >= 0.35f || (foliageRatio >= 0.18f && (foliageRatio + skyRatio) >= 0.60f)) && gy < origH * 0.50f);
    }

    private boolean isRoadsideGuardrailOrCurb(BufferedImage img, int x, int y, int w, int h, int gx, int origW) {
        if (img == null || w <= 0 || h <= 0) return false;

        boolean isRightShoulder = (gx + w) >= (int) (origW * 0.70f);
        boolean isLeftShoulder = (gx <= (int) (origW * 0.30f));
        if (!isRightShoulder && !isLeftShoulder) {
            return false;
        }

        float aspect = (float) w / h;
        // Hộ lan lề đường (Guardrail) luôn là dải thanh kim loại nằm ngang kéo dài (aspect >= 2.2)
        // Các vật thể riêng lẻ (cọc tiêu, đá, thùng hàng, rào chắn tạm thời) không bị coi là hộ lan
        if (aspect < 2.2f || w < (int) (origW * 0.15f)) {
            return false;
        }

        int imgW = img.getWidth();
        int imgH = img.getHeight();
        int rx = Math.max(0, Math.min(x, imgW - 1));
        int ry = Math.max(0, Math.min(y, imgH - 1));
        int rw = Math.min(w, imgW - rx);
        int rh = Math.min(h, imgH - ry);
        if (rw <= 6 || rh <= 6) return false;

        int step = Math.max(1, Math.min(rw, rh) / 25);
        int totalSampled = 0;
        int barrierStripePixels = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;

                boolean isRedStripe = (r > 140 && r > g + 28 && r > b + 28);
                boolean isWhitePaint = (luma >= 170 && Math.abs(r - g) <= 25 && Math.abs(g - b) <= 25);

                if (isRedStripe || isWhitePaint) {
                    barrierStripePixels++;
                }
            }
        }

        if (totalSampled == 0) return false;
        float barrierRatio = (float) barrierStripePixels / totalSampled;
        return (barrierRatio >= 0.15f);
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
        return (waterRatio >= 0.30f);
    }

    private boolean isDryAsphalt(BufferedImage img, int x, int y, int w, int h) {
        if (img == null || w <= 0 || h <= 0) return false;

        int imgW = img.getWidth();
        int imgH = img.getHeight();
        int rx = Math.max(0, Math.min(x, imgW - 1));
        int ry = Math.max(0, Math.min(y, imgH - 1));
        int rw = Math.min(w, imgW - rx);
        int rh = Math.min(h, imgH - ry);

        if (rw <= 8 || rh <= 8) return false;

        int step = Math.max(2, Math.min(rw, rh) / 25);
        int totalSampled = 0;
        int dryAsphaltPixels = 0;
        int waterLikePixels = 0;

        for (int py = ry; py < ry + rh; py += step) {
            for (int px = rx; px < rx + rw; px += step) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;

                boolean isWaterReflection = (luma > 225 && Math.abs(r - b) < 25);
                boolean isSkyTintWater = (b > r + 15 && b > g + 8 && luma > 105);
                boolean isMuddyFlood = (r > b + 28 && g > b + 12 && luma >= 60 && luma <= 155);

                if (isWaterReflection || isSkyTintWater || isMuddyFlood) {
                    waterLikePixels++;
                } else {
                    int diffRG = Math.abs(r - g);
                    int diffGB = Math.abs(g - b);
                    int diffRB = Math.abs(r - b);
                    if (diffRG <= 16 && diffGB <= 16 && diffRB <= 16 && luma >= 50 && luma <= 215) {
                        dryAsphaltPixels++;
                    }
                }
            }
        }

        if (totalSampled == 0) return false;

        float dryRatio = (float) dryAsphaltPixels / totalSampled;
        float waterRatio = (float) waterLikePixels / totalSampled;

        return (dryRatio >= 0.50f && waterRatio < 0.15f);
    }

    private List<ImageTensorUtil.BoundingBox> filterPotholesInFlood(
            List<ImageTensorUtil.BoundingBox> boxes, int origW, int origH) {
        if (boxes == null || boxes.isEmpty()) return boxes;

        List<ImageTensorUtil.BoundingBox> widespreadFloods = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("ROAD_FLOODING".equals(b.getClassName())) {
                float widthRatio = (float) b.getWidth() / Math.max(1, origW);
                float areaRatio = (float) (b.getWidth() * b.getHeight()) / Math.max(1, (origW * origH));
                if (widthRatio >= 0.60f || areaRatio >= 0.35f) {
                    widespreadFloods.add(b);
                }
            }
        }

        if (widespreadFloods.isEmpty()) {
            return boxes;
        }

        List<ImageTensorUtil.BoundingBox> filtered = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("POTHOLE".equals(b.getClassName())) {
                int cx = b.getX() + b.getWidth() / 2;
                int cy = b.getY() + b.getHeight() / 2;
                boolean insideWidespreadFlood = false;
                for (ImageTensorUtil.BoundingBox fb : widespreadFloods) {
                    if (cx >= fb.getX() && cx <= (fb.getX() + fb.getWidth())
                            && cy >= fb.getY() && cy <= (fb.getY() + fb.getHeight())) {
                        insideWidespreadFlood = true;
                        break;
                    }
                }
                if (insideWidespreadFlood && b.getConfidence() < 0.30f) {
                    continue;
                }
            }
            filtered.add(b);
        }
        return filtered;
    }

    private List<ImageTensorUtil.BoundingBox> calibratePlanAObjects(
            List<ImageTensorUtil.BoundingBox> boxes, int origW, int origH) {
        if (boxes == null || boxes.isEmpty()) return boxes;

        boolean hasWaterContext = boxes.stream().anyMatch(box ->
                "ROAD_FLOODING".equals(box.getClassName())
                || ("POTHOLE".equals(box.getClassName()) && box.getWidth() > origW * 0.22f));

        if (!hasWaterContext) {
            return boxes;
        }

        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        List<ImageTensorUtil.BoundingBox> tyreBoxes = new ArrayList<>();
        List<ImageTensorUtil.BoundingBox> puddleBoxes = new ArrayList<>();

        for (ImageTensorUtil.BoundingBox b : boxes) {
            float aspect = (float) b.getWidth() / Math.max(1, b.getHeight());
            float wRatio = (float) b.getWidth() / Math.max(1, origW);
            float hRatio = (float) b.getHeight() / Math.max(1, origH);

            if ("ROAD_OBSTACLE".equals(b.getClassName()) && wRatio < 0.20f && hRatio < 0.12f && aspect >= 2.0f && aspect <= 4.0f) {
                tyreBoxes.add(ImageTensorUtil.BoundingBox.builder()
                        .className("ROAD_OBSTACLE")
                        .confidence(Math.max(0.35f, b.getConfidence()))
                        .x(b.getX())
                        .y(b.getY())
                        .width(b.getWidth())
                        .height(b.getHeight())
                        .build());
                continue;
            }

            result.add(b);
        }

        if (!tyreBoxes.isEmpty()) {
            List<ImageTensorUtil.BoundingBox> refinedResult = new ArrayList<>();
            for (ImageTensorUtil.BoundingBox b : result) {
                float wRatio = (float) b.getWidth() / Math.max(1, origW);
                if ("ROAD_FLOODING".equals(b.getClassName()) && wRatio < 0.65f) {
                    puddleBoxes.add(ImageTensorUtil.BoundingBox.builder()
                            .className("POTHOLE")
                            .confidence(Math.max(0.40f, b.getConfidence()))
                            .x(b.getX())
                            .y(b.getY())
                            .width(b.getWidth())
                            .height(b.getHeight())
                            .build());
                    continue;
                }
                if ("ROAD_OBSTACLE".equals(b.getClassName()) && wRatio > 0.85f) {
                    continue;
                }
                refinedResult.add(b);
            }
            refinedResult.addAll(puddleBoxes);
            refinedResult.addAll(tyreBoxes);
            return refinedResult;
        }

        return result;
    }

    private List<ImageTensorUtil.BoundingBox> suppressCrossClassConflicts(List<ImageTensorUtil.BoundingBox> inputBoxes) {
        if (inputBoxes == null || inputBoxes.size() < 2) return inputBoxes;

        List<ImageTensorUtil.BoundingBox> boxes = new ArrayList<>(inputBoxes);
        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        boolean[] suppressed = new boolean[boxes.size()];

        for (int i = 0; i < boxes.size(); i++) {
            if (suppressed[i]) continue;
            ImageTensorUtil.BoundingBox a = boxes.get(i);

            for (int j = i + 1; j < boxes.size(); j++) {
                if (suppressed[j]) continue;
                ImageTensorUtil.BoundingBox b = boxes.get(j);

                if (!Objects.equals(a.getClassName(), b.getClassName())) {
                    float ioU = ImageTensorUtil.computeIoU(a, b);
                    float areaA = (float) a.getWidth() * a.getHeight();
                    float areaB = (float) b.getWidth() * b.getHeight();
                    float minArea = Math.min(areaA, areaB);
                    float maxArea = Math.max(areaA, areaB);
                    float areaRatio = minArea / Math.max(1f, maxArea);

                    if (("POTHOLE".equals(a.getClassName()) && "ROAD_FLOODING".equals(b.getClassName()))
                            || ("ROAD_FLOODING".equals(a.getClassName()) && "POTHOLE".equals(b.getClassName()))) {
                        int interX1 = Math.max(a.getX(), b.getX());
                        int interY1 = Math.max(a.getY(), b.getY());
                        int interX2 = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth());
                        int interY2 = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight());
                        float interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);

                        if (interArea > 0 && (interArea / minArea >= 0.25f || ioU >= 0.15f)) {
                            int unionX = Math.min(a.getX(), b.getX());
                            int unionY = Math.min(a.getY(), b.getY());
                            int unionR = Math.max(a.getX() + a.getWidth(), b.getX() + b.getWidth());
                            int unionB = Math.max(a.getY() + a.getHeight(), b.getY() + b.getHeight());
                            float maxConf = Math.max(a.getConfidence(), b.getConfidence());

                            ImageTensorUtil.BoundingBox mergedPothole = ImageTensorUtil.BoundingBox.builder()
                                    .className("POTHOLE")
                                    .confidence(maxConf)
                                    .x(unionX)
                                    .y(unionY)
                                    .width(unionR - unionX)
                                    .height(unionB - unionY)
                                    .build();

                            if ("POTHOLE".equals(a.getClassName())) {
                                a = mergedPothole;
                                boxes.set(i, a);
                                suppressed[j] = true;
                            } else {
                                b = mergedPothole;
                                boxes.set(j, b);
                                suppressed[i] = true;
                                break;
                            }
                            continue;
                        }
                    }

                    boolean aIsObs = "ROAD_OBSTACLE".equals(a.getClassName());
                    boolean bIsObs = "ROAD_OBSTACLE".equals(b.getClassName());
                    if (aIsObs || bIsObs) {
                        ImageTensorUtil.BoundingBox obs = aIsObs ? a : b;
                        ImageTensorUtil.BoundingBox pot = aIsObs ? b : a;

                        boolean potIsCrack = "ROAD_CRACK".equals(pot.getClassName());
                        if ("POTHOLE".equals(pot.getClassName())
                                || "ROAD_FLOODING".equals(pot.getClassName())
                                || potIsCrack) {
                            int interX1 = Math.max(obs.getX(), pot.getX());
                            int interY1 = Math.max(obs.getY(), pot.getY());
                            int interX2 = Math.min(obs.getX() + obs.getWidth(), pot.getX() + pot.getWidth());
                            int interY2 = Math.min(obs.getY() + obs.getHeight(), pot.getY() + pot.getHeight());
                            float interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
                            float obsArea = Math.max(1f, (float) obs.getWidth() * obs.getHeight());

                            // Vật cản độ tin cậy rất cao nằm trên vết nứt dài: giữ lại (vd. cọc tiêu trên đường nứt)
                            if (potIsCrack && obs.getConfidence() >= 0.60f) {
                                continue;
                            }

                            if (interArea / obsArea >= 0.45f || ioU >= 0.30f) {
                                if (aIsObs) {
                                    suppressed[i] = true;
                                    break;
                                } else {
                                    suppressed[j] = true;
                                    continue;
                                }
                            }
                        }
                    }

                    // Khử xung đột giữa Vết nứt (ROAD_CRACK) và Ổ gà (POTHOLE) lồng nhau:
                    // Khi dải nứt chính bao bọc hố thon dài hoặc lòng rãnh nứt sâu bị nhận diện nhầm thành POTHOLE
                    boolean aIsCrack = "ROAD_CRACK".equals(a.getClassName());
                    boolean bIsCrack = "ROAD_CRACK".equals(b.getClassName());
                    boolean aIsPot = "POTHOLE".equals(a.getClassName());
                    boolean bIsPot = "POTHOLE".equals(b.getClassName());
                    if ((aIsCrack && bIsPot) || (bIsCrack && aIsPot)) {
                        ImageTensorUtil.BoundingBox crackBox = aIsCrack ? a : b;
                        ImageTensorUtil.BoundingBox potBox = aIsCrack ? b : a;

                        int interX1 = Math.max(crackBox.getX(), potBox.getX());
                        int interY1 = Math.max(crackBox.getY(), potBox.getY());
                        int interX2 = Math.min(crackBox.getX() + crackBox.getWidth(), potBox.getX() + potBox.getWidth());
                        int interY2 = Math.min(crackBox.getY() + crackBox.getHeight(), potBox.getY() + potBox.getHeight());
                        float interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
                        float potArea = Math.max(1f, (float) potBox.getWidth() * potBox.getHeight());

                        // Nếu POTHOLE nằm sâu bên trong dải nứt (>= 60% diện tích nằm trong crack) hoặc có dạng thon dài (elongation >= 1.6)
                        float potAspect = (float) potBox.getWidth() / Math.max(1, potBox.getHeight());
                        boolean isElongatedSlot = potAspect < 0.65f || potAspect > 1.65f;
                        if ((interArea / potArea >= 0.60f && isElongatedSlot) || (interArea / potArea >= 0.85f)) {
                            if (aIsPot) {
                                suppressed[i] = true;
                                break;
                            } else {
                                suppressed[j] = true;
                                continue;
                            }
                        }
                    }

                    if (ioU >= 0.35f && areaRatio >= 0.30f) {
                        if (a.getConfidence() >= b.getConfidence()) {
                            suppressed[j] = true;
                        } else {
                            suppressed[i] = true;
                            break;
                        }
                    }
                }
            }
            if (!suppressed[i]) {
                result.add(a);
            }
        }
        return result;
    }

    private List<ImageTensorUtil.BoundingBox> mergeCollinearCracks(
            List<ImageTensorUtil.BoundingBox> boxes, int origW, int origH) {

        if (boxes == null || boxes.size() < 2) {
            return boxes;
        }

        List<ImageTensorUtil.BoundingBox> nonCracks = new ArrayList<>();
        List<ImageTensorUtil.BoundingBox> cracks = new ArrayList<>();

        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("ROAD_CRACK".equals(b.getClassName())) {
                cracks.add(b);
            } else {
                nonCracks.add(b);
            }
        }

        if (cracks.size() < 2) {
            return boxes;
        }

        boolean mergedAny = true;
        int maxAllowedGapY = (int) (origH * 0.22);
        int maxAllowedGapX = (int) (origW * 0.16);

        while (mergedAny) {
            mergedAny = false;
            for (int i = 0; i < cracks.size(); i++) {
                for (int j = i + 1; j < cracks.size(); j++) {
                    ImageTensorUtil.BoundingBox a = cracks.get(i);
                    ImageTensorUtil.BoundingBox b = cracks.get(j);

                    int aBottom = a.getY() + a.getHeight();
                    int bBottom = b.getY() + b.getHeight();
                    int aRight = a.getX() + a.getWidth();
                    int bRight = b.getX() + b.getWidth();

                    int aMidX = a.getX() + a.getWidth() / 2;
                    int bMidX = b.getX() + b.getWidth() / 2;

                    int gapY = Math.max(0, Math.max(a.getY(), b.getY()) - Math.min(aBottom, bBottom));
                    int interX1 = Math.max(a.getX(), b.getX());
                    int interX2 = Math.min(aRight, bRight);
                    int overlapX = Math.max(0, interX2 - interX1);
                    int diffX = Math.abs(aMidX - bMidX);

                    boolean canMerge = (gapY <= maxAllowedGapY) && (overlapX > 0 || diffX <= maxAllowedGapX);

                    if (canMerge) {
                        int nx = Math.min(a.getX(), b.getX());
                        int ny = Math.min(a.getY(), b.getY());
                        int nw = Math.max(aRight, bRight) - nx;
                        int nh = Math.max(aBottom, bBottom) - ny;
                        float nConf = Math.max(a.getConfidence(), b.getConfidence());

                        ImageTensorUtil.BoundingBox merged = ImageTensorUtil.BoundingBox.builder()
                                .className("ROAD_CRACK")
                                .confidence(nConf)
                                .x(nx)
                                .y(ny)
                                .width(nw)
                                .height(nh)
                                .build();

                        cracks.remove(j);
                        cracks.remove(i);
                        cracks.add(merged);
                        mergedAny = true;
                        break;
                    }
                }
                if (mergedAny) break;
            }
        }

        List<ImageTensorUtil.BoundingBox> finalResult = new ArrayList<>(nonCracks);
        finalResult.addAll(cracks);
        finalResult.sort((a, b) -> Float.compare(b.getConfidence(), a.getConfidence()));
        return finalResult;
    }

    private List<ImageTensorUtil.BoundingBox> mergeOverlappingPotholes(
            List<ImageTensorUtil.BoundingBox> boxes) {
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

                    if (interArea / minArea >= 0.35f || ImageTensorUtil.computeIoU(a, b) >= 0.20f) {
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

        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>(nonPotholes);
        result.addAll(potholes);
        result.sort((a, b) -> Float.compare(b.getConfidence(), a.getConfidence()));
        return result;
    }

    private List<ImageTensorUtil.BoundingBox> tightenAndFilterBoundingBoxes(
            BufferedImage img, List<ImageTensorUtil.BoundingBox> boxes) {
        if (boxes == null || boxes.isEmpty() || img == null) return boxes;

        int origW = img.getWidth();
        int origH = img.getHeight();
        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();

        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("ROAD_CRACK".equals(b.getClassName())) {
                if (b.getHeight() < Math.max(18, origH * 0.04) && b.getWidth() < Math.max(35, origW * 0.08)) {
                    log.debug("Loại bỏ mẩu ROAD_CRACK vụn quá nhỏ: w={}, h={} at ({},{})", b.getWidth(), b.getHeight(), b.getX(), b.getY());
                    continue;
                }
                ImageTensorUtil.BoundingBox tightened = tightenSingleCrackBox(img, b);
                if (tightened != null) {
                    result.add(tightened);
                } else {
                    result.add(b); // Giữ nguyên box gốc nếu không tìm thấy điểm co hẹp, không loại bỏ vết nứt
                }
            } else if ("POTHOLE".equals(b.getClassName())) {
                ImageTensorUtil.BoundingBox tightened = tightenSinglePotholeBox(img, b);
                if (tightened != null) {
                    result.add(tightened);
                } else {
                    result.add(b);
                }
            } else if ("ROAD_OBSTACLE".equals(b.getClassName())) {
                ImageTensorUtil.BoundingBox tightened = tightenSingleObstacleBox(img, b);
                if (tightened != null) {
                    result.add(tightened);
                } else {
                    result.add(b); // Giữ nguyên box gốc, không loại bỏ vật cản
                }
            } else {
                result.add(b);
            }
        }

        boolean hasMajorCrack = result.stream().anyMatch(b ->
                "ROAD_CRACK".equals(b.getClassName()) && b.getHeight() > origH * 0.25);

        if (hasMajorCrack) {
            result.removeIf(b -> "ROAD_CRACK".equals(b.getClassName())
                    && b.getHeight() < origH * 0.08
                    && b.getWidth() < origW * 0.12);
        }

        return result;
    }

    private ImageTensorUtil.BoundingBox tightenSinglePotholeBox(
            BufferedImage img, ImageTensorUtil.BoundingBox b) {
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

    private ImageTensorUtil.BoundingBox tightenSingleObstacleBox(
            BufferedImage img, ImageTensorUtil.BoundingBox b) {
        int bx = Math.max(0, b.getX());
        int by = Math.max(0, b.getY());
        int bw = Math.min(img.getWidth() - bx, b.getWidth());
        int bh = Math.min(img.getHeight() - by, b.getHeight());
        if (bw < 30 || bh < 20) return b;

        if (isRoadsideGuardrailOrCurb(img, bx, by, bw, bh, bx, img.getWidth())) {
            return null;
        }

        int minX = bw, maxX = 0, minY = bh, maxY = 0;
        int objectPixelCount = 0;
        int step = Math.max(1, Math.min(bw, bh) / 30);

        for (int y = 0; y < bh; y += step) {
            for (int x = 0; x < bw; x += step) {
                int rgb = img.getRGB(bx + x, by + y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int bVal = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * bVal);

                boolean isDarkObject = (luma < 75);
                boolean isBrightObstacle = (r > 175 && r > g + 35 && r > bVal + 50);

                if (isDarkObject || isBrightObstacle) {
                    objectPixelCount++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (objectPixelCount >= 4 && maxX > minX && maxY > minY) {
            int padX = Math.max(6, (int) ((maxX - minX) * 0.10));
            int padY = Math.max(6, (int) ((maxY - minY) * 0.10));

            int newX = Math.max(0, bx + minX - padX);
            int newY = Math.max(0, by + minY - padY);
            int newW = Math.min(img.getWidth() - newX, (maxX - minX) + padX * 2);
            int newH = Math.min(img.getHeight() - newY, (maxY - minY) + padY * 2);

            if (newW >= 18 && newH >= 18 && (newW * newH) <= (bw * bh * 0.85)) {
                return ImageTensorUtil.BoundingBox.builder()
                        .className("ROAD_OBSTACLE")
                        .confidence(b.getConfidence())
                        .x(newX)
                        .y(newY)
                        .width(newW)
                        .height(newH)
                        .build();
            }
            return b;
        }

        if (objectPixelCount < 4 && b.getConfidence() < 0.45f) {
            return null;
        }

        return b;
    }

    private ImageTensorUtil.BoundingBox tightenSingleCrackBox(
            BufferedImage img, ImageTensorUtil.BoundingBox b) {
        int bx = Math.max(0, b.getX());
        int by = Math.max(0, b.getY());
        int bw = Math.min(img.getWidth() - bx, b.getWidth());
        int bh = Math.min(img.getHeight() - by, b.getHeight());
        if (bw < 20 || bh < 16) return null;

        long totalLuma = 0;
        int countPixels = 0;
        int coarseStep = Math.max(2, Math.min(bw, bh) / 20);
        for (int y = 0; y < bh; y += coarseStep) {
            for (int x = 0; x < bw; x += coarseStep) {
                int rgb = img.getRGB(bx + x, by + y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int bVal = rgb & 0xFF;
                totalLuma += (int) (0.299 * r + 0.587 * g + 0.114 * bVal);
                countPixels++;
            }
        }
        int meanLuma = (countPixels > 0) ? (int) (totalLuma / countPixels) : 128;
        int crackLumaThreshold = Math.max(65, Math.min(125, meanLuma - 22));

        int minX = bw, maxX = 0, minY = bh, maxY = 0;
        int crackPointCount = 0;
        int step = Math.max(1, Math.min(bw, bh) / 50);

        for (int y = 0; y < bh; y += step) {
            for (int x = 0; x < bw; x += step) {
                int rgb = img.getRGB(bx + x, by + y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int bVal = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * bVal);

                if (luma <= crackLumaThreshold || (meanLuma >= 100 && luma < 80)) {
                    crackPointCount++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (crackPointCount >= 4 && maxX > minX && maxY > minY) {
            int padX = Math.max(8, (int) ((maxX - minX) * 0.12));
            int padY = Math.max(8, (int) ((maxY - minY) * 0.08));

            int newX = Math.max(0, bx + minX - padX);
            int newY = Math.max(0, by + minY - padY);
            int newW = Math.min(img.getWidth() - newX, (maxX - minX) + padX * 2);
            int newH = Math.min(img.getHeight() - newY, (maxY - minY) + padY * 2);

            if (newW >= 18 && newH >= 18 && (newW * newH) < (bw * bh * 0.90)) {
                return ImageTensorUtil.BoundingBox.builder()
                        .className("ROAD_CRACK")
                        .confidence(b.getConfidence())
                        .x(newX)
                        .y(newY)
                        .width(newW)
                        .height(newH)
                        .build();
            }
            return b;
        }

        if (crackPointCount < 4) {
            return null;
        }

        return b;
    }

    public String calculateSeverity(List<ImageTensorUtil.BoundingBox> boxes, int imgWidth, int imgHeight) {
        if (boxes == null || boxes.isEmpty()) {
            return "LOW";
        }

        int count = boxes.size();
        int criticalTypeCount = 0;
        double weightedTotalArea = 0;
        float maxConf = 0.0f;

        for (ImageTensorUtil.BoundingBox b : boxes) {
            long boxArea = (long) b.getWidth() * b.getHeight();
            if ("ROAD_CRACK".equals(b.getClassName())) {
                if (b.getHeight() > imgHeight * 0.45) {
                    weightedTotalArea += boxArea * 0.55;
                    criticalTypeCount++;
                } else {
                    weightedTotalArea += boxArea * 0.25;
                }
            } else {
                weightedTotalArea += boxArea;
                criticalTypeCount++;
            }
            if (b.getConfidence() > maxConf) {
                maxConf = b.getConfidence();
            }
        }

        long imgArea = (long) Math.max(1, imgWidth) * Math.max(1, imgHeight);
        double effectiveAreaRatio = Math.min(1.0, weightedTotalArea / imgArea);

        if (criticalTypeCount >= 3 || count >= 4 || effectiveAreaRatio >= 0.12) {
            return "CRITICAL";
        }
        if (count >= 2 || criticalTypeCount >= 1 && effectiveAreaRatio >= 0.05 || effectiveAreaRatio >= 0.06) {
            return "HIGH";
        }
        if (maxConf >= 0.50f) {
            return "MEDIUM";
        }
        return "LOW";
    }

    public ImageTensorUtil.BoundingBox runInference(InputStream imageInputStream) {
        List<ImageTensorUtil.BoundingBox> list = runInferenceList(imageInputStream);
        return list.isEmpty() ? emptyDetection() : list.get(0);
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

    public float getConfidenceThreshold() {
        return confidenceThreshold;
    }

    public boolean isModelLoaded() {
        return isModelLoaded;
    }
}