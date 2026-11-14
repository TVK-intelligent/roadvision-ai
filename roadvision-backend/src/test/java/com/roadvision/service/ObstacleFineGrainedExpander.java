package com.roadvision.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Công cụ tự động mở rộng tập dữ liệu vật cản chi tiết (Fine-grained Obstacle Dataset Expander)
 * Bổ sung tối thiểu 85 mẫu cho các nhóm vật cản đang dưới 20 mẫu:
 * 1. Đá tảng lớn, đá hộc sạt lở đèo dốc (+35 mẫu)
 * 2. Két bia nhựa, ghế nhựa lấn chiếm vỉa hè lòng đường (+25 mẫu)
 * 3. Lốp xe dựng đứng cảnh báo hố ga & rào chắn tạm (+25 mẫu)
 */
public class ObstacleFineGrainedExpander {

    private static final String IMAGES_DIR = "E:/DATN/workflow/ai_training/custom_vietnam_obstacles/images/";
    private static final String LABELS_DIR = "E:/DATN/workflow/ai_training/custom_vietnam_obstacles/labels/";
    private final Random rand = new Random(42); // Hạt ngẫu nhiên cố định để kết quả đồng nhất

    @Test
    public void expandFineGrainedObstacles() throws Exception {
        System.out.println("==================================================================");
        System.out.println("   KÍCH HOẠT BỔ SUNG DỮ LIỆU CHI TIẾT CÁC NHÓM VẬT CẢN DƯỚI 20   ");
        System.out.println("==================================================================");

        new File(IMAGES_DIR).mkdirs();
        new File(LABELS_DIR).mkdirs();

        int rockCount = generateMountainRockBoulders(35);
        int crateStoolCount = generateCratesAndPlasticStools(25);
        int tireBarricadeCount = generateUprightTiresAndBarricades(25);

        int totalAdded = rockCount + crateStoolCount + tireBarricadeCount;
        System.out.printf("%n HOÀN THÀNH: Đã tạo và gán nhãn thành công %d mẫu mới!%n", totalAdded);
        System.out.printf("   + Đá tảng & sạt lở đèo dốc:      %d mẫu%n", rockCount);
        System.out.printf("   + Két bia & ghế nhựa lấn chiếm:  %d mẫu%n", crateStoolCount);
        System.out.printf("   + Lốp xe cảnh báo & rào chắn:    %d mẫu%n", tireBarricadeCount);
    }

    /**
     * Nhóm 1: Đá tảng lớn sạt lở trên đèo núi (35 mẫu)
     */
    private int generateMountainRockBoulders(int count) throws Exception {
        int w = 800, h = 600;
        int generated = 0;

        for (int i = 1; i <= count; i++) {
            BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Nền: Đường đèo núi (đoạn cua, taluy dương vách đá bên phải hoặc bên trái)
            boolean leftTaluy = (i % 2 == 0);
            drawMountainPassBackground(g, w, h, leftTaluy, i);

            // Vị trí đá tảng: đa dạng khoảng cách (xa 30m, gần 10m)
            int rockW = 120 + rand.nextInt(140); // 120 - 260px
            int rockH = (int) (rockW * (0.65 + rand.nextDouble() * 0.45));
            int rockX = leftTaluy ? (180 + rand.nextInt(260)) : (260 + rand.nextInt(280));
            int rockY = 320 + rand.nextInt(120);

            // Vẽ đá tảng với vân đá hoa cương / đá vôi / đá sạt lở gồ ghề
            drawRealisticBoulder(g, rockX, rockY, rockW, rockH, i);

            // Nếu là đợt sạt lở lớn, vẽ thêm vài viên đá hộc nhỏ văng ra xung quanh
            List<BoxNorm> boxes = new ArrayList<>();
            boxes.add(toNorm(rockX, rockY, rockW, rockH, w, h));

            if (i % 3 == 0) {
                int smallW = 45 + rand.nextInt(35);
                int smallH = (int) (smallW * 0.7);
                int smallX = rockX + (rand.nextBoolean() ? (rockW + 20) : -smallW - 20);
                int smallY = rockY + rockH / 3;
                drawRealisticBoulder(g, smallX, smallY, smallW, smallH, i + 99);
                boxes.add(toNorm(smallX, smallY, smallW, smallH, w, h));
            }

            // Áp dụng điều kiện thời tiết thực tế
            applyLightingMood(g, w, h, i);
            g.dispose();

            String name = String.format("obs_da_tang_sat_lo_bo_sung_%02d", i);
            saveImageAndLabel(img, name, boxes);
            generated++;
        }
        return generated;
    }

