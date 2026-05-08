package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.NotificationRecord;
import com.gymmanagementsystem.aiproject.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> unreadCount() {
        Map<String, Object> out = new HashMap<>();
        out.put("count", notificationService.getUnreadCount());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/feed")
    public ResponseEntity<List<NotificationRecord>> feed(@RequestParam(value = "filter", required = false) String filter) {
        return ResponseEntity.ok(notificationService.getFeed(filter));
    }

    @GetMapping("/member-feed")
    public ResponseEntity<List<NotificationRecord>> memberFeed(@RequestParam("memberId") String memberId) {
        return ResponseEntity.ok(notificationService.getMemberFeed(memberId));
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(@RequestBody Map<String, Object> body) {
        try {
            String title = valueAsString(body.get("title"));
            String message = valueAsString(body.get("message"));
            String type = valueAsString(body.get("type"));
            String senderName = valueAsString(body.get("senderName"));
            String targetScope = valueAsString(body.get("targetScope"));
            String memberId = valueAsString(body.get("memberId"));

            if (title == null || title.isBlank() || message == null || message.isBlank()) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "title and message are required");
                return ResponseEntity.badRequest().body(err);
            }

            notificationService.sendManual(title, message, type, senderName, targetScope, memberId);
            return ResponseEntity.ok(Map.of("message", "Notification sent"));
        } catch (RuntimeException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable String id) {
        try {
            notificationService.markRead(id);
            return ResponseEntity.ok(Map.of("message", "Marked as read"));
        } catch (RuntimeException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            notificationService.delete(id);
            return ResponseEntity.ok(Map.of("message", "Deleted"));
        } catch (RuntimeException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    private String valueAsString(Object v) {
        if (v == null) return null;
        return String.valueOf(v);
    }
}

