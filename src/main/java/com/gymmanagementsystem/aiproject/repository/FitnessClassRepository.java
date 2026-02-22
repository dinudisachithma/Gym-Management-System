package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.FitnessClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FitnessClassRepository extends JpaRepository<FitnessClass, String> {
}
