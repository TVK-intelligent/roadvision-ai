package com.roadvision.service;

import com.roadvision.util.ImageTensorUtil;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

public class NegativeBackgroundEvaluationTest {

    private static final String FINISH_DIR = "C:/Users/trank/Downloads/finish";
    private static final String ARTIFACT_DIR = "C:/Users/trank/.gemini/antigravity/brain/70131e9e-413c-4f96-88d0-83d0a44982b0/annotated_finish/";

    @Test
    public void testNegativeBackgroundImages() throws Exception {
        System.out.println("==================================================================");
        System.out.println("   KIỂM THỬ ĐỘ CHÍNH XÁC TRÊN TẬP ẢNH NỀN / ÂM TÍNH (FINISH)     ");
        System.out.println("   Mục tiêu: KHÔNG BÁO SAI / KHÔNG BÁO GIẢ (0 False Positive)    ");
        System.out.println("==================================================================");

        DefaultResourceLoader loader = new DefaultResourceLoader();
        AiInferenceService service = new AiInferenceService(loader);

        Field confField = AiInferenceService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(service, 0.20f);

        Field iouField = AiInferenceService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(service, 0.45f);

        service.init();

        File dir = new File(FINISH_DIR);
        File[] files = dir.listFiles((d, name) -> {
            String lower = name.toLowerCase();
            return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
        });

        if (files == null || files.length == 0) {
            System.err.println("❌ Không tìm thấy ảnh trong: " + FINISH_DIR);
            service.destroy();
            return;
        }

        Arrays.sort(files, Comparator.comparing(File::getName, String.CASE_INSENSITIVE_ORDER));

        File outDir = new File(ARTIFACT_DIR);
        if (!outDir.exists()) outDir.mkdirs();

        int cleanCount = 0;
        int falsePositiveCount = 0;

        for (int i = 0; i < files.length; i++) {
            File f = files[i];
            System.out.printf("\n[%2d/%2d] %-48s -> ", (i + 1), files.length, f.getName());

            List<ImageTensorUtil.BoundingBox> boxes;
            try (InputStream is = new FileInputStream(f)) {
                boxes = service.runInferenceList(is, 0.20f);
            }

            BufferedImage img = ImageIO.read(f);
            if (img == null) {
                System.out.println("LỖI ĐỌC ẢNH");
                continue;
            }

            if (boxes.isEmpty()) {
                cleanCount++;
                System.out.println("✅ SẠCH HOÀN TOÀN (0 BOXES) - Không có báo giả!");
            } else {
                falsePositiveCount++;
                System.out.println("⚠️ CẢNH BÁO: PHÁT HIỆN " + boxes.size() + " BOXES (Có thể là báo giả):");
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("       * %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]\n",
                            b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            }

            // Vẽ ảnh annotated để lưu artifact
            BufferedImage annotated = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = annotated.createGraphics();
            g.drawImage(img, 0, 0, null);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setFont(new Font("Arial", Font.BOLD, Math.max(14, img.getWidth() / 45)));

            for (ImageTensorUtil.BoundingBox b : boxes) {
                Color col;
                switch (b.getClassName()) {
                    case "POTHOLE" -> col = Color.RED;
                    case "ROAD_CRACK" -> col = Color.ORANGE;
                    case "ROAD_FLOODING" -> col = Color.CYAN;
                    case "ROAD_OBSTACLE" -> col = Color.MAGENTA;
                    default -> col = Color.GREEN;
                }
                g.setColor(new Color(col.getRed(), col.getGreen(), col.getBlue(), 80));
                g.fillRect(b.getX(), b.getY(), b.getWidth(), b.getHeight());
                g.setColor(col);
                g.setStroke(new BasicStroke(Math.max(2, img.getWidth() / 400)));
                g.drawRect(b.getX(), b.getY(), b.getWidth(), b.getHeight());

                String label = String.format("%s: %.1f%%", b.getClassName(), b.getConfidence() * 100.0f);
                g.setColor(Color.BLACK);
                g.drawString(label, b.getX() + 2, Math.max(20, b.getY() - 4) + 1);
                g.setColor(col);
                g.drawString(label, b.getX(), Math.max(20, b.getY() - 4));
            }

            g.dispose();
            File outFile = new File(outDir, (i + 1) + "_" + f.getName() + ".jpg");
            ImageIO.write(annotated, "jpg", outFile);
        }

        service.destroy();

        System.out.println("\n==================================================================");
        System.out.printf("   KẾT QUẢ TỔNG KẾT: %d SẠCH (0 FALSE POSITIVE) / %d BÁO GIẢ\n", cleanCount, falsePositiveCount);
        System.out.println("   Độ đặc hiệu (Specificity): " + String.format("%.1f%%", (double) cleanCount / files.length * 100));
        System.out.println("==================================================================");
    }
}