    /**
     * Nhóm 2: Két bia, sọt nhựa đỏ/xanh, ghế nhựa quán cóc lấn chiếm (25 mẫu)
     */
    private int generateCratesAndPlasticStools(int count) throws Exception {
        int w = 800, h = 600;
        int generated = 0;

        for (int i = 1; i <= count; i++) {
            BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Nền đường đô thị có vỉa hè gạch và vạch kẻ lòng đường
            drawUrbanStreetBackground(g, w, h, i);

            List<BoxNorm> boxes = new ArrayList<>();
            int objType = i % 3; // 0: Két bia, 1: Ghế nhựa, 2: Cặp thùng xốp & ghế

            int baseX = 280 + rand.nextInt(240);
            int baseY = 360 + rand.nextInt(100);

            if (objType == 0) {
                // Két bia nhựa (Đỏ Sài Gòn, Vàng Hà Nội, Xanh Tiger)
                int crateW = 90 + rand.nextInt(40);
                int crateH = (int) (crateW * 0.75);
                Color crateColor = switch (i % 4) {
                    case 0 -> new Color(190, 30, 25);   // Đỏ
                    case 1 -> new Color(20, 125, 45);   // Xanh Tiger
                    case 2 -> new Color(205, 155, 20);  // Vàng
                    default -> new Color(30, 80, 170);  // Xanh dương
                };
                drawPlasticCrate(g, baseX, baseY, crateW, crateH, crateColor);
                boxes.add(toNorm(baseX, baseY, crateW, crateH, w, h));

                // Thường xếp chồng 2 két
                if (i % 2 == 0) {
                    int crate2Y = baseY - (int)(crateH * 0.85);
                    drawPlasticCrate(g, baseX + 5, crate2Y, crateW, crateH, crateColor);
                    // Hợp nhất bounding box cho chồng két
                    boxes.set(0, toNorm(baseX, crate2Y, crateW, baseY + crateH - crate2Y, w, h));
                }
            } else if (objType == 1) {
                // Ghế nhựa quán cóc lấn chiếm (Đỏ hoặc Xanh dương)
                int stoolW = 75 + rand.nextInt(30);
                int stoolH = (int) (stoolW * 1.15);
                Color stoolCol = (i % 2 == 0) ? new Color(210, 35, 30) : new Color(30, 95, 195);
                drawPlasticStool(g, baseX, baseY, stoolW, stoolH, stoolCol);
                boxes.add(toNorm(baseX, baseY, stoolW, stoolH, w, h));
            } else {
                // Ghế nhựa kèm thùng xốp
                int stoolW = 70 + rand.nextInt(25);
                int stoolH = (int) (stoolW * 1.1);
                drawPlasticStool(g, baseX, baseY, stoolW, stoolH, new Color(205, 30, 25));
                boxes.add(toNorm(baseX, baseY, stoolW, stoolH, w, h));

                int foamW = 85 + rand.nextInt(30);
                int foamH = (int) (foamW * 0.7);
                int foamX = baseX + stoolW + 15;
                int foamY = baseY + 15;
                drawFoamBox(g, foamX, foamY, foamW, foamH);
                boxes.add(toNorm(foamX, foamY, foamW, foamH, w, h));
            }

            applyLightingMood(g, w, h, i);
            g.dispose();

            String name = String.format("obs_ket_ghe_lan_chiem_bo_sung_%02d", i);
            saveImageAndLabel(img, name, boxes);
            generated++;
        }
        return generated;
    }

    /**
     * Nhóm 3: Lốp xe đứng cảnh báo hố ga & Rào chắn công trình tạm (25 mẫu)
     */
    private int generateUprightTiresAndBarricades(int count) throws Exception {
        int w = 800, h = 600;
        int generated = 0;

        for (int i = 1; i <= count; i++) {
            BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            drawUrbanStreetBackground(g, w, h, i);

            List<BoxNorm> boxes = new ArrayList<>();
            int posX = 260 + rand.nextInt(280);
            int posY = 350 + rand.nextInt(100);

            if (i % 2 == 0) {
                // Lốp xe máy/ô tô dựng đứng cảnh báo ổ gà/hố ga mất nắp
                int tireW = 75 + rand.nextInt(45);
                int tireH = (int) (tireW * 1.15);
                drawUprightTire(g, posX, posY, tireW, tireH);
                boxes.add(toNorm(posX, posY, tireW, tireH, w, h));
            } else {
                // Rào chắn tôn công trình hoặc khung chữ A có sọc chéo đỏ trắng
                int barW = 130 + rand.nextInt(60);
                int barH = (int) (barW * 0.75);
                drawConstructionBarricade(g, posX, posY, barW, barH);
                boxes.add(toNorm(posX, posY, barW, barH, w, h));
            }

            applyLightingMood(g, w, h, i);
            g.dispose();

            String name = String.format("obs_lop_rao_chan_bo_sung_%02d", i);
            saveImageAndLabel(img, name, boxes);
            generated++;
        }
        return generated;
    }

