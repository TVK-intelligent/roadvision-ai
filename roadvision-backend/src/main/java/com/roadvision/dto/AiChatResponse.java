package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    private String reply;
    private LocalDateTime timestamp;
    private List<String> suggestions;
    private List<ReferencedIncident> referencedIncidents;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReferencedIncident {
        private Long id;
        private String trackingCode;
        private String title;
        private String status;
        private String address;
        private String category;
    }
}
