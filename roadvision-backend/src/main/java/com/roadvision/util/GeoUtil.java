package com.roadvision.util;

import java.math.BigDecimal;

public class GeoUtil {

    // Giới hạn địa bàn hành chính (Ví dụ khu vực TP.HCM hoặc có thể mở rộng)
    private static final double MIN_LAT = 8.5;
    private static final double MAX_LAT = 23.5;
    private static final double MIN_LNG = 102.0;
    private static final double MAX_LNG = 110.0;

    /**
     * Kiểm tra tọa độ GPS có nằm trong ranh giới địa lý cho phép hay không
     */
    public static boolean isWithinGeoBounds(BigDecimal lat, BigDecimal lng) {
        if (lat == null || lng == null) return false;
        double dLat = lat.doubleValue();
        double dLng = lng.doubleValue();
        return dLat >= MIN_LAT && dLat <= MAX_LAT && dLng >= MIN_LNG && dLng <= MAX_LNG;
    }
}
