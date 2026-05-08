package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.Feedback;
import com.gymmanagementsystem.aiproject.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    public Feedback submitFeedback(Feedback feedback) {
        if (feedback.isAnonymous()) {
            feedback.setMemberName("Anonymous Member");
            feedback.setMemberId(null);
        }
        feedback.setCreatedAt(LocalDateTime.now());
        feedback.setApproved(true); // Auto-approve for instant trainer visibility
        return feedbackRepository.save(feedback);
    }

    public List<Feedback> getAllFeedback() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Feedback> getApprovedFeedbackForTrainer(String trainerId) {
        return feedbackRepository.findByTrainerId(trainerId).stream()
                .filter(Feedback::isApproved)
                .collect(Collectors.toList());
    }

    public Feedback approveFeedback(String id) {
        Feedback f = feedbackRepository.findById(id).orElseThrow(() -> new RuntimeException("Feedback not found"));
        f.setApproved(true);
        return feedbackRepository.save(f);
    }

    public void deleteFeedback(String id) {
        feedbackRepository.deleteById(id);
    }
}
