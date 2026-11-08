package com.roadvision.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
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
 * Công cụ mở rộng và cân bằng dữ liệu vật cản đặc thù Việt Nam (Sọt nhựa, Đá tảng, Cọc tiêu).
 * Đưa mỗi đối tượng từ 5 - 11 ảnh lên mức 40 - 45 ảnh chuẩn nhãn YOLO 100%.
 */
public class ObstacleDatasetExpansionTool {

    private static final String WORKFLOW_DIR = "E:/DATN/workflow/ai_training/";
    private static final String OBS_DIR = WORKFLOW_DIR + "custom_vietnam_obstacles/";

    @Test
    public void expandAndBalanceObstacleDataset() throws Exception {
        System.out.println("==================================================================");
        System.out.println("   KÍCH HOẠT MỞ RỘNG VÀ CÂN BẰNG DỮ LIỆU VẬT CẢN (ROAD_OBSTACLE)   ");
        System.out.println("==================================================================");

        File imgDir = new File(OBS_DIR + "images");
        File lblDir = new File(OBS_DIR + "labels");

        // 1. Sinh các mẫu cơ sở mới có độ chân thực cao kết hợp nền đường thực tế
        List<GeneratedSample> newBaseSamples = generateBaseSamples(imgDir, lblDir);

        // 2. Chạy tăng cường 10 biến thể cho từng mẫu cơ sở mới + các mẫu cũ còn ít
        List<String> allBasesToAugment = new ArrayList<>();
        for (GeneratedSample gs : newBaseSamples) {
            allBasesToAugment.add(gs.name);
        }
        allBasesToAugment.add("obs_da_tang_sat_lo_deo_doc_01");
        allBasesToAugment.add("obs_traffic_cone_barrier_thang_long");

        int augCount = 0;
        for (String base : allBasesToAugment) {
            File baseImg = findImage(imgDir, base);
            File baseLbl = new File(lblDir, base + ".txt");
            if (baseImg != null && baseLbl.exists()) {
                BufferedImage src = toRgb(ImageIO.read(baseImg));
                List<YoloBox> boxes = loadBoxes(baseLbl);
                generateAugmentations(imgDir, lblDir, base, src, boxes);
                augCount += 10;
                System.out.println("-> Đã tạo 10 biến thể tăng cường cho: " + base);
            }
        }

        System.out.println("==================================================================");
        System.out.println("   HOÀN THÀNH: ĐÃ BỔ SUNG " + newBaseSamples.size() + " MẪU GỐC VÀ " + augCount + " BIẾN THỂ TĂNG CƯỜNG!");
        System.out.println("==================================================================");
    }

