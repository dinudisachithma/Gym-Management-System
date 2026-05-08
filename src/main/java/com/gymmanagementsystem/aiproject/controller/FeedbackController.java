package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.Feedback;
import com.gymmanagementsystem.aiproject.service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    // Member submits feedback
    @PostMapping
    public ResponseEntity<Feedback> submitFeedback(@RequestBody Feedback feedback) {
        Feedback saved = feedbackService.submitFeedback(feedback);
        return ResponseEntity.ok(saved);
    }

    // Admin pulls all feedback
    @GetMapping
    public ResponseEntity<List<Feedback>> getAllFeedback() {
        return ResponseEntity.ok(feedbackService.getAllFeedback());
    }

    // Pull approved feedback for a specific trainer
    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<List<Feedback>> getTrainerFeedback(@PathVariable String trainerId) {
        return ResponseEntity.ok(feedbackService.getApprovedFeedbackForTrainer(trainerId));
    }

    // Admin approves feedback
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveFeedback(@PathVariable String id) {
        try {
            Feedback f = feedbackService.approveFeedback(id);
            return ResponseEntity.ok(f);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Admin deletes feedback
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFeedback(@PathVariable String id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.ok().build();
    }
}
