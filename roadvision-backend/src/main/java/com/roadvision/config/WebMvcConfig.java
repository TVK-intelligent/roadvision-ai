package com.roadvision.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${roadvision.storage.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath1 = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path uploadPath2 = Paths.get("..", uploadDir).toAbsolutePath().normalize();

        String uri1 = uploadPath1.toUri().toString();
        if (!uri1.endsWith("/")) uri1 += "/";

        String uri2 = uploadPath2.toUri().toString();
        if (!uri2.endsWith("/")) uri2 += "/";

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uri1, uri2);
    }
}