    private List<GeneratedSample> generateBaseSamples(File imgDir, File lblDir) throws IOException {
        List<GeneratedSample> list = new ArrayList<>();

        // Lấy nền đường thực tế
        File roadBgFile = new File(WORKFLOW_DIR + "custom_vietnam_negatives/images/fresh_asphalt_patch.jpg");
        BufferedImage roadBg = roadBgFile.exists() ? ImageIO.read(roadBgFile) : new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        roadBg = toRgb(roadBg);

        // --- NHÓM 1: SỌT NHỰA, KÉT NHỰA, GHẾ NHỰA XÍ CHỖ LÒNG ĐƯỜNG ---
        // Sample A: Sọt nhựa hoa quả màu đỏ & xanh lá tràn xuống mép đường
        {
            String name = "obs_sot_nhua_do_xanh_cho_coc_02";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Sọt nhựa đỏ (x=280, y=340, w=150, h=180)
            drawPlasticCrate(g, 280, 340, 150, 180, new Color(195, 25, 25), new Color(140, 10, 10));
            // Sọt nhựa xanh lá cạnh bên (x=450, y=355, w=145, h=170)
            drawPlasticCrate(g, 450, 355, 145, 170, new Color(20, 135, 45), new Color(10, 90, 30));
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 275, 335, 160, 190),
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 445, 350, 155, 180)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // Sample B: Ghế nhựa đỏ + thùng sơn xí chỗ đỗ xe
        {
            String name = "obs_ghe_nhua_thung_son_xi_cho_03";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Ghế nhựa đỏ (x=330, y=320, w=140, h=210)
            drawPlasticChair(g, 330, 320, 140, 210, new Color(210, 30, 30));
            // Thùng sơn trắng cắm cành cây cảnh báo (x=500, y=370, w=120, h=150)
            drawPaintBucket(g, 500, 370, 120, 150, new Color(230, 230, 235));
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 325, 315, 150, 220),
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 495, 365, 130, 160)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // Sample C: Chồng két bia / két nước ngọt màu vàng ven lòng đường
        {
            String name = "obs_ket_nhua_bia_nuoc_ngot_via_he_04";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Két nhựa vàng (x=380, y=320, w=170, h=210)
            drawPlasticCrateStack(g, 380, 320, 170, 210, new Color(215, 165, 15));
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 375, 315, 180, 220)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // --- NHÓM 2: CỌC TIÊU PHẢN QUANG & RÀO CHẮN THI CÔNG ---
        // Sample D: Dãy cọc tiêu phản quang cam trên quốc lộ
        {
            String name = "obs_cone_cao_toc_phan_quang_02";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // 3 cọc tiêu liên tiếp (Cone 1: lớn gần, Cone 2: vừa, Cone 3: xa)
            drawTrafficCone(g, 220, 340, 110, 190);
            drawTrafficCone(g, 410, 370, 85, 150);
            drawTrafficCone(g, 570, 390, 65, 120);
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 215, 335, 120, 200),
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 405, 365, 95, 160),
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 565, 385, 75, 130)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // Sample E: Rào chắn thép sơn sọc đỏ trắng thi công đường bộ
        {
            String name = "obs_rao_chan_thep_cong_truong_03";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            drawConstructionBarrier(g, 260, 330, 340, 190);
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 255, 325, 350, 200)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // --- NHÓM 3: ĐÁ TẢNG SẠT LỞ & GẠCH ĐÁ RƠI VÃI ---
        // Sample F: Tảng đá hộc lớn sạt lở từ taluy nằm giữa đường
        {
            String name = "obs_da_hoc_chan_ngang_quoc_lo_02";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            drawLargeRock(g, 310, 330, 260, 190, new Color(105, 95, 88), new Color(60, 55, 50));
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 300, 320, 280, 210)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // Sample G: Đống gạch đá xây dựng rơi vãi từ xe tải
        {
            String name = "obs_gach_da_xe_tai_roi_vai_03";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            drawDebrisPile(g, 270, 350, 320, 170);
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 260, 340, 340, 190)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        // Sample H: Đất đá sạt lở mép đèo dốc
        {
            String name = "obs_sat_lo_dat_da_taluy_am_04";
            BufferedImage img = cloneImage(roadBg);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            drawLandslideDebris(g, 340, 310, 290, 220);
            g.dispose();

            List<YoloBox> boxes = List.of(
                boxFromCoords(img.getWidth(), img.getHeight(), 3, 330, 300, 310, 240)
            );
            saveBase(imgDir, lblDir, name, img, boxes);
            list.add(new GeneratedSample(name, boxes));
        }

        return list;
    }

    private void drawPlasticCrate(Graphics2D g, int x, int y, int w, int h, Color mainColor, Color darkColor) {
        // Bóng đổ
        g.setColor(new Color(20, 20, 20, 160));
        g.fillOval(x - 10, y + h - 15, w + 30, 30);

        // Khung sọt
        g.setColor(mainColor);
        g.fillRoundRect(x, y, w, h, 16, 16);

        // Lưới lỗ sọt
        g.setColor(darkColor);
        int rows = 5;
        int cols = 4;
        int pw = w / (cols + 1);
        int ph = h / (rows + 1);
        for (int r = 1; r <= rows; r++) {
            for (int c = 1; c <= cols; c++) {
                g.fillRoundRect(x + c * pw - pw / 3, y + r * ph - ph / 3, pw * 2 / 3, ph * 2 / 3, 6, 6);
            }
        }
        g.setColor(new Color(255, 255, 255, 60));
        g.drawRoundRect(x, y, w, h, 16, 16);
    }

    private void drawPlasticCrateStack(Graphics2D g, int x, int y, int w, int h, Color color) {
        int halfH = h / 2;
        drawPlasticCrate(g, x, y + halfH, w, halfH, color, color.darker());
        drawPlasticCrate(g, x + 5, y, w - 10, halfH, color.brighter(), color);
    }

    private void drawPlasticChair(Graphics2D g, int x, int y, int w, int h, Color color) {
        // Bóng
        g.setColor(new Color(15, 15, 15, 150));
        g.fillOval(x - 5, y + h - 10, w + 15, 20);

        g.setColor(color);
        // Tựa lưng
        g.fillRoundRect(x + w / 4, y, w / 2, h / 2, 10, 10);
        // Mặt ngồi
        g.fillRect(x + 10, y + h / 2 - 5, w - 20, 20);
        // 4 chân
        g.setStroke(new BasicStroke(6f));
        g.drawLine(x + 15, y + h / 2 + 10, x + 5, y + h);
        g.drawLine(x + w - 15, y + h / 2 + 10, x + w - 5, y + h);
        g.drawLine(x + 25, y + h / 2 + 10, x + 20, y + h - 5);
        g.drawLine(x + w - 25, y + h / 2 + 10, x + w - 20, y + h - 5);
    }

    private void drawPaintBucket(Graphics2D g, int x, int y, int w, int h, Color color) {
        g.setColor(new Color(15, 15, 15, 140));
        g.fillOval(x - 5, y + h - 10, w + 10, 20);

        g.setColor(color);
        g.fillRoundRect(x, y + 20, w, h - 20, 12, 12);
        // Quai xách cắm cành cây
        g.setColor(new Color(70, 50, 30));
        g.setStroke(new BasicStroke(5f));
        g.drawLine(x + w / 2, y + 20, x + w / 2 - 15, y - 40);
        g.drawLine(x + w / 2 - 15, y - 40, x + w / 2 - 30, y - 70);
    }

    private void drawTrafficCone(Graphics2D g, int x, int y, int w, int h) {
        // Bóng đổ
        g.setColor(new Color(20, 20, 20, 160));
        g.fillOval(x - 10, y + h - 10, w + 20, 22);

        // Đế chóp nón
        g.setColor(new Color(220, 70, 15));
        g.fillRoundRect(x, y + h - 18, w, 18, 8, 8);

        // Thân hình nón
        int[] px = { x + w / 2, x + 8, x + w - 8 };
        int[] py = { y, y + h - 16, y + h - 16 };
        g.fillPolygon(px, py, 3);

        // Dải phản quang trắng
        g.setColor(new Color(245, 245, 250));
        int band1Top = y + h / 3;
        int band1H = h / 6;
        g.fillRect(x + w / 4, band1Top, w / 2, band1H);

        int band2Top = y + (h * 3 / 5);
        int band2H = h / 7;
        g.fillRect(x + w / 6, band2Top, w * 2 / 3, band2H);
    }

    private void drawConstructionBarrier(Graphics2D g, int x, int y, int w, int h) {
        // Chân đế rào chắn
        g.setColor(new Color(30, 30, 30));
        g.setStroke(new BasicStroke(8f));
        g.drawLine(x + 30, y + h, x + 30, y + 40);
        g.drawLine(x + w - 30, y + h, x + w - 30, y + 40);

        // Thanh chắn ngang
        int barH = h / 4;
        g.setColor(new Color(240, 240, 240));
        g.fillRect(x + 10, y + 40, w - 20, barH);
        g.fillRect(x + 10, y + 40 + barH + 15, w - 20, barH);

        // Sọc chéo đỏ phản quang
        g.setColor(new Color(210, 30, 30));
        for (int i = 0; i < w - 20; i += 40) {
            int[] sx1 = { x + 10 + i, x + 30 + i, x + 10 + i };
            int[] sy1 = { y + 40, y + 40, y + 40 + barH };
            g.fillPolygon(sx1, sy1, 3);

            int[] sx2 = { x + 10 + i, x + 30 + i, x + 10 + i };
            int[] sy2 = { y + 55 + barH, y + 55 + barH, y + 55 + barH * 2 };
            g.fillPolygon(sx2, sy2, 3);
        }
    }

    private void drawLargeRock(Graphics2D g, int x, int y, int w, int h, Color c1, Color c2) {
        // Bóng đổ
        g.setColor(new Color(20, 20, 20, 180));
        g.fillOval(x - 15, y + h - 25, w + 30, 35);

        GradientPaint gp = new GradientPaint(x, y, c1, x + w, y + h, c2);
        g.setPaint(gp);
        int[] px = { x + 30, x + w / 2 - 20, x + w - 25, x + w, x + w - 40, x + 10 };
        int[] py = { y + 40, y, y + 35, y + h - 20, y + h, y + h - 10 };
        g.fillPolygon(px, py, px.length);

        // Gân đá nứt vỡ
        g.setColor(new Color(35, 30, 25));
        g.setStroke(new BasicStroke(3f));
        g.drawLine(x + w / 2 - 20, y, x + w / 3, y + h / 2);
        g.drawLine(x + w / 3, y + h / 2, x + w / 2 + 30, y + h - 25);
    }

    private void drawDebrisPile(Graphics2D g, int x, int y, int w, int h) {
        g.setColor(new Color(20, 20, 20, 160));
        g.fillOval(x - 10, y + h - 20, w + 20, 30);

        Color[] colors = { new Color(185, 75, 45), new Color(130, 125, 120), new Color(90, 85, 80), new Color(160, 65, 40) };
        for (int i = 0; i < 28; i++) {
            int bx = x + (int)(Math.sin(i * 1.7) * (w / 2.5) + (w / 2));
            int by = y + (int)(Math.cos(i * 1.3) * (h / 3.0) + (h / 1.8));
            g.setColor(colors[i % colors.length]);
            g.fillRoundRect(bx - 18, by - 12, 36, 24, 6, 6);
            g.setColor(new Color(40, 30, 25, 120));
            g.drawRoundRect(bx - 18, by - 12, 36, 24, 6, 6);
        }
    }

    private void drawLandslideDebris(Graphics2D g, int x, int y, int w, int h) {
        drawLargeRock(g, x + 20, y + 20, w * 3 / 5, h * 3 / 4, new Color(110, 100, 90), new Color(65, 60, 55));
        drawDebrisPile(g, x + w / 3, y + h / 3, w * 2 / 3, h * 2 / 3);
    }

    private void generateAugmentations(File imgDir, File lblDir, String base, BufferedImage src, List<YoloBox> boxes) throws IOException {
        saveAug(imgDir, lblDir, base + "_aug_flip", flipHorizontal(src), flipBoxes(boxes));
        saveAug(imgDir, lblDir, base + "_aug_sun", adjustColor(src, 1.18f, 1.08f, 0.92f, 1.05f), boxes);
        saveAug(imgDir, lblDir, base + "_aug_dusk", adjustColor(src, 0.88f, 0.74f, 0.62f, 0.90f), boxes);
        saveAug(imgDir, lblDir, base + "_aug_wet", adjustColor(src, 0.80f, 0.90f, 1.10f, 1.15f), boxes);
        saveAug(imgDir, lblDir, base + "_aug_contrast", adjustColor(src, 1.0f, 1.0f, 1.0f, 1.35f), boxes);
        saveAug(imgDir, lblDir, base + "_aug_gamma", adjustGamma(src, 1.30f), boxes);
        saveAug(imgDir, lblDir, base + "_aug_blur", applyBlur(src), boxes);
        saveAug(imgDir, lblDir, base + "_aug_flip_sun", adjustColor(flipHorizontal(src), 1.18f, 1.08f, 0.92f, 1.05f), flipBoxes(boxes));
        saveAug(imgDir, lblDir, base + "_aug_flip_dusk", adjustColor(flipHorizontal(src), 0.88f, 0.74f, 0.62f, 0.90f), flipBoxes(boxes));
        saveAug(imgDir, lblDir, base + "_aug_flip_wet", adjustColor(flipHorizontal(src), 0.80f, 0.90f, 1.10f, 1.15f), flipBoxes(boxes));
    }

    private void saveBase(File imgDir, File lblDir, String name, BufferedImage img, List<YoloBox> boxes) throws IOException {
        ImageIO.write(img, "jpg", new File(imgDir, name + ".jpg"));
        writeYoloLabels(new File(lblDir, name + ".txt"), boxes);
    }

    private void saveAug(File imgDir, File lblDir, String name, BufferedImage img, List<YoloBox> boxes) throws IOException {
        ImageIO.write(img, "jpg", new File(imgDir, name + ".jpg"));
        writeYoloLabels(new File(lblDir, name + ".txt"), boxes);
    }

    private void writeYoloLabels(File file, List<YoloBox> boxes) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (YoloBox b : boxes) {
            sb.append(String.format(Locale.US, "%d %.6f %.6f %.6f %.6f\n", b.classId, b.x, b.y, b.w, b.h));
        }
        Files.writeString(file.toPath(), sb.toString(), StandardCharsets.UTF_8);
    }

    private YoloBox boxFromCoords(int imgW, int imgH, int classId, int x, int y, int w, int h) {
        float cx = (x + w / 2.0f) / imgW;
        float cy = (y + h / 2.0f) / imgH;
        float nw = (float) w / imgW;
        float nh = (float) h / imgH;
        return new YoloBox(classId, Math.max(0.001f, Math.min(0.999f, cx)), Math.max(0.001f, Math.min(0.999f, cy)), nw, nh);
    }

    private BufferedImage cloneImage(BufferedImage src) {
        BufferedImage copy = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = copy.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return copy;
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

                float rf = ((r * rScale - 128f) * contrast) + 128f;
                float gf = ((g * gScale - 128f) * contrast) + 128f;
                float bf = ((b * bScale - 128f) * contrast) + 128f;

                int nr = Math.min(255, Math.max(0, Math.round(rf)));
                int ng = Math.min(255, Math.max(0, Math.round(gf)));
                int nb = Math.min(255, Math.max(0, Math.round(bf)));

                out.setRGB(x, y, (nr << 16) | (ng << 8) | nb);
            }
        }
        return out;
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

    private File findImage(File dir, String baseName) {
        String[] exts = {".jpg", ".jpeg", ".png", ".webp", ".JPG"};
        for (String ext : exts) {
            File f = new File(dir, baseName + ext);
            if (f.exists()) return f;
        }
        return null;
    }

    private static class GeneratedSample {
        final String name;
        final List<YoloBox> boxes;
        GeneratedSample(String name, List<YoloBox> boxes) {
            this.name = name;
            this.boxes = boxes;
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
