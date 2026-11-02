package com.roadvision.service;

import com.roadvision.dto.SystemHealthDTO;
import com.roadvision.dto.SystemSettingsDTO;

public interface SystemSettingService {

    SystemSettingsDTO getSettings();

    SystemSettingsDTO updateSettings(SystemSettingsDTO dto, String adminEmail);

    SystemSettingsDTO resetToDefaults(String adminEmail);

    SystemHealthDTO getSystemHealth();

    // Helper methods for runtime lookups by other services
    double getAiConfidenceThreshold();
    int getDuplicateRadiusMeters();
    boolean isAutoSeverityClassificationEnabled();
    int getSlaCriticalHours();
    int getSlaNormalHours();
}
