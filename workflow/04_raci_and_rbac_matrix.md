# MA TRẬN TRÁCH NHIỆM RACI & ÁNH XẠ PHÂN QUYỀN RBAC (SPRING SECURITY)
## HỆ THỐNG ROADCARE - QUẢN LÝ SỰ CỐ GIAO THÔNG THÔNG MINH

> **Tài liệu phục vụ:** Báo cáo Đồ án Tốt nghiệp - Chương Thiết Kế Kiến Trúc & An Toàn Bảo Mật Hệ Thống  
> **Cơ sở lý thuyết:** Ma trận phân định trách nhiệm RACI (Responsible - Accountable - Consulted - Informed) & Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC).

---

## 1. MA TRẬN TRÁCH NHIỆM RACI (RACI MATRIX)

Bảng phân định trách nhiệm rõ ràng giữa các chủ thể tham gia vào toàn bộ vòng đời xử lý sự cố mặt đường:

| STT | Công đoạn / Nhiệm vụ hệ thống | Người dân<br>*(Citizen)* | Quản trị viên<br>*(Admin)* | Kỹ thuật viên<br>*(Staff)* | Module AI<br>*(System)* |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | Gửi báo cáo, tải ảnh & tọa độ GPS hiện trường | **R** | **I** | **I** | **I** |
| **2** | Tiền xử lý Tensor, suy luận YOLO & tính Confidence | **I** | **I** | **I** | **R / A** |
| **3** | Phê duyệt hoặc Từ chối tiếp nhận sự cố | **I** | **R / A** | **I** | **C** |
| **4** | Gán nhiệm vụ sửa chữa cho kỹ thuật viên | **I** | **R / A** | **C** | **I** |
| **5** | Tiếp nhận nhiệm vụ & triển khai sửa chữa thực địa | **I** | **I** | **R / A** | **I** |
| **6** | Chụp ảnh & nộp báo cáo nghiệm thu (Proof of Work) | **I** | **A** | **R** | **I** |
| **7** | Đối chiếu Before/After, Chấm điểm sao & Đóng sự cố | **R** | **A** | **I** | **I** |

### Giải thích quy chuẩn ký hiệu:
- **R (Responsible):** Người trực tiếp bắt tay thực hiện hành động/nhiệm vụ.
- **A (Accountable):** Người chịu trách nhiệm cao nhất về kết quả cuối cùng, có quyền phê chuẩn, chấp thuận hoặc bác bỏ.
- **C (Consulted):** Người hoặc module cung cấp dữ liệu tham mưu, gợi ý chuyên môn hai chiều (ví dụ: AI đề xuất nhãn hư hại và độ tin cậy để Admin tham khảo).
- **I (Informed):** Đối tượng nhận thông báo cập nhật về tiến độ và kết quả (một chiều).

---

## 2. ÁNH XẠ TỪ RACI SANG KIỂM SOÁT TRUY CẬP RBAC (SPRING SECURITY)

Để chuyển hóa ma trận lý thuyết RACI vào mã nguồn phần mềm an toàn, hệ thống thiết lập cơ chế **RBAC** với 3 vai trò người dùng (Roles) và 1 cơ chế phân quyền nội bộ (Internal System Engine):

1. `ROLE_CITIZEN`: Người dân nộp báo cáo, xem lịch sử phản ánh của chính mình, nghiệm thu & chấm điểm sự cố do mình tạo.
2. `ROLE_ADMIN`: Quản trị viên / Điều phối viên đô thị, có toàn quyền trên các sự cố: duyệt, từ chối, gán việc, xem báo cáo thống kê, quản lý người dùng.
3. `ROLE_STAFF`: Nhân viên kỹ thuật bảo trì hạ tầng, có quyền xem danh sách nhiệm vụ được giao cho mình, cập nhật tiến độ thi công (`IN_PROGRESS`), tải ảnh bằng chứng nghiệm thu (`Proof of Work`).
4. `INTERNAL_SYSTEM`: Quyền hạn chạy ngầm trong tiến trình JVM của Spring Boot (AI Inference Service & Cron Scheduled Tasks).

---

## 3. BẢNG CHI TIẾT PHÂN QUYỀN API & MẪU CODE JAVA ANNOTATION

| Phương thức & Endpoint | Quyền hạn cho phép (Roles) | Cú pháp `@PreAuthorize` trên Spring Controller |
| :--- | :--- | :--- |
| `POST /api/v1/incidents` | `ROLE_CITIZEN`, `ROLE_ADMIN` | `@PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")` |
| `GET /api/v1/incidents` | `ROLE_ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |
| `GET /api/v1/incidents/my` | `ROLE_CITIZEN` | `@PreAuthorize("hasRole('CITIZEN')")` |
| `GET /api/v1/incidents/assigned-to-me` | `ROLE_STAFF` | `@PreAuthorize("hasRole('STAFF')")` |
| `GET /api/v1/incidents/{id}` | Tất cả (có kiểm tra sở hữu) | `@PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN', 'STAFF')")` |
| `PATCH /api/v1/incidents/{id}/assign` | `ROLE_ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |
| `POST /api/v1/incidents/{id}/reject` | `ROLE_ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |
| `PATCH /api/v1/incidents/{id}/status` | `ROLE_STAFF`, `ROLE_ADMIN` | `@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")` |
| `POST /api/v1/incidents/{id}/resolve` | `ROLE_STAFF` | `@PreAuthorize("hasRole('STAFF')")` |
| `POST /api/v1/incidents/{id}/close` | `ROLE_CITIZEN`, `ROLE_ADMIN` | `@PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")` |

---

## 4. MẪU MÃ CẤU HÌNH BẢO MẬT TRONG SPRING BOOT 3.x (SECURITY CONFIGURATION)

Đoạn mã mẫu sau minh họa cách cấu hình `SecurityFilterChain` trong Spring Boot để bảo vệ các endpoints theo đúng ma trận RACI:

```java
package com.roadcare.config;

import com.roadcare.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // Kích hoạt @PreAuthorize
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Tài nguyên công khai (Swagger, Authentication, Public Home)
                .requestMatchers("/api/v1/auth/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/incidents/public-map").permitAll()
                
                // Phân quyền theo tiền tố đường dẫn
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/staff/**").hasRole("STAFF")
                .requestMatchers("/api/v1/citizen/**").hasRole("CITIZEN")
                
                // Mọi yêu cầu còn lại bắt buộc phải xác thực Bearer Token
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

---

## 5. CƠ CHẾ BẢO VỆ TOÀN VẸN NGHIỆP VỤ (BUSINESS INTEGRITY GUARDS)

Bên cạnh việc kiểm tra Role ở tầng HTTP Security, tầng Business Service cần kiểm tra các quy tắc toàn vẹn nghiệp vụ sau:
1. **Kiểm tra quyền sở hữu khi đóng sự cố (`POST /close`):** Chỉ người dân đã tạo sự cố đó (`incident.citizenId == currentUser.id`) hoặc Quản trị viên (`ROLE_ADMIN`) mới có quyền đánh giá và đóng sự cố.
2. **Kiểm tra quyền thực địa (`PATCH /status`, `POST /resolve`):** Chỉ nhân viên kỹ thuật đã được gán vào sự cố đó (`assignment.assignedToStaffId == currentUser.id`) mới có thể chuyển trạng thái hoặc tải ảnh nghiệm thu.