    // --- HỌA TIẾT & HÌNH DÁNG ĐỐI TƯỢNG (GRAPHICS UTILS) ---

    private void drawMountainPassBackground(Graphics2D g, int w, int h, boolean leftTaluy, int seed) {
        // Trời nhiều mây u ám vùng núi
        g.setPaint(new GradientPaint(0, 0, new Color(165, 175, 185), 0, h / 2, new Color(195, 205, 215)));
        g.fillRect(0, 0, w, h);

        // Núi xa
        g.setColor(new Color(90, 115, 95));
        Path2D mountain = new Path2D.Float();
        mountain.moveTo(0, h * 0.35);
        for (int x = 0; x <= w; x += 100) {
            mountain.lineTo(x, (float) (h * (0.28 + 0.12 * Math.sin(x * 0.01 + seed))));
        }
        mountain.lineTo(w, h * 0.5);
        mountain.lineTo(0, h * 0.5);
        mountain.closePath();
        g.fill(mountain);

        // Mặt đường nhựa đèo dốc xám
        g.setPaint(new GradientPaint(0, (int)(h * 0.42), new Color(105, 108, 112), 0, h, new Color(68, 70, 74)));
        Path2D road = new Path2D.Float();
        road.moveTo((float) (w * 0.40), (float) (h * 0.42));
        road.lineTo((float) (w * 0.65), (float) (h * 0.42));
        road.lineTo(w, h);
        road.lineTo(0, h);
        road.closePath();
        g.fill(road);

        // Vạch sơn vàng tim đường đèo
        g.setColor(new Color(225, 190, 40));
        g.setStroke(new BasicStroke(6, BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL, 0, new float[]{30, 25}, 0));
        g.drawLine((int)(w * 0.51), (int)(h * 0.42), (int)(w * 0.45), h);

        // Vách đá taluy dốc
        g.setColor(new Color(85, 78, 70));
        Path2D taluy = new Path2D.Float();
        if (leftTaluy) {
            taluy.moveTo(0, (int)(h * 0.25));
            taluy.lineTo((int)(w * 0.32), (int)(h * 0.55));
            taluy.lineTo(0, h);
            taluy.closePath();
        } else {
            taluy.moveTo(w, (int)(h * 0.25));
            taluy.lineTo((int)(w * 0.68), (int)(h * 0.55));
            taluy.lineTo(w, h);
            taluy.closePath();
        }
        g.fill(taluy);
    }

    private void drawUrbanStreetBackground(Graphics2D g, int w, int h, int seed) {
        // Nền đường đô thị
        g.setColor(new Color(175, 190, 205));
        g.fillRect(0, 0, w, (int)(h * 0.45));

        // Mặt đường nhựa asphalt
        g.setPaint(new GradientPaint(0, (int)(h * 0.45), new Color(90, 92, 95), 0, h, new Color(55, 57, 60)));
        g.fillRect(0, (int)(h * 0.45), w, (int)(h * 0.55));

        // Vỉa hè lát gạch mép phải
        g.setColor(new Color(135, 130, 125));
        g.fillRect((int)(w * 0.72), (int)(h * 0.45), (int)(w * 0.28), (int)(h * 0.55));

        // Mép bó vỉa bê tông
        g.setColor(new Color(175, 175, 175));
        g.fillRect((int)(w * 0.70), (int)(h * 0.45), (int)(w * 0.02), (int)(h * 0.55));

        // Vạch kẻ lề đường trắng
        g.setColor(new Color(230, 230, 230));
        g.fillRect((int)(w * 0.66), (int)(h * 0.45), 8, (int)(h * 0.55));
    }

