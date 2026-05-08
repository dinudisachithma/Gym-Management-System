package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.MemberPaymentRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface MemberPaymentRepository extends MongoRepository<MemberPaymentRecord, String> {

    List<MemberPaymentRecord> findByStatus(String status);

    List<MemberPaymentRecord> findByUserEmail(String userEmail);

    Optional<MemberPaymentRecord> findByStripeSessionId(String stripeSessionId);

    long countByStatus(String status);
}
