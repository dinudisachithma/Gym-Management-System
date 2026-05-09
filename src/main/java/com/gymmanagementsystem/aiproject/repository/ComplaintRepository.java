package com.gymmanagementsystem.aiproject.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import com.gymmanagementsystem.aiproject.model.Complaint;
import java.util.List;

@Repository
public interface ComplaintRepository extends MongoRepository<Complaint, String> {
    List<Complaint> findByMemberIdOrderBySubmittedAtDesc(String memberId);
    List<Complaint> findByMemberEmailOrderBySubmittedAtDesc(String memberEmail);
}