    private void drawRealisticBoulder(Graphics2D g, int x, int y, int w, int h, int seed) {
        // Đổ bóng đá tảng trên mặt đường
        g.setColor(new Color(30, 32, 35, 140));
        g.fillOval(x - 10, y + (int)(h * 0.75), w + 20, (int)(h * 0.35));

        // Khối đá gồ ghề đa giác tự nhiên
        Path2D boulder = new Path2D.Float();
        int nPts = 10;
        for (int i = 0; i < nPts; i++) {
            double angle = 2.0 * Math.PI * i / nPts;
            double rVar = 0.82 + 0.35 * Math.sin(i * 3.7 + seed);
            double px = x + w / 2.0 + (w / 2.0 * rVar) * Math.cos(angle);
            double py = y + h / 2.0 + (h / 2.0 * rVar) * Math.sin(angle);
            if (i == 0) boulder.moveTo(px, py);
            else boulder.lineTo(px, py);
        }
        boulder.closePath();

        // Màu đá granite / bazan
        Color cDark = new Color(75, 68, 62);
        Color cLight = new Color(135, 128, 120);
        g.setPaint(new RadialGradientPaint(x + w / 3f, y + h / 3f, w, new float[]{0.0f, 1.0f}, new Color[]{cLight, cDark}));
        g.fill(boulder);

        // Vết nứt vỡ rạn trên khối đá
        g.setColor(new Color(40, 35, 30));
        g.setStroke(new BasicStroke(2));
        g.drawLine(x + (int)(w * 0.3), y + (int)(h * 0.2), x + (int)(w * 0.6), y + (int)(h * 0.7));
        g.drawLine(x + (int)(w * 0.5), y + (int)(h * 0.4), x + (int)(w * 0.8), y + (int)(h * 0.5));
    }

    private void drawPlasticCrate(Graphics2D g, int x, int y, int w, int h, Color col) {
        // Đổ bóng
        g.setColor(new Color(25, 27, 30, 130));
        g.fillRect(x + 5, y + (int)(h * 0.85), w, (int)(h * 0.25));

        // Thân két nhựa
        g.setColor(col);
        g.fillRoundRect(x, y, w, h, 8, 8);

        // Lưới ô thoáng két bia
        g.setColor(new Color(col.getRed() / 2, col.getGreen() / 2, col.getBlue() / 2));
        g.setStroke(new BasicStroke(2));
        int gridStep = Math.max(8, w / 7);
        for (int gx = x + gridStep; gx < x + w - 4; gx += gridStep) {
            g.drawLine(gx, y + 4, gx, y + h - 4);
        }
        for (int gy = y + gridStep; gy < y + h - 4; gy += gridStep) {
            g.drawLine(x + 4, gy, x + w - 4, gy);
        }

        // Viền gờ chịu lực
        g.setColor(col.brighter());
        g.drawRoundRect(x, y, w, h, 8, 8);
    }

    private void drawPlasticStool(Graphics2D g, int x, int y, int w, int h, Color col) {
        // Mặt ghế
        int seatH = (int)(h * 0.22);
        g.setColor(new Color(20, 20, 20, 110));
        g.fillOval(x - 5, y + h - 8, w + 10, 16);

        // 4 chân ghế choãi ra
        g.setColor(col.darker());
        g.setStroke(new BasicStroke(Math.max(3, w / 12)));
        g.drawLine(x + (int)(w * 0.2), y + seatH, x + (int)(w * 0.05), y + h);
        g.drawLine(x + (int)(w * 0.8), y + seatH, x + (int)(w * 0.95), y + h);
        g.drawLine(x + (int)(w * 0.4), y + seatH, x + (int)(w * 0.35), y + h);
        g.drawLine(x + (int)(w * 0.6), y + seatH, x + (int)(w * 0.65), y + h);

        // Mặt ghế hình chữ nhật bo tròn có lỗ tròn ở giữa
        g.setColor(col);
        g.fillRoundRect(x, y, w, seatH, 6, 6);
        g.setColor(Color.WHITE);
        g.fillOval(x + w / 2 - 5, y + seatH / 2 - 3, 10, 6);
    }

    private void drawFoamBox(Graphics2D g, int x, int y, int w, int h) {
        g.setColor(new Color(25, 27, 30, 100));
        g.fillRect(x + 5, y + (int)(h * 0.85), w, (int)(h * 0.25));

        // Thân hộp xốp trắng ngà
        g.setColor(new Color(240, 242, 240));
        g.fillRect(x, y, w, h);
        // Nắp hộp xốp
        g.setColor(new Color(220, 222, 220));
        g.drawRect(x, y, w, h);
        g.drawLine(x, y + (int)(h * 0.28), x + w, y + (int)(h * 0.28));
    }

