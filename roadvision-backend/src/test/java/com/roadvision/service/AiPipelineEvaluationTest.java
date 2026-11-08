package com.roadvision.service;

import com.roadvision.util.ImageTensorUtil;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

public class AiPipelineEvaluationTest {

    @Test
    public void testPipelineOnDownloads() throws Exception {
        DefaultResourceLoader loader = new DefaultResourceLoader();
        AiInferenceService service = new AiInferenceService(loader);

        Field confField = AiInferenceService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(service, 0.20f);

        Field iouField = AiInferenceService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(service, 0.45f);

        service.init();

        List<File> imageList = new ArrayList<>();
        File downloadsDir = new File("C:/Users/trank/Downloads");
        collectImages(downloadsDir, imageList);

        System.out.println("\n========== AI PIPELINE EVALUATION ON " + imageList.size() + " DOWNLOADS IMAGES ==========\n");

        for (int i = 0; i < imageList.size(); i++) {
            File imgFile = imageList.get(i);
            try (InputStream is = new FileInputStream(imgFile)) {
                List<ImageTensorUtil.BoundingBox> boxes = service.runInferenceList(is, 0.20f);
                System.out.printf("[%d/%d] %-55s (%s) -> Detected: %d boxes%n",
                        i + 1, imageList.size(), imgFile.getName(), imgFile.getParentFile().getName(), boxes.size());
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("      * %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                            b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            } catch (Exception e) {
                System.out.printf("[%d/%d] %-55s -> ERROR: %s%n", i + 1, imageList.size(), imgFile.getName(), e.getMessage());
            }
        }

        service.destroy();
    }

    @Test
    public void testStarbucksImage() throws Exception {
        DefaultResourceLoader loader = new DefaultResourceLoader();
        AiInferenceService service = new AiInferenceService(loader);

        Field confField = AiInferenceService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(service, 0.20f);

        Field iouField = AiInferenceService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(service, 0.45f);

        service.init();

        List<File> imageList = new ArrayList<>();
        collectImages(new File("C:/Users/trank/Downloads"), imageList);
        File imgFile = imageList.stream().filter(f -> f.getName().contains("106A1be3")).findFirst().orElse(null);
        if (imgFile != null && imgFile.exists()) {
            try (InputStream is = new FileInputStream(imgFile)) {
                List<ImageTensorUtil.BoundingBox> boxes = service.runInferenceList(is, 0.20f);
                System.out.printf("Starbucks image (%s) -> Detected: %d boxes%n", imgFile.getName(), boxes.size());
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("   * %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                            b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            }
        }

        File floodFile = imageList.stream().filter(f -> f.getName().contains("9e7d89c1")).findFirst().orElse(null);
        if (floodFile != null && floodFile.exists()) {
            try (InputStream is = new FileInputStream(floodFile)) {
                List<ImageTensorUtil.BoundingBox> boxes = service.runInferenceList(is, 0.20f);
                System.out.printf("Flood image (%s) -> Detected: %d boxes%n", floodFile.getName(), boxes.size());
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("   * %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                            b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            }
        }
        service.destroy();
    }

    @Test
    public void testDoiTuongImages() throws Exception {
        DefaultResourceLoader loader = new DefaultResourceLoader();
        AiInferenceService service = new AiInferenceService(loader);

        Field confField = AiInferenceService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(service, 0.20f);

        Field iouField = AiInferenceService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(service, 0.45f);

        service.init();

        List<File> allImages = new ArrayList<>();
        collectImages(new File("C:/Users/trank/Downloads"), allImages);

        List<File> doiTuongImages = new ArrayList<>();
        for (File f : allImages) {
            if (f.getParentFile().getName().toLowerCase().contains("tuong")) {
                doiTuongImages.add(f);
            }
        }
        doiTuongImages.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));

        File outDir = new File("C:/Users/trank/.gemini/antigravity/brain/70131e9e-413c-4f96-88d0-83d0a44982b0/annotated_doituong");
        if (!outDir.exists()) outDir.mkdirs();

        System.out.println("\n=======================================================");
        System.out.println("   DANH GIA CHI TIET " + doiTuongImages.size() + " ANH TRONG THU MUC DOITUONG");
        System.out.println("=======================================================\n");

        for (int i = 0; i < doiTuongImages.size(); i++) {
            File f = doiTuongImages.get(i);
            try (InputStream is = new FileInputStream(f)) {
                List<ImageTensorUtil.BoundingBox> boxes = service.runInferenceList(is, 0.20f);
                System.out.printf("[%2d/%2d] %-45s -> %d BOXES%n", i + 1, doiTuongImages.size(), f.getName(), boxes.size());
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("       * %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                            b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }

                // Vẽ box và lưu vào artifact
                try {
                    javax.imageio.ImageIO.setUseCache(false);
                    java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(f);
                    if (img != null) {
                        java.awt.Graphics2D g = img.createGraphics();
                        g.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
                        g.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                        g.setFont(new java.awt.Font("Arial", java.awt.Font.BOLD, Math.max(14, img.getWidth() / 45)));

                        for (ImageTensorUtil.BoundingBox b : boxes) {
                            java.awt.Color col;
                            switch (b.getClassName()) {
                                case "POTHOLE" -> col = java.awt.Color.RED;
                                case "ROAD_CRACK" -> col = java.awt.Color.ORANGE;
                                case "ROAD_FLOODING" -> col = java.awt.Color.CYAN;
                                case "ROAD_OBSTACLE" -> col = java.awt.Color.MAGENTA;
                                default -> col = java.awt.Color.GREEN;
                            }
                            g.setColor(col);
                            g.setStroke(new java.awt.BasicStroke(Math.max(2, img.getWidth() / 300)));
                            g.drawRect(b.getX(), b.getY(), b.getWidth(), b.getHeight());

                            String label = String.format("%s %.0f%%", b.getClassName(), b.getConfidence() * 100);
                            java.awt.FontMetrics fm = g.getFontMetrics();
                            int tw = fm.stringWidth(label);
                            int th = fm.getHeight();
                            int tx = Math.max(0, b.getX());
                            int ty = Math.max(th, b.getY());

                            g.setColor(new java.awt.Color(0, 0, 0, 180));
                            g.fillRect(tx, ty - th + 2, tw + 8, th);
                            g.setColor(col);
                            g.drawString(label, tx + 4, ty - 2);
                        }
                        g.dispose();

                        File outFile = new File(outDir, String.format("%02d_%s.jpg", i + 1, f.getName()));
                        // Convert to RGB for saving as jpg
                        java.awt.image.BufferedImage rgbImg = new java.awt.image.BufferedImage(
                                img.getWidth(), img.getHeight(), java.awt.image.BufferedImage.TYPE_INT_RGB);
                        java.awt.Graphics2D g2 = rgbImg.createGraphics();
                        g2.drawImage(img, 0, 0, null);
                        g2.dispose();
                        javax.imageio.ImageIO.write(rgbImg, "jpg", outFile);
                    }
                } catch (Exception ex) {
                    System.out.println("       [Loi luu anh debug: " + ex.getMessage() + "]");
                }
            } catch (Exception e) {
                System.out.printf("[%2d/%2d] %-45s -> ERROR: %s%n", i + 1, doiTuongImages.size(), f.getName(), e.getMessage());
            }
        }

        service.destroy();
    }

    @Test
    public void testTraceOip2() throws Exception {
        DefaultResourceLoader loader = new DefaultResourceLoader();
        AiInferenceService service = new AiInferenceService(loader);

        Field confField = AiInferenceService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(service, 0.20f);

        Field iouField = AiInferenceService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(service, 0.45f);

        service.init();

        List<File> allImages = new ArrayList<>();
        collectImages(new File("C:/Users/trank/Downloads"), allImages);
        File f = allImages.stream().filter(img -> img.getName().equals("OIP (2).jpg")).findFirst().orElse(null);
        if (f != null) {
            try (InputStream is = new FileInputStream(f)) {
                List<ImageTensorUtil.BoundingBox> boxes = service.runInferenceList(is, 0.20f);
                System.out.printf("TRACE OIP (2).jpg -> Final boxes: %d%n", boxes.size());
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("   * %s (%.1f%%) [%d, %d, %d, %d]%n", b.getClassName(), b.getConfidence() * 100, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            }
        }
        service.destroy();
    }

    private void collectImages(File dir, List<File> list) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return;
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.isDirectory()) {
                String dname = f.getName().toLowerCase();
                if (!dname.contains("roadvision_runs") && !dname.contains(".git") && !dname.contains("unikey")) {
                    collectImages(f, list);
                }
            } else {
                String lower = f.getName().toLowerCase();
                if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
                    list.add(f);
                }
            }
        }
    }
}
