package com.roadvision.service;

import com.roadvision.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path uploadLocation;

    public FileStorageService(@Value("${roadvision.storage.upload-dir:uploads}") String uploadDir) {
        this.uploadLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadLocation);
            Files.createDirectories(this.uploadLocation.resolve("incidents"));
            Files.createDirectories(this.uploadLocation.resolve("proofs"));
        } catch (IOException e) {
            throw new RuntimeException("Không thể khởi tạo thư mục lưu trữ tệp tin", e);
        }
    }

    public String storeFile(MultipartFile file, String subFolder) {
        if (file.isEmpty()) {
            throw new BadRequestException("Tệp tin tải lên bị trống");
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalFilename.substring(dotIndex).toLowerCase();
        }

        if (!extension.equals(".jpg") && !extension.equals(".jpeg") && !extension.equals(".png") && !extension.equals(".webp")) {
            throw new BadRequestException("Chỉ chấp nhận các định dạng ảnh .jpg, .jpeg, .png, .webp");
        }

        String generatedFilename = UUID.randomUUID() + extension;

        try {
            Path targetLocation = this.uploadLocation.resolve(subFolder).resolve(generatedFilename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/" + subFolder + "/" + generatedFilename;
        } catch (IOException ex) {
            throw new RuntimeException("Không thể lưu trữ tệp " + generatedFilename, ex);
        }
    }
}