    private void drawUprightTire(Graphics2D g, int x, int y, int w, int h) {
        // Đổ bóng lốp xe dựng đứng
        g.setColor(new Color(20, 20, 22, 140));
        g.fillOval(x - 8, y + h - 10, w + 16, 18);

        // Vành lốp ngoài cao su đen
        g.setColor(new Color(42, 44, 46));
        g.fillOval(x, y, w, h);

        // Lỗ rỗng giữa lốp xe
        int innerW = (int)(w * 0.52);
        int innerH = (int)(h * 0.52);
        int innerX = x + (w - innerW) / 2;
        int innerY = y + (h - innerH) / 2;

        // Xuyên qua lỗ lốp thấy mặt đường
        g.setColor(new Color(75, 78, 80));
        g.fillOval(innerX, innerY, innerW, innerH);

        // Gai lốp xe
        g.setColor(new Color(28, 28, 30));
        g.setStroke(new BasicStroke(2));
        g.drawOval(x + 2, y + 2, w - 4, h - 4);
    }

    private void drawConstructionBarricade(Graphics2D g, int x, int y, int w, int h) {
        // Đổ bóng
        g.setColor(new Color(25, 27, 30, 110));
        g.fillRect(x, y + h - 6, w, 12);

        // 2 chân trụ khung chữ A sắt
        g.setColor(new Color(90, 92, 95));
        g.setStroke(new BasicStroke(4));
        g.drawLine(x + 12, y + h, x + 25, y + 10);
        g.drawLine(x + w - 12, y + h, x + w - 25, y + 10);

        // Tấm chắn ngang sơn sọc chéo Đỏ - Trắng phản quang
        int boardH = (int)(h * 0.45);
        int boardY = y + (int)(h * 0.25);
        g.setColor(Color.WHITE);
        g.fillRect(x, boardY, w, boardH);
        g.setColor(Color.BLACK);
        g.drawRect(x, boardY, w, boardH);

        // Vẽ các dải sọc chéo đỏ 45 độ
        g.setColor(new Color(215, 30, 25));
        int stripeW = 16;
        for (int sx = x - boardH; sx < x + w; sx += stripeW * 2) {
            Polygon poly = new Polygon();
            poly.addPoint(sx, boardY + boardH);
            poly.addPoint(sx + stripeW, boardY + boardH);
            poly.addPoint(sx + stripeW + boardH, boardY);
            poly.addPoint(sx + boardH, boardY);
            g.fill(poly);
        }
    }

    private void applyLightingMood(Graphics2D g, int w, int h, int idx) {
        int mood = idx % 5;
        if (mood == 1) {
            // Hoàng hôn / Chiều tà vàng cam
            g.setColor(new Color(230, 140, 40, 38));
            g.fillRect(0, 0, w, h);
        } else if (mood == 2) {
            // Ban đêm đèn đường vàng natri
            g.setColor(new Color(15, 18, 25, 115));
            g.fillRect(0, 0, w, h);
            g.setColor(new Color(245, 190, 45, 35));
            g.fillRect(0, 0, w, h);
        } else if (mood == 3) {
            // Trời mưa ướt phản quang
            g.setColor(new Color(45, 60, 80, 45));
            g.fillRect(0, 0, w, h);
        }
    }

    private BoxNorm toNorm(int bx, int by, int bw, int bh, int imgW, int imgH) {
        float cx = (bx + bw / 2.0f) / imgW;
        float cy = (by + bh / 2.0f) / imgH;
        float nw = (float) bw / imgW;
        float nh = (float) bh / imgH;
        return new BoxNorm(cx, cy, nw, nh);
    }

    private void saveImageAndLabel(BufferedImage img, String name, List<BoxNorm> boxes) throws Exception {
        File imgFile = new File(IMAGES_DIR + name + ".jpg");
        File lblFile = new File(LABELS_DIR + name + ".txt");

        ImageIO.write(img, "jpg", imgFile);

        try (PrintWriter pw = new PrintWriter(new FileWriter(lblFile))) {
            for (BoxNorm b : boxes) {
                // Class 3: ROAD_OBSTACLE
                pw.printf(Locale.US, "3 %.6f %.6f %.6f %.6f%n", b.cx, b.cy, b.w, b.h);
            }
        }
    }

    private static class BoxNorm {
        final float cx, cy, w, h;
        BoxNorm(float cx, float cy, float w, float h) {
            this.cx = cx; this.cy = cy; this.w = w; this.h = h;
        }
    }
}
