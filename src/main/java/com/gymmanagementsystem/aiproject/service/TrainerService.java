package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.Trainer;

import java.util.List;

public interface TrainerService {
    Trainer createTrainer(Trainer trainer);
    List<Trainer> getAllTrainers();
    Trainer updateTrainer(String trainerId, Trainer trainer);
    void deleteTrainer(String trainerId);
}
