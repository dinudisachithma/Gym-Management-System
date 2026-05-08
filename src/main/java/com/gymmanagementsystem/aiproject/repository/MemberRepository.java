package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;
import java.util.List;

public interface MemberRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByMembershipIdIgnoreCase(String membershipId);
    boolean existsByMembershipIdIgnoreCase(String membershipId);
    boolean existsByMemberNoIgnoreCase(String memberNo);
    boolean existsByEmail(String email);
    List<User> findByRole(String role);
    long countByRole(String role);
    List<User> findByDeleteRequestStatus(String status);
    List<User> findByDeleteRequestStatusAndRole(String deleteRequestStatus, String role);
    List<User> findByPackageStatus(String status);
    List<User> findByComplaintStatus(String status);
}
