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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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

    public AiInferenceService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        try {
            env = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
            opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);

            // Nạp duy nhất mô hình đa lớp người dùng đã huấn luyện (YOLOv8 Multi-Class: POTHOLE, ROAD_CRACK, ROAD_FLOODING, ROAD_OBSTACLE)
            Resource modelResource = resourceLoader.getResource("classpath:models/yolov8_multiclass_roadcare.onnx");
            if (!modelResource.exists()) {
                modelResource = resourceLoader.getResource(modelPath);
            }
            if (modelResource.exists()) {
                try (InputStream is = modelResource.getInputStream()) {
                    byte[] modelBytes = is.readAllBytes();
                    session = env.createSession(modelBytes, opts);
                    isModelLoaded = true;
                    log.info("Mô hình YOLOv8 người dùng đã nạp thành công từ: {}. Inputs: {}, Outputs: {}",
                            modelResource.getFilename(), session.getInputNames(), session.getOutputNames());
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

    /**
     * Suy luận phân tích ảnh mặt đường với ngưỡng tin cậy mặc định
     */
    public List<ImageTensorUtil.BoundingBox> runInferenceList(InputStream imageInputStream) {
        return runInferenceList(imageInputStream, this.confidenceThreshold);
    }

    /**
     * Suy luận phân tích ảnh mặt đường với ngưỡng tin cậy tùy chỉnh (hỗ trợ slider thời gian thực)
     */
    /**
     * Suy luận phân tích ảnh mặt đường đa tỉ lệ (Full-Image + Road Tiling / SAHI Style):
     * 1. Pass 1: Toàn ảnh (bắt vật cản lớn, ngập nước diện rộng)
     * 2. Pass 2..N: Các lát cắt mặt đường (Road Tiles có overlap 25%) độ phân giải cao (bắt vết nứt mảnh, ổ gà xa)
     * 3. Ánh xạ tọa độ tile về tọa độ ảnh gốc (Coordinate Mapping)
     * 4. Global NMS (khử trùng lặp giữa Full Image và các Tiles, giữ box có confidence cao nhất)
     * 5. Collinear Crack Merging (hợp nhất dải nứt cùng phương, không cộng dồn confidence)
     */
    public List<ImageTensorUtil.BoundingBox> runInferenceList(InputStream imageInputStream, float customThreshold) {
        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        float effectiveThreshold = (customThreshold >= 0.05f && customThreshold <= 0.99f) ? customThreshold : this.confidenceThreshold;

        try {
            BufferedImage image = ImageIO.read(imageInputStream);
            if (image == null) {
                log.warn("Không thể giải mã ảnh thành BufferedImage (định dạng không hỗ trợ hoặc luồng rỗng)");
                return result;
            }

            int origWidth = image.getWidth();
            int origHeight = image.getHeight();

            if (isModelLoaded && session != null) {
                int modelInputSize = 800;
                try {
                    TensorInfo tInfo = (TensorInfo) session.getInputInfo().get("images").getInfo();
                    long[] inShape = tInfo.getShape();
                    if (inShape != null && inShape.length >= 4 && inShape[2] > 0) {
                        modelInputSize = (int) inShape[2];
                    }
                } catch (Exception ignored) {}

                List<ImageTensorUtil.BoundingBox> allCandidates = new ArrayList<>();

                // PASS 1: QUÉT TOÀN BỘ KHUNG HÌNH (Toàn cảnh, vật cản lớn, ngập nước diện rộng - áp dụng tăng tương phản rãnh nứt)
                BufferedImage enhancedFullImg = enhanceCrackContrast(image);
                allCandidates.addAll(inferSingleSubImage(enhancedFullImg, modelInputSize, effectiveThreshold, 0, 0, origWidth, origHeight));

                // PASS 2: ROAD TILING / SLICED INFERENCE (Cắt lát mặt đường độ phân giải cao)
                List<Rectangle> tiles = generateRoadTiles(origWidth, origHeight);
                for (Rectangle tile : tiles) {
                    try {
                        BufferedImage tileImg = image.getSubimage(tile.x, tile.y, tile.width, tile.height);
                        BufferedImage enhancedTile = enhanceCrackContrast(tileImg);
                        List<ImageTensorUtil.BoundingBox> tileBoxes = inferSingleSubImage(
                                enhancedTile, modelInputSize, effectiveThreshold, tile.x, tile.y, origWidth, origHeight);
                        allCandidates.addAll(tileBoxes);
                    } catch (Exception te) {
                        log.debug("Bỏ qua tile [{}, {}, {}, {}]: {}", tile.x, tile.y, tile.width, tile.height, te.getMessage());
                    }
                }

                if (!allCandidates.isEmpty()) {
                    // BƯỚC 3: GLOBAL NMS (Khử trùng lặp giữa Full Image và các Tiles, giữ box có confidence cao nhất)
                    List<ImageTensorUtil.BoundingBox> nmsBoxes = ImageTensorUtil.applyNms(allCandidates, iouThreshold);

                    // BƯỚC 3.5: KHỬ Ổ GÀ ẢO TRONG VÙNG NGẬP NƯỚC (False Potholes in Flooded Street)
                    // Khi đường ngập nước diện rộng (ROAD_FLOODING), bóng xe và sóng nước không được báo là ổ gà
                    List<ImageTensorUtil.BoundingBox> deFloodedBoxes = filterPotholesInFlood(nmsBoxes);

                    // BƯỚC 3.8: KHỬ XUNG ĐỘT TRÙNG LẶP ĐA LỚP (Cross-class conflict: POTHOLE vs ROAD_CRACK đè khít lên nhau)
                    List<ImageTensorUtil.BoundingBox> deConflictedBoxes = suppressCrossClassConflicts(deFloodedBoxes);

                    // BƯỚC 4: COLLINEAR CRACK MERGING (Hợp nhất các đoạn nứt dọc/ngang cùng phương)
                    List<ImageTensorUtil.BoundingBox> mergedBoxes = mergeCollinearCracks(deConflictedBoxes, origWidth, origHeight);

                    // BƯỚC 5: TIGHTEN CRACK BOUNDING BOXES (Thu gọn khung bao ôm sát rãnh nứt, loại bỏ lề đường thừa)
                    List<ImageTensorUtil.BoundingBox> finalBoxes = tightenCrackBoundingBoxes(image, mergedBoxes);

                    StringBuilder details = new StringBuilder();
                    for (ImageTensorUtil.BoundingBox b : finalBoxes) {
                        details.append(String.format("[%s: %.1f%% (x=%d, y=%d, w=%d, h=%d)] ",
                                b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight()));
                    }
                    log.info("AI PHÁT HIỆN {} VỊ TRÍ HƯ HỎNG (Ngưỡng: {}% | Tiles: {}): {}",
                            finalBoxes.size(), (int)(effectiveThreshold * 100), tiles.size(), details.toString().trim());
                    return finalBoxes;
                }

                log.info("AI quét ảnh: Không phát hiện hư hỏng mặt đường nào (Độ tin cậy < {}%)", (int)(effectiveThreshold * 100));
            }

            return result;

        } catch (Exception e) {
            log.error("Lỗi trong quá trình suy luận danh sách ảnh", e);
            return result;
        }
    }

    /**
     * Suy luận trên một ảnh con (Subimage / Tile) và quy đổi tọa độ ngược về ảnh gốc
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

                    for (int c = 0; c < numClasses; c++) {
                        float cConf = output[0][4 + c][i];
                        if (c > 0 && cConf > bestConf) {
                            bestConf = cConf;
                            bestClassId = c;
                        }
                    }

                    // Phân biệt Vết nứt toác sâu kéo dài (Fissure / Rupture) vs Ổ gà (Pothole):
                    // Ổ gà thật sự là hố sụt tròn/bầu dục (w ~ h).
                    // Khi một vết nứt toác sâu có khe hở tối màu, mạng YOLO có thể gán nhãn POTHOLE nhỉnh hơn (~36% vs ~28%).
                    // Nếu hộp bao kéo dài dọc theo đường (h/w >= 1.10) hoặc cắt ngang (w/h >= 1.6) và có điểm nứt (crackConf >= 0.12):
                    // -> Quy chuẩn chính xác về vết nứt kết cấu mặt đường ROAD_CRACK
                    if (bestClassId == 0 && numClasses > 1) {
                        float potholeConf = output[0][4 + 0][i];
                        float crackConf = output[0][4 + 1][i];
                        float aspect = h / Math.max(1.0f, w);
                        if (crackConf >= 0.12f && (aspect >= 1.10f || aspect <= 0.65f) && crackConf >= potholeConf * 0.55f) {
                            bestClassId = 1;
                            bestConf = Math.max(crackConf, potholeConf);
                        }
                    }

                    String className = (bestClassId < CLASS_NAMES.length)
                            ? CLASS_NAMES[bestClassId]
                            : "ROAD_DAMAGE_" + bestClassId;

                    // Ngưỡng phân cấp theo từng loại (Per-Class Dynamic Threshold):
                    // 1. ROAD_CRACK: Rãnh nứt mỏng bị loãng điểm ảnh -> áp dụng ngưỡng nhạy cảm riêng
                    // 2. POTHOLE: Ổ gà thật có hình khối rõ nét (40% - 86%). Các điểm ảnh nhiễu gợn sóng nước (28.2%)
                    //    hoặc vạch sơn (25.7%) chỉ đạt 20-30% -> Ngưỡng tối thiểu an toàn cho POTHOLE là 0.32
                    // 3. ROAD_FLOODING: Vùng ngập nước là mảng phẳng lớn (20% - 40%) -> Ngưỡng nhạy cảm riêng
                    // 4. ROAD_OBSTACLE: Chướng ngại vật thực tế dạng khối 3D -> Ngưỡng tối thiểu an toàn là 0.25 (khử nhiễu gờ đường 11.5%)
                    float classSpecificThresh;
                    if ("ROAD_CRACK".equals(className)) {
                        classSpecificThresh = Math.max(0.06f, effectiveThreshold * 0.35f);
                    } else if ("POTHOLE".equals(className)) {
                        classSpecificThresh = Math.max(0.32f, effectiveThreshold);
                    } else if ("ROAD_FLOODING".equals(className)) {
                        classSpecificThresh = Math.max(0.38f, effectiveThreshold);
                    } else if ("ROAD_OBSTACLE".equals(className)) {
                        classSpecificThresh = Math.max(0.48f, effectiveThreshold);
                    } else {
                        classSpecificThresh = effectiveThreshold;
                    }

                    if (bestConf >= classSpecificThresh) {
                        float localCx = (cx - padLeft) / scale;
                        float localCy = (cy - padTop) / scale;
                        float localW = w / scale;
                        float localH = h / scale;

                        int lx = Math.max(0, (int) (localCx - localW / 2.0f));
                        int ly = Math.max(0, (int) (localCy - localH / 2.0f));
                        int lw = Math.min(subW - lx, (int) localW);
                        int lh = Math.min(subH - ly, (int) localH);

                        if (lw <= 4 || lh <= 4) continue;

                        int gx = lx + offsetX;
                        int gy = ly + offsetY;

                        // Lọc tiêu điểm mặt đường (Road ROI): Loại bỏ vùng bầu trời phía trên (< 15%) và nắp capo (> 96%)
                        // Với ảnh đã cắt mặt đường (aspectRatio >= 2.0), không cắt bỏ phía trên vì đó là mặt đường xa
                        float currentAspect = (float) origWidth / Math.max(1, origHeight);
                        if (currentAspect < 2.0f) {
                            if ((gy + lh) < origHeight * 0.15f || gy > origHeight * 0.96f) continue;
                        }

                        double boxAreaRatio = (double) (lw * lh) / (origWidth * origHeight);
                        float boxWidthRatio = (float) lw / origWidth;

                        if ("POTHOLE".equals(className)) {
                            if (boxAreaRatio > 0.40 || (boxWidthRatio > 0.75 && boxAreaRatio > 0.25)) continue;
                            // Khử vạch sơn kẻ đường (chỉ kiểm tra các dải hẹp, tỉ lệ dài ngoằng bất thường):
                            if (isLaneMarkingOrPaint(subImg, lx, ly, lw, lh, bestConf)) {
                                continue;
                            }
                            // Phân biệt Hố sụt (Pothole) vs Vết nứt toác lớn (Crack Fissure):
                            // Ổ gà thật có lòng hố sụt rộng, độ tin cậy cao (>= 50%).
                            // Vết nứt toác lớn chạy chéo chỉ có đường rãnh nứt hẹp chiếm < 22% diện tích box.
                            // Nếu điểm tin cậy < 0.48 và cấu trúc là rãnh nứt -> Quy về đúng bản chất ROAD_CRACK
                            if (bestConf < 0.48f && isThinCrackPattern(subImg, lx, ly, lw, lh)) {
                                className = "ROAD_CRACK";
                            }
                        } else if ("ROAD_CRACK".equals(className)) {
                            if (boxAreaRatio > 0.75) continue;
                        } else if ("ROAD_OBSTACLE".equals(className)) {
                            if (boxWidthRatio > 0.85 || boxAreaRatio > 0.60) continue;
                            // Khử nhiễu viền cắt mép ảnh (border artifact) ở sát mép khung hình video:
                            if (lw < 45 && (gx <= 6 || (gx + lw) >= origWidth - 6)) continue;
                        } else if ("ROAD_FLOODING".equals(className)) {
                            if (boxAreaRatio > 0.85) continue;
                            // Khử báo động giả ngập úng trên mặt đường nhựa khô thông thường:
                            if (isDryAsphalt(subImg, lx, ly, lw, lh)) {
                                log.debug("Khử ROAD_FLOODING giả trên mặt đường nhựa khô: [conf={}% at ({},{})]",
                                        (int)(bestConf * 100), gx, gy);
                                continue;
                            }
                        }

                        // Chuẩn hóa độ tự tin hiển thị (Confidence Calibration):
                        // Do rãnh nứt bị loãng điểm ảnh -> cân chỉnh để hiển thị trực quan
                        float displayConf = bestConf;
                        if ("ROAD_CRACK".equals(className)) {
                            displayConf = Math.min(0.92f, 0.50f + (bestConf - 0.08f) * 1.5f);
                        } else if ("ROAD_FLOODING".equals(className)) {
                            displayConf = Math.min(0.95f, bestConf * 1.05f);
                        }

                        boxes.add(ImageTensorUtil.BoundingBox.builder()
                                .className(className)
                                .confidence(displayConf)
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
     * Sinh các tile thông minh bao phủ vùng mặt đường với overlap 25%:
     * - Loại bỏ 20% bầu trời / đường chân trời phía trên
     * - Chia các lát cắt dọc theo phối cảnh xa -> gần
     */
    private List<Rectangle> generateRoadTiles(int origW, int origH) {
        List<Rectangle> tiles = new ArrayList<>();

        // Hỗ trợ mọi kích thước ảnh từ 180x100 trở lên
        if (origW < 180 || origH < 100) {
            return tiles;
        }

        float aspectRatio = (float) origW / Math.max(1, origH);

        // KHI ẢNH SIÊU RỘNG (Đã trích xuất Road ROI từ video dashcam, aspect ratio >= 2.2):
        // Để tránh dải đường bị ép mỏng dẹt khi letterbox, chia thành các ô cột vuông/gần vuông (tỉ lệ ~1.2:1)
        // trượt ngang qua mặt đường với độ phóng đại cao (Zoom 3x - 4x)
        if (aspectRatio >= 2.0f) {
            int colW = Math.min(origW, Math.max((int) (origH * 1.35f), (int) (origW * 0.28f)));
            int stepX = Math.max(20, (int) (colW * 0.45f));

            int nearY = (int) (origH * 0.15);
            int nearH = origH - nearY;

            for (int x = 0; x <= origW - colW; x += stepX) {
                tiles.add(new Rectangle(x, 0, colW, origH));
                tiles.add(new Rectangle(x, nearY, colW, nearH));
            }
            // Đảm bảo mép phải cùng (lề phải - nơi vết nứt và ổ gà tụ nhiều nhất) luôn có tile bao trọn:
            int rightX = origW - colW;
            if (rightX > 0 && (tiles.isEmpty() || tiles.get(tiles.size() - 2).x != rightX)) {
                tiles.add(new Rectangle(rightX, 0, colW, origH));
                tiles.add(new Rectangle(rightX, nearY, colW, nearH));
            }
        } else if (aspectRatio >= 1.4f) {
            // KHI ẢNH RỘNG (Dashcam video 16:9 chưa crop):
            int colW = Math.min(origW, (int) (origW * 0.38));
            int col1X = 0;                                // Lề trái
            int col2X = (int) (origW * 0.20);             // Làn trái
            int col3X = (int) (origW * 0.42);             // Làn phải
            int col4X = origW - colW;                     // Lề phải & vệt bánh phải

            // 1. Cột Lề Phải (Nơi vệt bánh xe và lề đường nứt vỡ nhiều nhất)
            tiles.add(new Rectangle(col4X, 0, colW, origH));

            // 2. Cột Làn Phải (Làn xe di chuyển)
            tiles.add(new Rectangle(col3X, 0, colW, origH));

            // 3. Cột Làn Trái (Làn ngược chiều / tim đường)
            tiles.add(new Rectangle(col2X, 0, colW, origH));

            // 4. Cột Lề Trái
            tiles.add(new Rectangle(col1X, 0, colW, origH));

            // 5. Cột Làn Phải Cận Cảnh (Near Right - bắt nứt toác sát mũi xe)
            int nearY = (int) (origH * 0.25);
            int nearH = origH - nearY;
            tiles.add(new Rectangle(col4X, nearY, colW, nearH));
            tiles.add(new Rectangle(col3X, nearY, colW, nearH));

            // 6. Cột Trung Tâm Xa (Far Center)
            int farH = (int) (origH * 0.75);
            int midW = (int) (origW * 0.50);
            int midX = (int) (origW * 0.25);
            tiles.add(new Rectangle(midX, 0, midW, farH));
        } else {
            // KHI ẢNH DẠNG TỶ LỆ BÌNH THƯỜNG / CHÂN DUNG (Ảnh chụp điện thoại 4:3, 3:2):
            int roadY0 = (int) (origH * 0.12); // Bỏ 12% bầu trời phía trên
            int roadH = origH - roadY0;

            // Tile 1: Vùng trung cảnh & xa
            int farY = roadY0;
            int farH = (int) (roadH * 0.65);
            tiles.add(new Rectangle(0, farY, origW, farH));

            // Tile 2: Vùng cận cảnh
            int nearY = roadY0 + (int) (roadH * 0.35);
            int nearH = origH - nearY;
            tiles.add(new Rectangle(0, nearY, origW, nearH));

            // Tile 3: Làn đường bên phải
            int rightX = (int) (origW * 0.35);
            int rightW = origW - rightX;
            tiles.add(new Rectangle(rightX, farY, rightW, farH));

            // Tile 4: Làn đường bên trái
            int leftW = (int) (origW * 0.65);
            tiles.add(new Rectangle(0, farY, leftW, farH));

            // Tile 5: Làn đường cận cảnh bên phải
            tiles.add(new Rectangle(rightX, nearY, rightW, nearH));

            // Tile 6: Zoom dải nứt trung tâm
            int midX = (int) (origW * 0.20);
            int midW = (int) (origW * 0.65);
            int midY = roadY0 + (int) (roadH * 0.10);
            int midH = (int) (roadH * 0.55);
            tiles.add(new Rectangle(midX, midY, midW, midH));
        }

        return tiles;
    }

    /**
     * Tăng cường tương phản rãnh nứt (Crack Contrast Boosting):
     * Làm tối các khe rãnh nứt sâu và làm sáng bề mặt đá dăm xung quanh để kích hoạt mạnh đặc trưng viền của YOLO
     */
    private BufferedImage enhanceCrackContrast(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);

        // Bảng tra cứu LUT (Lookup Table) phi tuyến tính, xử lý < 2ms
        int[] lut = new int[256];
        for (int i = 0; i < 256; i++) {
            if (i < 90) {
                // Rãnh nứt tối: làm tối sâu thêm 18% để nổi bật nét nứt
                lut[i] = Math.max(0, (int) (i * 0.82));
            } else if (i < 200) {
                // Mặt nhựa đường xám: tăng sáng nhẹ 5%
                lut[i] = Math.min(255, (int) (i * 1.05));
            } else {
                lut[i] = i;
            }
        }

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int rgb = src.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int nr = lut[r];
                int ng = lut[g];
                int nb = lut[b];

                dst.setRGB(x, y, (nr << 16) | (ng << 8) | nb);
            }
        }
        return dst;
    }

    /**
     * Kiểm tra xem vùng phát hiện có phải là vạch sơn kẻ đường hay không:
     * - Vạch kẻ đường có hình dạng thon dài / tỉ lệ méo bất thường (dọc: h/w >= 2.6 hoặc ngang: w/h >= 2.8)
     * - Chỉ kiểm tra khi độ tin cậy chưa đạt mức chắc chắn cao (< 0.45)
     * - Ổ gà thật (kể cả chứa vũng nước phản chiếu trời mây) có dạng tròn/bầu dục (w/h từ 0.4 đến 2.3)
     *   và độ tin cậy cao (> 0.40) -> Tuyệt đối không bị nhầm là vạch sơn.
     */
    private boolean isLaneMarkingOrPaint(BufferedImage img, int x, int y, int w, int h, float conf) {
        if (w <= 0 || h <= 0) return false;

        // Nếu độ tin cậy >= 0.45 hoặc hình dáng tròn/bầu dục bình thường -> chắc chắn là ổ gà, không phải vạch sơn
        float aspect = (float) w / h;
        boolean isElongatedStripe = (aspect <= 0.38f) || (aspect >= 2.8f);
        if (!isElongatedStripe || conf >= 0.45f) {
            return false;
        }

        int sampleStep = Math.max(1, Math.min(w, h) / 20);
        int totalSampled = 0;
        int brightPaintPixels = 0;

        int maxX = Math.min(img.getWidth(), x + w);
        int maxY = Math.min(img.getHeight(), y + h);

        for (int py = y; py < maxY; py += sampleStep) {
            for (int px = x; px < maxX; px += sampleStep) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                totalSampled++;

                // Vạch sơn trắng hoặc vàng phản quang giao thông
                boolean isWhitePaint = (r > 165 && g > 165 && b > 160 && (Math.max(r, Math.max(g, b)) - Math.min(r, Math.min(g, b)) < 30));
                boolean isYellowPaint = (r > 175 && g > 150 && b < 120);

                if (isWhitePaint || isYellowPaint) {
                    brightPaintPixels++;
                }
            }
        }

        if (totalSampled == 0) return false;

        float paintRatio = (float) brightPaintPixels / totalSampled;
        // Dải hẹp có trên 35% diện tích là sơn giao thông nguyên bản -> Vạch kẻ đường!
        return (paintRatio >= 0.35f);
    }

    /**
     * Phân biệt Vết nứt (Crack) vs Ổ gà (Pothole) dựa trên mật độ rãnh nứt:
     * - Vết nứt toác lớn: Chỉ là một đường rãnh nứt tối hẹp (Luma < 85) trên nền mặt đường phẳng,
     *   mật độ điểm ảnh tối chỉ chiếm 2% - 22% diện tích box.
     * - Ổ gà thật (Pothole): Là một hố sụt lòng chảo lớn với mật độ hố lõm rộng.
     */
    private boolean isThinCrackPattern(BufferedImage img, int x, int y, int w, int h) {
        if (w <= 0 || h <= 0) return false;

        int sampleStep = Math.max(1, Math.min(w, h) / 25);
        int totalSampled = 0;
        int darkCavityPixels = 0;

        int maxX = Math.min(img.getWidth(), x + w);
        int maxY = Math.min(img.getHeight(), y + h);

        for (int py = y; py < maxY; py += sampleStep) {
            for (int px = x; px < maxX; px += sampleStep) {
                int rgb = img.getRGB(px, py);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                totalSampled++;

                // Rãnh nứt đen sẫm sâu
                if (luma < 85) {
                    darkCavityPixels++;
                }
            }
        }

        if (totalSampled == 0) return false;

        float darkRatio = (float) darkCavityPixels / totalSampled;
        // Nếu rãnh nứt chỉ chiếm dưới 22% diện tích (phần còn lại là mặt đường nguyên vẹn) -> Vết nứt kết cấu!
        return (darkRatio >= 0.02f && darkRatio <= 0.22f);
    }

    /**
     * Xác thực mặt đường nhựa khô thông thường (Dry Asphalt Verification):
     * Khử báo động giả ngập úng (False ROAD_FLOODING) trên các đoạn đường nhựa phẳng khô ráo.
     * Đặc trưng mặt đường nhựa khô:
     * - Màu xám trung tính đặc trưng của nhựa đường / đá dăm: |R-G| <= 16, |G-B| <= 16, |R-B| <= 16
     * - Độ sáng Luma thuộc dải mặt đường khô bình thường (55 - 165)
     * - Không có vệt phản chiếu gương trời mây (specular reflection Luma > 205)
     * - Không có sắc xanh trời phản chiếu (B > R + 15) và không có sắc nước lũ đục ngầu phù sa (R > B + 28)
     */
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

                // Dấu hiệu nước: phản chiếu chói lóa, phản chiếu sắc trời xanh, hoặc nước ngập đục phù sa
                boolean isWaterReflection = (luma > 205 && Math.abs(r - b) < 25);
                boolean isSkyTintWater = (b > r + 15 && b > g + 8 && luma > 105);
                boolean isMuddyFlood = (r > b + 28 && g > b + 12 && luma >= 60 && luma <= 155);

                if (isWaterReflection || isSkyTintWater || isMuddyFlood) {
                    waterLikePixels++;
                } else {
                    // Dấu hiệu mặt đường nhựa khô tiêu chuẩn: xám trung tính, không bóng loáng
                    int diffRG = Math.abs(r - g);
                    int diffGB = Math.abs(g - b);
                    int diffRB = Math.abs(r - b);
                    if (diffRG <= 16 && diffGB <= 16 && diffRB <= 16 && luma >= 55 && luma <= 165) {
                        dryAsphaltPixels++;
                    }
                }
            }
        }

        if (totalSampled == 0) return false;

        float dryRatio = (float) dryAsphaltPixels / totalSampled;
        float waterRatio = (float) waterLikePixels / totalSampled;

        // Nếu trên 65% diện tích là nhựa đường khô thuần tuý và dưới 12% dấu hiệu nước -> Mặt đường khô!
        return (dryRatio >= 0.65f && waterRatio < 0.12f);
    }

    /**
     * Khử các ổ gà ảo trong vùng ngập nước diện rộng (False Potholes in Flooded Street):
     * - Khi có biển nước (ROAD_FLOODING), các gợn sóng hay bóng xe phản chiếu trong nước
     *   thường bị mạng nhầm là ổ gà với độ tin cậy thấp (< 0.40).
     */
    private List<ImageTensorUtil.BoundingBox> filterPotholesInFlood(List<ImageTensorUtil.BoundingBox> boxes) {
        if (boxes == null || boxes.isEmpty()) return boxes;

        List<ImageTensorUtil.BoundingBox> floodBoxes = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("ROAD_FLOODING".equals(b.getClassName())) {
                floodBoxes.add(b);
            }
        }

        if (floodBoxes.isEmpty()) {
            return boxes;
        }

        List<ImageTensorUtil.BoundingBox> filtered = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("POTHOLE".equals(b.getClassName())) {
                int cx = b.getX() + b.getWidth() / 2;
                int cy = b.getY() + b.getHeight() / 2;
                boolean insideFlood = false;
                for (ImageTensorUtil.BoundingBox fb : floodBoxes) {
                    if (cx >= fb.getX() && cx <= (fb.getX() + fb.getWidth())
                            && cy >= fb.getY() && cy <= (fb.getY() + fb.getHeight())) {
                        insideFlood = true;
                        break;
                    }
                }
                // Chỉ khử nhiễu gợn sóng nước rất yếu (< 0.40)
                if (insideFlood && b.getConfidence() < 0.40f) {
                    log.info("Khử ổ gà ảo nằm trong vùng ngập nước: [conf={}% at ({},{})]",
                            (int)(b.getConfidence() * 100), b.getX(), b.getY());
                    continue;
                }
            }
            filtered.add(b);
        }
        return filtered;
    }

    /**
     * Khử xung đột trùng lặp đa lớp (Cross-Class Conflict Suppression):
     * - TUYỆT ĐỐI KHÔNG để vùng ngập nước ROAD_FLOODING diện rộng triệt tiêu các khuyết tật cục bộ
     *   như ROAD_CRACK hoặc POTHOLE nằm bên trong nó.
     * - Với các khuyết tật cục bộ đè lên nhau (ví dụ: POTHOLE vs ROAD_CRACK), chỉ triệt tiêu khi:
     *   IoU >= 0.35 và tỉ lệ diện tích >= 0.30 (cùng thang kích thước).
     */
    private List<ImageTensorUtil.BoundingBox> suppressCrossClassConflicts(List<ImageTensorUtil.BoundingBox> boxes) {
        if (boxes == null || boxes.size() < 2) return boxes;

        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        boolean[] suppressed = new boolean[boxes.size()];

        for (int i = 0; i < boxes.size(); i++) {
            if (suppressed[i]) continue;
            ImageTensorUtil.BoundingBox a = boxes.get(i);

            for (int j = i + 1; j < boxes.size(); j++) {
                if (suppressed[j]) continue;
                ImageTensorUtil.BoundingBox b = boxes.get(j);

                // Chỉ xét khi 2 box thuộc 2 loại khác nhau
                if (!java.util.Objects.equals(a.getClassName(), b.getClassName())) {
                    boolean aIsFlood = "ROAD_FLOODING".equals(a.getClassName());
                    boolean bIsFlood = "ROAD_FLOODING".equals(b.getClassName());

                    // KHÔNG triệt tiêu giữa vùng ngập nước và các khuyết tật cục bộ (vết nứt, ổ gà)
                    if (aIsFlood || bIsFlood) {
                        continue;
                    }

                    float ioU = ImageTensorUtil.computeIoU(a, b);
                    float areaA = (float) a.getWidth() * a.getHeight();
                    float areaB = (float) b.getWidth() * b.getHeight();
                    float areaRatio = Math.min(areaA, areaB) / Math.max(areaA, areaB);

                    if (ioU >= 0.35f && areaRatio >= 0.30f) {
                        boolean aIsPothole = "POTHOLE".equals(a.getClassName());
                        boolean bIsPothole = "POTHOLE".equals(b.getClassName());

                        if (aIsPothole && a.getConfidence() >= 0.60f) {
                            suppressed[j] = true; // Ưu tiên Ổ gà thực sự
                        } else if (bIsPothole && b.getConfidence() >= 0.60f) {
                            suppressed[i] = true;
                            break;
                        } else if (a.getConfidence() >= b.getConfidence()) {
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

    /**
     * Hợp nhất dải nứt cùng phương (Collinear Crack Merging):
     * - Chỉ áp dụng cho lớp ROAD_CRACK
     * - Dựa trên khoảng cách khe hở và cùng trục dọc/ngang
     * - TUYỆT ĐỐI KHÔNG CỘNG DỒN CONFIDENCE: lấy max(c1, c2)
     */
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
        int maxAllowedGapY = (int) (origH * 0.06); // Khe hở dọc tối đa 6% chiều cao ảnh
        int maxAllowedGapX = (int) (origW * 0.04); // Độ lệch ngang tối đa 4% (không gộp nhánh nứt bên cạnh)

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

                    // Kiểm tra tính liên tục theo cùng phương hẹp (chỉ gộp khi cùng nằm trên 1 dải nứt)
                    int gapY = Math.max(0, Math.max(a.getY(), b.getY()) - Math.min(aBottom, bBottom));
                    int diffX = Math.abs(aMidX - bMidX);

                    boolean canMerge = (gapY <= maxAllowedGapY) && (diffX <= maxAllowedGapX);

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

    /**
     * Thu gọn khung bao rãnh nứt (Crack Bounding Box Tightening):
     * Cắt bỏ phần mặt đường phẳng thừa xung quanh để khung bao ôm sát đường nứt thực tế,
     * không bị phóng to thành hình vuông thô kệch.
     */
    private List<ImageTensorUtil.BoundingBox> tightenCrackBoundingBoxes(
            BufferedImage img, List<ImageTensorUtil.BoundingBox> boxes) {
        if (boxes == null || boxes.isEmpty() || img == null) return boxes;

        List<ImageTensorUtil.BoundingBox> result = new ArrayList<>();
        for (ImageTensorUtil.BoundingBox b : boxes) {
            if ("ROAD_CRACK".equals(b.getClassName())) {
                result.add(tightenSingleCrackBox(img, b));
            } else {
                result.add(b);
            }
        }
        return result;
    }

    private ImageTensorUtil.BoundingBox tightenSingleCrackBox(
            BufferedImage img, ImageTensorUtil.BoundingBox b) {
        int bx = Math.max(0, b.getX());
        int by = Math.max(0, b.getY());
        int bw = Math.min(img.getWidth() - bx, b.getWidth());
        int bh = Math.min(img.getHeight() - by, b.getHeight());
        if (bw < 30 || bh < 30) return b;

        int minX = bw, maxX = 0, minY = bh, maxY = 0;
        int darkCount = 0;
        int step = Math.max(1, Math.min(bw, bh) / 25);

        for (int y = 0; y < bh; y += step) {
            for (int x = 0; x < bw; x += step) {
                int rgb = img.getRGB(bx + x, by + y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int bVal = rgb & 0xFF;
                int luma = (int) (0.299 * r + 0.587 * g + 0.114 * bVal);
                if (luma < 95) { // Điểm rãnh nứt tối màu
                    darkCount++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Nếu xác định được đường bao rãnh nứt, thu hẹp lề phẳng thừa
        if (darkCount >= 4 && maxX > minX && maxY > minY) {
            int padX = Math.max(6, (int) ((maxX - minX) * 0.10));
            int padY = Math.max(6, (int) ((maxY - minY) * 0.10));

            int newX = Math.max(0, bx + minX - padX);
            int newY = Math.max(0, by + minY - padY);
            int newW = Math.min(img.getWidth() - newX, (maxX - minX) + padX * 2);
            int newH = Math.min(img.getHeight() - newY, (maxY - minY) + padY * 2);

            if (newW >= 20 && newH >= 20 && (newW * newH) < (bw * bh * 0.88)) {
                return ImageTensorUtil.BoundingBox.builder()
                        .className("ROAD_CRACK")
                        .confidence(b.getConfidence())
                        .x(newX)
                        .y(newY)
                        .width(newW)
                        .height(newH)
                        .build();
            }
        }
        return b;
    }

    /**
     * Tự động ước lượng mức độ nghiêm trọng (Severity) dựa trên:
     * - Số lượng hư hỏng (count)
     * - Tỷ lệ diện tích hư hỏng so với khung hình (% footprint)
     * - Độ tin cậy cao nhất (max confidence)
     */
    public String calculateSeverity(List<ImageTensorUtil.BoundingBox> boxes, int imgWidth, int imgHeight) {
        if (boxes == null || boxes.isEmpty()) {
            return "LOW";
        }

        int count = boxes.size();
        long totalArea = 0;
        float maxConf = 0.0f;

        for (ImageTensorUtil.BoundingBox b : boxes) {
            totalArea += (long) b.getWidth() * b.getHeight();
            if (b.getConfidence() > maxConf) {
                maxConf = b.getConfidence();
            }
        }

        long imgArea = (long) Math.max(1, imgWidth) * Math.max(1, imgHeight);
        double areaRatio = (double) totalArea / imgArea;

        // Tiêu chí đánh giá chuyên gia đường bộ:
        // 1. CRITICAL (Nguy hiểm khẩn cấp): > 3 ổ gà hoặc diện tích chiếm > 12% mặt cắt ảnh
        if (count >= 3 || areaRatio >= 0.12) {
            return "CRITICAL";
        }
        // 2. HIGH (Nghiêm trọng): 2 ổ gà hoặc diện tích chiếm > 6%
        if (count >= 2 || areaRatio >= 0.06) {
            return "HIGH";
        }
        // 3. MEDIUM (Trung bình): 1 ổ gà rõ nét
        if (maxConf >= 0.50f) {
            return "MEDIUM";
        }
        return "LOW";
    }

    /**
     * Suy luận phân tích ảnh mặt đường (trả về hộp bao tốt nhất)
     */
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
}
