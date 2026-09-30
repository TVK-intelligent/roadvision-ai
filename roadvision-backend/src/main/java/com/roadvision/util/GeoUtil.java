package com.roadvision.util;

import java.math.BigDecimal;

public class GeoUtil {

    private static final double MIN_LAT = 8.0;
    private static final double MAX_LAT = 24.0;
    private static final double MIN_LNG = 102.0;
    private static final double MAX_LNG = 110.0;

    /**
     * Thông tin Khu Quản lý Đường bộ phụ trách (4 Khu QLĐB phân bổ trọn vẹn 63 tỉnh thành)
     */
    public static class RouteCorridorInfo {
        private final String code;          // KHU_1, KHU_2, KHU_3, KHU_4
        private final String name;          // Tên đầy đủ của Khu QLĐB & Đội
        private final String agency;        // Cơ quan quản lý
        private final Long suggestedStaffId; // ID nhân viên kỹ thuật phụ trách

        public RouteCorridorInfo(String code, String name, String agency, Long suggestedStaffId) {
            this.code = code;
            this.name = name;
            this.agency = agency;
            this.suggestedStaffId = suggestedStaffId;
        }

        public String getCode() { return code; }
        public String getName() { return name; }
        public String getAgency() { return agency; }
        public Long getSuggestedStaffId() { return suggestedStaffId; }
    }

    // Danh bạ từ khóa 63 tỉnh thành Việt Nam
    private static final String[] PROVINCES_KHU_4 = {
            "hồ chí minh", "hcm", "sài gòn", "thủ đức", "bình chánh", "cần giờ", "củ chi", "hóc môn",
            "cần thơ", "ninh kiều", "cái răng",
            "bình dương", "thủ dầu một", "dĩ an", "thuận an",
            "đồng nai", "biên hòa", "long thành",
            "bà rịa", "vũng tàu", "bà rịa - vũng tàu",
            "tây ninh", "bình phước", "đồng xoài",
            "long an", "tân an", "tiền giang", "mỹ tho",
            "bến tre", "vĩnh long", "trà vinh",
            "hậu giang", "vị thanh", "sóc trăng",
            "đồng tháp", "cao lãnh", "sa đéc",
            "an giang", "long xuyên", "châu đốc",
            "kiên giang", "rạch giá", "phú quốc",
            "bạc liêu", "cà mau", "năm căn"
    };

    private static final String[] PROVINCES_KHU_3 = {
            "đà nẵng", "hải châu", "sơn trà", "ngũ hành sơn", "liên chiểu", "hòa vang",
            "quảng nam", "hội an", "tam kỳ",
            "quảng ngãi", "bình định", "quy nhơn",
            "phú yên", "tuy hòa", "khánh hòa", "nha trang", "cam ranh",
            "ninh thuận", "phan rang", "bình thuận", "phan thiết",
            "kon tum", "gia lai", "pleiku",
            "đắk lắk", "dak lak", "buôn ma thuột",
            "đắk nông", "gia nghĩa", "lâm đồng", "đà lạt", "bảo lộc"
    };

    private static final String[] PROVINCES_KHU_2 = {
            "thanh hóa", "sầm sơn", "bỉm sơn",
            "nghệ an", "vinh", "cửa lò",
            "hà tĩnh", "kỳ anh", "hồng lĩnh",
            "quảng bình", "đồng hới", "ba đồn",
            "quảng trị", "đông hà",
            "thừa thiên huế", "huế", "hương thủy", "hương trà"
    };

    private static final String[] PROVINCES_KHU_1 = {
            "hà nội", "hoàn kiếm", "ba đình", "đống đa", "hai bà trưng", "cầu giấy", "thanh xuân", "hoàng mai", "long biên", "hà đông", "từ liêm",
            "hải phòng", "hồng bàng", "ngô quyền", "lê chân", "đồ sơn",
            "quảng ninh", "hạ long", "cẩm phả", "uông bí", "móng cái",
            "bắc ninh", "từ sơn",
            "hà nam", "phủ lý", "thanh liêm", "kim bảng", "duy tiên", "bình lục", "lý nhân",
            "hải dương", "chí linh", "hưng yên", "mỹ hào",
            "nam định", "ninh bình", "tam điệp",
            "thái bình", "vĩnh phúc", "vĩnh yên", "phúc yên",
            "phú thọ", "việt trì", "bắc giang", "bắc kạn",
            "cao bằng", "hà giang", "lạng sơn", "thái nguyên",
            "tuyên quang", "yên bái", "lào cai", "sa pa",
            "hòa bình", "sơn la", "điện biên", "lai châu"
    };

