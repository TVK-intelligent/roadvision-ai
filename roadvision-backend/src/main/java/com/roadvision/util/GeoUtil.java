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

    /**
     * Tính khoảng cách đường chim bay (mét) giữa 2 tọa độ GPS theo công thức Haversine
     */
    public static double distanceInMeters(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371000.0; // Bán kính Trái Đất xấp xỉ tính bằng mét
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lng2 - lng1);

        double a = Math.sin(deltaPhi / 2.0) * Math.sin(deltaPhi / 2.0)
                + Math.cos(phi1) * Math.cos(phi2)
                * Math.sin(deltaLambda / 2.0) * Math.sin(deltaLambda / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

        return R * c;
    }
}
