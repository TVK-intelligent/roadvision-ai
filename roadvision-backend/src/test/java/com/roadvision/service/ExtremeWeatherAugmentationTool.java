package com.roadvision.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RadialGradientPaint;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Công cụ tăng cường dữ liệu điều kiện thời tiết cực đoan & ban đêm (Extreme Weather & Night Augmentation)
 * Giúp mô hình YOLO nhận diện bền bỉ dưới trời tối, đèn pha lóa, và mưa bão bám kính camera.
 */
public class ExtremeWeatherAugmentationTool {

    private static final String WORKFLOW_DIR = "E:/DATN/workflow/ai_training/";

    @Test
    public void generateExtremeWeatherSamples() throws Exception {
        System.out.println("==================================================================");
        System.out.println("   KÍCH HOẠT DATA AUGMENTATION: BAN ĐÊM & THỜI TIẾT CỰC ĐOAN     ");
        System.out.println("==================================================================");

        List<TargetSample> targets = List.of(
            new TargetSample("custom_vietnam_potholes", "pot_chuoi_4_o_ga_nuoc_duc_01"),
            new TargetSample("custom_vietnam_cracks", "crack_sut_lun_dut_gay_dia_chat_01"),
            new TargetSample("custom_vietnam_obstacles", "obs_coc_tieu_starbucks_01"),
            new TargetSample("custom_vietnam_obstacles", "obs_sot_nhua_thung_xop_lan_chiem_01"),
            new TargetSample("custom_vietnam_obstacles", "obs_lop_xe_canh_bao_o_ga_01"),
            new TargetSample("custom_vietnam_obstacles", "obs_da_tang_sat_lo_deo_doc_01"),
            new TargetSample("custom_vietnam_tree_fallen", "tree_do_de_xe_o_to_mua_bao_01")
        );

        int totalGenerated = 0;

        for (TargetSample t : targets) {
            File imgDir = new File(WORKFLOW_DIR + t.folder + "/images");
            File lblDir = new File(WORKFLOW_DIR + t.folder + "/labels");

            File baseImg = findImage(imgDir, t.baseName);
            File baseLbl = new File(lblDir, t.baseName + ".txt");

            if (baseImg == null || !baseLbl.exists()) {
                System.err.println("❌ Không tìm thấy mẫu gốc: " + t.baseName);
                continue;
            }

            BufferedImage srcRaw = ImageIO.read(baseImg);
            if (srcRaw == null) continue;
            BufferedImage src = toRgb(srcRaw);
            List<YoloBox> boxes = loadBoxes(baseLbl);

            System.out.println("-> Tạo 4 biến thể ban đêm & mưa lóa cho: " + t.baseName);

            // 1. _aug_night (Ban đêm đèn đường vàng natri)
            saveSample(imgDir, lblDir, t.baseName + "_aug_night", applyNightLighting(src), boxes);
            // 2. _aug_glare (Đèn pha xe đối diện chiếu lóa)
            saveSample(imgDir, lblDir, t.baseName + "_aug_glare", applyHeadlightGlare(src), boxes);
            // 3. _aug_rain_lens (Mưa bão, giọt nước bám kính camera)
            saveSample(imgDir, lblDir, t.baseName + "_aug_rain_lens", applyRainOnLens(src), boxes);
            // 4. _aug_night_rain (Mưa đêm bão gió)
            saveSample(imgDir, lblDir, t.baseName + "_aug_night_rain", applyRainOnLens(applyNightLighting(src)), boxes);

            totalGenerated += 4;
        }

        System.out.println("==================================================================");
        System.out.println("   HOÀN THÀNH: ĐÃ TẠO " + totalGenerated + " MẪU BAN ĐÊM & THỜI TIẾT CỰC ĐOAN CHUẨN XÁC!");
        System.out.println("==================================================================");
    }

    private BufferedImage applyNightLighting(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int rgb = src.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                // Ánh sáng ban đêm: giảm sáng xuống ~35%, giữ ánh vàng đèn cao áp natri
                float nr = r * 0.45f;
                float ng = g * 0.38f;
                float nb = b * 0.28f;

                int ir = Math.min(255, Math.max(0, Math.round(nr)));
                int ig = Math.min(255, Math.max(0, Math.round(ng)));
                int ib = Math.min(255, Math.max(0, Math.round(nb)));

                out.setRGB(x, y, (ir << 16) | (ig << 8) | ib);
            }
        }
        return out;
    }

    private BufferedImage applyHeadlightGlare(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Giả lập chùm đèn pha xe ngược chiều ở góc trên/giữa
        int cx = (int) (w * 0.35f);
        int cy = (int) (h * 0.40f);
        float radius = Math.max(80f, w * 0.28f);

        Color centerColor = new Color(255, 255, 230, 210);
        Color midColor = new Color(255, 240, 180, 110);
        Color edgeColor = new Color(255, 220, 150, 0);

        RadialGradientPaint rgp = new RadialGradientPaint(
            cx, cy, radius,
            new float[]{0.0f, 0.45f, 1.0f},
            new Color[]{centerColor, midColor, edgeColor}
        );
        g.setPaint(rgp);
        g.fillOval((int) (cx - radius), (int) (cy - radius), (int) (radius * 2), (int) (radius * 2));

        g.dispose();
        return out;
    }

    private BufferedImage applyRainOnLens(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Vệt mưa nghiêng trên kính
        g.setColor(new Color(230, 240, 255, 45));
        g.setStroke(new BasicStroke(1.5f));
        for (int i = 0; i < 90; i++) {
            int rx = (i * 37) % w;
            int ry = (i * 53) % h;
            g.drawLine(rx, ry, rx - 18, ry + 36);
        }

        // Giọt nước đọng trên ống kính
        for (int i = 0; i < 35; i++) {
            int dx = (i * 71) % (w - 30) + 15;
            int dy = (i * 89) % (h - 30) + 15;
            int dw = 10 + (i % 8) * 3;
            int dh = dw + (i % 5) * 2;

            g.setColor(new Color(180, 210, 240, 70));
            g.fillOval(dx, dy, dw, dh);
            g.setColor(new Color(255, 255, 255, 140));
            g.drawOval(dx, dy, dw, dh);
            g.fillOval(dx + 2, dy + 2, dw / 3, dh / 3);
        }

        g.dispose();
        return out;
    }

    private void saveSample(File imgDir, File lblDir, String outName, BufferedImage img, List<YoloBox> boxes) throws IOException {
        ImageIO.write(img, "jpg", new File(imgDir, outName + ".jpg"));

        StringBuilder sb = new StringBuilder();
        for (YoloBox b : boxes) {
            sb.append(String.format(Locale.US, "%d %.6f %.6f %.6f %.6f\n", b.classId, b.x, b.y, b.w, b.h));
        }
        Files.writeString(new File(lblDir, outName + ".txt").toPath(), sb.toString(), StandardCharsets.UTF_8);
    }

    private BufferedImage toRgb(BufferedImage src) {
        BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return rgb;
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

    private File findImage(File dir, String baseName) {
        String[] exts = {".jpg", ".jpeg", ".png", ".webp", ".JPG"};
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
