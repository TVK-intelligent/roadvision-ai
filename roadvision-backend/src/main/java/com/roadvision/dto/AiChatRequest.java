package com.roadvision.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    private String message;
    private List<ChatMessage> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role; // "user" hoặc "assistant" / "model"
        private String content;
    }
}
