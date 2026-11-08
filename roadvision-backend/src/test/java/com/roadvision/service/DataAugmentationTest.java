package com.roadvision.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Tool tạo Data Augmentation bảo toàn chuẩn hình học và độ chính xác nhãn YOLO 100%.
 * Tăng cường các ảnh đối tượng đặc thù Việt Nam để mô hình học sâu không bị lệch đối tượng.
 */
public class DataAugmentationTest {

    private static final String WORKFLOW_DIR = "E:/DATN/workflow/ai_training/";

    @Test
    public void runAugmentationOnCustomVietnamSamples() throws Exception {
        System.out.println("==================================================================");
        System.out.println("   KÍCH HOẠT DATA AUGMENTATION CHUẨN XÁC CHO MẪU ĐỐI TƯỢNG MỚI    ");
        System.out.println("==================================================================");

        List<TargetSample> targets = List.of(
            new TargetSample("custom_vietnam_obstacles", "obs_sot_nhua_thung_xop_lan_chiem_01"),
            new TargetSample("custom_vietnam_obstacles", "obs_lop_xe_canh_bao_o_ga_01"),
            new TargetSample("custom_vietnam_obstacles", "obs_coc_tieu_starbucks_01"),
            new TargetSample("custom_vietnam_cracks", "crack_sut_lun_dut_gay_dia_chat_01"),
            new TargetSample("custom_vietnam_tree_fallen", "tree_do_de_xe_o_to_mua_bao_01"),
            new TargetSample("custom_vietnam_potholes", "pot_chuoi_4_o_ga_nuoc_duc_01")
        );

        int totalGenerated = 0;

        for (TargetSample t : targets) {
            File imgDir = new File(WORKFLOW_DIR + t.folder + "/images");
            File lblDir = new File(WORKFLOW_DIR + t.folder + "/labels");

            File baseImg = findImageFile(imgDir, t.baseName);
            File baseLbl = new File(lblDir, t.baseName + ".txt");

            if (baseImg == null || !baseImg.exists()) {
                System.err.println("❌ Không tìm thấy ảnh gốc: " + t.baseName + " trong " + t.folder);
                continue;
            }
            if (!baseLbl.exists()) {
                System.err.println("❌ Không tìm thấy nhãn gốc: " + baseLbl.getAbsolutePath());
                continue;
            }

            BufferedImage srcRaw = ImageIO.read(baseImg);
            if (srcRaw == null) {
                System.err.println("❌ Không thể đọc ảnh bằng ImageIO: " + baseImg.getName());
                continue;
            }

            // Chuẩn hóa về RGB không Alpha
            BufferedImage src = toRgb(srcRaw);
            List<YoloBox> boxes = loadBoxes(baseLbl);

            System.out.println("\n-> Đang tạo 10 biến thể cho: " + t.baseName + " (" + boxes.size() + " bounding boxes)");

            // 1. _aug_flip
            saveAugment(imgDir, lblDir, t.baseName + "_aug_flip", flipHorizontal(src), flipBoxes(boxes));
            // 2. _aug_sun
            saveAugment(imgDir, lblDir, t.baseName + "_aug_sun", adjustColor(src, 1.18f, 1.08f, 0.92f, 1.05f), boxes);
            // 3. _aug_dusk
            saveAugment(imgDir, lblDir, t.baseName + "_aug_dusk", adjustColor(src, 0.88f, 0.74f, 0.62f, 0.90f), boxes);
            // 4. _aug_wet
            saveAugment(imgDir, lblDir, t.baseName + "_aug_wet", adjustColor(src, 0.80f, 0.90f, 1.10f, 1.15f), boxes);
            // 5. _aug_contrast
            saveAugment(imgDir, lblDir, t.baseName + "_aug_contrast", adjustContrast(src, 1.35f), boxes);
            // 6. _aug_gamma
            saveAugment(imgDir, lblDir, t.baseName + "_aug_gamma", adjustGamma(src, 1.30f), boxes);
            // 7. _aug_blur
            saveAugment(imgDir, lblDir, t.baseName + "_aug_blur", applyBlur(src), boxes);
            // 8. _aug_flip_sun
            saveAugment(imgDir, lblDir, t.baseName + "_aug_flip_sun", adjustColor(flipHorizontal(src), 1.18f, 1.08f, 0.92f, 1.05f), flipBoxes(boxes));
            // 9. _aug_flip_dusk
            saveAugment(imgDir, lblDir, t.baseName + "_aug_flip_dusk", adjustColor(flipHorizontal(src), 0.88f, 0.74f, 0.62f, 0.90f), flipBoxes(boxes));
            // 10. _aug_flip_wet
            saveAugment(imgDir, lblDir, t.baseName + "_aug_flip_wet", adjustColor(flipHorizontal(src), 0.80f, 0.90f, 1.10f, 1.15f), flipBoxes(boxes));

            totalGenerated += 10;
        }

        System.out.println("\n==================================================================");
        System.out.println("   HOÀN THÀNH: ĐÃ TẠO " + totalGenerated + " MẪU HUẤN LUYỆN TĂNG CƯỜNG CHUẨN XÁC!   ");
        System.out.println("==================================================================");
    }

