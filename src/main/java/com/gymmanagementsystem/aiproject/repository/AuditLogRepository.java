package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * AuditLogRepository - Data access for AuditLog collection
 */
@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByMemberId(String memberId);
    List<AuditLog> findByAction(String action);
    List<AuditLog> findByMemberEmail(String memberEmail);
}