    /**
     * Tự động giải mã Khu Vực Quản Lý Đường Bộ Toàn Quốc dựa trên 63 tỉnh thành & tọa độ GPS
     */
    public static RouteCorridorInfo resolveCorridor(BigDecimal lat, BigDecimal lng, String address) {
        double dLat = lat != null ? lat.doubleValue() : 21.0285;
        double dLng = lng != null ? lng.doubleValue() : 105.8542;
        String addr = address != null ? address.toLowerCase() : "";

        // 1. Phân giải ưu tiên theo tên Tỉnh/Thành trong chuỗi địa chỉ
        for (String p : PROVINCES_KHU_4) {
            if (addr.contains(p)) {
                return new RouteCorridorInfo("KHU_4", "Khu QLĐB IV (Miền Nam) - Đội Duy Tu Cơ Động TP.HCM & ĐBSCL", "Khu Quản lý Đường bộ IV", 5L);
            }
        }
        for (String p : PROVINCES_KHU_3) {
            if (addr.contains(p)) {
                return new RouteCorridorInfo("KHU_3", "Khu QLĐB III (Miền Trung & Tây Nguyên) - Đội Cơ Động Đà Nẵng", "Khu Quản lý Đường bộ III", 4L);
            }
        }
        for (String p : PROVINCES_KHU_2) {
            if (addr.contains(p)) {
                return new RouteCorridorInfo("KHU_2", "Khu QLĐB II (Bắc Trung Bộ) - Đội Cơ Động Nghệ An & Huế", "Khu Quản lý Đường bộ II", 3L);
            }
        }
        for (String p : PROVINCES_KHU_1) {
            if (addr.contains(p)) {
                return new RouteCorridorInfo("KHU_1", "Khu QLĐB I (Miền Bắc) - Đội Cơ Động Hà Nội & ĐB Sông Hồng", "Khu Quản lý Đường bộ I", 2L);
            }
        }

        // Hỗ trợ mã tuyến cũ nếu có
        if (addr.contains("ql21") || addr.contains("494")) {
            return new RouteCorridorInfo("KHU_1", "Khu QLĐB I (Miền Bắc) - Đội Cơ Động Tuyến QL21 & ĐT494", "Khu Quản lý Đường bộ I", 2L);
        }

        // 2. Phân giải dựa trên vĩ độ không gian GPS bảo hiểm (Spatial Latitudinal Bounding)
        if (dLat < 11.5) {
            return new RouteCorridorInfo("KHU_4", "Khu QLĐB IV (Miền Nam) - Đội Duy Tu Cơ Động TP.HCM & ĐBSCL", "Khu Quản lý Đường bộ IV", 5L);
        }
        if (dLat < 16.5) {
            return new RouteCorridorInfo("KHU_3", "Khu QLĐB III (Miền Trung & Tây Nguyên) - Đội Cơ Động Đà Nẵng", "Khu Quản lý Đường bộ III", 4L);
        }
        if (dLat < 20.0) {
            return new RouteCorridorInfo("KHU_2", "Khu QLĐB II (Bắc Trung Bộ) - Đội Cơ Động Nghệ An & Huế", "Khu Quản lý Đường bộ II", 3L);
        }

        return new RouteCorridorInfo("KHU_1", "Khu QLĐB I (Miền Bắc) - Đội Cơ Động Hà Nội & ĐB Sông Hồng", "Khu Quản lý Đường bộ I", 2L);
    }

    /**
     * Kiểm tra tọa độ GPS có nằm trong lãnh thổ Việt Nam hay không
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
        final double R = 6371000.0;
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
