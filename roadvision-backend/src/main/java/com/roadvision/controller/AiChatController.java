package com.roadvision.controller;

import com.roadvision.dto.AiChatRequest;
import com.roadvision.dto.AiChatResponse;
import com.roadvision.service.GeminiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/chat")
@RequiredArgsConstructor
@Tag(name = "AI Chat Assistant", description = "Trợ lý AI Gemini hỗ trợ người dân và cán bộ giao thông RoadVision")
public class AiChatController {

    private final GeminiChatService geminiChatService;

    @PostMapping
    @Operation(summary = "Gửi tin nhắn hỏi đáp với Trợ lý AI RoadVision (Hỗ trợ tra cứu sự cố RAG và tư vấn nghiệp vụ)")
    public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {
        return ResponseEntity.ok(geminiChatService.chat(request));
    }
}
