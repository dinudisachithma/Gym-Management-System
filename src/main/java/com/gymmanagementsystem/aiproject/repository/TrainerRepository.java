package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.Trainer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainerRepository extends JpaRepository<Trainer, String> {
}
