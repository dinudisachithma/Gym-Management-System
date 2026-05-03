package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.NotificationRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<NotificationRecord, String> {
    long countByStatus(String status);

    List<NotificationRecord> findAllByOrderByCreatedAtDesc();

    List<NotificationRecord> findByStatusOrderByCreatedAtDesc(String status);

    List<NotificationRecord> findByTargetGroupOrderByCreatedAtDesc(String targetGroup);
}