    private void saveAugment(File imgDir, File lblDir, String outName, BufferedImage img, List<YoloBox> boxes) throws IOException {
        File outImg = new File(imgDir, outName + ".jpg");
        File outLbl = new File(lblDir, outName + ".txt");

        ImageIO.write(img, "jpg", outImg);

        StringBuilder sb = new StringBuilder();
        for (YoloBox b : boxes) {
            sb.append(String.format(Locale.US, "%d %.6f %.6f %.6f %.6f\n", b.classId, b.x, b.y, b.w, b.h));
        }
        Files.writeString(outLbl.toPath(), sb.toString(), StandardCharsets.UTF_8);
    }

    private BufferedImage toRgb(BufferedImage src) {
        BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private BufferedImage flipHorizontal(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage flipped = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = flipped.createGraphics();
        g.drawImage(src, 0, 0, w, h, w, 0, 0, h, null);
        g.dispose();
        return flipped;
    }

    private List<YoloBox> flipBoxes(List<YoloBox> boxes) {
        List<YoloBox> res = new ArrayList<>();
        for (YoloBox b : boxes) {
            float newX = Math.max(0.001f, Math.min(0.999f, 1.0f - b.x));
            res.add(new YoloBox(b.classId, newX, b.y, b.w, b.h));
        }
        return res;
    }

    private BufferedImage adjustColor(BufferedImage src, float rScale, float gScale, float bScale, float contrast) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int rgb = src.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                // Color tint
                float rf = r * rScale;
                float gf = g * gScale;
                float bf = b * bScale;

                // Contrast
                rf = ((rf - 128f) * contrast) + 128f;
                gf = ((gf - 128f) * contrast) + 128f;
                bf = ((bf - 128f) * contrast) + 128f;

                int nr = Math.min(255, Math.max(0, Math.round(rf)));
                int ng = Math.min(255, Math.max(0, Math.round(gf)));
                int nb = Math.min(255, Math.max(0, Math.round(bf)));

                out.setRGB(x, y, (nr << 16) | (ng << 8) | nb);
            }
        }
        return out;
    }

    private BufferedImage adjustContrast(BufferedImage src, float factor) {
        return adjustColor(src, 1.0f, 1.0f, 1.0f, factor);
    }

    private BufferedImage adjustGamma(BufferedImage src, float gamma) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int rgb = src.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int nr = Math.min(255, Math.max(0, (int) (Math.pow(r / 255.0, gamma) * 255.0)));
                int ng = Math.min(255, Math.max(0, (int) (Math.pow(g / 255.0, gamma) * 255.0)));
                int nb = Math.min(255, Math.max(0, (int) (Math.pow(b / 255.0, gamma) * 255.0)));

                out.setRGB(x, y, (nr << 16) | (ng << 8) | nb);
            }
        }
        return out;
    }

    private BufferedImage applyBlur(BufferedImage src) {
        float[] matrix = {
            1f / 9f, 1f / 9f, 1f / 9f,
            1f / 9f, 1f / 9f, 1f / 9f,
            1f / 9f, 1f / 9f, 1f / 9f
        };
        ConvolveOp op = new ConvolveOp(new Kernel(3, 3, matrix), ConvolveOp.EDGE_NO_OP, null);
        return op.filter(src, null);
    }

    private List<YoloBox> loadBoxes(File lblFile) throws IOException {
        List<YoloBox> boxes = new ArrayList<>();
        List<String> lines = Files.readAllLines(lblFile.toPath(), StandardCharsets.UTF_8);
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            String[] parts = trimmed.split("\\s+");
            if (parts.length >= 5) {
                int c = Integer.parseInt(parts[0]);
                float x = Float.parseFloat(parts[1]);
                float y = Float.parseFloat(parts[2]);
                float w = Float.parseFloat(parts[3]);
                float h = Float.parseFloat(parts[4]);
                boxes.add(new YoloBox(c, x, y, w, h));
            }
        }
        return boxes;
    }

    private File findImageFile(File dir, String baseName) {
        String[] exts = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".PNG"};
        for (String ext : exts) {
            File f = new File(dir, baseName + ext);
            if (f.exists()) return f;
        }
        return null;
    }

    private static class TargetSample {
        final String folder;
        final String baseName;
        TargetSample(String folder, String baseName) {
            this.folder = folder;
            this.baseName = baseName;
        }
    }

    private static class YoloBox {
        final int classId;
        final float x, y, w, h;
        YoloBox(int classId, float x, float y, float w, float h) {
            this.classId = classId;
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
    }
}
