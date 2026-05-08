package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.PtMembership;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * PT module – Repository for PtMembership documents.
 * Belongs to team member's payment tracking feature.
 */
@Repository
public interface PtMembershipRepository extends MongoRepository<PtMembership, String> {

    /** Used to find the highest memberId so we can auto-increment. */
    Optional<PtMembership> findTopByOrderByMemberIdDesc();

    /** Find membership by member name for cascade delete. */
    Optional<PtMembership> findByMemberName(String memberName);
}
