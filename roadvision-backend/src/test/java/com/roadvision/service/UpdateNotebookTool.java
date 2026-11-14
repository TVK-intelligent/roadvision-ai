package com.roadvision.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

public class UpdateNotebookTool {

    @Test
    public void updateVisualizationInNotebook() throws Exception {
        File nbFile = new File("E:/DATN/train_yolov8_roadcare.ipynb");
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(nbFile);

        ArrayNode cells = (ArrayNode) root.get("cells");
        boolean updated = false;

        for (JsonNode cell : cells) {
            if ("code".equals(cell.path("cell_type").asText())) {
                ArrayNode source = (ArrayNode) cell.get("source");
                StringBuilder sb = new StringBuilder();
                for (JsonNode line : source) {
                    sb.append(line.asText());
                }
                String code = sb.toString();

                if (code.contains("categories = {") && code.contains("NHÓM 4: CHƯỚNG NGẠI VẬT")) {
                    System.out.println("-> Tìm thấy cell trực quan hóa! Tiến hành cập nhật đầy đủ các đối tượng con...");

                    // Thay thế categories dictionary
                    String oldCatTarget = "\"NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)\": {";
                    int idxCat = code.indexOf(oldCatTarget);
                    int idxCatEnd = code.indexOf("\"NHÓM 5: MẪU NỀN ÂM BẢN", idxCat);
                    int idxGroup5End = code.indexOf("}\n}", idxCatEnd);

                    String newCategories = """
"NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)": {
        "Đá tảng lớn sạt lở đèo dốc (Mountain Rock Boulders)": [],
        "Đá hộc & đất đá sạt lở taluy (Landslides & Talus Rockfall)": [],
        "Sọt nhựa lấn chiếm giữ chỗ lòng đường (Plastic Crates - Báo Đà Nẵng)": [],
        "Thùng xốp buôn bán hàng rong vỉa hè (Styrofoam Boxes)": [],
        "Két bia & ghế nhựa quán cóc lấn chiếm (Beer Crates & Plastic Stools)": [],
        "Lốp xe dựng đứng cảnh báo hố ga/ổ gà (Warning Upright Tires)": [],
        "Xác lốp xe tải nổ rơi vãi cao tốc (Highway Tire Debris)": [],
        "Rào chắn tạm thi công & Khung chữ A (Construction Barricades)": [],
        "Cọc tiêu nón chóp cam phản quang (Traffic Cones)": [],
        "Cây cổ thụ bật gốc ngã đổ chắn ngang đường (Tree Uprooted - VOV)": [],
        "Cành cây to gãy đổ sà thấp đè xe (Fallen Branches Hazard)": [],
        "Thùng phuy & Dị vật nguy hiểm lòng đường (Traffic Barrels & Debris)": []
    },
    "NHÓM 5: MẪU NỀN ÂM BẢN (NEGATIVE SAMPLES - CHỐNG BÁO ẢO)": {
        "Bóng râm tán cây nắng gắt mặt đường (Dense Tree Shadows - 0 Box)": [],
        "Vệt nước rửa đường & mặt đường ẩm ướt (Wet Streaks / Puddles - 0 Box)": [],
        "Gờ giảm tốc, nắp cống & đá vỉa hè phẳng (Manholes & Pavement - 0 Box)": [],
        "Mặt đường nhựa sạch hoàn toàn (Clean Asphalt Road - 0 Box)": []
    """;
                    code = code.substring(0, idxCat) + newCategories + code.substring(idxGroup5End);

                    // Thay thế logic phân loại Nhóm 4
                    String oldObsTarget = "# 5. VẬT CẢN & CÂY ĐỔ (CLASS 3: ROAD_OBSTACLE)";
                    int idxObs = code.indexOf(oldObsTarget);
                    int idxObsEnd = code.indexOf("# IN BẢNG BÁO CÁO TỔNG QUAN", idxObs);

                    String newObsLogic = """
# 5. VẬT CẢN & CÂY ĐỔ (CLASS 3: ROAD_OBSTACLE)
        elif c == 3:
            if 'manhole' in fname and not any(k in fname for k in ['hazard', 'sut_nap', 'toac_nap', 'giap_bat', 'cong_ho']):
                continue
            if any(k in fname for k in ['da_tang', 'boulder', 'rock_boulder']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Đá tảng lớn sạt lở đèo dốc (Mountain Rock Boulders)"].append(lf)
            elif any(k in fname for k in ['da_hoc', 'sat_lo', 'landslide', 'talus', 'gach_da']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Đá hộc & đất đá sạt lở taluy (Landslides & Talus Rockfall)"].append(lf)
            elif any(k in fname for k in ['sot_nhua', 'sot', 'bandoc1', 'gio_nhua']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Sọt nhựa lấn chiếm giữ chỗ lòng đường (Plastic Crates - Báo Đà Nẵng)"].append(lf)
            elif any(k in fname for k in ['thung_xop', 'hop_xop', 'foam', 'mo_nap', 'csgt_mat_duong']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Thùng xốp buôn bán hàng rong vỉa hè (Styrofoam Boxes)"].append(lf)
            elif any(k in fname for k in ['ket_nhua', 'ket_ghe', 'ghe_nhua', 'ban_ghe', 'chair', 'stool', 'chau_cay']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Két bia & ghế nhựa quán cóc lấn chiếm (Beer Crates & Plastic Stools)"].append(lf)
            elif any(k in fname for k in ['lop_xe', 'lop_rao', 'canh_bao', 'upright_tire']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Lốp xe dựng đứng cảnh báo hố ga/ổ gà (Warning Upright Tires)"].append(lf)
            elif any(k in fname for k in ['tire_debris', 'tire_vun', 'tire_vo', 'tire_mam', 'tire_cong', 'tire_quoc', 'tire_dac', 'tire_dong', 'vo_lop']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Xác lốp xe tải nổ rơi vãi cao tốc (Highway Tire Debris)"].append(lf)
            elif any(k in fname for k in ['rao_chan', 'barricade', 'barrier', 'khung_chu_a']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Rào chắn tạm thi công & Khung chữ A (Construction Barricades)"].append(lf)
            elif any(k in fname for k in ['cone', 'chop_non', 'traffic_cone', 'coc_tieu']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Cọc tiêu nón chóp cam phản quang (Traffic Cones)"].append(lf)
            elif any(k in fname for k in ['bat_goc', 'uprooted', 'than_to', 'cay_do', '96da9f']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Cây cổ thụ bật gốc ngã đổ chắn ngang đường (Tree Uprooted - VOV)"].append(lf)
            elif any(k in fname for k in ['canh_gay', 'canh_la', 'branches', 'de_xe', 'blocking']):
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Cành cây to gãy đổ sà thấp đè xe (Fallen Branches Hazard)"].append(lf)
            else:
                categories["NHÓM 4: CHƯỚNG NGẠI VẬT & DỊ VẬT (ROAD_OBSTACLE)"]["Thùng phuy & Dị vật nguy hiểm lòng đường (Traffic Barrels & Debris)"].append(lf)

""";
                    code = code.substring(0, idxObs) + newObsLogic + code.substring(idxObsEnd);

                    // Chuyển code thành ArrayNode của JsonNode (mỗi dòng có \n)
                    ArrayNode newSource = mapper.createArrayNode();
                    String[] lines = code.split("\n", -1);
                    for (int i = 0; i < lines.length; i++) {
                        String l = lines[i];
                        if (i < lines.length - 1) {
                            newSource.add(l + "\n");
                        } else {
                            if (!l.isEmpty()) newSource.add(l);
                        }
                    }
                    ((ObjectNode) cell).set("source", newSource);
                    updated = true;
                    break;
                }
            }
        }

        if (updated) {
            mapper.writerWithDefaultPrettyPrinter().writeValue(nbFile, root);
            File wfFile = new File("E:/DATN/workflow/ai_training/train_yolov8_roadcare.ipynb");
            mapper.writerWithDefaultPrettyPrinter().writeValue(wfFile, root);
            System.out.println("✅ Đã cập nhật thành công và ghi file an toàn chuẩn JSON 100%!");
        } else {
            System.out.println("⚠️ Không tìm thấy vị trí cần thay thế trong notebook!");
        }
    }
}
