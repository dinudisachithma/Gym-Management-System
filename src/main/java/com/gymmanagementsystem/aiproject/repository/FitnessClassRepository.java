package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.FitnessClass;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FitnessClassRepository extends MongoRepository<FitnessClass, String> {
    List<FitnessClass> findByTrainerId(String trainerId);
    List<FitnessClass> findByMemberIdsContaining(String memberId);
}
