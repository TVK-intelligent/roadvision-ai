package com.roadvision.service;

import com.roadvision.util.ImageTensorUtil;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.List;

public class AiPipelineEvaluationTest {

    @Test
    public void testPipelineOnDownloads() throws Exception {
        DefaultResourceLoader loader = new DefaultResourceLoader();
        AiInferenceService service = new AiInferenceService(loader);

        Field confField = AiInferenceService.class.getDeclaredField("confidenceThreshold");
        confField.setAccessible(true);
        confField.set(service, 0.25f);

        Field iouField = AiInferenceService.class.getDeclaredField("iouThreshold");
        iouField.setAccessible(true);
        iouField.set(service, 0.45f);

        service.init();

        File downloadsDir = new File("C:/Users/trank/Downloads");
        File[] images = downloadsDir.listFiles((dir, name) -> {
            String lower = name.toLowerCase();
            return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
        });

        System.out.println("\n========== AI PIPELINE EVALUATION ON 20 DOWNLOADS IMAGES ==========\n");

        for (int i = 0; i < images.length; i++) {
            File imgFile = images[i];
            try (InputStream is = new FileInputStream(imgFile)) {
                List<ImageTensorUtil.BoundingBox> boxes = service.runInferenceList(is, 0.25f);
                System.out.printf("[%d/%d] %-45s -> Detected: %d boxes%n", i + 1, images.length, imgFile.getName(), boxes.size());
                for (ImageTensorUtil.BoundingBox b : boxes) {
                    System.out.printf("      * %-15s | Conf: %5.1f%% | Box: [x=%d, y=%d, w=%d, h=%d]%n",
                            b.getClassName(), b.getConfidence() * 100.0f, b.getX(), b.getY(), b.getWidth(), b.getHeight());
                }
            } catch (Exception e) {
                System.out.printf("[%d/%d] %-45s -> ERROR: %s%n", i + 1, images.length, imgFile.getName(), e.getMessage());
            }
        }

        service.destroy();
    }
}
