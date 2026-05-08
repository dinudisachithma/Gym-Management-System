package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.Feedback;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FeedbackRepository extends MongoRepository<Feedback, String> {
    List<Feedback> findByTargetType(String targetType);
    List<Feedback> findByTrainerId(String trainerId);
    List<Feedback> findByIsApprovedTrue();
    List<Feedback> findAllByOrderByCreatedAtDesc();
}
